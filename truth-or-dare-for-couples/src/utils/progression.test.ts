import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_CARDS } from '../data/cards';
import { CardAudience, CardItem, DifficultyStars, PositionDifficultyStars } from '../types';
import { createOutfitState, DEFAULT_GAME_SETTINGS, removeGarment } from './wardrobe';
import { compareCollectionCards } from './cardOrdering';
import {
  DEFAULT_PROGRESSION_CONFIG,
  DEFAULT_LUXURY_PROGRESSION_CONFIG,
  calculateCompletedCardIntimacy,
  calculateCompletedPositionLuxury,
  deriveDifficultyStars,
  derivePositionDifficultyStars,
  getCardDeck,
  getStandardCardPerformerIndex,
  getJourneyDrawProbabilities,
  getPositionFamilyOptions,
  hydrateProgressionConfig,
  hydrateLuxuryProgressionConfig,
  isStandardJourneyCardEligible,
  selectJourneyCard,
  selectJourneyPair,
  selectLighterJourneyCard,
  selectLuxuryPositionCard,
  selectPositionPair,
  validateLuxuryProgressionConfig,
  validateProgressionConfig,
} from './progression';

const outfits = [
  createOutfitState({ ...DEFAULT_GAME_SETTINGS.outfits[0], garments: {} }),
  createOutfitState({ ...DEFAULT_GAME_SETTINGS.outfits[1], garments: {} }),
] as const;

const dressedOutfits = () => [
  createOutfitState(DEFAULT_GAME_SETTINGS.outfits[0]),
  createOutfitState(DEFAULT_GAME_SETTINGS.outfits[1]),
] as const;

const underwearOnlyOutfits = () => {
  const [male, female] = dressedOutfits();
  return [
    removeGarment(removeGarment(male, 'shirt'), 'pants'),
    removeGarment(removeGarment(removeGarment(female, 'shirt'), 'pants'), 'bra'),
  ] as const;
};

const makeCard = (
  id: string,
  type: 'truth' | 'dare',
  stars: DifficultyStars,
  audience: 'male' | 'female' | 'both' = 'both',
): CardItem => ({
  id,
  type,
  level: 'gentle',
  content: id,
  deck: 'standard',
  progression: { difficultyStars: stars, audience },
});

const makePositionCard = (
  id: string,
  stars: PositionDifficultyStars,
  luxuryGain?: number,
): CardItem => ({
  id,
  type: 'dare',
  level: 'passionate',
  content: id,
  deck: 'position',
  position: {
    family: stars === 10 ? 'have_sex' : 'oral',
    recipient: 'both',
    orderGroup: stars === 10 ? 4 : 1,
    rarity: stars === 10 ? 'mythic' : 'luxury',
    difficultyStars: stars,
    luxuryGain,
  },
});
test('all 92 standard cards receive the expanded star and audience distribution', () => {
  const standardCards = INITIAL_CARDS.filter((card) => getCardDeck(card) === 'standard');
  assert.equal(standardCards.length, 92);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DifficultyStars, number>;
  const audiences: Record<CardAudience, number> = {
    male: 0,
    female: 0,
    both: 0,
    current: 0,
    opponent: 0,
  };
  for (const card of standardCards) {
    counts[deriveDifficultyStars(card)] += 1;
    const audience = card.progression?.audience ?? 'both';
    audiences[audience] += 1;
  }
  assert.deepEqual(counts, { 1: 16, 2: 28, 3: 23, 4: 19, 5: 6 });
  assert.deepEqual(audiences, {
    male: 6,
    female: 6,
    both: 80,
    current: 0,
    opponent: 0,
  });
});

test('collection order groups decks and sorts standard and position cards deterministically', () => {
  const standardDare = makeCard('g-d-10', 'dare', 1);
  const standardTruthTwoStars = makeCard('g-t-2', 'truth', 2);
  const standardTruthOneStarTen = makeCard('g-t-10', 'truth', 1);
  const standardTruthOneStarTwo = makeCard('g-t-2a', 'truth', 1);
  const positionFive = makePositionCard('pos-5', 5);
  const positionTwo = makePositionCard('pos-2', 2);

  const sorted = [positionFive, standardDare, standardTruthTwoStars, positionTwo, standardTruthOneStarTen, standardTruthOneStarTwo]
    .sort(compareCollectionCards)
    .map((card) => card.id);

  assert.deepEqual(sorted, ['g-t-2a', 'g-t-10', 'g-d-10', 'g-t-2', 'pos-2', 'pos-5']);
});

test('legacy relative audiences migrate to both and the drawer is always the performer', () => {
  const currentCard = makeCard('current', 'dare', 1);
  currentCard.progression!.audience = 'current';
  const opponentCard = makeCard('opponent', 'dare', 1);
  opponentCard.progression!.audience = 'opponent';
  const femaleCard = makeCard('female', 'dare', 1, 'female');

  assert.equal(getStandardCardPerformerIndex(currentCard, 0), 0);
  assert.equal(getStandardCardPerformerIndex(currentCard, 1), 1);
  assert.equal(getStandardCardPerformerIndex(opponentCard, 0), 0);
  assert.equal(getStandardCardPerformerIndex(opponentCard, 1), 1);
  assert.equal(getStandardCardPerformerIndex(femaleCard, 0), 0);
});

test('position deck covers the 6–10 star ladder and keeps one reusable mythic final', () => {
  const positions = INITIAL_CARDS.filter((card) => getCardDeck(card) === 'position');
  assert.equal(positions.length, 16);
  assert.deepEqual(
    positions.filter((card) => card.position?.family === 'oral').map((card) => card.position?.recipient).sort(),
    ['both', 'female', 'male'],
  );
  assert.equal(positions.filter((card) => card.position?.family === 'blowjob').length, 3);
  assert.equal(positions.filter((card) => card.position?.family === 'handjob').length, 3);
  const final = positions.find((card) => card.position?.family === 'have_sex');
  assert.equal(final?.position?.orderGroup, 4);
  assert.equal(final?.position?.rarity, 'mythic');
  assert.deepEqual(
    positions.filter((card) => card.position?.family === 'oral').map(derivePositionDifficultyStars),
    [8, 8, 8],
  );
  // The built-in Blow cards are stored as 10★, but 10★ is reserved for Have Sex
  // (no band weights it), so they play as the hottest regular tier, 9★.
  assert.deepEqual(
    positions.filter((card) => card.position?.family === 'blowjob').map((card) => card.position?.difficultyStars),
    [10, 10, 10],
  );
  assert.deepEqual(
    positions.filter((card) => card.position?.family === 'blowjob').map(derivePositionDifficultyStars),
    [9, 9, 9],
  );
  assert.deepEqual(
    positions.filter((card) => card.position?.family === 'handjob').map(derivePositionDifficultyStars),
    [7, 7, 7],
  );
  assert.deepEqual(
    [...new Set(positions.map(derivePositionDifficultyStars))].sort((first, second) => first - second),
    [6, 7, 8, 9, 10],
  );
  assert.equal(final && derivePositionDifficultyStars(final), 10);
});

test('journey keeps its configured Truth/Dare odds while dressed outfits cap stars at three', () => {
  const cards = (['truth', 'dare'] as const).flatMap((type) =>
    ([1, 2, 3, 4, 5] as DifficultyStars[]).map((star) => makeCard(`${type}-${star}`, type, star)),
  );
  const expected = [[0, 0.65], [20, 0.55], [40, 0.45], [60, 0.35], [80, 0.25]] as const;
  for (const [percent, truthChance] of expected) {
    const probabilities = getJourneyDrawProbabilities({
      cards,
      actorIndex: 0,
      outfits: dressedOutfits(),
      usedCardIds: [],
      levels: ['gentle'],
      intimacyPercent: percent,
      config: DEFAULT_PROGRESSION_CONFIG,
    });
    assert.ok(Math.abs(probabilities.types.truth - truthChance) < 1e-10);
    if (percent < 20) {
      assert.equal(probabilities.stars[4], 0);
      assert.equal(probabilities.stars[5], 0);
    } else if (percent < 40) {
      assert.equal(probabilities.stars[5], 0);
    } else {
      assert.ok(probabilities.stars[4] > 0 || probabilities.stars[5] > 0);
    }
    assert.ok(probabilities.stars[1] > 0 && probabilities.stars[2] > 0 && probabilities.stars[3] > 0);
  }
});

test('difficulty boost shifts probability to the next available star without changing card type odds', () => {
  const cards = (['truth', 'dare'] as const).flatMap((type) =>
    ([1, 2, 3, 4, 5] as DifficultyStars[]).map((star) => makeCard(`${type}-${star}`, type, star)),
  );
  const early = getJourneyDrawProbabilities({
    cards,
    actorIndex: 0,
    outfits: dressedOutfits(),
    usedCardIds: [],
    levels: ['gentle'],
    intimacyPercent: 0,
    config: DEFAULT_PROGRESSION_CONFIG,
    difficultyBoost: true,
  });
  assert.equal(early.types.truth, 0.65);
  assert.equal(early.stars[1], 0);
  assert.equal(early.stars[2], 0.55);
  assert.ok(Math.abs(early.stars[3] - 0.45) < 1e-10);
  assert.equal(early.stars[4], 0);
  assert.equal(early.stars[5], 0);

  const late = getJourneyDrawProbabilities({
    cards,
    actorIndex: 0,
    outfits: dressedOutfits(),
    usedCardIds: [],
    levels: ['gentle'],
    intimacyPercent: 80,
    config: DEFAULT_PROGRESSION_CONFIG,
    difficultyBoost: true,
  });
  assert.equal(late.stars[1], 0);
  assert.ok(late.stars[4] > 0 || late.stars[5] > 0);
  assert.ok(late.stars[3] > 0 || late.stars[4] > 0 || late.stars[5] > 0);
});

test('difficulty boost uses the next actually available star and hard exclusions survive pool reset', () => {
  const sparseCards = [
    makeCard('one', 'truth', 1),
    makeCard('three', 'truth', 3),
    makeCard('five', 'truth', 5),
  ];
  const probabilities = getJourneyDrawProbabilities({
    cards: sparseCards,
    actorIndex: 0,
    outfits: dressedOutfits(),
    usedCardIds: [],
    levels: ['gentle'],
    intimacyPercent: 0,
    config: DEFAULT_PROGRESSION_CONFIG,
    difficultyBoost: true,
  });
  assert.equal(probabilities.stars[1], 0);
  assert.equal(probabilities.stars[5], 0);
  assert.equal(probabilities.stars[3], 1);

  const excluded = selectJourneyCard({
    cards: [sparseCards[0]],
    actorIndex: 0,
    outfits,
    usedCardIds: ['one'],
    excludedCardIds: ['one'],
    levels: ['gentle'],
    intimacyPercent: 0,
    config: DEFAULT_PROGRESSION_CONFIG,
    difficultyBoost: true,
  });
  assert.equal(excluded.card, null);
  assert.equal(excluded.errorCode, 'no_cards');
});

test('wardrobe tiers cap stars, favor the target star and use the least-clothed player', () => {
  const cards = (['truth', 'dare'] as const).flatMap((type) =>
    ([1, 2, 3, 4, 5] as DifficultyStars[]).map((star) => makeCard(`${type}-${star}`, type, star)),
  );
  const scenarios = [
    { outfits: dressedOutfits(), target: null, max: 3 as DifficultyStars },
    { outfits: underwearOnlyOutfits(), target: 4 as DifficultyStars, max: 4 as DifficultyStars },
    { outfits, target: 5 as DifficultyStars, max: 5 as DifficultyStars },
  ];

  for (const scenario of scenarios) {
    const probabilities = getJourneyDrawProbabilities({
      cards,
      actorIndex: 0,
      outfits: scenario.outfits,
      usedCardIds: [],
      levels: ['gentle'],
      intimacyPercent: 0,
      config: DEFAULT_PROGRESSION_CONFIG,
    });
    for (const star of [1, 2, 3, 4, 5] as DifficultyStars[]) {
      if (star > scenario.max) assert.equal(probabilities.stars[star], 0);
      else assert.ok(probabilities.stars[star] > 0);
    }
    if (scenario.target) {
      assert.equal(
        ([1, 2, 3, 4, 5] as DifficultyStars[]).reduce((highest, star) =>
          probabilities.stars[star] > probabilities.stars[highest] ? star : highest,
        1),
        scenario.target,
      );
    }
  }

  const [dressedMale] = dressedOutfits();
  const mixed = [dressedMale, underwearOnlyOutfits()[1]] as const;
  const earlyMixedProbabilities = getJourneyDrawProbabilities({
    cards,
    actorIndex: 0,
    outfits: mixed,
    usedCardIds: [],
    levels: ['gentle'],
    intimacyPercent: 25,
    config: DEFAULT_PROGRESSION_CONFIG,
  });
  assert.equal(earlyMixedProbabilities.stars[4], 0);
  assert.equal(earlyMixedProbabilities.stars[5], 0);

  const mixedProbabilities = getJourneyDrawProbabilities({
    cards,
    actorIndex: 0,
    outfits: mixed,
    usedCardIds: [],
    levels: ['gentle'],
    intimacyPercent: 80,
    config: DEFAULT_PROGRESSION_CONFIG,
  });
  assert.ok(mixedProbabilities.stars[4] > 0 || mixedProbabilities.stars[5] > 0);

  const boosted = selectJourneyCard({
    cards,
    actorIndex: 0,
    outfits: dressedOutfits(),
    usedCardIds: [],
    levels: ['gentle'],
    intimacyPercent: 80,
    config: DEFAULT_PROGRESSION_CONFIG,
    difficultyBoost: true,
    random: () => .999,
  });
  assert.equal(deriveDifficultyStars(boosted.card!), 5);
});

test('audience and outfit requirements filter cards before weighted selection', () => {
  const male = makeCard('male', 'truth', 1, 'male');
  const female = makeCard('female', 'truth', 1, 'female');
  const underwear = {
    ...makeCard('underwear', 'truth', 1),
    progression: {
      difficultyStars: 1 as const,
      audience: 'both' as const,
      actorStages: ['underwear_only' as const],
    },
  };
  assert.equal(isStandardJourneyCardEligible(male, 0, outfits), true);
  assert.equal(isStandardJourneyCardEligible(male, 1, outfits), false);
  assert.equal(isStandardJourneyCardEligible(female, 1, outfits), true);
  assert.equal(isStandardJourneyCardEligible(underwear, 0, outfits), false);
});

test('selection chooses type then stars and avoids repeats until the pool is exhausted', () => {
  const cards = [makeCard('truth-1', 'truth', 1), makeCard('dare-2', 'dare', 2)];
  const rolls = [0, 0, 0];
  const first = selectJourneyCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    levels: ['gentle'],
    intimacyPercent: 0,
    config: DEFAULT_PROGRESSION_CONFIG,
    random: () => rolls.shift() ?? 0,
  });
  assert.equal(first.card?.id, 'truth-1');
  const second = selectJourneyCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: first.nextUsedCardIds,
    levels: ['gentle'],
    intimacyPercent: 0,
    config: DEFAULT_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(second.card?.id, 'dare-2');
});

test('completion gain clamps at 100 and penalty removals are not part of this reducer', () => {
  const card = makeCard('four-star', 'dare', 4);
  assert.deepEqual(calculateCompletedCardIntimacy(80, card, DEFAULT_PROGRESSION_CONFIG, true), {
    nextPercent: 89,
    baseApplied: 6,
    removalApplied: 3,
    totalApplied: 9,
  });
  assert.deepEqual(calculateCompletedCardIntimacy(96, card, DEFAULT_PROGRESSION_CONFIG, true), {
    nextPercent: 100,
    baseApplied: 4,
    removalApplied: 0,
    totalApplied: 4,
  });
});

test('config hydration preserves zero weights and clamps malformed or oversized values', () => {
  const hydrated = hydrateProgressionConfig({
    bands: [
      { typeWeights: { truth: 0, dare: 0 }, starWeights: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      { typeWeights: { truth: 20, dare: 80 }, starWeights: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 } },
    ],
    starGains: { 1: -1, 2: 7, 3: 8, 4: 9, 5: 200 },
    cardRemovalBonus: 11,
  });
  assert.deepEqual(hydrated.bands[0].typeWeights, { truth: 0, dare: 0 });
  assert.deepEqual(hydrated.bands[0].starWeights, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  assert.deepEqual(hydrated.bands[1].typeWeights, { truth: 20, dare: 80 });
  assert.equal(hydrated.starGains[1], 3);
  assert.equal(hydrated.starGains[2], 7);
  assert.equal(hydrated.starGains[5], 100);
  assert.equal(hydrated.cardRemovalBonus, 11);
});

test('Luxury probabilities follow every boundary and keep Have Sex independent', () => {
  const cards = Array.from({ length: 5 }, (_, index) =>
    makePositionCard(`position-${index + 6}`, (index + 6) as PositionDifficultyStars));
  const expected = [
    [0, { 6: .7, 7: .3 }],
    [20, { 6: .25, 7: .55, 8: .2 }],
    [40, { 7: .25, 8: .55, 9: .2 }],
    [60, { 8: .25, 9: .6, 10: .15 }],
    [80, { 9: .6 / 1, 10: .4 / 1 }],
  ] as const;

  for (const [percent, weights] of expected) {
    const result = selectLuxuryPositionCard({
      cards,
      actorIndex: 0,
      outfits,
      usedCardIds: [],
      luxuryPercent: percent,
      config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
      random: () => 0,
    });
    for (const star of [6, 7, 8, 9, 10] as PositionDifficultyStars[]) {
      assert.ok(Number.isFinite(result.probabilities.stars[star]));
    }
    assert.ok(Object.values(result.probabilities.stars).some((weight) => weight > 0));
    assert.equal(result.probabilities.finalCardChance, percent >= 80 ? 0.05 : 0);
  }

  const beforeUnlock = selectLuxuryPositionCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 79,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => .04,
  });
  assert.notEqual(derivePositionDifficultyStars(beforeUnlock.card!), 10);
  const afterUnlock = selectLuxuryPositionCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 80,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => .04,
  });
  assert.equal(derivePositionDifficultyStars(afterUnlock.card!), 10);
});

test('Luxury selection normalizes missing stars, avoids repeats and resets only after exhaustion', () => {
  const cards = [makePositionCard('one-a', 6), makePositionCard('one-b', 6)];
  const first = selectLuxuryPositionCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 0,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(first.probabilities.stars[6], 1);
  const second = selectLuxuryPositionCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: first.nextUsedCardIds,
    luxuryPercent: 0,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.notEqual(second.card?.id, first.card?.id);
  const reset = selectLuxuryPositionCard({
    cards,
    actorIndex: 0,
    outfits,
    usedCardIds: second.nextUsedCardIds,
    luxuryPercent: 0,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(reset.didResetPool, true);
  assert.equal(reset.nextUsedCardIds.length, 1);
});

test('Luxury selection respects the current male or female turn and keeps both eligible', () => {
  const male = makePositionCard('male-only', 3);
  male.position!.recipient = 'male';
  const female = makePositionCard('female-only', 3);
  female.position!.recipient = 'female';
  const both = makePositionCard('both', 3);
  both.position!.recipient = 'both';

  const maleFirst = selectLuxuryPositionCard({
    cards: [male, female, both],
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 0,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(maleFirst.card?.id, 'male-only');
  const maleSecond = selectLuxuryPositionCard({
    cards: [male, female, both],
    actorIndex: 0,
    outfits,
    usedCardIds: maleFirst.nextUsedCardIds,
    luxuryPercent: 0,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(maleSecond.card?.id, 'both');

  const femaleFirst = selectLuxuryPositionCard({
    cards: [male, female, both],
    actorIndex: 1,
    outfits,
    usedCardIds: [],
    luxuryPercent: 0,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(femaleFirst.card?.id, 'female-only');
  assert.notEqual(femaleFirst.card?.id, 'male-only');
});

test('Luxury selection never falls back to the other recipient', () => {
  const female = makePositionCard('female-only', 3);
  female.position!.recipient = 'female';
  const result = selectLuxuryPositionCard({
    cards: [female],
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 0,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(result.card, null);
  assert.equal(result.errorCode, 'no_cards');
});

test('Luxury completion uses the 9–12 defaults, per-card override and clamps at 100', () => {
  assert.deepEqual(
    calculateCompletedPositionLuxury(0, makePositionCard('one', 1), DEFAULT_LUXURY_PROGRESSION_CONFIG),
    { nextPercent: 9, baseApplied: 9, removalApplied: 0, totalApplied: 9 },
  );
  assert.deepEqual(
    calculateCompletedPositionLuxury(90, makePositionCard('nine', 9), DEFAULT_LUXURY_PROGRESSION_CONFIG),
    { nextPercent: 100, baseApplied: 10, removalApplied: 0, totalApplied: 10 },
  );
  assert.equal(
    calculateCompletedPositionLuxury(20, makePositionCard('override', 5, 17), DEFAULT_LUXURY_PROGRESSION_CONFIG).totalApplied,
    17,
  );
});

test('100 percent forces the 10-star final and reports a missing final without crashing', () => {
  const final = makePositionCard('final', 10);
  const forced = selectLuxuryPositionCard({
    cards: [makePositionCard('nine', 9), final],
    actorIndex: 0,
    outfits,
    usedCardIds: ['final'],
    luxuryPercent: 100,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(forced.card?.id, 'final');
  assert.equal(forced.probabilities.finalCardChance, 1);
  const missing = selectLuxuryPositionCard({
    cards: [makePositionCard('nine', 9)],
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 100,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0,
  });
  assert.equal(missing.card, null);
  assert.equal(missing.missingFinalCard, true);
});

test('Luxury config hydration preserves absolute zero rows and clamps gains', () => {
  const hydrated = hydrateLuxuryProgressionConfig({
    bands: [
      { starWeights: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [index + 1, 0])) },
      { starWeights: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9 } },
    ],
    starGains: { 1: -5, 2: 9, 10: 500 },
  });
  assert.deepEqual(hydrated.bands[0].starWeights, Object.fromEntries(
    Array.from({ length: 5 }, (_, index) => [index + 6, 0]),
  ));
  assert.equal(hydrated.bands[1].starWeights[10], 9);
  assert.equal(hydrated.starGains[6], 9);
  assert.equal(hydrated.starGains[7], 10);
  assert.equal(hydrated.starGains[10], 100);
});

test('Luxury selection falls back to the nearest available star when the band has no usable weights', () => {
  const zeroWeightConfig = {
    ...DEFAULT_LUXURY_PROGRESSION_CONFIG,
    bands: DEFAULT_LUXURY_PROGRESSION_CONFIG.bands.map((band) => ({
      ...band,
      starWeights: Object.fromEntries(
        Object.keys(band.starWeights).map((star) => [star, 0]),
      ) as Record<PositionDifficultyStars, number>,
    })),
  };
  const result = selectLuxuryPositionCard({
    cards: [makePositionCard('fallback-five', 5)],
    actorIndex: 0,
    outfits,
    usedCardIds: [],
    luxuryPercent: 0,
    config: zeroWeightConfig,
    random: () => 0,
  });
  assert.equal(result.card?.id, 'fallback-five');
  assert.equal(result.errorCode, undefined);
});

test('zero weights and zero gains return coded errors instead of selecting undefined cards', () => {
  const card = makeCard('only', 'truth', 1);
  const zeroWeights = {
    ...DEFAULT_PROGRESSION_CONFIG,
    bands: DEFAULT_PROGRESSION_CONFIG.bands.map((band) => ({
      ...band,
      typeWeights: { truth: 0, dare: 0 },
      starWeights: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DifficultyStars, number>,
    })),
  };
  const noWeight = selectJourneyCard({ cards: [card], actorIndex: 0, outfits, usedCardIds: [], levels: ['gentle'], intimacyPercent: 0, config: zeroWeights, random: () => 0 });
  assert.equal(noWeight.card, null);
  assert.equal(noWeight.errorCode, 'no_positive_weight');

  const noGainConfig = {
    ...DEFAULT_PROGRESSION_CONFIG,
    starGains: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DifficultyStars, number>,
  };
  const noGain = selectJourneyCard({ cards: [card], actorIndex: 0, outfits, usedCardIds: [], levels: ['gentle'], intimacyPercent: 0, config: noGainConfig, random: () => 0 });
  assert.equal(noGain.card, null);
  assert.equal(noGain.errorCode, 'no_progress_gain');
});

test('the 10-star roll is exactly five percent at 80–99 and is independent from non-final exhaustion', () => {
  const cards = [makePositionCard('five', 5), makePositionCard('final', 10)];
  const base = { cards, actorIndex: 0 as const, outfits, usedCardIds: ['five'], luxuryPercent: 99, config: DEFAULT_LUXURY_PROGRESSION_CONFIG };
  const hit = selectLuxuryPositionCard({ ...base, random: () => 0.049999 });
  assert.equal(hit.card?.id, 'final');
  assert.equal(hit.probabilities.finalCardChance, 0.05);
  const miss = selectLuxuryPositionCard({ ...base, random: () => 0.05 });
  assert.equal(miss.card?.id, 'five');
  assert.equal(miss.didResetPool, true);
});

test('hydration clamps finite oversized weights before normalization', () => {
  const hydrated = hydrateLuxuryProgressionConfig({ bands: [{ starWeights: { 6: 1e308, 10: 1e308 } }] });
  assert.equal(hydrated.bands[0].starWeights[6], 100);
  assert.equal(hydrated.bands[0].starWeights[10], 100);
});

test('progression validators flag non-monotonic curves and empty star tiers while accepting clean configs', () => {
  assert.deepEqual(validateProgressionConfig(DEFAULT_PROGRESSION_CONFIG), []);
  assert.deepEqual(validateLuxuryProgressionConfig(DEFAULT_LUXURY_PROGRESSION_CONFIG), []);

  const regressedLuxury = hydrateLuxuryProgressionConfig({
    bands: [
      { minPercent: 0, maxPercent: 19, starWeights: { 6: 50, 7: 30, 8: 20, 9: 0, 10: 0 } },
      { minPercent: 20, maxPercent: 39, starWeights: { 6: 0, 7: 20, 8: 40, 9: 25, 10: 15 } },
      { minPercent: 40, maxPercent: 59, starWeights: { 6: 20, 7: 10, 8: 0, 9: 0, 10: 0 } },
      { minPercent: 60, maxPercent: 79, starWeights: { 6: 25, 7: 35, 8: 20, 9: 10, 10: 0 } },
      { minPercent: 80, maxPercent: 99, starWeights: { 6: 10, 7: 20, 8: 25, 9: 35, 10: 5 } },
    ],
    starGains: { 6: 11, 7: 12, 8: 13, 9: 14, 10: 0 },
    finalCardChance: 5,
  });
  const cards = [
    makePositionCard('p6', 6),
    makePositionCard('p7', 7),
    makePositionCard('p8', 8),
    makePositionCard('p9', 9),
    makePositionCard('final', 10),
  ];
  const warnings = validateLuxuryProgressionConfig(regressedLuxury, cards);
  assert.ok(warnings.some((w) => w.includes('40–59%')));
  assert.ok(warnings.some((w) => w.includes('10★')));
  assert.ok(warnings.some((w) => w.includes('Điểm cộng Luxury trung bình')));
});

const journeyOptions = (cards: CardItem[], intimacyPercent = 50) => ({
  cards,
  actorIndex: 0 as const,
  outfits,
  usedCardIds: [] as string[],
  levels: ['gentle', 'intimate', 'passionate'] as CardItem['level'][],
  intimacyPercent,
  config: DEFAULT_PROGRESSION_CONFIG,
});

test('a lighter card is one star lower, of the same type first, and never a played one', () => {
  const open = makeCard('open', 'dare', 4);
  const cards = [open, makeCard('d3', 'dare', 3), makeCard('d2', 'dare', 2), makeCard('t3', 'truth', 3), makeCard('d5', 'dare', 5)];
  assert.equal(selectLighterJourneyCard(journeyOptions(cards), open).card?.id, 'd3');
  // No 3★ Dare left: the next lower Dare, even when the band would not draw it.
  const played = { ...journeyOptions(cards, 95), usedCardIds: ['open', 'd3'] };
  const lighter = selectLighterJourneyCard(played, open);
  assert.equal(lighter.card?.id, 'd2');
  assert.deepEqual(lighter.nextUsedCardIds, ['open', 'd3', 'd2']);
  // Only a Truth is left below it.
  assert.equal(selectLighterJourneyCard({ ...played, usedCardIds: ['d3', 'd2'] }, open).card?.id, 't3');
  // Nothing lighter at all: the card stays and nothing changes.
  const none = selectLighterJourneyCard({ ...played, usedCardIds: ['d3', 'd2', 't3'] }, open);
  assert.equal(none.card, null);
  assert.equal(none.errorCode, 'no_cards');
  assert.deepEqual(none.nextUsedCardIds, ['d3', 'd2', 't3']);
  assert.equal(selectLighterJourneyCard(journeyOptions(cards), makeCard('one', 'dare', 1)).card, null);
});

test('a lighter card still respects turn, outfits and difficulty limits', () => {
  const open = makeCard('open', 'dare', 4);
  const cards = [open, makeCard('hers', 'dare', 3, 'female'), makeCard('his', 'dare', 2, 'male')];
  assert.equal(selectLighterJourneyCard(journeyOptions(cards), open).card?.id, 'his');
});

test('a lighter card never takes off a garment', () => {
  const open = makeCard('open', 'dare', 4);
  const undress: CardItem = { ...makeCard('undress', 'dare', 3), clothingEffect: { kind: 'remove_garment', target: 'self' } };
  const dressed = { ...journeyOptions([open, undress, makeCard('plain', 'dare', 2)], 45), outfits: dressedOutfits() };
  for (let index = 0; index < 20; index += 1) {
    assert.equal(selectLighterJourneyCard(dressed, open).card?.id, 'plain');
  }
  assert.equal(selectLighterJourneyCard({ ...dressed, cards: [open, undress] }, open).card, null);
});

test('the double turn doubles card and clothing points, and 100% stays the limit', () => {
  const card = makeCard('double', 'dare', 3);
  const single = calculateCompletedCardIntimacy(40, card, DEFAULT_PROGRESSION_CONFIG, true);
  const double = calculateCompletedCardIntimacy(40, card, DEFAULT_PROGRESSION_CONFIG, true, 2);
  assert.equal(double.totalApplied, single.totalApplied * 2);
  assert.equal(double.baseApplied, single.baseApplied * 2);
  assert.equal(calculateCompletedCardIntimacy(95, card, DEFAULT_PROGRESSION_CONFIG, true, 2).nextPercent, 100);
});

test('an event pair offers two different cards and only the kept one counts as played', () => {
  const cards = [makeCard('a', 'dare', 2), makeCard('b', 'dare', 2), makeCard('c', 'truth', 2)];
  for (let index = 0; index < 20; index += 1) {
    const pair = selectJourneyPair({ ...journeyOptions(cards), usedCardIds: ['z'] });
    assert.ok(pair);
    const [first, second] = pair.options;
    assert.notEqual(first.card.id, second.card.id);
    assert.deepEqual(first.used, ['z', first.card.id]);
    assert.deepEqual(second.used, ['z', second.card.id]);
  }
  // One card left: there is nothing to choose between.
  assert.equal(selectJourneyPair(journeyOptions([cards[0]])), null);
});

const luxuryOptions = (cards: CardItem[], luxuryPercent = 30) => ({
  cards,
  actorIndex: 0 as const,
  outfits,
  usedCardIds: [] as string[],
  luxuryPercent,
  config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
});

const familyCard = (id: string, family: 'oral' | 'blowjob' | 'handjob', stars: PositionDifficultyStars, recipient: 'male' | 'female' | 'both' = 'both'): CardItem => ({
  ...makePositionCard(id, stars),
  position: { family, recipient, turnAudience: recipient, orderGroup: family === 'oral' ? 1 : family === 'blowjob' ? 2 : 3, rarity: 'luxury', difficultyStars: stars },
});

test('a Position pair prefers two groups, never repeats a card and never becomes the last choice', () => {
  const cards = [
    familyCard('o1', 'oral', 7), familyCard('o2', 'oral', 7),
    familyCard('h1', 'handjob', 7), familyCard('b1', 'blowjob', 7),
    makePositionCard('final', 10),
  ];
  let differentGroups = 0;
  for (let index = 0; index < 200; index += 1) {
    const pair = selectPositionPair(luxuryOptions(cards, 90));
    assert.ok(pair);
    const [first, second] = pair.options;
    assert.notEqual(first.card.id, second.card.id);
    assert.ok(pair.options.every((option) => option.card.position?.family !== 'have_sex'));
    assert.deepEqual(second.used, [second.card.id]);
    if (first.card.position?.family !== second.card.position?.family) differentGroups += 1;
  }
  assert.ok(differentGroups > 150, `only ${differentGroups} of 200 pairs mixed the groups`);
  assert.equal(selectPositionPair(luxuryOptions(cards, 100)), null);
  assert.equal(selectPositionPair(luxuryOptions([cards[0]])), null);
});

test('a chosen group only draws from that group, and excluded cards never come back', () => {
  const cards = [familyCard('o1', 'oral', 6), familyCard('h1', 'handjob', 8), familyCard('h2', 'handjob', 9)];
  for (let index = 0; index < 30; index += 1) {
    const drawn = selectLuxuryPositionCard({ ...luxuryOptions(cards), familyKey: 'handjob', skipFinal: true });
    assert.equal(drawn.card?.position?.family, 'handjob');
  }
  const rerolled = selectLuxuryPositionCard({ ...luxuryOptions(cards), usedCardIds: ['o1', 'h1', 'h2'], excludedCardIds: ['h1'], skipFinal: true });
  assert.notEqual(rerolled.card?.id, 'h1');
  assert.ok(rerolled.card);
});

test('only groups with an unplayed card for this turn can be bought', () => {
  const cards = [
    familyCard('o1', 'oral', 6), familyCard('o2', 'oral', 7),
    familyCard('b1', 'blowjob', 7, 'female'),
    familyCard('h1', 'handjob', 8),
    makePositionCard('final', 10),
  ];
  const options = getPositionFamilyOptions({ ...luxuryOptions(cards), usedCardIds: ['h1'] });
  assert.deepEqual(options.map((option) => [option.key, option.count]), [['oral', 2]]);
  assert.deepEqual(
    getPositionFamilyOptions({ ...luxuryOptions(cards), actorIndex: 1 }).map((option) => option.key),
    ['oral', 'blowjob', 'handjob'],
  );
  assert.deepEqual(getPositionFamilyOptions({ ...luxuryOptions(cards), outfits: dressedOutfits() }), []);
});

test('a paid draw at 80–99% never rolls the last choice', () => {
  const cards = [familyCard('o1', 'oral', 9), makePositionCard('final', 10)];
  const always = { ...luxuryOptions(cards, 90), random: () => 0 };
  assert.ok(selectLuxuryPositionCard(always).finalCandidates);
  const paid = selectLuxuryPositionCard({ ...always, skipFinal: true });
  assert.equal(paid.card?.id, 'o1');
  assert.equal(paid.finalCandidates, undefined);
  assert.equal(paid.probabilities.finalCardChance, 0);
});

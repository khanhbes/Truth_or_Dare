import assert from 'node:assert/strict';
import test from 'node:test';
import type { CardItem, DifficultyStars, PositionDifficultyStars } from '../types';
import { createCardDirectorState } from './cardDirector';
import { createOutfitState, DEFAULT_GAME_SETTINGS } from './wardrobe';
import {
  DEFAULT_LUXURY_PROGRESSION_CONFIG,
  DEFAULT_PROGRESSION_CONFIG,
  FINAL_CHOICE_CARD_COUNT,
  deriveDifficultyStars,
  getJourneyDrawAnalysis,
  selectFinalChoiceCandidates,
  selectJourneyCard,
  selectLuxuryPositionCard,
} from './progression';

// Regression tests for the 2026-11 draw-logic audit.

const emptyOutfits = [
  createOutfitState({ ...DEFAULT_GAME_SETTINGS.outfits[0], garments: {} }),
  createOutfitState({ ...DEFAULT_GAME_SETTINGS.outfits[1], garments: {} }),
] as const;

const dressedOutfits = () => [
  createOutfitState(DEFAULT_GAME_SETTINGS.outfits[0]),
  createOutfitState(DEFAULT_GAME_SETTINGS.outfits[1]),
] as const;

const seededRandom = (seed = 42) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const standardCard = (
  id: string,
  type: 'truth' | 'dare',
  stars: DifficultyStars,
  level: CardItem['level'] = 'gentle',
): CardItem => ({
  id,
  type,
  level,
  content: id,
  deck: 'standard',
  progression: { difficultyStars: stars, turnAudience: 'both' },
});

const positionCard = (
  id: string,
  stars: PositionDifficultyStars,
  family: 'oral' | 'blowjob' | 'handjob' | 'have_sex' = stars === 10 ? 'have_sex' : 'oral',
): CardItem => ({
  id,
  type: 'dare',
  level: 'passionate',
  content: id,
  deck: 'position',
  position: {
    family,
    turnAudience: 'both',
    orderGroup: family === 'have_sex' ? 4 : family === 'handjob' ? 3 : family === 'blowjob' ? 2 : 1,
    rarity: family === 'have_sex' ? 'mythic' : 'luxury',
    difficultyStars: stars,
  },
});

test('clothing preferences never collapse the draw onto a single clothing card', () => {
  const stripSelf: CardItem = {
    ...standardCard('strip-self', 'dare', 3, 'intimate'),
    clothingEffect: { kind: 'remove_garment', target: 'self' },
  };
  const plain = (['truth', 'dare'] as const).flatMap((type) =>
    ([1, 2, 3] as DifficultyStars[]).map((star) => standardCard(`${type}-${star}`, type, star, 'intimate')));
  const cards = [...plain, stripSelf];
  const base = {
    cards,
    actorIndex: 0 as const,
    outfits: dressedOutfits(),
    levels: ['intimate' as const],
    intimacyPercent: 45,
    config: DEFAULT_PROGRESSION_CONFIG,
    clothingHistory: [],
    firstRemoval: [false, false] as const,
    preferredClothingFamily: 'self' as const,
    directorState: createCardDirectorState(),
  };

  // Even with every clothing preference pointing at the strip card, the
  // candidate pool keeps every eligible card.
  const analysis = getJourneyDrawAnalysis({ ...base, usedCardIds: [] });
  assert.equal(analysis.candidates.length, cards.length);

  // Once drawn, the strip card is not served again while other cards remain.
  const random = seededRandom(7);
  let used: string[] = ['strip-self'];
  for (let draw = 0; draw < plain.length; draw += 1) {
    const result = selectJourneyCard({ ...base, usedCardIds: used, random });
    assert.notEqual(result.card?.id, 'strip-self');
    used = result.nextUsedCardIds;
  }
});

test('director draws give each (type, star) tier its displayed share regardless of tier size', () => {
  // Ten 1★ truths versus a single 2★ truth: the 2★ tier must keep its
  // configured share instead of being crowded out ten to one.
  const cards = [
    ...Array.from({ length: 10 }, (_, index) => standardCard(`one-${index}`, 'truth', 1)),
    standardCard('two', 'truth', 2),
  ];
  const options = {
    cards,
    actorIndex: 0 as const,
    outfits: dressedOutfits(),
    usedCardIds: [] as string[],
    levels: ['gentle' as const],
    intimacyPercent: 0,
    config: DEFAULT_PROGRESSION_CONFIG,
    directorState: createCardDirectorState(),
  };
  const shown = getJourneyDrawAnalysis(options).probabilities;
  const random = seededRandom(11);
  const draws = 4000;
  let twoStar = 0;
  for (let draw = 0; draw < draws; draw += 1) {
    if (deriveDifficultyStars(selectJourneyCard({ ...options, random }).card!) === 2) twoStar += 1;
  }
  assert.ok(shown.stars[2] > 0.25, `2★ share shown on screen: ${shown.stars[2]}`);
  assert.ok(
    Math.abs(twoStar / draws - shown.stars[2]) < 0.03,
    `drawn ${twoStar / draws} vs shown ${shown.stars[2]}`,
  );
});

test('Position draws prefer cards the couple has not opened yet', () => {
  const cards = ['a', 'b', 'c', 'd'].map((id) => positionCard(id, 6));
  const random = seededRandom(3);
  let openedPicks = 0;
  const draws = 400;
  for (let draw = 0; draw < draws; draw += 1) {
    const result = selectLuxuryPositionCard({
      cards,
      actorIndex: 0,
      outfits: emptyOutfits,
      usedCardIds: [],
      luxuryPercent: 0,
      config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
      accountUnlockedCardIds: ['a', 'b', 'c'],
      random,
    });
    if (result.card?.id !== 'd') openedPicks += 1;
  }
  // Three opened cards keep 10% weight each against one unopened card (~23%).
  assert.ok(openedPicks / draws < 0.35, `opened share ${openedPicks / draws}`);
});

test('Position draws balance families within a session', () => {
  const cards = [
    positionCard('oral-1', 6, 'oral'),
    positionCard('oral-2', 6, 'oral'),
    positionCard('oral-3', 6, 'oral'),
    positionCard('oral-4', 6, 'oral'),
    positionCard('blow-1', 6, 'blowjob'),
    positionCard('hand-1', 6, 'handjob'),
  ];
  const random = seededRandom(5);
  const runs = 300;
  let otherFamilies = 0;
  for (let run = 0; run < runs; run += 1) {
    // Two oral cards already drawn this session: favour the other families.
    const result = selectLuxuryPositionCard({
      cards,
      actorIndex: 0,
      outfits: emptyOutfits,
      usedCardIds: ['oral-1', 'oral-2'],
      luxuryPercent: 0,
      config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
      random,
    });
    if (result.card?.position?.family !== 'oral') otherFamilies += 1;
  }
  assert.ok(otherFamilies / runs > 0.8, `non-oral share ${otherFamilies / runs}`);
});

test('Have Sex is offered as three distinct face-down cards, unopened first', () => {
  const finals = ['f1', 'f2', 'f3', 'f4', 'f5'].map((id) => positionCard(id, 10));
  const forced = selectLuxuryPositionCard({
    cards: [positionCard('nine', 9), ...finals],
    actorIndex: 1,
    outfits: emptyOutfits,
    usedCardIds: [],
    luxuryPercent: 100,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    accountUnlockedCardIds: ['f1', 'f2'],
    random: seededRandom(9),
  });
  const ids = forced.finalCandidates?.map((card) => card.id) ?? [];
  assert.equal(ids.length, FINAL_CHOICE_CARD_COUNT);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), ['f3', 'f4', 'f5']);
  assert.equal(forced.card?.id, ids[0]);

  const fewer = selectFinalChoiceCandidates(finals.slice(0, 2), [], 3, seededRandom(1));
  assert.equal(fewer.length, 2);
});

test('the Have Sex chance at 80–99% no longer depends on Luxury star weights', () => {
  const result = selectLuxuryPositionCard({
    cards: [positionCard('eight', 8), positionCard('final', 10)],
    actorIndex: 0,
    outfits: emptyOutfits,
    usedCardIds: [],
    luxuryPercent: 85,
    config: DEFAULT_LUXURY_PROGRESSION_CONFIG,
    random: () => 0.01,
  });
  assert.equal(DEFAULT_LUXURY_PROGRESSION_CONFIG.bands[4].starWeights[10], 0);
  assert.equal(result.probabilities.finalCardChance, 0.05);
  assert.equal(result.finalCandidates?.[0]?.id, 'final');
});

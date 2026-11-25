/**
 * Full-journey Monte Carlo simulator. It mirrors GameTable: the same selection options
 * (clothing preferences, account novelty, director), a Dare only when a clothing milestone
 * has already waited one draw, skip penalties (never before 20%), the "both outfits empty"
 * rule before the Position deck, event turns at 25/50/75%, the free lighter card, stars
 * spent in the Position deck and the three-card Have Sex choice.
 *
 * Usage:
 *   npx tsx scripts/simulate-journey.ts [--runs=600] [--config=default|staging] [--live=FILE]
 *     [--skip=0.08] [--penalty=0.5] [--posskip=0.05]
 *     [--events=0.85] [--match=0.45] [--lighter=0.5] [--spend=0.5]
 *     [--sessions=10 --couples=200]   (multi-session novelty mode)
 *
 * --live=FILE reads a saved copy of GET /api/catalog instead of the snapshot in data/catalog.
 * --events=0 --lighter=0 --spend=0 plays without event turns, lighter cards and Position purchases.
 *
 * Play style (all are assumptions): skip/posskip = cards refused; penalty = a refusal paid with a
 * garment; events = events accepted; match = an answer both picked; lighter = a refusal turned
 * into the free lighter card; spend = eagerness to buy in the Position deck.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CardItem, OutfitState, PlayerIndex, PlayerRewardState } from '../src/types';
import { EXPANSION_CARDS, EXPANSION_CLOTHING_CARDS } from '../src/data/expansionCards';
import { INITIAL_CARDS } from '../src/data/cards';
import { createCardDirectorState, recordDirectedCard, recordDirectorStarsSpent } from '../src/utils/cardDirector';
import { migrateLegacyLuxuryConfig, parseStoredCards } from '../src/utils/cardSchema';
import { getRemovalTargetIndices, mergeEditedSystemCard, normalizeCardClothingEffect } from '../src/utils/cardSelection';
import { normalizeCardTimerSeconds, resolveCardTimerSeconds } from '../src/utils/cardTimer';
import { withoutCardFrames } from '../src/utils/cardFrames';
import {
  advanceClothingTurn,
  clothingEffectFamily,
  createClothingJourney,
  getActiveOpportunity,
  resolveClothingOpportunity,
} from '../src/utils/clothingJourney';
import {
  DEFAULT_LUXURY_PROGRESSION_CONFIG,
  DEFAULT_PROGRESSION_CONFIG,
  calculateCompletedCardIntimacy,
  calculateCompletedPositionLuxury,
  deriveDifficultyStars,
  getCardTurnAudience,
  getPositionFamilyOptions,
  hydrateLuxuryProgressionConfig,
  hydrateProgressionConfig,
  selectJourneyCard,
  selectJourneyPair,
  selectLighterJourneyCard,
  selectLuxuryPositionCard,
  selectPositionPair,
} from '../src/utils/progression';
import {
  consumeScheduledRemoval,
  createDynamicClothingSchedule,
  getActiveClothingRemovalTarget,
  injectClothingDirective,
  shouldForceClothingDare,
  shouldInjectClothingDirective,
  updateDynamicClothingScheduler,
} from '../src/utils/dynamicClothingScheduler';
import {
  DOUBLE_MULTIPLIER,
  MATCH_QUESTION_COUNT,
  MATCH_STAR_REWARD,
  createGameEvents,
  finishEvent,
  getDueEvent,
} from '../src/utils/gameEvents';
import {
  FINAL_FLIP_THREE_STAR_COST,
  FINAL_FLIP_TWO_STAR_COST,
  POSITION_FAMILY_STAR_COST,
  POSITION_PAIR_STAR_COST,
  POSITION_REROLL_STAR_COST,
  awardStars,
  createRewardStates,
  getSharedStarBalance,
  giftStars,
  spendSharedStars,
} from '../src/utils/rewards';
import {
  DEFAULT_OUTFITS,
  createOutfitState,
  getOutfitStage,
  getPresentGarmentSlots,
  getRemovableGarments,
  removeGarment,
  swapGarments,
} from '../src/utils/wardrobe';

const arg = (name: string, fallback: string) =>
  process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const runs = Number(arg('runs', '600'));
const configMode = arg('config', 'default');
const liveFile = arg('live', '');
const skipRate = Number(arg('skip', '0.08'));
const penaltyRate = Number(arg('penalty', '0.5'));
const positionSkipRate = Number(arg('posskip', '0.05'));
const eventRate = Number(arg('events', '0.85'));
const matchRate = Number(arg('match', '0.45'));
const lighterRate = Number(arg('lighter', '0.5'));
const spendRate = Number(arg('spend', '0.5'));
const sessions = Number(arg('sessions', '0'));
const couples = Number(arg('couples', '200'));

const root = path.resolve(import.meta.dirname, '..');
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

const loadDeck = (): CardItem[] => {
  if (!liveFile) {
    const catalog = readJson(path.join(root, 'data/catalog/catalog.json'));
    return withoutCardFrames([...catalog.cards, ...EXPANSION_CLOTHING_CARDS]);
  }
  // The same merge as the app: built-in cards with the cloud's edits, plus the cloud's own cards.
  const live = readJson(path.resolve(liveFile));
  const edited = new Map(parseStoredCards(live.editedCards).map((card) => [card.id, card] as const));
  const deleted = new Set<string>(live.deletedSystemCardIds ?? []);
  return withoutCardFrames([
    ...[...INITIAL_CARDS, ...EXPANSION_CARDS]
      .filter((card) => !deleted.has(card.id))
      .map((card) => mergeEditedSystemCard(card, edited.get(card.id))),
    ...parseStoredCards(live.customCards),
  ]);
};
const cards: CardItem[] = loadDeck().map((card) => normalizeCardClothingEffect(card));
const stored = liveFile ? readJson(path.resolve(liveFile)) : readJson(path.join(root, 'data/catalog/seed-bundle.json'));
const useStored = liveFile ? configMode !== 'default' || !process.argv.some((item) => item.startsWith('--config=')) : configMode === 'staging';
const progressionConfig = useStored ? hydrateProgressionConfig(stored.progressionConfig) : DEFAULT_PROGRESSION_CONFIG;
const luxuryConfig = useStored
  ? hydrateLuxuryProgressionConfig(migrateLegacyLuxuryConfig(stored.luxuryProgressionConfig))
  : DEFAULT_LUXURY_PROGRESSION_CONFIG;
const LEVELS: CardItem['level'][] = ['gentle', 'intimate', 'passionate'];

const random = Math.random;
const pick = <T,>(items: readonly T[]): T | null => (items.length ? items[Math.floor(random() * items.length)] : null);
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN);
const pct = (values: number[], p: number) => {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};
const round = (value: number) => Math.round(value * 10) / 10;
const stat = (values: number[]) => ({ avg: round(avg(values)), p10: round(pct(values, 10)), p50: round(pct(values, 50)), p90: round(pct(values, 90)) });

// ---------------- Time model (seconds, assumptions) ----------------
const TRUTH_SECONDS = 90;
const DARE_OVERHEAD = 45;
const DARE_WITHOUT_TIMER = 45;
const REMOVAL_SECONDS = 25;
const SKIP_SECONDS = 30;
const PENALTY_SECONDS = 20;
const PASS_SECONDS = 20;
const FINAL_SECONDS = 60;
const MATCH_SECONDS = 150;
const SWAP_SECONDS = 45;
const DOUBLE_SECONDS = 10;
const REFUSED_EVENT_SECONDS = 5;
const LIGHTER_SECONDS = 10;
const POSITION_OVERHEAD = 45;
/** Untimed Position card when the couple goes at its own pace. */
const POSITION_FREE_SECONDS = 150;
const PAIR_SECONDS = 30;
const FAMILY_SECONDS = 20;
const REROLL_SECONDS = 10;
const FLIP_SECONDS = 15;

const standardSeconds = (card: CardItem, removal: boolean) =>
  (card.type === 'truth' ? TRUTH_SECONDS : DARE_OVERHEAD + (resolveCardTimerSeconds(card) ?? DARE_WITHOUT_TIMER))
  + (removal ? REMOVAL_SECONDS : 0);

interface SessionResult {
  standardDraws: number;
  standardCompleted: number;
  extensionDraws: number;
  firstRemovalAt: number | null;
  bothUnderwearAt: number | null;
  allRemovedByCards: boolean;
  removals: Record<'scheduled' | 'fixed' | 'penalty', number>;
  standardNew: number;
  repeats: number;
  starsByBand: number[][];
  truthByBand: number[][];
  performed: [number, number];
  starsEarned: [number, number];
  eventsOffered: number;
  eventsPlayed: number;
  eventStars: number;
  lighterUsed: number;
  positionStart: number;
  spent: Record<'pair' | 'family' | 'reroll' | 'flips', number>;
  starsLeft: number;
  positionDraws: number;
  positionNew: number;
  families: Record<string, number>;
  finalId: string | null;
  finalNew: boolean | null;
  reachedPosition: boolean;
  stuck: boolean;
  standardSeconds: number;
  /** Position deck: at the couple's own pace, and exactly by the suggested time. */
  positionSeconds: { free: number; hint: number };
}

const simulateSession = (unlocked: Set<string>): SessionResult => {
  let outfits: [OutfitState, OutfitState] = [createOutfitState(DEFAULT_OUTFITS[0], 0), createOutfitState(DEFAULT_OUTFITS[1], 1)];
  let scheduler = createDynamicClothingSchedule(outfits);
  let journey = createClothingJourney();
  let director = createCardDirectorState([...unlocked]);
  let rewards: [PlayerRewardState, PlayerRewardState] = createRewardStates();
  let events = createGameEvents(0, random);
  let used: string[] = [];
  let intimacy = 0;
  let actor: PlayerIndex = 0;
  let turnNumber = 1;
  let waitedId: string | null = null;
  const lighterUsed: [boolean, boolean] = [false, false];
  const seen = new Set<string>();
  const result: SessionResult = {
    standardDraws: 0, standardCompleted: 0, extensionDraws: 0, firstRemovalAt: null, bothUnderwearAt: null,
    allRemovedByCards: false, removals: { scheduled: 0, fixed: 0, penalty: 0 }, standardNew: 0, repeats: 0,
    starsByBand: Array.from({ length: 6 }, () => [0, 0, 0, 0, 0]),
    truthByBand: Array.from({ length: 6 }, () => [0, 0]),
    performed: [0, 0], starsEarned: [0, 0], eventsOffered: 0, eventsPlayed: 0, eventStars: 0, lighterUsed: 0,
    positionStart: 0, spent: { pair: 0, family: 0, reroll: 0, flips: 0 }, starsLeft: 0,
    positionDraws: 0, positionNew: 0, families: {}, finalId: null, finalNew: null, reachedPosition: false, stuck: false,
    standardSeconds: 0, positionSeconds: { free: 0, hint: 0 },
  };
  const markRemoval = (source: keyof SessionResult['removals']) => {
    result.removals[source] += 1;
    if (result.firstRemovalAt === null) result.firstRemovalAt = intimacy;
    if (result.bothUnderwearAt === null && outfits.every((outfit) => getOutfitStage(outfit) !== 'dressed')) {
      result.bothUnderwearAt = intimacy;
    }
  };
  const removeOne = (target: PlayerIndex, source: keyof SessionResult['removals']) => {
    const slot = pick(getRemovableGarments(outfits[target]));
    if (!slot) return false;
    outfits[target] = removeGarment(outfits[target], slot);
    markRemoval(source);
    return true;
  };
  const advance = () => {
    journey = advanceClothingTurn(journey);
    actor = actor === 0 ? 1 : 0;
    turnNumber += 1;
  };
  const bothEmpty = () => outfits.every((outfit) => getOutfitStage(outfit) === 'empty');

  // ---------------- Standard (Tim Hồng) ----------------
  for (let turn = 0; turn < 400; turn += 1) {
    const due = getActiveClothingRemovalTarget(scheduler, intimacy, outfits);
    const opportunity = getActiveOpportunity(journey, intimacy);
    const options = {
      cards, actorIndex: actor, outfits, usedCardIds: used, levels: LEVELS, intimacyPercent: intimacy,
      config: progressionConfig, difficultyBoost: false, accountUnlockedCardIds: unlocked,
      preferredClothingFamily: opportunity?.eventType === 'catch_up' ? 'opponent' as const : opportunity?.eventType ?? null,
      clothingHistory: journey.history, firstRemoval: journey.firstRemoval, directorState: director,
    };
    const force = shouldForceClothingDare(due, waitedId, intimacy);

    // An event comes before the draw that follows its milestone.
    const event = eventRate > 0 ? getDueEvent(events, intimacy) : null;
    let drawn: { card: CardItem; used: string[] } | null = null;
    if (event) {
      result.eventsOffered += 1;
      events = finishEvent(events, event);
      if (random() >= eventRate) result.standardSeconds += REFUSED_EVENT_SECONDS;
      else {
        result.eventsPlayed += 1;
        if (event.kind === 'match') {
          const matches = Array.from({ length: MATCH_QUESTION_COUNT }, () => random() < matchRate).filter(Boolean).length;
          rewards = giftStars(rewards, matches * MATCH_STAR_REWARD);
          result.eventStars += matches * MATCH_STAR_REWARD * 2;
          result.standardSeconds += MATCH_SECONDS;
        } else if (event.kind === 'double') {
          events = { ...events, doubleNext: true };
          result.standardSeconds += DOUBLE_SECONDS;
        } else {
          const pair = (force ? selectJourneyPair({ ...options, preferredType: 'dare' }) : null)
            ?? selectJourneyPair({ ...options, preferredType: null });
          drawn = pair ? pick(pair.options) : null;
          result.standardSeconds += SWAP_SECONDS;
        }
      }
    }

    if (!drawn) {
      let selection = force ? selectJourneyCard({ ...options, preferredType: 'dare' }) : null;
      if (!selection?.card) selection = selectJourneyCard({ ...options, preferredType: null });
      if (!selection.card) { result.stuck = true; return result; }
      drawn = { card: selection.card, used: selection.nextUsedCardIds };
    }
    let card = drawn.card;
    used = drawn.used;
    if (!unlocked.has(card.id)) result.standardNew += 1;
    if (seen.has(card.id)) result.repeats += 1;
    seen.add(card.id);
    let trigger = null as typeof due;
    if (due && shouldInjectClothingDirective(card)) {
      trigger = due;
      card = injectClothingDirective(card, actor, due.targetIndex);
      waitedId = null;
    } else waitedId = due?.itemId ?? null;
    director = recordDirectedCard(director, card);
    result.standardDraws += 1;
    if (intimacy >= 100) result.extensionDraws += 1;
    const band = Math.min(5, Math.floor(intimacy / 20));
    result.starsByBand[band][deriveDifficultyStars(card) - 1] += 1;
    result.truthByBand[band][card.type === 'truth' ? 0 : 1] += 1;

    if (card.gameplayEffect?.kind === 'pass_turn') {
      unlocked.add(card.id);
      result.standardSeconds += PASS_SECONDS;
      advance();
      continue;
    }

    let refused = random() < skipRate;
    if (refused && deriveDifficultyStars(card) >= 2 && !lighterUsed[actor] && random() < lighterRate) {
      const lighter = selectLighterJourneyCard({ ...options, usedCardIds: used, directorState: director, preferredType: null }, card);
      if (lighter.card) {
        lighterUsed[actor] = true;
        result.lighterUsed += 1;
        result.standardSeconds += LIGHTER_SECONDS;
        if (trigger) {
          scheduler = updateDynamicClothingScheduler(scheduler, trigger.itemId, trigger.targetIndex, 'skipped', intimacy, turnNumber);
          trigger = null;
        }
        const active = getActiveOpportunity(journey, intimacy);
        if (active) journey = resolveClothingOpportunity(journey, active.index, 'rerolled');
        card = lighter.card;
        used = lighter.nextUsedCardIds;
        director = recordDirectedCard(director, card);
        refused = random() < skipRate;
        if (card.gameplayEffect?.kind === 'pass_turn') {
          unlocked.add(card.id);
          result.standardSeconds += PASS_SECONDS;
          advance();
          continue;
        }
      }
    }

    if (!refused) {
      let includeBonus = false;
      let removalTarget: PlayerIndex | undefined;
      if (card.clothingEffect?.kind === 'swap_garments') {
        const first = pick(getRemovableGarments(outfits[0]));
        const second = pick(getRemovableGarments(outfits[1]));
        const swapped = first && second ? swapGarments(outfits, first, second) : null;
        if (swapped) { outfits = swapped.outfits; includeBonus = true; }
      } else if (card.clothingEffect?.kind === 'remove_garment') {
        const targets = getRemovalTargetIndices(card, actor);
        if (targets.length === 2) {
          removeOne(0, 'fixed');
          removeOne(1, 'fixed');
          scheduler = consumeScheduledRemoval(consumeScheduledRemoval(scheduler, 0), 1);
          includeBonus = true;
        } else if (targets.length === 1 && getRemovableGarments(outfits[targets[0]]).length > 0) {
          removeOne(targets[0], trigger ? 'scheduled' : 'fixed');
          removalTarget = targets[0];
          includeBonus = true;
          if (!trigger) scheduler = consumeScheduledRemoval(scheduler, targets[0]);
        }
      }
      const multiplier = events.doubleNext ? DOUBLE_MULTIPLIER : 1;
      if (events.doubleNext) events = { ...events, doubleNext: false };
      const gain = calculateCompletedCardIntimacy(intimacy, card, progressionConfig, includeBonus, multiplier);
      unlocked.add(card.id);
      result.standardCompleted += 1;
      result.performed[actor] += 1;
      result.starsEarned[actor] += deriveDifficultyStars(card);
      rewards = awardStars(rewards, actor, deriveDifficultyStars(card));
      const family = clothingEffectFamily(card.clothingEffect);
      if (family) {
        const active = getActiveOpportunity(journey, intimacy);
        journey = active
          ? resolveClothingOpportunity(journey, active.index, 'completed', family, removalTarget)
          : { ...journey, history: [...journey.history, family], pityCounter: 0, turnsSinceClothing: 0 };
      }
      if (trigger) scheduler = updateDynamicClothingScheduler(scheduler, trigger.itemId, trigger.targetIndex, 'completed', gain.nextPercent, turnNumber);
      intimacy = gain.nextPercent;
      result.standardSeconds += standardSeconds(card, includeBonus);
      if (intimacy >= 100 && bothEmpty()) break;
      advance();
    } else {
      result.standardSeconds += SKIP_SECONDS;
      if (intimacy >= 20 && getRemovableGarments(outfits[actor]).length > 0 && random() < penaltyRate) {
        removeOne(actor, 'penalty');
        scheduler = consumeScheduledRemoval(scheduler, actor);
        result.standardSeconds += PENALTY_SECONDS;
      }
      const active = getActiveOpportunity(journey, intimacy);
      journey = active ? resolveClothingOpportunity(journey, active.index, 'skipped') : { ...journey, pityCounter: Math.min(5, journey.pityCounter + 1) };
      if (trigger) scheduler = updateDynamicClothingScheduler(scheduler, trigger.itemId, trigger.targetIndex, 'skipped', intimacy, turnNumber);
      if (intimacy >= 100 && bothEmpty()) break;
      advance();
    }
  }
  if (!(intimacy >= 100 && bothEmpty())) { result.stuck = true; return result; }
  result.allRemovedByCards = getPresentGarmentSlots(outfits[0]).length + getPresentGarmentSlots(outfits[1]).length === 0;
  result.reachedPosition = true;
  // The turn passes on when the couple agrees to the Position deck.
  advance();
  result.positionStart = getSharedStarBalance(rewards);

  // ---------------- Position (Luxury) ----------------
  let luxury = 0;
  let positionUsed: string[] = [];
  const addPositionSeconds = (seconds: number) => {
    result.positionSeconds.free += seconds;
    result.positionSeconds.hint += seconds;
  };
  const buy = (kind: keyof SessionResult['spent'], cost: number, seconds: number): boolean => {
    const spend = spendSharedStars(rewards, actor, cost);
    if (!spend) return false;
    rewards = spend.rewards;
    director = recordDirectorStarsSpent(director, cost);
    result.spent[kind] += 1;
    addPositionSeconds(seconds);
    return true;
  };
  for (let turn = 0; turn < 200; turn += 1) {
    const options = {
      cards, actorIndex: actor, outfits, usedCardIds: positionUsed, luxuryPercent: luxury,
      config: luxuryConfig, accountUnlockedCardIds: unlocked,
    };
    let drawn: { card: CardItem; used: string[] } | null = null;
    if (luxury < 100 && random() < 0.4 * spendRate && getSharedStarBalance(rewards) >= POSITION_PAIR_STAR_COST) {
      const pair = selectPositionPair(options);
      if (pair && buy('pair', POSITION_PAIR_STAR_COST, PAIR_SECONDS)) drawn = pick(pair.options);
    } else if (luxury < 100 && random() < 0.3 * spendRate && getSharedStarBalance(rewards) >= POSITION_FAMILY_STAR_COST) {
      const groups = getPositionFamilyOptions(options).filter((group) =>
        selectLuxuryPositionCard({ ...options, familyKey: group.key, skipFinal: true }).card !== null);
      const group = groups.length >= 2 ? pick(groups) : null;
      const chosen = group ? selectLuxuryPositionCard({ ...options, familyKey: group.key, skipFinal: true }) : null;
      if (chosen?.card && buy('family', POSITION_FAMILY_STAR_COST, FAMILY_SECONDS)) {
        drawn = { card: chosen.card, used: chosen.nextUsedCardIds };
      }
    }
    if (!drawn) {
      const selection = selectLuxuryPositionCard(options);
      if (selection.finalCandidates?.length) {
        if (random() < spendRate && selection.finalCandidates.length > 1) {
          if (getSharedStarBalance(rewards) >= FINAL_FLIP_THREE_STAR_COST) buy('flips', FINAL_FLIP_THREE_STAR_COST, FLIP_SECONDS);
          else buy('flips', FINAL_FLIP_TWO_STAR_COST, FLIP_SECONDS);
        }
        const chosen = pick(selection.finalCandidates)!;
        result.finalId = chosen.id;
        result.finalNew = !unlocked.has(chosen.id);
        unlocked.add(chosen.id);
        addPositionSeconds(FINAL_SECONDS);
        break;
      }
      if (!selection.card) { advance(); continue; }
      drawn = { card: selection.card, used: selection.nextUsedCardIds };
    }
    positionUsed = drawn.used;
    let card = drawn.card;
    if (random() < 0.12 * spendRate && getSharedStarBalance(rewards) >= POSITION_REROLL_STAR_COST) {
      const other = selectLuxuryPositionCard({ ...options, usedCardIds: positionUsed, excludedCardIds: [card.id], skipFinal: true });
      if (other.card && buy('reroll', POSITION_REROLL_STAR_COST, REROLL_SECONDS)) {
        card = other.card;
        positionUsed = other.nextUsedCardIds;
      }
    }
    result.positionDraws += 1;
    if (!unlocked.has(card.id)) result.positionNew += 1;
    const family = `${card.position?.family}:${card.position?.turnAudience ?? card.position?.recipient ?? getCardTurnAudience(card)}`;
    result.families[family] = (result.families[family] ?? 0) + 1;
    if (random() < positionSkipRate) {
      addPositionSeconds(SKIP_SECONDS);
      advance();
      continue;
    }
    unlocked.add(card.id);
    luxury = calculateCompletedPositionLuxury(luxury, card, luxuryConfig).nextPercent;
    result.positionSeconds.free += POSITION_OVERHEAD + (normalizeCardTimerSeconds(card.timerSeconds) ?? POSITION_FREE_SECONDS);
    result.positionSeconds.hint += POSITION_OVERHEAD + (resolveCardTimerSeconds(card) ?? POSITION_FREE_SECONDS);
    advance();
  }
  result.starsLeft = getSharedStarBalance(rewards);
  return result;
};

if (sessions > 0) {
  const rows = Array.from({ length: sessions }, () => ({ standardNew: [] as number[], positionNew: [] as number[], finalNew: [] as number[] }));
  for (let couple = 0; couple < couples; couple += 1) {
    const unlocked = new Set<string>();
    for (let session = 0; session < sessions; session += 1) {
      const outcome = simulateSession(unlocked);
      rows[session].standardNew.push(outcome.standardNew / Math.max(1, outcome.standardDraws));
      if (outcome.reachedPosition) rows[session].positionNew.push(outcome.positionNew / Math.max(1, outcome.positionDraws));
      if (outcome.finalNew !== null) rows[session].finalNew.push(outcome.finalNew ? 1 : 0);
    }
  }
  console.log(JSON.stringify({
    deck: liveFile || 'data/catalog', couples, sessions,
    newCardShareBySession: rows.map((row, index) => ({
      session: index + 1,
      standard: `${round(avg(row.standardNew) * 100)}%`,
      position: `${round(avg(row.positionNew) * 100)}%`,
      haveSex: `${round(avg(row.finalNew) * 100)}%`,
    })),
  }, null, 2));
} else {
  const outcomes = Array.from({ length: runs }, () => simulateSession(new Set<string>()));
  const reached = outcomes.filter((outcome) => outcome.reachedPosition);
  const sum = (key: 'starsByBand' | 'truthByBand') => outcomes.reduce(
    (acc, outcome) => acc.map((row, band) => row.map((value, index) => value + outcome[key][band][index])),
    outcomes[0][key].map((row) => row.map(() => 0)),
  );
  const labels = ['0-19', '20-39', '40-59', '60-79', '80-99', '100'];
  const families: Record<string, number> = {};
  reached.forEach((outcome) => Object.entries(outcome.families).forEach(([key, value]) => { families[key] = (families[key] ?? 0) + value; }));
  const familyTotal = Object.values(families).reduce((a, b) => a + b, 0) || 1;
  const minutes = (seconds: (outcome: SessionResult) => number) => stat(reached.map((outcome) => seconds(outcome) / 60));
  const mean = (value: (outcome: SessionResult) => number) => round(avg(reached.map(value)));
  console.log(JSON.stringify({
    runs, deck: liveFile || 'data/catalog', cards: cards.length, config: useStored ? 'stored' : 'default',
    playStyle: { skipRate, penaltyRate, positionSkipRate, eventRate, matchRate, lighterRate, spendRate },
    reachedPosition: `${round((reached.length / runs) * 100)}%`,
    minutes: {
      ownPace: minutes((outcome) => outcome.standardSeconds + outcome.positionSeconds.free),
      byTheHint: minutes((outcome) => outcome.standardSeconds + outcome.positionSeconds.hint),
      standard: minutes((outcome) => outcome.standardSeconds),
      positionOwnPace: minutes((outcome) => outcome.positionSeconds.free),
      positionByTheHint: minutes((outcome) => outcome.positionSeconds.hint),
    },
    standard: {
      draws: stat(outcomes.map((outcome) => outcome.standardDraws)),
      completed: stat(outcomes.map((outcome) => outcome.standardCompleted)),
      extensionDrawsAt100: stat(outcomes.map((outcome) => outcome.extensionDraws)),
      repeatedCards: mean((outcome) => outcome.repeats),
      firstRemovalAt: stat(outcomes.map((outcome) => outcome.firstRemovalAt).filter((value): value is number => value !== null)),
      bothUnderwearAt: stat(outcomes.map((outcome) => outcome.bothUnderwearAt).filter((value): value is number => value !== null)),
      removalsPerSession: Object.fromEntries((['scheduled', 'fixed', 'penalty'] as const).map((key) => [key, round(avg(outcomes.map((outcome) => outcome.removals[key])))])),
      performedByPlayer: [mean((outcome) => outcome.performed[0]), mean((outcome) => outcome.performed[1])],
      starsByBand: sum('starsByBand').map((row, band) => {
        const total = row.reduce((a, b) => a + b, 0) || 1;
        return `${labels[band]}% (n=${total}): ${row.map((value, star) => `${star + 1}★ ${Math.round((value / total) * 100)}%`).join(' ')}`;
      }),
      truthShareByBand: sum('truthByBand').map((row, band) => `${labels[band]}%: truth ${Math.round((row[0] / ((row[0] + row[1]) || 1)) * 100)}%`),
    },
    eventTurns: {
      offered: mean((outcome) => outcome.eventsOffered),
      played: mean((outcome) => outcome.eventsPlayed),
      lighterCardsUsed: mean((outcome) => outcome.lighterUsed),
    },
    stars: {
      earnedByPlayer: [mean((outcome) => outcome.starsEarned[0]), mean((outcome) => outcome.starsEarned[1])],
      fromEvents: mean((outcome) => outcome.eventStars),
      atPositionStart: mean((outcome) => outcome.positionStart),
      positionPurchases: Object.fromEntries((['pair', 'family', 'reroll', 'flips'] as const).map((key) => [key, mean((outcome) => outcome.spent[key])])),
      leftAtTheEnd: mean((outcome) => outcome.starsLeft),
    },
    position: {
      draws: stat(reached.map((outcome) => outcome.positionDraws)),
      familyShare: Object.fromEntries(Object.entries(families).sort().map(([key, value]) => [key, `${round((value / familyTotal) * 100)}%`])),
    },
    stuck: outcomes.filter((outcome) => outcome.stuck).length,
  }, null, 2));
}

/**
 * Full-journey Monte Carlo simulator using the real catalog snapshot
 * (data/catalog) plus the playable expansion cards. It mirrors GameTable:
 * the same selection options (clothing preferences, account novelty, director),
 * dare-first draws when a garment removal is due, skip penalties (never before
 * 20%), the "both outfits empty" rule before the Position deck, and the
 * three-card Have Sex choice.
 *
 * Usage:
 *   npx tsx scripts/simulate-journey.ts [--runs=3000] [--config=default|staging]
 *     [--skip=0.08] [--penalty=0.5] [--posskip=0.05]
 *     [--sessions=10 --couples=200]   (multi-session novelty mode)
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CardItem, OutfitState, PlayerIndex } from '../src/types';
import { EXPANSION_CLOTHING_CARDS } from '../src/data/expansionCards';
import { createCardDirectorState, recordDirectedCard } from '../src/utils/cardDirector';
import { getRemovalTargetIndices, normalizeCardClothingEffect } from '../src/utils/cardSelection';
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
  derivePositionDifficultyStars,
  hydrateLuxuryProgressionConfig,
  hydrateProgressionConfig,
  selectJourneyCard,
  selectLuxuryPositionCard,
} from '../src/utils/progression';
import {
  consumeScheduledRemoval,
  createDynamicClothingSchedule,
  getActiveClothingRemovalTarget,
  injectClothingDirective,
  shouldInjectClothingDirective,
  updateDynamicClothingScheduler,
} from '../src/utils/dynamicClothingScheduler';
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
  process.argv.find((item) => item.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const runs = Number(arg('runs', '3000'));
const configMode = arg('config', 'default');
const skipRate = Number(arg('skip', '0.08'));
const penaltyRate = Number(arg('penalty', '0.5'));
const positionSkipRate = Number(arg('posskip', '0.05'));
const sessions = Number(arg('sessions', '0'));
const couples = Number(arg('couples', '200'));

const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog/catalog.json'), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog/seed-bundle.json'), 'utf8'));
const cards: CardItem[] = withoutCardFrames([...catalog.cards, ...EXPANSION_CLOTHING_CARDS])
  .map((card: CardItem) => normalizeCardClothingEffect(card));
const progressionConfig = configMode === 'staging' ? hydrateProgressionConfig(seed.progressionConfig) : DEFAULT_PROGRESSION_CONFIG;
const luxuryConfig = configMode === 'staging' ? hydrateLuxuryProgressionConfig(seed.luxuryProgressionConfig) : DEFAULT_LUXURY_PROGRESSION_CONFIG;
const LEVELS: CardItem['level'][] = ['gentle', 'intimate', 'passionate'];

const random = Math.random;
const pick = <T,>(items: T[]): T | null => (items.length ? items[Math.floor(random() * items.length)] : null);
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN);
const pct = (values: number[], p: number) => {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};
const round = (value: number) => Math.round(value * 10) / 10;
const stat = (values: number[]) => ({ avg: round(avg(values)), p10: pct(values, 10), p50: pct(values, 50), p90: pct(values, 90) });

interface SessionResult {
  standardDraws: number;
  standardCompleted: number;
  extensionDraws: number;
  firstRemovalAt: number | null;
  bothUnderwearAt: number | null;
  allRemovedByCards: boolean;
  removals: Record<'scheduled' | 'fixed' | 'penalty', number>;
  standardNew: number;
  starsByBand: number[][];
  truthByBand: number[][];
  positionDraws: number;
  positionNew: number;
  families: Record<string, number>;
  finalId: string | null;
  finalNew: boolean | null;
  reachedPosition: boolean;
  stuck: boolean;
}

const simulateSession = (unlocked: Set<string>): SessionResult => {
  let outfits: [OutfitState, OutfitState] = [createOutfitState(DEFAULT_OUTFITS[0], 0), createOutfitState(DEFAULT_OUTFITS[1], 1)];
  let scheduler = createDynamicClothingSchedule(outfits);
  let journey = createClothingJourney();
  let director = createCardDirectorState([...unlocked]);
  let used: string[] = [];
  let intimacy = 0;
  let actor: PlayerIndex = 0;
  let round = 1;
  const result: SessionResult = {
    standardDraws: 0, standardCompleted: 0, extensionDraws: 0, firstRemovalAt: null, bothUnderwearAt: null,
    allRemovedByCards: false, removals: { scheduled: 0, fixed: 0, penalty: 0 }, standardNew: 0,
    starsByBand: Array.from({ length: 6 }, () => [0, 0, 0, 0, 0]),
    truthByBand: Array.from({ length: 6 }, () => [0, 0]),
    positionDraws: 0, positionNew: 0, families: {}, finalId: null, finalNew: null, reachedPosition: false, stuck: false,
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
    round += 1;
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
    let selection = due ? selectJourneyCard({ ...options, preferredType: 'dare' }) : null;
    if (!selection?.card) selection = selectJourneyCard({ ...options, preferredType: null });
    if (!selection.card) { result.stuck = true; return result; }
    let card = selection.card;
    if (!unlocked.has(card.id)) result.standardNew += 1;
    let trigger = null as typeof due;
    if (due && shouldInjectClothingDirective(card)) {
      trigger = due;
      card = injectClothingDirective(card, actor, due.targetIndex);
    }
    director = recordDirectedCard(director, card);
    used = selection.nextUsedCardIds;
    result.standardDraws += 1;
    if (intimacy >= 100) result.extensionDraws += 1;
    const band = Math.min(5, Math.floor(intimacy / 20));
    result.starsByBand[band][deriveDifficultyStars(card) - 1] += 1;
    result.truthByBand[band][card.type === 'truth' ? 0 : 1] += 1;

    if (card.gameplayEffect?.kind === 'pass_turn') { unlocked.add(card.id); advance(); continue; }

    if (random() >= skipRate) {
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
      const gain = calculateCompletedCardIntimacy(intimacy, card, progressionConfig, includeBonus);
      unlocked.add(card.id);
      result.standardCompleted += 1;
      const family = clothingEffectFamily(card.clothingEffect);
      if (family) {
        const active = getActiveOpportunity(journey, intimacy);
        journey = active
          ? resolveClothingOpportunity(journey, active.index, 'completed', family, removalTarget)
          : { ...journey, history: [...journey.history, family], pityCounter: 0, turnsSinceClothing: 0 };
      }
      if (trigger) scheduler = updateDynamicClothingScheduler(scheduler, trigger.itemId, trigger.targetIndex, 'completed', gain.nextPercent, round);
      intimacy = gain.nextPercent;
      if (intimacy >= 100 && bothEmpty()) break;
      advance();
    } else {
      if (intimacy >= 20 && getRemovableGarments(outfits[actor]).length > 0 && random() < penaltyRate) {
        removeOne(actor, 'penalty');
        scheduler = consumeScheduledRemoval(scheduler, actor);
      }
      const active = getActiveOpportunity(journey, intimacy);
      journey = active ? resolveClothingOpportunity(journey, active.index, 'skipped') : { ...journey, pityCounter: Math.min(5, journey.pityCounter + 1) };
      if (trigger) scheduler = updateDynamicClothingScheduler(scheduler, trigger.itemId, trigger.targetIndex, 'skipped', intimacy, round);
      if (intimacy >= 100 && bothEmpty()) break;
      advance();
    }
  }
  if (!(intimacy >= 100 && bothEmpty())) { result.stuck = true; return result; }
  result.allRemovedByCards = getPresentGarmentSlots(outfits[0]).length + getPresentGarmentSlots(outfits[1]).length === 0;
  result.reachedPosition = true;

  // ---------------- Position (Luxury) ----------------
  let luxury = 0;
  let positionUsed: string[] = [];
  for (let turn = 0; turn < 200; turn += 1) {
    const selection = selectLuxuryPositionCard({
      cards, actorIndex: actor, outfits, usedCardIds: positionUsed, luxuryPercent: luxury,
      config: luxuryConfig, accountUnlockedCardIds: unlocked,
    });
    if (selection.finalCandidates?.length) {
      const chosen = pick(selection.finalCandidates)!;
      result.finalId = chosen.id;
      result.finalNew = !unlocked.has(chosen.id);
      unlocked.add(chosen.id);
      break;
    }
    if (!selection.card) { advance(); continue; }
    positionUsed = selection.nextUsedCardIds;
    const card = selection.card;
    result.positionDraws += 1;
    if (!unlocked.has(card.id)) result.positionNew += 1;
    const family = `${card.position?.family}:${card.position?.turnAudience ?? card.position?.recipient}`;
    result.families[family] = (result.families[family] ?? 0) + 1;
    if (random() < positionSkipRate) { advance(); continue; }
    unlocked.add(card.id);
    luxury = calculateCompletedPositionLuxury(luxury, card, luxuryConfig).nextPercent;
    advance();
  }
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
    configMode, couples, sessions,
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
  console.log(JSON.stringify({
    runs, configMode, skipRate, penaltyRate, positionSkipRate,
    reachedPosition: `${round((reached.length / runs) * 100)}%`,
    standard: {
      draws: stat(outcomes.map((outcome) => outcome.standardDraws)),
      completed: stat(outcomes.map((outcome) => outcome.standardCompleted)),
      extensionDrawsAt100: stat(outcomes.map((outcome) => outcome.extensionDraws)),
      firstRemovalAt: stat(outcomes.map((outcome) => outcome.firstRemovalAt).filter((value): value is number => value !== null)),
      bothUnderwearAt: stat(outcomes.map((outcome) => outcome.bothUnderwearAt).filter((value): value is number => value !== null)),
      removalsPerSession: Object.fromEntries((['scheduled', 'fixed', 'penalty'] as const).map((key) => [key, round(avg(outcomes.map((outcome) => outcome.removals[key])))])),
      starsByBand: sum('starsByBand').map((row, band) => {
        const total = row.reduce((a, b) => a + b, 0) || 1;
        return `${labels[band]}% (n=${total}): ${row.map((value, star) => `${star + 1}★ ${Math.round((value / total) * 100)}%`).join(' ')}`;
      }),
      truthShareByBand: sum('truthByBand').map((row, band) => `${labels[band]}%: truth ${Math.round((row[0] / ((row[0] + row[1]) || 1)) * 100)}%`),
    },
    position: {
      draws: stat(reached.map((outcome) => outcome.positionDraws)),
      familyShare: Object.fromEntries(Object.entries(families).sort().map(([key, value]) => [key, `${round((value / familyTotal) * 100)}%`])),
    },
    stuck: outcomes.filter((outcome) => outcome.stuck).length,
  }, null, 2));
}

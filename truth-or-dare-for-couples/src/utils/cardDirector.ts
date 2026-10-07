import type { CardItem, CardPhaseTag, OutfitState, PlayerIndex } from '../types';
import { getRemovalTargetIndices } from './cardSelection';
import { getPresentGarmentSlots } from './wardrobe';

export interface CardDirectorState {
  heatHistory: number[];
  typeHistory: Array<`${CardItem['type']}:${CardPhaseTag}`>;
  seenCardIds: string[];
  cardsCompletedCount: number;
  starsSpentThisSession: number;
  accountUnlockedCardIds?: string[];
}

export const createCardDirectorState = (accountUnlockedCardIds: string[] = []): CardDirectorState => ({
  heatHistory: [],
  typeHistory: [],
  seenCardIds: [],
  cardsCompletedCount: 0,
  starsSpentThisSession: 0,
  accountUnlockedCardIds,
});

export const getCardPhaseTag = (card: CardItem): CardPhaseTag => card.phaseTag ?? card.progression?.phaseTag ?? card.level;

export const getCardHeat = (card: CardItem): number => {
  const explicit = card.heat ?? card.progression?.heat;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) return Math.max(1, Math.min(10, Math.round(explicit)));
  const base = getCardPhaseTag(card) === 'gentle' ? 2 : getCardPhaseTag(card) === 'intimate' ? 5 : 8;
  return card.clothingEffect ? Math.min(10, base + 1) : base;
};

export const recordDirectedCard = (state: CardDirectorState, card: CardItem, completed = false): CardDirectorState => {
  const typePhase = `${card.type}:${getCardPhaseTag(card)}` as CardDirectorState['typeHistory'][number];
  return {
    ...state,
    heatHistory: [...state.heatHistory, getCardHeat(card)].slice(-3),
    typeHistory: [...state.typeHistory, typePhase].slice(-3),
    seenCardIds: state.seenCardIds.includes(card.id) ? state.seenCardIds : [...state.seenCardIds, card.id],
    cardsCompletedCount: state.cardsCompletedCount + (completed ? 1 : 0),
  };
};

export const recordDirectorStarsSpent = (
  state: CardDirectorState,
  stars: number,
): CardDirectorState => ({
  ...state,
  starsSpentThisSession: state.starsSpentThisSession + Math.max(0, stars),
});

const targetBalanceFactor = (card: CardItem, actorIndex: PlayerIndex, outfits: readonly [OutfitState, OutfitState]): number => {
  const removed = outfits.map((outfit) => Object.keys(outfit.initial.garments).length - getPresentGarmentSlots(outfit).length) as [number, number];
  const gap = removed[0] - removed[1];
  if (Math.abs(gap) < 2 || !card.clothingEffect) return 1;
  const behind = gap > 0 ? 1 : 0;
  const targets = getRemovalTargetIndices(card, actorIndex);
  if (targets.includes(behind)) return 1.8;
  if (targets.includes(behind === 0 ? 1 : 0)) return 0.45;
  return 1;
};

/** Weights valid candidate cards without turning the draw into an argmax. */
export const getDirectorWeights = (
  candidates: readonly CardItem[],
  state: CardDirectorState,
  actorIndex: PlayerIndex,
  outfits: readonly [OutfitState, OutfitState],
  accountUnlockedCardIds?: readonly string[] | ReadonlySet<string>,
): Map<string, number> => {
  const recentHeat = state.heatHistory.length
    ? state.heatHistory.reduce((sum, heat) => sum + heat, 0) / state.heatHistory.length : 1;
  const lastTwo = state.typeHistory.slice(-2);

  const rawUnlocked = accountUnlockedCardIds ?? state.accountUnlockedCardIds ?? [];
  const unlockedSet = rawUnlocked instanceof Set ? rawUnlocked : new Set(rawUnlocked);
  const hasUnopenedCandidates = candidates.some((c) => !unlockedSet.has(c.id));

  return new Map(candidates.map((card) => {
    const key = `${card.type}:${getCardPhaseTag(card)}` as const;
    const heat = getCardHeat(card);
    const repeatedType = lastTwo.filter((item) => item.split(':')[0] === card.type).length >= 2;
    const repeatedPhase = lastTwo.filter((item) => item === key).length >= 2;
    const heatFactor = heat > recentHeat + 1.5 ? 0.28 : heat > recentHeat + .5 ? 0.65 : 1;
    const pacing = (repeatedType ? .58 : 1) * (repeatedPhase ? .45 : 1);
    const novelty = state.seenCardIds.includes(card.id) ? .72 : 1.18;
    // 90% reduction penalty for cards that are already unlocked in the account
    const unlockPenalty = hasUnopenedCandidates && unlockedSet.has(card.id) ? 0.1 : 1.0;

    return [
      card.id,
      Math.max(.001, pacing * heatFactor * novelty * targetBalanceFactor(card, actorIndex, outfits) * unlockPenalty),
    ];
  }));
};

export const chooseDirectedCard = (cards: readonly CardItem[], weights: Map<string, number>, random: () => number): CardItem | null => {
  const total = cards.reduce((sum, card) => sum + (weights.get(card.id) ?? 0), 0);
  if (total <= 0) return null;
  let cursor = Math.max(0, Math.min(.999999999999, random())) * total;
  for (const card of cards) { cursor -= weights.get(card.id) ?? 0; if (cursor <= 0) return card; }
  return cards.at(-1) ?? null;
};

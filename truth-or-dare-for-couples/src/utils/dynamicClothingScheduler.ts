import {
  CardItem,
  ClothingEffect,
  OutfitState,
  PlayerIndex,
} from '../types';
import { getPresentGarmentSlots, getRemovableGarments } from './wardrobe';

export interface DynamicClothingScheduleItem {
  id: string;
  targetPlayerIndex: PlayerIndex;
  triggerIntimacyPercent: number;
  status: 'pending' | 'triggered' | 'completed' | 'skipped_rescheduled';
}

export interface DynamicClothingSchedulerState {
  items: DynamicClothingScheduleItem[];
  targetGarmentCounts: [number, number];
  completedRemovals: [number, number];
  lastTriggeredRound: number;
}

/** No clothing progression is scheduled before this intimacy level. */
export const CLOTHING_SCHEDULE_START_PERCENT = 20;
/** Outer layers (shirt/pants) are spread across this window so both reach underwear_only around 70–80%. */
export const OUTER_LAYER_WINDOW: readonly [number, number] = [22, 76];
/**
 * Inner layers (bra/underwear) are spread across this later window so every
 * garment is normally removed by a card before Tim Hồng reaches 100%.
 */
export const INNER_LAYER_WINDOW: readonly [number, number] = [76, 93];
/** From this intimacy level any remaining garment may be offered immediately. */
export const CLOTHING_CATCH_UP_PERCENT = 88;
/** A skipped removal comes back after roughly one more completed card. */
export const SKIPPED_REMOVAL_DELAY_PERCENT = 5;

const OUTER_SLOTS = new Set(['shirt', 'pants']);

/** Alternates players (random first player) so neither side is stripped twice in a row when avoidable. */
const interleaveTargets = (
  count0: number,
  count1: number,
  random: () => number,
): PlayerIndex[] => {
  const remaining: [number, number] = [count0, count1];
  const targets: PlayerIndex[] = [];
  let next: PlayerIndex = random() < 0.5 ? 0 : 1;
  while (remaining[0] + remaining[1] > 0) {
    if (remaining[next] === 0) next = next === 0 ? 1 : 0;
    targets.push(next);
    remaining[next] -= 1;
    next = next === 0 ? 1 : 0;
  }
  return targets;
};

const stratifiedPercents = (
  count: number,
  [min, max]: readonly [number, number],
  random: () => number,
): number[] => {
  if (count <= 0) return [];
  const binSize = (max - min) / count;
  return Array.from({ length: count }, (_, index) =>
    Math.max(min, Math.min(max, Math.round(min + index * binSize + random() * binSize * 0.85))),
  );
};

/**
 * Creates the Standard Journey clothing schedule.
 * One trigger per garment: outer layers are spread across 20–78% (alternating
 * players), inner layers across 82–95%, so the first removal lands around
 * 20–30% and both players reach underwear-only around 75–90%.
 */
export const createDynamicClothingSchedule = (
  outfits: readonly [OutfitState, OutfitState],
  random: () => number = Math.random,
): DynamicClothingSchedulerState => {
  const slots = outfits.map(getPresentGarmentSlots);
  const count0 = slots[0].length;
  const count1 = slots[1].length;
  const total = count0 + count1;

  if (total === 0) {
    return {
      items: [],
      targetGarmentCounts: [0, 0],
      completedRemovals: [0, 0],
      lastTriggeredRound: 0,
    };
  }

  const outerCounts = slots.map((list) => list.filter((slot) => OUTER_SLOTS.has(slot)).length);
  const innerCounts = slots.map((list, index) => list.length - outerCounts[index]);
  const outerTargets = interleaveTargets(outerCounts[0], outerCounts[1], random);
  const innerTargets = interleaveTargets(innerCounts[0], innerCounts[1], random);
  const outerPercents = stratifiedPercents(outerTargets.length, OUTER_LAYER_WINDOW, random);
  const innerPercents = stratifiedPercents(innerTargets.length, INNER_LAYER_WINDOW, random);

  const items: DynamicClothingScheduleItem[] = [
    ...outerTargets.map((targetIndex, index) => ({ targetIndex, percent: outerPercents[index] })),
    ...innerTargets.map((targetIndex, index) => ({ targetIndex, percent: innerPercents[index] })),
  ].map(({ targetIndex, percent }, index) => ({
    id: `strip-${index}-${targetIndex}-${Math.round(random() * 10000)}`,
    targetPlayerIndex: targetIndex,
    triggerIntimacyPercent: percent,
    status: 'pending' as const,
  }));

  items.sort((a, b) => a.triggerIntimacyPercent - b.triggerIntimacyPercent);

  return {
    items,
    targetGarmentCounts: [count0, count1],
    completedRemovals: [0, 0],
    lastTriggeredRound: 0,
  };
};

/**
 * Checks if a clothing removal should trigger on the current turn.
 * Returns the target player index to strip (0 or 1), or null if no strip is due.
 */
export const getActiveClothingRemovalTarget = (
  state: DynamicClothingSchedulerState,
  intimacyPercent: number,
  outfits: readonly [OutfitState, OutfitState],
): { targetIndex: PlayerIndex; itemId: string } | null => {
  const p0Removable = getRemovableGarments(outfits[0]).length > 0;
  const p1Removable = getRemovableGarments(outfits[1]).length > 0;

  if (!p0Removable && !p1Removable) {
    return null; // Both players already have 0 clothes left!
  }
  if (intimacyPercent < CLOTHING_SCHEDULE_START_PERCENT) return null;

  // 1. Late catch-up: any garment still on near the end of Level 1 is offered immediately.
  if (intimacyPercent >= CLOTHING_CATCH_UP_PERCENT) {
    if (p0Removable && p1Removable) {
      // Pick player with more garments remaining
      const g0 = getPresentGarmentSlots(outfits[0]).length;
      const g1 = getPresentGarmentSlots(outfits[1]).length;
      const target = g0 >= g1 ? 0 : 1;
      const pendingItem = state.items.find(
        (it) => it.status !== 'completed' && it.targetPlayerIndex === target,
      ) ?? state.items.find((it) => it.status !== 'completed');
      return { targetIndex: target, itemId: pendingItem?.id ?? 'emergency-strip' };
    }
    if (p0Removable) {
      const pendingItem = state.items.find(
        (it) => it.status !== 'completed' && it.targetPlayerIndex === 0,
      );
      return { targetIndex: 0, itemId: pendingItem?.id ?? 'emergency-strip-0' };
    }
    if (p1Removable) {
      const pendingItem = state.items.find(
        (it) => it.status !== 'completed' && it.targetPlayerIndex === 1,
      );
      return { targetIndex: 1, itemId: pendingItem?.id ?? 'emergency-strip-1' };
    }
  }

  // 2. Normal Scheduled Milestones:
  // Find the first pending item whose triggerIntimacyPercent is <= current intimacyPercent
  for (const item of state.items) {
    if (item.status === 'pending' && intimacyPercent >= item.triggerIntimacyPercent) {
      // Check if target player still has garments to remove
      if (item.targetPlayerIndex === 0 && p0Removable) {
        return { targetIndex: 0, itemId: item.id };
      }
      if (item.targetPlayerIndex === 1 && p1Removable) {
        return { targetIndex: 1, itemId: item.id };
      }
      // If target player is already stripped, divert to the other player if they have garments
      if (item.targetPlayerIndex === 0 && p1Removable) {
        return { targetIndex: 1, itemId: item.id };
      }
      if (item.targetPlayerIndex === 1 && p0Removable) {
        return { targetIndex: 0, itemId: item.id };
      }
    }
  }

  return null;
};

/**
 * Injects a clothing removal effect into a card dynamically if not already present.
 * The card text and hint stay untouched; the table renders the removal as a
 * dedicated banner on the card face so it is read aloud with the dare.
 */
export const injectClothingDirective = (
  card: CardItem,
  actorPlayerIndex: PlayerIndex,
  targetPlayerIndex: PlayerIndex,
): CardItem => {
  // If card already has a valid clothing effect targeting the desired recipient, keep it
  if (card.clothingEffect?.kind === 'remove_garment') {
    return card;
  }

  const clothingEffect: ClothingEffect = {
    kind: 'remove_garment',
    target: actorPlayerIndex === targetPlayerIndex ? 'self' : 'opponent',
  };

  return {
    ...card,
    clothingEffect,
  };
};

/**
 * Clothing directives are only attached to Standard Dare cards that do not
 * already carry their own clothing or gameplay effect. Truth questions never
 * receive a removal instruction.
 */
export const shouldInjectClothingDirective = (card: CardItem): boolean =>
  card.type === 'dare'
  && card.deck !== 'position'
  && !card.clothingEffect
  && !card.gameplayEffect;

/**
 * Records a garment removal that did not come from a scheduled trigger
 * (fixed clothing cards, both-removal cards or skip penalties) so the
 * schedule never asks for more removals than the outfits allow.
 */
export const consumeScheduledRemoval = (
  state: DynamicClothingSchedulerState,
  targetIndex: PlayerIndex,
): DynamicClothingSchedulerState => {
  const itemIndex = state.items.findIndex(
    (item) => item.status !== 'completed' && item.targetPlayerIndex === targetIndex,
  );
  const completedRemovals: [number, number] = [
    state.completedRemovals[0] + (targetIndex === 0 ? 1 : 0),
    state.completedRemovals[1] + (targetIndex === 1 ? 1 : 0),
  ];
  if (itemIndex < 0) return { ...state, completedRemovals };
  return {
    ...state,
    completedRemovals,
    items: state.items.map((item, index) =>
      index === itemIndex ? { ...item, status: 'completed' as const } : item,
    ),
  };
};

/**
 * Updates the scheduler state upon card resolution (completed or skipped).
 * If skipped, reschedules the removal opportunity to guarantee 100% strip by end of level.
 */
export const updateDynamicClothingScheduler = (
  state: DynamicClothingSchedulerState,
  itemId: string,
  targetIndex: PlayerIndex,
  result: 'completed' | 'skipped',
  currentIntimacy: number,
  round: number,
): DynamicClothingSchedulerState => {
  const itemIndex = state.items.findIndex((it) => it.id === itemId);

  if (result === 'completed') {
    const nextCompleted: [number, number] = [
      state.completedRemovals[0] + (targetIndex === 0 ? 1 : 0),
      state.completedRemovals[1] + (targetIndex === 1 ? 1 : 0),
    ];

    const nextItems = state.items.map((item, index) =>
      index === itemIndex ? { ...item, status: 'completed' as const } : item,
    );

    return {
      ...state,
      items: nextItems,
      completedRemovals: nextCompleted,
      lastTriggeredRound: round,
    };
  }

  // Result === 'skipped'
  // Reschedule the item a little later so the next card is not another removal.
  const nextItems = state.items.map((item, index) => {
    if (index === itemIndex) {
      return {
        ...item,
        status: 'pending' as const,
        triggerIntimacyPercent: Math.min(95, currentIntimacy + SKIPPED_REMOVAL_DELAY_PERCENT),
      };
    }
    return item;
  });

  return {
    ...state,
    items: nextItems,
    lastTriggeredRound: round,
  };
};

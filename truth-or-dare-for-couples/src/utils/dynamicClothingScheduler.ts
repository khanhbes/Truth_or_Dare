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

/**
 * Creates a randomized clothing removal schedule for Level 1 / Standard Journey (0% - 100%).
 * Generates exactly count0 triggers targeting Player 0 and count1 triggers targeting Player 1,
 * randomly distributed across the intimacy timeline.
 */
export const createDynamicClothingSchedule = (
  outfits: readonly [OutfitState, OutfitState],
  random: () => number = Math.random,
): DynamicClothingSchedulerState => {
  const count0 = getPresentGarmentSlots(outfits[0]).length;
  const count1 = getPresentGarmentSlots(outfits[1]).length;
  const total = count0 + count1;

  if (total === 0) {
    return {
      items: [],
      targetGarmentCounts: [0, 0],
      completedRemovals: [0, 0],
      lastTriggeredRound: 0,
    };
  }

  // Create an array of target player indices
  const targets: PlayerIndex[] = [];
  for (let i = 0; i < count0; i++) targets.push(0);
  for (let i = 0; i < count1; i++) targets.push(1);

  // Shuffle targets while avoiding long streaks of the same player
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }

  // Stratified random intervals between 6% and 92%
  // This ensures triggers appear randomly at ANY %, but well-spaced across the entire level
  const minRange = 6;
  const maxRange = 92;
  const rangeSpan = maxRange - minRange;
  const binSize = rangeSpan / total;

  const items: DynamicClothingScheduleItem[] = targets.map((targetIndex, index) => {
    const binStart = minRange + index * binSize;
    const jitter = random() * (binSize * 0.85);
    const triggerPercent = Math.max(
      minRange,
      Math.min(maxRange, Math.round(binStart + jitter)),
    );

    return {
      id: `strip-${index}-${targetIndex}-${Math.round(random() * 10000)}`,
      targetPlayerIndex: targetIndex,
      triggerIntimacyPercent: triggerPercent,
      status: 'pending',
    };
  });

  // Sort items by triggerIntimacyPercent so they execute in chronological order
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

  // 1. Emergency Catch-Up when intimacy >= 90%:
  // If players still have clothes left near the end of Level 1, trigger immediately!
  if (intimacyPercent >= 90) {
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
 */
export const injectClothingDirective = (
  card: CardItem,
  actorPlayerIndex: PlayerIndex,
  targetPlayerIndex: PlayerIndex,
  targetName: string,
): CardItem => {
  // If card already has a valid clothing effect targeting the desired recipient, keep it
  if (card.clothingEffect?.kind === 'remove_garment') {
    return card;
  }

  const effectTarget = actorPlayerIndex === targetPlayerIndex ? 'self' : 'opponent';
  const clothingEffect: ClothingEffect = {
    kind: 'remove_garment',
    target: effectTarget,
  };

  const actionText = actorPlayerIndex === targetPlayerIndex
    ? 'Tự cởi bỏ 1 món đồ đang mặc.'
    : `Cởi bỏ 1 món đồ của ${targetName}.`;

  const dynamicHint = card.hint
    ? `${card.hint} · 👕 Thử thách trang phục: ${actionText}`
    : `👕 Thử thách trang phục: ${actionText}`;

  return {
    ...card,
    clothingEffect,
    hint: dynamicHint,
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
  // Reschedule the item: push its trigger to next round or +2% intimacy
  const nextItems = state.items.map((item, index) => {
    if (index === itemIndex) {
      return {
        ...item,
        status: 'pending' as const,
        triggerIntimacyPercent: Math.min(95, currentIntimacy + 1),
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

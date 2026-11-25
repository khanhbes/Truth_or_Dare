import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLOTHING_CATCH_UP_PERCENT,
  CLOTHING_SCHEDULE_START_PERCENT,
  INNER_LAYER_WINDOW,
  OUTER_LAYER_WINDOW,
  SKIPPED_REMOVAL_DELAY_PERCENT,
  consumeScheduledRemoval,
  createDynamicClothingSchedule,
  getActiveClothingRemovalTarget,
  getTruthLockReason,
  injectClothingDirective,
  shouldForceClothingDare,
  shouldInjectClothingDirective,
  updateDynamicClothingScheduler,
} from './dynamicClothingScheduler';
import { DEFAULT_OUTFITS, createOutfitState } from './wardrobe';
import type { CardItem } from '../types';

const MALE_OUTFIT_3 = DEFAULT_OUTFITS[0];
const FEMALE_OUTFIT_4 = DEFAULT_OUTFITS[1];

test('dynamic schedule creates exact garment counts for both players (3 for male, 4 for female)', () => {
  const outfits = [createOutfitState(MALE_OUTFIT_3, 0), createOutfitState(FEMALE_OUTFIT_4, 1)] as const;
  const schedule = createDynamicClothingSchedule(outfits);

  assert.equal(schedule.items.length, 7);
  const maleTriggers = schedule.items.filter((it) => it.targetPlayerIndex === 0);
  const femaleTriggers = schedule.items.filter((it) => it.targetPlayerIndex === 1);

  assert.equal(maleTriggers.length, 3);
  assert.equal(femaleTriggers.length, 4);
  assert.deepEqual(schedule.targetGarmentCounts, [3, 4]);

  // Triggers are sorted chronologically, never before 20%: 4 outer triggers sit in
  // the outer window and the 3 inner ones in the inner window (the windows overlap,
  // so a sorted position does not tell which layer a trigger belongs to).
  const percents = schedule.items.map((item) => item.triggerIntimacyPercent);
  assert.ok(percents.every((percent) => percent >= CLOTHING_SCHEDULE_START_PERCENT && percent <= INNER_LAYER_WINDOW[1]));
  assert.ok(percents.filter((percent) => percent <= OUTER_LAYER_WINDOW[1]).length >= 4);
  assert.ok(percents.filter((percent) => percent >= INNER_LAYER_WINDOW[0]).length >= 3);
  for (let i = 1; i < percents.length; i++) assert.ok(percents[i] >= percents[i - 1]);
});

test('clothing triggers are spread out instead of bunching up at the end of the level', () => {
  // The last half of the garments must not all wait for the final stretch.
  assert.ok(OUTER_LAYER_WINDOW[1] <= 65, 'outer layers are off by ~65%');
  assert.ok(INNER_LAYER_WINDOW[0] <= OUTER_LAYER_WINDOW[1], 'inner layers start before the outer ones end');
  assert.ok(INNER_LAYER_WINDOW[1] < 95);
});

test('a due removal lets one draw pass, then forces a Dare; from the catch-up level it always does', () => {
  const trigger = { itemId: 'strip-0-1' };
  // Nothing due: never forced.
  assert.equal(shouldForceClothingDare(null, null, 99), false);
  // First draw after becoming due: free (a Truth can come up).
  assert.equal(shouldForceClothingDare(trigger, null, 40), false);
  assert.equal(shouldForceClothingDare(trigger, 'another-item', 40), false);
  // It has waited one draw without being attached: the next draw is a Dare.
  assert.equal(shouldForceClothingDare(trigger, trigger.itemId, 40), true);
  // Near the end it never waits.
  assert.equal(shouldForceClothingDare(trigger, null, CLOTHING_CATCH_UP_PERCENT), true);
  assert.equal(shouldForceClothingDare(trigger, null, CLOTHING_CATCH_UP_PERCENT - 1), false);
});

test('getActiveClothingRemovalTarget fires when intimacy reaches trigger threshold', () => {
  const outfits = [createOutfitState(MALE_OUTFIT_3, 0), createOutfitState(FEMALE_OUTFIT_4, 1)] as const;
  const schedule = createDynamicClothingSchedule(outfits, () => 0.5);

  const firstTrigger = schedule.items[0];
  // Before trigger threshold
  const before = getActiveClothingRemovalTarget(schedule, firstTrigger.triggerIntimacyPercent - 5, outfits);
  assert.equal(before, null);

  // At or after trigger threshold
  const atTrigger = getActiveClothingRemovalTarget(schedule, firstTrigger.triggerIntimacyPercent, outfits);
  assert.ok(atTrigger !== null);
  assert.equal(atTrigger.targetIndex, firstTrigger.targetPlayerIndex);
});

test('injectClothingDirective sets a valid removal target and leaves the card text untouched', () => {
  const dummyCard: CardItem = {
    id: 'test-dare-1',
    type: 'dare',
    level: 'intimate',
    content: 'Thử thách nhìn vào mắt nhau 15 giây.',
    hint: 'Gợi ý nhẹ nhàng',
  };

  // Actor 0 targets Opponent 1
  const injectedOpponent = injectClothingDirective(dummyCard, 0, 1);
  assert.deepEqual(injectedOpponent.clothingEffect, {
    kind: 'remove_garment',
    target: 'opponent',
  });
  // The table shows the removal as a banner; content and hint stay as written.
  assert.equal(injectedOpponent.hint, dummyCard.hint);
  assert.equal(injectedOpponent.content, dummyCard.content);

  // Actor 0 targets Self 0
  const injectedSelf = injectClothingDirective(dummyCard, 0, 0);
  assert.deepEqual(injectedSelf.clothingEffect, {
    kind: 'remove_garment',
    target: 'self',
  });
  assert.equal(injectedSelf.hint, dummyCard.hint);
});

test('updateDynamicClothingScheduler reschedules skipped strip opportunities', () => {
  const outfits = [createOutfitState(MALE_OUTFIT_3, 0), createOutfitState(FEMALE_OUTFIT_4, 1)] as const;
  const schedule = createDynamicClothingSchedule(outfits, () => 0.2);
  const firstItem = schedule.items[0];

  // User skips the strip card
  const skippedState = updateDynamicClothingScheduler(
    schedule,
    firstItem.id,
    firstItem.targetPlayerIndex,
    'skipped',
    30, // current intimacy
    5,  // current round
  );

  const updatedItem = skippedState.items.find((it) => it.id === firstItem.id);
  assert.ok(updatedItem);
  assert.equal(updatedItem.status, 'pending');
  assert.equal(updatedItem.triggerIntimacyPercent, 30 + SKIPPED_REMOVAL_DELAY_PERCENT);
});

test('shouldInjectClothingDirective only allows standard Dare cards without existing effects and consumeScheduledRemoval marks one pending item completed', () => {
  const truthCard: CardItem = { id: 't-1', type: 'truth', level: 'gentle', content: 'Hỏi' };
  const dareCard: CardItem = { id: 'd-1', type: 'dare', level: 'intimate', content: 'Thách' };
  const fixedStripCard: CardItem = {
    ...dareCard,
    id: 'd-strip',
    clothingEffect: { kind: 'remove_garment', target: 'self' },
  };
  assert.equal(shouldInjectClothingDirective(truthCard), false);
  assert.equal(shouldInjectClothingDirective(dareCard), true);
  assert.equal(shouldInjectClothingDirective(fixedStripCard), false);

  const outfits = [createOutfitState(MALE_OUTFIT_3, 0), createOutfitState(FEMALE_OUTFIT_4, 1)] as const;
  const schedule = createDynamicClothingSchedule(outfits, () => 0.4);
  const afterPenalty = consumeScheduledRemoval(schedule, 1);
  assert.deepEqual(afterPenalty.completedRemovals, [0, 1]);
  assert.equal(
    afterPenalty.items.filter((item) => item.targetPlayerIndex === 1 && item.status === 'completed').length,
    1,
  );
});

test('a skip penalty that already removed the scheduled garment does not revive that removal', () => {
  const outfits = [createOutfitState(MALE_OUTFIT_3, 0), createOutfitState(FEMALE_OUTFIT_4, 1)] as const;
  const schedule = createDynamicClothingSchedule(outfits, () => 0.25);
  const trigger = schedule.items.find((item) => item.targetPlayerIndex === 0)!;
  // The performer skips, takes the clothing penalty (consumes their earliest item),
  // and only then is the skipped trigger reported back to the scheduler.
  const afterPenalty = consumeScheduledRemoval(schedule, 0);
  assert.equal(afterPenalty.items.find((item) => item.id === trigger.id)?.status, 'completed');
  const afterSkip = updateDynamicClothingScheduler(afterPenalty, trigger.id, 0, 'skipped', 40, 5);
  assert.equal(afterSkip.items.find((item) => item.id === trigger.id)?.status, 'completed');
  assert.equal(afterSkip.items.filter((item) => item.status !== 'completed').length, schedule.items.length - 1);
});

test('choosing Truth is closed when a removal is due or Tim Hồng is full', () => {
  const both = ['truth', 'dare'] as const;
  const reason = (overrides: Partial<Parameters<typeof getTruthLockReason>[0]> = {}) => getTruthLockReason({
    availableTypes: both, forceClothingDare: false, intimacyPercent: 40, ...overrides,
  });
  assert.equal(reason(), null);
  assert.match(reason({ forceClothingDare: true }) ?? '', /đến hẹn cởi đồ/);
  assert.match(reason({ intimacyPercent: 100 }) ?? '', /Tim Hồng đã đầy/);
  assert.match(reason({ availableTypes: ['dare'] }) ?? '', /Không còn lá/);
  // With no Dare left the couple must not get stuck.
  assert.equal(reason({ availableTypes: ['truth'], forceClothingDare: true, intimacyPercent: 100 }), null);
});

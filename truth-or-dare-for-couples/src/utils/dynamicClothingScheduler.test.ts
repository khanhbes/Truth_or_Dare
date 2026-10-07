import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDynamicClothingSchedule,
  getActiveClothingRemovalTarget,
  injectClothingDirective,
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

  // Triggers should be sorted chronologically and bounded between 5% and 95%
  for (let i = 0; i < schedule.items.length; i++) {
    const item = schedule.items[i];
    assert.ok(item.triggerIntimacyPercent >= 5 && item.triggerIntimacyPercent <= 95);
    if (i > 0) {
      assert.ok(item.triggerIntimacyPercent >= schedule.items[i - 1].triggerIntimacyPercent);
    }
  }
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

test('injectClothingDirective sets valid removal target and adds directive to hint', () => {
  const dummyCard: CardItem = {
    id: 'test-dare-1',
    type: 'dare',
    level: 'intimate',
    content: 'Thử thách nhìn vào mắt nhau 15 giây.',
    hint: 'Gợi ý nhẹ nhàng',
  };

  // Actor 0 targets Opponent 1
  const injectedOpponent = injectClothingDirective(dummyCard, 0, 1, 'Em');
  assert.deepEqual(injectedOpponent.clothingEffect, {
    kind: 'remove_garment',
    target: 'opponent',
  });
  assert.ok(injectedOpponent.hint?.includes('Cởi bỏ 1 món đồ của Em'));

  // Actor 0 targets Self 0
  const injectedSelf = injectClothingDirective(dummyCard, 0, 0, 'Anh');
  assert.deepEqual(injectedSelf.clothingEffect, {
    kind: 'remove_garment',
    target: 'self',
  });
  assert.ok(injectedSelf.hint?.includes('Tự cởi bỏ 1 món đồ đang mặc'));
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
  // Trigger should be updated to re-fire soon (e.g. at 31% intimacy)
  assert.equal(updatedItem.triggerIntimacyPercent, 31);
});

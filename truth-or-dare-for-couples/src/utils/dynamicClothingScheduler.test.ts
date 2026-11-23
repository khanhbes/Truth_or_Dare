import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLOTHING_SCHEDULE_START_PERCENT,
  INNER_LAYER_WINDOW,
  OUTER_LAYER_WINDOW,
  SKIPPED_REMOVAL_DELAY_PERCENT,
  consumeScheduledRemoval,
  createDynamicClothingSchedule,
  getActiveClothingRemovalTarget,
  injectClothingDirective,
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

  // Triggers are sorted chronologically, never before 20%, with 4 outer items in the outer window and 3 inner items in the inner window
  for (let i = 0; i < schedule.items.length; i++) {
    const item = schedule.items[i];
    assert.ok(item.triggerIntimacyPercent >= CLOTHING_SCHEDULE_START_PERCENT && item.triggerIntimacyPercent <= 95);
    if (i < 4) {
      assert.ok(item.triggerIntimacyPercent >= OUTER_LAYER_WINDOW[0] && item.triggerIntimacyPercent <= OUTER_LAYER_WINDOW[1]);
    } else {
      assert.ok(item.triggerIntimacyPercent >= INNER_LAYER_WINDOW[0] && item.triggerIntimacyPercent <= INNER_LAYER_WINDOW[1]);
    }
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

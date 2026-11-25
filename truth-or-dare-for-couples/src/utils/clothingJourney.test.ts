import test from 'node:test';
import assert from 'node:assert/strict';
import { createOutfitState, DEFAULT_OUTFITS } from './wardrobe';
import { clothingEffectFamily, clothingWeight, createClothingJourney, expectedWardrobeProgress, getActiveOpportunity, getBothRemovalWeight, getWardrobeCatchUpTarget, normalizedWardrobeProgress, resolveClothingOpportunity, wardrobeDifference } from './clothingJourney';

const outfits = [createOutfitState(DEFAULT_OUTFITS[0]), createOutfitState(DEFAULT_OUTFITS[1])] as const;

test('clothing journey exposes six windows and respects two-turn cooldown', () => {
  let state = createClothingJourney();
  state = { ...state, turnsSinceClothing: 2 };
  assert.equal(state.opportunities.length, 6);
  assert.equal(getActiveOpportunity(state, 25)?.index, 0);
  state = resolveClothingOpportunity(state, 0, 'skipped');
  assert.equal(getActiveOpportunity(state, 25), null);
});

test('wardrobe progress is normalized per outfit, not by gender or garment count', () => {
  assert.equal(normalizedWardrobeProgress(outfits[0]), 0);
  assert.equal(wardrobeDifference(outfits), 0);
  assert.equal(expectedWardrobeProgress(90), 85);
});

test('pity and late catch-up increase clothing weight without auto-removing garments', () => {
  const state = { ...createClothingJourney(), pityCounter: 4, turnsSinceClothing: 2 };
  assert.ok(clothingWeight(state, 90, outfits) >= 8);
  assert.equal(normalizedWardrobeProgress(outfits[0]), 0);
});

test('effect family classification supports self, opponent, both and special', () => {
  assert.equal(clothingEffectFamily({ kind: 'remove_garment', target: 'self' }), 'self');
  assert.equal(clothingEffectFamily({ kind: 'remove_garment', target: 'opponent' }), 'opponent');
  assert.equal(clothingEffectFamily({ kind: 'remove_garment', target: 'both' }), 'both');
  assert.equal(clothingEffectFamily({ kind: 'swap_garments' }), 'special');
});

test('both-removal weighting follows intimacy bands and wardrobe catch-up uses normalized progress', () => {
  assert.equal(getBothRemovalWeight(10, outfits), 0);
  assert.ok(getBothRemovalWeight(30, outfits) > 0);
  assert.ok(getBothRemovalWeight(90, outfits) > getBothRemovalWeight(30, outfits));
  assert.equal(getWardrobeCatchUpTarget(outfits), null);
});

test('resolving an opportunity never mutates the previous journey state', () => {
  const before = { ...createClothingJourney(), turnsSinceClothing: 2 };
  const after = resolveClothingOpportunity(before, 0, 'completed', 'self', 1);
  assert.deepEqual(before.firstRemoval, [false, false]);
  assert.deepEqual(before.removalCount, [0, 0]);
  assert.deepEqual(after.firstRemoval, [false, true]);
  assert.deepEqual(after.removalCount, [0, 1]);
  assert.notEqual(after.firstRemoval, before.firstRemoval);
});

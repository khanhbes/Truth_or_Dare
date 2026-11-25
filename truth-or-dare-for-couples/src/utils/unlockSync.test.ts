import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeUnlockedCardIds, resolveUnlockedCardsOnLoad } from './unlockSync';

test('merging keeps every card once, server order first', () => {
  assert.deepEqual(mergeUnlockedCardIds(['b', 'a'], ['a', 'c']), ['b', 'a', 'c']);
  assert.deepEqual(mergeUnlockedCardIds([], []), []);
});

test('a card opened offline survives a reload of the same account', () => {
  assert.deepEqual(
    resolveUnlockedCardsOnLoad({ serverIds: ['a'], localIds: ['a', 'b'], localOwner: 'hai-dua', accountName: 'hai-dua' }),
    { cardIds: ['a', 'b'], needsUpload: true },
  );
});

test('nothing is uploaded when the account already has every card', () => {
  assert.deepEqual(
    resolveUnlockedCardsOnLoad({ serverIds: ['a', 'b'], localIds: ['b'], localOwner: 'hai-dua', accountName: 'hai-dua' }),
    { cardIds: ['a', 'b'], needsUpload: false },
  );
});

test("another account's or a guest's cards never leak in", () => {
  for (const localOwner of ['nguoi-khac', null]) {
    assert.deepEqual(
      resolveUnlockedCardsOnLoad({ serverIds: ['a'], localIds: ['x', 'y'], localOwner, accountName: 'hai-dua' }),
      { cardIds: ['a'], needsUpload: false },
    );
  }
});

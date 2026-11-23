import assert from 'node:assert/strict';
import test from 'node:test';
import type { CardItem } from '../types';
import {
  applyAccountCatalog,
  MAX_ACCOUNT_CUSTOM_CARDS,
  validateAccountCatalogInput,
  wouldBreakFinalChoice,
} from './accountCatalog';

const card = (id: string, overrides: Partial<CardItem> = {}): CardItem => ({
  id,
  type: 'truth',
  level: 'gentle',
  content: `Nội dung ${id}`,
  ...overrides,
});

const haveSex = (id: string): CardItem => card(id, {
  type: 'dare',
  level: 'passionate',
  deck: 'position',
  position: { family: 'have_sex', turnAudience: 'both', orderGroup: 4, rarity: 'luxury', difficultyStars: 10 },
});

test('a valid account deck is accepted, marked custom and stripped of inline images', () => {
  const result = validateAccountCatalogInput({
    customCards: [card('acct-1', { customImage: 'data:image/png;base64,AAAA' })],
    hiddenCardIds: ['g-t-1', 'g-t-1', 'p-d-2'],
  });
  assert.equal(result.ok, true);
  assert.equal(result.value?.customCards[0].isCustom, true);
  assert.equal(result.value?.customCards[0].customImage, undefined);
  assert.deepEqual(result.value?.hiddenCardIds, ['g-t-1', 'p-d-2']);
});

test('account decks reject foreign ids, foreign images, empty text and oversize lists', () => {
  const codeOf = (value: unknown) => validateAccountCatalogInput(value).code;
  assert.equal(codeOf(null), 'INVALID_ACCOUNT_CATALOG');
  assert.equal(codeOf({ customCards: [card('custom-1')], hiddenCardIds: [] }), 'INVALID_ACCOUNT_CARD_ID');
  assert.equal(codeOf({ customCards: [card('acct-1', { content: '   ' })], hiddenCardIds: [] }), 'INVALID_ACCOUNT_CARD_TEXT');
  assert.equal(
    codeOf({ customCards: [card('acct-1', { customImageId: 'sha256:abc' })], hiddenCardIds: [] }),
    'INVALID_ACCOUNT_CARD_IMAGE',
  );
  assert.equal(codeOf({ customCards: [], hiddenCardIds: ['acct-1'] }), 'INVALID_HIDDEN_CARD_IDS');
  assert.equal(
    codeOf({
      customCards: Array.from({ length: MAX_ACCOUNT_CUSTOM_CARDS + 1 }, (_, index) => card(`acct-${index}`)),
      hiddenCardIds: [],
    }),
    'TOO_MANY_ACCOUNT_CARDS',
  );
  assert.equal(
    validateAccountCatalogInput({
      customCards: [card('acct-1', { customImageId: `couple-asset:${'a'.repeat(64)}` })],
      hiddenCardIds: [],
    }).ok,
    true,
  );
});

test('applying an account deck hides shared cards and appends own cards without touching others', () => {
  const base = [card('g-t-1'), card('g-t-2'), card('g-t-3')];
  const result = applyAccountCatalog(base, { customCards: [card('acct-a')], hiddenCardIds: ['g-t-2'] });
  assert.deepEqual(result.map((item) => item.id), ['g-t-1', 'g-t-3', 'acct-a']);
  assert.deepEqual(applyAccountCatalog(base, null).map((item) => item.id), ['g-t-1', 'g-t-2', 'g-t-3']);
  assert.equal(base.length, 3);
});

test('an account cannot hide Have Sex cards below the three-card final choice', () => {
  const finals = [haveSex('hs-1'), haveSex('hs-2'), haveSex('hs-3'), haveSex('hs-4')];
  assert.equal(wouldBreakFinalChoice(finals, finals[0]), false);
  assert.equal(wouldBreakFinalChoice(finals.slice(0, 3), finals[0]), true);
  assert.equal(wouldBreakFinalChoice(finals.slice(0, 3), card('g-t-1')), false);
});

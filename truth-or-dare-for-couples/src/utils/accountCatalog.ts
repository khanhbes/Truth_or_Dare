import type { CardItem } from '../types';
import { isRecord, parseStoredCards } from './cardSchema';

/**
 * A couple account's private deck layered on top of the shared catalog:
 * its own added cards and the shared cards it removed (hid) from its deck.
 * Resetting the deck clears both lists; opened-card progress is separate.
 */
export interface AccountCatalog {
  revision: number;
  customCards: CardItem[];
  hiddenCardIds: string[];
  updatedAt?: string;
}

export const EMPTY_ACCOUNT_CATALOG: AccountCatalog = { revision: 0, customCards: [], hiddenCardIds: [] };

export const ACCOUNT_CARD_ID_PATTERN = /^acct-[A-Za-z0-9_-]{1,80}$/;
export const ACCOUNT_ASSET_ID_PATTERN = /^couple-asset:([a-f0-9]{64})$/;
export const MAX_ACCOUNT_CUSTOM_CARDS = 300;
export const MAX_ACCOUNT_HIDDEN_CARDS = 2000;
export const MAX_ACCOUNT_CARD_TEXT = 2000;
export const MAX_ACCOUNT_CARD_HINT = 500;
export const MAX_ACCOUNT_CATALOG_BYTES = 1_500_000;
/** Minimum Have Sex cards an account must keep for the three-card final choice. */
export const MIN_ACCOUNT_HAVE_SEX_CARDS = 3;

export interface AccountCatalogValidation {
  ok: boolean;
  value?: Omit<AccountCatalog, 'revision' | 'updatedAt'>;
  code?: string;
  message?: string;
}

const fail = (code: string, message: string): AccountCatalogValidation => ({ ok: false, code, message });

/**
 * Validates an account deck sent by a client. Shared by the API (trust
 * boundary) and the browser (to fail fast before uploading).
 */
export const validateAccountCatalogInput = (value: unknown): AccountCatalogValidation => {
  if (!isRecord(value) || !Array.isArray(value.customCards) || !Array.isArray(value.hiddenCardIds)) {
    return fail('INVALID_ACCOUNT_CATALOG', 'Bộ thẻ của tài khoản không đúng cấu trúc.');
  }
  if (value.customCards.length > MAX_ACCOUNT_CUSTOM_CARDS) {
    return fail('TOO_MANY_ACCOUNT_CARDS', `Mỗi tài khoản lưu tối đa ${MAX_ACCOUNT_CUSTOM_CARDS} thẻ tự thêm.`);
  }
  if (value.hiddenCardIds.length > MAX_ACCOUNT_HIDDEN_CARDS) {
    return fail('TOO_MANY_HIDDEN_CARDS', 'Danh sách thẻ đã xóa quá dài.');
  }

  const customCards = parseStoredCards(value.customCards);
  if (customCards.length !== value.customCards.length) {
    return fail('INVALID_ACCOUNT_CARD', 'Có thẻ tự thêm sai cấu trúc hoặc trùng ID.');
  }
  for (const card of customCards) {
    if (!ACCOUNT_CARD_ID_PATTERN.test(card.id)) {
      return fail('INVALID_ACCOUNT_CARD_ID', 'ID thẻ tự thêm không hợp lệ.');
    }
    if (!card.content.trim() || card.content.length > MAX_ACCOUNT_CARD_TEXT) {
      return fail('INVALID_ACCOUNT_CARD_TEXT', `Nội dung thẻ cần từ 1 đến ${MAX_ACCOUNT_CARD_TEXT} ký tự.`);
    }
    if (card.hint && card.hint.length > MAX_ACCOUNT_CARD_HINT) {
      return fail('INVALID_ACCOUNT_CARD_HINT', `Gợi ý tối đa ${MAX_ACCOUNT_CARD_HINT} ký tự.`);
    }
    if (card.customImageId && !ACCOUNT_ASSET_ID_PATTERN.test(card.customImageId)) {
      return fail('INVALID_ACCOUNT_CARD_IMAGE', 'Ảnh của thẻ tự thêm phải được tải lên tài khoản.');
    }
  }

  const validHiddenIds = value.hiddenCardIds.filter(
    (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 120 && !id.startsWith('acct-'),
  );
  if (validHiddenIds.length !== value.hiddenCardIds.length) {
    return fail('INVALID_HIDDEN_CARD_IDS', 'Danh sách thẻ đã xóa không hợp lệ.');
  }
  // Duplicates are harmless; store each hidden id once.
  const hiddenCardIds = Array.from(new Set(validHiddenIds));

  const sanitized = {
    // Inline data URLs never reach the server: images are uploaded first.
    customCards: customCards.map(({ customImage: _inlineImage, ...card }) => ({ ...card, isCustom: true })),
    hiddenCardIds,
  };
  if (JSON.stringify(sanitized).length > MAX_ACCOUNT_CATALOG_BYTES) {
    return fail('ACCOUNT_CATALOG_TOO_LARGE', 'Bộ thẻ của tài khoản quá lớn.');
  }
  return { ok: true, value: sanitized };
};

/**
 * Applies an account deck to the shared catalog: hidden shared cards are
 * dropped and the account's own cards are appended.
 */
export const applyAccountCatalog = (
  baseCards: readonly CardItem[],
  account: Pick<AccountCatalog, 'customCards' | 'hiddenCardIds'> | null | undefined,
): CardItem[] => {
  if (!account) return [...baseCards];
  const hidden = new Set(account.hiddenCardIds);
  const ownIds = new Set(account.customCards.map((card) => card.id));
  return [
    ...baseCards.filter((card) => !hidden.has(card.id) && !ownIds.has(card.id)),
    ...account.customCards,
  ];
};

/** Whether hiding this shared card would leave fewer Have Sex cards than the final choice needs. */
export const wouldBreakFinalChoice = (
  visibleCards: readonly CardItem[],
  card: CardItem,
): boolean => {
  if (card.position?.family !== 'have_sex') return false;
  const remaining = visibleCards.filter((item) => item.position?.family === 'have_sex' && item.id !== card.id);
  return remaining.length < MIN_ACCOUNT_HAVE_SEX_CARDS;
};

import type { CardItem } from '../types';
import { ACCOUNT_ASSET_ID_PATTERN, type AccountCatalog } from './accountCatalog';
import { browserCardImageStore, hydrateCardImages } from './cardImageStore';

export interface CoupleSession {
  loggedIn: boolean;
  coupleId?: string;
  coupleName?: string;
  unlockedCardIds?: string[];
  totalCardsOpened?: number;
}

export class CoupleApiError extends Error {
  constructor(message: string, readonly code?: string, readonly details?: unknown) {
    super(message);
    this.name = 'CoupleApiError';
  }
}

const readJson = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => null)) as
    | T
    | { error?: { message?: string; code?: string; details?: unknown } }
    | null;
  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? body.error : undefined;
    throw new CoupleApiError(error?.message || `Lỗi HTTP ${response.status}`, error?.code, error?.details);
  }
  if (!body) {
    throw new Error('Không nhận được phản hồi hợp lệ từ máy chủ.');
  }
  return body as T;
};

/** PINs are 4–8 digits; the server rejects anything else, including an empty PIN. */
export const isValidCouplePin = (pin: string): boolean => /^\d{4,8}$/.test(pin.trim());

export const getCoupleSession = async (): Promise<CoupleSession> => {
  try {
    return await readJson<CoupleSession>(
      await fetch('/api/couple/session', {
        credentials: 'same-origin',
        cache: 'no-store',
      }),
    );
  } catch {
    return { loggedIn: false };
  }
};

export const registerCouple = async (
  coupleName: string,
  pin: string,
): Promise<CoupleSession> => {
  return readJson<CoupleSession>(
    await fetch('/api/couple/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ coupleName, pin }),
    }),
  );
};

export const loginCouple = async (
  coupleName: string,
  pin: string,
  clientUnlockedCardIds: string[] = [],
): Promise<CoupleSession> => {
  return readJson<CoupleSession>(
    await fetch('/api/couple/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ coupleName, pin, clientUnlockedCardIds }),
    }),
  );
};

export const syncCoupleUnlockedCards = async (
  unlockedCardIds: string[],
): Promise<{ success: boolean; unlockedCardIds: string[]; totalCardsOpened: number } | null> => {
  try {
    const response = await fetch('/api/couple/sync-unlocked', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ unlockedCardIds }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

export const logoutCouple = async (): Promise<void> => {
  try {
    await fetch('/api/couple/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
  } catch {}
};

// ---------------------------------------------------------------------------
// Per-account deck (own cards + hidden shared cards) and private images
// ---------------------------------------------------------------------------

export const fetchCoupleCatalog = async (): Promise<AccountCatalog> =>
  readJson<AccountCatalog>(await fetch('/api/couple/catalog', {
    credentials: 'same-origin',
    cache: 'no-store',
  }));

export const saveCoupleCatalog = async (
  catalog: Pick<AccountCatalog, 'customCards' | 'hiddenCardIds'>,
  expectedRevision: number,
): Promise<AccountCatalog> =>
  readJson<AccountCatalog>(await fetch('/api/couple/catalog', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...catalog, expectedRevision }),
  }));

export const resetCoupleCatalog = async (): Promise<AccountCatalog> =>
  readJson<AccountCatalog>(await fetch('/api/couple/catalog/reset', {
    method: 'POST',
    credentials: 'same-origin',
  }));

const accountAssetUrl = (assetId: string): string | null => {
  const match = ACCOUNT_ASSET_ID_PATTERN.exec(assetId);
  return match ? `/api/couple/assets/${match[1]}` : null;
};

/**
 * Uploads a freshly edited inline image of an account card and returns the
 * card pointing at its private asset (the inline copy is kept for display).
 */
export const uploadAccountCardImage = async (card: CardItem): Promise<CardItem> => {
  if (!card.customImage?.startsWith('data:image/')) return card;
  const blob = await (await fetch(card.customImage)).blob();
  const result = await readJson<{ id: string; url: string }>(await fetch('/api/couple/assets', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': blob.type || 'image/png' },
    body: blob,
  }));
  await browserCardImageStore.put(result.id, blob).catch(() => undefined);
  return { ...card, customImageId: result.id };
};

/** Fetches missing private images into the browser image store, then hydrates. */
export const hydrateAccountCardImages = async (cards: readonly CardItem[]): Promise<CardItem[]> => {
  await Promise.all(cards.map(async (card) => {
    if (!card.customImageId || card.customImage) return;
    if (await browserCardImageStore.get(card.customImageId).catch(() => null)) return;
    const url = accountAssetUrl(card.customImageId);
    if (!url) return;
    const response = await fetch(url, { credentials: 'same-origin' }).catch(() => null);
    if (!response?.ok) return;
    await browserCardImageStore.put(card.customImageId, await response.blob()).catch(() => undefined);
  }));
  return (await hydrateCardImages(cards)).cards;
};

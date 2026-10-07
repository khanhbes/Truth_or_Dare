export interface CoupleSession {
  loggedIn: boolean;
  coupleId?: string;
  coupleName?: string;
  unlockedCardIds?: string[];
  totalCardsOpened?: number;
}

const readJson = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => null)) as
    | T
    | { error?: { message?: string; code?: string } }
    | null;
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? body.error?.message
        : undefined;
    throw new Error(message || `Lỗi HTTP ${response.status}`);
  }
  if (!body) {
    throw new Error('Không nhận được phản hồi hợp lệ từ máy chủ.');
  }
  return body as T;
};

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
  pin: string = '',
  initialUnlockedCardIds: string[] = [],
): Promise<CoupleSession> => {
  return readJson<CoupleSession>(
    await fetch('/api/couple/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ coupleName, pin, initialUnlockedCardIds }),
    }),
  );
};

export const loginCouple = async (
  coupleName: string,
  pin: string = '',
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

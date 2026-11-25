import { fetchWithTimeout } from './fetchWithTimeout';

export interface PlayerSession {
  loggedIn: boolean;
  displayName?: string;
}

export interface AdminPlayerStats {
  online: number;
  activeToday: number;
  total: number;
  measuredAt: string;
  recent: Array<{
    display_name: string;
    first_seen_at: string;
    last_seen_at: string;
    login_count: number;
    online: number;
  }>;
}

const readJson = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null) as T | { error?: { message?: string } } | null;
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body
      ? body.error?.message
      : undefined;
    throw new Error(message || `HTTP ${response.status}`);
  }
  if (!body) throw new Error('API phiên người chơi chưa được cấu hình trên môi trường này.');
  return body as T;
};

export const getPlayerSession = async (): Promise<PlayerSession> =>
  readJson(await fetchWithTimeout('/api/player/session', { credentials: 'same-origin', cache: 'no-store' }));

export const loginPlayer = async (displayName: string): Promise<PlayerSession> =>
  readJson(await fetch('/api/player/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName }),
  }));

export const heartbeatPlayer = async (): Promise<void> => {
  const response = await fetch('/api/player/heartbeat', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
};

export const logoutPlayer = async (): Promise<void> => {
  await fetch('/api/player/logout', { method: 'POST', credentials: 'same-origin' });
};

export const fetchAdminPlayerStats = async (): Promise<AdminPlayerStats> =>
  readJson(await fetch('/api/admin/players', { credentials: 'same-origin', cache: 'no-store' }));

import type { CardItem } from '../../src/types';
import { strToU8, zipSync } from 'fflate';
import { isRecord, isStoredCard } from '../../src/utils/cardSchema';
import { authenticateAdmin } from '../_shared/auth';
import {
  CATALOG_SCHEMA_VERSION,
  commitMutation,
  deleteCatalogCard,
  getCatalogMeta,
  readCatalog,
  restoreRevision,
  seedCatalog,
  upsertCard,
  upsertConfig,
  validateRecoveryBundle,
} from '../_shared/catalog';
import { createCatalogBackup } from '../_shared/backup';
import { errorResponse, jsonResponse, readJson, sha256Hex } from '../_shared/http';
import type { AppPagesFunction, AssetRow } from '../_shared/types';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const PLAYER_COOKIE = 'tod_player_id';
const PLAYER_ONLINE_WINDOW_MS = 2 * 60 * 1000;

const pathParts = (request: Request): string[] =>
  new URL(request.url).pathname.split('/').filter(Boolean).slice(1);

const readCookie = (request: Request, name: string): string | null => {
  const prefix = `${name}=`;
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const value = part.trim();
    if (value.startsWith(prefix)) return decodeURIComponent(value.slice(prefix.length));
  }
  return null;
};

const validPlayerId = (value: string | null): value is string =>
  Boolean(value && /^player-[0-9a-f-]{36}$/i.test(value));

const playerCookie = (id: string, request: Request): string => {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${PLAYER_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; HttpOnly${secure}; SameSite=Lax`;
};

const normalizeDisplayName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length >= 1 && normalized.length <= 40 ? normalized : null;
};

const handlePlayer = async (
  request: Request,
  env: Parameters<AppPagesFunction>[0]['env'],
  parts: string[],
): Promise<Response> => {
  const now = new Date().toISOString();
  const cookieId = readCookie(request, PLAYER_COOKIE);
  const id = validPlayerId(cookieId) ? cookieId : null;
  if (parts[1] === 'session' && request.method === 'GET') {
    if (!id) return jsonResponse({ loggedIn: false }, { headers: { 'cache-control': 'no-store' } });
    const player = await env.DB.prepare(
      'SELECT display_name, is_active FROM player_presence WHERE id = ?',
    ).bind(id).first<{ display_name: string; is_active: number }>();
    return jsonResponse({
      loggedIn: Boolean(player?.is_active),
      displayName: player?.is_active ? player.display_name : undefined,
    }, { headers: { 'cache-control': 'no-store' } });
  }
  if (parts[1] === 'login' && request.method === 'POST') {
    const body = await readJson(request, 4_000);
    const displayName = isRecord(body) ? normalizeDisplayName(body.displayName) : null;
    if (!displayName) return errorResponse(400, 'INVALID_PLAYER_NAME', 'Tên hiển thị phải có từ 1 đến 40 ký tự.');
    const playerId = id || `player-${crypto.randomUUID()}`;
    await env.DB.prepare(
      `INSERT INTO player_presence (id, display_name, first_seen_at, last_seen_at, login_count, is_active)
       VALUES (?, ?, ?, ?, 1, 1)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         last_seen_at = excluded.last_seen_at,
         login_count = player_presence.login_count + 1,
         is_active = 1`,
    ).bind(playerId, displayName, now, now).run();
    return jsonResponse({ loggedIn: true, displayName }, {
      headers: { 'set-cookie': playerCookie(playerId, request), 'cache-control': 'no-store' },
    });
  }
  if (parts[1] === 'heartbeat' && request.method === 'POST') {
    if (!id) return errorResponse(401, 'PLAYER_SESSION_REQUIRED', 'Phiên người chơi không còn hiệu lực.');
    const result = await env.DB.prepare(
      'UPDATE player_presence SET last_seen_at = ? WHERE id = ? AND is_active = 1',
    ).bind(now, id).run();
    return result.meta.changes
      ? jsonResponse({ active: true }, { headers: { 'cache-control': 'no-store' } })
      : errorResponse(401, 'PLAYER_SESSION_REQUIRED', 'Phiên người chơi không còn hiệu lực.');
  }
  if (parts[1] === 'logout' && request.method === 'POST') {
    if (id) await env.DB.prepare(
      'UPDATE player_presence SET is_active = 0, last_seen_at = ? WHERE id = ?',
    ).bind(now, id).run();
    return jsonResponse({ loggedIn: false }, { headers: { 'cache-control': 'no-store' } });
  }
  return errorResponse(404, 'PLAYER_ROUTE_NOT_FOUND', 'Không tìm thấy API người chơi.');
};

const COUPLE_COOKIE = 'tod_couple_id';

const validCoupleId = (value: string | null): value is string =>
  Boolean(value && /^couple-[0-9a-f-]{36}$/i.test(value));

const coupleCookie = (id: string, request: Request, maxAge = 31536000): string => {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COUPLE_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=${maxAge}; HttpOnly${secure}; SameSite=Lax`;
};

const clearCoupleCookie = (request: Request): string => {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COUPLE_COOKIE}=; Path=/; Max-Age=0; HttpOnly${secure}; SameSite=Lax`;
};

const hashPin = async (pin: string): Promise<string> => {
  const buffer = new TextEncoder().encode(`tod-salt:${pin}`).buffer;
  return sha256Hex(buffer);
};

const normalizeCoupleName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length >= 2 && normalized.length <= 120 ? normalized : null;
};

const normalizePin = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const ensureCoupleTable = async (db: D1Database): Promise<void> => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS couple_accounts (
      id TEXT PRIMARY KEY,
      couple_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pin_hash TEXT NOT NULL,
      unlocked_cards TEXT NOT NULL DEFAULT '[]',
      total_cards_opened INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_login_at TEXT NOT NULL,
      settings_json TEXT
    );
  `).run();
};

const handleCouple = async (
  request: Request,
  env: Parameters<AppPagesFunction>[0]['env'],
  parts: string[],
): Promise<Response> => {
  await ensureCoupleTable(env.DB);
  const now = new Date().toISOString();
  const cookieId = readCookie(request, COUPLE_COOKIE);
  const id = validCoupleId(cookieId) ? cookieId : null;

  if (parts[1] === 'session' && request.method === 'GET') {
    if (!id) return jsonResponse({ loggedIn: false }, { headers: { 'cache-control': 'no-store' } });
    const account = await env.DB.prepare(
      'SELECT id, couple_name, unlocked_cards, total_cards_opened FROM couple_accounts WHERE id = ?',
    ).bind(id).first<{ id: string; couple_name: string; unlocked_cards: string; total_cards_opened: number }>();
    if (!account) {
      return jsonResponse({ loggedIn: false }, {
        headers: { 'set-cookie': clearCoupleCookie(request), 'cache-control': 'no-store' },
      });
    }
    let unlockedCardIds: string[] = [];
    try {
      unlockedCardIds = JSON.parse(account.unlocked_cards) || [];
    } catch {}
    return jsonResponse({
      loggedIn: true,
      coupleId: account.id,
      coupleName: account.couple_name,
      unlockedCardIds,
      totalCardsOpened: account.total_cards_opened,
    }, { headers: { 'cache-control': 'no-store' } });
  }

  if (parts[1] === 'register' && request.method === 'POST') {
    const body = await readJson(request, 4_000);
    if (!isRecord(body)) return errorResponse(400, 'INVALID_PAYLOAD', 'Dữ liệu không hợp lệ.');
    const coupleName = normalizeCoupleName(body.coupleName);
    if (!coupleName) return errorResponse(400, 'INVALID_COUPLE_NAME', 'Tên cặp đôi hoặc email phải có từ 2 đến 120 ký tự.');
    const pin = normalizePin(body.pin);

    const existing = await env.DB.prepare(
      'SELECT id, couple_name, pin_hash, unlocked_cards, total_cards_opened FROM couple_accounts WHERE couple_name = ? COLLATE NOCASE',
    ).bind(coupleName).first<{ id: string; couple_name: string; pin_hash: string; unlocked_cards: string; total_cards_opened: number }>();
    if (existing) {
      const expectedHash = await hashPin(pin);
      const emptyHash = await hashPin('');
      if (existing.pin_hash !== expectedHash && existing.pin_hash !== emptyHash && pin !== '') {
        return errorResponse(409, 'COUPLE_ALREADY_EXISTS', 'Tên hoặc email này đã tồn tại. Hãy đăng nhập.');
      }
      let unlockedCardIds: string[] = [];
      try {
        unlockedCardIds = JSON.parse(existing.unlocked_cards) || [];
      } catch {}
      if (Array.isArray(body.initialUnlockedCardIds) && body.initialUnlockedCardIds.length > 0) {
        const merged = Array.from(new Set([...unlockedCardIds, ...body.initialUnlockedCardIds]));
        if (merged.length > unlockedCardIds.length) {
          unlockedCardIds = merged;
          await env.DB.prepare(
            'UPDATE couple_accounts SET unlocked_cards = ?, total_cards_opened = ?, last_login_at = ? WHERE id = ?',
          ).bind(JSON.stringify(unlockedCardIds), unlockedCardIds.length, now, existing.id).run();
        }
      }
      return jsonResponse({
        loggedIn: true,
        coupleId: existing.id,
        coupleName: existing.couple_name,
        unlockedCardIds,
        totalCardsOpened: unlockedCardIds.length,
      }, {
        headers: { 'set-cookie': coupleCookie(existing.id, request), 'cache-control': 'no-store' },
      });
    }

    const coupleId = `couple-${crypto.randomUUID()}`;
    const pinHash = await hashPin(pin);
    const initialUnlocked: string[] = Array.isArray(body.initialUnlockedCardIds)
      ? body.initialUnlockedCardIds.filter((item: unknown): item is string => typeof item === 'string')
      : [];

    await env.DB.prepare(
      `INSERT INTO couple_accounts (id, couple_name, pin_hash, unlocked_cards, total_cards_opened, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(coupleId, coupleName, pinHash, JSON.stringify(initialUnlocked), initialUnlocked.length, now, now).run();

    return jsonResponse({
      loggedIn: true,
      coupleId,
      coupleName,
      unlockedCardIds: initialUnlocked,
      totalCardsOpened: initialUnlocked.length,
    }, {
      headers: { 'set-cookie': coupleCookie(coupleId, request), 'cache-control': 'no-store' },
    });
  }

  if (parts[1] === 'login' && request.method === 'POST') {
    const body = await readJson(request, 4_000);
    if (!isRecord(body)) return errorResponse(400, 'INVALID_PAYLOAD', 'Dữ liệu không hợp lệ.');
    const coupleName = normalizeCoupleName(body.coupleName);
    if (!coupleName) return errorResponse(400, 'INVALID_COUPLE_NAME', 'Tên cặp đôi hoặc email phải có từ 2 đến 120 ký tự.');
    const pin = normalizePin(body.pin);

    let account = await env.DB.prepare(
      'SELECT id, couple_name, pin_hash, unlocked_cards, total_cards_opened FROM couple_accounts WHERE couple_name = ? COLLATE NOCASE',
    ).bind(coupleName).first<{ id: string; couple_name: string; pin_hash: string; unlocked_cards: string; total_cards_opened: number }>();

    // If account doesn't exist, auto-create it smoothly so login is seamless!
    if (!account) {
      const coupleId = `couple-${crypto.randomUUID()}`;
      const pinHash = await hashPin(pin);
      const initialUnlocked: string[] = Array.isArray(body.clientUnlockedCardIds)
        ? body.clientUnlockedCardIds.filter((item: unknown): item is string => typeof item === 'string')
        : [];

      await env.DB.prepare(
        `INSERT INTO couple_accounts (id, couple_name, pin_hash, unlocked_cards, total_cards_opened, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(coupleId, coupleName, pinHash, JSON.stringify(initialUnlocked), initialUnlocked.length, now, now).run();

      return jsonResponse({
        loggedIn: true,
        coupleId,
        coupleName,
        unlockedCardIds: initialUnlocked,
        totalCardsOpened: initialUnlocked.length,
      }, {
        headers: { 'set-cookie': coupleCookie(coupleId, request), 'cache-control': 'no-store' },
      });
    }

    const expectedHash = await hashPin(pin);
    const emptyHash = await hashPin('');
    if (account.pin_hash !== emptyHash && pin !== '' && account.pin_hash !== expectedHash) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Mã PIN bảo mật không chính xác.');
    }

    await env.DB.prepare(
      'UPDATE couple_accounts SET last_login_at = ? WHERE id = ?',
    ).bind(now, account.id).run();

    let unlockedCardIds: string[] = [];
    try {
      unlockedCardIds = JSON.parse(account.unlocked_cards) || [];
    } catch {}

    if (Array.isArray(body.clientUnlockedCardIds) && body.clientUnlockedCardIds.length > 0) {
      const merged = Array.from(new Set([...unlockedCardIds, ...body.clientUnlockedCardIds]));
      if (merged.length > unlockedCardIds.length) {
        unlockedCardIds = merged;
        await env.DB.prepare(
          'UPDATE couple_accounts SET unlocked_cards = ?, total_cards_opened = ? WHERE id = ?',
        ).bind(JSON.stringify(unlockedCardIds), unlockedCardIds.length, account.id).run();
      }
    }

    return jsonResponse({
      loggedIn: true,
      coupleId: account.id,
      coupleName: account.couple_name,
      unlockedCardIds,
      totalCardsOpened: unlockedCardIds.length,
    }, {
      headers: { 'set-cookie': coupleCookie(account.id, request), 'cache-control': 'no-store' },
    });
  }

  if (parts[1] === 'sync-unlocked' && request.method === 'POST') {
    if (!id) return errorResponse(401, 'COUPLE_SESSION_REQUIRED', 'Cần đăng nhập tài khoản cặp đôi.');
    const body = await readJson(request, 100_000);
    if (!isRecord(body) || !Array.isArray(body.unlockedCardIds)) {
      return errorResponse(400, 'INVALID_PAYLOAD', 'Danh sách thẻ không hợp lệ.');
    }
    const incomingCardIds = body.unlockedCardIds.filter((item): item is string => typeof item === 'string' && item.length > 0);

    const account = await env.DB.prepare(
      'SELECT unlocked_cards FROM couple_accounts WHERE id = ?',
    ).bind(id).first<{ unlocked_cards: string }>();
    if (!account) return errorResponse(401, 'COUPLE_SESSION_REQUIRED', 'Tài khoản không còn hiệu lực.');

    let currentCardIds: string[] = [];
    try {
      currentCardIds = JSON.parse(account.unlocked_cards) || [];
    } catch {}

    const unionIds = Array.from(new Set([...currentCardIds, ...incomingCardIds]));
    await env.DB.prepare(
      'UPDATE couple_accounts SET unlocked_cards = ?, total_cards_opened = ?, last_login_at = ? WHERE id = ?',
    ).bind(JSON.stringify(unionIds), unionIds.length, now, id).run();

    return jsonResponse({
      success: true,
      unlockedCardIds: unionIds,
      totalCardsOpened: unionIds.length,
    }, { headers: { 'cache-control': 'no-store' } });
  }

  if (parts[1] === 'logout' && request.method === 'POST') {
    return jsonResponse({ loggedIn: false }, {
      headers: { 'set-cookie': clearCoupleCookie(request), 'cache-control': 'no-store' },
    });
  }

  return errorResponse(404, 'COUPLE_ROUTE_NOT_FOUND', 'Không tìm thấy API cặp đôi.');
};

const handleCatalog = async (request: Request, env: Parameters<AppPagesFunction>[0]['env']): Promise<Response> => {
  try {
    const catalog = await readCatalog(env);
    const etag = `\"catalog-${catalog.datasetRevision}\"`;
    if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } });
    return jsonResponse(catalog, {
      headers: {
        etag,
        'cache-control': 'public, max-age=5, stale-while-revalidate=5',
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CATALOG_UNAVAILABLE';
    return errorResponse(503, code, code === 'CATALOG_NOT_SEEDED'
      ? 'Catalog cloud chưa được seed; cache hợp lệ trên thiết bị sẽ không bị thay thế.'
      : 'Không thể đọc catalog cloud.');
  }
};

const handleAsset = async (
  request: Request,
  env: Parameters<AppPagesFunction>[0]['env'],
  id: string,
): Promise<Response> => {
  const asset = await env.DB.prepare(
    'SELECT id, r2_key, sha256, mime_type, size, revision, created_at FROM card_assets WHERE id = ?',
  ).bind(id).first<AssetRow>();
  if (!asset) return errorResponse(404, 'ASSET_NOT_FOUND', 'Không tìm thấy ảnh.');
  const object = await env.CARD_ASSETS.get(asset.r2_key, {
    onlyIf: { etagDoesNotMatch: request.headers.get('if-none-match')?.replaceAll('"', '') || '' },
  });
  if (!object) return errorResponse(404, 'ASSET_NOT_FOUND', 'Ảnh không còn trong kho R2.');
  if (!('body' in object)) return new Response(null, { status: 304, headers: { etag: object.httpEtag } });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
};

const requireAdmin = async (
  request: Request,
  env: Parameters<AppPagesFunction>[0]['env'],
): Promise<string | Response> => {
  const email = await authenticateAdmin(request, env);
  return email ?? errorResponse(401, 'ADMIN_AUTH_REQUIRED', 'Cần đăng nhập Cloudflare Access để chỉnh dữ liệu.');
};

const uploadAsset = async (
  request: Request,
  env: Parameters<AppPagesFunction>[0]['env'],
  actorEmail: string,
): Promise<Response> => {
  const expectedRevision = Number(request.headers.get('if-match'));
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    return errorResponse(400, 'INVALID_ASSET_REVISION', 'Thiếu revision catalog khi tải ảnh.');
  }
  const mimeType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
  if (!IMAGE_TYPES.has(mimeType)) return errorResponse(415, 'INVALID_IMAGE_TYPE', 'Chỉ nhận PNG, JPEG, WebP hoặc GIF.');
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_IMAGE_BYTES) return errorResponse(413, 'IMAGE_TOO_LARGE', 'Ảnh tối đa 8 MB.');
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) {
    return errorResponse(413, 'IMAGE_TOO_LARGE', 'Ảnh trống hoặc lớn hơn 8 MB.');
  }
  const sha256 = await sha256Hex(bytes);
  const id = `asset:${sha256}`;
  const r2Key = `card-assets/${sha256}`;
  const existing = await env.DB.prepare('SELECT id FROM card_assets WHERE sha256 = ?').bind(sha256).first<{ id: string }>();
  if (existing) {
    const meta = await getCatalogMeta(env.DB);
    return jsonResponse({
      id: existing.id,
      url: `/api/assets/${encodeURIComponent(existing.id)}`,
      datasetRevision: meta.dataset_revision,
      created: false,
    });
  }
  const meta = await getCatalogMeta(env.DB);
  if (meta.dataset_revision !== expectedRevision) throw new Error('STALE_REVISION');
  await Promise.all([
    env.CARD_ASSETS.put(r2Key, bytes, { httpMetadata: { contentType: mimeType } }),
    env.CARD_BACKUPS.put(`assets/${sha256}`, bytes, { httpMetadata: { contentType: mimeType } }),
  ]);
  const nextRevision = await commitMutation(env, {
    expectedRevision,
    actorEmail,
    entityType: 'asset',
    entityId: id,
    operation: 'create',
    before: null,
    after: { id, sha256, mimeType, size: bytes.byteLength },
    statements: [env.DB.prepare(
      `INSERT INTO card_assets (id, r2_key, sha256, mime_type, size, revision, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, r2Key, sha256, mimeType, bytes.byteLength, expectedRevision + 1, new Date().toISOString())],
  });
  return jsonResponse({
    id,
    url: `/api/assets/${encodeURIComponent(id)}`,
    datasetRevision: nextRevision,
    created: true,
  }, { status: 201 });
};

const importCatalog = async (
  request: Request,
  env: Parameters<AppPagesFunction>[0]['env'],
  actorEmail: string,
): Promise<Response> => {
  const body = await readJson(request, 80_000_000);
  if (!isRecord(body)) return errorResponse(400, 'INVALID_BACKUP', 'Gói backup không hợp lệ.');
  const bundle = validateRecoveryBundle(body.bundle ?? body);
  if (!bundle || bundle.schemaVersion !== CATALOG_SCHEMA_VERSION) {
    return errorResponse(400, 'INVALID_BACKUP', 'Schema hoặc dữ liệu backup không hợp lệ.');
  }
  const dryRun = body.dryRun !== false;
  const replace = body.replace === true;
  const assetErrors: string[] = [];
  for (const asset of bundle.assets) {
    if (!asset.dataBase64) {
      const present = await env.CARD_BACKUPS.head(`assets/${asset.sha256}`);
      if (!present) assetErrors.push(asset.id);
      continue;
    }
    const bytes = Uint8Array.from(atob(asset.dataBase64), (value) => value.charCodeAt(0)).buffer;
    const digest = await sha256Hex(bytes);
    if (digest !== asset.sha256 || bytes.byteLength !== asset.size) assetErrors.push(asset.id);
  }
  if (assetErrors.length) return errorResponse(400, 'ASSET_CHECKSUM_MISMATCH', 'Một số ảnh thiếu hoặc sai checksum.', assetErrors);
  const counts = {
    customCards: bundle.customCards.length,
    editedCards: bundle.editedCards.length,
    deletedSystemCards: bundle.deletedSystemCardIds.length,
    assets: bundle.assets.length,
  };
  if (dryRun) return jsonResponse({ valid: true, counts, willReplace: replace });
  const meta = await getCatalogMeta(env.DB);
  if (meta.seeded_at && !replace) {
    return errorResponse(409, 'CATALOG_ALREADY_SEEDED', 'Database đã có catalog; dùng replace sau khi tạo backup.');
  }
  if (meta.seeded_at && replace) await createCatalogBackup(env, 'pre_restore');
  for (const asset of bundle.assets) {
    if (!asset.dataBase64) continue;
    const bytes = Uint8Array.from(atob(asset.dataBase64), (value) => value.charCodeAt(0)).buffer;
    await Promise.all([
      env.CARD_ASSETS.put(`card-assets/${asset.sha256}`, bytes, { httpMetadata: { contentType: asset.mimeType } }),
      env.CARD_BACKUPS.put(`assets/${asset.sha256}`, bytes, { httpMetadata: { contentType: asset.mimeType } }),
    ]);
  }
  await seedCatalog(env, bundle, actorEmail, replace);
  const catalog = await readCatalog(env);
  return jsonResponse({ imported: true, counts: catalog.counts, datasetRevision: catalog.datasetRevision });
};

const handleAdmin = async (
  request: Request,
  env: Parameters<AppPagesFunction>[0]['env'],
  parts: string[],
): Promise<Response> => {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  if (parts[1] === 'session' && request.method === 'GET') {
    const meta = await getCatalogMeta(env.DB);
    return jsonResponse({ authenticated: true, email: auth, datasetRevision: meta.dataset_revision, seeded: Boolean(meta.seeded_at) });
  }
  if (parts[1] === 'players' && request.method === 'GET') {
    const now = Date.now();
    const onlineSince = new Date(now - PLAYER_ONLINE_WINDOW_MS).toISOString();
    const todaySince = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const [counts, recent] = await Promise.all([
      env.DB.prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN is_active = 1 AND last_seen_at >= ? THEN 1 ELSE 0 END) AS online,
           SUM(CASE WHEN last_seen_at >= ? THEN 1 ELSE 0 END) AS active_today
         FROM player_presence`,
      ).bind(onlineSince, todaySince).first<{ total: number; online: number; active_today: number }>(),
      env.DB.prepare(
        `SELECT display_name, first_seen_at, last_seen_at, login_count,
                CASE WHEN is_active = 1 AND last_seen_at >= ? THEN 1 ELSE 0 END AS online
           FROM player_presence
          ORDER BY last_seen_at DESC
          LIMIT 12`,
      ).bind(onlineSince).all(),
    ]);
    return jsonResponse({
      online: Number(counts?.online || 0),
      activeToday: Number(counts?.active_today || 0),
      total: Number(counts?.total || 0),
      recent: recent.results,
      measuredAt: new Date(now).toISOString(),
    }, { headers: { 'cache-control': 'private, no-store' } });
  }
  if (parts[1] === 'assets' && request.method === 'POST') return uploadAsset(request, env, auth);
  if (parts[1] === 'import' && request.method === 'POST') return importCatalog(request, env, auth);
  if (parts[1] === 'revisions') {
    if (request.method === 'GET' && !parts[2]) {
      const revisions = await env.DB.prepare(
        `SELECT id, dataset_revision, entity_type, entity_id, operation, actor_email, created_at
           FROM catalog_revisions ORDER BY dataset_revision DESC LIMIT 200`,
      ).all();
      return jsonResponse({ revisions: revisions.results });
    }
    if (parts[2] && parts[3] === 'restore' && request.method === 'POST') {
      const body = await readJson(request);
      if (!isRecord(body) || !Number.isInteger(body.expectedRevision)) {
        return errorResponse(400, 'INVALID_REVISION_RESTORE', 'Revision phục hồi không hợp lệ.');
      }
      const datasetRevision = await restoreRevision(
        env,
        decodeURIComponent(parts[2]),
        Number(body.expectedRevision),
        auth,
      );
      return jsonResponse({ restored: true, datasetRevision });
    }
  }
  if (parts[1] === 'cards' && parts[2]) {
    const cardId = decodeURIComponent(parts[2]);
    const body = request.method === 'PUT' ? await readJson(request) : null;
    if (request.method === 'PUT') {
      if (!isRecord(body) || !isStoredCard(body.card) || body.card.id !== cardId ||
          !Number.isInteger(body.expectedRevision) ||
          (body.kind !== 'custom' && body.kind !== 'system_override')) {
        return errorResponse(400, 'INVALID_CARD_MUTATION', 'Dữ liệu lưu thẻ không hợp lệ.');
      }
      const revision = await upsertCard(env, body.kind, body.card as CardItem, Number(body.expectedRevision), auth);
      return jsonResponse({ saved: true, datasetRevision: revision });
    }
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const kind = url.searchParams.get('kind');
      const expectedRevision = Number(request.headers.get('if-match'));
      if ((kind !== 'custom' && kind !== 'system') || !Number.isInteger(expectedRevision)) {
        return errorResponse(400, 'INVALID_CARD_DELETE', 'Yêu cầu xóa thẻ không hợp lệ.');
      }
      const revision = await deleteCatalogCard(env, kind, cardId, expectedRevision, auth);
      return jsonResponse({ deleted: true, datasetRevision: revision });
    }
  }
  if (parts[1] === 'config' && parts[2] && request.method === 'PUT') {
    const key = parts[2] === 'progression' ? 'progression' :
      parts[2] === 'luxury_progression' ? 'luxury_progression' : null;
    const body = await readJson(request);
    if (!key || !isRecord(body) || !isRecord(body.value) || !Number.isInteger(body.expectedRevision)) {
      return errorResponse(400, 'INVALID_CONFIG_MUTATION', 'Cấu hình không hợp lệ.');
    }
    const revision = await upsertConfig(env, key, body.value, Number(body.expectedRevision), auth);
    return jsonResponse({ saved: true, datasetRevision: revision });
  }
  if (parts[1] === 'backups') {
    if (request.method === 'POST') {
      const backup = await createCatalogBackup(env, 'manual');
      return jsonResponse({ id: backup.id, key: backup.key, datasetRevision: backup.snapshot.catalog.datasetRevision }, { status: 201 });
    }
    if (request.method === 'GET' && parts[2]) {
      const run = await env.DB.prepare(
        `SELECT r2_key FROM backup_runs WHERE id = ? AND status = 'completed'`,
      ).bind(decodeURIComponent(parts[2])).first<{ r2_key: string }>();
      if (!run?.r2_key) return errorResponse(404, 'BACKUP_NOT_FOUND', 'Không tìm thấy backup.');
      const object = await env.CARD_BACKUPS.get(run.r2_key);
      if (!object?.body) return errorResponse(404, 'BACKUP_OBJECT_MISSING', 'File backup không còn trong R2.');
      const snapshot = await object.json<{
        createdAt: string;
        catalog: Awaited<ReturnType<typeof readCatalog>>;
        revisions: unknown[];
      }>();
      const files: Record<string, Uint8Array> = {};
      const assetEntries: Array<{ id: string; sha256: string; mimeType: string; size: number }> = [];
      for (const asset of snapshot.catalog.assets) {
        const stored = await env.CARD_BACKUPS.get(`assets/${asset.sha256}`);
        if (!stored?.body) return errorResponse(409, 'BACKUP_ASSET_MISSING', `Backup thiếu ảnh ${asset.id}.`);
        const bytes = new Uint8Array(await stored.arrayBuffer());
        if (bytes.byteLength !== asset.size || await sha256Hex(bytes.buffer) !== asset.sha256) {
          return errorResponse(409, 'BACKUP_ASSET_CHECKSUM_MISMATCH', `Checksum ảnh ${asset.id} không đúng.`);
        }
        const extension = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType.split('/')[1] || 'bin';
        files[`assets/${asset.sha256}.${extension}`] = bytes;
        assetEntries.push({ id: asset.id, sha256: asset.sha256, mimeType: asset.mimeType, size: asset.size });
      }
      const bundle = {
        schemaVersion: snapshot.catalog.schemaVersion,
        createdAt: snapshot.createdAt,
        customCards: snapshot.catalog.customCards,
        editedCards: snapshot.catalog.editedCards,
        deletedSystemCardIds: snapshot.catalog.deletedSystemCardIds,
        progressionConfig: snapshot.catalog.progressionConfig,
        luxuryProgressionConfig: snapshot.catalog.luxuryProgressionConfig,
        assets: assetEntries,
      };
      const bundleBytes = strToU8(JSON.stringify(bundle, null, 2));
      const revisionsBytes = strToU8(JSON.stringify(snapshot.revisions, null, 2));
      files['bundle.json'] = bundleBytes;
      files['revisions.json'] = revisionsBytes;
      files['manifest.json'] = strToU8(JSON.stringify({
        format: 'todbackup',
        version: 1,
        createdAt: snapshot.createdAt,
        datasetRevision: snapshot.catalog.datasetRevision,
        counts: snapshot.catalog.counts,
        checksums: {
          'bundle.json': await sha256Hex(bundleBytes.buffer),
          'revisions.json': await sha256Hex(revisionsBytes.buffer),
          ...Object.fromEntries(assetEntries.map((asset) => {
            const extension = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType.split('/')[1] || 'bin';
            return [`assets/${asset.sha256}.${extension}`, asset.sha256];
          })),
        },
      }, null, 2));
      const archive = zipSync(files, { level: 6 });
      return new Response(archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength), {
        headers: {
          'content-type': 'application/zip',
          'content-disposition': `attachment; filename=truth-or-dare-${parts[2]}.todbackup.zip`,
        },
      });
    }
    if (request.method === 'GET') {
      const runs = await env.DB.prepare(
        `SELECT id, kind, dataset_revision, status, error, created_at, completed_at
           FROM backup_runs ORDER BY created_at DESC LIMIT 100`,
      ).all();
      return jsonResponse({ backups: runs.results });
    }
  }
  return errorResponse(404, 'ADMIN_ROUTE_NOT_FOUND', 'Không tìm thấy API quản trị.');
};

export const onRequest: AppPagesFunction = async ({ request, env }) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  const parts = pathParts(request);
  try {
    if (parts[0] === 'catalog' && request.method === 'GET') return handleCatalog(request, env);
    if (parts[0] === 'assets' && parts[1] && (request.method === 'GET' || request.method === 'HEAD')) {
      return handleAsset(request, env, decodeURIComponent(parts[1]));
    }
    if (parts[0] === 'player') return handlePlayer(request, env, parts);
    if (parts[0] === 'couple') return handleCouple(request, env, parts);
    if (parts[0] === 'admin') return handleAdmin(request, env, parts);
    return errorResponse(404, 'API_ROUTE_NOT_FOUND', 'Không tìm thấy API.');
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    if (code === 'STALE_REVISION') return errorResponse(409, code, 'Catalog đã đổi trên thiết bị khác. Hãy tải lại trước khi lưu.');
    if (code === 'PAYLOAD_TOO_LARGE') return errorResponse(413, code, 'Dữ liệu gửi lên quá lớn.');
    if (code.startsWith('INVALID_')) return errorResponse(400, code, 'Dữ liệu gửi lên không hợp lệ.');
    if (code.includes('NOT_FOUND')) return errorResponse(404, code, 'Không tìm thấy dữ liệu yêu cầu.');
    console.error('API error', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Không thể hoàn tất thao tác; dữ liệu cũ vẫn được giữ nguyên.');
  }
};

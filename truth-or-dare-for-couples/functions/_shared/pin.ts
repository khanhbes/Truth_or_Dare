/**
 * Couple-account PIN hashing.
 *
 * New hashes use PBKDF2-SHA256 with a random per-account salt, stored as
 * `pbkdf2-sha256$<iterations>$<saltHex>$<hashHex>`. Older accounts were saved
 * as a single SHA-256 over a fixed salt; those still verify and are upgraded
 * to PBKDF2 on the next successful login.
 */

/** Cloudflare Workers caps PBKDF2 at 100 000 iterations. */
export const PIN_HASH_ITERATIONS = 100_000;
const PBKDF2_PREFIX = 'pbkdf2-sha256';
const SALT_BYTES = 16;
const HASH_BITS = 256;

const encoder = new TextEncoder();

const toHex = (bytes: ArrayBuffer | Uint8Array): string =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array | null => {
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) return null;
  return Uint8Array.from(hex.match(/../g)!, (pair) => Number.parseInt(pair, 16));
};

/** Compares two strings without returning early on the first difference. */
const constantTimeEqual = (a: string, b: string): boolean => {
  let diff = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
};

const derive = async (pin: string, salt: Uint8Array, iterations: number): Promise<string> => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, HASH_BITS);
  return toHex(bits);
};

/** The pre-2026-11 format: SHA-256 of a fixed salt and the PIN. */
export const legacyPinHash = async (pin: string): Promise<string> =>
  toHex(await crypto.subtle.digest('SHA-256', encoder.encode(`tod-salt:${pin}`)));

export const hashPin = async (pin: string, salt?: Uint8Array): Promise<string> => {
  const saltBytes = salt ?? crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(pin, saltBytes, PIN_HASH_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PIN_HASH_ITERATIONS}$${toHex(saltBytes)}$${hash}`;
};

/** Accounts created before a PIN was required stored the hash of an empty PIN. */
export const isLegacyEmptyPinHash = async (stored: string): Promise<boolean> =>
  !stored.startsWith(`${PBKDF2_PREFIX}$`) && constantTimeEqual(stored, await legacyPinHash(''));

export interface PinVerification {
  ok: boolean;
  /** True when the stored hash uses the legacy format and should be replaced. */
  needsUpgrade: boolean;
}

export const verifyPin = async (pin: string, stored: string): Promise<PinVerification> => {
  if (stored.startsWith(`${PBKDF2_PREFIX}$`)) {
    const [, iterationText, saltHex, hashHex] = stored.split('$');
    const iterations = Number(iterationText);
    const salt = fromHex(saltHex ?? '');
    if (!salt || !hashHex || !Number.isInteger(iterations) || iterations < 1 || iterations > PIN_HASH_ITERATIONS) {
      return { ok: false, needsUpgrade: false };
    }
    return { ok: constantTimeEqual(await derive(pin, salt, iterations), hashHex), needsUpgrade: false };
  }
  const ok = constantTimeEqual(await legacyPinHash(pin), stored);
  return { ok, needsUpgrade: ok };
};

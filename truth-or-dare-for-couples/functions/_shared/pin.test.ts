import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPin, isLegacyEmptyPinHash, legacyPinHash, verifyPin } from './pin';

test('new PIN hashes use PBKDF2 with a random salt and verify', async () => {
  const first = await hashPin('2468');
  const second = await hashPin('2468');
  assert.match(first, /^pbkdf2-sha256\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.notEqual(first, second, 'each account gets its own salt');
  assert.deepEqual(await verifyPin('2468', first), { ok: true, needsUpgrade: false });
  assert.deepEqual(await verifyPin('2469', first), { ok: false, needsUpgrade: false });
});

test('legacy SHA-256 hashes still verify and ask to be upgraded', async () => {
  const legacy = await legacyPinHash('1234');
  assert.deepEqual(await verifyPin('1234', legacy), { ok: true, needsUpgrade: true });
  assert.deepEqual(await verifyPin('0000', legacy), { ok: false, needsUpgrade: false });
});

test('only the legacy empty-PIN hash counts as a locked account', async () => {
  assert.equal(await isLegacyEmptyPinHash(await legacyPinHash('')), true);
  assert.equal(await isLegacyEmptyPinHash(await legacyPinHash('1234')), false);
  assert.equal(await isLegacyEmptyPinHash(await hashPin('1234')), false);
});

test('malformed PBKDF2 records never verify', async () => {
  for (const stored of ['pbkdf2-sha256$', 'pbkdf2-sha256$999999$00$00', 'pbkdf2-sha256$100000$zz$00']) {
    assert.deepEqual(await verifyPin('1234', stored), { ok: false, needsUpgrade: false });
  }
});

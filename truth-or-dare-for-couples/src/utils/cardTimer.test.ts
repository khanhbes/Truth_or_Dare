import assert from 'node:assert/strict';
import test from 'node:test';
import type { PositionDifficultyStars, PositionFamily } from '../types';
import {
  CARD_TIMER_MAX_SECONDS,
  CARD_TIMER_MIN_SECONDS,
  DEFAULT_CARD_TIMER_SECONDS,
  POSITION_TIMER_SECONDS,
  extendTimer,
  normalizeCardTimerSeconds,
  requiresTimerStartBeforeCompletion,
  resolveCardTimerSeconds,
} from './cardTimer';

test('normalizes only positive integer durations inside the supported range', () => {
  assert.equal(normalizeCardTimerSeconds(CARD_TIMER_MIN_SECONDS), 1);
  assert.equal(normalizeCardTimerSeconds(30), 30);
  assert.equal(normalizeCardTimerSeconds(CARD_TIMER_MAX_SECONDS), 3600);

  for (const value of [undefined, null, 0, -1, 1.5, 3601, Number.NaN, Number.POSITIVE_INFINITY, '30']) {
    assert.equal(normalizeCardTimerSeconds(value), null, String(value));
  }
});

test('resolves the Dare default, card overrides and explicit opt-out', () => {
  // A Truth is a conversation: no countdown unless the card declares one.
  assert.equal(resolveCardTimerSeconds({ type: 'truth' }), null);
  assert.equal(resolveCardTimerSeconds({ type: 'dare' }), DEFAULT_CARD_TIMER_SECONDS);
  // Position cards get a suggestion between 90 and 120 seconds, longer for hotter cards.
  const position = (difficultyStars: PositionDifficultyStars, family: PositionFamily = 'oral') =>
    resolveCardTimerSeconds({ type: 'dare', deck: 'position', position: { family, difficultyStars } });
  assert.deepEqual([6, 7, 8, 9].map((star) => position(star as PositionDifficultyStars)), [90, 100, 110, 120]);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', deck: 'position' }), POSITION_TIMER_SECONDS[6]);
  // Saved at 10★ it plays as 9★; the old 1–5★ scale becomes 6–10★; the last card has no countdown.
  assert.equal(position(10, 'handjob'), 120);
  assert.equal(position(2), 100);
  assert.equal(position(10, 'have_sex'), null);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', deck: 'position', timerSeconds: null }), null);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', deck: 'position', timerSeconds: 90 }), 90);
  assert.equal(resolveCardTimerSeconds({ type: 'truth', timerSeconds: 45 }), 45);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds: 90 }), 90);
  assert.equal(resolveCardTimerSeconds({ type: 'truth', timerSeconds: null }), null);
  assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds: null }), null);
  assert.equal(resolveCardTimerSeconds(null), null);
});

test('malformed per-card values fall back to 60 seconds', () => {
  for (const timerSeconds of [0, -1, 1.5, 3601, Number.NaN, Number.POSITIVE_INFINITY, '30']) {
    assert.equal(resolveCardTimerSeconds({ type: 'dare', timerSeconds }), DEFAULT_CARD_TIMER_SECONDS);
  }
});

test('only Standard cards with a countdown must be started before completion', () => {
  assert.equal(requiresTimerStartBeforeCompletion({ type: 'dare' }), true);
  assert.equal(requiresTimerStartBeforeCompletion({ type: 'truth' }), false);
  assert.equal(requiresTimerStartBeforeCompletion({ type: 'truth', timerSeconds: 30 }), true);
  assert.equal(requiresTimerStartBeforeCompletion({ type: 'dare', deck: 'position', timerSeconds: 60 }), false);
  assert.equal(requiresTimerStartBeforeCompletion({ type: 'dare', deck: 'position' }), false);
  assert.equal(requiresTimerStartBeforeCompletion(null), false);
});

test('extra time never passes the longest countdown', () => {
  assert.equal(extendTimer(12, 15), 27);
  assert.equal(extendTimer(0, 30), 30);
  assert.equal(extendTimer(CARD_TIMER_MAX_SECONDS - 5, 30), CARD_TIMER_MAX_SECONDS);
  assert.equal(extendTimer(-4, 15), 15);
});

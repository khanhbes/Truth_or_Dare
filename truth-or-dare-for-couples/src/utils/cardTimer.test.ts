import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CARD_TIMER_MAX_SECONDS,
  CARD_TIMER_MIN_SECONDS,
  DEFAULT_CARD_TIMER_SECONDS,
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
  // Position cards are paced by the couple: only an explicit duration starts a countdown.
  assert.equal(resolveCardTimerSeconds({ type: 'dare', deck: 'position' }), null);
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
  assert.equal(requiresTimerStartBeforeCompletion(null), false);
});

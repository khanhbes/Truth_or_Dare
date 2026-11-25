import assert from 'node:assert/strict';
import test from 'node:test';
import { MATCH_QUESTIONS } from '../data/eventQuestions';
import {
  EVENT_KINDS,
  EVENT_MILESTONES,
  countMatches,
  createGameEvents,
  fillNames,
  finishEvent,
  getDueEvent,
  hydrateGameEvents,
  pickMatchQuestions,
} from './gameEvents';

const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

test('every game plans each kind of event once', () => {
  for (const random of [() => 0, () => 0.5, () => 0.999999, sequence(0.1, 0.9)]) {
    assert.deepEqual([...createGameEvents(0, random).plan].sort(), [...EVENT_KINDS].sort());
  }
});

test('the double turn never waits at 75%, and the four orders left are equally likely', () => {
  // Every way three shuffle steps can fall, in fine steps.
  const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((value) => value + 0.05);
  const counts = new Map<string, number>();
  for (const a of steps) for (const b of steps) for (const c of steps) {
    const { plan } = createGameEvents(0, sequence(a, b, c));
    assert.notEqual(plan[2], 'double');
    counts.set(plan.join(), (counts.get(plan.join()) ?? 0) + 1);
  }
  assert.equal(counts.size, 4);
  for (const count of counts.values()) assert.ok(Math.abs(count / 1000 - 0.25) < 0.08, String(count));
});

test('an event waits at 25, 50 and 75%, once each, and never at 100%', () => {
  let state = createGameEvents(0);
  assert.equal(getDueEvent(state, 24), null);
  for (const [index, milestone] of EVENT_MILESTONES.entries()) {
    const due = getDueEvent(state, milestone + 2);
    assert.equal(due?.index, index);
    assert.equal(due?.milestone, milestone);
    assert.equal(due?.kind, state.plan[index]);
    state = finishEvent(state, due!);
    assert.equal(getDueEvent(state, milestone + 2), null);
  }
  assert.equal(getDueEvent(createGameEvents(0), 100), null);
});

test('jumping over two milestones offers only the later one', () => {
  const state = createGameEvents(0);
  const due = getDueEvent(state, 52);
  assert.equal(due?.milestone, 50);
  assert.equal(getDueEvent(finishEvent(state, due!), 60), null);
});

test('a saved game without events only plays the milestones ahead of it', () => {
  const old = hydrateGameEvents(undefined, 60);
  assert.equal(old.done, 2);
  assert.equal(getDueEvent(old, 60), null);
  assert.equal(getDueEvent(old, 76)?.milestone, 75);

  const saved = hydrateGameEvents({ plan: ['swap', 'match', 'double'], done: 1, doubleNext: true, askedIds: ['a', 2] }, 60);
  assert.deepEqual(saved, { plan: ['swap', 'match', 'double'], done: 1, doubleNext: true, askedIds: ['a'] });
  // Damaged data falls back to a playable plan.
  assert.equal(hydrateGameEvents({ plan: ['swap', 'nope', 'double'] }, 0).plan.length, 3);
  assert.equal(hydrateGameEvents({ plan: ['swap', 'match', 'double'], done: 99 }, 0).done, 3);
});

test('questions follow the milestone and are not asked twice while fresh ones are left', () => {
  const state = createGameEvents(0);
  const first = pickMatchQuestions(state, 50);
  assert.equal(first.length, 2);
  assert.ok(first.every((question) => question.milestone === 50));
  assert.notEqual(first[0].id, first[1].id);
  const again = pickMatchQuestions({ ...state, askedIds: first.map((question) => question.id) }, 50);
  assert.ok(again.every((question) => !first.some((asked) => asked.id === question.id)));
  // Everything asked already: the same questions may return instead of an empty event.
  const all = MATCH_QUESTIONS.map((question) => question.id);
  assert.equal(pickMatchQuestions({ ...state, askedIds: all }, 75).length, 2);
});

test('answers are compared question by question', () => {
  assert.equal(countMatches([0, 2], [0, 1]), 1);
  assert.equal(countMatches([1, 1], [1, 1]), 2);
  assert.equal(countMatches([0, 1], [1, 0]), 0);
});

test('every question is complete, unique and short enough for a phone button', () => {
  assert.equal(new Set(MATCH_QUESTIONS.map((question) => question.id)).size, MATCH_QUESTIONS.length);
  for (const milestone of EVENT_MILESTONES) {
    assert.ok(MATCH_QUESTIONS.filter((question) => question.milestone === milestone).length >= 6);
  }
  for (const question of MATCH_QUESTIONS) {
    assert.ok(question.text.endsWith('?'), question.id);
    assert.ok(question.text.length <= 60, question.id);
    assert.ok(question.options.length >= 3 && question.options.length <= 4, question.id);
    assert.equal(new Set(question.options).size, question.options.length, question.id);
    for (const option of question.options) assert.ok(option.length <= 32, `${question.id}: ${option}`);
  }
  assert.equal(fillNames('{p1} hay {p2}?', ['An', 'Bình']), 'An hay Bình?');
});

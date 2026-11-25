import { MATCH_QUESTIONS, type MatchQuestion } from '../data/eventQuestions';

/**
 * Event turns at 25, 50 and 75% Tim Hồng. Each game plays every kind once, in an order
 * drawn at the start. They are offered before a draw and can always be refused.
 *
 * - match: both pick an answer in secret; the same pick earns stars for both.
 * - swap: the partner looks at two cards and picks the one the player will do.
 * - double: the next completed card fills Tim Hồng twice as much. Never at 75%: from there
 *   it would fill the heart before the clothing schedule is through.
 */
export type GameEventKind = 'match' | 'swap' | 'double';

export const EVENT_MILESTONES = [25, 50, 75] as const;
export const EVENT_KINDS: readonly GameEventKind[] = ['match', 'swap', 'double'];
export const MATCH_QUESTION_COUNT = 2;
/** Stars for each player and each matched answer. */
export const MATCH_STAR_REWARD = 2;
export const DOUBLE_MULTIPLIER = 2;

export interface GameEventsState {
  /** The kind that waits at each milestone. */
  plan: [GameEventKind, GameEventKind, GameEventKind];
  /** How many milestones are behind the couple, played or refused. */
  done: number;
  /** The next completed card counts double. */
  doubleNext: boolean;
  /** Questions already asked in this game. */
  askedIds: string[];
}

export interface DueGameEvent {
  /** 0–2, the place in the plan. */
  index: number;
  kind: GameEventKind;
  milestone: typeof EVENT_MILESTONES[number];
}

const shuffled = <T>(items: readonly T[], random: () => number): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.min(index, Math.floor(random() * (index + 1)));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

/** Every order in which "double" is not the last one, all equally likely. */
const planEvents = (random: () => number): GameEventsState['plan'] => {
  const plan = shuffled(EVENT_KINDS, random) as GameEventsState['plan'];
  if (plan[2] === 'double') {
    const earlier = random() < 0.5 ? 0 : 1;
    [plan[earlier], plan[2]] = [plan[2], plan[earlier]];
  }
  return plan;
};

/** A game that is already further along starts with the milestones it has passed behind it. */
export const createGameEvents = (intimacyPercent = 0, random: () => number = Math.random): GameEventsState => ({
  plan: planEvents(random),
  done: EVENT_MILESTONES.filter((milestone) => intimacyPercent >= milestone).length,
  doubleNext: false,
  askedIds: [],
});

/** The event to offer now, or null. Passing two milestones at once offers only the later one. */
export const getDueEvent = (state: GameEventsState, intimacyPercent: number): DueGameEvent | null => {
  if (intimacyPercent >= 100) return null;
  for (let index = EVENT_MILESTONES.length - 1; index >= state.done; index -= 1) {
    if (intimacyPercent >= EVENT_MILESTONES[index]) {
      return { index, kind: state.plan[index], milestone: EVENT_MILESTONES[index] };
    }
  }
  return null;
};

export const finishEvent = (state: GameEventsState, event: DueGameEvent): GameEventsState => ({
  ...state,
  done: Math.max(state.done, event.index + 1),
});

/** Questions of the milestone that were not asked yet; asked ones come back only when none is left. */
export const pickMatchQuestions = (
  state: GameEventsState,
  milestone: number,
  count = MATCH_QUESTION_COUNT,
  random: () => number = Math.random,
): MatchQuestion[] => {
  const pool = MATCH_QUESTIONS.filter((question) => question.milestone === milestone);
  const asked = new Set(state.askedIds);
  return [
    ...shuffled(pool.filter((question) => !asked.has(question.id)), random),
    ...shuffled(pool.filter((question) => asked.has(question.id)), random),
  ].slice(0, count);
};

export const fillNames = (text: string, names: readonly [string, string]): string =>
  text.replaceAll('{p1}', names[0]).replaceAll('{p2}', names[1]);

export const countMatches = (first: readonly number[], second: readonly number[]): number =>
  first.filter((answer, index) => answer === second[index]).length;

const isKind = (value: unknown): value is GameEventKind => EVENT_KINDS.includes(value as GameEventKind);

/** Reads events from a saved game; a save without them only plays the milestones still ahead. */
export const hydrateGameEvents = (value: unknown, intimacyPercent: number): GameEventsState => {
  const fresh = createGameEvents(intimacyPercent);
  if (typeof value !== 'object' || value === null) return fresh;
  const saved = value as Partial<Record<keyof GameEventsState, unknown>>;
  if (!Array.isArray(saved.plan) || saved.plan.length !== 3 || !saved.plan.every(isKind)) return fresh;
  return {
    plan: [saved.plan[0], saved.plan[1], saved.plan[2]],
    done: typeof saved.done === 'number' && saved.done >= 0 ? Math.min(EVENT_MILESTONES.length, Math.floor(saved.done)) : fresh.done,
    doubleNext: saved.doubleNext === true,
    askedIds: Array.isArray(saved.askedIds) ? saved.askedIds.filter((id): id is string => typeof id === 'string') : [],
  };
};

import type { PositionDifficultyStars, PositionFamily } from '../types';

export const CARD_TIMER_MIN_SECONDS = 1;
export const CARD_TIMER_MAX_SECONDS = 3600;
export const DEFAULT_CARD_TIMER_SECONDS = 60;
/**
 * Suggested time for a Position card without its own duration. It is only a hint: the
 * countdown starts when the couple wants it and is never required.
 */
export const POSITION_TIMER_SECONDS: Readonly<Record<6 | 7 | 8 | 9, number>> = { 6: 90, 7: 100, 8: 110, 9: 120 };
/** What the "+…s" buttons add to a running countdown. */
export const TIMER_EXTENSIONS = [15, 30] as const;

export type TimerEligibleCard = {
  type: string;
  deck?: string;
  timerSeconds?: unknown;
  position?: { family?: PositionFamily; difficultyStars?: PositionDifficultyStars } | null;
};

/**
 * Returns a safe per-card countdown duration, or null when the stored value
 * should not start a timer. Numeric strings, fractions and out-of-range values
 * are intentionally rejected instead of being silently coerced.
 */
export const normalizeCardTimerSeconds = (value: unknown): number | null => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < CARD_TIMER_MIN_SECONDS ||
    value > CARD_TIMER_MAX_SECONDS
  ) {
    return null;
  }

  return value;
};

/** The hint for a Position card: hotter cards get a little longer. The last card has none. */
export const suggestPositionSeconds = (card: TimerEligibleCard): number | null => {
  if (card.position?.family === 'have_sex') return null;
  const stars = card.position?.difficultyStars ?? 6;
  // Old saves used 1–5★, and a regular card saved at 10★ plays as 9★ (see derivePositionDifficultyStars).
  const tier = Math.min(9, Math.max(6, stars <= 5 ? stars + 5 : stars)) as 6 | 7 | 8 | 9;
  return POSITION_TIMER_SECONDS[tier];
};

/**
 * Resolves a card override first. `null` is an explicit per-card opt-out.
 * Standard Dares inherit the 60 second default and Position cards a longer hint;
 * a Truth is a conversation and runs a countdown only when the card declares one.
 */
export const resolveCardTimerSeconds = (
  card: TimerEligibleCard | null | undefined,
): number | null => {
  if (!card || (card.type !== 'truth' && card.type !== 'dare')) return null;
  if (card.timerSeconds === null) return null;

  const override = normalizeCardTimerSeconds(card.timerSeconds);
  if (override !== null) return override;
  if (card.deck === 'position') return suggestPositionSeconds(card);
  if (card.type === 'truth') return null;
  return DEFAULT_CARD_TIMER_SECONDS;
};

/**
 * Whether the couple must start the countdown before confirming the card.
 * Position countdowns are optional helpers, so only Standard cards require it.
 */
export const requiresTimerStartBeforeCompletion = (
  card: TimerEligibleCard | null | undefined,
): boolean => Boolean(card) && card?.deck !== 'position' && resolveCardTimerSeconds(card) !== null;

/** Adds time to a countdown without passing the longest one a card may have. */
export const extendTimer = (seconds: number, extra: number): number =>
  Math.min(CARD_TIMER_MAX_SECONDS, Math.max(0, seconds) + Math.max(0, extra));

import type { CardResolutionEvent, PositionSessionStats } from '../types';

export const EMPTY_POSITION_SESSION_STATS: Readonly<PositionSessionStats> = {
  drawn: 0,
  opened: 0,
  completed: 0,
  skipped: 0,
};

/** Idempotent event append used as the final guard against double clicks. */
export const appendCardResolutionEvent = (
  events: readonly CardResolutionEvent[],
  event: CardResolutionEvent,
): CardResolutionEvent[] => events.some((item) => item.id === event.id)
  ? [...events]
  : [...events, event];

export const recordPositionDraw = (stats: PositionSessionStats): PositionSessionStats => ({
  ...stats,
  drawn: stats.drawn + 1,
});

export const recordPositionOpen = (stats: PositionSessionStats): PositionSessionStats => ({
  ...stats,
  // A card opened again after the game was continued is still one opened card.
  opened: Math.min(stats.drawn, stats.opened + 1),
});

export const applyPositionResolution = (
  stats: PositionSessionStats,
  event: CardResolutionEvent,
): PositionSessionStats => {
  if (event.deck !== 'position') return stats;
  if (event.status === 'completed') return { ...stats, completed: stats.completed + 1 };
  if (event.status === 'skipped') return { ...stats, skipped: stats.skipped + 1 };
  return stats;
};

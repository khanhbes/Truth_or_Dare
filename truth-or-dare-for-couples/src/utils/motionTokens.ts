/** Shared timings and easings, so every movement in the app feels related. */

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

/** Seconds, for motion/react transitions. */
export const DURATION = {
  instant: 0.08,
  fast: 0.18,
  base: 0.28,
  slow: 0.5,
  flip: 0.66,
  quickFlip: 0.26,
} as const;

/**
 * How every dialog panel comes in and goes out. A whole `transform` string runs on the
 * compositor; separate x/y/scale values would redraw the panel in every frame.
 */
export const dialogPanelMotion = (reduceMotion: boolean) => ({
  initial: reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(14px) scale(0.96)' },
  animate: reduceMotion ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px) scale(1)' },
  exit: reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
  transition: { duration: reduceMotion ? DURATION.instant : DURATION.base, ease: EASE_OUT },
});

/** Milliseconds, for the table's timed sequences. */
export const TABLE_TIMING = {
  /** Shuffle + lift + flip stay under 1.6 s, and a tap skips the rest. */
  shuffle: 600,
  lift: 160,
  reducedShuffle: 90,
  reducedLift: 60,
  /** A garment coming off: light first, then the garment, then the points. */
  spotlight: 380,
  garmentOff: 950,
  turnStrip: 900,
  spark: 900,
  /** The chosen last card moves to the middle and turns over. */
  finalReveal: 1050,
  holdToConfirm: 600,
  /** How long the last turn can be taken back. */
  undo: 5000,
  /** Clicks right after a change are ignored, so a double click never does two things. */
  actionGuard: 380,
} as const;

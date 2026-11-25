import canvasConfetti, { type CreateTypes, type Options, type Shape } from 'canvas-confetti';

/**
 * Confetti drawn on the page itself. The library's default uses a worker built
 * from its own source text, and a build that renames that source can break it:
 * the canvas appeared but stayed empty.
 */
let cannon: CreateTypes | null = null;

const fire = (options: Options): void => {
  cannon ??= canvasConfetti.create(undefined, { resize: true, useWorker: false, disableForReducedMotion: true });
  void cannon(options);
};

/** First garment, 25/50/75/100%. */
export const fireMilestoneConfetti = (): void => fire({
  particleCount: 70,
  spread: 84,
  startVelocity: 36,
  origin: { y: 0.6 },
  colors: ['#FF6B9D', '#D4AF37', '#FF1493', '#FFF'],
});

/** Tim Hồng is full and both are undressed: a soft burst of hearts. */
export const fireHeartConfetti = (): void => {
  let heart: Shape | undefined;
  try {
    heart = canvasConfetti.shapeFromText?.({ text: '♥', scalar: 2 });
  } catch {
    heart = undefined; // Browsers without OffscreenCanvas get the plain shapes.
  }
  fire({
    particleCount: 70,
    spread: 100,
    startVelocity: 32,
    origin: { y: 0.55 },
    scalar: 1.6,
    colors: ['#fb7185', '#f9a8d4', '#fda4af', '#e2c275'],
    ...(heart ? { shapes: [heart] } : {}),
  });
};

/** The last card of the journey. */
export const fireFinalConfetti = (): void => fire({
  particleCount: 90,
  spread: 120,
  startVelocity: 38,
  origin: { y: 0.5 },
  shapes: ['star'],
  colors: ['#f7e7b0', '#e2c275', '#d7b1ff', '#fff4d6'],
});

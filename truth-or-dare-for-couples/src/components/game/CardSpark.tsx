import React from 'react';

const SPARKS = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2 + (index % 2 ? 0.2 : 0);
  const reach = 0.26 + (index % 3) * 0.06;
  return {
    '--dx': `calc(var(--card-h) * ${(Math.cos(angle) * reach).toFixed(3)})`,
    '--dy': `calc(var(--card-h) * ${(Math.sin(angle) * reach).toFixed(3)})`,
    animationDelay: `${(index % 4) * 28}ms`,
  } as React.CSSProperties;
});

/** The everyday reward for a completed card. Confetti is kept for milestones. */
export const CardSpark: React.FC = () => (
  <span className="card-spark" aria-hidden="true">
    {SPARKS.map((style, index) => <i key={index} style={style} />)}
  </span>
);

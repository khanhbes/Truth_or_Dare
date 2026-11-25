import React from 'react';
import { TABLE_TIMING } from '../../utils/motionTokens';
import { CardBack, type DeckKind } from './CardBack';

interface TableDeckProps {
  kind: DeckKind;
  /** idle: ready to draw · shuffling · behind: a card lies on top · gone: nothing left to draw. */
  phase: 'idle' | 'shuffling' | 'behind' | 'gone';
  onDraw?: () => void;
}

/** Where each card of the stack rests, bottom to top, and how far the shuffle throws it. */
const LAYERS = [
  { rotate: -5, y: 1.4, opacity: 0.55 },
  { rotate: 3.2, y: -0.8, opacity: 0.75 },
  { rotate: -1.6, y: 0.5, opacity: 0.9 },
  { rotate: 0, y: 0, opacity: 1 },
].map((layer, index) => {
  const side = index % 2 === 0 ? -1 : 1;
  return {
    '--rest-y': `${layer.y}%`,
    '--rest-r': `${layer.rotate}deg`,
    '--rest-o': layer.opacity,
    '--out-x': `${side * (30 + index * 5)}%`,
    '--out-y': `${-3 - index * 1.5}%`,
    '--out-r': `${side * (7 + index * 1.4)}deg`,
    animationDuration: `${TABLE_TIMING.shuffle - 60}ms`,
    animationDelay: `${index * 18}ms`,
  } as React.CSSProperties;
});

/**
 * The one deck on the table: it never disappears, cards are drawn from it and fly off it.
 * CSS does the moving (`.table-deck` in game-table.css), so a shuffle stays smooth
 * while the page works out the next card.
 */
export const TableDeck: React.FC<TableDeckProps> = ({ kind, phase, onDraw }) => {
  const idle = phase === 'idle' && Boolean(onDraw);
  return (
    <div
      className={`table-deck table-deck--${kind}`}
      data-phase={phase}
      data-idle={idle || undefined}
      aria-hidden="true"
      onClick={idle ? onDraw : undefined}
    >
      {LAYERS.map((style, index) => (
        <span key={index} className="table-deck__layer" style={style}>
          <CardBack kind={kind} />
        </span>
      ))}
    </div>
  );
};

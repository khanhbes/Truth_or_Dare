import React from 'react';
import { Flame } from 'lucide-react';

export type DeckKind = 'standard' | 'position';

interface CardBackProps {
  kind: DeckKind;
  label?: string;
  seal?: React.ReactNode;
  footer?: React.ReactNode;
  /** A card of the collection that is not opened yet. */
  locked?: boolean;
}

/** The one card back: on the deck, while shuffling, behind every card and for locked cards. */
export const CardBack: React.FC<CardBackProps> = ({ kind, label, seal, footer, locked = false }) => (
  <span className={`card-back card-back--${kind} ${locked ? 'card-back--locked' : ''}`} aria-hidden="true">
    <span className="card-back__frame">
      {kind === 'standard' ? (
        <>
          <span className="card-back__brand">{label ?? 'Truth or Dare'}</span>
          <span className="card-back__seal">{seal ?? <Flame />}</span>
          {footer ?? <span className="card-back__brand card-back__brand--pink">Cặp đôi</span>}
        </>
      ) : (
        <>
          <span className="card-back__brand">{label ?? 'Luxury journey'}</span>
          <span className="card-back__seal">{seal ?? '✦'}</span>
          {footer ?? <span className="card-back__brand">Tư thế</span>}
        </>
      )}
    </span>
  </span>
);

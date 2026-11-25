import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Player } from '../../types';
import { DURATION, EASE_OUT, TABLE_TIMING } from '../../utils/motionTokens';

interface TurnStripProps {
  player: Player;
  round: number;
  /** Goes away at once when the next draw starts. */
  visible: boolean;
  reduceMotion: boolean;
}

/** "Đến lượt…": a short beat between two turns. Screen readers get it from the live region. */
export const TurnStrip: React.FC<TurnStripProps> = ({ player, round, visible, reduceMotion }) => {
  const [shownRound, setShownRound] = useState<number | null>(null);
  const previousRound = useRef(round);
  useEffect(() => {
    if (previousRound.current === round) return;
    previousRound.current = round;
    setShownRound(round);
    const timeout = window.setTimeout(() => setShownRound(null), TABLE_TIMING.turnStrip);
    return () => window.clearTimeout(timeout);
  }, [round]);

  return (
    <div className="turn-strip" aria-hidden="true">
      <AnimatePresence>
        {visible && shownRound === round && (
          <motion.div
            key={round}
            // Whole transform strings run on the compositor (see TableCard).
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(14px) scale(0.94)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)', transition: { duration: reduceMotion ? DURATION.instant : DURATION.base, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.14 } }}
            exit={{ opacity: 0, transform: `translateY(${reduceMotion ? 0 : -8}px) scale(1)`, transition: { duration: DURATION.fast } }}
          >
            <span className="text-2xl leading-none">{player.avatar}</span>
            <span className="truncate">Đến lượt <strong className="font-serif-romantic text-amber-100">{player.name}</strong></span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

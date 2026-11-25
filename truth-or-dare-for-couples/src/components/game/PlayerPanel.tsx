import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Star } from 'lucide-react';
import type { OutfitState, Player, PlayerRewardState } from '../../types';
import { getOutfitStage, getPresentGarmentSlots } from '../../utils/wardrobe';
import { EASE_OUT } from '../../utils/motionTokens';
import { OutfitFigure } from '../OutfitFigure';

interface PlayerPanelProps {
  player: Player;
  outfitState: OutfitState;
  rewardState: PlayerRewardState;
  hasPendingDifficultyBoost: boolean;
  active: boolean;
  mobile?: boolean;
  /** 0–1 warmth of the moment, shown as blush, smile and hearts. */
  mood?: number;
  /** A garment of this player is coming off right now. */
  spotlit?: boolean;
}

const OUTFIT_STAGE_COPY = {
  dressed: 'Đang mặc đồ',
  underwear_only: 'Chỉ còn đồ lót',
  empty: 'Hết đồ đã chọn',
} as const;

/** The wallet pops and shows "+2★" when stars arrive. */
const StarBalance: React.FC<{ value: number }> = ({ value }) => {
  const reduceMotion = useReducedMotion();
  const previous = useRef(value);
  const [gain, setGain] = useState<{ id: number; amount: number } | null>(null);
  useEffect(() => {
    const amount = value - previous.current;
    previous.current = value;
    if (amount <= 0) {
      // Stars were spent: the label of the last gain goes away with its timer.
      setGain(null);
      return;
    }
    const id = Date.now();
    setGain({ id, amount });
    const timeout = window.setTimeout(() => setGain((current) => (current?.id === id ? null : current)), 1500);
    return () => window.clearTimeout(timeout);
  }, [value]);

  return (
    <span className="relative inline-flex items-center justify-center">
      <motion.span
        // A new element for each gain: only then does the pop play.
        key={gain?.id ?? 'still'}
        initial={reduceMotion || !gain ? false : { transform: 'scale(1.28)' }}
        animate={{ transform: 'scale(1)' }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="inline-flex items-center gap-1"
      >
        <Star className="h-3.5 w-3.5 fill-amber-300/25" aria-hidden="true" />{value}
      </motion.span>
      <AnimatePresence>
        {gain && (
          <motion.span
            key={gain.id}
            aria-hidden="true"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(4px)' }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, transform: 'translateY(-14px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="pointer-events-none absolute left-full top-0 ml-1 whitespace-nowrap text-xs font-black text-amber-200"
          >
            +{gain.amount}★
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

/** One player's figure, name and wallet beside the card. */
export const PlayerPanel: React.FC<PlayerPanelProps> = React.memo(({
  player,
  outfitState,
  rewardState,
  hasPendingDifficultyBoost,
  active,
  mobile = false,
  mood = 0,
  spotlit = false,
}) => {
  const stage = getOutfitStage(outfitState);
  const count = getPresentGarmentSlots(outfitState).length;
  const stageTone = stage === 'empty' ? 'text-neutral-300' : stage === 'underwear_only' ? 'text-amber-200' : 'text-rose-200';

  return (
    <aside
      className={`player-panel ${mobile ? 'player-panel--mobile' : 'player-panel--side'} ${spotlit ? 'is-spotlit' : ''}`}
      data-active={active || undefined}
      aria-label={`${player.name}: ${OUTFIT_STAGE_COPY[stage]}, còn ${count} món, ví ${rewardState.starBalance} sao, hoàn thành ${player.completedCount} lá${active ? ', đang tới lượt' : ''}${hasPendingDifficultyBoost ? ', đang bị tăng khó' : ''}`}
    >
      {hasPendingDifficultyBoost && <span className="player-panel__boost">Tăng khó</span>}
      <OutfitFigure
        outfit={outfitState.initial}
        state={outfitState}
        active={active}
        mood={mood}
        compact
        ariaLabel={`Hình trang phục hiện tại của ${player.name}`}
      />
      <div className="player-panel__info">
        <div className="player-panel__name">
          <span aria-hidden="true">{player.avatar}</span>
          <span className="truncate">{player.name}</span>
        </div>
        <div className={`player-panel__stage ${stageTone}`}>
          {OUTFIT_STAGE_COPY[stage]}
          {count > 0 && <>{' '}<span className="player-panel__count">{count} món</span></>}
        </div>
        {mobile ? (
          <div className="player-panel__wallet"><StarBalance value={rewardState.starBalance} /></div>
        ) : (
          <dl className="player-panel__stats">
            <div>
              <dt>Ví sao</dt>
              <dd className="text-amber-200"><StarBalance value={rewardState.starBalance} /></dd>
            </div>
            <div>
              <dt>Hoàn thành</dt>
              <dd>{player.completedCount} lá</dd>
            </div>
          </dl>
        )}
      </div>
    </aside>
  );
});
PlayerPanel.displayName = 'PlayerPanel';

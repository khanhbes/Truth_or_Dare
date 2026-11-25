import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Zap } from 'lucide-react';
import type { CardType } from '../../types';
import { DURATION, EASE_OUT } from '../../utils/motionTokens';
import { FOCUS_RING } from './tableStyles';

interface ChooseTypeProps {
  playerName: string;
  /** Why Truth cannot be chosen now; null when it can. */
  truthLockedReason: string | null;
  dareAvailable: boolean;
  reduceMotion: boolean;
  onChoose: (type: CardType) => void;
}

const OPTION = `choose-type__option disabled:cursor-not-allowed ${FOCUS_RING}`;

/** "Tự chọn" mode: the player picks Truth or Dare before drawing. */
export const ChooseType: React.FC<ChooseTypeProps> = ({ playerName, truthLockedReason, dareAvailable, reduceMotion, onChoose }) => (
  <motion.section
    className="choose-type"
    aria-labelledby="choose-type-title"
    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
    animate={{ opacity: 1, transform: 'translateY(0px)' }}
    transition={{ duration: DURATION.base, ease: EASE_OUT }}
  >
    <h2 id="choose-type-title" className="font-serif-romantic text-2xl font-bold text-amber-100">{playerName} chọn gì?</h2>
    <div className="choose-type__options">
      <button type="button" data-action="choose-truth" disabled={Boolean(truthLockedReason)} onClick={() => onChoose('truth')} className={`${OPTION} choose-type__option--truth`}>
        <HelpCircle className="h-9 w-9 text-blue-200" aria-hidden="true" />
        <span className="font-serif-romantic text-xl font-bold text-white">Sự thật</span>
        <span className="text-sm text-blue-100">{truthLockedReason ?? 'Trả lời thành thật'}</span>
      </button>
      <button type="button" data-action="choose-dare" disabled={!dareAvailable} onClick={() => onChoose('dare')} className={`${OPTION} choose-type__option--dare`}>
        <Zap className="h-9 w-9 text-rose-200" aria-hidden="true" />
        <span className="font-serif-romantic text-xl font-bold text-white">Thử thách</span>
        <span className="text-sm text-rose-100">{dareAvailable ? 'Thực hiện hành động' : 'Không còn lá phù hợp'}</span>
      </button>
    </div>
  </motion.section>
);

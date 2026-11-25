import React from 'react';
import { motion } from 'motion/react';
import { Heart, History, LockOpen, SkipForward, TriangleAlert, Undo2 } from 'lucide-react';
import { DURATION, EASE_OUT } from '../../utils/motionTokens';
import { FOCUS_RING } from './tableStyles';

export interface TableNotice {
  tone: 'warning' | 'gain' | 'calm' | 'restored';
  text: string;
  /** The card is new in the collection. */
  unlocked?: boolean;
}

interface TableToastProps {
  notice: TableNotice;
  /** The turn behind this message can still be taken back. */
  undo: { id: number; held: boolean; onUndo: () => void; onHold: (held: boolean) => void } | null;
  reduceMotion: boolean;
}

const TONES: Record<TableNotice['tone'], string> = {
  warning: 'border-amber-300/45 bg-[#2a1a08] text-amber-100',
  gain: 'border-rose-300/40 bg-[#2b101b] text-rose-50',
  calm: 'border-white/25 bg-[#1b1418] text-neutral-100',
  restored: 'border-emerald-300/40 bg-[#06231a] text-emerald-100',
};

const ICONS: Record<TableNotice['tone'], React.ReactNode> = {
  warning: <TriangleAlert className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />,
  gain: <Heart className="h-4 w-4 shrink-0 fill-rose-400/70 text-rose-300" aria-hidden="true" />,
  calm: <SkipForward className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden="true" />,
  restored: <History className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />,
};

/** A short message above the table, with "Hoàn tác" while the turn can be taken back. */
export const TableToast: React.FC<TableToastProps> = ({ notice, undo, reduceMotion }) => (
  <motion.div
    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-8px)' }}
    animate={{ opacity: 1, transform: 'translateY(0px)' }}
    exit={{ opacity: 0 }}
    transition={{ duration: DURATION.fast, ease: EASE_OUT }}
    className={`game-toast__pill ${TONES[notice.tone]}`}
    data-undo={undo ? '' : undefined}
    onPointerEnter={() => undo?.onHold(true)}
    onPointerLeave={() => undo?.onHold(false)}
  >
    {ICONS[notice.tone]}
    <span role="status" className="min-w-0 text-balance">{notice.text}</span>
    {notice.unlocked && (
      <span className="flex shrink-0 items-center gap-1 text-emerald-200">
        <LockOpen className="h-4 w-4" aria-hidden="true" /> Lá mới
      </span>
    )}
    {undo && (
      <button
        type="button"
        data-action="undo"
        onClick={undo.onUndo}
        onFocus={() => undo.onHold(true)}
        onBlur={() => undo.onHold(false)}
        aria-label="Hoàn tác lượt vừa rồi (phím Z)"
        className={`game-toast__undo ${FOCUS_RING}`}
      >
        <Undo2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Hoàn tác
        <span key={undo.id} className="game-toast__bar" data-held={undo.held || undefined} aria-hidden="true" />
      </button>
    )}
  </motion.div>
);

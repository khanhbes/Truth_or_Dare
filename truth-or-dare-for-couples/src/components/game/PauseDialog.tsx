import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Flag, Pause, Play, SkipForward } from 'lucide-react';
import { dialogPanelMotion } from '../../utils/motionTokens';
import { useDialogFocus } from '../useDialogFocus';
import { BUTTON_PRIMARY, FOCUS_RING } from './tableStyles';

interface PauseDialogProps {
  /** Dropping the open card is free: no penalty, no questions. */
  canDropCard: boolean;
  reduceMotion: boolean;
  onContinue: () => void;
  onDropCard: () => void;
  onEnd: () => void;
}

const ROW = `flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/35 hover:bg-white/[0.08] ${FOCUS_RING}`;

/** A quiet moment: the clock stops and nothing on the table is visible. */
export const PauseDialog: React.FC<PauseDialogProps> = ({ canDropCard, reduceMotion, onContinue, onDropCard, onEnd }) => {
  const continueRef = useRef<HTMLButtonElement>(null);
  const panelRef = useDialogFocus<HTMLDivElement>({ onEscape: onContinue, initialFocusRef: continueRef });
  const titleId = useId();
  const textId = useId();

  return createPortal(
    <div className="fixed inset-0 z-[110] grid place-items-center bg-[#0d070a]/95 p-4 backdrop-blur-xl">
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        {...dialogPanelMotion(reduceMotion)}
        className="w-full max-w-sm text-center text-white"
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-sky-200/30 bg-sky-300/10 text-sky-100" aria-hidden="true">
          <Pause className="h-6 w-6" />
        </span>
        <h2 id={titleId} className="mt-4 font-serif-romantic text-3xl font-bold">Đang tạm dừng</h2>
        <p id={textId} className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-neutral-200">
          Đồng hồ đã dừng. Hai bạn cứ nghỉ, uống nước hoặc nói với nhau điều mình muốn.
        </p>
        <div className="mt-6 grid gap-2">
          <button ref={continueRef} type="button" onClick={onContinue} className={BUTTON_PRIMARY}>
            <Play className="h-4 w-4 fill-neutral-950" aria-hidden="true" /> Chơi tiếp
          </button>
          {canDropCard && (
            <button type="button" data-action="drop-card" onClick={onDropCard} className={ROW}>
              <SkipForward className="h-4 w-4" aria-hidden="true" /> Bỏ lá này, không phạt
            </button>
          )}
          <button type="button" onClick={onEnd} className={ROW}>
            <Flag className="h-4 w-4" aria-hidden="true" /> Kết thúc ván
          </button>
        </div>
        <p className="mt-5 hidden text-xs leading-relaxed text-neutral-300 md:block">
          Phím tắt: Space rút, mở, hoàn thành · S bỏ qua · R đổi lá · P tạm dừng
        </p>
      </motion.div>
    </div>,
    document.body,
  );
};

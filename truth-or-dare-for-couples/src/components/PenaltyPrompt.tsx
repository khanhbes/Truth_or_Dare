import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Feather, Shirt, ShieldCheck, SkipForward, X } from 'lucide-react';
import { CardType } from '../types';
import { dialogPanelMotion } from '../utils/motionTokens';
import { useDialogFocus } from './useDialogFocus';

interface PenaltyPromptProps {
  playerName: string;
  playerAvatar: string;
  cardType: CardType;
  penaltyEnabled: boolean;
  canRemoveGarment: boolean;
  /** Shown instead of the garment option when the clothing penalty is temporarily locked. */
  lockedReason?: string;
  /** The player still has the free swap for an easier card. */
  canChooseLighter: boolean;
  onReturn: () => void;
  onChooseGarment: () => void;
  onChooseLighter: () => void;
  onContinueWithoutPenalty: () => void;
}

// Saying no must be as easy as saying yes: all options share one style and size.
const OPTION_BUTTON = 'flex min-h-[5.75rem] w-full flex-col items-center gap-1 rounded-2xl border border-white/15 bg-white/[0.05] px-3 py-3 text-center transition-colors hover:border-amber-200/60 hover:bg-amber-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300';

export const PenaltyPrompt: React.FC<PenaltyPromptProps> = ({
  playerName,
  playerAvatar,
  cardType,
  penaltyEnabled,
  canRemoveGarment,
  lockedReason,
  canChooseLighter,
  onReturn,
  onChooseGarment,
  onChooseLighter,
  onContinueWithoutPenalty,
}) => {
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({ onEscape: onReturn, initialFocusRef: firstOptionRef });
  const shouldReduceMotion = useReducedMotion();

  const canChooseGarment = penaltyEnabled && canRemoveGarment && !lockedReason;
  const reason = cardType === 'truth'
    ? `${playerName} không muốn trả lời, hoặc câu trả lời chưa đúng? Hai bạn cùng chọn cách tính lượt này.`
    : `${playerName} không thực hiện thử thách này? Hai bạn cùng chọn cách tính lượt này.`;
  const note = !penaltyEnabled
    ? 'Luật phạt cởi đồ đang tắt trong phần thiết lập.'
    : lockedReason
      ? lockedReason
      : !canRemoveGarment
        ? `${playerName} không còn món đồ nào để bỏ.`
        : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.08 : 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="penalty-title"
      aria-describedby="penalty-description"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onReturn();
      }}
    >
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        {...dialogPanelMotion(Boolean(shouldReduceMotion))}
        className={`relative max-h-[calc(100svh-2rem)] w-full overflow-y-auto rounded-3xl border border-rose-400/40 bg-[#160e12]/98 p-5 text-center text-white shadow-[0_26px_80px_rgba(0,0,0,0.75)] sm:p-6 ${canChooseGarment && canChooseLighter ? 'max-w-lg' : 'max-w-md'}`}
      >
        <button
          type="button"
          onClick={() => onReturn()}
          aria-label="Quay lại lá bài"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/45 bg-rose-500/10 text-2xl shadow-[0_0_24px_rgba(255,107,157,0.16)]" aria-hidden="true">
          {playerAvatar}
        </div>
        <h2 id="penalty-title" className="mt-3 font-serif-romantic text-2xl font-bold text-amber-200">
          Bỏ qua lượt này?
        </h2>
        <p id="penalty-description" className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-200">
          {reason}
        </p>

        <div className={`mt-5 grid gap-2.5 ${canChooseGarment && canChooseLighter ? 'grid-cols-2 sm:grid-cols-3' : canChooseGarment || canChooseLighter ? 'grid-cols-2' : ''}`}>
          <button
            ref={firstOptionRef}
            type="button"
            data-action="penalty-none"
            onClick={() => onContinueWithoutPenalty()}
            className={OPTION_BUTTON}
          >
            <SkipForward className="h-5 w-5 text-amber-200" aria-hidden="true" />
            <span className="text-sm font-bold">Không phạt</span>
            <span className="text-xs text-neutral-300">Bỏ qua lá này, chuyển lượt</span>
          </button>
          {canChooseGarment && (
            <button
              type="button"
              data-action="penalty-garment"
              onClick={() => onChooseGarment()}
              className={OPTION_BUTTON}
            >
              <Shirt className="h-5 w-5 text-rose-200" aria-hidden="true" />
              <span className="text-sm font-bold">Bỏ một món đồ</span>
              <span className="text-xs text-neutral-300">Chọn món rồi chuyển lượt</span>
            </button>
          )}
          {canChooseLighter && (
            <button
              type="button"
              data-action="penalty-lighter"
              onClick={() => onChooseLighter()}
              className={`${OPTION_BUTTON} ${canChooseGarment ? 'max-sm:col-span-2' : ''}`}
            >
              <Feather className="h-5 w-5 text-emerald-200" aria-hidden="true" />
              <span className="text-sm font-bold">Lá nhẹ hơn</span>
              <span className="text-xs text-neutral-300">Đổi miễn phí, 1 lần mỗi ván</span>
            </button>
          )}
        </div>

        {note && <p className="mt-3 text-xs leading-relaxed text-neutral-300">{note}</p>}

        <p className="mt-4 flex items-center justify-center gap-2 text-xs leading-relaxed text-emerald-200/90">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          Hai bạn luôn có thể từ chối, đổi cách khác hoặc dừng.
        </p>

        <button
          type="button"
          onClick={() => onReturn()}
          className="mx-auto mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm text-neutral-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại lá bài
        </button>
      </motion.div>
    </motion.div>
  );
};

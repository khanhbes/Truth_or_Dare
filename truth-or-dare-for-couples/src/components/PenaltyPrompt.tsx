import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, CheckCircle2, ChevronRight, Layers3, ShieldCheck, X } from 'lucide-react';
import { CardType } from '../types';

interface PenaltyPromptProps {
  playerName: string;
  playerAvatar: string;
  cardType: CardType;
  penaltyEnabled: boolean;
  canRemoveGarment: boolean;
  /** Shown instead of the garment option when the clothing penalty is temporarily locked. */
  lockedReason?: string;
  onReturn: () => void;
  onChooseGarment: () => void;
  onContinueWithoutPenalty: () => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const PenaltyPrompt: React.FC<PenaltyPromptProps> = ({
  playerName,
  playerAvatar,
  cardType,
  penaltyEnabled,
  canRemoveGarment,
  lockedReason,
  onReturn,
  onChooseGarment,
  onContinueWithoutPenalty,
}) => {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onReturnRef = useRef(onReturn);
  const shouldReduceMotion = useReducedMotion();

  onReturnRef.current = onReturn;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => primaryButtonRef.current?.focus());

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onReturnRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable: HTMLElement[] = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      previouslyFocused?.focus();
    };
  }, []);

  const reason = cardType === 'truth'
    ? 'Nếu cả hai xác nhận câu trả lời là sai hoặc người chơi không muốn trả lời, có thể áp dụng luật phạt đã thống nhất.'
    : 'Nếu thử thách chưa được thực hiện, có thể áp dụng luật phạt đã thống nhất.';
  const canChooseGarment = penaltyEnabled && canRemoveGarment && !lockedReason;
  const statusCopy = !penaltyEnabled
    ? 'Luật phạt cởi đồ đang tắt trong thiết lập. Lượt này sẽ chỉ được ghi nhận là bỏ qua.'
    : lockedReason
      ? lockedReason
    : !canRemoveGarment
      ? `${playerName} không còn món đồ nào có thể bỏ. Hai bạn có thể thống nhất một phương án thay thế hoặc tiếp tục.`
      : `${playerName} có thể chọn một món đồ đang được phép bỏ. Bạn vẫn có thể không áp dụng luật phạt.`;

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
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: shouldReduceMotion ? 0.08 : 0.22, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-3xl border border-rose-400/40 bg-[#160e12]/98 p-5 text-center text-white shadow-[0_26px_80px_rgba(0,0,0,0.75)] sm:p-6"
      >
        <button
          type="button"
          onClick={onReturn}
          aria-label="Quay lại lá bài"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-neutral-500 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/45 bg-rose-500/10 text-2xl shadow-[0_0_24px_rgba(255,107,157,0.16)]">
          {playerAvatar}
        </div>
        <span className="inline-flex rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-rose-200">
          Luật phạt · Tùy chọn
        </span>
        <h2 id="penalty-title" className="mt-3 font-serif-romantic text-2xl font-bold text-amber-300">
          Lượt Này Chưa Hoàn Thành
        </h2>
        <p id="penalty-description" className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-neutral-300 sm:text-sm">
          {reason}
        </p>

        <div className="my-5 rounded-2xl border border-rose-400/25 bg-rose-500/[0.06] px-4 py-3 text-left">
          <p className="text-xs leading-relaxed text-neutral-200">
            {statusCopy}
          </p>
          <div className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-emerald-200/80">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Chỉ tiếp tục khi vẫn đồng thuận; luôn có thể từ chối, đổi phương án hoặc dừng.</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={canChooseGarment ? onChooseGarment : onContinueWithoutPenalty}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-4 py-3 text-sm font-bold text-neutral-950 shadow-[0_0_22px_rgba(212,175,55,0.24)] transition hover:shadow-[0_0_28px_rgba(255,107,157,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {canChooseGarment ? <Layers3 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>{canChooseGarment ? 'Chọn Món Đồ' : 'Ghi Nhận · Chuyển Lượt'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
          {canChooseGarment && (
            <button
              type="button"
              onClick={onContinueWithoutPenalty}
              className="w-full rounded-full border border-neutral-700 bg-neutral-900/80 px-4 py-2.5 text-xs font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Không áp dụng phạt · Chuyển lượt
            </button>
          )}
          <button
            type="button"
            onClick={onReturn}
            className="mx-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs text-neutral-500 transition hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại lá bài</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

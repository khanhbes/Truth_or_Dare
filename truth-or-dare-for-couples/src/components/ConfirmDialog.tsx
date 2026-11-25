import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { dialogPanelMotion } from '../utils/motionTokens';
import { useDialogFocus } from './useDialogFocus';

interface ConfirmDialogProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirmation instead of the browser's own confirm() box. Focus starts
 * on the safe choice, so Enter or Escape never ends a game by accident.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  icon,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useDialogFocus<HTMLDivElement>({ onEscape: onCancel, initialFocusRef: cancelRef });
  const shouldReduceMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();

  // In the body: a blurred or animated parent would otherwise trap the fixed overlay.
  return createPortal(
    <div
      className="fixed inset-0 z-[130] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        {...dialogPanelMotion(Boolean(shouldReduceMotion))}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#171014] p-6 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,.6)]"
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-500/15 text-rose-200" aria-hidden="true">
          {icon}
        </div>
        <h2 id={titleId} className="mt-4 font-serif-romantic text-xl font-bold text-white">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-neutral-300">{description}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-neutral-100 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

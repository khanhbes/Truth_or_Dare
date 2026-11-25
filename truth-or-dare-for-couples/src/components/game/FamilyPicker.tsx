import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Layers } from 'lucide-react';
import { dialogPanelMotion } from '../../utils/motionTokens';
import type { PositionFamilyOption } from '../../utils/progression';
import { POSITION_FAMILY_STAR_COST } from '../../utils/rewards';
import { useDialogFocus } from '../useDialogFocus';
import { FOCUS_RING, getPositionFamilyLabel } from './tableStyles';

interface FamilyPickerProps {
  options: readonly PositionFamilyOption[];
  balance: number;
  reduceMotion: boolean;
  onChoose: (key: string) => void;
  onClose: () => void;
}

/** The couple pays to say which group of positions the next card comes from. */
export const FamilyPicker: React.FC<FamilyPickerProps> = ({ options, balance, reduceMotion, onChoose, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useDialogFocus<HTMLDivElement>({ onEscape: onClose, initialFocusRef: closeRef });
  const titleId = useId();

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...dialogPanelMotion(reduceMotion)}
        className="max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-[#e2c275]/35 bg-[#0d1426] p-5 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,.6)] sm:p-6"
      >
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#e2c275]/45 bg-[#e2c275]/10 text-[#f7e7b0]" aria-hidden="true">
          <Layers className="h-5 w-5" />
        </span>
        <h2 id={titleId} className="mt-3 font-serif-romantic text-2xl font-bold text-[#fff4d6]">Chọn nhóm tư thế</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-200">
          Lá kế tiếp sẽ thuộc nhóm hai bạn chọn. Tốn {POSITION_FAMILY_STAR_COST}★, ví chung đang có {balance}★.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              data-action="family"
              onClick={() => onChoose(option.key)}
              className={`min-h-16 rounded-2xl border border-[#e2c275]/30 bg-[#e2c275]/[0.07] px-3 py-2 transition-colors hover:border-[#e2c275]/70 hover:bg-[#e2c275]/15 ${FOCUS_RING}`}
            >
              <span className="block text-sm font-bold text-[#fff4d6]">{getPositionFamilyLabel(option.sample)}</span>
              <span className="block text-xs text-slate-200">còn {option.count} lá</span>
            </button>
          ))}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={`mt-4 min-h-11 w-full rounded-full border border-white/15 px-4 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/35 ${FOCUS_RING}`}
        >
          Đóng
        </button>
      </motion.div>
    </div>,
    document.body,
  );
};

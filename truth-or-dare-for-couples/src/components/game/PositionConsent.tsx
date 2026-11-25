import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import type { OutfitState, Player } from '../../types';
import { getPresentGarmentSlots } from '../../utils/wardrobe';
import { DURATION, EASE_OUT } from '../../utils/motionTokens';
import { BUTTON_PRIMARY_LUXURY, BUTTON_SECONDARY, FOCUS_RING } from './tableStyles';

interface PositionConsentProps {
  players: readonly [Player, Player];
  outfitStates: readonly [OutfitState, OutfitState];
  /** Who still has a garment to take off before the deck opens. */
  nextToPrepare: string | null;
  reduceMotion: boolean;
  onPrepare: () => void;
  onFinish: () => void;
  onEnter: () => void;
}

/** Both agree again before the Position deck opens. */
export const PositionConsent: React.FC<PositionConsentProps> = ({
  players,
  outfitStates,
  nextToPrepare,
  reduceMotion,
  onPrepare,
  onFinish,
  onEnter,
}) => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, []);

  return (
  <motion.section
    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(14px) scale(0.98)' }}
    animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
    transition={{ duration: DURATION.slow, ease: EASE_OUT }}
    aria-labelledby="position-consent-title"
    className="table-panel position-gate"
  >
    <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#e2c275]/50 bg-[#e2c275]/10 text-xl text-[#f7e7b0]" aria-hidden="true">✦</span>
    <p className="mt-3 text-sm font-semibold text-[#f7e7b0]">Tim Hồng đã đầy</p>
    <h2 ref={titleRef} tabIndex={-1} id="position-consent-title" className="mt-1 focus:outline-none font-serif-romantic text-3xl font-bold text-[#fff4d6]">Bộ Tư thế đã mở</h2>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-200">
      Chỉ tiếp tục nếu cả hai vẫn tự nguyện. Mỗi lá đều có thể bỏ qua, đổi ý hoặc dừng mà không bị phạt.
    </p>
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-slate-200">
      {nextToPrepare ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {players.map((player, index) => (
              <span key={index}>{player.name}: <strong className="text-white">còn {getPresentGarmentSlots(outfitStates[index]).length} món</strong></span>
            ))}
          </div>
          <button
            type="button"
            onClick={onPrepare}
            className={`mt-3 min-h-11 w-full rounded-full border border-[#e2c275]/40 bg-[#e2c275]/10 px-4 text-sm font-semibold text-[#fff4d6] transition-colors hover:bg-[#e2c275]/20 ${FOCUS_RING}`}
          >
            Chọn món tiếp theo của {nextToPrepare}
          </button>
        </>
      ) : (
        <p role="status" className="flex items-center justify-center gap-2 font-semibold text-emerald-200">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Cả hai đã sẵn sàng
        </p>
      )}
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={onFinish} className={BUTTON_SECONDARY}>Kết thúc tại đây</button>
      <button type="button" data-action="agree" onClick={onEnter} disabled={nextToPrepare !== null} className={`${BUTTON_PRIMARY_LUXURY} disabled:cursor-not-allowed disabled:opacity-40`}>
        Cả hai đồng ý
      </button>
    </div>
    <p className="mt-3 text-sm font-medium text-[#f7e7b0]/90">Nghe “Dừng” là dừng ngay.</p>
  </motion.section>
  );
};

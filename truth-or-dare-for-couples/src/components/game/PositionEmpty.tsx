import React from 'react';
import { Heart } from 'lucide-react';
import { BUTTON_PRIMARY_LUXURY, BUTTON_SECONDARY } from './tableStyles';

interface PositionEmptyProps {
  message: string;
  onPass: () => void;
  onFinish: () => void;
}

/** The Position deck has no card for this player's turn. */
export const PositionEmpty: React.FC<PositionEmptyProps> = ({ message, onPass, onFinish }) => (
  <section className="table-panel" aria-labelledby="position-empty-title">
    <Heart className="mx-auto h-10 w-10 text-[#e8a48c]" aria-hidden="true" />
    <h2 id="position-empty-title" className="mt-3 font-serif-romantic text-2xl font-bold text-[#f1d6ff]">Chưa có lá phù hợp</h2>
    <p className="mt-2 text-sm leading-relaxed text-neutral-200">{message}</p>
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      <button type="button" data-action="pass" data-main-action onClick={onPass} className={BUTTON_SECONDARY}>Chuyển lượt</button>
      <button type="button" onClick={onFinish} className={BUTTON_PRIMARY_LUXURY}>Kết thúc ván</button>
    </div>
  </section>
);

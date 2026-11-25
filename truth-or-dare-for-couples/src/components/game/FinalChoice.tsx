import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { CardItem } from '../../types';
import type { FinalChoiceSnapshot } from '../../utils/gameSession';
import { derivePositionDifficultyStars } from '../../utils/progression';
import { FINAL_FLIP_THREE_STAR_COST, FINAL_FLIP_TWO_STAR_COST } from '../../utils/rewards';
import { DURATION, EASE_OUT, TABLE_TIMING } from '../../utils/motionTokens';
import { soundEngine } from '../../utils/audio';
import { autoAssignIcon, getCardIcon } from '../CardIcons';
import { CardBack } from './CardBack';
import { BUTTON_QUIET, FOCUS_RING, finalCardTitle } from './tableStyles';
import { useHoldToConfirm } from './useHoldToConfirm';

interface FinalChoiceProps {
  choice: FinalChoiceSnapshot;
  sharedStarBalance: number;
  /** Price of revealing all three from the current state. */
  flipThreeCost: number;
  reduceMotion: boolean;
  onFlip: (card: CardItem) => void;
  onBuyFlips: (flips: 2 | 3) => void;
  onChoose: (card: CardItem) => void;
}

interface FinalCardProps {
  card: CardItem;
  index: number;
  count: number;
  revealed: boolean;
  /** Holding the face-down card chooses it blindly. */
  blind: boolean;
  canFlip: boolean;
  fate: 'waiting' | 'chosen' | 'left';
  /** How far the chosen card has to slide to the middle of the row, in pixels. */
  shift: number;
  reduceMotion: boolean;
  onFlip: () => void;
  onChoose: () => void;
}

const FinalCard: React.FC<FinalCardProps> = ({ card, index, count, revealed, blind, canFlip, fate, shift, reduceMotion, onFlip, onChoose }) => {
  const waiting = fate === 'waiting';
  const blindHold = useHoldToConfirm(onChoose, waiting && blind);
  const pickHold = useHoldToConfirm(onChoose, waiting && !blind);
  const faceUp = revealed || fate === 'chosen';
  const Icon = card.customImage ? null : getCardIcon(card.icon || autoAssignIcon(card.content));
  // Whole transform strings run on the compositor (see TableCard).
  const place = (x: number, y: number, scale: number, rotate = 0) =>
    `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`;
  // The chosen card slides to the middle of the row and grows while it turns over.
  const animate = fate === 'left'
    ? { opacity: 0, transform: place(0, 26, 0.82) }
    : fate === 'chosen'
      ? { opacity: 1, transform: place(shift, 0, 1.12) }
      : { opacity: 1, transform: place(0, 0, 1) };

  return (
    <motion.div
      className="final-card"
      data-fate={fate}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: place(0, 24, 1, (index - (count - 1) / 2) * 5) }}
      animate={animate}
      transition={{ duration: reduceMotion ? DURATION.instant : fate === 'waiting' ? DURATION.slow : 0.6, ease: EASE_OUT, delay: waiting && !reduceMotion ? index * 0.08 : 0 }}
    >
      <button
        type="button"
        aria-label={revealed
          ? `Lá ${index + 1}: ${finalCardTitle(card)}`
          : blind ? `Lá úp số ${index + 1}, giữ để chọn` : `Lá úp số ${index + 1}`}
        disabled={!waiting || (!blind && !canFlip)}
        data-holding={blindHold.holding || undefined}
        className={`final-card__slot ${FOCUS_RING}`}
        {...(blind ? blindHold.holdProps : { onClick: onFlip })}
      >
        <span
          className="final-card__flip"
          data-up={faceUp ? '' : undefined}
          style={{ transitionDelay: fate === 'chosen' && !revealed ? '.25s' : undefined }}
        >
          <span className="final-card__side final-card__side--back">
            <CardBack
              kind="position"
              label={`Lá ${index + 1}`}
              footer={<span className="final-card__hold">{blind ? 'Giữ để chọn' : canFlip ? 'Chạm để lật' : ''}</span>}
            />
          </span>
          <span className="final-card__side final-card__side--front">
            {faceUp && (
              <>
                {card.customImage ? (
                  <img src={card.customImage} alt="" className="final-card__art" />
                ) : Icon ? (
                  <span className="final-card__art card-icon-color text-[#f4e8ff]"><Icon className="h-full w-full" /></span>
                ) : null}
                <span className="final-card__title">{finalCardTitle(card)}</span>
                <span className="text-sm font-bold text-[#e2c275]">{derivePositionDifficultyStars(card)}★</span>
              </>
            )}
          </span>
        </span>
        <svg className="final-card__ring" aria-hidden="true"><rect pathLength={1} /></svg>
      </button>
      <div className="final-card__pick">
        {revealed && !blind && waiting && (
          <button
            type="button"
            data-holding={pickHold.holding || undefined}
            className={`final-card__choose ${FOCUS_RING}`}
            aria-label={`Giữ để chọn lá ${index + 1}`}
            {...pickHold.holdProps}
          >
            Giữ để chọn
          </button>
        )}
      </div>
    </motion.div>
  );
};

/** The last moment of the game: three face-down Have Sex cards, one is chosen. */
export const FinalChoice: React.FC<FinalChoiceProps> = ({
  choice,
  sharedStarBalance,
  flipThreeCost,
  reduceMotion,
  onFlip,
  onBuyFlips,
  onChoose,
}) => {
  const { candidates, flips, revealedIds } = choice;
  const [chosen, setChosen] = useState<{ id: string; shift: number } | null>(null);
  const chosenId = chosen?.id ?? null;
  const rowRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef(0);
  const onChooseRef = useRef(onChoose);
  onChooseRef.current = onChoose;
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, []);

  const choose = (card: CardItem, index: number) => {
    if (chosen) return;
    const row = rowRef.current?.getBoundingClientRect();
    const cell = rowRef.current?.children[index]?.getBoundingClientRect();
    const shift = row && cell ? row.left + row.width / 2 - (cell.left + cell.width / 2) : 0;
    setChosen({ id: card.id, shift: Math.round(shift) });
    soundEngine.playCardFlip();
    soundEngine.haptic([40, 50, 40]);
    timerRef.current = window.setTimeout(
      () => onChooseRef.current(card),
      reduceMotion ? 200 : TABLE_TIMING.finalReveal,
    );
  };

  const count = candidates.length;
  const flipsLeft = Math.max(0, flips - revealedIds.length);
  const title = chosenId
    ? 'Lá cuối của hai bạn'
    : count === 1
      ? 'Lá cuối của hai bạn'
      : flips === 1
        ? `Chọn 1 trong ${count} lá`
        : flips === 2
          ? 'Lật 2 lá rồi chọn 1'
          : `Chọn 1 trong ${count} lá đã lật`;
  const guide = chosenId
    ? 'Cùng xem nhé.'
    : flips === 1
      ? count === 1 ? 'Giữ lá bài để mở.' : 'Giữ một lá úp để chọn. Muốn xem trước, dùng sao trong ví chung.'
      : flips === 2 && flipsLeft > 0
        ? `Chạm để lật thêm ${flipsLeft} lá, rồi giữ nút dưới lá hai bạn muốn.`
        : 'Giữ nút dưới lá hai bạn muốn.';

  return (
    <section className="final-choice" aria-labelledby="final-choice-title" data-count={count}>
      <div className="final-choice__head">
        <p className="text-sm font-semibold text-[#f7e7b0]">Lá cuối · Have Sex</p>
        <h2 ref={titleRef} tabIndex={-1} id="final-choice-title" className="mt-1 focus:outline-none font-serif-romantic text-3xl font-bold text-[#fff4d6]">{title}</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-200" role="status">{guide}</p>
      </div>
      <div ref={rowRef} className="final-choice__cards">
        {candidates.map((card, index) => {
          const revealed = revealedIds.includes(card.id);
          return (
            <FinalCard
              key={card.id}
              card={card}
              index={index}
              count={count}
              revealed={revealed}
              blind={flips === 1}
              canFlip={!revealed && revealedIds.length < flips}
              fate={chosenId === null ? 'waiting' : chosenId === card.id ? 'chosen' : 'left'}
              shift={chosen?.shift ?? 0}
              reduceMotion={reduceMotion}
              onFlip={() => onFlip(card)}
              onChoose={() => choose(card, index)}
            />
          );
        })}
      </div>
      <div className="final-choice__shop" data-gone={chosenId ? '' : undefined}>
        {count > 1 && (
          <span className="text-sm text-slate-200">Ví chung: <strong className="text-amber-200">{sharedStarBalance}★</strong></span>
        )}
        {flips < 2 && count >= 2 && (
          <button type="button" data-action="flip-two" onClick={() => onBuyFlips(2)} disabled={Boolean(chosenId) || sharedStarBalance < FINAL_FLIP_TWO_STAR_COST} className={BUTTON_QUIET}>
            Lật 2 lá · {FINAL_FLIP_TWO_STAR_COST}★
          </button>
        )}
        {flips < 3 && count >= 3 && (
          <button type="button" data-action="flip-three" onClick={() => onBuyFlips(3)} disabled={Boolean(chosenId) || sharedStarBalance < flipThreeCost} className={BUTTON_QUIET}>
            {flips === 2 ? `Lật lá còn lại · ${flipThreeCost}★` : `Lật cả 3 lá · ${FINAL_FLIP_THREE_STAR_COST}★`}
          </button>
        )}
      </div>
    </section>
  );
};

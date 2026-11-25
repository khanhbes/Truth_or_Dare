import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Eye, HandHeart } from 'lucide-react';
import type { CardItem } from '../../types';
import { LEVEL_INFO } from '../../data/cards';
import { getCardDensity } from '../../utils/cardDensity';
import { DURATION, EASE_OUT } from '../../utils/motionTokens';
import { deriveDifficultyStars, derivePositionDifficultyStars, getCardDeck } from '../../utils/progression';
import type { PairSnapshot } from '../../utils/gameSession';
import { autoAssignIcon, getCardIcon } from '../CardIcons';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_LUXURY, FOCUS_RING, getPositionFamilyLabel } from './tableStyles';

interface PairChoiceProps {
  pair: PairSnapshot;
  /** Face up. Closed at first when only one of the two may look. */
  open: boolean;
  /** Who chooses, and who will do the card. */
  chooserName: string;
  playerName: string;
  reduceMotion: boolean;
  onOpen: () => void;
  onChoose: (index: 0 | 1) => void;
}

const PairCard: React.FC<{ card: CardItem; index: 0 | 1; reduceMotion: boolean; onChoose: () => void }> = ({ card, index, reduceMotion, onChoose }) => {
  const position = getCardDeck(card) === 'position';
  const level = LEVEL_INFO[card.level];
  const Icon = card.customImage ? null : getCardIcon(card.icon || autoAssignIcon(card.content));
  return (
    <motion.article
      className="pair-card"
      data-deck={position ? 'position' : 'standard'}
      data-density={getCardDensity(card)}
      aria-labelledby={`pair-card-${index}`}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: `translateY(18px) rotate(${index === 0 ? -2 : 2}deg)` }}
      animate={{ opacity: 1, transform: 'translateY(0px) rotate(0deg)' }}
      transition={{ duration: reduceMotion ? DURATION.instant : DURATION.slow, ease: EASE_OUT, delay: reduceMotion ? 0 : index * 0.08 }}
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold">
        {position ? (
          <span className="rounded-full border border-[#e2c275]/45 bg-[#e2c275]/10 px-2.5 py-1 text-[#f7e7b0]">✦ {getPositionFamilyLabel(card)}</span>
        ) : (
          <>
            <span className={`rounded-full border px-2.5 py-1 ${card.type === 'truth' ? 'border-blue-400/45 bg-blue-950/80 text-blue-200' : 'border-rose-400/45 bg-rose-950/80 text-rose-200'}`}>
              {card.type === 'truth' ? 'Sự thật' : 'Thử thách'}
            </span>
            <span className={`rounded-full border px-2.5 py-1 font-semibold ${level.badgeBg}`}>{level.icon} {level.name}</span>
          </>
        )}
        <span className="rounded-full border border-amber-300/30 bg-amber-300/[0.08] px-2.5 py-1 text-amber-200">
          {position ? derivePositionDifficultyStars(card) : deriveDifficultyStars(card)}★
        </span>
      </div>
      <div className="pair-card__body">
        <div className="my-auto flex flex-col items-center gap-2">
          {card.customImage
            ? <img src={card.customImage} alt="" className="pair-card__art" />
            : Icon && <span className="pair-card__art card-icon-color"><Icon className="h-full w-full" /></span>}
          <p id={`pair-card-${index}`} className="pair-card__text">{card.content}</p>
          {card.hint && <p className="text-xs italic leading-snug text-rose-200/95">Gợi ý: {card.hint}</p>}
        </div>
      </div>
      <button
        type="button"
        data-action="pair-choose"
        onClick={onChoose}
        className={`pair-card__choose ${position ? 'pair-card__choose--luxury' : ''} ${FOCUS_RING}`}
      >
        Chọn lá này
      </button>
    </motion.article>
  );
};

/** Two cards, one is kept: bought with stars, or picked by the partner in an event turn. */
export const PairChoice: React.FC<PairChoiceProps> = ({ pair, open, chooserName, playerName, reduceMotion, onOpen, onChoose }) => {
  const byPartner = pair.source === 'event';
  const luxury = getCardDeck(pair.options[0].card) === 'position';
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, [open]);

  if (!open) {
    return (
      <section className="table-panel table-panel--event" aria-labelledby="pair-gate-title">
        <span className="table-panel__seal" aria-hidden="true"><HandHeart className="h-6 w-6" /></span>
        <h2 ref={titleRef} tabIndex={-1} id="pair-gate-title" className="mt-3 font-serif-romantic text-2xl font-bold text-white focus:outline-none">
          {byPartner ? `Đưa máy cho ${chooserName}` : 'Hai lá đang úp'}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-200">
          {byPartner
            ? `Chỉ ${chooserName} xem hai lá này. ${playerName} quay mặt đi nhé.`
            : 'Mở khi cả hai sẵn sàng chọn.'}
        </p>
        <button type="button" data-action="pair-open" data-main-action onClick={onOpen} className={`${luxury ? BUTTON_PRIMARY_LUXURY : BUTTON_PRIMARY} mt-5 w-full`}>
          <Eye className="h-5 w-5 shrink-0" aria-hidden="true" /> {byPartner ? `${chooserName} xem hai lá` : 'Mở hai lá'}
        </button>
      </section>
    );
  }

  return (
    <section className="pair-choice" aria-labelledby="pair-title">
      <div>
        <h2 ref={titleRef} tabIndex={-1} id="pair-title" className="font-serif-romantic text-2xl font-bold text-[#fff4d6] focus:outline-none">
          {byPartner ? `${chooserName} chọn lá cho ${playerName}` : 'Chọn 1 trong 2 lá'}
        </h2>
        <p className="mt-1 text-sm text-neutral-200">
          {byPartner ? 'Chọn xong thì trả máy. Lá được chọn sẽ úp trên bàn.' : 'Lá còn lại trở về bộ bài.'}
        </p>
      </div>
      <div className="pair-choice__cards">
        {pair.options.map((option, index) => (
          <PairCard
            key={option.card.id}
            card={option.card}
            index={index as 0 | 1}
            reduceMotion={reduceMotion}
            onChoose={() => onChoose(index as 0 | 1)}
          />
        ))}
      </div>
    </section>
  );
};

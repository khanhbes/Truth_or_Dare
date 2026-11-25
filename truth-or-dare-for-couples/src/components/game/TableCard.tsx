import React, { useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { EyeOff, Heart, Pause, Play, RotateCcw, Shirt, Timer as TimerIcon } from 'lucide-react';
import type { CardItem } from '../../types';
import { LEVEL_INFO } from '../../data/cards';
import { CARD_DENSITY_ICON_SCALE, getCardDensity, getCardTextScale } from '../../utils/cardDensity';
import { TIMER_EXTENSIONS } from '../../utils/cardTimer';
import { deriveDifficultyStars, derivePositionDifficultyStars, getCardDeck } from '../../utils/progression';
import { DURATION, EASE_IN_OUT, EASE_OUT } from '../../utils/motionTokens';
import { autoAssignIcon, getCardIcon } from '../CardIcons';
import { useCardContentFit } from '../useCardContentFit';
import { CardBack } from './CardBack';
import { FOCUS_RING, cardUnit, formatSeconds, getPositionFamilyLabel } from './tableStyles';

/** Where the card goes when its turn is over. */
export type CardExit = 'to-left' | 'to-right' | 'skipped' | 'rerolled';

export interface TableCardTimer {
  seconds: number;
  /** The whole countdown with the time added on the way: a full ring. */
  total: number;
  started: boolean;
  running: boolean;
}

interface TableCardProps {
  card: CardItem;
  flipped: boolean;
  quickFlip: boolean;
  /** Content stays out of the page until the card is opened. */
  revealed: boolean;
  favorite: boolean;
  /** "Anh thực hiện", "Cả hai"… */
  turnLine: string;
  clothingNote: string | null;
  revealHint: string;
  timer: TableCardTimer | null;
  reduceMotion: boolean;
  onToggleFavorite: () => void;
  onTimerControl: () => void;
  onTimerExtend: (seconds: number) => void;
}

/** The last seconds are counted out loud, in red. */
const URGENT_SECONDS = 5;
const TIMER_BUTTON = `flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold tabular-nums transition-colors ${FOCUS_RING}`;

// Whole transform strings run on the compositor, so the card keeps moving smoothly
// while the page works out the next turn.
const place = (x: number, y: number, scale: number, rotate = 0) =>
  `translate(${x}%, ${y}%) rotate(${rotate}deg) scale(${scale})`;

const cardVariants: Variants = {
  enter: { opacity: 1, transform: place(0, 0, 1) },
  // The last card takes over from the smaller one that was just chosen.
  grow: { opacity: 0, transform: place(0, 15, 0.84) },
  table: { opacity: 1, transform: place(0, 0, 1) },
  exit: ({ exit, reduceMotion }: { exit: CardExit; reduceMotion: boolean }) => {
    if (reduceMotion) return { opacity: 0, transition: { duration: DURATION.instant } };
    if (exit === 'to-left' || exit === 'to-right') {
      const side = exit === 'to-left' ? -1 : 1;
      // It lands on the player's panel, and only fades once it is there.
      return {
        opacity: [1, 1, 0],
        transform: place(side * 96, -6, 0.32, side * 9),
        transition: { duration: 0.52, ease: EASE_IN_OUT, opacity: { duration: 0.52, times: [0, 0.74, 1], ease: 'linear' } },
      };
    }
    if (exit === 'skipped') return { opacity: 0, transform: place(0, 16, 0.95, 2.5), transition: { duration: DURATION.base, ease: 'easeIn' } };
    return { opacity: 0, transform: place(0, 3, 0.92), transition: { duration: DURATION.base, ease: 'easeIn' } };
  },
};

/** The drawn card: turns over from the deck, shows its content, then flies off. */
export const TableCard: React.FC<TableCardProps> = ({
  card,
  flipped,
  quickFlip,
  revealed,
  favorite,
  turnLine,
  clothingNote,
  revealHint,
  timer,
  reduceMotion,
  onToggleFavorite,
  onTimerControl,
  onTimerExtend,
}) => {
  const isPosition = getCardDeck(card) === 'position';
  const isFinal = card.position?.family === 'have_sex';
  const isMythic = isPosition && card.position?.rarity === 'mythic';
  const level = LEVEL_INFO[card.level];
  const stars = isPosition ? derivePositionDifficultyStars(card) : deriveDifficultyStars(card);
  const adminTextScale = Math.min(1.5, Math.max(0.75, card.appearance?.textScale ?? 1));
  const adminIconScale = Math.min(1.8, Math.max(0.5, card.appearance?.iconScale ?? 1));
  const iconTextGap = Math.min(48, Math.max(0, card.appearance?.iconTextGap ?? 8));
  const density = getCardDensity(card);
  const contentPx = 16 * adminTextScale * getCardTextScale(card);
  const hintPx = (density === 'dense' ? 12 : 13) * adminTextScale;
  const badgeSize = { fontSize: cardUnit(12, 12) };
  // CSS sizes the icon box from --icon-scale, so the box matches the drawn icon
  // and the gap below it is exactly iconTextGap (no overlap with the text).
  const iconStyle = {
    '--icon-scale': adminIconScale * CARD_DENSITY_ICON_SCALE[density],
    marginBottom: cardUnit(density === 'dense' ? Math.min(iconTextGap, 6) : iconTextGap),
  } as React.CSSProperties;
  const { ref: scrollRef, hasMoreBelow } = useCardContentFit<HTMLDivElement>(`${card.id}|${revealed}|${flipped}|${clothingNote ?? ''}`);
  const LineIcon = card.customImage ? null : getCardIcon(card.icon || autoAssignIcon(card.content));
  const timeUp = timer?.seconds === 0;
  const showTimer = timer !== null && revealed && !isFinal;
  const urgent = timer !== null && timer.started && timer.seconds > 0 && timer.seconds <= URGENT_SECONDS;
  const grows = isFinal && flipped && !reduceMotion;
  // Only how the card first showed up matters here, not what happens to it later.
  const [appearsFaceUp] = useState(() => (flipped || reduceMotion) && !grows);

  return (
    <motion.div
      className="table-card"
      variants={cardVariants}
      initial={grows ? 'grow' : 'enter'}
      animate="table"
      exit="exit"
      transition={{
        duration: reduceMotion ? DURATION.instant : grows ? DURATION.slow : DURATION.base,
        ease: EASE_OUT,
        opacity: { duration: reduceMotion ? DURATION.instant : DURATION.fast },
      }}
    >
      <div
        className="table-card__flip"
        data-flipped={flipped || reduceMotion ? '' : undefined}
        data-appear={appearsFaceUp ? '' : undefined}
        style={{ '--flip-time': `${quickFlip ? DURATION.quickFlip : DURATION.flip}s` } as React.CSSProperties}
      >
        <div className="table-card__side table-card__side--back">
          <CardBack kind={isPosition ? 'position' : 'standard'} />
        </div>

        <div
          className={`table-card__side table-card-face game-card ${isMythic ? 'card-position-rare' : isPosition ? 'card-position' : `card-${card.level}`} ${!isPosition && card.level !== 'gentle' ? 'card-wave-pattern' : ''}`}
        >
          {flipped && !reduceMotion && <span key={`sheen-${card.id}-${revealed}`} className="card-sheen" aria-hidden="true" />}
          {showTimer && timer.started && (
            <svg className="table-card__ring" data-urgent={urgent || timeUp || undefined} aria-hidden="true">
              <rect className="table-card__ring-track" />
              <rect pathLength={1} style={{ strokeDashoffset: 1 - Math.min(1, timer.seconds / Math.max(1, timer.total)) }} />
            </svg>
          )}
          {!isPosition && card.level !== 'gentle' && (
            <>
              <span className="card-corner-deco top-2 left-2.5" aria-hidden="true">♠ ♥</span>
              <span className="card-corner-deco top-2 right-2.5" aria-hidden="true">♦ ♣</span>
              <span className="card-corner-deco bottom-2 left-2.5" aria-hidden="true">♥ ♠</span>
              <span className="card-corner-deco bottom-2 right-2.5" aria-hidden="true">♣ ♦</span>
            </>
          )}

          <div className="table-card__body">
            <div className="table-card__top">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {isPosition ? (
                  <span style={badgeSize} className="rounded-full border border-[#e2c275]/45 bg-[#e2c275]/10 px-2.5 py-1 font-bold text-[#f7e7b0]">
                    ✦ {getPositionFamilyLabel(card)}
                  </span>
                ) : (
                  <>
                    <span
                      style={badgeSize}
                      className={`rounded-full border px-2 py-1 font-semibold ${card.type === 'truth' ? 'border-blue-400/45 bg-blue-950/80 text-blue-200' : 'border-rose-400/45 bg-rose-950/80 text-rose-200'}`}
                    >
                      {card.type === 'truth' ? 'Sự thật' : 'Thử thách'}
                    </span>
                    <span style={badgeSize} className={`rounded-full border px-2 py-1 ${level.badgeBg}`}>
                      {level.icon} {level.name}
                    </span>
                  </>
                )}
                <span
                  style={badgeSize}
                  className={`rounded-full border px-2 py-1 font-bold ${isMythic ? 'border-[#e8a48c]/55 bg-[#d7b1ff]/10 text-[#f4e8ff]' : 'border-amber-300/30 bg-amber-300/[0.08] text-amber-200'}`}
                >
                  {stars}★
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-pressed={favorite}
                aria-label={favorite ? 'Bỏ yêu thích lá bài này' : 'Yêu thích lá bài này'}
                className={`-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/10 ${FOCUS_RING}`}
              >
                <Heart className={`h-5 w-5 transition-transform ${favorite ? 'scale-110 fill-rose-500 text-rose-500' : 'text-neutral-300'}`} aria-hidden="true" />
              </button>
            </div>

            <p style={{ fontSize: cardUnit(15, 13) }} className="table-card__turn font-serif-romantic">{turnLine}</p>

            <div
              ref={scrollRef}
              data-more={hasMoreBelow ? 'true' : undefined}
              className="card-fit-area card-scroll-area flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-2 text-center"
            >
              {!revealed ? (
                <div className="my-auto flex flex-col items-center px-3">
                  <EyeOff className="mb-3 h-10 w-10 text-amber-300/85" aria-hidden="true" />
                  <p style={{ fontSize: cardUnit(15, 14) }} className="max-w-xs leading-relaxed text-neutral-200">{revealHint}</p>
                </div>
              ) : (
                <div className={`table-card__content my-auto flex flex-col items-center ${isPosition ? 'position-content-reveal' : ''}`}>
                  {card.customImage ? (
                    <div data-card-icon style={iconStyle} className={`card-icon-wrapper-lg card-custom-icon-wrapper ${isMythic ? 'mythic-icon-aura' : ''}`}>
                      <img src={card.customImage} alt="" className="card-custom-icon h-full w-full object-contain" />
                    </div>
                  ) : LineIcon ? (
                    <div data-card-icon style={iconStyle} className={`card-icon-wrapper-lg card-icon-color ${isMythic ? 'mythic-icon-aura' : ''}`}>
                      <LineIcon className="h-full w-full" />
                    </div>
                  ) : null}

                  {clothingNote && (
                    <p role="note" style={badgeSize} className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-300/45 bg-rose-500/20 px-3 py-1.5 font-bold text-rose-50">
                      <Shirt className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {clothingNote}
                    </p>
                  )}
                  <p
                    style={{ fontSize: `max(14px, calc(${contentPx.toFixed(2)} * var(--text-shrink, 1) * 100cqh / 480))` }}
                    className={`max-w-[34ch] font-medium text-white ${density === 'dense' ? 'text-pretty leading-normal' : 'text-balance leading-relaxed'}`}
                  >
                    {card.content}
                  </p>
                  {card.hint && (
                    <p
                      style={{ fontSize: `max(12px, calc(${hintPx.toFixed(2)} * var(--text-shrink, 1) * 100cqh / 480))` }}
                      className={`${density === 'normal' ? 'mt-3' : 'mt-2'} max-w-[40ch] text-balance italic text-rose-200/95`}
                    >
                      Gợi ý: {card.hint}
                    </p>
                  )}
                </div>
              )}
            </div>

            {showTimer && (
              <div className="table-card__timer">
                <p style={{ fontSize: cardUnit(14, 13) }} className={`flex min-w-0 items-center gap-2 font-semibold ${urgent || timeUp ? 'text-rose-200' : 'text-amber-200'}`}>
                  <TimerIcon className={`h-4 w-4 shrink-0 ${timer.running && !reduceMotion ? 'animate-pulse' : ''}`} aria-hidden="true" />
                  {!timer.started && <span className="table-card__timer-word">{isPosition ? 'Gợi ý' : 'Thời gian'}</span>}
                  {timeUp ? 'Hết giờ' : (
                    <span key={urgent ? timer.seconds : 'calm'} className={`text-lg font-bold tabular-nums text-white ${urgent ? 'table-card__beat' : ''}`}>
                      {formatSeconds(timer.seconds)}
                    </span>
                  )}
                </p>
                {timer.started ? (
                  <div className="flex shrink-0 gap-1.5">
                    {TIMER_EXTENSIONS.map((extra) => (
                      <button
                        key={extra}
                        type="button"
                        data-action={`extend-${extra}`}
                        onClick={() => onTimerExtend(extra)}
                        aria-label={`Thêm ${extra} giây`}
                        className={`${TIMER_BUTTON} border-white/15 bg-black/25 text-neutral-100 hover:border-white/40`}
                      >
                        +{extra}s
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={onTimerControl}
                      aria-label={timeUp ? 'Đếm lại từ đầu' : timer.running ? 'Tạm dừng đếm giờ' : 'Tiếp tục đếm giờ'}
                      className={`${TIMER_BUTTON} border-white/25 bg-black/35 text-neutral-100 hover:border-white/45`}
                    >
                      {timeUp
                        ? <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        : timer.running
                          ? <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                          : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span className="table-card__timer-word">{timeUp ? 'Lại' : timer.running ? 'Dừng' : 'Tiếp'}</span>
                    </button>
                  </div>
                ) : isPosition ? (
                  <button
                    type="button"
                    data-action="start-hint"
                    onClick={onTimerControl}
                    className={`${TIMER_BUTTON} shrink-0 border-[#e2c275]/40 bg-[#e2c275]/10 text-[#fff4d6] hover:bg-[#e2c275]/20`}
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" /> Đếm giờ
                  </button>
                ) : (
                  <span className="rounded-full border border-amber-300/25 bg-amber-500/[0.1] px-2.5 py-1 text-xs font-semibold text-amber-100">
                    Chờ bắt đầu
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

import React from 'react';
import { CardItem, CardLevel } from '../types';
import { getCardIcon, autoAssignIcon } from './CardIcons';
import { LEVEL_INFO } from '../data/cards';
import { Heart } from 'lucide-react';
import { deriveDifficultyStars, derivePositionDifficultyStars, getCardAudience, getCardDeck } from '../utils/progression';
import { CARD_DENSITY_ICON_SCALE, getCardDensity, getCardTextScale } from '../utils/cardDensity';
import { useCardContentFit } from './useCardContentFit';

interface GameCardProps {
  card: CardItem;
  size?: 'sm' | 'md' | 'lg';
  showContent?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (cardId: string) => void;
  onClick?: () => void;
  className?: string;
}

const CORNER_SYMBOLS = ['♠', '♥', '♦', '♣'];

const GameCardInner: React.FC<GameCardProps> = ({
  card,
  size = 'md',
  showContent = true,
  isFavorited = false,
  onToggleFavorite,
  onClick,
  className = '',
}) => {
  const levelInfo = LEVEL_INFO[card.level];
  const iconName = card.icon || autoAssignIcon(card.content);
  const IconComponent = getCardIcon(iconName);
  const deck = getCardDeck(card);
  const isPosition = deck === 'position';
  const isRarePosition = isPosition && card.position?.rarity === 'mythic';
  const audienceLabel = card.position
    ? ({ male: 'Nam nhận', female: 'Nữ nhận', both: 'Cả hai' } as const)[card.position.recipient]
    : ({
        male: 'Nam',
        female: 'Nữ',
        both: 'Cả hai',
        current: 'Người đang lượt',
        opponent: 'Đối phương',
      } as const)[getCardAudience(card)];
  const familyLabel = card.position
    ? card.position.family === 'other'
      ? (card.position.customLabel?.trim() || 'Tư thế khác')
      : ({ oral: 'Oral', blowjob: 'Blow', handjob: 'Hand', have_sex: 'Have Sex' } as const)[card.position.family]
    : null;

  // Card level class
  const levelClass = isRarePosition ? 'card-position-rare' : isPosition ? 'card-position' : `card-${card.level}`;
  const isIntimateOrPassionate = !isPosition && (card.level === 'intimate' || card.level === 'passionate');

  // Size-dependent styles. Every size keeps the same 11:15 card ratio, so cards
  // in a grid row are identical and the detail view matches the game table.
  const sizeStyles = {
    sm: {
      container: 'p-3',
      iconWrapper: 'card-icon-wrapper-sm',
      content: 'leading-snug',
      badge: 'px-1.5 py-0.5 sm:px-2',
      contentPixels: 13,
      badgePixels: 12,
      clamp: 'card-grid-text',
      hintClamp: 'hidden sm:line-clamp-1',
    },
    md: {
      container: 'p-4',
      iconWrapper: 'card-icon-wrapper',
      content: 'leading-relaxed',
      badge: 'px-2 py-0.5',
      contentPixels: 14,
      badgePixels: 12,
      clamp: 'line-clamp-6',
      hintClamp: 'line-clamp-2',
    },
    lg: {
      container: 'p-6 sm:p-7',
      iconWrapper: 'card-icon-wrapper-lg',
      content: 'leading-relaxed',
      badge: 'px-3 py-1',
      contentPixels: 16,
      badgePixels: 12,
      clamp: '',
      hintClamp: '',
    },
  };

  const s = sizeStyles[size];
  // The large detail view shrinks the icon so the whole text fits; grid cards
  // clamp the text and cap the icon in CSS (see .card-fit-static).
  const { ref: contentRef, hasMoreBelow } = useCardContentFit<HTMLDivElement>(
    `${card.id}|${size}|${showContent}`,
    { enabled: size === 'lg' },
  );
  const density = getCardDensity(card);
  const iconScale = Math.min(1.8, Math.max(0.5, card.appearance?.iconScale ?? 1));
  const textScale = Math.min(1.5, Math.max(0.75, card.appearance?.textScale ?? 1));
  const iconTextGap = Math.min(48, Math.max(0, card.appearance?.iconTextGap ?? 8));
  // CSS sizes the icon box from --icon-scale (see .card-icon-wrapper in index.css),
  // so the preview matches the game table exactly and the icon never covers text.
  const iconWrapperStyle = {
    '--icon-scale': iconScale * CARD_DENSITY_ICON_SCALE[density],
    marginBottom: `${density === 'dense' ? Math.min(iconTextGap, 6) : iconTextGap}px`,
  } as React.CSSProperties;
  // Small text never goes under 12px, whatever scale the card was given.
  // Sizes are written in rem, so they grow with the page on very large windows.
  const smallFontSize = `${Math.max(12, s.badgePixels * textScale) / 16}rem`;
  const contentFontSize = size === 'lg'
    ? `max(0.875rem, calc(${(s.contentPixels * textScale * getCardTextScale(card) / 16).toFixed(4)}rem * var(--text-shrink, 1)))`
    : size === 'sm'
      // Follows the width of the grid card (container: .card-fit-static).
      ? `max(0.75rem, calc(clamp(0.8125rem, 6cqw, 1rem) * ${textScale}))`
      : `${Math.max(12, s.contentPixels * textScale) / 16}rem`;

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Mở lá bài: ${card.content}` : undefined}
      className={`game-card ${levelClass} ${isIntimateOrPassionate ? 'card-wave-pattern' : ''} card-ratio flex flex-col ${s.container} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Corner decorations for intimate/passionate */}
      {isIntimateOrPassionate && (
        <>
          <span className="card-corner-deco top-2 left-2.5">{CORNER_SYMBOLS[0]} {CORNER_SYMBOLS[1]}</span>
          <span className="card-corner-deco top-2 right-2.5">{CORNER_SYMBOLS[2]} {CORNER_SYMBOLS[3]}</span>
          <span className="card-corner-deco bottom-2 left-2.5">{CORNER_SYMBOLS[1]} {CORNER_SYMBOLS[0]}</span>
          <span className="card-corner-deco bottom-2 right-2.5">{CORNER_SYMBOLS[3]} {CORNER_SYMBOLS[2]}</span>
        </>
      )}

      {/* Card content layer */}
      <div className="card-content-layer flex min-h-0 flex-1 flex-col">
        {/* Top: Type & Level badges */}
        <div className={`flex shrink-0 items-center justify-between ${size === 'sm' ? 'mb-2 sm:mb-3' : 'mb-3'}`}>
          <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
            {isPosition ? (
              <span style={{ fontSize: smallFontSize }} className={`${s.badge} rounded-full border border-[#e2c275]/45 bg-[#e2c275]/10 font-bold text-[#f7e7b0]`}>
                ✦ {familyLabel}
              </span>
            ) : (
              <>
            <span
              style={{ fontSize: smallFontSize }}
              className={`${s.badge} rounded-full font-semibold border ${
                card.type === 'truth'
                  ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}
            >
              {card.type === 'truth' ? 'Sự thật' : 'Thử thách'}
            </span>
            <span style={{ fontSize: smallFontSize }} className={`${s.badge} rounded-full border ${levelInfo.badgeBg}`}>
              {levelInfo.icon}
              {/* Two columns on a phone have no room for the name; the colour and icon stay. */}
              <span className={size === 'sm' ? 'sr-only sm:not-sr-only' : ''}> {levelInfo.name}</span>
            </span>
              </>
            )}
          </div>

          {/* Favorite button */}
          {onToggleFavorite && (
            <button
              type="button"
              aria-label={isFavorited ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(card.id);
              }}
              className={`-my-2.5 -mr-2.5 flex h-11 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${size === 'sm' ? 'w-10 sm:w-11' : 'w-11'}`}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isFavorited
                    ? 'text-rose-500 fill-rose-500'
                    : 'text-neutral-300 hover:text-rose-300'
                }`}
              />
            </button>
          )}
        </div>

        {/* Center: Icon (custom image or SVG). Small cards clamp the text so every
            card in a grid row has the same size; the large detail view scrolls. */}
        <div
          ref={contentRef}
          data-more={size === 'lg' && hasMoreBelow ? 'true' : undefined}
          className={`flex min-h-0 flex-1 flex-col ${size === 'lg' ? 'card-fit-area card-scroll-area overflow-y-auto overscroll-contain' : 'card-fit-static overflow-hidden'}`}
        >
          <div className={`my-auto flex flex-col items-center ${size === 'lg' ? '' : 'max-h-full min-h-0'}`}>
          {card.customImage ? (
            <div data-card-icon style={iconWrapperStyle} className={`${s.iconWrapper} card-custom-icon-wrapper ${isRarePosition ? 'mythic-icon-aura' : ''}`}>
              <img
                src={card.customImage}
                alt=""
                className="card-custom-icon w-full h-full object-contain"
              />
            </div>
          ) : IconComponent ? (
            <div data-card-icon style={iconWrapperStyle} className={`${s.iconWrapper} card-icon-color ${isRarePosition ? 'mythic-icon-aura' : ''}`}>
              <IconComponent className="w-full h-full" />
            </div>
          ) : null}

          {/* Content text */}
          {showContent && (
            <p style={{ fontSize: contentFontSize }} className={`${s.content} ${s.clamp} ${size === 'lg' && density === 'dense' ? '!leading-normal' : ''} mx-auto max-w-[96%] shrink-0 text-balance text-center font-medium text-white`}>
              {card.content}
            </p>
          )}

          {/* Hint */}
          {showContent && card.hint && (
            <p style={{ fontSize: smallFontSize }} className={`${s.hintClamp} mt-2 shrink-0 px-1 text-center italic text-rose-200`}>
              Gợi ý: {card.hint}
            </p>
          )}
          </div>
        </div>

        {/* Bottom: Optional timer */}
        <div className="mt-auto shrink-0 pt-2">
          <div style={{ fontSize: smallFontSize }} className="flex flex-wrap items-center justify-center gap-1 text-neutral-200 sm:gap-1.5">
            <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-1.5 py-0.5 font-semibold text-amber-200 sm:px-2">
              {isPosition ? derivePositionDifficultyStars(card) : deriveDifficultyStars(card)}★
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-1.5 py-0.5 sm:px-2">
              {audienceLabel}
            </span>
            {card.timerSeconds && showContent && (
              <span className="whitespace-nowrap text-amber-200">⏱ {card.timerSeconds}s</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const GameCard = React.memo(GameCardInner);
GameCard.displayName = 'GameCard';

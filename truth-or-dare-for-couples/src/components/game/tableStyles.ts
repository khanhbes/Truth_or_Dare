import type { CardItem } from '../../types';

export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#140d11]';

/** The one main action of the moment. */
export const BUTTON_PRIMARY = `btn-shine flex min-h-12 min-w-0 flex-[1.25] items-center justify-center gap-2 rounded-full bg-gold-gradient px-3 text-[15px] leading-tight font-bold sm:flex-1 sm:px-5 sm:text-base text-neutral-950 shadow-[0_0_22px_rgba(212,175,55,.34)] hover:shadow-[0_0_28px_rgba(255,107,157,.42)] ${FOCUS_RING}`;
/** The same, in the champagne of the Position deck. */
export const BUTTON_PRIMARY_LUXURY = `btn-shine flex min-h-12 min-w-0 flex-[1.25] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f7e7b0,#cda95c)] px-3 text-[15px] leading-tight font-bold sm:flex-1 sm:px-5 sm:text-base text-[#08101f] shadow-[0_0_22px_rgba(226,194,117,.26)] ${FOCUS_RING}`;
export const BUTTON_SECONDARY = `flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-[#1b1216] px-3 text-sm leading-tight font-semibold sm:px-4 text-neutral-100 transition-colors hover:border-white/40 hover:bg-[#261a20] ${FOCUS_RING}`;
/** Secondary options under the main choice: a quiet link, never a full-width bar. */
export const BUTTON_QUIET = `flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full border border-white/12 px-3.5 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING}`;

/**
 * A length drawn for the 480px-high card, scaled to the real card
 * (the card face is a size container, see game-table.css).
 */
export const cardUnit = (px: number, minPx = 0): string =>
  minPx > 0 ? `max(${minPx}px, calc(${px.toFixed(2)} * 100cqh / 480))` : `calc(${px.toFixed(2)} * 100cqh / 480)`;

/** "45s" up to a minute, "1:30" from there on. */
export const formatSeconds = (seconds: number): string =>
  seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export const POSITION_RECIPIENT_LABELS = { male: 'Lượt Nam', female: 'Lượt Nữ', both: 'Cả hai lượt' } as const;

const POSITION_FAMILY_LABELS = {
  oral: 'Oral cùng nhau',
  blowjob: 'Oral',
  handjob: 'Hand',
  have_sex: 'Have Sex',
  other: 'Tư thế khác',
} as const;

export const getPositionFamilyLabel = (card: CardItem): string =>
  card.position?.family === 'other'
    ? card.position.customLabel?.trim() || POSITION_FAMILY_LABELS.other
    : card.position
      ? POSITION_FAMILY_LABELS[card.position.family]
      : '';

export const finalCardTitle = (card: CardItem): string => {
  const hint = card.hint?.split('·')[0]?.trim();
  if (hint) return hint;
  return card.content.length > 70 ? `${card.content.slice(0, 67).trim()}…` : card.content;
};

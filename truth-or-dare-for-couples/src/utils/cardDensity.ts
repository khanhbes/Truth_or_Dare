import type { CardItem } from '../types';

/**
 * Every card is shown in one fixed frame (see `.table-slot` / `.card-ratio`).
 * Instead of stretching the frame for long texts — Position and Have Sex cards
 * reach ~360 characters — the layout gets denser: slightly smaller text and a
 * smaller illustration.
 */
export type CardDensity = 'normal' | 'compact' | 'dense';

const textLength = (card: Pick<CardItem, 'content' | 'hint'>): number =>
  card.content.length + (card.hint?.length ?? 0);

/** Share of the normal illustration size. */
export const CARD_DENSITY_ICON_SCALE: Readonly<Record<CardDensity, number>> = {
  normal: 1,
  compact: 0.8,
  dense: 0.6,
};

export const getCardDensity = (card: Pick<CardItem, 'content' | 'hint'>): CardDensity => {
  const length = textLength(card);
  if (length > 260) return 'dense';
  if (length > 150) return 'compact';
  return 'normal';
};

/**
 * Text size of a card, as a share of 16px on the 480px-high card. Short texts
 * are set larger, so two people can read one screen from a distance.
 */
export const getCardTextScale = (card: Pick<CardItem, 'content' | 'hint'>): number => {
  const length = textLength(card);
  if (length > 260) return 0.875;
  if (length > 150) return 1;
  if (length > 70) return 1.125;
  return 1.25;
};

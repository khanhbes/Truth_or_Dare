import type { CardItem } from '../types';

/**
 * Card text marker for a frame that is waiting for its real content.
 * A frame already carries its deck, type, level, stars, turn audience and
 * clothing metadata; it reaches players only after the admin replaces the
 * text (the marker disappears) in the Admin collection.
 */
export const CARD_FRAME_PREFIX = '[KHUNG]';

export const isCardFrame = (card: Pick<CardItem, 'content'>): boolean =>
  typeof card.content === 'string' && card.content.trim().startsWith(CARD_FRAME_PREFIX);

export const withoutCardFrames = <T extends Pick<CardItem, 'content'>>(cards: readonly T[]): T[] =>
  cards.filter((card) => !isCardFrame(card));

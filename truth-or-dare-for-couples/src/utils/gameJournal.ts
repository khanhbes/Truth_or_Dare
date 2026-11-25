import type { CardItem, CardResolutionEvent, ClothingRemovalEvent, GameEndReason, PlayerIndex } from '../types';
import { deriveDifficultyStars, derivePositionDifficultyStars, getCardDeck } from './progression';

/**
 * The couple's journal: what they kept from each game (favourite moment, a note for the
 * other). It stays on this device, is never sent to the server, and every entry can be
 * deleted. Accounts that share a device only see their own entries.
 */
export const JOURNAL_KEY = 'tod_couples_journal';
export const JOURNAL_VERSION = 1;
export const JOURNAL_MAX_ENTRIES = 60;
export const JOURNAL_NOTE_MAX = 240;
export const JOURNAL_MOMENT_MAX = 140;
/** Longer than this was not one evening: the game was left open or continued another day. */
const MAX_GAME_MINUTES = 240;

export interface JournalPlayer {
  name: string;
  avatar: string;
}

export interface JournalEntry {
  id: string;
  /** Couple account that played; null for guests. */
  owner: string | null;
  finishedAt: number;
  minutes: number | null;
  endReason: GameEndReason;
  players: [JournalPlayer, JournalPlayer];
  intimacyPercent: number;
  luxuryPercent: number;
  cardsCompleted: number;
  garmentsRemoved: number;
  positionsCompleted: number;
  /** Favourite moment of each player. */
  moments: [string | null, string | null];
  /** What each player wrote for the other. */
  notes: [string, string];
}

/** A card of this game that may be somebody's favourite moment. */
export interface GameHighlight {
  id: string;
  round: number;
  kind: 'truth' | 'dare' | 'clothing' | 'position' | 'final';
  playerIndex: PlayerIndex;
  text: string;
}

type JournalStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const clip = (text: string, max: number): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
};

/**
 * The cards worth remembering, in the order they were played: the last card, the hottest
 * positions, the first and last garment, and the boldest Dares and Truths.
 */
export const pickHighlights = (
  cards: readonly CardItem[],
  resolutions: readonly CardResolutionEvent[],
  removals: readonly ClothingRemovalEvent[],
  limit = 9,
): GameHighlight[] => {
  const byId = new Map(cards.map((card) => [card.id, card] as const));
  const clothingCards = new Set(removals.map((event) => event.cardId).filter(Boolean));
  const played = resolutions
    .filter((event) => event.status === 'completed' || event.status === 'final_viewed')
    .flatMap((event) => {
      const card = byId.get(event.cardId);
      if (!card) return [];
      const position = getCardDeck(card) === 'position';
      const kind: GameHighlight['kind'] = card.position?.family === 'have_sex'
        ? 'final'
        : position ? 'position' : clothingCards.has(card.id) ? 'clothing' : card.type;
      const stars: number = position ? derivePositionDifficultyStars(card) : deriveDifficultyStars(card);
      return [{
        stars,
        highlight: {
          id: event.id,
          round: event.round,
          kind,
          playerIndex: event.playerIndex,
          text: clip(card.content, JOURNAL_MOMENT_MAX),
        } satisfies GameHighlight,
      }];
    });
  const best = (kind: GameHighlight['kind'], count: number) => played
    .filter((item) => item.highlight.kind === kind)
    .sort((a, b) => b.stars - a.stars || b.highlight.round - a.highlight.round)
    .slice(0, count);
  const clothing = played.filter((item) => item.highlight.kind === 'clothing');
  const chosen = new Set([
    ...best('final', 1),
    ...best('position', 3),
    ...clothing.slice(0, 1),
    ...clothing.slice(-1),
    ...best('dare', 2),
    ...best('truth', 2),
  ].map((item) => item.highlight.id));
  return played
    .map((item) => item.highlight)
    .filter((highlight) => chosen.has(highlight.id))
    .slice(-limit);
};

/** Whole minutes of play, or null when the game clearly was not one evening. */
export const getGameMinutes = (startedAt: number | null, finishedAt: number): number | null => {
  if (startedAt === null || !Number.isFinite(startedAt) || finishedAt < startedAt) return null;
  const minutes = Math.round((finishedAt - startedAt) / 60_000);
  return minutes >= 1 && minutes <= MAX_GAME_MINUTES ? minutes : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown, max: number): string => typeof value === 'string' ? clip(value, max) : '';

/** Line breaks are part of a note. */
const note = (value: unknown): string => typeof value === 'string' ? value.trim().slice(0, JOURNAL_NOTE_MAX) : '';

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

const END_REASONS: readonly GameEndReason[] = ['have_sex', 'pink_complete', 'no_cards', 'manual'];

const hydrateEntry = (value: unknown): JournalEntry | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.finishedAt !== 'number') return null;
  const players = Array.isArray(value.players) ? value.players : [];
  const moments = Array.isArray(value.moments) ? value.moments : [];
  const notes = Array.isArray(value.notes) ? value.notes : [];
  const player = (index: number): JournalPlayer => {
    const saved = isRecord(players[index]) ? players[index] : {};
    return { name: text(saved.name, 40) || (index === 0 ? 'Anh' : 'Em'), avatar: text(saved.avatar, 16) };
  };
  return {
    id: value.id,
    owner: typeof value.owner === 'string' && value.owner ? value.owner : null,
    finishedAt: value.finishedAt,
    minutes: typeof value.minutes === 'number' && value.minutes > 0 ? Math.round(value.minutes) : null,
    endReason: END_REASONS.includes(value.endReason as GameEndReason) ? value.endReason as GameEndReason : 'manual',
    players: [player(0), player(1)],
    intimacyPercent: Math.min(100, count(value.intimacyPercent)),
    luxuryPercent: Math.min(100, count(value.luxuryPercent)),
    cardsCompleted: count(value.cardsCompleted),
    garmentsRemoved: count(value.garmentsRemoved),
    positionsCompleted: count(value.positionsCompleted),
    moments: [text(moments[0], JOURNAL_MOMENT_MAX) || null, text(moments[1], JOURNAL_MOMENT_MAX) || null],
    notes: [note(notes[0]), note(notes[1])],
  };
};

export const hydrateJournal = (value: unknown): JournalEntry[] => {
  if (!isRecord(value) || value.version !== JOURNAL_VERSION || !Array.isArray(value.entries)) return [];
  return value.entries
    .map(hydrateEntry)
    .filter((entry): entry is JournalEntry => entry !== null)
    .sort((a, b) => b.finishedAt - a.finishedAt);
};

const deviceStorage = (): JournalStorage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readAll = (storage: JournalStorage | null): JournalEntry[] => {
  try {
    const saved = storage?.getItem(JOURNAL_KEY);
    return saved ? hydrateJournal(JSON.parse(saved)) : [];
  } catch {
    return [];
  }
};

const writeAll = (entries: readonly JournalEntry[], storage: JournalStorage | null): boolean => {
  if (!storage) return false;
  try {
    if (entries.length === 0) storage.removeItem(JOURNAL_KEY);
    else storage.setItem(JOURNAL_KEY, JSON.stringify({ version: JOURNAL_VERSION, entries }));
    return true;
  } catch {
    return false;
  }
};

/** Entries of the couple that is signed in now (or of guests), newest first. */
export const loadJournal = (owner: string | null, storage: JournalStorage | null = deviceStorage()): JournalEntry[] =>
  readAll(storage).filter((entry) => entry.owner === owner);

/** Adds an entry; the oldest of the same owner go when there are too many. False when nothing could be stored. */
export const addJournalEntry = (entry: JournalEntry, storage: JournalStorage | null = deviceStorage()): boolean => {
  const clean = hydrateEntry(entry);
  if (!clean) return false;
  const others = readAll(storage).filter((item) => item.id !== clean.id);
  const mine = [clean, ...others.filter((item) => item.owner === clean.owner)].slice(0, JOURNAL_MAX_ENTRIES);
  return writeAll([...mine, ...others.filter((item) => item.owner !== clean.owner)], storage);
};

export const deleteJournalEntry = (id: string, storage: JournalStorage | null = deviceStorage()): boolean =>
  writeAll(readAll(storage).filter((entry) => entry.id !== id), storage);

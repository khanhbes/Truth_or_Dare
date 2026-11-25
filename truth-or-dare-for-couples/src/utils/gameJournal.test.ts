import assert from 'node:assert/strict';
import test from 'node:test';
import type { CardItem, CardResolutionEvent, ClothingRemovalEvent } from '../types';
import {
  JOURNAL_KEY,
  JOURNAL_MAX_ENTRIES,
  JOURNAL_MOMENT_MAX,
  JOURNAL_NOTE_MAX,
  addJournalEntry,
  deleteJournalEntry,
  getGameMinutes,
  loadJournal,
  pickHighlights,
  type JournalEntry,
} from './gameJournal';

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
};

const entry = (id: string, owner: string | null, finishedAt: number): JournalEntry => ({
  id,
  owner,
  finishedAt,
  minutes: 62,
  endReason: 'have_sex',
  players: [{ name: 'Anh', avatar: '🐻' }, { name: 'Em', avatar: '🐰' }],
  intimacyPercent: 100,
  luxuryPercent: 100,
  cardsCompleted: 30,
  garmentsRemoved: 7,
  positionsCompleted: 9,
  moments: ['Lá đầu tiên', null],
  notes: ['Cảm ơn em\nvì tối nay', ''],
});

test('entries are kept per couple, newest first, and can be deleted', () => {
  const storage = memoryStorage();
  assert.equal(addJournalEntry(entry('a', null, 100), storage), true);
  assert.equal(addJournalEntry(entry('b', 'doi-minh', 200), storage), true);
  assert.equal(addJournalEntry(entry('c', null, 300), storage), true);
  assert.deepEqual(loadJournal(null, storage).map((item) => item.id), ['c', 'a']);
  assert.deepEqual(loadJournal('doi-minh', storage).map((item) => item.id), ['b']);
  assert.deepEqual(loadJournal('nguoi-khac', storage), []);
  assert.equal(loadJournal(null, storage)[1].notes[0], 'Cảm ơn em\nvì tối nay');

  assert.equal(deleteJournalEntry('a', storage), true);
  assert.deepEqual(loadJournal(null, storage).map((item) => item.id), ['c']);
  deleteJournalEntry('b', storage);
  deleteJournalEntry('c', storage);
  assert.equal(storage.data.has(JOURNAL_KEY), false);
});

test('the oldest entries of the same couple leave first', () => {
  const storage = memoryStorage();
  addJournalEntry(entry('other', 'doi-minh', 1), storage);
  for (let index = 0; index < JOURNAL_MAX_ENTRIES + 3; index += 1) {
    addJournalEntry(entry(`game-${index}`, null, 1000 + index), storage);
  }
  const mine = loadJournal(null, storage);
  assert.equal(mine.length, JOURNAL_MAX_ENTRIES);
  assert.equal(mine[0].id, `game-${JOURNAL_MAX_ENTRIES + 2}`);
  assert.equal(loadJournal('doi-minh', storage).length, 1);
});

test('long notes are cut and damaged data never breaks the journal', () => {
  const storage = memoryStorage();
  addJournalEntry({ ...entry('long', null, 5), notes: ['x'.repeat(900), ''], moments: ['y'.repeat(900), null] }, storage);
  const [saved] = loadJournal(null, storage);
  assert.equal(saved.notes[0].length, JOURNAL_NOTE_MAX);
  assert.ok(saved.moments[0]!.length <= JOURNAL_MOMENT_MAX);

  for (const broken of ['', '{', '[]', '{"version":9,"entries":[]}', '{"version":1,"entries":[{"id":4},null,"x"]}']) {
    assert.deepEqual(loadJournal(null, memoryStorage({ [JOURNAL_KEY]: broken })), []);
  }
  assert.deepEqual(loadJournal(null, null), []);
  assert.equal(addJournalEntry(entry('a', null, 1), null), false);
  const full = { ...memoryStorage(), setItem: () => { throw new Error('quota'); } };
  assert.equal(addJournalEntry(entry('a', null, 1), full), false);
});

test('minutes are only shown for one evening of play', () => {
  assert.equal(getGameMinutes(0, 62 * 60_000), 62);
  assert.equal(getGameMinutes(null, 10), null);
  assert.equal(getGameMinutes(10, 5), null);
  assert.equal(getGameMinutes(0, 20_000), null);
  assert.equal(getGameMinutes(0, 9 * 60 * 60_000), null);
});

const card = (id: string, extra: Partial<CardItem>): CardItem => ({
  id, type: 'dare', level: 'gentle', content: `Nội dung ${id}`, deck: 'standard', ...extra,
});

test('highlights cover the last card, positions, garments and the boldest cards, in playing order', () => {
  const cards: CardItem[] = [
    ...[1, 2, 3, 4, 5].map((star) => card(`truth-${star}`, { type: 'truth', progression: { difficultyStars: star as 1 | 2 | 3 | 4 | 5 } })),
    ...[1, 2, 3, 4, 5].map((star) => card(`dare-${star}`, { progression: { difficultyStars: star as 1 | 2 | 3 | 4 | 5 } })),
    card('strip-1', {}), card('strip-2', {}), card('strip-3', {}),
    ...[6, 7, 8, 9].map((star) => card(`pos-${star}`, {
      deck: 'position',
      position: { family: 'oral', recipient: 'both', orderGroup: 1, rarity: 'luxury', difficultyStars: star as 6 | 7 | 8 | 9 },
    })),
    card('last', { deck: 'position', position: { family: 'have_sex', recipient: 'both', orderGroup: 4, rarity: 'mythic', difficultyStars: 10 } }),
  ];
  const resolutions: CardResolutionEvent[] = cards.map((item, index) => ({
    id: `event-${index}`,
    cardId: item.id,
    playerIndex: index % 2 === 0 ? 0 : 1,
    status: item.id === 'last' ? 'final_viewed' : item.id === 'dare-5' ? 'skipped' : 'completed',
    deck: item.deck ?? 'standard',
    round: index + 1,
    timestamp: index,
  }));
  const removals = ['strip-1', 'strip-2', 'strip-3'].map((cardId) => ({ cardId }) as ClothingRemovalEvent);
  const highlights = pickHighlights(cards, resolutions, removals, 20);
  const texts = highlights.map((item) => item.text.replace('Nội dung ', ''));
  assert.deepEqual(texts, ['truth-4', 'truth-5', 'dare-3', 'dare-4', 'strip-1', 'strip-3', 'pos-7', 'pos-8', 'pos-9', 'last']);
  assert.ok(!texts.includes('dare-5'), 'a skipped card is nobody\'s favourite moment');
  assert.equal(highlights.at(-1)?.kind, 'final');
  assert.equal(pickHighlights(cards, resolutions, removals, 4).length, 4);
  assert.deepEqual(pickHighlights(cards, [], []), []);
});

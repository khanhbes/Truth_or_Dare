import test from 'node:test';
import assert from 'node:assert/strict';

import { INITIAL_CARDS } from '../data/cards';
import { createCardDirectorState, recordDirectedCard } from './cardDirector';
import { createClothingJourney } from './clothingJourney';
import { createDynamicClothingSchedule } from './dynamicClothingScheduler';
import {
  GAME_SESSION_KEY,
  GAME_SESSION_MAX_AGE_MS,
  belongsToCurrentPlayer,
  clearGameSession,
  hydrateGameSession,
  loadGameSession,
  saveGameSession,
  serializeGameSession,
  type GameSessionState,
} from './gameSession';
import { DEFAULT_PLAYER_1, DEFAULT_PLAYER_2 } from './playerStorage';
import {
  DEFAULT_GAME_SETTINGS,
  DEFAULT_OUTFITS,
  createOutfitState,
  getOutfitStage,
  getPresentGarmentSlots,
  removeGarment,
} from './wardrobe';

const NOW = 1_800_000_000_000;

const makeSession = (): GameSessionState => {
  const outfitStates = [
    removeGarment(createOutfitState(DEFAULT_OUTFITS[0], 0), 'shirt'),
    createOutfitState(DEFAULT_OUTFITS[1], 1),
  ] as GameSessionState['outfitStates'];
  const card = { ...INITIAL_CARDS[0], customImage: 'data:image/png;base64,AAAA' };
  return {
    owner: null,
    player1: { ...DEFAULT_PLAYER_1, name: 'Minh', completedCount: 4 },
    player2: { ...DEFAULT_PLAYER_2, name: 'Lan', skippedCount: 1 },
    settings: { ...DEFAULT_GAME_SETTINGS, drawMode: 'choose' },
    currentPlayerIndex: 1,
    currentRound: 9,
    outfitStates,
    clothingRemovalEvents: [],
    intimacyPercent: 42,
    luxuryIntimacyPercent: 0,
    intimacyEvents: [],
    journeyPhase: 'standard',
    sessionPositionCardIds: [],
    positionSessionStats: { drawn: 0, opened: 0, completed: 0, skipped: 0 },
    cardResolutionEvents: [],
    playerRewards: [
      { starBalance: 6, totalStarsEarned: 14, rerollsUsed: 1, difficultyBoostsUsed: 0 },
      { starBalance: 11, totalStarsEarned: 11, rerollsUsed: 0, difficultyBoostsUsed: 0 },
    ],
    pendingDifficultyBoosts: [{ ownerPlayerIndex: 1, targetPlayerIndex: 0, queuedRound: 8 }],
    rewardEvents: [],
    startedAt: NOW - 40 * 60_000,
    table: {
      usedCardIds: ['a', 'b'],
      clothingJourney: createClothingJourney(),
      clothingScheduler: createDynamicClothingSchedule(outfitStates, () => 0.4),
      waitedClothingTriggerId: 'strip-1',
      cardDirector: recordDirectedCard(createCardDirectorState(['a']), card),
      activeCard: card,
      activeCardWasRerolled: true,
      clothingTrigger: { itemId: 'strip-1-0-5', targetIndex: 0 },
      finalChoice: null,
      events: { plan: ['swap', 'double', 'match'], done: 1, doubleNext: true, askedIds: ['m25-first'] },
      lighterUsed: [true, false],
      pair: null,
    },
  };
};

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
};

test('a saved game comes back exactly: turn, hearts, stars, clothes and card', () => {
  const session = makeSession();
  const restored = hydrateGameSession(JSON.parse(serializeGameSession(session, NOW)), NOW + 60_000);
  assert.ok(restored);
  assert.equal(restored.currentPlayerIndex, 1);
  assert.equal(restored.currentRound, 9);
  assert.equal(restored.intimacyPercent, 42);
  assert.equal(restored.player1.name, 'Minh');
  assert.equal(restored.player2.skippedCount, 1);
  assert.equal(restored.settings.drawMode, 'choose');
  assert.deepEqual(restored.playerRewards, session.playerRewards);
  assert.deepEqual(restored.pendingDifficultyBoosts, session.pendingDifficultyBoosts);
  assert.deepEqual(getPresentGarmentSlots(restored.outfitStates[0]), getPresentGarmentSlots(session.outfitStates[0]));
  assert.equal(getOutfitStage(restored.outfitStates[1]), 'dressed');
  assert.deepEqual(restored.table.clothingScheduler, session.table.clothingScheduler);
  assert.deepEqual(restored.table.clothingJourney, session.table.clothingJourney);
  assert.deepEqual(restored.table.cardDirector, session.table.cardDirector);
  assert.equal(restored.table.activeCard?.id, INITIAL_CARDS[0].id);
  assert.equal(restored.table.activeCardWasRerolled, true);
  assert.deepEqual(restored.table.clothingTrigger, { itemId: 'strip-1-0-5', targetIndex: 0 });
  assert.deepEqual(restored.table.events, session.table.events);
  assert.deepEqual(restored.table.lighterUsed, [true, false]);
  assert.equal(restored.startedAt, session.startedAt);
});

test('two cards that wait for a choice survive a refresh, unless a card is already on the table', () => {
  const session = makeSession();
  const [first, second] = INITIAL_CARDS.filter((card) => card.deck === 'position');
  const pair: NonNullable<GameSessionState['table']['pair']> = {
    source: 'stars',
    options: [
      { card: { ...first, customImage: 'data:image/png;base64,AAAA' }, used: ['x', first.id] },
      { card: second, used: ['x', second.id] },
    ],
  };
  const text = serializeGameSession({ ...session, table: { ...session.table, activeCard: null, pair } }, NOW);
  assert.doesNotMatch(text, /base64/);
  const restored = hydrateGameSession(JSON.parse(text), NOW);
  assert.equal(restored?.table.pair?.source, 'stars');
  assert.deepEqual(restored?.table.pair?.options.map((option) => option.card.id), [first.id, second.id]);
  assert.deepEqual(restored?.table.pair?.options[1].used, ['x', second.id]);

  const withCard = hydrateGameSession(JSON.parse(serializeGameSession({ ...session, table: { ...session.table, pair } }, NOW)), NOW);
  assert.equal(withCard?.table.pair, null);
  const broken = JSON.parse(text);
  broken.table.pair.options = [broken.table.pair.options[0]];
  assert.equal(hydrateGameSession(broken, NOW)?.table.pair, null);
});

test('a game saved before event turns existed goes on without the milestones it has passed', () => {
  const old = JSON.parse(serializeGameSession(makeSession(), NOW));
  delete old.startedAt;
  delete old.table.events;
  delete old.table.lighterUsed;
  delete old.table.pair;
  const restored = hydrateGameSession(old, NOW);
  assert.equal(restored?.startedAt, null);
  assert.equal(restored?.table.events.done, 1);
  assert.equal(restored?.table.events.doubleNext, false);
  assert.deepEqual(restored?.table.lighterUsed, [false, false]);
  assert.equal(restored?.table.pair, null);
  // A start after the save makes no sense.
  assert.equal(hydrateGameSession({ ...old, startedAt: NOW + 5 }, NOW)?.startedAt, null);
});

test('card illustrations are not written to storage', () => {
  assert.doesNotMatch(serializeGameSession(makeSession(), NOW), /base64/);
});

test('an old, future, foreign or damaged save is ignored', () => {
  const good = JSON.parse(serializeGameSession(makeSession(), NOW));
  assert.equal(hydrateGameSession(good, NOW + GAME_SESSION_MAX_AGE_MS + 1), null);
  assert.equal(hydrateGameSession(good, NOW - 3_600_000), null);
  assert.equal(hydrateGameSession({ ...good, version: 99 }, NOW), null);
  assert.equal(hydrateGameSession({ ...good, currentPlayerIndex: 4 }, NOW), null);
  assert.equal(hydrateGameSession({ ...good, outfitStates: [] }, NOW), null);
  assert.equal(hydrateGameSession({ ...good, journeyPhase: 'other' }, NOW), null);
  assert.equal(hydrateGameSession({ ...good, table: null }, NOW), null);
  for (const value of [null, 'text', 7, [], {}]) assert.equal(hydrateGameSession(value, NOW), null);
});

test('damaged details fall back to safe values instead of breaking the game', () => {
  const good = JSON.parse(serializeGameSession(makeSession(), NOW));
  const restored = hydrateGameSession({
    ...good,
    intimacyPercent: 900,
    currentRound: -3,
    playerRewards: 'nope',
    outfitStates: [{ equippedGarments: [{ slot: 'cape' }] }, null],
    table: { ...good.table, clothingScheduler: { items: 'x' }, clothingJourney: 1, cardDirector: null, activeCard: { id: '' } },
  }, NOW);
  assert.ok(restored);
  assert.equal(restored.intimacyPercent, 100);
  assert.equal(restored.currentRound, 1);
  assert.equal(restored.playerRewards[0].starBalance, 0);
  assert.equal(getPresentGarmentSlots(restored.outfitStates[0]).length, 0);
  assert.equal(getPresentGarmentSlots(restored.outfitStates[1]).length, 4);
  assert.ok(Array.isArray(restored.table.clothingScheduler.items));
  assert.equal(restored.table.clothingJourney.opportunities.length, createClothingJourney().opportunities.length);
  assert.equal(restored.table.activeCard, null);
  assert.equal(restored.table.clothingTrigger, null);
});

test('the final phase needs its cards, otherwise it returns to the position deck', () => {
  const session = makeSession();
  const good = JSON.parse(serializeGameSession({
    ...session,
    journeyPhase: 'final',
    table: { ...session.table, activeCard: null },
  }, NOW));
  assert.equal(hydrateGameSession(good, NOW)?.journeyPhase, 'position');
  const candidates = INITIAL_CARDS.slice(0, 3);
  const withChoice = hydrateGameSession({
    ...good,
    table: { ...good.table, finalChoice: { candidates, flips: 2, revealedIds: [candidates[1].id, 'unknown'] } },
  }, NOW);
  assert.equal(withChoice?.journeyPhase, 'final');
  assert.deepEqual(withChoice?.table.finalChoice?.revealedIds, [candidates[1].id]);
  assert.equal(withChoice?.table.finalChoice?.flips, 2);
});

test('storage helpers survive blocked or broken storage', () => {
  const storage = memoryStorage();
  assert.equal(loadGameSession(storage, NOW), null);
  assert.equal(saveGameSession(makeSession(), storage, NOW), true);
  assert.equal(loadGameSession(storage, NOW + 1000)?.currentRound, 9);
  storage.setItem(GAME_SESSION_KEY, '{broken');
  assert.equal(loadGameSession(storage, NOW), null);
  clearGameSession(storage);
  assert.equal(storage.getItem(GAME_SESSION_KEY), null);
  assert.equal(saveGameSession(makeSession(), null, NOW), false);
  const full = { ...storage, setItem: () => { throw new Error('quota'); } };
  assert.equal(saveGameSession(makeSession(), full, NOW), false);
});

test('a saved game is only offered to the account that started it', () => {
  assert.equal(belongsToCurrentPlayer({ owner: null }, undefined), true);
  assert.equal(belongsToCurrentPlayer({ owner: 'hai-dua' }, 'hai-dua'), true);
  assert.equal(belongsToCurrentPlayer({ owner: 'hai-dua' }, undefined), false);
  assert.equal(belongsToCurrentPlayer({ owner: null }, 'hai-dua'), false);
});

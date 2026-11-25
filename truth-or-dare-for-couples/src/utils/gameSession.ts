import type {
  CardItem,
  CardResolutionEvent,
  ClothingRemovalEvent,
  GameSettings,
  IntimacyEvent,
  JourneyPhase,
  OutfitState,
  PendingDifficultyBoost,
  Player,
  PlayerIndex,
  PlayerRewardState,
  PositionSessionStats,
  RewardEvent,
} from '../types';
import { createCardDirectorState, type CardDirectorState } from './cardDirector';
import { isRecord, isStoredCard, normalizeStoredCard } from './cardSchema';
import { createClothingJourney, type ClothingJourneyState } from './clothingJourney';
import {
  createDynamicClothingSchedule,
  type DynamicClothingSchedulerState,
} from './dynamicClothingScheduler';
import { EMPTY_POSITION_SESSION_STATS } from './gameResolution';
import { DEFAULT_PLAYER_1, DEFAULT_PLAYER_2, hydratePlayer } from './playerStorage';
import { createPlayerRewardState } from './rewards';
import { hydrateGameSettings, hydrateOutfitState } from './wardrobe';

/**
 * Saves a running game on this device, so a refresh, the Back button or a tab
 * closed by the browser no longer throws away an hour of play. It is never sent
 * to the server, it expires after a day, and it is removed when the game ends
 * or the account signs out.
 */
export const GAME_SESSION_KEY = 'tod_couples_active_game';
export const GAME_SESSION_VERSION = 1;
export const GAME_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface FinalChoiceSnapshot {
  candidates: CardItem[];
  /** How many cards the couple may reveal before choosing (1 = blind pick). */
  flips: 1 | 2 | 3;
  revealedIds: string[];
}

/** The part of a game that lives inside the game table. */
export interface TableSnapshot {
  usedCardIds: string[];
  clothingJourney: ClothingJourneyState;
  clothingScheduler: DynamicClothingSchedulerState;
  waitedClothingTriggerId: string | null;
  cardDirector: CardDirectorState;
  /** The card on the table, or null between turns. */
  activeCard: CardItem | null;
  activeCardWasRerolled: boolean;
  clothingTrigger: { itemId: string; targetIndex: PlayerIndex } | null;
  finalChoice: FinalChoiceSnapshot | null;
}

export interface GameSessionState {
  /** Couple account that started the game; null for guests. */
  owner: string | null;
  player1: Player;
  player2: Player;
  settings: GameSettings;
  currentPlayerIndex: PlayerIndex;
  currentRound: number;
  outfitStates: [OutfitState, OutfitState];
  clothingRemovalEvents: ClothingRemovalEvent[];
  intimacyPercent: number;
  luxuryIntimacyPercent: number;
  intimacyEvents: IntimacyEvent[];
  journeyPhase: JourneyPhase;
  sessionPositionCardIds: string[];
  positionSessionStats: PositionSessionStats;
  cardResolutionEvents: CardResolutionEvent[];
  playerRewards: [PlayerRewardState, PlayerRewardState];
  pendingDifficultyBoosts: PendingDifficultyBoost[];
  rewardEvents: RewardEvent[];
  table: TableSnapshot;
}

export interface SavedGameSession extends GameSessionState {
  version: typeof GAME_SESSION_VERSION;
  savedAt: number;
}

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const JOURNEY_PHASES: readonly JourneyPhase[] = ['standard', 'position_consent', 'position', 'final'];

/** Illustrations can be large data URLs; they come back from the card catalog. */
const withoutImage = ({ customImage: _image, ...card }: CardItem): CardItem => card;

export const serializeGameSession = (state: GameSessionState, now = Date.now()): string => JSON.stringify({
  ...state,
  table: {
    ...state.table,
    activeCard: state.table.activeCard ? withoutImage(state.table.activeCard) : null,
    finalChoice: state.table.finalChoice
      ? { ...state.table.finalChoice, candidates: state.table.finalChoice.candidates.map(withoutImage) }
      : null,
  },
  version: GAME_SESSION_VERSION,
  savedAt: now,
} satisfies SavedGameSession);

const strings = (value: unknown): string[] => Array.isArray(value)
  ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)))
  : [];

const records = <T>(value: unknown): T[] => Array.isArray(value) ? value.filter(isRecord) as T[] : [];

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

const percent = (value: unknown): number => Math.min(100, count(value));

const isPlayerIndex = (value: unknown): value is PlayerIndex => value === 0 || value === 1;

const hydrateCard = (value: unknown): CardItem | null =>
  isStoredCard(value) ? normalizeStoredCard(value) : null;

const hydrateReward = (value: unknown): PlayerRewardState => {
  if (!isRecord(value)) return createPlayerRewardState();
  return {
    starBalance: count(value.starBalance),
    totalStarsEarned: count(value.totalStarsEarned),
    rerollsUsed: count(value.rerollsUsed),
    difficultyBoostsUsed: count(value.difficultyBoostsUsed),
  };
};

const hydrateJourney = (value: unknown): ClothingJourneyState => {
  const fresh = createClothingJourney();
  if (!isRecord(value) || !Array.isArray(value.opportunities)
    || value.opportunities.length !== fresh.opportunities.length
    || !value.opportunities.every((item) => isRecord(item) && typeof item.index === 'number' && typeof item.status === 'string')
    || !Array.isArray(value.history) || !Array.isArray(value.firstRemoval) || !Array.isArray(value.removalCount)) {
    return fresh;
  }
  return { ...fresh, ...(value as unknown as ClothingJourneyState) };
};

const hydrateScheduler = (
  value: unknown,
  outfits: readonly [OutfitState, OutfitState],
): DynamicClothingSchedulerState => {
  if (!isRecord(value) || !Array.isArray(value.items)
    || !value.items.every((item) => isRecord(item) && typeof item.id === 'string'
      && isPlayerIndex(item.targetPlayerIndex) && typeof item.triggerIntimacyPercent === 'number'
      && typeof item.status === 'string')
    || !Array.isArray(value.targetGarmentCounts) || !Array.isArray(value.completedRemovals)) {
    return createDynamicClothingSchedule(outfits);
  }
  return value as unknown as DynamicClothingSchedulerState;
};

const hydrateDirector = (value: unknown): CardDirectorState => {
  const fresh = createCardDirectorState();
  if (!isRecord(value)) return fresh;
  return {
    heatHistory: Array.isArray(value.heatHistory)
      ? value.heatHistory.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
      : [],
    typeHistory: Array.isArray(value.typeHistory)
      ? value.typeHistory.filter((item): item is CardDirectorState['typeHistory'][number] => typeof item === 'string')
      : [],
    seenCardIds: strings(value.seenCardIds),
    cardsCompletedCount: count(value.cardsCompletedCount),
    starsSpentThisSession: count(value.starsSpentThisSession),
    accountUnlockedCardIds: strings(value.accountUnlockedCardIds),
  };
};

const hydrateFinalChoice = (value: unknown): FinalChoiceSnapshot | null => {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return null;
  const candidates = value.candidates.map(hydrateCard).filter((card): card is CardItem => card !== null);
  if (candidates.length === 0 || candidates.length !== value.candidates.length) return null;
  const flips = value.flips === 2 || value.flips === 3 ? value.flips : 1;
  const ids = new Set(candidates.map((card) => card.id));
  return { candidates, flips, revealedIds: strings(value.revealedIds).filter((id) => ids.has(id)) };
};

const hydrateStats = (value: unknown): PositionSessionStats => isRecord(value)
  ? { drawn: count(value.drawn), opened: count(value.opened), completed: count(value.completed), skipped: count(value.skipped) }
  : { ...EMPTY_POSITION_SESSION_STATS };

/** Returns a playable game, or null when there is none, it is too old, or it is damaged. */
export const hydrateGameSession = (value: unknown, now = Date.now()): SavedGameSession | null => {
  if (!isRecord(value) || value.version !== GAME_SESSION_VERSION) return null;
  if (typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt)) return null;
  const age = now - value.savedAt;
  if (age > GAME_SESSION_MAX_AGE_MS || age < -60_000) return null;
  if (!isPlayerIndex(value.currentPlayerIndex) || !isRecord(value.table)) return null;
  if (!Array.isArray(value.outfitStates) || value.outfitStates.length !== 2) return null;
  if (!JOURNEY_PHASES.includes(value.journeyPhase as JourneyPhase)) return null;

  const settings = hydrateGameSettings(value.settings);
  const outfitStates: [OutfitState, OutfitState] = [
    hydrateOutfitState(value.outfitStates[0], settings.outfits[0], 0),
    hydrateOutfitState(value.outfitStates[1], settings.outfits[1], 1),
  ];
  const rewards = Array.isArray(value.playerRewards) ? value.playerRewards : [];
  const { table } = value;
  const trigger = table.clothingTrigger;
  const activeCard = hydrateCard(table.activeCard);
  const finalChoice = hydrateFinalChoice(table.finalChoice);
  // The final phase only makes sense with its three cards or the chosen one on the table.
  const journeyPhase = value.journeyPhase === 'final' && !finalChoice && activeCard?.position?.family !== 'have_sex'
    ? 'position'
    : value.journeyPhase as JourneyPhase;

  return {
    version: GAME_SESSION_VERSION,
    savedAt: value.savedAt,
    owner: typeof value.owner === 'string' && value.owner ? value.owner : null,
    player1: hydratePlayer(value.player1, DEFAULT_PLAYER_1),
    player2: hydratePlayer(value.player2, DEFAULT_PLAYER_2),
    settings,
    currentPlayerIndex: value.currentPlayerIndex,
    currentRound: Math.max(1, count(value.currentRound)),
    outfitStates,
    clothingRemovalEvents: records<ClothingRemovalEvent>(value.clothingRemovalEvents),
    intimacyPercent: percent(value.intimacyPercent),
    luxuryIntimacyPercent: percent(value.luxuryIntimacyPercent),
    intimacyEvents: records<IntimacyEvent>(value.intimacyEvents),
    journeyPhase,
    sessionPositionCardIds: strings(value.sessionPositionCardIds),
    positionSessionStats: hydrateStats(value.positionSessionStats),
    cardResolutionEvents: records<CardResolutionEvent>(value.cardResolutionEvents),
    playerRewards: [hydrateReward(rewards[0]), hydrateReward(rewards[1])],
    pendingDifficultyBoosts: records<PendingDifficultyBoost>(value.pendingDifficultyBoosts)
      .filter((boost) => isPlayerIndex(boost.ownerPlayerIndex) && isPlayerIndex(boost.targetPlayerIndex)),
    rewardEvents: records<RewardEvent>(value.rewardEvents),
    table: {
      usedCardIds: strings(table.usedCardIds),
      clothingJourney: hydrateJourney(table.clothingJourney),
      clothingScheduler: hydrateScheduler(table.clothingScheduler, outfitStates),
      waitedClothingTriggerId: typeof table.waitedClothingTriggerId === 'string' ? table.waitedClothingTriggerId : null,
      cardDirector: hydrateDirector(table.cardDirector),
      activeCard,
      activeCardWasRerolled: table.activeCardWasRerolled === true,
      clothingTrigger: activeCard && isRecord(trigger) && typeof trigger.itemId === 'string' && isPlayerIndex(trigger.targetIndex)
        ? { itemId: trigger.itemId, targetIndex: trigger.targetIndex }
        : null,
      finalChoice,
    },
  };
};

const deviceStorage = (): SessionStorageLike | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const loadGameSession = (
  storage: SessionStorageLike | null = deviceStorage(),
  now = Date.now(),
): SavedGameSession | null => {
  try {
    const saved = storage?.getItem(GAME_SESSION_KEY);
    return saved ? hydrateGameSession(JSON.parse(saved), now) : null;
  } catch {
    return null;
  }
};

export const saveGameSession = (
  state: GameSessionState,
  storage: SessionStorageLike | null = deviceStorage(),
  now = Date.now(),
): boolean => {
  if (!storage) return false;
  try {
    storage.setItem(GAME_SESSION_KEY, serializeGameSession(state, now));
    return true;
  } catch {
    // Storage full or blocked: the game goes on, it just cannot be resumed.
    return false;
  }
};

export const clearGameSession = (storage: SessionStorageLike | null = deviceStorage()): void => {
  try {
    storage?.removeItem(GAME_SESSION_KEY);
  } catch {
    // Nothing to clean up when storage is blocked.
  }
};

/** True when this device's saved game belongs to whoever is signed in now. */
export const belongsToCurrentPlayer = (
  session: Pick<SavedGameSession, 'owner'>,
  coupleName: string | null | undefined,
): boolean => (session.owner ?? null) === (coupleName ?? null);

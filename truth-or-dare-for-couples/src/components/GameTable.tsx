import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Flag, Heart, LockOpen, TriangleAlert } from 'lucide-react';
import {
  CardItem,
  CardResolutionEvent,
  CardType,
  ClothingRemovalEvent,
  GameEndReason,
  GarmentSlot,
  GameSettings,
  IntimacyEvent,
  JourneyPhase,
  LuxuryProgressionConfig,
  OutfitState,
  PendingDifficultyBoost,
  Player,
  PlayerIndex,
  PlayerRewardState,
  ProgressionConfig,
  RewardEvent,
} from '../types';
import { soundEngine } from '../utils/audio';
import { fireFinalConfetti, fireHeartConfetti, fireMilestoneConfetti } from '../utils/confetti';
import { DURATION, EASE_OUT, TABLE_TIMING } from '../utils/motionTokens';
import { preloadCardArt } from './CardIcons';
import { ConfirmDialog } from './ConfirmDialog';
import { PenaltyPrompt } from './PenaltyPrompt';
import { GarmentRemovalDialog } from './GarmentRemovalDialog';
import { GarmentSwapDialog } from './GarmentSwapDialog';
import { DualGarmentRemovalDialog } from './DualGarmentRemovalDialog';
import { CardSpark } from './game/CardSpark';
import { ChooseType } from './game/ChooseType';
import { FinalChoice } from './game/FinalChoice';
import { GameHeader } from './game/GameHeader';
import { PauseDialog } from './game/PauseDialog';
import { PlayerPanel } from './game/PlayerPanel';
import { PositionConsent } from './game/PositionConsent';
import { PositionEmpty } from './game/PositionEmpty';
import { TableActions } from './game/TableActions';
import { TableCard, type CardExit } from './game/TableCard';
import { TableDeck } from './game/TableDeck';
import { TurnStrip } from './game/TurnStrip';
import { useTableShortcuts } from './game/useTableShortcuts';
import { isDialogOpen } from './useDialogFocus';
import './game/game-table.css';
import { getRemovalTargetIndices } from '../utils/cardSelection';
import {
  GARMENT_LABELS,
  getOutfitStage,
  getEquippedGarment,
  getPresentGarmentSlots,
  getRemovableGarments,
  removeGarment,
  removeGarmentsFromBoth,
  swapGarments,
} from '../utils/wardrobe';
import { requiresTimerStartBeforeCompletion, resolveCardTimerSeconds } from '../utils/cardTimer';
import type { FinalChoiceSnapshot, TableSnapshot } from '../utils/gameSession';
import {
  advanceClothingTurn,
  clothingEffectFamily,
  createClothingJourney,
  getActiveOpportunity,
  resolveClothingOpportunity,
} from '../utils/clothingJourney';
import {
  consumeScheduledRemoval,
  createDynamicClothingSchedule,
  getActiveClothingRemovalTarget,
  injectClothingDirective,
  getTruthLockReason,
  shouldForceClothingDare,
  shouldInjectClothingDirective,
  updateDynamicClothingScheduler,
} from '../utils/dynamicClothingScheduler';
import {
  createCardDirectorState,
  recordDirectedCard,
  recordDirectorStarsSpent,
} from '../utils/cardDirector';
import {
  DIFFICULTY_BOOST_STAR_COST,
  FINAL_FLIP_THREE_STAR_COST,
  FINAL_FLIP_TWO_STAR_COST,
  REROLL_STAR_COST,
  awardStars,
  getSharedStarBalance,
  refundPendingDifficultyBoost,
  spendReward,
  spendSharedStars,
} from '../utils/rewards';
import {
  DIFFICULTY_STARS,
  calculateCompletedCardIntimacy,
  calculateCompletedPositionLuxury,
  deriveDifficultyStars,
  derivePositionDifficultyStars,
  getCardDeck,
  getStandardCardPerformerIndex,
  getJourneyDrawAnalysis,
  getLuxuryDrawProbabilities,
  selectJourneyCard,
  POSITION_DIFFICULTY_STARS,
  selectLuxuryPositionCard,
  type JourneyDrawProbabilities,
  type LuxuryDrawProbabilities,
} from '../utils/progression';

interface GameTableProps {
  player1: Player;
  player2: Player;
  currentPlayerIndex: 0 | 1;
  currentRound: number;
  settings: GameSettings;
  outfitStates: [OutfitState, OutfitState];
  availableCards: CardItem[];
  favorites: string[];
  onToggleFavorite: (cardId: string) => void;
  onOpenCollection: () => void;
  onOpenRules: () => void;
  onOpenSummary: () => void;
  onFinishGame: (reason: GameEndReason) => void;
  isSuspended?: boolean;
  onUpdatePlayers: (p1: Player, p2: Player) => void;
  onUpdateOutfits: (outfits: [OutfitState, OutfitState]) => void;
  onAddClothingRemovalEvent: (event: ClothingRemovalEvent) => void;
  unlockedCardIds: string[];
  onUnlockCard: (cardId: string) => void;
  onNextTurn: () => void;
  progressionConfig: ProgressionConfig;
  luxuryProgressionConfig: LuxuryProgressionConfig;
  intimacyPercent: number;
  luxuryIntimacyPercent: number;
  journeyPhase: JourneyPhase;
  sessionPositionCardIds: string[];
  onIntimacyPercentChange: (value: number) => void;
  onLuxuryIntimacyPercentChange: (value: number) => void;
  onAddIntimacyEvents: (events: IntimacyEvent[]) => void;
  onJourneyPhaseChange: (phase: JourneyPhase) => void;
  onSessionPositionCardIdsChange: (cardIds: string[]) => void;
  playerRewards: [PlayerRewardState, PlayerRewardState];
  pendingDifficultyBoosts: PendingDifficultyBoost[];
  onPlayerRewardsChange: (rewards: [PlayerRewardState, PlayerRewardState]) => void;
  onPendingDifficultyBoostsChange: (boosts: PendingDifficultyBoost[]) => void;
  onAddRewardEvent: (event: RewardEvent) => void;
  onAddCardResolutionEvent: (event: CardResolutionEvent) => void;
  onDrawPositionCard: (cardId: string) => void;
  onOpenPositionCard: (cardId: string) => void;
  onNavigationLockChange?: (locked: boolean) => void;
  coupleName?: string;
  onOpenAccountModal?: () => void;
  /** Continues a saved game; only read when the table mounts. */
  initialSnapshot?: TableSnapshot | null;
  /** Called whenever the table is in a state worth saving. */
  onSnapshot?: (snapshot: TableSnapshot) => void;
  /** Changes when the Back button asks to leave the game. */
  endRequestId?: number;
}

/** Intimacy level below which skipping never asks for a garment as penalty. */
const PENALTY_GARMENT_MIN_PERCENT = 20;

type FinalChoiceState = FinalChoiceSnapshot;
type Outfits = [OutfitState, OutfitState];

/** A garment is coming off: the light, then the new outfit, then the turn goes on. */
interface RemovalScene {
  targets: PlayerIndex[];
  /** What the figures wear during the scene; null while only the light is on. */
  outfits: Outfits | null;
}

/** One draw: shuffle, the card lifts off the deck, the card turns over. */
interface DrawSequence {
  place: () => void;
  reveal: () => void;
  placed: boolean;
}

const JOURNEY_MILESTONES = [25, 50, 75, 100];
const crossesMilestone = (before: number, after: number): boolean =>
  JOURNEY_MILESTONES.some((milestone) => before < milestone && after >= milestone);

const countGarments = (outfits: readonly OutfitState[]): number =>
  outfits.reduce((sum, outfit) => sum + getPresentGarmentSlots(outfit).length, 0);

export const GameTable: React.FC<GameTableProps> = ({
  player1,
  player2,
  currentPlayerIndex,
  currentRound,
  settings,
  outfitStates,
  availableCards,
  favorites,
  onToggleFavorite,
  onOpenCollection,
  onOpenRules,
  onOpenSummary,
  onFinishGame,
  isSuspended = false,
  onUpdatePlayers,
  onUpdateOutfits,
  onAddClothingRemovalEvent,
  unlockedCardIds,
  onUnlockCard,
  onNextTurn,
  progressionConfig,
  luxuryProgressionConfig,
  intimacyPercent,
  luxuryIntimacyPercent,
  journeyPhase,
  sessionPositionCardIds,
  onIntimacyPercentChange,
  onLuxuryIntimacyPercentChange,
  onAddIntimacyEvents,
  onJourneyPhaseChange,
  onSessionPositionCardIdsChange,
  playerRewards,
  pendingDifficultyBoosts,
  onPlayerRewardsChange,
  onPendingDifficultyBoostsChange,
  onAddRewardEvent,
  onAddCardResolutionEvent,
  onDrawPositionCard,
  onOpenPositionCard,
  onNavigationLockChange,
  coupleName,
  onOpenAccountModal,
  initialSnapshot = null,
  onSnapshot,
  endRequestId = 0,
}) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const reduceMotion = Boolean(useReducedMotion());
  const figureMood = journeyPhase === 'standard' ? Math.min(1, intimacyPercent / 100) : 1;
  const previousPhaseRef = useRef(journeyPhase);
  useEffect(() => {
    const previous = previousPhaseRef.current;
    previousPhaseRef.current = journeyPhase;
    if (reduceMotion || previous === journeyPhase || journeyPhase !== 'position_consent') return;
    soundEngine.haptic([30, 60, 30, 60, 80]);
    fireHeartConfetti();
  }, [journeyPhase, reduceMotion]);
  const [showPenaltyPrompt, setShowPenaltyPrompt] = useState(false);
  const [usedCardIds, setUsedCardIds] = useState<string[]>(initialSnapshot?.usedCardIds ?? []);
  const [clothingJourney, setClothingJourney] = useState(() =>
    initialSnapshot?.clothingJourney ?? createClothingJourney(),
  );
  const [dynamicClothingScheduler, setDynamicClothingScheduler] = useState(() =>
    initialSnapshot?.clothingScheduler ?? createDynamicClothingSchedule(outfitStates),
  );
  const currentTriggerRef = useRef<{ itemId: string; targetIndex: PlayerIndex } | null>(
    initialSnapshot?.clothingTrigger ?? null,
  );
  const [cardDirectorState, setCardDirectorState] = useState(() =>
    initialSnapshot?.cardDirector ?? createCardDirectorState(unlockedCardIds),
  );
  const [drawError, setDrawError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string>('');
  const [gainNotice, setGainNotice] = useState<{ text: string; unlocked: boolean } | null>(null);
  const [removalRequest, setRemovalRequest] = useState<{
    source: 'card' | 'penalty' | 'preparation';
    targetIndex: PlayerIndex;
  } | null>(null);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [showDualRemovalDialog, setShowDualRemovalDialog] = useState(false);
  const [finalChoice, setFinalChoice] = useState<FinalChoiceState | null>(initialSnapshot?.finalChoice ?? null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [scene, setScene] = useState<RemovalScene | null>(null);
  const [cardExit, setCardExit] = useState<CardExit>('skipped');
  const [quickFlip, setQuickFlip] = useState(false);
  const [sparkId, setSparkId] = useState(0);

  // Card draw state machine
  const [drawState, setDrawState] = useState<
    'idle' | 'selecting_type' | 'shuffling' | 'drawing' | 'drawn'
  >(initialSnapshot?.activeCard ? 'drawn' : 'idle');
  const [activeCard, setActiveCard] = useState<CardItem | null>(initialSnapshot?.activeCard ?? null);
  const [isRevealed, setIsRevealed] = useState<boolean>(!settings.privacyDefault);
  const [cardFlipped, setCardFlipped] = useState<boolean>(Boolean(initialSnapshot?.activeCard));

  // Timer state for Dares
  const [timerSeconds, setTimerSeconds] = useState<number | null>(() =>
    initialSnapshot?.activeCard ? resolveCardTimerSeconds(initialSnapshot.activeCard) : null,
  );
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [hasTimerStarted, setHasTimerStarted] = useState(false);
  const [activeCardWasRerolled, setActiveCardWasRerolled] = useState(initialSnapshot?.activeCardWasRerolled ?? false);
  const [drawProbabilitySnapshot, setDrawProbabilitySnapshot] = useState<
    | { deck: 'standard'; probabilities: JourneyDrawProbabilities }
    | { deck: 'position'; probabilities: LuxuryDrawProbabilities }
    | null
  >(null);
  const didPlayTimerAlarmRef = useRef(false);
  const completionCommittedRef = useRef(false);
  const drawTimeoutsRef = useRef<number[]>([]);
  const drawSequenceRef = useRef<DrawSequence | null>(null);
  const sceneTimeoutsRef = useRef<number[]>([]);
  const wasTimerRunningBeforeSuspendRef = useRef(false);

  const currentPlayer = currentPlayerIndex === 0 ? player1 : player2;
  // Keep the unrevealed card out of the content-rendering branch entirely.
  // Metadata such as id/type is still available for resolution and tracking.
  const revealedCard = isRevealed ? activeCard : null;
  const performingPlayerIndex = activeCard
    ? getStandardCardPerformerIndex(activeCard, currentPlayerIndex)
    : currentPlayerIndex;
  const performingPlayer = performingPlayerIndex === 0 ? player1 : player2;
  const activeDifficultyBoost = pendingDifficultyBoosts.find(
    (boost) => boost.targetPlayerIndex === currentPlayerIndex,
  ) ?? null;
  const activeClothingOpportunity = getActiveOpportunity(clothingJourney, intimacyPercent);
  const preferredClothingFamily = activeClothingOpportunity?.eventType === 'catch_up'
    ? 'opponent' as const
    : activeClothingOpportunity?.eventType ?? null;
  // "Has this player removed anything yet?" comes from the outfits themselves:
  // the journey flag only updated when a removal coincided with an open
  // opportunity, so it often stayed false after real removals.
  const firstRemoval = useMemo(
    () => outfitStates.map((outfit) =>
      getPresentGarmentSlots(outfit).length < Object.keys(outfit.initial.garments).length,
    ) as [boolean, boolean],
    [outfitStates],
  );
  // The SAME options feed the on-screen odds and the real draw, so the
  // displayed percentages are exactly the ones the selector uses.
  const journeySelectionOptions = useMemo(() => ({
    cards: availableCards,
    actorIndex: currentPlayerIndex,
    outfits: outfitStates,
    usedCardIds,
    levels: settings.levels,
    intimacyPercent,
    config: progressionConfig,
    difficultyBoost: Boolean(activeDifficultyBoost),
    accountUnlockedCardIds: unlockedCardIds,
    preferredClothingFamily,
    clothingHistory: clothingJourney.history,
    firstRemoval,
    directorState: cardDirectorState,
  }), [
    availableCards, currentPlayerIndex, outfitStates, usedCardIds,
    settings.levels, intimacyPercent, progressionConfig, activeDifficultyBoost,
    unlockedCardIds, preferredClothingFamily, clothingJourney, firstRemoval, cardDirectorState,
  ]);
  const dueClothingTrigger = useMemo(
    () => getActiveClothingRemovalTarget(dynamicClothingScheduler, intimacyPercent, outfitStates),
    [dynamicClothingScheduler, intimacyPercent, outfitStates],
  );
  // A due removal lets one draw pass (a Truth may still come up) before the next
  // one is forced to a Dare, so the undressing does not bunch up at the end.
  const [waitedClothingTriggerId, setWaitedClothingTriggerId] = useState<string | null>(
    initialSnapshot?.waitedClothingTriggerId ?? null,
  );
  const forceClothingDare = shouldForceClothingDare(dueClothingTrigger, waitedClothingTriggerId, intimacyPercent);
  const drawAnalysis = useMemo(
    () => getJourneyDrawAnalysis(journeySelectionOptions),
    [journeySelectionOptions],
  );
  // A forced removal makes the random draw a Dare; show those odds.
  const displayedDrawAnalysis = useMemo(() => {
    if (!forceClothingDare || settings.drawMode === 'choose') return drawAnalysis;
    const dareAnalysis = getJourneyDrawAnalysis({ ...journeySelectionOptions, preferredType: 'dare' });
    return dareAnalysis.candidates.length > 0 ? dareAnalysis : drawAnalysis;
  }, [forceClothingDare, settings.drawMode, drawAnalysis, journeySelectionOptions]);
  const availableDrawTypes = drawAnalysis.availableTypes;
  // Choosing Truth must not be a way around a due removal, and at 100% a Truth adds nothing.
  const truthLockedReason = getTruthLockReason({
    availableTypes: availableDrawTypes,
    forceClothingDare,
    intimacyPercent,
  });
  const drawProbabilities = drawProbabilitySnapshot?.deck === 'standard'
    ? drawProbabilitySnapshot.probabilities
    : displayedDrawAnalysis.probabilities;
  const currentLuxuryProbabilities = useMemo(
    () =>
      journeyPhase === 'position' || journeyPhase === 'position_consent'
        ? getLuxuryDrawProbabilities({
            cards: availableCards,
            actorIndex: currentPlayerIndex,
            outfits: outfitStates,
            usedCardIds: sessionPositionCardIds,
            luxuryPercent: luxuryIntimacyPercent,
            config: luxuryProgressionConfig,
          })
        : null,
    [journeyPhase, availableCards, currentPlayerIndex, outfitStates, sessionPositionCardIds, luxuryIntimacyPercent, luxuryProgressionConfig],
  );
  const luxuryDrawProbabilities = drawProbabilitySnapshot?.deck === 'position'
    ? drawProbabilitySnapshot.probabilities
    : currentLuxuryProbabilities;
  const displayOutfits = scene?.outfits ?? outfitStates;
  const navigationLocked = drawState === 'shuffling' || drawState === 'drawing' || scene !== null;
  const isPaused = isSuspended || showEndConfirm || showPause;

  useEffect(() => {
    onNavigationLockChange?.(navigationLocked);
  }, [navigationLocked, onNavigationLockChange]);

  // Saved between animations only, so a reload never lands in the middle of a draw.
  useEffect(() => {
    if (!onSnapshot || navigationLocked) return;
    onSnapshot({
      usedCardIds,
      clothingJourney,
      clothingScheduler: dynamicClothingScheduler,
      waitedClothingTriggerId,
      cardDirector: cardDirectorState,
      activeCard: drawState === 'drawn' ? activeCard : null,
      activeCardWasRerolled,
      clothingTrigger: drawState === 'drawn' ? currentTriggerRef.current : null,
      finalChoice,
    });
  }, [
    onSnapshot, navigationLocked, usedCardIds, clothingJourney, dynamicClothingScheduler,
    waitedClothingTriggerId, cardDirectorState, drawState, activeCard, activeCardWasRerolled, finalChoice,
  ]);

  // Illustrations are not stored with a saved game; they return once the catalog has loaded.
  useEffect(() => {
    if (!initialSnapshot) return;
    const withImage = (card: CardItem): CardItem => {
      if (card.customImage) return card;
      const image = availableCards.find((item) => item.id === card.id)?.customImage;
      return image ? { ...card, customImage: image } : card;
    };
    setActiveCard((card) => (card ? withImage(card) : card));
    setFinalChoice((choice) => {
      if (!choice) return choice;
      const candidates = choice.candidates.map(withImage);
      return candidates.some((card, index) => card !== choice.candidates[index]) ? { ...choice, candidates } : choice;
    });
  }, [availableCards, initialSnapshot]);

  // The Back button asks first instead of dropping the game (after a running animation).
  const handledEndRequestRef = useRef(endRequestId);
  useEffect(() => {
    if (endRequestId === handledEndRequestRef.current || navigationLocked) return;
    handledEndRequestRef.current = endRequestId;
    setShowEndConfirm(true);
  }, [endRequestId, navigationLocked]);

  useEffect(() => {
    if (isPaused) {
      if (isTimerRunning) wasTimerRunningBeforeSuspendRef.current = true;
      setIsTimerRunning(false);
      soundEngine.stopTimerAlarm();
      return;
    }
    if (wasTimerRunningBeforeSuspendRef.current && timerSeconds !== null && timerSeconds > 0) {
      wasTimerRunningBeforeSuspendRef.current = false;
      setIsTimerRunning(true);
    }
  }, [isPaused, isTimerRunning, timerSeconds]);

  // Countdown uses one disposable timeout per second. The alarm is handled by
  // the guarded transition effect below, outside the state updater, so React
  // Strict Mode cannot accidentally schedule it twice.
  useEffect(() => {
    if (isPaused || !isTimerRunning || timerSeconds === null || timerSeconds <= 0) return;

    const currentSeconds = timerSeconds;
    const timeout = window.setTimeout(() => {
      if (currentSeconds <= 5 && currentSeconds > 1) {
        soundEngine.playTick();
      }
      setTimerSeconds((latestSeconds) =>
        latestSeconds === currentSeconds ? Math.max(0, currentSeconds - 1) : latestSeconds,
      );
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [isPaused, isTimerRunning, timerSeconds]);

  useEffect(() => {
    if (isPaused || timerSeconds !== 0 || didPlayTimerAlarmRef.current) return;

    didPlayTimerAlarmRef.current = true;
    setIsTimerRunning(false);
    soundEngine.playTimerAlarm(3000);
    setLiveMessage('Hết giờ. Chuông đang báo trong khoảng 3 giây.');
  }, [isPaused, timerSeconds]);

  useEffect(
    () => () => {
      drawTimeoutsRef.current.forEach(window.clearTimeout);
      drawTimeoutsRef.current = [];
      sceneTimeoutsRef.current.forEach(window.clearTimeout);
      sceneTimeoutsRef.current = [];
      soundEngine.stopTimerAlarm();
    },
    [],
  );

  const scheduleDrawStep = (callback: () => void, delay: number) => {
    const timeout = window.setTimeout(() => {
      drawTimeoutsRef.current = drawTimeoutsRef.current.filter((id) => id !== timeout);
      callback();
    }, delay);
    drawTimeoutsRef.current.push(timeout);
  };

  /**
   * Removing a button that has the focus makes the browser lay the page out on the
   * spot. Let go of it first; the next main button takes the focus right after.
   */
  const releaseActionFocus = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('.table-actions, .table-card')) active.blur();
  };

  // Shuffle, lift and turn over. The whole draw stays under 1.6 s and a tap skips the rest.
  const finishDrawSequence = () => {
    const sequence = drawSequenceRef.current;
    if (!sequence) return;
    drawSequenceRef.current = null;
    releaseActionFocus();
    soundEngine.playCardFlip();
    sequence.reveal();
  };

  const placeDrawnCard = (liftMs: number) => {
    const sequence = drawSequenceRef.current;
    if (!sequence || sequence.placed) return;
    sequence.placed = true;
    soundEngine.haptic(12);
    sequence.place();
    scheduleDrawStep(finishDrawSequence, liftMs);
  };

  const startDrawSequence = (card: CardItem, place: () => void, reveal: () => void) => {
    drawSequenceRef.current = { place, reveal, placed: false };
    releaseActionFocus();
    preloadCardArt(card);
    setQuickFlip(false);
    setDrawState('shuffling');
    soundEngine.playShuffle();
    scheduleDrawStep(
      () => placeDrawnCard(reduceMotion ? TABLE_TIMING.reducedLift : TABLE_TIMING.lift),
      reduceMotion ? TABLE_TIMING.reducedShuffle : TABLE_TIMING.shuffle,
    );
  };

  const skipDrawSequence = () => {
    const sequence = drawSequenceRef.current;
    if (!sequence) return;
    drawTimeoutsRef.current.forEach(window.clearTimeout);
    drawTimeoutsRef.current = [];
    setQuickFlip(true);
    if (sequence.placed) finishDrawSequence();
    else placeDrawnCard(40);
  };

  /**
   * Light on the player, the garment comes off, and only then the points and the
   * next turn. Nothing is committed before the end, so a reload in the middle
   * simply shows the open card again.
   */
  const playRemovalScene = (targets: PlayerIndex[], outfits: Outfits, announcement: string, commit: () => void) => {
    if (reduceMotion) {
      commit();
      setLiveMessage(announcement);
      return;
    }
    const later = (callback: () => void, delay: number) => {
      sceneTimeoutsRef.current.push(window.setTimeout(callback, delay));
    };
    setScene({ targets, outfits: null });
    const total = TABLE_TIMING.spotlight + TABLE_TIMING.garmentOff;
    later(() => {
      soundEngine.haptic([18, 40, 30]);
      setLiveMessage(announcement);
      setScene({ targets, outfits });
    }, TABLE_TIMING.spotlight);
    later(() => {
      setScene(null);
      commit();
    }, total);
    // On phones the figures sit above the card: bring them into view, then go back.
    const panels = document.querySelector<HTMLElement>('.game-outfit-mobile');
    if (panels && panels.getClientRects().length > 0) {
      const scrollTop = window.scrollY;
      later(() => panels.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30);
      later(() => window.scrollTo({ top: scrollTop, behavior: 'smooth' }), total + 420);
    }
  };

  useEffect(() => {
    if (!gainNotice) return;
    const timeout = window.setTimeout(() => setGainNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [gainNotice]);

  useEffect(() => {
    if (sparkId === 0) return;
    const timeout = window.setTimeout(() => setSparkId(0), TABLE_TIMING.spark);
    return () => window.clearTimeout(timeout);
  }, [sparkId]);

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleTimerControl = () => {
    if (isPaused) return;
    if (!hasTimerStarted) {
      if (timerSeconds === null || timerSeconds <= 0) return;
      didPlayTimerAlarmRef.current = false;
      setHasTimerStarted(true);
      setIsTimerRunning(true);
      setLiveMessage(`Đã bắt đầu thực hiện. Còn ${timerSeconds} giây.`);
      return;
    }
    if (timerSeconds === 0) {
      const resetSeconds = resolveCardTimerSeconds(activeCard);
      if (resetSeconds === null) return;

      soundEngine.stopTimerAlarm();
      didPlayTimerAlarmRef.current = false;
      setTimerSeconds(resetSeconds);
      setIsTimerRunning(true);
      setHasTimerStarted(true);
      setLiveMessage('Đã bắt đầu đếm lại thời gian.');
      return;
    }

    setIsTimerRunning((running) => !running);
  };

  // Initiate Draw Process
  const handleStartDraw = () => {
    soundEngine.playTick();
    setDrawError(null);
    if (availableDrawTypes.length === 0) {
      setDrawError('Không còn lá phù hợp với cấp độ và trang phục hiện tại.');
      return;
    }
    if (settings.drawMode === 'choose') {
      setDrawState('selecting_type');
    } else {
      executeDrawCard(null);
    }
  };

  const executeDrawCard = (preferredType: CardType | null) => {
    // A due clothing milestone is attached to a Dare when one comes up (never to a Truth); once it
    // has let a draw pass, the next random draw is a Dare.
    const dueTrigger = dueClothingTrigger;
    const selectionOptions = journeySelectionOptions;
    const dareFirst = forceClothingDare && !preferredType
      ? selectJourneyCard({ ...selectionOptions, preferredType: 'dare' })
      : null;
    const selection = dareFirst?.card
      ? dareFirst
      : selectJourneyCard({ ...selectionOptions, preferredType });

    if (!selection.card) {
      setDrawError(selection.errorCode === 'no_progress_gain'
        ? 'Bộ bài hiện tại không có điểm Tim hồng khả dụng.'
        : selection.errorCode === 'no_positive_weight'
          ? 'Không có loại hoặc bậc sao phù hợp ở mốc thân mật này.'
          : preferredType
          ? `Không còn lá ${preferredType === 'truth' ? 'Sự thật' : 'Thử thách'} phù hợp.`
          : 'Không còn lá phù hợp với trạng thái trang phục hiện tại.',
      );
      setDrawState(preferredType ? 'selecting_type' : 'idle');
      return;
    }

    let randomCard = selection.card;
    if (dueTrigger && shouldInjectClothingDirective(randomCard)) {
      currentTriggerRef.current = dueTrigger;
      randomCard = injectClothingDirective(
        randomCard,
        currentPlayerIndex,
        dueTrigger.targetIndex,
      );
      setWaitedClothingTriggerId(null);
    } else {
      currentTriggerRef.current = null;
      setWaitedClothingTriggerId(dueTrigger?.itemId ?? null);
    }

    completionCommittedRef.current = false;
    setCardDirectorState((current) => recordDirectedCard(current, randomCard));
    setActiveCardWasRerolled(false);
    setUsedCardIds(selection.nextUsedCardIds);
    setDrawProbabilitySnapshot({ deck: 'standard', probabilities: selection.probabilities });
    setDrawError(null);
    setGainNotice(null);
    setTimerSeconds(null);
    setHasTimerStarted(false);
    setIsTimerRunning(false);
    if (activeDifficultyBoost) {
      onPendingDifficultyBoostsChange(
        pendingDifficultyBoosts.filter((boost) => boost !== activeDifficultyBoost),
      );
      setLiveMessage(`Lượt tăng khó của ${activeDifficultyBoost.ownerPlayerIndex === 0 ? player1.name : player2.name} đã được áp dụng.`);
    }

    startDrawSequence(
      randomCard,
      () => {
        setActiveCard(randomCard);
        setDrawState('drawing');
        setIsRevealed(!settings.privacyDefault);
        setCardFlipped(false);
      },
      () => {
        setCardFlipped(true);
        setDrawState('drawn');
        // A card may override, disable or inherit the configured duration for
        // its Truth/Action type.
        soundEngine.stopTimerAlarm();
        didPlayTimerAlarmRef.current = false;
        setTimerSeconds(resolveCardTimerSeconds(randomCard));
        setHasTimerStarted(false);
        setIsTimerRunning(false);
      },
    );
  };

  const handleQueueDifficultyBoost = () => {
    if (journeyPhase !== 'standard' || drawState !== 'idle') return;
    const targetPlayerIndex: PlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
    if (pendingDifficultyBoosts.some((boost) => boost.targetPlayerIndex === targetPlayerIndex)) {
      setDrawError('Đối phương đã có một lượt tăng khó đang chờ.');
      return;
    }
    const nextRewards = spendReward(playerRewards, currentPlayerIndex, 'difficulty_boost');
    if (!nextRewards) {
      setDrawError(`Cần ${DIFFICULTY_BOOST_STAR_COST}★ để tăng độ khó cho đối phương.`);
      return;
    }
    const pending: PendingDifficultyBoost = {
      ownerPlayerIndex: currentPlayerIndex,
      targetPlayerIndex,
      queuedRound: currentRound,
    };
    onPlayerRewardsChange(nextRewards);
    setCardDirectorState((current) => recordDirectorStarsSpent(current, DIFFICULTY_BOOST_STAR_COST));
    onPendingDifficultyBoostsChange([...pendingDifficultyBoosts, pending]);
    onAddRewardEvent({
      kind: 'queued_difficulty_boost',
      playerIndex: currentPlayerIndex,
      amount: -DIFFICULTY_BOOST_STAR_COST,
      round: currentRound,
      timestamp: Date.now(),
    });
    setDrawError(null);
    setLiveMessage(`${currentPlayer.name} đã dùng ${DIFFICULTY_BOOST_STAR_COST} sao. Lượt rút kế tiếp của ${targetPlayerIndex === 0 ? player1.name : player2.name} sẽ khó hơn một bậc.`);
  };

  const handleReroll = () => {
    if (!activeCard || getCardDeck(activeCard) !== 'standard' || drawState !== 'drawn' || activeCardWasRerolled) return;
    const nextRewards = spendReward(playerRewards, performingPlayerIndex, 'reroll');
    if (!nextRewards) {
      setDrawError(`Cần ${REROLL_STAR_COST}★ để đổi lá bài.`);
      return;
    }
    const selection = selectJourneyCard({
      ...journeySelectionOptions,
      preferredType: settings.drawMode === 'choose' ? activeCard.type : null,
      excludedCardIds: [activeCard.id],
      difficultyBoost: false,
    });
    if (!selection.card) {
      setDrawError('Không còn lá khác phù hợp để đổi. Sao của bạn được giữ nguyên.');
      return;
    }

    const previousCardId = activeCard.id;
    const replacement = selection.card;
    if (currentTriggerRef.current) {
      // Rerolling a clothing card does not force the replacement to be one; the milestone returns a bit later.
      const trigger = currentTriggerRef.current;
      setDynamicClothingScheduler((current) =>
        updateDynamicClothingScheduler(current, trigger.itemId, trigger.targetIndex, 'skipped', intimacyPercent, currentRound),
      );
      currentTriggerRef.current = null;
    }
    onPlayerRewardsChange(nextRewards);
    setCardDirectorState((current) => recordDirectorStarsSpent(
      recordDirectedCard(current, replacement),
      REROLL_STAR_COST,
    ));
    setClothingJourney((current) => {
      const opportunity = getActiveOpportunity(current, intimacyPercent);
      return opportunity ? resolveClothingOpportunity(current, opportunity.index, 'rerolled') : current;
    });
    recordResolution(activeCard, 'rerolled');
    onAddRewardEvent({
      kind: 'rerolled_card',
      playerIndex: performingPlayerIndex,
      amount: -REROLL_STAR_COST,
      cardId: previousCardId,
      round: currentRound,
      timestamp: Date.now(),
    });
    setUsedCardIds(selection.nextUsedCardIds);
    setDrawProbabilitySnapshot({ deck: 'standard', probabilities: selection.probabilities });
    setDrawError(null);
    setLiveMessage(`${performingPlayer.name} đã dùng ${REROLL_STAR_COST} sao để đổi bài. Lá cũ không được mở khóa.`);
    soundEngine.stopTimerAlarm();
    didPlayTimerAlarmRef.current = false;
    completionCommittedRef.current = false;
    setIsTimerRunning(false);
    setTimerSeconds(null);
    setHasTimerStarted(false);
    setCardExit('rerolled');
    setActiveCard(null);
    setCardFlipped(false);
    startDrawSequence(
      replacement,
      () => {
        setActiveCard(replacement);
        setDrawState('drawing');
        setIsRevealed(!settings.privacyDefault);
      },
      () => {
        setCardFlipped(true);
        setDrawState('drawn');
        setTimerSeconds(resolveCardTimerSeconds(replacement));
        setHasTimerStarted(false);
        setIsTimerRunning(false);
        setActiveCardWasRerolled(true);
      },
    );
  };

  /** A spark for every card; confetti only for a milestone, so it still means something. */
  const celebrate = (milestone: boolean) => {
    soundEngine.playCompleteSound();
    soundEngine.haptic(milestone ? [16, 40, 24] : 14);
    if (reduceMotion) return;
    setSparkId((id) => id + 1);
    if (milestone) fireMilestoneConfetti();
  };

  /** Completed cards fly to the player who earned them. */
  const exitTowards = (playerIndex: PlayerIndex): CardExit => (playerIndex === 0 ? 'to-left' : 'to-right');

  const recordResolution = (
    card: CardItem,
    status: CardResolutionEvent['status'],
  ) => onAddCardResolutionEvent({
    id: `${currentRound}-${card.id}-${status}-${Date.now()}`,
    cardId: card.id,
    playerIndex: currentPlayerIndex,
    status,
    deck: getCardDeck(card),
    round: currentRound,
    timestamp: Date.now(),
  });

  /** Tim Hồng is full and both outfits are empty: the couple decides about the Position deck. */
  const openPositionConsent = () => {
    soundEngine.stopTimerAlarm();
    setIsTimerRunning(false);
    setTimerSeconds(null);
    setActiveCard(null);
    setDrawState('idle');
    setCardFlipped(false);
    setIsRevealed(true);
    // No card is open any more, so the odds on screen are those of the next card.
    setDrawProbabilitySnapshot(null);
    onJourneyPhaseChange('position_consent');
  };

  const finalizeCompletedTurn = (
    includeCardRemovalBonus = false,
    outfitsAfter: readonly [OutfitState, OutfitState] = outfitStates,
  ) => {
    if (!activeCard || completionCommittedRef.current) return;
    completionCommittedRef.current = true;
    recordResolution(activeCard, 'completed');
    const newlyUnlocked = !unlockedCardIds.includes(activeCard.id);
    if (newlyUnlocked) onUnlockCard(activeCard.id);
    const gain = calculateCompletedCardIntimacy(
      intimacyPercent,
      activeCard,
      progressionConfig,
      includeCardRemovalBonus,
    );
    const nextIntimacy = gain.nextPercent;
    // Every garment must come off through the cards themselves: the Position
    // deck opens only once Tim Hồng is full AND both outfits are empty.
    const opensPositionDeck = nextIntimacy >= 100 && outfitsAfter.every((outfit) => getOutfitStage(outfit) === 'empty');
    const firstGarmentOff = !firstRemoval.some(Boolean) && countGarments(outfitsAfter) < countGarments(outfitStates);
    // The hearts of the Position deck follow at once; two bursts would only blur each other.
    celebrate(!opensPositionDeck && (firstGarmentOff || crossesMilestone(intimacyPercent, nextIntimacy)));
    const appliedTotal = gain.totalApplied;
    const appliedBase = gain.baseApplied;
    const appliedRemoval = gain.removalApplied;
    const now = Date.now();
    const events: IntimacyEvent[] = [];
    if (appliedBase > 0) {
      events.push({
        cardId: activeCard.id,
        amount: appliedBase,
        source: 'completed_card',
        track: 'standard',
        round: currentRound,
        timestamp: now,
      });
    }
    if (appliedRemoval > 0) {
      events.push({
        cardId: activeCard.id,
        amount: appliedRemoval,
        source: 'card_clothing_removal',
        track: 'standard',
        round: currentRound,
        timestamp: now,
      });
    }
    onIntimacyPercentChange(nextIntimacy);
    if (events.length > 0) onAddIntimacyEvents(events);
    const earnedStars = deriveDifficultyStars(activeCard);
    let nextRewardStates = awardStars(playerRewards, performingPlayerIndex, earnedStars);
    onAddRewardEvent({
      kind: 'earned_stars',
      playerIndex: performingPlayerIndex,
      amount: earnedStars,
      cardId: activeCard.id,
      round: currentRound,
      timestamp: now,
    });
    if (nextIntimacy >= 100 && pendingDifficultyBoosts.length > 0) {
      for (const pending of pendingDifficultyBoosts) {
        nextRewardStates = refundPendingDifficultyBoost(nextRewardStates, pending);
        onAddRewardEvent({
          kind: 'refunded_difficulty_boost',
          playerIndex: pending.ownerPlayerIndex,
          amount: DIFFICULTY_BOOST_STAR_COST,
          round: currentRound,
          timestamp: now,
        });
      }
      onPendingDifficultyBoostsChange([]);
    }
    onPlayerRewardsChange(nextRewardStates);
    const clothingFamily = clothingEffectFamily(activeCard.clothingEffect);
    if (clothingFamily) {
      setClothingJourney((current) => {
        const opportunity = getActiveOpportunity(current, intimacyPercent);
        return opportunity
          ? resolveClothingOpportunity(current, opportunity.index, 'completed', clothingFamily, removalRequest?.targetIndex)
          : { ...current, history: [...current.history, clothingFamily], pityCounter: 0, turnsSinceClothing: 0 };
      });
    }
    if (currentTriggerRef.current) {
      const trigger = currentTriggerRef.current;
      setDynamicClothingScheduler((current) =>
        updateDynamicClothingScheduler(
          current,
          trigger.itemId,
          trigger.targetIndex,
          'completed',
          nextIntimacy,
          currentRound,
        ),
      );
      currentTriggerRef.current = null;
    }
    setGainNotice({
      text: [
        appliedTotal > 0 ? `+${appliedTotal}% thân mật` : null,
        `+${earnedStars}★ cho ${performingPlayer.name}`,
        appliedRemoval > 0 ? `gồm +${appliedRemoval}% bỏ đồ` : null,
      ].filter(Boolean).join(' · '),
      unlocked: newlyUnlocked,
    });
    if (performingPlayerIndex === 0) {
      onUpdatePlayers(
        { ...player1, completedCount: player1.completedCount + 1 },
        player2
      );
    } else {
      onUpdatePlayers(player1, {
        ...player2,
        completedCount: player2.completedCount + 1,
      });
    }
    if (opensPositionDeck) {
      openPositionConsent();
      return;
    }
    advanceNextTurn(exitTowards(performingPlayerIndex));
    if (nextIntimacy >= 100) {
      setLiveMessage('Tim Hồng đã đầy. Tiếp tục rút bài để cả hai cởi nốt trang phục rồi mở Bộ Tư thế.');
    }
  };

  const finalizeCompletedPosition = () => {
    if (!activeCard || completionCommittedRef.current) return;
    completionCommittedRef.current = true;
    recordResolution(activeCard, 'completed');
    const newlyUnlocked = !unlockedCardIds.includes(activeCard.id);
    if (newlyUnlocked) onUnlockCard(activeCard.id);
    const gain = calculateCompletedPositionLuxury(
      luxuryIntimacyPercent,
      activeCard,
      luxuryProgressionConfig,
    );
    celebrate(crossesMilestone(luxuryIntimacyPercent, gain.nextPercent));
    onLuxuryIntimacyPercentChange(gain.nextPercent);
    if (gain.totalApplied > 0) {
      onAddIntimacyEvents([{
        cardId: activeCard.id,
        amount: gain.totalApplied,
        source: 'completed_card',
        track: 'luxury',
        round: currentRound,
        timestamp: Date.now(),
      }]);
    }
    setGainNotice({
      text: `+${gain.totalApplied}% Luxury · lá ${derivePositionDifficultyStars(activeCard)}★`,
      unlocked: newlyUnlocked,
    });
    advanceNextTurn(exitTowards(currentPlayerIndex));
  };

  const finalizeCardCompletion = (
    includeCardRemovalBonus = false,
    outfitsAfter?: readonly [OutfitState, OutfitState],
  ) => {
    if (activeCard && getCardDeck(activeCard) === 'position') finalizeCompletedPosition();
    else finalizeCompletedTurn(includeCardRemovalBonus, outfitsAfter);
  };

  const finalizeSkippedTurn = (outfitsAfter: readonly [OutfitState, OutfitState] = outfitStates) => {
    if (completionCommittedRef.current) return;
    completionCommittedRef.current = true;
    if (activeCard) recordResolution(activeCard, 'skipped');
    setClothingJourney((current) => {
      const opportunity = activeCard ? getActiveOpportunity(current, intimacyPercent) : null;
      return opportunity
        ? resolveClothingOpportunity(current, opportunity.index, 'skipped')
        : { ...current, pityCounter: Math.min(5, current.pityCounter + 1) };
    });
    if (currentTriggerRef.current) {
      const trigger = currentTriggerRef.current;
      setDynamicClothingScheduler((current) =>
        updateDynamicClothingScheduler(
          current,
          trigger.itemId,
          trigger.targetIndex,
          'skipped',
          intimacyPercent,
          currentRound,
        ),
      );
      currentTriggerRef.current = null;
    }
    setShowPenaltyPrompt(false);
    if (performingPlayerIndex === 0) {
      onUpdatePlayers(
        { ...player1, skippedCount: player1.skippedCount + 1 },
        player2,
      );
    } else {
      onUpdatePlayers(player1, {
        ...player2,
        skippedCount: player2.skippedCount + 1,
      });
    }
    if (intimacyPercent >= 100 && outfitsAfter.every((outfit) => getOutfitStage(outfit) === 'empty')) {
      openPositionConsent();
      return;
    }
    advanceNextTurn('skipped');
  };

  // Action: Complete Challenge
  const handleComplete = () => {
    if (!activeCard || completionCommittedRef.current || scene) return;
    if (timerSeconds !== null && !hasTimerStarted && requiresTimerStartBeforeCompletion(activeCard)) {
      setLiveMessage('Hãy bấm Bắt đầu thực hiện trước khi xác nhận kết quả.');
      return;
    }
    soundEngine.stopTimerAlarm();
    setIsTimerRunning(false);
    if (activeCard.position?.family === 'have_sex') {
      completionCommittedRef.current = true;
      recordResolution(activeCard, 'final_viewed');
      if (!unlockedCardIds.includes(activeCard.id)) onUnlockCard(activeCard.id);
      onFinishGame('have_sex');
      return;
    }
    if (activeCard.gameplayEffect?.kind === 'pass_turn') {
      completionCommittedRef.current = true;
      recordResolution(activeCard, 'passed');
      if (!unlockedCardIds.includes(activeCard.id)) onUnlockCard(activeCard.id);
      advanceNextTurn('skipped');
      setLiveMessage(`${currentPlayer.name} đã chuyển lượt theo nội dung lá bài.`);
      return;
    }
    if (activeCard?.clothingEffect?.kind === 'swap_garments') {
      setShowSwapDialog(true);
      return;
    }
    if (activeCard.clothingEffect?.kind === 'remove_garment') {
      const targetIndices = getRemovalTargetIndices(activeCard, currentPlayerIndex);
      if (targetIndices.length === 2) {
        setShowDualRemovalDialog(true);
        return;
      }
      const targetIndex = targetIndices[0];
      if (targetIndex !== undefined && getRemovableGarments(outfitStates[targetIndex]).length > 0) {
        setRemovalRequest({ source: 'card', targetIndex });
        return;
      }
    }
    finalizeCardCompletion();
  };

  // Action: Skip Challenge
  const handleSkip = () => {
    if (!activeCard || completionCommittedRef.current || scene) return;
    soundEngine.playTick();
    soundEngine.stopTimerAlarm();
    setIsTimerRunning(false);
    setShowPenaltyPrompt(true);
  };

  const handlePenaltyGarmentChoice = () => {
    setShowPenaltyPrompt(false);
    setRemovalRequest({ source: 'penalty', targetIndex: performingPlayerIndex });
  };

  const handleCancelRemoval = () => {
    const wasPenalty = removalRequest?.source === 'penalty';
    setRemovalRequest(null);
    setShowSwapDialog(false);
    setShowDualRemovalDialog(false);
    if (wasPenalty) setShowPenaltyPrompt(true);
  };

  const handleConfirmRemoval = (slot: GarmentSlot) => {
    if (!removalRequest || scene) return;
    const { source, targetIndex } = removalRequest;
    const targetState = outfitStates[targetIndex];
    const garment = getEquippedGarment(targetState, slot);
    const nextTargetState = removeGarment(targetState, slot);
    if (!garment || nextTargetState === targetState) return;

    const nextOutfits: Outfits = [outfitStates[0], outfitStates[1]];
    nextOutfits[targetIndex] = nextTargetState;
    const targetName = targetIndex === 0 ? player1.name : player2.name;
    const announcement = `${targetName} đã bỏ ${GARMENT_LABELS[slot].toLocaleLowerCase('vi')}, còn ${getPresentGarmentSlots(nextTargetState).length} món.`;

    setRemovalRequest(null);
    playRemovalScene([targetIndex], nextOutfits, announcement, () => {
      onUpdateOutfits(nextOutfits);
      onAddClothingRemovalEvent({
        actorPlayerIndex: source === 'preparation' ? targetIndex : currentPlayerIndex,
        targetPlayerIndex: targetIndex,
        garmentSlot: slot,
        garment: { styleId: garment.styleId, color: garment.color },
        garmentId: garment.id,
        action: 'removed',
        source,
        cardId: source === 'card' ? activeCard?.id : undefined,
        round: currentRound,
        timestamp: Date.now(),
      });
      if (source === 'penalty' || (source === 'card' && !currentTriggerRef.current)) {
        setDynamicClothingScheduler((current) => consumeScheduledRemoval(current, targetIndex));
      }
      if (source === 'card') finalizeCardCompletion(true, nextOutfits);
      else if (source === 'penalty') finalizeSkippedTurn(nextOutfits);
    });
  };

  const handleContinueWithoutRemoval = () => {
    const source = removalRequest?.source ?? (showDualRemovalDialog ? 'card' : null);
    if (!source) return;
    setRemovalRequest(null);
    setShowDualRemovalDialog(false);
    if (source === 'card') finalizeCardCompletion();
    else if (source === 'penalty') finalizeSkippedTurn();
  };

  const handleConfirmDualRemoval = (firstSlot: GarmentSlot, secondSlot: GarmentSlot) => {
    if (!activeCard || completionCommittedRef.current || !showDualRemovalDialog || scene) return;
    const result = removeGarmentsFromBoth(outfitStates, firstSlot, secondSlot);
    if (!result) {
      setLiveMessage('Trang phục đã thay đổi. Hãy chọn lại hai món có thể bỏ.');
      return;
    }
    const announcement = `${player1.name} và ${player2.name} mỗi người đã bỏ một món. Trang phục được cập nhật cùng lúc.`;
    setShowDualRemovalDialog(false);
    playRemovalScene([0, 1], result.outfits, announcement, () => {
      const now = Date.now();
      onUpdateOutfits(result.outfits);
      result.removed.forEach((garment, targetPlayerIndex) => {
        onAddClothingRemovalEvent({
          actorPlayerIndex: currentPlayerIndex,
          targetPlayerIndex: targetPlayerIndex as PlayerIndex,
          garmentSlot: garment.slot,
          garment: { styleId: garment.styleId, color: garment.color },
          garmentId: garment.id,
          action: 'removed',
          source: 'card',
          cardId: activeCard.id,
          round: currentRound,
          timestamp: now,
        });
      });
      // Fixed "both" cards never carry an injected trigger, so each removal
      // consumes the next pending scheduled item of its player.
      setDynamicClothingScheduler((current) => consumeScheduledRemoval(consumeScheduledRemoval(current, 0), 1));
      finalizeCardCompletion(true, result.outfits);
    });
  };

  const handleConfirmSwap = (firstSlot: GarmentSlot, secondSlot: GarmentSlot) => {
    if (!activeCard || scene) return;
    const result = swapGarments(outfitStates, firstSlot, secondSlot);
    if (!result) {
      setLiveMessage('Không thể đổi hai món đã chọn. Trang phục được giữ nguyên.');
      return;
    }
    const announcement = `${player1.name} và ${player2.name} đã đổi ${GARMENT_LABELS[firstSlot].toLocaleLowerCase('vi')} với ${GARMENT_LABELS[secondSlot].toLocaleLowerCase('vi')}.`;
    setShowSwapDialog(false);
    playRemovalScene([0, 1], result.outfits, announcement, () => {
      const now = Date.now();
      onUpdateOutfits(result.outfits);
      result.transferred.forEach((garment, fromIndex) => {
        const targetPlayerIndex = fromIndex as PlayerIndex;
        onAddClothingRemovalEvent({
          actorPlayerIndex: currentPlayerIndex,
          targetPlayerIndex,
          toPlayerIndex: (targetPlayerIndex === 0 ? 1 : 0),
          garmentSlot: garment.slot,
          garment: { styleId: garment.styleId, color: garment.color },
          garmentId: garment.id,
          action: 'transferred',
          source: 'card',
          cardId: activeCard.id,
          round: currentRound,
          timestamp: now,
        });
      });
      result.replaced.forEach((garment, targetIndex) => {
        if (!garment) return;
        onAddClothingRemovalEvent({
          actorPlayerIndex: currentPlayerIndex,
          targetPlayerIndex: targetIndex as PlayerIndex,
          garmentSlot: garment.slot,
          garment: { styleId: garment.styleId, color: garment.color },
          garmentId: garment.id,
          action: 'replaced',
          source: 'card',
          cardId: activeCard.id,
          round: currentRound,
          timestamp: now,
        });
      });
      finalizeCardCompletion(true, result.outfits);
    });
  };

  const advanceNextTurn = (exit: CardExit) => {
    releaseActionFocus();
    setCardExit(exit);
    setClothingJourney((current) => advanceClothingTurn(current));
    soundEngine.stopTimerAlarm();
    didPlayTimerAlarmRef.current = false;
    setLiveMessage('');
    setDrawState('idle');
    setActiveCard(null);
    setCardFlipped(false);
    setIsRevealed(!settings.privacyDefault);
    setTimerSeconds(null);
    setIsTimerRunning(false);
    setHasTimerStarted(false);
    setActiveCardWasRerolled(false);
    setDrawProbabilitySnapshot(null);
    setDrawError(null);
    setRemovalRequest(null);
    setShowPenaltyPrompt(false);
    setShowSwapDialog(false);
    setShowDualRemovalDialog(false);
    onNextTurn();
  };

  const handlePositionDraw = () => {
    if ((journeyPhase !== 'position' && journeyPhase !== 'final') || drawState !== 'idle' || finalChoice) return;
    const selection = selectLuxuryPositionCard({
      cards: availableCards,
      actorIndex: currentPlayerIndex,
      outfits: outfitStates,
      usedCardIds: sessionPositionCardIds,
      luxuryPercent: luxuryIntimacyPercent,
      config: luxuryProgressionConfig,
      accountUnlockedCardIds: unlockedCardIds,
    });
    if (selection.finalCandidates && selection.finalCandidates.length > 0) {
      soundEngine.playShuffle();
      setDrawError(null);
      setGainNotice(null);
      setDrawProbabilitySnapshot({ deck: 'position', probabilities: selection.probabilities });
      setFinalChoice({ candidates: selection.finalCandidates, flips: 1, revealedIds: [] });
      onJourneyPhaseChange('final');
      setLiveMessage(selection.finalCandidates.length === 1
        ? 'Lá cuối đã tới: giữ lá bài để mở.'
        : `Lá cuối đã tới: chọn 1 trong ${selection.finalCandidates.length} lá Have Sex đang úp.`);
      return;
    }
    const nextCard = selection.card;
    if (!nextCard) {
      setActiveCard(null);
      setDrawState('idle');
      setDrawError(selection.missingFinalCard
        ? `Tim Luxury đã đầy nhưng chưa có lá Have Sex phù hợp cho lượt ${currentPlayer.name}.`
        : selection.errorCode === 'no_progress_gain'
          ? 'Bộ bài hiện tại không có điểm Luxury khả dụng.'
          : selection.errorCode === 'no_positive_weight'
            ? `Không có bậc sao Tư thế phù hợp cho lượt ${currentPlayer.name}.`
            : `Không còn lá Tư thế dành cho ${currentPlayerIndex === 0 ? 'Nam' : 'Nữ'} hoặc Cả hai ở lượt này.`);
      return;
    }
    soundEngine.stopTimerAlarm();
    completionCommittedRef.current = false;
    setTimerSeconds(null);
    setIsTimerRunning(false);
    setHasTimerStarted(false);
    setActiveCardWasRerolled(false);
    setActiveCard(null);
    setIsRevealed(!settings.privacyDefault);
    setCardFlipped(false);
    setDrawError(null);
    setGainNotice(null);
    onSessionPositionCardIdsChange(selection.nextUsedCardIds);
    setDrawProbabilitySnapshot({ deck: 'position', probabilities: selection.probabilities });

    startDrawSequence(
      nextCard,
      () => {
        setActiveCard(nextCard);
        setTimerSeconds(resolveCardTimerSeconds(nextCard));
        setDrawState('drawing');
        onDrawPositionCard(nextCard.id);
        if (!settings.privacyDefault) onOpenPositionCard(nextCard.id);
        onJourneyPhaseChange(nextCard.position?.family === 'have_sex' ? 'final' : 'position');
      },
      () => {
        setCardFlipped(true);
        setDrawState('drawn');
      },
    );
  };

  const handleDraw = () => {
    if (drawState !== 'idle' || scene) return;
    if (journeyPhase === 'standard') handleStartDraw();
    else handlePositionDraw();
  };

  const sharedStarBalance = getSharedStarBalance(playerRewards);
  const finalFlipCost = (flips: 2 | 3, current: FinalChoiceState['flips']): number => (
    flips === 3
      ? current === 2 ? FINAL_FLIP_THREE_STAR_COST - FINAL_FLIP_TWO_STAR_COST : FINAL_FLIP_THREE_STAR_COST
      : FINAL_FLIP_TWO_STAR_COST
  );

  const chooseFinalCard = (card: CardItem) => {
    setFinalChoice(null);
    completionCommittedRef.current = false;
    soundEngine.playCompleteSound();
    soundEngine.haptic([40, 50, 40, 50, 120]);
    if (!reduceMotion) fireFinalConfetti();
    setActiveCard(card);
    setIsRevealed(true);
    setCardFlipped(true);
    setDrawState('drawn');
    setTimerSeconds(null);
    setHasTimerStarted(false);
    setIsTimerRunning(false);
    setDrawError(null);
    onDrawPositionCard(card.id);
    onOpenPositionCard(card.id);
    setLiveMessage('Hai bạn đã chọn lá cuối.');
  };

  const handleBuyFinalFlips = (flips: 2 | 3) => {
    if (!finalChoice || finalChoice.flips >= flips || finalChoice.candidates.length < flips) return;
    const cost = finalFlipCost(flips, finalChoice.flips);
    const spend = spendSharedStars(playerRewards, currentPlayerIndex, cost);
    if (!spend) {
      setDrawError(`Ví chung cần ${cost}★ để lật thêm lá.`);
      return;
    }
    onPlayerRewardsChange(spend.rewards);
    const now = Date.now();
    spend.paid.forEach((amount, index) => {
      if (amount > 0) {
        onAddRewardEvent({
          kind: 'final_card_flips',
          playerIndex: index as PlayerIndex,
          amount: -amount,
          round: currentRound,
          timestamp: now,
        });
      }
    });
    setCardDirectorState((current) => recordDirectorStarsSpent(current, cost));
    setDrawError(null);
    soundEngine.playCardFlip();
    setFinalChoice({
      ...finalChoice,
      flips,
      revealedIds: flips === 3 ? finalChoice.candidates.map((card) => card.id) : finalChoice.revealedIds,
    });
    setLiveMessage(flips === 3 ? 'Đã lật cả 3 lá. Hãy chọn 1 lá.' : 'Hai bạn được lật 2 lá rồi chọn 1.');
  };

  const handleFlipFinalCard = (card: CardItem) => {
    if (!finalChoice || finalChoice.flips === 1) return;
    if (finalChoice.revealedIds.includes(card.id) || finalChoice.revealedIds.length >= finalChoice.flips) return;
    soundEngine.playCardFlip();
    setFinalChoice({ ...finalChoice, revealedIds: [...finalChoice.revealedIds, card.id] });
  };

  const handleEnterPositionJourney = () => {
    if (outfitStates.some((outfit) => getOutfitStage(outfit) === 'dressed')) {
      setLiveMessage('Cả hai cần ít nhất đạt trạng thái chỉ còn đồ lót trước khi vào Bộ Tư thế.');
      return;
    }
    soundEngine.stopTimerAlarm();
    setLiveMessage('');
    setDrawError(null);
    setActiveCard(null);
    setDrawState('idle');
    setIsRevealed(false);
    setTimerSeconds(null);
    setIsTimerRunning(false);
    setHasTimerStarted(false);
    onJourneyPhaseChange('position');
  };

  const handlePositionAdvance = (completed: boolean) => {
    if (!activeCard || completionCommittedRef.current) return;
    if (completed) {
      handleComplete();
      return;
    }
    completionCommittedRef.current = true;
    recordResolution(activeCard, 'skipped');
    soundEngine.playTick();
    advanceNextTurn('skipped');
  };

  const preparationTargetIndex = ([0, 1] as const).find(
    (index) => getRemovableGarments(outfitStates[index]).length > 0,
  );
  const handlePrepareNextGarment = () => {
    if (preparationTargetIndex === undefined) return;
    setRemovalRequest({ source: 'preparation', targetIndex: preparationTargetIndex });
  };

  const isPositionCard = activeCard ? getCardDeck(activeCard) === 'position' : false;
  const isFinalPositionCard = activeCard?.position?.family === 'have_sex';
  const inPositionDeck = journeyPhase === 'position' || journeyPhase === 'final';
  const removalTargetIndices = activeCard ? getRemovalTargetIndices(activeCard, currentPlayerIndex) : [];
  const completionActionLabel = activeCard?.gameplayEffect?.kind === 'pass_turn'
    ? 'Chuyển lượt'
    : activeCard?.clothingEffect?.kind === 'swap_garments'
    ? 'Chọn 2 món để đổi'
    : activeCard?.clothingEffect?.kind === 'remove_garment'
      ? removalTargetIndices.length === 2
        ? 'Chọn 2 món để cùng bỏ'
        : `Chọn 1 món của ${removalTargetIndices[0] === 0 ? player1.name : player2.name}`
      : 'Đã hoàn thành';
  const heatLevel = (() => {
    if (journeyPhase === 'position_consent') return 5;
    if (journeyPhase === 'standard') {
      const expected = DIFFICULTY_STARS.reduce((sum, star) => sum + star * drawProbabilities.stars[star], 0);
      return Math.min(5, Math.max(1, Math.round(expected || 1)));
    }
    const stars = luxuryDrawProbabilities?.stars;
    const total = stars ? POSITION_DIFFICULTY_STARS.reduce((sum, star) => sum + stars[star], 0) : 0;
    if (!stars || total <= 0) return 5;
    const expected = POSITION_DIFFICULTY_STARS.reduce((sum, star) => sum + star * stars[star], 0) / total;
    return Math.min(5, Math.max(1, Math.round(expected - 5)));
  })();
  const clothingNote = (() => {
    const effect = activeCard?.clothingEffect;
    if (!activeCard || !effect || getCardDeck(activeCard) === 'position') return null;
    if (effect.kind === 'swap_garments') return 'Kèm theo: đổi cho nhau 1 món đồ';
    const targets = getRemovalTargetIndices(activeCard, currentPlayerIndex);
    if (targets.length === 2) return 'Kèm theo: mỗi người cởi 1 món đồ';
    if (targets.length === 0) return null;
    if (targets[0] === currentPlayerIndex) return `Kèm theo: ${currentPlayer.name} tự cởi 1 món đồ`;
    return `Kèm theo: cởi 1 món đồ của ${targets[0] === 0 ? player1.name : player2.name}`;
  })();
  const turnLine = !activeCard
    ? ''
    : isFinalPositionCard
      ? 'Lá cuối của hai bạn'
      : isPositionCard
        ? `Lượt của ${currentPlayer.name}`
        : `${performingPlayer.name} ${activeCard.type === 'truth' ? 'trả lời' : 'thực hiện'}`;
  const canApplyPenaltyGarment = getRemovableGarments(outfitStates[performingPlayerIndex]).length > 0;
  const penaltyLockedReason = intimacyPercent < PENALTY_GARMENT_MIN_PERCENT
    ? `Trước mốc ${PENALTY_GARMENT_MIN_PERCENT}% Tim Hồng, bỏ qua không bị cởi đồ. Hai bạn có thể chọn một hình phạt nhẹ như một nụ hôn hoặc một câu hỏi thay thế.`
    : undefined;

  // What the middle of the table shows right now. Scripts read it from `data-game-state`.
  const positionEmpty = inPositionDeck && !finalChoice && !activeCard && drawState === 'idle' && Boolean(drawError);
  const tableState = journeyPhase === 'position_consent'
    ? 'position-consent'
    : inPositionDeck && finalChoice
      ? 'final-choice'
      : positionEmpty
        ? 'position-empty'
        : drawState === 'selecting_type'
          ? 'choose'
          : drawState === 'shuffling' || drawState === 'drawing'
            ? 'moving'
            : !activeCard
              ? 'idle'
              : !isRevealed
                ? 'hidden'
                : isFinalPositionCard
                  ? 'final'
                  : isPositionCard ? 'position' : 'answer';
  const partnerIndex: PlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
  const partner = partnerIndex === 0 ? player1 : player2;
  const boostPending = pendingDifficultyBoosts.some((boost) => boost.targetPlayerIndex === partnerIndex);
  const boostAffordable = playerRewards[currentPlayerIndex].starBalance >= DIFFICULTY_BOOST_STAR_COST;
  const canDropCard = drawState === 'drawn' && activeCard !== null && !isFinalPositionCard;

  const handleReveal = () => {
    if (!activeCard) return;
    releaseActionFocus();
    soundEngine.playTick();
    setIsRevealed(true);
    if (isPositionCard) onOpenPositionCard(activeCard.id);
  };

  const handleDropCard = () => {
    setShowPause(false);
    if (!canDropCard) return;
    if (isPositionCard) handlePositionAdvance(false);
    else finalizeSkippedTurn();
  };

  const openPause = useCallback(() => setShowPause(true), []);
  useTableShortcuts(!isPaused && scene === null, () => { if (!navigationLocked) openPause(); });

  // The button a player needs next gets the focus when the old one is gone,
  // so the whole game can be played with Space or Enter.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isPaused || scene) return;
    const focusMainAction = () => {
      if (isDialogOpen() || (document.activeElement && document.activeElement !== document.body)) return;
      const button = [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-main-action]') ?? [])]
        .find((element) => element.getClientRects().length > 0);
      button?.focus({ preventScroll: true });
    };
    const frame = window.requestAnimationFrame(focusMainAction);
    // Again once a closing dialog has finished and let go of the focus.
    const timeout = window.setTimeout(focusMainAction, 450);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [tableState, hasTimerStarted, currentRound, isPaused, scene]);

  // Clicks right after the table changes are ignored, so a double click never does two things.
  const lastChangeRef = useRef(0);
  useLayoutEffect(() => {
    lastChangeRef.current = performance.now();
  }, [tableState, currentRound, hasTimerStarted]);
  const guarded = (action: () => void) => () => {
    if (performance.now() - lastChangeRef.current >= TABLE_TIMING.actionGuard) action();
  };

  const renderPanel = (index: PlayerIndex, mobile = false) => (
    <PlayerPanel
      player={index === 0 ? player1 : player2}
      outfitState={displayOutfits[index]}
      rewardState={playerRewards[index]}
      hasPendingDifficultyBoost={pendingDifficultyBoosts.some((boost) => boost.targetPlayerIndex === index)}
      active={currentPlayerIndex === index}
      mood={figureMood}
      spotlit={scene?.targets.includes(index) ?? false}
      mobile={mobile}
    />
  );

  const renderActions = () => {
    if (scene) return <TableActions state="none" />;
    switch (tableState) {
      case 'idle':
        return (
          <TableActions
            state="idle"
            deck={inPositionDeck ? 'position' : 'standard'}
            playerName={currentPlayer.name}
            boost={!inPositionDeck && (boostAffordable || boostPending)
              ? { targetName: partner.name, pending: boostPending, affordable: boostAffordable }
              : null}
            onDraw={guarded(handleDraw)}
            onBoost={guarded(handleQueueDifficultyBoost)}
          />
        );
      case 'choose':
        return <TableActions state="choose" onBack={guarded(() => setDrawState('idle'))} />;
      case 'moving':
        return (
          <TableActions
            state="moving"
            text={inPositionDeck ? `Đang chọn lá cho ${currentPlayer.name}…` : 'Đang xáo bài…'}
            onSkip={skipDrawSequence}
          />
        );
      case 'hidden':
        return <TableActions state="hidden" luxury={isPositionCard} onReveal={guarded(handleReveal)} />;
      case 'answer':
        return (
          <TableActions
            state="answer"
            startSeconds={timerSeconds !== null && !hasTimerStarted ? timerSeconds : null}
            skipLabel={activeCard?.type === 'truth' ? 'Không trả lời' : 'Không thực hiện'}
            completeLabel={completionActionLabel}
            reroll={{
              playerName: performingPlayer.name,
              balance: playerRewards[performingPlayerIndex].starBalance,
              used: activeCardWasRerolled,
            }}
            onSkip={guarded(handleSkip)}
            onStart={guarded(handleTimerControl)}
            onComplete={guarded(handleComplete)}
            onReroll={guarded(handleReroll)}
          />
        );
      case 'position':
        return (
          <TableActions
            state="position"
            completeLabel={completionActionLabel}
            onSkip={guarded(() => handlePositionAdvance(false))}
            onComplete={guarded(() => handlePositionAdvance(true))}
          />
        );
      case 'final':
        return <TableActions state="final" onFinish={guarded(handleComplete)} />;
      default:
        return <TableActions state="none" />;
    }
  };

  const toast = drawError && !positionEmpty
    ? { tone: 'warning' as const, text: drawError }
    : gainNotice && drawState === 'idle' && !scene
      ? { tone: 'gain' as const, text: gainNotice.text, unlocked: gainNotice.unlocked }
      : null;

  return (
    <div
      ref={rootRef}
      className="game-root"
      data-game-state={scene ? 'scene' : tableState}
      data-phase={journeyPhase}
      data-scene={scene ? '' : undefined}
      data-focus={drawState === 'drawn' && !scene ? '' : undefined}
    >
      <GameHeader
        player={currentPlayer}
        playerIndex={currentPlayerIndex}
        round={currentRound}
        targetRounds={settings.roundsMode === 'target' ? settings.targetRounds : null}
        journeyPhase={journeyPhase}
        intimacyPercent={intimacyPercent}
        luxuryPercent={luxuryIntimacyPercent}
        heatLevel={heatLevel}
        oddsAreForOpenCard={drawProbabilitySnapshot !== null}
        drawProbabilities={drawProbabilities}
        luxuryProbabilities={luxuryDrawProbabilities}
        difficultyBoostActive={activeDifficultyBoost !== null}
        locked={navigationLocked}
        isMuted={isMuted}
        coupleName={coupleName}
        reduceMotion={reduceMotion}
        onToggleMute={handleToggleMute}
        onOpenRules={onOpenRules}
        onOpenCollection={onOpenCollection}
        onOpenSummary={onOpenSummary}
        onOpenAccount={onOpenAccountModal}
        onPause={openPause}
        onEnd={() => setShowEndConfirm(true)}
      />

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {drawError || liveMessage || `${currentPlayer.name} đang tới lượt, còn ${getPresentGarmentSlots(outfitStates[currentPlayerIndex]).length} món đồ.`}
      </p>

      <div className="game-toast">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.text}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-8px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              role="status"
              className={`flex max-w-md items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-[0_12px_40px_rgba(0,0,0,.5)] ${
                toast.tone === 'warning'
                  ? 'border-amber-300/45 bg-[#2a1a08] text-amber-100'
                  : 'border-rose-300/40 bg-[#2b101b] text-rose-50'
              }`}
            >
              {toast.tone === 'warning'
                ? <TriangleAlert className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                : <Heart className="h-4 w-4 shrink-0 fill-rose-400/70 text-rose-300" aria-hidden="true" />}
              <span>{toast.text}</span>
              {toast.tone === 'gain' && toast.unlocked && (
                <span className="flex shrink-0 items-center gap-1 text-emerald-200">
                  <LockOpen className="h-4 w-4" aria-hidden="true" /> Lá mới
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="game-outfit-mobile" aria-label="Trang phục hiện tại của hai người chơi">
        {renderPanel(0, true)}
        {renderPanel(1, true)}
      </div>

      <div className="game-stage">
        <div className="game-stage__side">{renderPanel(0)}</div>

        <div className="game-stage__center">
          {tableState === 'position-consent' ? (
            <div className="table-span">
              <PositionConsent
                players={[player1, player2]}
                outfitStates={displayOutfits}
                nextToPrepare={preparationTargetIndex === undefined ? null : preparationTargetIndex === 0 ? player1.name : player2.name}
                reduceMotion={reduceMotion}
                onPrepare={guarded(handlePrepareNextGarment)}
                onFinish={guarded(() => onFinishGame('pink_complete'))}
                onEnter={guarded(handleEnterPositionJourney)}
              />
            </div>
          ) : tableState === 'final-choice' && finalChoice ? (
            <div className="table-span">
              <FinalChoice
                choice={finalChoice}
                sharedStarBalance={sharedStarBalance}
                flipThreeCost={finalFlipCost(3, finalChoice.flips)}
                reduceMotion={reduceMotion}
                onFlip={handleFlipFinalCard}
                onBuyFlips={handleBuyFinalFlips}
                onChoose={chooseFinalCard}
              />
            </div>
          ) : tableState === 'position-empty' ? (
            <div className="table-span">
              <PositionEmpty
                message={drawError ?? ''}
                onPass={guarded(() => advanceNextTurn('skipped'))}
                onFinish={guarded(() => onFinishGame('no_cards'))}
              />
            </div>
          ) : (
            <>
              <div
                className="table-slot"
                data-card-slot
                data-moving={tableState === 'moving' ? '' : undefined}
                onClick={tableState === 'moving' ? skipDrawSequence : undefined}
              >
                <TableDeck
                  kind={inPositionDeck ? 'position' : 'standard'}
                  phase={drawState === 'idle' ? 'idle' : drawState === 'shuffling' ? 'shuffling' : tableState === 'final' ? 'gone' : 'behind'}
                  onDraw={guarded(handleDraw)}
                />
                <AnimatePresence custom={{ exit: cardExit, reduceMotion }}>
                  {activeCard && (drawState === 'drawing' || drawState === 'drawn') && (
                    <TableCard
                      key={`${activeCard.id}:${currentRound}`}
                      card={activeCard}
                      flipped={cardFlipped}
                      quickFlip={quickFlip}
                      revealed={revealedCard !== null}
                      favorite={favorites.includes(activeCard.id)}
                      turnLine={turnLine}
                      clothingNote={clothingNote}
                      revealHint={`Lá bài đang úp để không ai đọc trước. Mở khi ${isPositionCard ? 'cả hai' : performingPlayer.name} đã sẵn sàng.`}
                      timer={timerSeconds === null ? null : { seconds: timerSeconds, started: hasTimerStarted, running: isTimerRunning }}
                      reduceMotion={reduceMotion}
                      onToggleFavorite={() => onToggleFavorite(activeCard.id)}
                      onTimerControl={guarded(handleTimerControl)}
                    />
                  )}
                </AnimatePresence>
                {sparkId > 0 && <CardSpark key={sparkId} />}
                {tableState === 'choose' && (
                  <ChooseType
                    playerName={currentPlayer.name}
                    truthLockedReason={truthLockedReason}
                    dareAvailable={availableDrawTypes.includes('dare')}
                    reduceMotion={reduceMotion}
                    onChoose={(type) => guarded(() => executeDrawCard(type))()}
                  />
                )}
                <TurnStrip player={currentPlayer} round={currentRound} visible={tableState === 'idle'} reduceMotion={reduceMotion} />
              </div>
              {renderActions()}
            </>
          )}
        </div>

        <div className="game-stage__side">{renderPanel(1)}</div>
      </div>

      <AnimatePresence>
        {showPenaltyPrompt && activeCard && (
          <PenaltyPrompt
            playerName={performingPlayer.name}
            playerAvatar={performingPlayer.avatar}
            cardType={activeCard.type}
            penaltyEnabled={settings.penaltyClothingEnabled}
            canRemoveGarment={canApplyPenaltyGarment}
            lockedReason={penaltyLockedReason}
            onReturn={() => setShowPenaltyPrompt(false)}
            onChooseGarment={handlePenaltyGarmentChoice}
            onContinueWithoutPenalty={() => finalizeSkippedTurn()}
          />
        )}
      </AnimatePresence>

      {removalRequest && (
        <GarmentRemovalDialog
          targetName={removalRequest.targetIndex === 0 ? player1.name : player2.name}
          outfitState={outfitStates[removalRequest.targetIndex]}
          source={removalRequest.source}
          onConfirm={handleConfirmRemoval}
          onCancel={handleCancelRemoval}
          onContinueWithoutRemoval={handleContinueWithoutRemoval}
        />
      )}
      {showSwapDialog && (
        <GarmentSwapDialog
          playerNames={[player1.name, player2.name]}
          outfitStates={outfitStates}
          onConfirm={handleConfirmSwap}
          onCancel={() => setShowSwapDialog(false)}
        />
      )}
      {showDualRemovalDialog && (
        <DualGarmentRemovalDialog
          playerNames={[player1.name, player2.name]}
          outfitStates={outfitStates}
          onConfirm={handleConfirmDualRemoval}
          onCancel={() => setShowDualRemovalDialog(false)}
          onContinueWithoutRemoval={handleContinueWithoutRemoval}
        />
      )}
      {showPause && (
        <PauseDialog
          canDropCard={canDropCard}
          reduceMotion={reduceMotion}
          onContinue={() => setShowPause(false)}
          onDropCard={handleDropCard}
          onEnd={() => {
            setShowPause(false);
            setShowEndConfirm(true);
          }}
        />
      )}
      {showEndConfirm && (
        <ConfirmDialog
          icon={<Flag className="h-5 w-5" />}
          title="Kết thúc ván này?"
          description="Hai bạn sẽ chuyển sang phần tổng kết và ván này dừng lại tại đây."
          confirmLabel="Kết thúc ván"
          cancelLabel="Chơi tiếp"
          onCancel={() => setShowEndConfirm(false)}
          onConfirm={() => {
            setShowEndConfirm(false);
            onFinishGame('manual');
          }}
        />
      )}
    </div>
  );
};

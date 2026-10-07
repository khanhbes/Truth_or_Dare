import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Heart,
  Volume2,
  VolumeX,
  BookOpen,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Timer as TimerIcon,
  RotateCcw,
  Sparkles,
  Trophy,
  ChevronRight,
  Flame,
  HelpCircle,
  Zap,
  LockOpen,
  Percent,
  Star,
  Shuffle,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
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
import { LEVEL_INFO } from '../data/cards';
import { soundEngine } from '../utils/audio';
import { getCardIcon, autoAssignIcon } from './CardIcons';
import { PenaltyPrompt } from './PenaltyPrompt';
import { GarmentRemovalDialog } from './GarmentRemovalDialog';
import { GarmentSwapDialog } from './GarmentSwapDialog';
import { DualGarmentRemovalDialog } from './DualGarmentRemovalDialog';
import { OutfitFigure } from './OutfitFigure';
import {
  getRemovalTargetIndices,
} from '../utils/cardSelection';
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
import { resolveCardTimerSeconds } from '../utils/cardTimer';
import {
  advanceClothingTurn,
  clothingEffectFamily,
  createClothingJourney,
  getActiveOpportunity,
  resolveClothingOpportunity,
} from '../utils/clothingJourney';
import {
  createDynamicClothingSchedule,
  getActiveClothingRemovalTarget,
  injectClothingDirective,
  updateDynamicClothingScheduler,
} from '../utils/dynamicClothingScheduler';
import {
  createCardDirectorState,
  recordDirectedCard,
  recordDirectorStarsSpent,
} from '../utils/cardDirector';
import {
  DIFFICULTY_BOOST_STAR_COST,
  REROLL_STAR_COST,
  awardStars,
  refundPendingDifficultyBoost,
  spendReward,
} from '../utils/rewards';
import {
  DIFFICULTY_STARS,
  calculateCompletedCardIntimacy,
  calculateCompletedPositionLuxury,
  deriveDifficultyStars,
  derivePositionDifficultyStars,
  getCardTurnAudience,
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
}

interface PlayerOutfitStatusProps {
  player: Player;
  outfitState: OutfitState;
  rewardState: PlayerRewardState;
  hasPendingDifficultyBoost: boolean;
  active: boolean;
  mobile?: boolean;
}

const OUTFIT_STAGE_COPY = {
  dressed: 'Đang mặc đồ',
  underwear_only: 'Chỉ còn đồ lót',
  empty: 'Hết đồ đã chọn',
} as const;

const AUDIENCE_LABELS = {
  male: 'Nam',
  female: 'Nữ',
  both: 'Cả hai',
} as const;
const POSITION_RECIPIENT_LABELS = { male: 'Lượt Nam', female: 'Lượt Nữ', both: 'Cả hai lượt' } as const;
const POSITION_FAMILY_LABELS = {
  oral: 'Oral sex',
  blowjob: 'Blow',
  handjob: 'Hand',
  have_sex: 'Have sex',
  other: 'Tư thế khác',
} as const;

const getPositionFamilyLabel = (card: CardItem) =>
  card.position?.family === 'other'
    ? card.position.customLabel?.trim() || POSITION_FAMILY_LABELS.other
    : card.position
      ? POSITION_FAMILY_LABELS[card.position.family]
      : '';

const PlayerOutfitStatus: React.FC<PlayerOutfitStatusProps> = React.memo(({
  player,
  outfitState,
  rewardState,
  hasPendingDifficultyBoost,
  active,
  mobile = false,
}) => {
  const stage = getOutfitStage(outfitState);
  const count = getPresentGarmentSlots(outfitState).length;

  return (
    <aside
      className={`game-player-outfit relative overflow-hidden rounded-2xl border px-2.5 py-2.5 text-center transition-all ${mobile ? 'game-player-outfit--mobile' : ''} ${
        active
          ? 'border-rose-400/50 bg-rose-500/[0.08] shadow-[0_0_24px_rgba(255,107,157,0.14)]'
          : 'border-white/10 bg-black/20 opacity-80'
      }`}
      aria-label={`${player.name}: ${OUTFIT_STAGE_COPY[stage]}, còn ${count} món, ví ${rewardState.starBalance} sao${hasPendingDifficultyBoost ? ', đang bị tăng khó' : ''}`}
    >
      <OutfitFigure
        outfit={outfitState.initial}
        state={outfitState}
        active={active}
        compact
        className={mobile ? 'game-outfit-dock' : 'game-outfit-side'}
        ariaLabel={`Hình trang phục hiện tại của ${player.name}`}
      />
      <div className={mobile ? '-mt-1' : 'mt-1'}>
        <div className="truncate text-xs font-bold text-white">{player.avatar} {player.name}</div>
        <div className={`mt-0.5 text-[10px] font-medium ${stage === 'empty' ? 'text-neutral-400' : stage === 'underwear_only' ? 'text-amber-300' : 'text-rose-200'}`}>
          {OUTFIT_STAGE_COPY[stage]} · {count} món
        </div>
        <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-amber-200">
          <Star className="h-3 w-3 fill-amber-300/25" aria-hidden="true" />
          {rewardState.starBalance}★
          {hasPendingDifficultyBoost && (
            <span className="ml-1 rounded-full border border-orange-300/30 bg-orange-500/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-orange-200">
              Tăng khó
            </span>
          )}
        </div>
      </div>
    </aside>
  );
});
PlayerOutfitStatus.displayName = 'PlayerOutfitStatus';

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
}) => {
  const [isMusicOn, setIsMusicOn] = useState(soundEngine.isMusicOn());
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const shouldReduceMotion = useReducedMotion();
  const [showPenaltyPrompt, setShowPenaltyPrompt] = useState(false);
  const [usedCardIds, setUsedCardIds] = useState<string[]>([]);
  const [clothingJourney, setClothingJourney] = useState(createClothingJourney);
  const [dynamicClothingScheduler, setDynamicClothingScheduler] = useState(() =>
    createDynamicClothingSchedule(outfitStates),
  );
  const currentTriggerRef = useRef<{ itemId: string; targetIndex: PlayerIndex } | null>(null);
  const [cardDirectorState, setCardDirectorState] = useState(() =>
    createCardDirectorState(unlockedCardIds),
  );
  const [drawError, setDrawError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string>('');
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);
  const [intimacyGainNotice, setIntimacyGainNotice] = useState<string | null>(null);
  const [removalRequest, setRemovalRequest] = useState<{
    source: 'card' | 'penalty' | 'preparation';
    targetIndex: PlayerIndex;
  } | null>(null);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [showDualRemovalDialog, setShowDualRemovalDialog] = useState(false);

  // Card draw state machine
  const [drawState, setDrawState] = useState<
    'idle' | 'selecting_type' | 'shuffling' | 'drawing' | 'drawn'
  >('idle');
  const [activeCard, setActiveCard] = useState<CardItem | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(!settings.privacyDefault);
  const [cardFlipped, setCardFlipped] = useState<boolean>(false);

  // Timer state for Dares
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [hasTimerStarted, setHasTimerStarted] = useState(false);
  const [activeCardWasRerolled, setActiveCardWasRerolled] = useState(false);
  const [drawProbabilitySnapshot, setDrawProbabilitySnapshot] = useState<
    | { deck: 'standard'; probabilities: JourneyDrawProbabilities }
    | { deck: 'position'; probabilities: LuxuryDrawProbabilities }
    | null
  >(null);
  const didPlayTimerAlarmRef = useRef(false);
  const completionCommittedRef = useRef(false);
  const drawTimeoutsRef = useRef<number[]>([]);
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
  const journeySelectionOptions = useMemo(() => ({
    cards: availableCards,
    actorIndex: currentPlayerIndex,
    outfits: outfitStates,
    usedCardIds,
    levels: settings.levels,
    intimacyPercent,
    config: progressionConfig,
    difficultyBoost: Boolean(activeDifficultyBoost),
    directorState: cardDirectorState,
  }), [
    availableCards, currentPlayerIndex, outfitStates, usedCardIds,
    settings.levels, intimacyPercent, progressionConfig, activeDifficultyBoost, cardDirectorState,
  ]);
  const drawAnalysis = useMemo(
    () => getJourneyDrawAnalysis(journeySelectionOptions),
    [journeySelectionOptions],
  );
  const availableDrawTypes = drawAnalysis.availableTypes;
  const drawProbabilities = drawProbabilitySnapshot?.deck === 'standard'
    ? drawProbabilitySnapshot.probabilities
    : drawAnalysis.probabilities;
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
  const chance = (value: number) => `${Math.round(value * 100)}%`;
  const navigationLocked = drawState === 'shuffling' || drawState === 'drawing';

  useEffect(() => {
    onNavigationLockChange?.(navigationLocked);
  }, [navigationLocked, onNavigationLockChange]);

  useEffect(() => {
    if (isSuspended) {
      if (isTimerRunning) wasTimerRunningBeforeSuspendRef.current = true;
      setIsTimerRunning(false);
      soundEngine.stopTimerAlarm();
      return;
    }
    if (wasTimerRunningBeforeSuspendRef.current && timerSeconds !== null && timerSeconds > 0) {
      wasTimerRunningBeforeSuspendRef.current = false;
      setIsTimerRunning(true);
    }
  }, [isSuspended, isTimerRunning, timerSeconds]);

  // Countdown uses one disposable timeout per second. The alarm is handled by
  // the guarded transition effect below, outside the state updater, so React
  // Strict Mode cannot accidentally schedule it twice.
  useEffect(() => {
    if (isSuspended || !isTimerRunning || timerSeconds === null || timerSeconds <= 0) return;

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
  }, [isSuspended, isTimerRunning, timerSeconds]);

  useEffect(() => {
    if (isSuspended || timerSeconds !== 0 || didPlayTimerAlarmRef.current) return;

    didPlayTimerAlarmRef.current = true;
    setIsTimerRunning(false);
    soundEngine.playTimerAlarm(3000);
    setLiveMessage('Hết giờ. Chuông đang báo trong khoảng 3 giây.');
  }, [isSuspended, timerSeconds]);

  useEffect(
    () => () => {
      drawTimeoutsRef.current.forEach(window.clearTimeout);
      drawTimeoutsRef.current = [];
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

  useEffect(() => {
    if (!unlockNotice) return;
    const timeout = window.setTimeout(() => setUnlockNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [unlockNotice]);

  useEffect(() => {
    if (!intimacyGainNotice) return;
    const timeout = window.setTimeout(() => setIntimacyGainNotice(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [intimacyGainNotice]);

  // Audio Toggles
  const handleToggleMusic = () => {
    const next = soundEngine.toggleBackgroundMusic();
    setIsMusicOn(next);
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleTimerControl = () => {
    if (isSuspended) return;
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
      setDrawError('Không còn thẻ phù hợp với cấp độ và trang phục hiện tại.');
      return;
    }
    if (settings.drawMode === 'choose') {
      setDrawState('selecting_type');
    } else {
      executeDrawCard(null);
    }
  };

  const executeDrawCard = (preferredType: CardType | null) => {
    const selection = selectJourneyCard({
      cards: availableCards,
      preferredType,
      actorIndex: currentPlayerIndex,
      outfits: outfitStates,
      usedCardIds,
      levels: settings.levels,
      intimacyPercent,
      config: progressionConfig,
      difficultyBoost: Boolean(activeDifficultyBoost),
      accountUnlockedCardIds: unlockedCardIds,
      preferredClothingFamily: getActiveOpportunity(clothingJourney, intimacyPercent)?.eventType === 'catch_up'
        ? 'opponent'
        : getActiveOpportunity(clothingJourney, intimacyPercent)?.eventType ?? null,
      clothingHistory: clothingJourney.history,
      firstRemoval: clothingJourney.firstRemoval,
      directorState: cardDirectorState,
    });

    if (!selection.card) {
      setDrawError(selection.errorCode === 'no_progress_gain'
        ? 'Bộ bài hiện tại không có điểm Tim hồng khả dụng.'
        : selection.errorCode === 'no_positive_weight'
          ? 'Không có loại hoặc bậc sao phù hợp ở mốc thân mật này.'
          : preferredType
          ? `Không còn thẻ ${preferredType === 'truth' ? 'Sự Thật' : 'Thử Thách'} phù hợp.`
          : 'Không còn thẻ phù hợp với trạng thái trang phục hiện tại.',
      );
      setDrawState(preferredType ? 'selecting_type' : 'idle');
      return;
    }

    let randomCard = selection.card;
    const dueTrigger = getActiveClothingRemovalTarget(
      dynamicClothingScheduler,
      intimacyPercent,
      outfitStates,
    );
    if (dueTrigger) {
      currentTriggerRef.current = dueTrigger;
      const targetName = dueTrigger.targetIndex === 0 ? player1.name : player2.name;
      randomCard = injectClothingDirective(
        randomCard,
        currentPlayerIndex,
        dueTrigger.targetIndex,
        targetName,
      );
    } else {
      currentTriggerRef.current = null;
    }

    completionCommittedRef.current = false;
    setCardDirectorState((current) => recordDirectedCard(current, randomCard));
    setActiveCardWasRerolled(false);
    setUsedCardIds(selection.nextUsedCardIds);
    setDrawProbabilitySnapshot({ deck: 'standard', probabilities: selection.probabilities });
    setDrawError(null);
    setDrawState('shuffling');
    setTimerSeconds(null);
    setHasTimerStarted(false);
    setIsTimerRunning(false);
    soundEngine.playShuffle();
    if (activeDifficultyBoost) {
      onPendingDifficultyBoostsChange(
        pendingDifficultyBoosts.filter((boost) => boost !== activeDifficultyBoost),
      );
      setLiveMessage(`Lượt tăng khó của ${activeDifficultyBoost.ownerPlayerIndex === 0 ? player1.name : player2.name} đã được áp dụng.`);
    }

    scheduleDrawStep(() => {
      setActiveCard(randomCard);
      setDrawState('drawing');
      setIsRevealed(!settings.privacyDefault);
      setCardFlipped(false);

      // Trigger 3D flip animation
      scheduleDrawStep(() => {
        setCardFlipped(true);
        soundEngine.playCardFlip();
        setDrawState('drawn');

        // A card may override, disable or inherit the configured duration for
        // its Truth/Action type.
        const cardTimerSeconds = resolveCardTimerSeconds(randomCard);
        if (cardTimerSeconds !== null) {
          soundEngine.stopTimerAlarm();
          didPlayTimerAlarmRef.current = false;
          setTimerSeconds(cardTimerSeconds);
          setHasTimerStarted(false);
          setIsTimerRunning(false);
        } else {
          soundEngine.stopTimerAlarm();
          didPlayTimerAlarmRef.current = false;
          setTimerSeconds(null);
          setHasTimerStarted(false);
          setIsTimerRunning(false);
        }
      }, 500);
    }, 900);
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
      cards: availableCards,
      preferredType: settings.drawMode === 'choose' ? activeCard.type : null,
      actorIndex: currentPlayerIndex,
      outfits: outfitStates,
      usedCardIds,
      excludedCardIds: [activeCard.id],
      levels: settings.levels,
      intimacyPercent,
      config: progressionConfig,
      accountUnlockedCardIds: unlockedCardIds,
      preferredClothingFamily: getActiveOpportunity(clothingJourney, intimacyPercent)?.eventType ?? null,
      clothingHistory: clothingJourney.history,
      firstRemoval: clothingJourney.firstRemoval,
      directorState: cardDirectorState,
    });
    if (!selection.card) {
      setDrawError('Không còn lá khác phù hợp để đổi. Sao của bạn được giữ nguyên.');
      return;
    }

    const previousCardId = activeCard.id;
    let replacement = selection.card;
    if (currentTriggerRef.current) {
      const targetName = currentTriggerRef.current.targetIndex === 0 ? player1.name : player2.name;
      replacement = injectClothingDirective(
        replacement,
        currentPlayerIndex,
        currentTriggerRef.current.targetIndex,
        targetName,
      );
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
    setActiveCard(null);
    setCardFlipped(false);
    setDrawState('shuffling');
    soundEngine.playShuffle();

    scheduleDrawStep(() => {
      setActiveCard(replacement);
      setDrawState('drawing');
      setIsRevealed(!settings.privacyDefault);
      scheduleDrawStep(() => {
        setCardFlipped(true);
        setDrawState('drawn');
        soundEngine.playCardFlip();
        setTimerSeconds(resolveCardTimerSeconds(replacement));
        setHasTimerStarted(false);
        setIsTimerRunning(false);
        setActiveCardWasRerolled(true);
      }, 400);
    }, 650);
  };

  const fireCompletionFeedback = () => {
    soundEngine.playCompleteSound();
    if (!shouldReduceMotion) {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B9D', '#D4AF37', '#FF1493', '#FFF'],
      });
    }
  };

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

  const finalizeCompletedTurn = (includeCardRemovalBonus = false) => {
    if (!activeCard || completionCommittedRef.current) return;
    completionCommittedRef.current = true;
    recordResolution(activeCard, 'completed');
    fireCompletionFeedback();
    if (!unlockedCardIds.includes(activeCard.id)) {
      onUnlockCard(activeCard.id);
      setUnlockNotice(`Đã mở khóa lá bài mới trong Bộ sưu tập`);
    }
    const gain = calculateCompletedCardIntimacy(
      intimacyPercent,
      activeCard,
      progressionConfig,
      includeCardRemovalBonus,
    );
    const nextIntimacy = gain.nextPercent;
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
    setIntimacyGainNotice(
      `+${appliedTotal}% thân mật · +${earnedStars}★ cho ${performingPlayer.name}${appliedRemoval > 0 ? ` · gồm +${appliedRemoval}% bỏ đồ` : ''}`,
    );
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
    if (nextIntimacy >= 100 && outfitStates.every((outfit) => getOutfitStage(outfit) !== 'dressed')) {
      soundEngine.stopTimerAlarm();
      setIsTimerRunning(false);
      setTimerSeconds(null);
      setActiveCard(null);
      setDrawState('idle');
      setCardFlipped(false);
      setIsRevealed(true);
      onJourneyPhaseChange('position_consent');
      return;
    }
    if (nextIntimacy >= 100) {
      setLiveMessage('Tim hồng đã đầy. Tiếp tục Standard để cả hai đạt trạng thái phù hợp cho Bộ Tư thế.');
    }
    advanceNextTurn();
  };

  const finalizeCompletedPosition = () => {
    if (!activeCard || completionCommittedRef.current) return;
    completionCommittedRef.current = true;
    recordResolution(activeCard, 'completed');
    fireCompletionFeedback();
    if (!unlockedCardIds.includes(activeCard.id)) {
      onUnlockCard(activeCard.id);
      setUnlockNotice('Đã mở khóa lá Tư thế mới trong Bộ sưu tập');
    }
    const gain = calculateCompletedPositionLuxury(
      luxuryIntimacyPercent,
      activeCard,
      luxuryProgressionConfig,
    );
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
    setIntimacyGainNotice(`+${gain.totalApplied}% Luxury · ${derivePositionDifficultyStars(activeCard)}★`);
    advanceNextTurn();
  };

  const finalizeCardCompletion = (includeCardRemovalBonus = false) => {
    if (activeCard && getCardDeck(activeCard) === 'position') finalizeCompletedPosition();
    else finalizeCompletedTurn(includeCardRemovalBonus);
  };

  const finalizeSkippedTurn = () => {
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
    advanceNextTurn();
  };

  // Action: Complete Challenge
  const handleComplete = () => {
    if (!activeCard || completionCommittedRef.current) return;
    if (timerSeconds !== null && !hasTimerStarted && activeCard.position?.family !== 'have_sex') {
      setLiveMessage('Hãy bấm Bắt đầu thực hiện trước khi xác nhận kết quả.');
      return;
    }
    soundEngine.stopTimerAlarm();
    setIsTimerRunning(false);
    if (activeCard.position?.family === 'have_sex') {
      completionCommittedRef.current = true;
      recordResolution(activeCard, 'final_viewed');
      if (!unlockedCardIds.includes(activeCard.id)) {
        onUnlockCard(activeCard.id);
        setUnlockNotice('Đã mở khóa lá Have Sex trong Bộ sưu tập');
      }
      onFinishGame('have_sex');
      return;
    }
    if (activeCard.gameplayEffect?.kind === 'pass_turn') {
      completionCommittedRef.current = true;
      recordResolution(activeCard, 'passed');
      if (!unlockedCardIds.includes(activeCard.id)) onUnlockCard(activeCard.id);
      setLiveMessage(`${currentPlayer.name} đã chuyển lượt theo nội dung lá bài.`);
      advanceNextTurn();
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
    if (!activeCard || completionCommittedRef.current) return;
    if (timerSeconds !== null && !hasTimerStarted) {
      setLiveMessage('Hãy bấm Bắt đầu thực hiện trước khi chọn không hoàn thành.');
      return;
    }
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
    if (!removalRequest) return;
    const targetState = outfitStates[removalRequest.targetIndex];
    const garment = getEquippedGarment(targetState, slot);
    const nextTargetState = removeGarment(targetState, slot);
    if (!garment || nextTargetState === targetState) return;

    const nextOutfits: [OutfitState, OutfitState] = [outfitStates[0], outfitStates[1]];
    nextOutfits[removalRequest.targetIndex] = nextTargetState;
    onUpdateOutfits(nextOutfits);
    const targetName = removalRequest.targetIndex === 0 ? player1.name : player2.name;
    setLiveMessage(
      `${targetName} đã bỏ ${GARMENT_LABELS[slot].toLocaleLowerCase('vi')}, còn ${getPresentGarmentSlots(nextTargetState).length} món.`,
    );
    onAddClothingRemovalEvent({
      actorPlayerIndex: removalRequest.source === 'preparation'
        ? removalRequest.targetIndex
        : currentPlayerIndex,
      targetPlayerIndex: removalRequest.targetIndex,
      garmentSlot: slot,
      garment: { styleId: garment.styleId, color: garment.color },
      garmentId: garment.id,
      action: 'removed',
      source: removalRequest.source,
      cardId: removalRequest.source === 'card' ? activeCard?.id : undefined,
      round: currentRound,
      timestamp: Date.now(),
    });

    const source = removalRequest.source;
    setRemovalRequest(null);
    if (source === 'card') finalizeCardCompletion(true);
    else if (source === 'penalty') finalizeSkippedTurn();
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
    if (!activeCard || completionCommittedRef.current || !showDualRemovalDialog) return;
    const result = removeGarmentsFromBoth(outfitStates, firstSlot, secondSlot);
    if (!result) {
      setLiveMessage('Trang phục đã thay đổi. Hãy chọn lại hai món có thể bỏ.');
      return;
    }
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
    setShowDualRemovalDialog(false);
    setLiveMessage(`${player1.name} và ${player2.name} mỗi người đã bỏ một món. Trang phục được cập nhật cùng lúc.`);
    finalizeCardCompletion(true);
  };

  const handleConfirmSwap = (firstSlot: GarmentSlot, secondSlot: GarmentSlot) => {
    if (!activeCard) return;
    const result = swapGarments(outfitStates, firstSlot, secondSlot);
    if (!result) {
      setLiveMessage('Không thể đổi hai món đã chọn. Trang phục được giữ nguyên.');
      return;
    }
    onUpdateOutfits(result.outfits);
    const now = Date.now();
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
    setShowSwapDialog(false);
    setLiveMessage(`${player1.name} và ${player2.name} đã đổi ${GARMENT_LABELS[firstSlot].toLocaleLowerCase('vi')} với ${GARMENT_LABELS[secondSlot].toLocaleLowerCase('vi')}.`);
    finalizeCardCompletion(true);
  };

  const advanceNextTurn = () => {
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
    if ((journeyPhase !== 'position' && journeyPhase !== 'final') || drawState !== 'idle') return;
    const selection = selectLuxuryPositionCard({
      cards: availableCards,
      actorIndex: currentPlayerIndex,
      outfits: outfitStates,
      usedCardIds: sessionPositionCardIds,
      luxuryPercent: luxuryIntimacyPercent,
      config: luxuryProgressionConfig,
    });
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
    setIsRevealed(false);
    setCardFlipped(false);
    setDrawState('shuffling');
    setDrawError(null);
    onSessionPositionCardIdsChange(selection.nextUsedCardIds);
    setDrawProbabilitySnapshot({ deck: 'position', probabilities: selection.probabilities });
    soundEngine.playShuffle();

    scheduleDrawStep(() => {
      setActiveCard(nextCard);
      setTimerSeconds(resolveCardTimerSeconds(nextCard));
      setDrawState('drawing');
      onDrawPositionCard(nextCard.id);
      onJourneyPhaseChange(nextCard.position?.family === 'have_sex' ? 'final' : 'position');
      scheduleDrawStep(() => {
        setCardFlipped(true);
        setDrawState('drawn');
        soundEngine.playCardFlip();
      }, shouldReduceMotion ? 80 : 450);
    }, shouldReduceMotion ? 100 : 750);
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
    if (timerSeconds !== null && !hasTimerStarted) {
      setLiveMessage('Hãy bấm Bắt đầu thực hiện trước khi xác nhận kết quả.');
      return;
    }
    if (completed) {
      handleComplete();
      return;
    }
    completionCommittedRef.current = true;
    recordResolution(activeCard, 'skipped');
    soundEngine.playTick();
    advanceNextTurn();
  };

  const preparationTargetIndex = ([0, 1] as const).find(
    (index) => getRemovableGarments(outfitStates[index]).length > 0,
  );
  const outfitsPrepared = outfitStates.every(
    (outfit) => getPresentGarmentSlots(outfit).length === 0,
  );
  const handlePrepareNextGarment = () => {
    if (preparationTargetIndex === undefined) return;
    setRemovalRequest({ source: 'preparation', targetIndex: preparationTargetIndex });
  };

  const isFavorited = activeCard ? favorites.includes(activeCard.id) : false;
  const activeDeck = activeCard ? getCardDeck(activeCard) : 'standard';
  const isPositionCard = activeDeck === 'position';
  const isFinalPositionCard = activeCard?.position?.family === 'have_sex';
  const isMythicPositionCard = isPositionCard && activeCard?.position?.rarity === 'mythic';
  const activeIconScale = Math.min(1.8, Math.max(0.5, activeCard?.appearance?.iconScale ?? 1));
  const activeTextScale = Math.min(1.5, Math.max(0.75, activeCard?.appearance?.textScale ?? 1));
  const activeIconTextGap = Math.min(48, Math.max(0, activeCard?.appearance?.iconTextGap ?? 8));
  const activeIconScaleStyle = { transform: `scale(${activeIconScale})` };
  const activeIconSpacingStyle = {
    marginTop: `${Math.max(0, activeIconScale - 1) * 24}px`,
    marginBottom: `${activeIconTextGap + Math.max(0, activeIconScale - 1) * 16}px`,
  };
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
  const canApplyPenaltyGarment = getRemovableGarments(outfitStates[performingPlayerIndex]).length > 0;

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 py-4 min-h-[92vh] flex flex-col justify-between">
      {/* HEADER: Top Bar Stats & Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 glass-dark rounded-2xl px-4 py-3 border border-rose-500/20 shadow-lg">
        {/* Current Turn Badge */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-md border"
            style={{
              borderColor: currentPlayerIndex === 0 ? '#FF6B9D' : '#D4AF37',
              backgroundColor:
                currentPlayerIndex === 0 ? 'rgba(255,107,157,0.15)' : 'rgba(212,175,55,0.15)',
            }}
          >
            {currentPlayer.avatar}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">
              Đang tới lượt
            </div>
            <div className="font-serif-romantic text-base font-bold text-white flex items-center gap-1.5">
              <span>{currentPlayer.name}</span>
              <span className={`w-2 h-2 rounded-full bg-emerald-400 inline-block ${shouldReduceMotion ? '' : 'animate-ping'}`} />
            </div>
          </div>
        </div>

        {/* Round Progress Bar */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-amber-200/90 font-medium mb-1 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Lượt {currentRound}
              {settings.roundsMode === 'target' ? ` / ${settings.targetRounds}` : ''}
            </span>
          </div>
          {settings.roundsMode === 'target' && (
            <div className="w-28 sm:w-36 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-gradient transition-all duration-500"
                style={{
                  width: `${Math.min(100, (currentRound / settings.targetRounds) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900/80 border border-neutral-700/60 text-neutral-300 hover:text-white transition-all"
            title="Âm thanh"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            type="button"
            onClick={onOpenRules}
            disabled={navigationLocked}
            aria-label="Cách chơi và luật phạt"
            title="Cách chơi & luật phạt"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900/80 border border-neutral-700/60 text-rose-300 hover:border-rose-400/50 hover:text-rose-100 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCollection}
            disabled={navigationLocked}
            aria-label="Mở bộ sưu tập thẻ"
            className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-neutral-900/80 px-3 border border-neutral-700/60 text-amber-300 hover:text-amber-100 transition-all text-xs"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Bộ sưu tập</span>
          </button>

          <button
            onClick={onOpenSummary}
            disabled={navigationLocked}
            aria-label="Mở tổng kết và thống kê"
            className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-rose-950/60 px-3 border border-rose-500/30 text-rose-300 hover:text-rose-100 transition-all text-xs"
          >
            <Trophy className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Thống kê</span>
          </button>

          {onOpenAccountModal && (
            <button
              type="button"
              onClick={onOpenAccountModal}
              disabled={navigationLocked}
              aria-label="Tài khoản và đồng bộ"
              title={coupleName ? `Tài khoản: ${coupleName}` : 'Đăng nhập tài khoản'}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-neutral-900/80 px-2.5 border border-rose-500/30 text-rose-200 hover:border-rose-400 hover:text-white transition-all text-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline max-w-[110px] truncate">{coupleName || 'Tài khoản'}</span>
            </button>
          )}
        </div>
      </div>

      <section className="mt-3 px-1" aria-label="Tiến trình thân mật hai giai đoạn">
        <div className="mb-1.5 flex items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative grid h-8 w-8 place-items-center" aria-hidden="true">
              <Heart className="absolute h-7 w-7 fill-rose-500/80 text-rose-300" />
              {journeyPhase !== 'standard' && (
                <Heart className="absolute h-5 w-5 fill-[#d7b1ff]/35 text-[#f0d7ff] drop-shadow-[0_0_7px_rgba(232,164,140,.55)]" />
              )}
            </span>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-200/75">Hành trình thân mật</span>
              <p className="mt-0.5 text-[10px] text-neutral-500">
                {journeyPhase === 'standard' ? 'Hoàn thành để mở Tim Luxury' : 'Tim hồng đã đầy · đang tích lũy Luxury'}
              </p>
            </div>
          </div>
          <strong className={`font-serif-romantic text-xl ${journeyPhase === 'standard' ? 'text-rose-200' : 'text-[#f1d6ff]'}`}>
            {journeyPhase === 'standard' ? intimacyPercent : luxuryIntimacyPercent}%
          </strong>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full border border-white/10 bg-black/35">
          <motion.div
            initial={false}
            animate={{ width: `${intimacyPercent}%` }}
            transition={{ duration: shouldReduceMotion ? 0.08 : 0.7, ease: 'easeOut' }}
            role="progressbar"
            aria-label={`Tim hồng ${intimacyPercent} phần trăm`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={intimacyPercent}
            className="absolute inset-y-0 left-0 rounded-full bg-[#f9a8d4] shadow-[0_0_10px_rgba(249,168,212,.25)]"
          />
          {journeyPhase !== 'standard' && (
            <motion.div
              initial={false}
              animate={{ width: `${luxuryIntimacyPercent}%` }}
              transition={{ duration: shouldReduceMotion ? 0.08 : 0.8, ease: 'easeOut' }}
              role="progressbar"
              aria-label={`Tim Luxury ${luxuryIntimacyPercent} phần trăm`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={luxuryIntimacyPercent}
              className="luxury-heart-fill absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#e8a48c,#d7b1ff,#f4e8ff,#cda95c)] shadow-[0_0_20px_rgba(215,177,255,.5)]"
            />
          )}
        </div>
      </section>

      <section
        aria-label="Tỉ lệ xuất hiện thẻ ở lượt hiện tại"
        className="mt-3 grid gap-2 border-b border-white/[0.07] px-1 pb-3 text-[10px] text-neutral-400 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-4 sm:text-xs"
      >
        <div className="flex items-center gap-2 font-semibold text-neutral-300">
          <Percent className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          <span>{drawProbabilitySnapshot ? 'Tỉ lệ lúc rút' : 'Tỉ lệ lượt này'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
          {journeyPhase === 'standard' ? (
            <>
              {activeDifficultyBoost && (
                <span className="rounded-full border border-orange-300/30 bg-orange-500/10 px-2 py-0.5 font-bold text-orange-200">
                  Tăng khó +1 bậc
                </span>
              )}
              <span>Sự thật <strong className="text-blue-200">{chance(drawProbabilities.types.truth)}</strong></span>
              <span>Thử thách <strong className="text-rose-200">{chance(drawProbabilities.types.dare)}</strong></span>
              <span aria-hidden="true" className="hidden text-white/15 sm:inline">|</span>
              {DIFFICULTY_STARS.map((star) => (
                <span key={star} className={`text-xs font-semibold ${drawProbabilities.stars[star] <= 0 ? 'opacity-35' : ''}`}>
                  {star}★ <strong className="text-amber-200">{chance(drawProbabilities.stars[star])}</strong>
                </span>
              ))}
            </>
          ) : (
            <>
              <span className={`rounded-full border border-[#e8a48c]/25 bg-[#e8a48c]/10 px-2 py-0.5 text-xs font-bold text-[#f4e8ff] ${luxuryDrawProbabilities.finalCardChance <= 0 ? 'opacity-35' : ''}`}>
                Have Sex <strong>{chance(luxuryDrawProbabilities.finalCardChance)}</strong>
              </span>
              <span aria-hidden="true" className="hidden text-white/15 sm:inline">|</span>
              {POSITION_DIFFICULTY_STARS.map((star) => (
                <span key={star} className={`text-xs font-semibold ${luxuryDrawProbabilities.stars[star] <= 0 ? 'opacity-25' : ''}`}>
                  {star}★ <strong className="text-[#ead2ff]">{chance(luxuryDrawProbabilities.stars[star])}</strong>
                </span>
              ))}
            </>
          )}
        </div>
      </section>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {drawError || liveMessage || `${currentPlayer.name} đang tới lượt, còn ${getPresentGarmentSlots(outfitStates[currentPlayerIndex]).length} món đồ.`}
      </p>

      {drawError && (
        <div className="mx-auto mt-3 max-w-xl rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-center text-xs font-medium text-amber-200" role="status">
          {drawError}
        </div>
      )}

      <AnimatePresence>
        {(unlockNotice || intimacyGainNotice) && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            role="status"
            className="mx-auto mt-3 flex max-w-md items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-950/80 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,.12)]"
          >
            <LockOpen className="h-4 w-4 shrink-0 text-emerald-300" />
            {intimacyGainNotice || unlockNotice}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="game-outfit-mobile" aria-label="Trang phục hiện tại của hai người chơi">
        <PlayerOutfitStatus player={player1} outfitState={outfitStates[0]} rewardState={playerRewards[0]} hasPendingDifficultyBoost={pendingDifficultyBoosts.some((boost) => boost.targetPlayerIndex === 0)} active={currentPlayerIndex === 0} mobile />
        <PlayerOutfitStatus player={player2} outfitState={outfitStates[1]} rewardState={playerRewards[1]} hasPendingDifficultyBoost={pendingDifficultyBoosts.some((boost) => boost.targetPlayerIndex === 1)} active={currentPlayerIndex === 1} mobile />
      </div>

      {/* MAIN GAME TABLE AREA */}
      <div className="game-table-stage my-auto py-6">
        <div className="game-outfit-desktop">
          <PlayerOutfitStatus player={player1} outfitState={outfitStates[0]} rewardState={playerRewards[0]} hasPendingDifficultyBoost={pendingDifficultyBoosts.some((boost) => boost.targetPlayerIndex === 0)} active={currentPlayerIndex === 0} />
        </div>
        <div className="game-table-stage__center">
        {journeyPhase === 'position_consent' && (
          <motion.section
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-labelledby="position-consent-title"
            className="position-gate w-full max-w-md overflow-hidden rounded-[1.75rem] border border-[#e2c275]/40 bg-[linear-gradient(160deg,rgba(7,11,24,.98),rgba(16,34,64,.94))] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,.45)]"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#e2c275]/50 bg-[#e2c275]/10 text-2xl text-[#f7e7b0]">
              ✦
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#e2c275]/75">Mốc 100%</p>
            <h2 id="position-consent-title" className="mt-2 font-serif-romantic text-3xl font-bold text-[#fff4d6]">
              Bộ Tư thế đã mở
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-slate-300">
              Chỉ tiếp tục nếu cả hai vẫn tự nguyện. Mỗi lá đều có thể bỏ qua, đổi ý hoặc dừng mà không bị phạt.
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3 text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e2c275]/75">Chuẩn bị trước khi tiếp tục</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <span>{player1.name}: <strong className="text-white">{getPresentGarmentSlots(outfitStates[0]).length} món</strong></span>
                <span>{player2.name}: <strong className="text-white">{getPresentGarmentSlots(outfitStates[1]).length} món</strong></span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                Bỏ từng món theo đúng lớp và xác nhận. Đây chỉ là trạng thái của ván hiện tại, không thay đổi trang phục mặc định.
              </p>
              {!outfitsPrepared && (
                <button
                  type="button"
                  onClick={handlePrepareNextGarment}
                  className="mt-3 min-h-11 w-full rounded-full border border-[#e2c275]/35 bg-[#e2c275]/10 px-4 text-xs font-semibold text-[#fff4d6] transition-colors hover:bg-[#e2c275]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7e7b0]"
                >
                  Chọn món tiếp theo của {preparationTargetIndex === 0 ? player1.name : player2.name}
                </button>
              )}
              {outfitsPrepared && (
                <p role="status" className="mt-3 text-center text-xs font-semibold text-emerald-200">✓ Cả hai đã sẵn sàng</p>
              )}
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onFinishGame('pink_complete')}
                className="min-h-12 rounded-full border border-white/15 bg-black/20 px-4 text-xs font-semibold text-slate-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Kết thúc tại đây
              </button>
              <button
                type="button"
                onClick={handleEnterPositionJourney}
                disabled={!outfitsPrepared}
                className="min-h-12 rounded-full bg-[linear-gradient(135deg,#f7e7b0,#cda95c)] px-4 text-xs font-bold text-[#08101f] shadow-[0_0_24px_rgba(226,194,117,.25)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7e7b0] disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transform-none"
              >
                Cả hai đồng ý, tiếp tục
              </button>
            </div>
            <p className="mt-4 text-[10px] font-medium text-[#f7e7b0]/65">Nghe “Dừng” là dừng ngay.</p>
          </motion.section>
        )}

        {(journeyPhase === 'position' || journeyPhase === 'final') && !activeCard && drawState === 'idle' && drawError && (
          <section className="w-full max-w-md rounded-[1.5rem] border border-[#d7b1ff]/25 bg-[linear-gradient(160deg,rgba(10,12,25,.96),rgba(35,20,46,.9))] p-6 text-center" aria-labelledby="position-empty-title">
            <Heart className="mx-auto h-10 w-10 text-[#e8a48c]" aria-hidden="true" />
            <h2 id="position-empty-title" className="mt-3 font-serif-romantic text-2xl font-bold text-[#f1d6ff]">Chưa có lá phù hợp</h2>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">{drawError}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={advanceNextTurn} className="min-h-12 rounded-full border border-[#d7b1ff]/25 px-4 text-xs font-semibold text-[#ead2ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b1ff]">Chuyển lượt</button>
              <button type="button" onClick={() => onFinishGame('no_cards')} className="min-h-12 rounded-full bg-[linear-gradient(135deg,#f4e8ff,#e8a48c)] px-4 text-xs font-bold text-[#120717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4e8ff]">Kết thúc ván</button>
            </div>
          </section>
        )}

        {(journeyPhase === 'position' || journeyPhase === 'final') && !activeCard && drawState === 'idle' && !drawError && (
          <motion.section
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex w-full max-w-md flex-col items-center text-center"
            aria-labelledby="luxury-deck-title"
          >
            <button
              type="button"
              onClick={handlePositionDraw}
              className="luxury-deck group relative my-5 h-80 w-56 cursor-pointer rounded-[1.4rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7e7b0] sm:h-[23rem] sm:w-64"
              aria-label={`${currentPlayer.name} rút một lá Tư thế`}
            >
              <span className="luxury-deck__card luxury-deck__card--left" aria-hidden="true" />
              <span className="luxury-deck__card luxury-deck__card--right" aria-hidden="true" />
              <motion.span
                whileHover={shouldReduceMotion ? undefined : { y: -9, scale: 1.018 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="luxury-deck__face"
                aria-hidden="true"
              >
                <span className="luxury-deck__inner">
                  <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#e2c275]/75">Luxury journey</span>
                  <span className="luxury-deck__seal">✦</span>
                  <span className="font-serif-romantic text-sm font-semibold tracking-[0.18em] text-[#fff4d6]">TƯ THẾ</span>
                </span>
              </motion.span>
            </button>
            <p id="luxury-deck-title" className="text-sm text-slate-300">
              Đến lượt <strong className="text-[#f7e7b0]">{currentPlayer.name}</strong> rút thẻ dành cho {currentPlayerIndex === 0 ? 'Nam' : 'Nữ'} hoặc Cả hai
            </p>
            <button
              type="button"
              onClick={handlePositionDraw}
              className="mt-5 flex min-h-12 items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f7e7b0,#cda95c)] px-8 text-sm font-bold text-[#08101f] shadow-[0_0_26px_rgba(226,194,117,.24)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff4d6] motion-reduce:transform-none"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Rút thẻ Tư thế
            </button>
          </motion.section>
        )}

        {/* MODE A: IDLE / DRAW DECK VIEW */}
        {journeyPhase === 'standard' && drawState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center max-w-md w-full"
          >
            {/* 3D Stacked Tarot Card Deck */}
            <div className="relative w-56 h-80 sm:w-64 sm:h-92 my-6 cursor-pointer group" onClick={handleStartDraw}>
              {/* Stack effect layers */}
              <div className="absolute inset-0 rounded-2xl bg-neutral-900 border border-amber-500/20 shadow-2xl transform -rotate-6 translate-y-2 opacity-50"></div>
              <div className="absolute inset-0 rounded-2xl bg-neutral-900 border border-amber-500/30 shadow-2xl transform rotate-3 -translate-y-1 opacity-70"></div>

              {/* Top Card Back with Metallic Gold Filigree Pattern */}
              <motion.div
                whileHover={shouldReduceMotion ? undefined : { y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="relative w-full h-full rounded-2xl p-4 bg-gradient-to-br from-[#2a0e14] via-[#1a080d] to-[#0d0407] border-4 border-[#D4AF37] gold-glow flex flex-col items-center justify-between overflow-hidden"
              >
                {/* Filigree corner decorations */}
                <div className="absolute top-2 left-2 text-[#D4AF37] opacity-80 text-xs">✦</div>
                <div className="absolute top-2 right-2 text-[#D4AF37] opacity-80 text-xs">✦</div>
                <div className="absolute bottom-2 left-2 text-[#D4AF37] opacity-80 text-xs">✦</div>
                <div className="absolute bottom-2 right-2 text-[#D4AF37] opacity-80 text-xs">✦</div>

                {/* Inner Pattern Frame */}
                <div className="w-full h-full border-2 border-[#D4AF37]/50 rounded-xl p-3 flex flex-col items-center justify-between card-pattern">
                  <div className="text-[#D4AF37] text-xs tracking-[0.2em] serif-title font-bold uppercase">
                    TRUTH OR DARE
                  </div>

                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-[#7A1F2B]/40 border-2 border-[#D4AF37] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <Flame className="w-8 h-8 text-[#D4AF37] drop-shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
                  </div>

                  <div className="text-[#FF6B9D] text-xs tracking-[0.2em] serif-title pink-glow uppercase font-medium">
                    CẶP ĐÔI
                  </div>
                </div>
              </motion.div>
            </div>

            <p className="text-sm text-neutral-300 font-light mb-6 flex items-center gap-1.5 justify-center">
              <span>Đến lượt</span>
              <span className="font-bold text-amber-300">{currentPlayer.name}</span>
              <span>rút lá bài tình yêu</span>
            </p>

            <button
              type="button"
              onClick={handleQueueDifficultyBoost}
              disabled={
                playerRewards[currentPlayerIndex].starBalance < DIFFICULTY_BOOST_STAR_COST
                || pendingDifficultyBoosts.some((boost) => boost.targetPlayerIndex === (currentPlayerIndex === 0 ? 1 : 0))
              }
              className="mb-3 flex min-h-11 items-center justify-center gap-2 rounded-full border border-orange-300/25 bg-orange-500/[0.08] px-4 text-xs font-semibold text-orange-100 transition-colors hover:border-orange-300/50 hover:bg-orange-500/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Tăng một bậc độ khó cho lượt kế tiếp của ${currentPlayerIndex === 0 ? player2.name : player1.name}, tốn ${DIFFICULTY_BOOST_STAR_COST} sao`}
            >
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              {pendingDifficultyBoosts.some((boost) => boost.targetPlayerIndex === (currentPlayerIndex === 0 ? 1 : 0))
                ? `Đã đặt tăng khó cho ${currentPlayerIndex === 0 ? player2.name : player1.name}`
                : `Tăng khó ${currentPlayerIndex === 0 ? player2.name : player1.name} · ${DIFFICULTY_BOOST_STAR_COST}★`}
            </button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartDraw}
              className="px-8 py-3.5 rounded-full font-bold text-base text-neutral-950 bg-gold-gradient shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(255,107,157,0.5)] transition-all cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5 fill-neutral-950" />
              <span>Rút Bài Ngay</span>
            </motion.button>
          </motion.div>
        )}

        {/* MODE B: SELECT TYPE (If Choose mode is active) */}
        {journeyPhase === 'standard' && drawState === 'selecting_type' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center max-w-md w-full glass-wine rounded-3xl p-6 border border-amber-500/30"
          >
            <h3 className="font-serif-romantic text-2xl font-bold text-amber-300 mb-2">
              Lựa Chọn Của {currentPlayer.name}
            </h3>
            <p className="text-xs text-neutral-300 mb-6">
              Bạn muốn chọn câu hỏi Sự Thật hay nhận thử thách Thách?
            </p>

            <div className="grid grid-cols-2 gap-4 w-full">
              <motion.button
                whileHover={availableDrawTypes.includes('truth') ? { scale: 1.03 } : undefined}
                whileTap={availableDrawTypes.includes('truth') ? { scale: 0.97 } : undefined}
                disabled={!availableDrawTypes.includes('truth')}
                onClick={() => executeDrawCard('truth')}
                className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/80 to-indigo-950/80 border border-blue-400/50 hover:border-blue-300 flex flex-col items-center gap-2 cursor-pointer shadow-lg disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-blue-400/50"
              >
                <HelpCircle className="w-8 h-8 text-blue-300" />
                <span className="font-serif-romantic font-bold text-lg text-white">Sự Thật</span>
                <span className="text-[10px] text-blue-200">
                  {availableDrawTypes.includes('truth') ? 'Trả lời thành thật' : 'Không còn thẻ phù hợp'}
                </span>
              </motion.button>

              <motion.button
                whileHover={availableDrawTypes.includes('dare') ? { scale: 1.03 } : undefined}
                whileTap={availableDrawTypes.includes('dare') ? { scale: 0.97 } : undefined}
                disabled={!availableDrawTypes.includes('dare')}
                onClick={() => executeDrawCard('dare')}
                className="p-5 rounded-2xl bg-gradient-to-b from-rose-950/80 to-red-950/80 border border-rose-400/50 hover:border-rose-300 flex flex-col items-center gap-2 cursor-pointer shadow-lg disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-rose-400/50"
              >
                <Zap className="w-8 h-8 text-rose-300" />
                <span className="font-serif-romantic font-bold text-lg text-white">Thử Thách</span>
                <span className="text-[10px] text-rose-200">
                  {availableDrawTypes.includes('dare') ? 'Thực hiện hành động' : 'Không còn thẻ phù hợp'}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* MODE C: SHUFFLING ANIMATION */}
        {journeyPhase === 'standard' && drawState === 'shuffling' && (
          <div className="flex flex-col items-center py-12">
            <motion.div
              animate={{
                rotateY: shouldReduceMotion ? 0 : [0, 180, 360],
                rotateZ: shouldReduceMotion ? 0 : [-5, 5, -5],
                scale: shouldReduceMotion ? 1 : [1, 1.1, 1],
              }}
              transition={{ duration: shouldReduceMotion ? 0.08 : 0.8, repeat: shouldReduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
              className="w-48 h-72 rounded-2xl bg-gradient-to-br from-amber-600 to-rose-900 border-2 border-amber-300 shadow-2xl flex items-center justify-center"
            >
              <Sparkles className={`w-12 h-12 text-amber-200 ${shouldReduceMotion ? '' : 'animate-spin'}`} />
            </motion.div>
            <p className={`mt-6 text-sm text-amber-300 font-serif-romantic italic ${shouldReduceMotion ? '' : 'animate-pulse'}`}>
              Đang xáo trộn các lá bài bí mật...
            </p>
          </div>
        )}

        {(journeyPhase === 'position' || journeyPhase === 'final') && drawState === 'shuffling' && (
          <div className="flex flex-col items-center py-12" role="status" aria-live="polite">
            <div className="luxury-shuffle relative h-72 w-52 sm:h-80 sm:w-56" aria-hidden="true">
              {[-1, 0, 1].map((offset) => (
                <motion.div
                  key={offset}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0.65, x: 0, rotate: 0, scale: 0.94 }}
                  animate={shouldReduceMotion
                    ? { opacity: 1 }
                    : {
                        opacity: [0.72, 1, 0.82],
                        x: [0, offset * 42, offset * 12],
                        y: [8, Math.abs(offset) * -9, 0],
                        rotate: [0, offset * 8, offset * 2],
                        scale: [0.96, 1.02, 1],
                      }}
                  transition={{ duration: shouldReduceMotion ? 0.08 : 0.72, ease: 'easeInOut' }}
                  className="luxury-shuffle__card"
                >
                  <span className="luxury-deck__inner"><span className="luxury-deck__seal">✦</span></span>
                </motion.div>
              ))}
            </div>
            <p className="mt-6 font-serif-romantic text-sm italic text-[#f7e7b0]">Đang chọn nghi thức dành cho {currentPlayer.name}…</p>
          </div>
        )}

        {/* MODE D: DRAWN CARD 3D FLIP DISPLAY */}
        {(drawState === 'drawing' || drawState === 'drawn') && activeCard && (
          <div className="w-full max-w-md flex flex-col items-center">
            {/* 3D Perspective Card Container */}
            <div className="perspective-1000 w-full my-2">
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { rotateY: 180, scale: 0.8 }}
                animate={{
                  rotateY: cardFlipped ? 0 : 180,
                  scale: 1,
                  opacity: 1,
                }}
                transition={{ duration: shouldReduceMotion ? 0.08 : 0.7, ease: 'easeOut' }}
                className="transform-style-3d relative w-full"
                style={{ minHeight: '420px' }}
              >
                {/* CARD BACK SIDE */}
                <div className={`backface-hidden absolute inset-0 rotate-y-180 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center ${isPositionCard ? 'luxury-card-back' : 'bg-gradient-to-br from-[#2a0e14] via-[#1a080d] to-[#0d0407] border-2 border-[#D4AF37]'}`}>
                  {isPositionCard
                    ? <span className="luxury-deck__seal" aria-hidden="true">✦</span>
                    : <Flame className={`w-16 h-16 text-amber-400 ${shouldReduceMotion ? '' : 'animate-pulse'}`} />}
                </div>

                {/* CARD FRONT SIDE - New Design */}
                <div className={`backface-hidden absolute inset-0 game-card ${
                  isMythicPositionCard
                    ? 'card-position-rare'
                    : isPositionCard
                      ? 'card-position'
                      : `card-${activeCard.level}`
                } ${!isPositionCard && activeCard.level !== 'gentle' ? 'card-wave-pattern' : ''}`}
                  style={{ borderRadius: '16px' }}
                >
                  {/* Corner decorations for intimate/passionate */}
                  {!isPositionCard && activeCard.level !== 'gentle' && (
                    <>
                      <span style={{ fontSize: `${10 * activeTextScale}px` }} className="card-corner-deco top-2 left-2.5">♠ ♥</span>
                      <span style={{ fontSize: `${10 * activeTextScale}px` }} className="card-corner-deco top-2 right-2.5">♦ ♣</span>
                      <span style={{ fontSize: `${10 * activeTextScale}px` }} className="card-corner-deco bottom-2 left-2.5">♥ ♠</span>
                      <span style={{ fontSize: `${10 * activeTextScale}px` }} className="card-corner-deco bottom-2 right-2.5">♣ ♦</span>
                    </>
                  )}

                  <div className="card-content-layer flex flex-col h-full p-5 sm:p-6">
                    {/* Card Header Tag & Level */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isPositionCard && activeCard.position ? (
                          <>
                            <span style={{ fontSize: `${12 * activeTextScale}px` }} className="rounded-full border border-[#e2c275]/45 bg-[#e2c275]/10 px-3 py-1 font-bold text-[#f7e7b0]">
                              ✦ {getPositionFamilyLabel(activeCard).toUpperCase()}
                            </span>
                            <span style={{ fontSize: `${10 * activeTextScale}px` }} className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-slate-200">
                              {POSITION_RECIPIENT_LABELS[getCardTurnAudience(activeCard)]}
                            </span>
                            <span style={{ fontSize: `${12 * activeTextScale}px` }} className={`rounded-full border px-2.5 py-1 font-bold ${
                              isMythicPositionCard
                                ? 'border-[#e8a48c]/55 bg-[#d7b1ff]/10 text-[#f4e8ff]'
                                : 'border-[#e2c275]/35 bg-[#e2c275]/10 text-[#f7e7b0]'
                            }`}>
                              {derivePositionDifficultyStars(activeCard)}★
                            </span>
                          </>
                        ) : (
                          <>
                            <span
                              style={{ fontSize: `${12 * activeTextScale}px` }}
                              className={`px-3 py-1 rounded-full border font-semibold ${
                                activeCard.type === 'truth'
                                  ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              {activeCard.type === 'truth' ? '🔍 SỰ THẬT' : '⚡ THỬ THÁCH'}
                            </span>
                            <span style={{ fontSize: `${12 * activeTextScale}px` }} className={`px-2.5 py-1 rounded-full border ${LEVEL_INFO[activeCard.level].badgeBg}`}>
                              {LEVEL_INFO[activeCard.level].icon} {LEVEL_INFO[activeCard.level].name}
                            </span>
                            <span style={{ fontSize: `${12 * activeTextScale}px` }} className="rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-2 py-1 font-semibold text-amber-200">
                              {isPositionCard ? derivePositionDifficultyStars(activeCard) : deriveDifficultyStars(activeCard)}★
                            </span>
                            <span style={{ fontSize: `${10 * activeTextScale}px` }} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-neutral-300">
                              {AUDIENCE_LABELS[getCardTurnAudience(activeCard)]}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Favorite heart toggle */}
                      <button
                        onClick={() => onToggleFavorite(activeCard.id)}
                        className="p-1.5 rounded-full hover:bg-neutral-800/50 transition-colors"
                        title={isFavorited ? 'Bỏ yêu thích' : 'Yêu thích lá bài này'}
                      >
                        <Heart
                          className={`w-5 h-5 transition-transform ${
                            isFavorited
                              ? 'text-rose-500 fill-rose-500 scale-110'
                              : 'text-neutral-500 hover:text-rose-400'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Targeted Player Prompt */}
                    <div className="my-2 text-center">
                      <span style={{ fontSize: `${12 * activeTextScale}px` }} className="text-amber-200/80 uppercase tracking-widest font-medium">
                        {isPositionCard ? 'Lượt rút:' : 'Lượt thực hiện:'}
                      </span>
                      <span style={{ fontSize: `${16 * activeTextScale}px` }} className="ml-2 font-serif-romantic font-bold text-amber-300">
                        {isPositionCard && activeCard.position
                          ? `${currentPlayer.name} · ${POSITION_RECIPIENT_LABELS[getCardTurnAudience(activeCard)]}`
                          : `${performingPlayer.name} ${performingPlayer.avatar}`}
                      </span>
                    </div>

                    {/* Card Content with Icon */}
                    <div className="my-auto min-h-0 overflow-y-auto overscroll-contain py-4 flex flex-col items-center justify-center text-center">
                      {!revealedCard ? (
                        <div className="flex flex-col items-center py-6 px-4">
                          <EyeOff className="w-10 h-10 text-amber-400 mb-3 opacity-80" />
                          <p style={{ fontSize: `${12 * activeTextScale}px` }} className="text-neutral-400 mb-4 max-w-xs">
                            Nội dung lá bài đã được bảo mật. Bấm vào nút bên dưới khi bạn đã sẵn sàng!
                          </p>
                          <button
                            onClick={() => {
                              soundEngine.playTick();
                              setIsRevealed(true);
                              if (isPositionCard) onOpenPositionCard(activeCard.id);
                            }}
                            className={`px-5 py-2.5 rounded-full border font-semibold transition-all flex items-center gap-2 cursor-pointer ${isPositionCard ? 'luxury-unseal-button' : 'bg-amber-500/20 border-amber-400 text-amber-200 hover:bg-amber-500/30'}`}
                            style={{ fontSize: `${12 * activeTextScale}px` }}
                          >
                            <Eye className="w-4 h-4" />
                            <span>Xem Nội Dung</span>
                          </button>
                        </div>
                      ) : (
                        <motion.div
                          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex flex-col items-center ${isPositionCard ? 'position-content-reveal' : ''}`}
                        >
                          {/* Card Icon (custom image or SVG) */}
                          {activeCard.customImage ? (
                            <div style={activeIconSpacingStyle} className={`card-icon-wrapper-lg card-custom-icon-wrapper ${isMythicPositionCard ? 'mythic-icon-aura' : ''}`}>
                              <div className="h-full w-full transition-transform duration-200 motion-reduce:transition-none" style={activeIconScaleStyle}>
                                <img
                                  src={activeCard.customImage}
                                  alt="icon"
                                  className="card-custom-icon w-full h-full object-contain"
                                />
                              </div>
                            </div>
                          ) : (() => {
                            const iconName = activeCard.icon || autoAssignIcon(activeCard.content);
                            const IconComp = getCardIcon(iconName);
                            return IconComp ? (
                              <div style={activeIconSpacingStyle} className={`card-icon-wrapper-lg card-icon-color ${isMythicPositionCard ? 'mythic-icon-aura' : ''}`}>
                                <div className="h-full w-full transition-transform duration-200 motion-reduce:transition-none" style={activeIconScaleStyle}>
                                  <IconComp className="w-full h-full" />
                                </div>
                              </div>
                            ) : null;
                          })()}

                          <p style={{ fontSize: `${16 * activeTextScale}px` }} className="text-white font-medium leading-relaxed max-w-sm">
                            {activeCard.content}
                          </p>
                          {activeCard.hint && (
                            <p style={{ fontSize: `${12 * activeTextScale}px` }} className="mt-4 text-rose-300/80 italic font-light">
                              💡 Gợi ý: {activeCard.hint}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* Countdown Timer (If active) */}
                    {timerSeconds !== null && isRevealed && !isFinalPositionCard && (
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                          <div
                            style={{ fontSize: `${12 * activeTextScale}px` }}
                            className={`flex items-center gap-2 ${timerSeconds === 0 ? 'text-rose-300' : 'text-amber-300'}`}
                          >
                            <TimerIcon
                              className={`w-4 h-4 ${timerSeconds === 0 ? 'text-rose-400' : `text-amber-400 ${isTimerRunning && !shouldReduceMotion ? 'animate-pulse' : ''}`}`}
                            />
                            <span>{timerSeconds === 0 ? 'Hết giờ:' : 'Thời gian:'}</span>
                            <span style={{ fontSize: `${16 * activeTextScale}px` }} className={`font-bold ${timerSeconds === 0 ? 'text-rose-200' : 'text-white'}`}>
                              {timerSeconds === 0 ? 'Reng reng!' : timerSeconds !== null ? `${timerSeconds}s` : '--'}
                            </span>
                          </div>

                          {hasTimerStarted ? (
                            <button
                              type="button"
                              onClick={handleTimerControl}
                              aria-label={timerSeconds === 0 ? 'Đếm lại thời gian thử thách' : isTimerRunning ? 'Tạm dừng đếm giờ' : 'Tiếp tục đếm giờ'}
                              style={{ fontSize: `${12 * activeTextScale}px` }}
                              className="flex min-h-9 items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-1 text-neutral-200 hover:text-white"
                            >
                              {timerSeconds === 0 && <RotateCcw className="h-3 w-3" aria-hidden="true" />}
                              {timerSeconds === 0 ? 'Đếm lại' : isTimerRunning ? 'Tạm dừng' : 'Tiếp tục'}
                            </button>
                          ) : (
                            <span className="rounded-full border border-amber-300/20 bg-amber-500/[0.07] px-2.5 py-1 text-[10px] font-semibold text-amber-100/80">
                              Chờ bắt đầu
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ACTION BUTTONS (Hoàn Thành / Chưa hoàn thành) */}
            {drawState === 'drawn' && isRevealed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex w-full flex-wrap items-center justify-center gap-3"
              >
                {!isPositionCard && (
                  <button
                    type="button"
                    onClick={handleReroll}
                    disabled={activeCardWasRerolled || playerRewards[performingPlayerIndex].starBalance < REROLL_STAR_COST}
                    aria-label={`Đổi lá bài, tốn ${REROLL_STAR_COST} sao của ${performingPlayer.name}`}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-amber-300/25 bg-amber-500/[0.07] px-4 text-xs font-semibold text-amber-100 transition-colors hover:border-amber-300/50 hover:bg-amber-500/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Shuffle className="h-4 w-4" aria-hidden="true" />
                    {activeCardWasRerolled ? 'Đã đổi bài trong lượt này' : `Đổi bài · ${REROLL_STAR_COST}★ của ${performingPlayer.name}`}
                  </button>
                )}
                {isFinalPositionCard ? (
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="min-h-12 w-full rounded-full bg-[linear-gradient(135deg,#f4e8ff,#e8a48c)] px-5 text-sm font-bold text-[#120717] shadow-[0_0_28px_rgba(232,164,140,.3)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4e8ff] motion-reduce:transform-none"
                  >
                    Đã xem · Kết thúc ván
                  </button>
                ) : timerSeconds !== null && !hasTimerStarted ? (
                  <button
                    type="button"
                    onClick={handleTimerControl}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-5 text-sm font-bold text-neutral-950 shadow-[0_0_22px_rgba(212,175,55,.32)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 motion-reduce:transform-none"
                  >
                    <TimerIcon className="h-4 w-4" aria-hidden="true" />
                    Bắt đầu thực hiện · {timerSeconds}s
                  </button>
                ) : isPositionCard ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePositionAdvance(false)}
                      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 text-xs font-semibold text-slate-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" /> Bỏ qua
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePositionAdvance(true)}
                      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f7e7b0,#cda95c)] px-4 text-xs font-bold text-[#08101f] shadow-[0_0_20px_rgba(226,194,117,.22)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7e7b0] motion-reduce:transform-none"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {completionActionLabel}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSkip}
                      className="flex-1 py-3 px-4 rounded-full bg-neutral-900/90 border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 transition-all font-medium text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-neutral-400" />
                      <span>{activeCard.type === 'truth' ? 'Sai / Không trả lời' : 'Không thực hiện'}</span>
                    </button>

                    <button
                      onClick={handleComplete}
                      className="flex-1 py-3 px-4 rounded-full bg-gold-gradient text-neutral-950 font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_25px_rgba(255,107,157,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 fill-neutral-950 text-gold-gradient" />
                      <span>{completionActionLabel}</span>
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        )}
        </div>
        <div className="game-outfit-desktop">
          <PlayerOutfitStatus player={player2} outfitState={outfitStates[1]} rewardState={playerRewards[1]} hasPendingDifficultyBoost={pendingDifficultyBoosts.some((boost) => boost.targetPlayerIndex === 1)} active={currentPlayerIndex === 1} />
        </div>
      </div>

      {/* FOOTER: Quick Player Scores */}
      <div className="w-full flex items-center justify-around py-2 px-4 glass-dark rounded-xl border border-neutral-800 text-xs text-neutral-300">
        <div className="flex items-center gap-2">
          <span>{player1.avatar}</span>
          <span className="font-semibold text-rose-300">{player1.name}:</span>
          <span>{player1.completedCount} hoàn thành</span>
        </div>
        <div className="h-4 w-px bg-neutral-800" />
        <div className="flex items-center gap-2">
          <span>{player2.avatar}</span>
          <span className="font-semibold text-amber-300">{player2.name}:</span>
          <span>{player2.completedCount} hoàn thành</span>
        </div>
      </div>

      <AnimatePresence>
        {showPenaltyPrompt && activeCard && (
          <PenaltyPrompt
            playerName={performingPlayer.name}
            playerAvatar={performingPlayer.avatar}
            cardType={activeCard.type}
            penaltyEnabled={settings.penaltyClothingEnabled}
            canRemoveGarment={canApplyPenaltyGarment}
            onReturn={() => setShowPenaltyPrompt(false)}
            onChooseGarment={handlePenaltyGarmentChoice}
            onContinueWithoutPenalty={finalizeSkippedTurn}
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
    </div>
  );
};

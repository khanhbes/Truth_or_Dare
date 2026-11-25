import {
  CardAudience,
  CardItem,
  CardLevel,
  CardType,
  DifficultyStars,
  LuxuryProgressionBand,
  LuxuryProgressionConfig,
  OutfitStage,
  OutfitState,
  PlayerIndex,
  PositionDifficultyStars,
  ProgressionBand,
  ProgressionConfig,
  TurnAudience,
} from '../types';
import { getRemovalTargetIndices, isCardEligibleForOutfits } from './cardSelection';
import { chooseDirectedCard, getDirectorWeights, type CardDirectorState } from './cardDirector';
import { getOutfitStage } from './wardrobe';
import { ClothingEventType, getCardClothingFamily, isClothingIntensityAllowed } from './clothingJourney';

export const DIFFICULTY_STARS = [1, 2, 3, 4, 5] as const;
export const POSITION_DIFFICULTY_STARS = [6, 7, 8, 9, 10] as const;
export const STANDARD_CARD_TYPES = ['truth', 'dare'] as const;

export type WardrobeDifficultyTier = 'dressed' | 'underwear_only' | 'empty';

export interface WardrobeDifficultyProfile {
  tier: WardrobeDifficultyTier;
  maxStars: DifficultyStars;
  weights: Record<DifficultyStars, number>;
}

const WARDROBE_DIFFICULTY_PROFILES: Readonly<Record<
  WardrobeDifficultyTier,
  WardrobeDifficultyProfile
>> = {
  dressed: {
    tier: 'dressed',
    maxStars: 3,
    weights: { 1: 45, 2: 35, 3: 20, 4: 0, 5: 0 },
  },
  underwear_only: {
    tier: 'underwear_only',
    maxStars: 4,
    weights: { 1: 5, 2: 10, 3: 20, 4: 65, 5: 0 },
  },
  empty: {
    tier: 'empty',
    maxStars: 5,
    weights: { 1: 3, 2: 7, 3: 15, 4: 25, 5: 50 },
  },
};

/**
 * Uses the MOST-clothed player so one player being stripped early (for
 * example by skip penalties) never pushes the whole table to hotter cards.
 */
export const getWardrobeDifficultyProfile = (
  outfits: readonly [OutfitState, OutfitState],
): WardrobeDifficultyProfile => {
  const stages = outfits.map(getOutfitStage);
  if (stages.includes('dressed')) return WARDROBE_DIFFICULTY_PROFILES.dressed;
  if (stages.includes('underwear_only')) return WARDROBE_DIFFICULTY_PROFILES.underwear_only;
  return WARDROBE_DIFFICULTY_PROFILES.empty;
};

/**
 * Hard star ceiling driven by intimacy when at least one player is still dressed:
 * <40% → 3★, <60% → 4★, ≥60% → 5★.
 * If BOTH players are already in underwear_only (4★) or empty (5★), their
 * shared wardrobe tier may unlock that tier's maxStars.
 */
export const getIntimacyStarCap = (
  intimacyPercent: number,
  outfits?: readonly [OutfitState, OutfitState],
): DifficultyStars => {
  const intimacyMaxStars: DifficultyStars =
    intimacyPercent < 40 ? 3 : intimacyPercent < 60 ? 4 : 5;
  if (!outfits) return intimacyMaxStars;
  const profileMaxStars = getWardrobeDifficultyProfile(outfits).maxStars;
  return Math.max(profileMaxStars, intimacyMaxStars) as DifficultyStars;
};

export const DEFAULT_PROGRESSION_CONFIG: Readonly<ProgressionConfig> = {
  bands: [
    {
      minPercent: 0,
      maxPercent: 19,
      typeWeights: { truth: 65, dare: 35 },
      starWeights: { 1: 70, 2: 25, 3: 5, 4: 0, 5: 0 },
    },
    {
      minPercent: 20,
      maxPercent: 39,
      typeWeights: { truth: 55, dare: 45 },
      starWeights: { 1: 45, 2: 35, 3: 15, 4: 5, 5: 0 },
    },
    {
      minPercent: 40,
      maxPercent: 59,
      typeWeights: { truth: 45, dare: 55 },
      starWeights: { 1: 20, 2: 30, 3: 30, 4: 15, 5: 5 },
    },
    {
      minPercent: 60,
      maxPercent: 79,
      typeWeights: { truth: 35, dare: 65 },
      starWeights: { 1: 10, 2: 15, 3: 30, 4: 30, 5: 15 },
    },
    {
      minPercent: 80,
      maxPercent: 99,
      typeWeights: { truth: 25, dare: 75 },
      starWeights: { 1: 5, 2: 10, 3: 20, 4: 35, 5: 30 },
    },
  ],
  // Tuned for a ~70 minute session: roughly 20–22 Standard draws.
  starGains: { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7 },
  cardRemovalBonus: 3,
};

const positionWeights = (
  weights: Partial<Record<PositionDifficultyStars, number>>,
): Record<PositionDifficultyStars, number> => Object.fromEntries(
  POSITION_DIFFICULTY_STARS.map((star) => [star, weights[star] ?? 0]),
) as Record<PositionDifficultyStars, number>;

/**
 * Non-final Position cards stop at 9★; 10★ is reserved for Have Sex, which is
 * offered through the separate three-card final choice, so no band weights 10★.
 */
export const DEFAULT_LUXURY_PROGRESSION_CONFIG: Readonly<LuxuryProgressionConfig> = {
  bands: [
    { minPercent: 0, maxPercent: 19, starWeights: positionWeights({ 6: 65, 7: 35 }) },
    { minPercent: 20, maxPercent: 39, starWeights: positionWeights({ 6: 30, 7: 50, 8: 20 }) },
    { minPercent: 40, maxPercent: 59, starWeights: positionWeights({ 6: 10, 7: 35, 8: 45, 9: 10 }) },
    { minPercent: 60, maxPercent: 79, starWeights: positionWeights({ 7: 15, 8: 45, 9: 40 }) },
    { minPercent: 80, maxPercent: 99, starWeights: positionWeights({ 7: 10, 8: 30, 9: 60 }) },
  ],
  // Tuned for a ~70 minute session: roughly 9–10 Position cards before Have Sex.
  starGains: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 9, 7: 10, 8: 11, 9: 12, 10: 0 },
  finalCardChance: 5,
};

/** Number of face-down Have Sex cards offered at the end of a session. */
export const FINAL_CHOICE_CARD_COUNT = 3;
/** Within-tier multiplier for a clothing card matching the active clothing opportunity. */
export const CLOTHING_PREFERENCE_MULTIPLIER = 1.5;
/** Within-tier multiplier for a clothing family not yet seen this session. */
export const UNSEEN_CLOTHING_FAMILY_MULTIPLIER = 1.25;
/** Within-tier multiplier for a clothing card targeting a player who has not removed anything yet. */
export const FIRST_REMOVAL_BALANCE_MULTIPLIER = 1.3;
/** Weight kept by a card the couple account already opened while unopened alternatives exist. */
export const OPENED_CARD_WEIGHT = 0.1;
/** Type pacing: the same Truth/Dare type twice in a row lowers that type's next chance. */
export const REPEATED_TYPE_PACING = 0.58;

const cloneBand = (band: ProgressionBand): ProgressionBand => ({
  minPercent: band.minPercent,
  maxPercent: band.maxPercent,
  typeWeights: { ...band.typeWeights },
  starWeights: { ...band.starWeights },
});

export const cloneProgressionConfig = (
  config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG,
): ProgressionConfig => ({
  bands: config.bands.map(cloneBand),
  starGains: { ...config.starGains },
  cardRemovalBonus: config.cardRemovalBonus,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const boundedPercentage = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(100, value)
    : fallback;

export const hydrateProgressionConfig = (value: unknown): ProgressionConfig => {
  const fallback = cloneProgressionConfig();
  if (!isRecord(value)) return fallback;

  const savedBands = Array.isArray(value.bands) ? value.bands : [];
  const bands = fallback.bands.map((defaultBand, index) => {
    const saved = savedBands[index];
    if (!isRecord(saved)) return defaultBand;
    const savedTypes = isRecord(saved.typeWeights) ? saved.typeWeights : {};
    const savedStars = isRecord(saved.starWeights) ? saved.starWeights : {};
    const typeWeights = {
      truth: boundedPercentage(savedTypes.truth, defaultBand.typeWeights.truth),
      dare: boundedPercentage(savedTypes.dare, defaultBand.typeWeights.dare),
    };
    const starWeights = Object.fromEntries(
      DIFFICULTY_STARS.map((star) => [
        star,
        boundedPercentage(savedStars[String(star)], defaultBand.starWeights[star]),
      ]),
    ) as Record<DifficultyStars, number>;
    return { ...defaultBand, typeWeights, starWeights };
  });

  const savedGains = isRecord(value.starGains) ? value.starGains : {};
  const starGains = Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      boundedPercentage(savedGains[String(star)], fallback.starGains[star]),
    ]),
  ) as Record<DifficultyStars, number>;

  return {
    bands,
    starGains,
    cardRemovalBonus: boundedPercentage(value.cardRemovalBonus, fallback.cardRemovalBonus),
  };
};

export const cloneLuxuryProgressionConfig = (
  config: LuxuryProgressionConfig = DEFAULT_LUXURY_PROGRESSION_CONFIG,
): LuxuryProgressionConfig => ({
  bands: config.bands.map((band) => ({
    minPercent: band.minPercent,
    maxPercent: band.maxPercent,
    starWeights: { ...band.starWeights },
  })),
  starGains: { ...config.starGains },
  finalCardChance: config.finalCardChance,
});

export const hydrateLuxuryProgressionConfig = (value: unknown): LuxuryProgressionConfig => {
  const fallback = cloneLuxuryProgressionConfig();
  if (!isRecord(value)) return fallback;
  const savedBands = Array.isArray(value.bands) ? value.bands : [];
  const bands = fallback.bands.map((defaultBand, index) => {
    const saved = savedBands[index];
    if (!isRecord(saved)) return defaultBand;
    const savedStars = isRecord(saved.starWeights) ? saved.starWeights : {};
    const starWeights = Object.fromEntries(POSITION_DIFFICULTY_STARS.map((star) => [
      star,
      boundedPercentage(savedStars[String(star)], defaultBand.starWeights[star]),
    ])) as Record<PositionDifficultyStars, number>;
    return { ...defaultBand, starWeights };
  });
  const savedGains = isRecord(value.starGains) ? value.starGains : {};
  const starGains = Object.fromEntries(POSITION_DIFFICULTY_STARS.map((star) => [
    star,
    boundedPercentage(savedGains[String(star)], fallback.starGains[star]),
  ])) as Record<PositionDifficultyStars, number>;
  return {
    bands,
    starGains,
    finalCardChance: boundedPercentage(value.finalCardChance, fallback.finalCardChance),
  };
};

export const getCardDeck = (card: CardItem): 'standard' | 'position' =>
  card.deck === 'position' ? 'position' : 'standard';

export const deriveDifficultyStars = (card: CardItem): DifficultyStars => {
  const explicit = card.progression?.difficultyStars;
  if (explicit && DIFFICULTY_STARS.includes(explicit)) return explicit;
  if (card.level === 'gentle') return card.type === 'truth' ? 1 : 2;
  if (card.level === 'intimate') return 3;
  return 4;
};

export const derivePositionDifficultyStars = (card: CardItem): PositionDifficultyStars => {
  const explicit = card.position?.difficultyStars;
  if (explicit) {
    const normalized = explicit <= 5 ? (explicit + 5) : explicit;
    if (normalized >= 6 && normalized <= 10) {
      // 10★ is reserved for Have Sex (the three-card final). A regular Position
      // card saved as 10★ would never be drawn (no band weights 10★) and would
      // add 0% Luxury, so it plays as the hottest regular tier instead.
      if (normalized === 10 && card.position?.family !== 'have_sex') return 9;
      return normalized as PositionDifficultyStars;
    }
  }
  if (card.position?.family === 'have_sex') return 10;
  if (card.position?.family === 'handjob') return 8;
  if (card.position?.family === 'blowjob') return 7;
  return 6;
};

export const getPositionLuxuryGain = (
  card: CardItem,
  config: LuxuryProgressionConfig,
): number => {
  const override = card.position?.luxuryGain;
  return typeof override === 'number' && Number.isFinite(override) && override >= 0
    ? Math.min(100, override)
    : config.starGains[derivePositionDifficultyStars(card)];
};

export const calculateCompletedPositionLuxury = (
  currentPercent: number,
  card: CardItem,
  config: LuxuryProgressionConfig,
): IntimacyGainResult => {
  const current = Math.max(0, Math.min(100, currentPercent));
  const base = getPositionLuxuryGain(card, config);
  const nextPercent = Math.min(100, current + base);
  const totalApplied = nextPercent - current;
  return { nextPercent, baseApplied: totalApplied, removalApplied: 0, totalApplied };
};

const migrateLegacyAudience = (audience: CardAudience | undefined): TurnAudience => {
  if (audience === 'male' || audience === 'female') return audience;
  return 'both';
};

export const getCardTurnAudience = (card: CardItem): TurnAudience => {
  if (getCardDeck(card) === 'position') {
    return card.position?.turnAudience ?? migrateLegacyAudience(card.position?.recipient);
  }
  return card.progression?.turnAudience ?? migrateLegacyAudience(card.progression?.audience);
};

/** @deprecated Use getCardTurnAudience. */
export const getCardAudience = (card: CardItem): CardAudience => getCardTurnAudience(card);

export const getCardIntimacyGain = (
  card: CardItem,
  config: ProgressionConfig,
): number => {
  const override = card.progression?.intimacyGain;
  return typeof override === 'number' && Number.isFinite(override) && override >= 0
    ? Math.min(100, override)
    : config.starGains[deriveDifficultyStars(card)];
};

export interface IntimacyGainResult {
  nextPercent: number;
  baseApplied: number;
  removalApplied: number;
  totalApplied: number;
}

export const calculateCompletedCardIntimacy = (
  currentPercent: number,
  card: CardItem,
  config: ProgressionConfig,
  includeCardRemovalBonus: boolean,
  /** 2 for the card after a "Nhân đôi" event turn. */
  multiplier = 1,
): IntimacyGainResult => {
  const current = Math.max(0, Math.min(100, currentPercent));
  const base = getCardIntimacyGain(card, config) * multiplier;
  const removal = (includeCardRemovalBonus ? config.cardRemovalBonus : 0) * multiplier;
  const nextPercent = Math.min(100, current + base + removal);
  const totalApplied = nextPercent - current;
  const baseApplied = Math.min(base, totalApplied);
  return {
    nextPercent,
    baseApplied,
    removalApplied: Math.max(0, totalApplied - baseApplied),
    totalApplied,
  };
};

export const getProgressionBand = (
  intimacyPercent: number,
  config: ProgressionConfig,
): ProgressionBand => {
  const percent = Math.max(0, Math.min(99, intimacyPercent));
  return config.bands.find(
    (band) => percent >= band.minPercent && percent <= band.maxPercent,
  ) ?? config.bands[config.bands.length - 1];
};

export const isProgressionConfigPlayable = (config: ProgressionConfig): boolean =>
  DIFFICULTY_STARS.some((star) => config.starGains[star] > 0);

export const isLuxuryProgressionConfigPlayable = (
  config: LuxuryProgressionConfig,
): boolean => POSITION_DIFFICULTY_STARS.some(
  (star) => star < 10 && config.starGains[star] > 0,
);

const audienceMatches = (audience: TurnAudience, actorIndex: PlayerIndex): boolean =>
  audience === 'both' ||
  (audience === 'male' ? actorIndex === 0 : actorIndex === 1);

export const getStandardCardPerformerIndex = (
  card: CardItem,
  currentPlayerIndex: PlayerIndex,
): PlayerIndex => currentPlayerIndex;

const stagesMatch = (
  allowedStages: readonly OutfitStage[] | undefined,
  outfit: OutfitState,
): boolean => !allowedStages || allowedStages.length === 0 || allowedStages.includes(getOutfitStage(outfit));

export const isStandardJourneyCardEligible = (
  card: CardItem,
  actorIndex: PlayerIndex,
  outfits: readonly [OutfitState, OutfitState],
): boolean => {
  if (getCardDeck(card) !== 'standard') return false;
  if (!audienceMatches(getCardTurnAudience(card), actorIndex)) return false;
  const partnerIndex: PlayerIndex = actorIndex === 0 ? 1 : 0;
  if (!stagesMatch(card.progression?.actorStages, outfits[actorIndex])) return false;
  if (!stagesMatch(card.progression?.partnerStages, outfits[partnerIndex])) return false;
  return isCardEligibleForOutfits(card, actorIndex, outfits);
};

const normalize = <Key extends string | number>(
  keys: readonly Key[],
  weights: Readonly<Record<Key, number>>,
): Record<Key, number> => {
  const safeWeights = keys.map((key) => {
    const value = weights[key] ?? 0;
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  });
  const total = safeWeights.reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(
    keys.map((key, index) => [key, total > 0 ? safeWeights[index] / total : 0]),
  ) as Record<Key, number>;
};

const safeRandom = (random: () => number): number => {
  const value = random();
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(0.999999999999, value));
};

const chooseWeighted = <Key extends string | number>(
  keys: readonly Key[],
  weights: Readonly<Record<Key, number>>,
  random: () => number,
): Key | null => {
  const enabled = keys.filter((key) => Number.isFinite(weights[key]) && weights[key] > 0);
  if (enabled.length === 0) return null;
  if (enabled.length === 1) return enabled[0];
  const roll = safeRandom(random);
  let cumulative = 0;
  for (const key of enabled) {
    cumulative += weights[key] ?? 0;
    if (roll < cumulative) return key;
  }
  return enabled[enabled.length - 1];
};

const starWeightsForAvailable = (
  availableStars: readonly DifficultyStars[],
  band: ProgressionBand,
  outfits: readonly [OutfitState, OutfitState],
  intimacyPercent: number,
  difficultyBoost = false,
): Record<DifficultyStars, number> => {
  const profile = getWardrobeDifficultyProfile(outfits);
  const starCap = getIntimacyStarCap(intimacyPercent, outfits);
  const cappedStars = availableStars.filter((star) => star <= starCap);
  const bandWeights = normalize(DIFFICULTY_STARS, Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      cappedStars.includes(star) ? band.starWeights[star] : 0,
    ]),
  ) as Record<DifficultyStars, number>);
  const wardrobeWeights = normalize(DIFFICULTY_STARS, Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      cappedStars.includes(star)
        ? Math.max(profile.weights[star], intimacyPercent >= 60 ? band.starWeights[star] : 0)
        : 0,
    ]),
  ) as Record<DifficultyStars, number>);
  const combined = normalize(DIFFICULTY_STARS, Object.fromEntries(
    DIFFICULTY_STARS.map((star) => [
      star,
      0.6 * wardrobeWeights[star] + 0.4 * bandWeights[star],
    ]),
  ) as Record<DifficultyStars, number>);

  if (difficultyBoost) {
    const shifted = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DifficultyStars, number>;
    for (const sourceStar of cappedStars) {
      const destinationStar = cappedStars.find((star) => star > sourceStar) ?? sourceStar;
      shifted[destinationStar] += combined[sourceStar];
    }
    return normalize(DIFFICULTY_STARS, shifted);
  }
  return combined;
};

export interface JourneyDrawProbabilities {
  types: Record<CardType, number>;
  stars: Record<DifficultyStars, number>;
}

export interface SelectJourneyCardOptions {
  cards: readonly CardItem[];
  preferredType?: CardType | null;
  actorIndex: PlayerIndex;
  outfits: readonly [OutfitState, OutfitState];
  usedCardIds: readonly string[];
  levels: readonly CardLevel[];
  intimacyPercent: number;
  config: ProgressionConfig;
  /** Hard exclusions stay excluded even when the normal no-repeat pool resets. */
  excludedCardIds?: readonly string[];
  /** Shifts each available star weight to the next higher available star. */
  difficultyBoost?: boolean;
  /** Soft preference supplied by the clothing journey; falls back to the full eligible pool. */
  preferredClothingFamily?: ClothingEventType | null;
  /** Session history used to avoid repeating one clothing family. */
  clothingHistory?: readonly ClothingEventType[];
  firstRemoval?: readonly [boolean, boolean];
  /** Optional set of card IDs previously unlocked in the couple account to reduce repeats. */
  accountUnlockedCardIds?: readonly string[] | ReadonlySet<string>;
  /** Optional session director. Omit it for legacy deterministic selection. */
  directorState?: CardDirectorState;
  random?: () => number;
}

export interface JourneyCardSelectionResult {
  card: CardItem | null;
  nextUsedCardIds: string[];
  availableTypes: CardType[];
  didResetPool: boolean;
  probabilities: JourneyDrawProbabilities;
  errorCode?: 'no_cards' | 'no_positive_weight' | 'no_progress_gain';
}

const getJourneyPool = (options: SelectJourneyCardOptions) => {
  const enabledLevels = new Set(options.levels);
  const excluded = new Set(options.excludedCardIds ?? []);
  const wardrobeMaxStars = getIntimacyStarCap(options.intimacyPercent, options.outfits);
  const eligible = options.cards.filter(
    (card) => !excluded.has(card.id)
      && enabledLevels.has(card.level)
      && deriveDifficultyStars(card) <= wardrobeMaxStars
      && isStandardJourneyCardEligible(card, options.actorIndex, options.outfits)
      && isClothingIntensityAllowed(card, options.intimacyPercent)
      && !(getCardClothingFamily(card) === 'both' && options.intimacyPercent < 20),
  );
  // Clothing preferences (active opportunity, unseen family, first-removal
  // balance) are applied later as gentle within-tier multipliers. They must
  // never narrow the pool: narrowing used to collapse the draw onto a single
  // clothing card and the pool reset then served that same card again.
  const pool = options.preferredType
    ? eligible.filter((card) => card.type === options.preferredType)
    : eligible;
  const used = new Set(options.usedCardIds);
  let candidates = pool.filter((card) => !used.has(card.id));
  const didResetPool = pool.length > 0 && candidates.length === 0;
  if (didResetPool) candidates = [...pool];
  return { eligible, pool, candidates, didResetPool };
};

const clothingPreferenceFactor = (
  card: CardItem,
  options: SelectJourneyCardOptions,
): number => {
  const family = getCardClothingFamily(card);
  if (!family) return 1;
  let factor = 1;
  if (options.preferredClothingFamily) {
    if (family === options.preferredClothingFamily) factor *= CLOTHING_PREFERENCE_MULTIPLIER;
  } else if (
    options.clothingHistory
    && options.intimacyPercent >= 20
    && !options.clothingHistory.includes(family)
  ) {
    factor *= UNSEEN_CLOTHING_FAMILY_MULTIPLIER;
  }
  const missingFirstRemoval = options.firstRemoval?.findIndex((removed) => !removed);
  if (
    missingFirstRemoval !== undefined
    && missingFirstRemoval >= 0
    && getRemovalTargetIndices(card, options.actorIndex).includes(missingFirstRemoval as PlayerIndex)
  ) {
    factor *= FIRST_REMOVAL_BALANCE_MULTIPLIER;
  }
  return factor;
};

const typePacingFactor = (type: CardType, directorState?: CardDirectorState): number => {
  const lastTwo = directorState?.typeHistory.slice(-2) ?? [];
  return lastTwo.length === 2 && lastTwo.every((entry) => entry.split(':')[0] === type)
    ? REPEATED_TYPE_PACING
    : 1;
};

interface JourneyWeighting {
  probabilities: JourneyDrawProbabilities;
  cardWeights: Map<string, number>;
}

/**
 * Director-aware weighting used both for the real draw and for the odds shown
 * on screen. Each (type, star) tier receives exactly its configured share
 * (type weight × conditional star weight, with type pacing); the director's
 * heat, novelty, account-unlock and clothing factors only decide WHICH card of
 * that tier is drawn. Tiers with many cards therefore no longer crowd out
 * tiers with few cards.
 */
const computeJourneyWeighting = (
  candidates: readonly CardItem[],
  options: SelectJourneyCardOptions,
): JourneyWeighting => {
  const band = getProgressionBand(options.intimacyPercent, options.config);
  const preferredType = options.preferredType ?? null;
  const rawTypes = Object.fromEntries(STANDARD_CARD_TYPES.map((type) => [
    type,
    candidates.some((card) => card.type === type) && (!preferredType || preferredType === type)
      ? band.typeWeights[type] * typePacingFactor(type, options.directorState)
      : 0,
  ])) as Record<CardType, number>;
  const typeShares = normalize(STANDARD_CARD_TYPES, rawTypes);
  const directorWeights = options.directorState
    ? getDirectorWeights(
      candidates,
      options.directorState,
      options.actorIndex,
      options.outfits,
      options.accountUnlockedCardIds,
    )
    : null;
  const cardWeights = new Map<string, number>();

  for (const type of STANDARD_CARD_TYPES) {
    if (typeShares[type] <= 0) continue;
    const typeCards = candidates.filter((card) => card.type === type);
    const availableStars = DIFFICULTY_STARS.filter((star) =>
      typeCards.some((card) => deriveDifficultyStars(card) === star),
    );
    if (availableStars.length === 0) continue;
    const conditional = starWeightsForAvailable(
      availableStars,
      band,
      options.outfits,
      options.intimacyPercent,
      options.difficultyBoost ?? false,
    );
    for (const star of availableStars) {
      const tierWeight = typeShares[type] * conditional[star];
      if (!(tierWeight > 0)) continue;
      const tierCards = typeCards.filter((card) => deriveDifficultyStars(card) === star);
      const factors = tierCards.map((card) =>
        Math.max(0.001, directorWeights?.get(card.id) ?? 1) * clothingPreferenceFactor(card, options));
      const factorTotal = factors.reduce((sum, value) => sum + value, 0);
      tierCards.forEach((card, index) => {
        cardWeights.set(card.id, tierWeight * (factors[index] / factorTotal));
      });
    }
  }

  // Re-derive the published odds from the per-card weights so the screen and
  // the draw can never disagree, even when a type has no weighted star left.
  const total = Array.from(cardWeights.values()).reduce((sum, value) => sum + value, 0);
  const types = { truth: 0, dare: 0 } as Record<CardType, number>;
  const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DifficultyStars, number>;
  if (total > 0) {
    for (const card of candidates) {
      const weight = cardWeights.get(card.id);
      if (!weight) continue;
      types[card.type] += weight / total;
      stars[deriveDifficultyStars(card)] += weight / total;
    }
  }
  return { probabilities: { types, stars }, cardWeights };
};

const probabilitiesForCandidates = (
  candidates: readonly CardItem[],
  intimacyPercent: number,
  config: ProgressionConfig,
  preferredType: CardType | null,
  outfits: readonly [OutfitState, OutfitState],
  difficultyBoost = false,
): JourneyDrawProbabilities => {
  const band = getProgressionBand(intimacyPercent, config);
  const availableTypes = STANDARD_CARD_TYPES.filter((type) =>
    candidates.some((card) => card.type === type),
  );
  const rawTypes = {
    truth: availableTypes.includes('truth') && (!preferredType || preferredType === 'truth')
      ? band.typeWeights.truth
      : 0,
    dare: availableTypes.includes('dare') && (!preferredType || preferredType === 'dare')
      ? band.typeWeights.dare
      : 0,
  };
  const types = normalize(STANDARD_CARD_TYPES, rawTypes);
  const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DifficultyStars, number>;

  for (const type of STANDARD_CARD_TYPES) {
    if (types[type] <= 0) continue;
    const availableStars = DIFFICULTY_STARS.filter((star) =>
      candidates.some((card) => card.type === type && deriveDifficultyStars(card) === star),
    );
    if (availableStars.length === 0) continue;
    const conditional = starWeightsForAvailable(availableStars, band, outfits, intimacyPercent, difficultyBoost);
    for (const star of DIFFICULTY_STARS) stars[star] += types[type] * conditional[star];
  }
  return { types, stars };
};

export interface JourneyDrawAnalysis {
  eligible: CardItem[];
  pool: CardItem[];
  candidates: CardItem[];
  availableTypes: CardType[];
  probabilities: JourneyDrawProbabilities;
}

export const getJourneyDrawAnalysis = (
  options: SelectJourneyCardOptions,
): JourneyDrawAnalysis => {
  const { eligible, pool, candidates } = getJourneyPool(options);
  const probabilities = options.directorState
    ? computeJourneyWeighting(candidates, options).probabilities
    : probabilitiesForCandidates(
      candidates,
      options.intimacyPercent,
      options.config,
      options.preferredType ?? null,
      options.outfits,
      options.difficultyBoost ?? false,
    );
  const availableTypes = STANDARD_CARD_TYPES.filter((type) =>
    probabilities.types[type] > 0 && candidates.some((card) => card.type === type),
  );
  return { eligible, pool, candidates, availableTypes, probabilities };
};

export const getJourneyDrawProbabilities = (
  options: SelectJourneyCardOptions,
): JourneyDrawProbabilities => {
  return getJourneyDrawAnalysis(options).probabilities;
};

export const getJourneyAvailableTypes = (
  options: SelectJourneyCardOptions,
): CardType[] => {
  return getJourneyDrawAnalysis(options).availableTypes;
};

export const selectJourneyCard = (options: SelectJourneyCardOptions): JourneyCardSelectionResult => {
  const random = options.random ?? Math.random;
  const { pool, candidates, didResetPool } = getJourneyPool(options);
  const weighting = options.directorState ? computeJourneyWeighting(candidates, options) : null;
  const probabilities = weighting?.probabilities ?? probabilitiesForCandidates(
    candidates,
    options.intimacyPercent,
    options.config,
    options.preferredType ?? null,
    options.outfits,
    options.difficultyBoost ?? false,
  );
  const availableTypes = STANDARD_CARD_TYPES.filter((type) =>
    probabilities.types[type] > 0 && candidates.some((card) => card.type === type),
  );
  if (candidates.length === 0) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      availableTypes,
      didResetPool: false,
      probabilities,
      errorCode: 'no_cards',
    };
  }

  if (!isProgressionConfigPlayable(options.config)) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      availableTypes,
      didResetPool: false,
      probabilities,
      errorCode: 'no_progress_gain',
    };
  }

  if (weighting) {
    const card = chooseDirectedCard(
      candidates,
      weighting.cardWeights,
      random,
    );
    if (!card) {
      return {
        card: null,
        nextUsedCardIds: [...new Set(options.usedCardIds)],
        availableTypes,
        didResetPool: false,
        probabilities,
        errorCode: 'no_positive_weight',
      };
    }
    const poolIds = new Set(pool.map((item) => item.id));
    const nextUsedCardIds = didResetPool
      ? options.usedCardIds.filter((id) => !poolIds.has(id))
      : [...options.usedCardIds];
    if (!nextUsedCardIds.includes(card.id)) nextUsedCardIds.push(card.id);
    return { card, nextUsedCardIds, availableTypes, didResetPool, probabilities };
  }

  const typeKeys = STANDARD_CARD_TYPES.filter((type) => probabilities.types[type] > 0);
  const selectedType = chooseWeighted(typeKeys, probabilities.types, random);
  if (!selectedType) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      availableTypes,
      didResetPool: false,
      probabilities,
      errorCode: 'no_positive_weight',
    };
  }
  const typeCards = candidates.filter((card) => card.type === selectedType);
  const availableStars = DIFFICULTY_STARS.filter((star) =>
    typeCards.some((card) => deriveDifficultyStars(card) === star),
  );
  const band = getProgressionBand(options.intimacyPercent, options.config);
  const conditionalStars = starWeightsForAvailable(
    availableStars,
    band,
    options.outfits,
    options.intimacyPercent,
    options.difficultyBoost ?? false,
  );
  const selectedStar = chooseWeighted(availableStars, conditionalStars, random);
  if (!selectedStar) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      availableTypes,
      didResetPool: false,
      probabilities,
      errorCode: 'no_positive_weight',
    };
  }
  const finalPool = typeCards.filter((card) => deriveDifficultyStars(card) === selectedStar);
  const card = finalPool[Math.floor(safeRandom(random) * finalPool.length)];

  const poolIds = new Set(pool.map((item) => item.id));
  const nextUsedCardIds = didResetPool
    ? options.usedCardIds.filter((id) => !poolIds.has(id))
    : [...options.usedCardIds];
  if (!nextUsedCardIds.includes(card.id)) nextUsedCardIds.push(card.id);
  return { card, nextUsedCardIds, availableTypes, didResetPool, probabilities };
};

/**
 * One card a step easier than `card`: the next lower star that still has a card, same
 * type first, and never one that takes off a garment. The weights of the current band do
 * not count (a band may give 1★ no weight at all); novelty and pacing still do.
 */
export const selectLighterJourneyCard = (
  options: SelectJourneyCardOptions,
  card: CardItem,
): JourneyCardSelectionResult => {
  const random = options.random ?? Math.random;
  const stars = deriveDifficultyStars(card);
  const excludedCardIds = [...(options.excludedCardIds ?? []), card.id];
  const analysis = getJourneyDrawAnalysis({ ...options, preferredType: null, difficultyBoost: false });
  const used = new Set(options.usedCardIds);
  const fresh = analysis.eligible.filter((item) =>
    !used.has(item.id)
    && !excludedCardIds.includes(item.id)
    && !item.clothingEffect
    && deriveDifficultyStars(item) < stars);
  const sameType = fresh.filter((item) => item.type === card.type);
  const pool = sameType.length > 0 ? sameType : fresh;
  const target = Math.max(0, ...pool.map(deriveDifficultyStars));
  const tier = pool.filter((item) => deriveDifficultyStars(item) === target);
  const directorWeights = options.directorState
    ? getDirectorWeights(tier, options.directorState, options.actorIndex, options.outfits, options.accountUnlockedCardIds)
    : null;
  const chosen = chooseDirectedCard(
    tier,
    new Map(tier.map((item) => [item.id, Math.max(0.001, directorWeights?.get(item.id) ?? 1)] as const)),
    random,
  );
  return {
    card: chosen,
    nextUsedCardIds: chosen ? [...options.usedCardIds, chosen.id] : [...options.usedCardIds],
    availableTypes: analysis.availableTypes,
    didResetPool: false,
    probabilities: analysis.probabilities,
    errorCode: chosen ? undefined : 'no_cards',
  };
};

/** Two different cards to choose from; `used` is the draw history once that card is kept. */
export interface CardPair<Probabilities> {
  options: readonly [{ card: CardItem; used: string[] }, { card: CardItem; used: string[] }];
  probabilities: Probabilities;
}

/** Two cards from the normal draw, for the "Đổi vai" event turn. */
export const selectJourneyPair = (options: SelectJourneyCardOptions): CardPair<JourneyDrawProbabilities> | null => {
  const first = selectJourneyCard(options);
  if (!first.card) return null;
  const second = selectJourneyCard({
    ...options,
    usedCardIds: first.nextUsedCardIds,
    excludedCardIds: [...(options.excludedCardIds ?? []), first.card.id],
  });
  if (!second.card) return null;
  const keptFirst = first.nextUsedCardIds;
  return {
    options: [
      { card: first.card, used: keptFirst },
      { card: second.card, used: [...keptFirst.filter((id) => id !== first.card?.id), second.card.id] },
    ],
    probabilities: first.probabilities,
  };
};

export interface LuxuryDrawProbabilities {
  stars: Record<PositionDifficultyStars, number>;
  /** Absolute probability of drawing a Have Sex card on this draw. */
  finalCardChance: number;
}

export interface SelectLuxuryPositionCardOptions {
  cards: readonly CardItem[];
  actorIndex: PlayerIndex;
  outfits: readonly [OutfitState, OutfitState];
  usedCardIds: readonly string[];
  luxuryPercent: number;
  config: LuxuryProgressionConfig;
  /** Couple-account progress: unopened Position and Have Sex cards are preferred. */
  accountUnlockedCardIds?: readonly string[] | ReadonlySet<string>;
  /** How many distinct face-down Have Sex cards to offer when the final is due. */
  finalCandidateCount?: number;
  /** Cards that may not come up, even when the no-repeat pool starts again. */
  excludedCardIds?: readonly string[];
  /** Only this group of positions (see getPositionFamilyKey): the couple paid to choose it. */
  familyKey?: string | null;
  /** A paid draw never turns into the last choice. */
  skipFinal?: boolean;
  random?: () => number;
}

export interface LuxuryPositionSelectionResult {
  card: CardItem | null;
  nextUsedCardIds: string[];
  didResetPool: boolean;
  probabilities: LuxuryDrawProbabilities;
  missingFinalCard: boolean;
  /** Present when the Have Sex final is due: distinct cards to offer face down. */
  finalCandidates?: CardItem[];
  errorCode?: 'no_cards' | 'no_positive_weight' | 'missing_final' | 'no_progress_gain';
}

const toIdSet = (ids?: readonly string[] | ReadonlySet<string>): ReadonlySet<string> =>
  ids instanceof Set ? ids : new Set(ids ?? []);

/** Unopened cards keep full weight; opened ones keep 10% while unopened alternatives exist. */
const pickPreferringUnopened = (
  cards: readonly CardItem[],
  unlocked: ReadonlySet<string>,
  random: () => number,
): CardItem | null => {
  if (cards.length === 0) return null;
  const hasUnopened = cards.some((card) => !unlocked.has(card.id));
  const weights = new Map(cards.map((card) => [
    card.id,
    hasUnopened && unlocked.has(card.id) ? OPENED_CARD_WEIGHT : 1,
  ] as const));
  return chooseDirectedCard(cards, weights, random);
};

/**
 * Picks distinct Have Sex cards to place face down. Every card has the same
 * chance regardless of its stars; cards the couple has never opened come first.
 */
export const selectFinalChoiceCandidates = (
  finals: readonly CardItem[],
  accountUnlockedCardIds?: readonly string[] | ReadonlySet<string>,
  count: number = FINAL_CHOICE_CARD_COUNT,
  random: () => number = Math.random,
): CardItem[] => {
  const unlocked = toIdSet(accountUnlockedCardIds);
  const remaining = [...finals];
  const chosen: CardItem[] = [];
  while (chosen.length < count && remaining.length > 0) {
    const pick = pickPreferringUnopened(remaining, unlocked, random);
    if (!pick) break;
    chosen.push(pick);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return chosen;
};

export const getPositionFamilyKey = (card: CardItem): string =>
  card.position?.family === 'other'
    ? `other:${card.position.customLabel?.trim() ?? ''}`
    : card.position?.family ?? 'other';

/**
 * Within the drawn star tier, favour the family drawn least often this session
 * (weight 1 / (1 + draws)²), then favour cards the couple has never opened.
 */
const pickBalancedPositionCard = (
  starPool: readonly CardItem[],
  sessionCards: readonly CardItem[],
  unlocked: ReadonlySet<string>,
  random: () => number,
): CardItem | null => {
  if (starPool.length === 0) return null;
  const drawsByFamily = new Map<string, number>();
  for (const card of sessionCards) {
    const family = getPositionFamilyKey(card);
    drawsByFamily.set(family, (drawsByFamily.get(family) ?? 0) + 1);
  }
  const families = Array.from(new Set(starPool.map(getPositionFamilyKey)));
  const familyWeights = families.map((family) => 1 / (1 + (drawsByFamily.get(family) ?? 0)) ** 2);
  const total = familyWeights.reduce((sum, value) => sum + value, 0);
  let cursor = safeRandom(random) * total;
  let chosenFamily = families[families.length - 1];
  for (let index = 0; index < families.length; index += 1) {
    cursor -= familyWeights[index];
    if (cursor < 0) {
      chosenFamily = families[index];
      break;
    }
  }
  return pickPreferringUnopened(
    starPool.filter((card) => getPositionFamilyKey(card) === chosenFamily),
    unlocked,
    random,
  );
};

export interface GetLuxuryDrawProbabilitiesOptions {
  cards: readonly CardItem[];
  actorIndex: PlayerIndex;
  outfits: readonly [OutfitState, OutfitState];
  usedCardIds: readonly string[];
  luxuryPercent: number;
  config: LuxuryProgressionConfig;
}

export const getLuxuryDrawProbabilities = (
  options: GetLuxuryDrawProbabilitiesOptions,
): LuxuryDrawProbabilities => {
  const outfitsReady = options.outfits.every((outfit) => getOutfitStage(outfit) === 'empty');
  const positionCards = options.cards.filter((card) =>
    outfitsReady &&
    getCardDeck(card) === 'position' &&
    card.position &&
    audienceMatches(getCardTurnAudience(card), options.actorIndex) &&
    isCardEligibleForOutfits(card, options.actorIndex, options.outfits),
  );
  const finals = positionCards.filter((card) => card.position?.family === 'have_sex');
  const nonFinalEligible = positionCards.filter((card) => card.position?.family !== 'have_sex');
  const used = new Set(options.usedCardIds);
  let candidates = nonFinalEligible.filter((card) => !used.has(card.id));
  if (nonFinalEligible.length > 0 && candidates.length === 0) candidates = [...nonFinalEligible];
  return luxuryProbabilitiesForCandidates(candidates, finals, options.luxuryPercent, options.config);
};

const positionRecipientMatches = (card: CardItem, actorIndex: PlayerIndex): boolean =>
  audienceMatches(getCardTurnAudience(card), actorIndex);

export const getLuxuryProgressionBand = (
  percent: number,
  config: LuxuryProgressionConfig,
): LuxuryProgressionBand => {
  const safePercent = Math.max(0, Math.min(99, percent));
  return config.bands.find(
    (band) => safePercent >= band.minPercent && safePercent <= band.maxPercent,
  ) ?? config.bands[config.bands.length - 1];
};

const luxuryProbabilitiesForCandidates = (
  nonFinalCandidates: readonly CardItem[],
  finalCandidates: readonly CardItem[],
  percent: number,
  config: LuxuryProgressionConfig,
): LuxuryDrawProbabilities => {
  const raw = positionWeights({});
  if (percent >= 100) {
    return {
      stars: raw,
      finalCardChance: finalCandidates.length > 0 ? 1 : 0,
    };
  }
  const band = getLuxuryProgressionBand(percent, config);
  const nonFinalStars = POSITION_DIFFICULTY_STARS.filter((star) =>
    nonFinalCandidates.some((card) => derivePositionDifficultyStars(card) === star),
  );
  const nonFinalRaw = positionWeights({});
  for (const star of nonFinalStars) nonFinalRaw[star] = band.starWeights[star];
  const stars = positionWeights({}) as Record<PositionDifficultyStars, number>;
  const normalizedStars = normalize(POSITION_DIFFICULTY_STARS, nonFinalRaw);
  for (const star of POSITION_DIFFICULTY_STARS) stars[star] = normalizedStars[star];
  // The Have Sex roll no longer depends on star weights: the final is offered
  // as a separate three-card choice, so any eligible Have Sex card enables it.
  const finalCardChance = percent >= 80 && finalCandidates.length > 0
    ? config.finalCardChance / 100
    : 0;
  return { stars, finalCardChance };
};

export const selectLuxuryPositionCard = (
  options: SelectLuxuryPositionCardOptions,
): LuxuryPositionSelectionResult => {
  const random = options.random ?? Math.random;
  const unlocked = toIdSet(options.accountUnlockedCardIds);
  const finalCount = Math.max(1, Math.floor(options.finalCandidateCount ?? FINAL_CHOICE_CARD_COUNT));
  const chooseNearestAvailableStar = (
    cards: readonly CardItem[],
    band: LuxuryProgressionBand,
  ): PositionDifficultyStars | null => {
    if (cards.length === 0) return null;
    const available = [...new Set(cards.map(derivePositionDifficultyStars))].sort((a, b) => a - b);
    const weightedTarget = available.reduce((best, star) =>
      (band.starWeights[star] > band.starWeights[best] ? star : best), available[0]);
    const target = available.find((star) => star >= weightedTarget) ?? available[available.length - 1];
    return available.reduce((best, star) =>
      Math.abs(star - target) < Math.abs(best - target) ? star : best, available[0]);
  };
  const outfitsReady = options.outfits.every((outfit) => getOutfitStage(outfit) === 'empty');
  const positionCards = options.cards.filter((card) =>
    outfitsReady &&
    getCardDeck(card) === 'position' &&
    card.position &&
    positionRecipientMatches(card, options.actorIndex) &&
    isCardEligibleForOutfits(card, options.actorIndex, options.outfits),
  );
  const finals = positionCards.filter((card) => card.position?.family === 'have_sex');
  const excluded = new Set(options.excludedCardIds ?? []);
  const nonFinalEligible = positionCards.filter((card) =>
    card.position?.family !== 'have_sex'
    && !excluded.has(card.id)
    && (!options.familyKey || getPositionFamilyKey(card) === options.familyKey));
  const offerFinal = (probabilities: LuxuryDrawProbabilities): LuxuryPositionSelectionResult => {
    const finalCandidates = selectFinalChoiceCandidates(finals, unlocked, finalCount, random);
    return {
      card: finalCandidates[0] ?? null,
      nextUsedCardIds: [...new Set(options.usedCardIds)],
      didResetPool: false,
      probabilities,
      missingFinalCard: finals.length === 0,
      finalCandidates,
      errorCode: finals.length === 0 ? 'missing_final' : undefined,
    };
  };
  if (options.luxuryPercent >= 100) {
    return offerFinal(luxuryProbabilitiesForCandidates([], finals, 100, options.config));
  }
  const used = new Set(options.usedCardIds);
  let candidates = nonFinalEligible.filter((card) => !used.has(card.id));
  const didResetPool = nonFinalEligible.length > 0 && candidates.length === 0;
  if (didResetPool) candidates = [...nonFinalEligible];
  const probabilities = luxuryProbabilitiesForCandidates(
    candidates,
    options.skipFinal ? [] : finals,
    options.luxuryPercent,
    options.config,
  );
  const failure = (errorCode: NonNullable<LuxuryPositionSelectionResult['errorCode']>): LuxuryPositionSelectionResult => ({
    card: null,
    nextUsedCardIds: [...new Set(options.usedCardIds)],
    didResetPool: false,
    probabilities,
    missingFinalCard: false,
    errorCode,
  });
  if (!isLuxuryProgressionConfigPlayable(options.config)) return failure('no_progress_gain');
  if (
    !options.skipFinal
    && options.luxuryPercent >= 80
    && finals.length > 0
    && safeRandom(random) < probabilities.finalCardChance
  ) {
    return offerFinal(probabilities);
  }
  if (candidates.length === 0) return failure('no_cards');
  const weightedStars = POSITION_DIFFICULTY_STARS.filter(
    (star) => probabilities.stars[star] > 0,
  );
  const candidateStars = POSITION_DIFFICULTY_STARS.filter((star) =>
    candidates.some((card) => derivePositionDifficultyStars(card) === star),
  );
  if (candidateStars.length === 0) return failure('no_cards');
  const availableStars = weightedStars.length > 0 ? weightedStars : candidateStars;
  const conditionalWeights = normalize(availableStars, Object.fromEntries(
    availableStars.map((star) => [star, probabilities.stars[star] || 1]),
  ) as Record<PositionDifficultyStars, number>);
  const selectedStar = chooseWeighted(availableStars, conditionalWeights, random)
    ?? chooseNearestAvailableStar(candidates, getLuxuryProgressionBand(options.luxuryPercent, options.config));
  if (!selectedStar) return failure('no_cards');
  const starPool = candidates.filter((card) => derivePositionDifficultyStars(card) === selectedStar);
  // Count EVERY Position card drawn this session, including turn-specific ones
  // only the partner could draw. Counting just the current player's eligible
  // cards made the balance per-turn, so a family drawn twice on the partner's
  // turns still looked "unseen" here and kept being favoured.
  const cardById = new Map(
    options.cards
      .filter((card) => getCardDeck(card) === 'position' && card.position && card.position.family !== 'have_sex')
      .map((card) => [card.id, card] as const),
  );
  const sessionCards = options.usedCardIds
    .map((id) => cardById.get(id))
    .filter((card): card is CardItem => Boolean(card));
  const card = pickBalancedPositionCard(starPool, sessionCards, unlocked, random);
  if (!card) return failure('no_cards');
  const eligibleIds = new Set(nonFinalEligible.map((item) => item.id));
  const nextUsedCardIds = didResetPool
    ? options.usedCardIds.filter((id) => !eligibleIds.has(id))
    : [...options.usedCardIds];
  if (!nextUsedCardIds.includes(card.id)) nextUsedCardIds.push(card.id);
  return { card, nextUsedCardIds, didResetPool, probabilities, missingFinalCard: false };
};

/**
 * Two different Position cards, the second one from another group when possible (the
 * first pick counts as drawn). Never the last choice: the couple paid for two cards.
 */
export const selectPositionPair = (
  options: SelectLuxuryPositionCardOptions,
): CardPair<LuxuryDrawProbabilities> | null => {
  if (options.luxuryPercent >= 100) return null;
  const first = selectLuxuryPositionCard({ ...options, skipFinal: true });
  if (!first.card) return null;
  const second = selectLuxuryPositionCard({
    ...options,
    skipFinal: true,
    usedCardIds: first.nextUsedCardIds,
    excludedCardIds: [...(options.excludedCardIds ?? []), first.card.id],
  });
  if (!second.card) return null;
  const keptFirst = first.nextUsedCardIds;
  return {
    options: [
      { card: first.card, used: keptFirst },
      { card: second.card, used: [...keptFirst.filter((id) => id !== first.card?.id), second.card.id] },
    ],
    probabilities: first.probabilities,
  };
};

export interface PositionFamilyOption {
  key: string;
  /** Any card of the group, for its label. */
  sample: CardItem;
  /** Cards of the group this player can still draw this session. */
  count: number;
}

/** Groups of positions that still have an unplayed card for this player's turn. */
export const getPositionFamilyOptions = (
  options: Pick<SelectLuxuryPositionCardOptions, 'cards' | 'actorIndex' | 'outfits' | 'usedCardIds' | 'excludedCardIds'>,
): PositionFamilyOption[] => {
  if (!options.outfits.every((outfit) => getOutfitStage(outfit) === 'empty')) return [];
  const blocked = new Set([...options.usedCardIds, ...(options.excludedCardIds ?? [])]);
  const groups = new Map<string, PositionFamilyOption>();
  for (const card of options.cards) {
    if (
      getCardDeck(card) !== 'position'
      || !card.position
      || card.position.family === 'have_sex'
      || blocked.has(card.id)
      || !positionRecipientMatches(card, options.actorIndex)
      || !isCardEligibleForOutfits(card, options.actorIndex, options.outfits)
    ) continue;
    const key = getPositionFamilyKey(card);
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { key, sample: card, count: 1 });
  }
  return [...groups.values()].sort((a, b) =>
    (a.sample.position?.orderGroup ?? 0) - (b.sample.position?.orderGroup ?? 0) || a.key.localeCompare(b.key));
};

const weightedAverageStar = <Star extends number>(
  stars: readonly Star[],
  weights: Readonly<Record<Star, number>>,
): number | null => {
  const normalized = normalize(stars, weights);
  const total = stars.reduce((sum, star) => sum + normalized[star], 0);
  if (total <= 0) return null;
  return stars.reduce((sum, star) => sum + star * normalized[star], 0);
};

/**
 * Returns non-blocking warnings when a Standard progression config has
 * non-monotonic difficulty/Dare curves or assigns weight to empty star tiers.
 */
export const validateProgressionConfig = (
  config: ProgressionConfig,
  cards?: readonly CardItem[],
): string[] => {
  const warnings: string[] = [];
  const standardCards = cards?.filter((card) => getCardDeck(card) === 'standard');
  const availableStars = standardCards
    ? new Set(standardCards.map(deriveDifficultyStars))
    : null;

  let previousAvgStar: number | null = null;
  let previousDareRatio: number | null = null;

  for (const band of config.bands) {
    const label = `${band.minPercent}–${band.maxPercent}%`;
    const avgStar = weightedAverageStar(DIFFICULTY_STARS, band.starWeights);
    if (avgStar !== null && previousAvgStar !== null && avgStar + 0.05 < previousAvgStar) {
      warnings.push(
        `Mốc ${label} có độ khó sao trung bình (${avgStar.toFixed(2)}★) thấp hơn mốc trước (${previousAvgStar.toFixed(2)}★).`,
      );
    }
    if (avgStar !== null) previousAvgStar = avgStar;

    const normalizedTypes = normalize(STANDARD_CARD_TYPES, band.typeWeights);
    if (previousDareRatio !== null && normalizedTypes.dare + 0.02 < previousDareRatio) {
      warnings.push(
        `Mốc ${label} có tỉ lệ Thử thách (${Math.round(normalizedTypes.dare * 100)}%) giảm so với mốc trước (${Math.round(previousDareRatio * 100)}%).`,
      );
    }
    previousDareRatio = normalizedTypes.dare;

    if (availableStars) {
      const missingStars = DIFFICULTY_STARS.filter(
        (star) => band.starWeights[star] > 0 && !availableStars.has(star),
      );
      if (missingStars.length > 0) {
        warnings.push(
          `Mốc ${label} đặt trọng số cho ${missingStars.map((s) => `${s}★`).join(', ')} nhưng bộ bài Thường không có lá nào ở bậc sao này.`,
        );
      }
    }
  }

  return warnings;
};

/**
 * Returns non-blocking warnings when a Luxury progression config has
 * non-monotonic star curves, weights on empty non-final star tiers, or
 * gains so high that the 80–99% Have Sex window is skipped.
 */
export const validateLuxuryProgressionConfig = (
  config: LuxuryProgressionConfig,
  cards?: readonly CardItem[],
): string[] => {
  const warnings: string[] = [];
  const positionCards = cards?.filter((card) => getCardDeck(card) === 'position' && card.position);
  const nonFinals = positionCards?.filter((card) => card.position?.family !== 'have_sex');
  const finals = positionCards?.filter((card) => card.position?.family === 'have_sex');
  const nonFinalStarSet = nonFinals ? new Set(nonFinals.map(derivePositionDifficultyStars)) : null;

  let previousAvgStar: number | null = null;
  for (const band of config.bands) {
    const label = `${band.minPercent}–${band.maxPercent}%`;
    const activeStars = nonFinalStarSet
      ? POSITION_DIFFICULTY_STARS.filter((star) => nonFinalStarSet.has(star))
      : POSITION_DIFFICULTY_STARS;
    const bandForNonFinals = Object.fromEntries(
      POSITION_DIFFICULTY_STARS.map((star) => [
        star,
        activeStars.includes(star) ? band.starWeights[star] : 0,
      ]),
    ) as Record<PositionDifficultyStars, number>;
    const avgStar = weightedAverageStar(POSITION_DIFFICULTY_STARS, bandForNonFinals)
      ?? weightedAverageStar(POSITION_DIFFICULTY_STARS, band.starWeights);

    if (avgStar !== null && previousAvgStar !== null && avgStar + 0.05 < previousAvgStar) {
      warnings.push(
        `Mốc Luxury ${label} có độ khó trung bình (${avgStar.toFixed(2)}★) lùi xuống thấp hơn mốc trước (${previousAvgStar.toFixed(2)}★).`,
      );
    }
    if (avgStar !== null) previousAvgStar = avgStar;

    if (nonFinalStarSet && band.minPercent < 80) {
      const emptyWeighted = POSITION_DIFFICULTY_STARS.filter(
        (star) => band.starWeights[star] > 0 && !nonFinalStarSet.has(star),
      );
      if (emptyWeighted.length > 0) {
        warnings.push(
          `Mốc Luxury ${label} đặt trọng số cho ${emptyWeighted.map((s) => `${s}★`).join(', ')} nhưng không có lá Tư thế thường nào ở bậc sao này.`,
        );
      }
    }

  }
  if (finals && finals.length > 0 && finals.length < FINAL_CHOICE_CARD_COUNT) {
    warnings.push(
      `Chỉ có ${finals.length} lá Have Sex; màn chọn lá cuối cần ${FINAL_CHOICE_CARD_COUNT} lá úp để người chơi chọn.`,
    );
  }

  const nonTenGains = ([6, 7, 8, 9] as const)
    .map((star) => config.starGains[star])
    .filter((gain) => gain > 0);
  const avgGain = nonTenGains.length > 0
    ? nonTenGains.reduce((sum, val) => sum + val, 0) / nonTenGains.length
    : 0;
  if (avgGain > 11) {
    warnings.push(
      `Điểm cộng Luxury trung bình (${avgGain.toFixed(1)}%/lá) khá cao, khiến cửa sổ 80–99% chỉ kéo dài 1–2 lượt trước khi chạm 100%.`,
    );
  }

  return warnings;
};

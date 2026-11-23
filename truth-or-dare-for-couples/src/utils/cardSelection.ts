import {
  CardItem,
  CardLevel,
  CardType,
  ClothingEffect,
  OutfitState,
  PlayerIndex,
} from '../types';
import { getPresentGarmentSlots, getRemovableGarments } from './wardrobe';

export interface SelectEligibleCardOptions {
  cards: readonly CardItem[];
  preferredType?: CardType | null;
  actorIndex: PlayerIndex;
  outfits: readonly [OutfitState, OutfitState];
  usedCardIds: readonly string[];
  levels?: readonly CardLevel[];
  random?: () => number;
}

export interface CardSelectionResult {
  card: CardItem | null;
  nextUsedCardIds: string[];
  availableTypes: CardType[];
  didResetPool: boolean;
}

export interface CardDrawProbabilities {
  /** Values are normalized fractions from 0 to 1. */
  types: Record<CardType, number>;
  /** Values are normalized fractions from 0 to 1. */
  levels: Record<CardLevel, number>;
  passionateBoosted: boolean;
}

export interface GetCardDrawProbabilitiesOptions {
  outfits: readonly [OutfitState, OutfitState];
  levels?: readonly CardLevel[];
  preferredType?: CardType | null;
  availableTypes?: readonly CardType[];
  availableLevels?: readonly CardLevel[];
}

export type GetEligibleCardDrawProbabilitiesOptions = Omit<
  SelectEligibleCardOptions,
  'random'
>;

export const BASE_LEVEL_WEIGHTS: Readonly<Record<CardLevel, number>> = {
  gentle: 0.7,
  intimate: 0.2,
  passionate: 0.1,
};

/**
 * Once both players have at most one selected garment left, Passionate rises
 * from 10% to 40%. The remaining 60% keeps Gentle:Intimate at the original
 * 7:2 ratio (46.67% and 13.33%).
 */
export const BOOSTED_LEVEL_WEIGHTS: Readonly<Record<CardLevel, number>> = {
  gentle: 7 / 15,
  intimate: 2 / 15,
  passionate: 0.4,
};

const CARD_TYPES: readonly CardType[] = ['truth', 'dare'];
const CARD_LEVELS: readonly CardLevel[] = ['gentle', 'intimate', 'passionate'];

export const areBothPlayersLowOnClothing = (
  outfits: readonly [OutfitState, OutfitState],
): boolean => outfits.every((outfit) => getPresentGarmentSlots(outfit).length <= 1);

const normalizeRecord = <Key extends string>(
  keys: readonly Key[],
  enabled: ReadonlySet<Key>,
  weights: Readonly<Record<Key, number>>,
): Record<Key, number> => {
  const total = keys.reduce(
    (sum, key) => sum + (enabled.has(key) ? Math.max(0, weights[key]) : 0),
    0,
  );
  const alreadyNormalized = Math.abs(total - 1) < Number.EPSILON * keys.length;

  return Object.fromEntries(
    keys.map((key) => [
      key,
      total > 0 && enabled.has(key)
        ? (alreadyNormalized ? weights[key] : weights[key] / total)
        : 0,
    ]),
  ) as Record<Key, number>;
};

/**
 * Returns the configured draw chances used by the game. Disabled/unavailable
 * categories are zeroed and the remaining categories are re-normalized.
 */
export const getCardDrawProbabilities = ({
  outfits,
  levels,
  preferredType = null,
  availableTypes = CARD_TYPES,
  availableLevels,
}: GetCardDrawProbabilitiesOptions): CardDrawProbabilities => {
  const passionateBoosted = areBothPlayersLowOnClothing(outfits);
  const typeSet = new Set(availableTypes);
  const enabledTypeSet = new Set<CardType>(
    preferredType
      ? (typeSet.has(preferredType) ? [preferredType] : [])
      : CARD_TYPES.filter((type) => typeSet.has(type)),
  );
  const configuredLevels = new Set<CardLevel>(levels ?? CARD_LEVELS);
  const availableLevelSet = new Set<CardLevel>(availableLevels ?? CARD_LEVELS);
  const enabledLevelSet = new Set<CardLevel>(
    CARD_LEVELS.filter(
      (level) => configuredLevels.has(level) && availableLevelSet.has(level),
    ),
  );

  return {
    types: normalizeRecord(CARD_TYPES, enabledTypeSet, { truth: 1, dare: 1 }),
    levels: normalizeRecord(
      CARD_LEVELS,
      enabledLevelSet,
      passionateBoosted ? BOOSTED_LEVEL_WEIGHTS : BASE_LEVEL_WEIGHTS,
    ),
    passionateBoosted,
  };
};

export const isClothingEffect = (value: unknown): value is ClothingEffect => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ClothingEffect>;
  if (candidate.kind === 'swap_garments') return true;
  return candidate.kind === 'remove_garment' &&
    (candidate.target === 'self' || candidate.target === 'opponent' ||
      candidate.target === 'male' || candidate.target === 'female' || candidate.target === 'both');
};

export const normalizeCardClothingEffect = (card: CardItem): CardItem => {
  const effect = card.clothingEffect;
  if (!effect || effect.kind === 'swap_garments') return card;
  if (card.deck === 'position') {
    if (card.position?.family === 'have_sex') {
      const next = { ...card };
      delete next.clothingEffect;
      delete next.gameplayEffect;
      return next;
    }
    if (effect.target === 'self' || effect.target === 'opponent') {
      const turnAudience = card.position?.turnAudience ?? card.position?.recipient ?? 'both';
      const explicitTarget = effect.target === 'self'
        ? turnAudience
        : turnAudience === 'male'
          ? 'female'
          : turnAudience === 'female'
            ? 'male'
            : 'both';
      return {
        ...card,
        clothingEffect: {
          kind: 'remove_garment',
          target: explicitTarget,
        },
      };
    }
    return card;
  }
  // Standard cards address players relative to the drawer (self/opponent);
  // `both` means each player removes one garment at the same time.
  if (effect.target === 'male' || effect.target === 'female') {
    const next = { ...card };
    delete next.clothingEffect;
    return next;
  }
  return card;
};

export const getTargetIndex = (
  effect: { kind: 'remove_garment'; target: 'self' | 'opponent' },
  currentIndex: PlayerIndex,
): PlayerIndex => (effect.target === 'self' ? currentIndex : currentIndex === 0 ? 1 : 0);

export const getRemovalTargetIndices = (
  card: CardItem,
  actorIndex: PlayerIndex,
): PlayerIndex[] => {
  const effect = card.clothingEffect;
  if (!effect || effect.kind !== 'remove_garment') return [];
  if (card.deck === 'position') {
    if (card.position?.family === 'have_sex') return [];
    if (effect.target === 'male') return [0];
    if (effect.target === 'female') return [1];
    if (effect.target === 'both') return [0, 1];
    return [];
  }
  if (effect.target === 'self') return [actorIndex];
  if (effect.target === 'opponent') return [actorIndex === 0 ? 1 : 0];
  if (effect.target === 'both') return [0, 1];
  return [];
};

export const isCardEligibleForOutfits = (
  card: CardItem,
  actorIndex: PlayerIndex,
  outfits: readonly [OutfitState, OutfitState],
): boolean => {
  if (card.clothingEffect === undefined || card.clothingEffect === null) return true;
  if (!isClothingEffect(card.clothingEffect)) return false;
  if (card.deck === 'position' && card.position?.family === 'have_sex') return false;
  if (card.clothingEffect.kind === 'swap_garments') {
    return outfits.every((outfit) => getRemovableGarments(outfit).length > 0);
  }
  const targetIndices = getRemovalTargetIndices(card, actorIndex);
  return targetIndices.length > 0 && targetIndices.every(
    (targetIndex) => getRemovableGarments(outfits[targetIndex]).length > 0,
  );
};

const getEligiblePool = ({
  cards,
  preferredType = null,
  actorIndex,
  outfits,
  usedCardIds,
  levels,
}: GetEligibleCardDrawProbabilitiesOptions): {
  eligibleCards: CardItem[];
  pool: CardItem[];
  candidates: CardItem[];
  didResetPool: boolean;
} => {
  const enabledLevels = levels ? new Set(levels) : null;
  const eligibleCards = cards.filter(
    (card) =>
      (!enabledLevels || enabledLevels.has(card.level)) &&
      isCardEligibleForOutfits(card, actorIndex, outfits),
  );
  const pool = preferredType
    ? eligibleCards.filter((card) => card.type === preferredType)
    : eligibleCards;
  const used = new Set(usedCardIds);
  let candidates = pool.filter((card) => !used.has(card.id));
  const didResetPool = pool.length > 0 && candidates.length === 0;
  if (didResetPool) candidates = [...pool];
  return { eligibleCards, pool, candidates, didResetPool };
};

/**
 * Computes the exact marginal probabilities for the current eligible,
 * not-yet-used card pool. Level probabilities account for the selected card
 * type, so the UI matches the selector if a type is missing one or more levels.
 */
export const getEligibleCardDrawProbabilities = (
  options: GetEligibleCardDrawProbabilitiesOptions,
): CardDrawProbabilities => {
  const { candidates } = getEligiblePool(options);
  const candidateTypes = CARD_TYPES.filter((type) =>
    candidates.some((card) => card.type === type),
  );
  const base = getCardDrawProbabilities({
    outfits: options.outfits,
    levels: options.levels,
    preferredType: options.preferredType,
    availableTypes: candidateTypes,
  });
  const levels: Record<CardLevel, number> = {
    gentle: 0,
    intimate: 0,
    passionate: 0,
  };

  for (const type of CARD_TYPES) {
    if (base.types[type] === 0) continue;
    const typeLevels = CARD_LEVELS.filter((level) =>
      candidates.some((card) => card.type === type && card.level === level),
    );
    const conditional = getCardDrawProbabilities({
      outfits: options.outfits,
      levels: options.levels,
      preferredType: type,
      availableTypes: [type],
      availableLevels: typeLevels,
    }).levels;
    for (const level of CARD_LEVELS) {
      levels[level] += base.types[type] * conditional[level];
    }
  }

  return { ...base, levels };
};

/**
 * Preserves new gameplay metadata when loading an older edited built-in card.
 * An explicit null is retained so developers can intentionally disable an
 * effect or countdown without freezing unrelated future system metadata.
 */
export const mergeEditedSystemCard = (
  systemCard: CardItem,
  editedCard?: CardItem,
): CardItem => {
  if (!editedCard) {
    return normalizeCardClothingEffect(systemCard);
  }
  const hasIllustrationOverride = editedCard.illustrationOverride === true;
  const merged: CardItem = {
    ...systemCard,
    ...editedCard,
    icon: hasIllustrationOverride ? editedCard.icon : systemCard.icon,
    customImage: hasIllustrationOverride ? editedCard.customImage : systemCard.customImage,
    customImageId: hasIllustrationOverride ? editedCard.customImageId : systemCard.customImageId,
    clothingEffect:
      editedCard.clothingEffect === undefined
        ? systemCard.clothingEffect
        : editedCard.clothingEffect,
    gameplayEffect:
      editedCard.gameplayEffect === undefined
        ? systemCard.gameplayEffect
        : editedCard.gameplayEffect,
    timerSeconds:
      editedCard.timerSeconds === undefined
        ? systemCard.timerSeconds
        : editedCard.timerSeconds,
    deck: editedCard.deck === undefined ? systemCard.deck : editedCard.deck,
    progression:
      editedCard.progression === undefined
        ? systemCard.progression
        : editedCard.progression,
    position:
      editedCard.position === undefined
        ? systemCard.position
        : editedCard.position,
  };
  return normalizeCardClothingEffect(merged);
};

const safeRandom = (random: () => number): number => {
  const value = random();
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.999999999999, Math.max(0, value));
};

const chooseWeighted = <Key extends string>(
  keys: readonly Key[],
  probabilities: Readonly<Record<Key, number>>,
  random: () => number,
): Key | null => {
  const enabled = keys.filter((key) => probabilities[key] > 0);
  if (enabled.length === 0) return null;
  if (enabled.length === 1) return enabled[0];

  const roll = safeRandom(random);
  let cumulative = 0;
  for (const key of enabled) {
    cumulative += probabilities[key];
    if (roll < cumulative) return key;
  }
  return enabled[enabled.length - 1];
};

const chooseRandom = (cards: readonly CardItem[], random: () => number): CardItem =>
  cards[Math.floor(safeRandom(random) * cards.length)];

export const selectEligibleCard = ({
  cards,
  preferredType = null,
  actorIndex,
  outfits,
  usedCardIds,
  levels,
  random = Math.random,
}: SelectEligibleCardOptions): CardSelectionResult => {
  const { eligibleCards, pool, candidates, didResetPool } = getEligiblePool({
    cards,
    preferredType,
    actorIndex,
    outfits,
    usedCardIds,
    levels,
  });
  const availableTypes = CARD_TYPES.filter((type) =>
    eligibleCards.some((card) => card.type === type),
  );

  if (pool.length === 0) {
    return {
      card: null,
      nextUsedCardIds: [...new Set(usedCardIds)],
      availableTypes,
      didResetPool: false,
    };
  }

  const candidateTypes = CARD_TYPES.filter((type) =>
    candidates.some((card) => card.type === type),
  );
  const typeProbabilities = getCardDrawProbabilities({
    outfits,
    levels,
    preferredType,
    availableTypes: candidateTypes,
  }).types;
  const selectedType = chooseWeighted(CARD_TYPES, typeProbabilities, random);
  if (!selectedType) {
    return { card: null, nextUsedCardIds: [...new Set(usedCardIds)], availableTypes, didResetPool: false };
  }
  const typeCandidates = candidates.filter((card) => card.type === selectedType);

  const candidateLevels = CARD_LEVELS.filter((level) =>
    typeCandidates.some((card) => card.level === level),
  );
  const levelProbabilities = getCardDrawProbabilities({
    outfits,
    levels,
    preferredType: selectedType,
    availableTypes: [selectedType],
    availableLevels: candidateLevels,
  }).levels;
  const selectedLevel = chooseWeighted(CARD_LEVELS, levelProbabilities, random);
  if (!selectedLevel) {
    return { card: null, nextUsedCardIds: [...new Set(usedCardIds)], availableTypes, didResetPool: false };
  }
  const selectionPool = typeCandidates.filter((card) => card.level === selectedLevel);

  const card = chooseRandom(selectionPool, random);
  const poolIds = new Set(pool.map((item) => item.id));
  const nextUsedCardIds = didResetPool
    ? usedCardIds.filter((id) => !poolIds.has(id))
    : [...usedCardIds];
  if (!nextUsedCardIds.includes(card.id)) nextUsedCardIds.push(card.id);

  return { card, nextUsedCardIds, availableTypes, didResetPool };
};

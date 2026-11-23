import { ClothingEffect, ClothingFamily, ClothingIntensity, CardItem, OutfitState, PlayerIndex } from '../types';
import { getOutfitStage, getPresentGarmentSlots } from './wardrobe';

export type ClothingEventType = 'self' | 'opponent' | 'both' | 'choice' | 'challenge' | 'catch_up' | 'special';

export const CLOTHING_INTENSITY_WINDOWS: Record<ClothingIntensity, readonly [number, number]> = {
  C1: [20, 40], C2: [35, 55], C3: [50, 70], C4: [65, 85], C5: [80, 100],
};

export const getCardClothingFamily = (card: CardItem): ClothingFamily | null =>
  card.progression?.clothingFamily ?? clothingEffectFamily(card.clothingEffect);

export const getCardClothingIntensity = (card: CardItem): ClothingIntensity | null => {
  if (!card.clothingEffect) return null;
  if (card.progression?.clothingIntensity) return card.progression.clothingIntensity;
  if (card.level === 'gentle') return 'C1';
  if (card.level === 'passionate') return card.progression?.difficultyStars && card.progression.difficultyStars >= 4 ? 'C5' : 'C4';
  return 'C2';
};

/** No fixed clothing card is ever offered before this intimacy level. */
export const FIXED_CLOTHING_MIN_PERCENT = 20;

export const isClothingIntensityAllowed = (card: CardItem, intimacy: number): boolean => {
  const intensity = getCardClothingIntensity(card);
  if (!intensity) return true;
  const [min, max] = CLOTHING_INTENSITY_WINDOWS[intensity];
  return intimacy >= Math.max(FIXED_CLOTHING_MIN_PERCENT, min - 15) && intimacy <= max + 15;
};

export const getClothingFamilyCounts = (cards: readonly CardItem[]): Record<ClothingFamily, number> => {
  const counts = Object.fromEntries(EVENT_TYPES.map((family) => [family, 0])) as Record<ClothingFamily, number>;
  cards.forEach((card) => { const family = getCardClothingFamily(card); if (family) counts[family] += 1; });
  return counts;
};

export interface ClothingOpportunity {
  index: number;
  minIntimacy: number;
  maxIntimacy: number;
  eventType: ClothingEventType;
  status: 'pending' | 'completed' | 'skipped' | 'cooldown';
  cooldownTurns: number;
}

export interface ClothingJourneyState {
  opportunities: ClothingOpportunity[];
  lastProgressTurn: number;
  pityCounter: number;
  turnsSinceClothing: number;
  history: ClothingEventType[];
  firstRemoval: [boolean, boolean];
  removalCount: [number, number];
}

export const CLOTHING_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [20, 35], [35, 50], [50, 65], [60, 75], [75, 88], [85, 97],
];

const EVENT_TYPES: ClothingEventType[] = ['self', 'opponent', 'both', 'choice', 'challenge', 'catch_up', 'special'];

export const createClothingJourney = (): ClothingJourneyState => ({
  opportunities: CLOTHING_WINDOWS.map(([minIntimacy, maxIntimacy], index) => ({
    index, minIntimacy, maxIntimacy,
    eventType: EVENT_TYPES[index % EVENT_TYPES.length], status: 'pending', cooldownTurns: 0,
  })),
  lastProgressTurn: 0, pityCounter: 0, turnsSinceClothing: 0,
  history: [], firstRemoval: [false, false], removalCount: [0, 0],
});

export const normalizedWardrobeProgress = (outfit: OutfitState): number => {
  const initial = Object.keys(outfit.initial.garments).length;
  if (!initial) return 100;
  return Math.round((1 - getPresentGarmentSlots(outfit).length / initial) * 100);
};

export const wardrobeDifference = (outfits: readonly [OutfitState, OutfitState]): number =>
  Math.abs(normalizedWardrobeProgress(outfits[0]) - normalizedWardrobeProgress(outfits[1]));

export const expectedWardrobeProgress = (intimacy: number): number => {
  const value = Math.max(0, Math.min(100, intimacy));
  if (value < 20) return 0;
  if (value < 40) return 5 + ((value - 20) / 20) * 20;
  if (value < 60) return 20 + ((value - 40) / 20) * 30;
  if (value < 80) return 45 + ((value - 60) / 20) * 30;
  return 70 + ((value - 80) / 20) * 30;
};

export const isCatchUpMode = (intimacy: number, outfits: readonly [OutfitState, OutfitState]): boolean =>
  intimacy >= 75 && outfits.some((outfit) => getOutfitStage(outfit) === 'dressed');

export const advanceClothingTurn = (state: ClothingJourneyState): ClothingJourneyState => ({
  ...state,
  turnsSinceClothing: state.turnsSinceClothing + 1,
  opportunities: state.opportunities.map((opportunity) => opportunity.cooldownTurns > 0
    ? { ...opportunity, cooldownTurns: opportunity.cooldownTurns - 1,
        status: opportunity.status === 'cooldown' && opportunity.cooldownTurns <= 1 ? 'pending' : opportunity.status }
    : opportunity),
});

export const getActiveOpportunity = (state: ClothingJourneyState, intimacy: number): ClothingOpportunity | null =>
  state.opportunities.find((opportunity) => opportunity.status === 'pending'
    && intimacy >= opportunity.minIntimacy && intimacy <= opportunity.maxIntimacy
    && state.turnsSinceClothing >= 2) ?? null;

export const resolveClothingOpportunity = (
  state: ClothingJourneyState,
  opportunityIndex: number,
  result: 'completed' | 'skipped' | 'rerolled',
  eventType?: ClothingEventType,
  target?: PlayerIndex,
): ClothingJourneyState => {
  const opportunity = state.opportunities[opportunityIndex];
  if (!opportunity || opportunity.status === 'completed') return state;
  const type = eventType ?? opportunity.eventType;
  const completed = result === 'completed';
  const next = { ...state, opportunities: state.opportunities.map((item, index) => index === opportunityIndex
    ? { ...item, eventType: type, status: completed ? ('completed' as const) : ('cooldown' as const), cooldownTurns: completed ? 0 : 2 }
    : item),
    history: completed ? [...state.history, type] : state.history,
    turnsSinceClothing: completed ? 0 : state.turnsSinceClothing,
    pityCounter: completed ? 0 : state.pityCounter,
  };
  if (completed && target !== undefined) {
    next.firstRemoval[target] = true;
    next.removalCount[target] += 1;
  }
  return next;
};

export const clothingWeight = (state: ClothingJourneyState, intimacy: number, outfits: readonly [OutfitState, OutfitState]): number => {
  const active = getActiveOpportunity(state, intimacy);
  const lag = Math.max(0, expectedWardrobeProgress(intimacy) - Math.min(normalizedWardrobeProgress(outfits[0]), normalizedWardrobeProgress(outfits[1])));
  return Math.min(12, (active ? 4 : 1) + Math.min(5, state.pityCounter) + (isCatchUpMode(intimacy, outfits) ? 3 : 0) + Math.floor(lag / 20));
};

export const getBothRemovalWeight = (intimacy: number, outfits: readonly [OutfitState, OutfitState]): number => {
  if (intimacy < 20 || outfits.every((outfit) => getPresentGarmentSlots(outfit).length === 0)) return 0;
  if (intimacy < 40) return 0.15;
  if (intimacy < 60) return 0.6;
  if (intimacy < 80) return 1.5;
  return 2.5;
};

export const getWardrobeCatchUpTarget = (outfits: readonly [OutfitState, OutfitState]): PlayerIndex | null => {
  const progress = outfits.map(normalizedWardrobeProgress);
  if (Math.abs(progress[0] - progress[1]) < 15) return null;
  return progress[0] < progress[1] ? 0 : 1;
};

export const clothingEffectFamily = (effect: ClothingEffect | null | undefined): ClothingEventType | null => {
  if (!effect) return null;
  if (effect.kind === 'swap_garments') return 'special';
  if (effect.target === 'both') return 'both';
  if (effect.target === 'self') return 'self';
  if (effect.target === 'opponent') return 'opponent';
  return 'choice';
};

export type CardLevel = 'gentle' | 'intimate' | 'passionate';
export type CardType = 'truth' | 'dare';
export type PlayerIndex = 0 | 1;
export type CardDeck = 'standard' | 'position';
export type DifficultyStars = 1 | 2 | 3 | 4 | 5;
/** Runtime Position stars are 6–10; 1–5 remain in this type only for legacy save migration. */
export type PositionDifficultyStars = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type TurnAudience = 'male' | 'female' | 'both';
/** @deprecated Hydrated for old backups only. New writes use TurnAudience. */
export type CardAudience = TurnAudience | 'current' | 'opponent';
export type PositionFamily = 'oral' | 'blowjob' | 'handjob' | 'have_sex' | 'other';
export type PositionRecipient = 'male' | 'female' | 'both';
export type PositionRarity = 'luxury' | 'mythic';

export type PlayerPresentation = 'male' | 'female';
export type GarmentSlot = 'shirt' | 'pants' | 'bra' | 'underwear';
export type OutfitStage = 'dressed' | 'underwear_only' | 'empty';
export type StandardRemovalTarget = 'self' | 'opponent';
export type PositionRemovalTarget = 'male' | 'female' | 'both';
export type ClothingFamily = 'self' | 'opponent' | 'both' | 'choice' | 'challenge' | 'catch_up' | 'special';
export type ClothingIntensity = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
export type CardPhaseTag = 'gentle' | 'intimate' | 'passionate';
export type GameEndReason = 'pink_complete' | 'have_sex' | 'no_cards' | 'manual';

export interface GarmentConfig {
  styleId: string;
  color: string;
}

export interface EquippedGarment extends GarmentConfig {
  id: string;
  slot: GarmentSlot;
  originPresentation: PlayerPresentation;
  originalOwnerIndex?: PlayerIndex;
}

export interface OutfitConfig {
  presentation: PlayerPresentation;
  garments: Partial<Record<GarmentSlot, GarmentConfig>>;
}

export interface OutfitState {
  initial: OutfitConfig;
  equippedGarments: EquippedGarment[];
  /** Derived compatibility field. Runtime logic uses equippedGarments. */
  remainingSlots: GarmentSlot[];
}

export type ClothingEffect =
  | { kind: 'remove_garment'; target: StandardRemovalTarget | PositionRemovalTarget }
  | { kind: 'swap_garments' };

export interface CardProgressionMetadata {
  difficultyStars: DifficultyStars;
  /** The player turn on which this card can be drawn. */
  turnAudience?: TurnAudience;
  /** @deprecated Legacy field retained for backup compatibility. */
  audience?: CardAudience;
  /** Overrides the global gain for this star rating when supplied. */
  intimacyGain?: number;
  actorStages?: OutfitStage[];
  partnerStages?: OutfitStage[];
  /** Explicit clothing metadata; legacy cards may omit it and use a safe derived fallback. */
  clothingFamily?: ClothingFamily;
  clothingIntensity?: ClothingIntensity;
  clothingCooldownFamily?: ClothingFamily;
  /** Content heat is independent from difficulty stars (1 = gentle, 10 = hottest). */
  heat?: number;
  /** Director pacing phase; can intentionally differ from the display level. */
  phaseTag?: CardPhaseTag;
}

export interface PositionMetadata {
  family: PositionFamily;
  /** Developer-defined label when family is `other`. */
  customLabel?: string;
  /** The player turn on which this card can be drawn. */
  turnAudience?: TurnAudience;
  /** @deprecated Legacy field retained for backup compatibility. */
  recipient?: PositionRecipient;
  /** Oral=1, blowjob=2, handjob=3, final rare card=4. */
  orderGroup: 1 | 2 | 3 | 4;
  rarity: PositionRarity;
  /** Position cards use an independent 1–10 star ladder. */
  difficultyStars?: PositionDifficultyStars;
  /** Overrides the Luxury gain for this position card. */
  luxuryGain?: number;
}

export interface CardAppearance {
  /** Display scale applied to either the built-in icon or uploaded illustration. */
  iconScale?: number;
  /** Display scale applied to every text group rendered inside the card. */
  textScale?: number;
  /** Visual distance in pixels between the illustration and the main card copy. */
  iconTextGap?: number;
}

export interface ProgressionBand {
  minPercent: number;
  maxPercent: number;
  typeWeights: Record<CardType, number>;
  starWeights: Record<DifficultyStars, number>;
}

export interface ProgressionConfig {
  bands: ProgressionBand[];
  starGains: Record<DifficultyStars, number>;
  cardRemovalBonus: number;
}

export interface LuxuryProgressionBand {
  minPercent: number;
  maxPercent: number;
  starWeights: Record<PositionDifficultyStars, number>;
}

export interface LuxuryProgressionConfig {
  bands: LuxuryProgressionBand[];
  starGains: Record<PositionDifficultyStars, number>;
  /** Independent chance (0–100) to draw a Have Sex card at 80–99% Luxury. */
  finalCardChance: number;
}

export type JourneyPhase = 'standard' | 'position_consent' | 'position' | 'final';

export interface IntimacyEvent {
  cardId: string;
  amount: number;
  source: 'completed_card' | 'card_clothing_removal';
  track?: 'standard' | 'luxury';
  round: number;
  timestamp: number;
}

export interface PlayerRewardState {
  starBalance: number;
  totalStarsEarned: number;
  rerollsUsed: number;
  difficultyBoostsUsed: number;
}

export interface PendingDifficultyBoost {
  ownerPlayerIndex: PlayerIndex;
  targetPlayerIndex: PlayerIndex;
  queuedRound: number;
}

export interface RewardEvent {
  kind:
    | 'earned_stars'
    | 'rerolled_card'
    | 'queued_difficulty_boost'
    | 'refunded_difficulty_boost'
    | 'final_card_flips'
    | 'position_reroll'
    | 'position_pair'
    | 'position_family'
    | 'event_stars';
  playerIndex: PlayerIndex;
  amount: number;
  round: number;
  timestamp: number;
  cardId?: string;
}

export type ClothingRemovalSource = 'card' | 'penalty' | 'preparation';

export type CardResolutionStatus = 'completed' | 'skipped' | 'rerolled' | 'passed' | 'final_viewed';

export interface CardResolutionEvent {
  id: string;
  cardId: string;
  playerIndex: PlayerIndex;
  status: CardResolutionStatus;
  deck: CardDeck;
  round: number;
  timestamp: number;
}

export interface PositionSessionStats {
  drawn: number;
  opened: number;
  completed: number;
  skipped: number;
}

export type CardGameplayEffect = { kind: 'pass_turn' };

export interface ClothingRemovalEvent {
  actorPlayerIndex: PlayerIndex;
  targetPlayerIndex: PlayerIndex;
  garmentSlot: GarmentSlot;
  garment: GarmentConfig;
  source: ClothingRemovalSource;
  action?: 'removed' | 'transferred' | 'replaced';
  garmentId?: string;
  toPlayerIndex?: PlayerIndex;
  cardId?: string;
  round: number;
  timestamp: number;
}

export interface CardItem {
  id: string;
  type: CardType;
  level: CardLevel;
  content: string;
  hint?: string;
  /**
   * Optional per-card countdown for truths, dares and position cards.
   * `undefined` inherits built-in metadata during edit merging, while `null`
   * records that a developer explicitly disabled the timer for this card.
   */
  timerSeconds?: number | null;
  isCustom?: boolean;
  icon?: string; // SVG icon name for card illustration
  customImage?: string; // Base64 data URL for custom uploaded icon
  /** IndexedDB key for uploaded illustrations. Legacy base64 uses customImage. */
  customImageId?: string;
  /** Marks a deliberate illustration override on an edited built-in card. */
  illustrationOverride?: boolean;
  /** Optional per-card visual sizing. Missing values use the normal 1× layout. */
  appearance?: CardAppearance;
  clothingEffect?: ClothingEffect | null;
  gameplayEffect?: CardGameplayEffect | null;
  /** Missing means a legacy/custom standard card. */
  deck?: CardDeck;
  /** Director metadata is stored on the card so every deck can participate. */
  heat?: number;
  phaseTag?: CardPhaseTag;
  progression?: CardProgressionMetadata | null;
  position?: PositionMetadata | null;
}

export interface Player {
  name: string;
  avatar: string; // Emoji or icon key
  color: string;
  completedCount: number;
  skippedCount: number;
}

export interface GameSettings {
  levels: CardLevel[];
  roundsMode: 'unlimited' | 'target';
  targetRounds: number;
  privacyDefault: boolean; // Hide content until click
  drawMode: 'random' | 'choose'; // Allow player to pick Truth or Dare first or complete random
  outfits: [OutfitConfig, OutfitConfig];
  penaltyClothingEnabled: boolean;
}

export interface GameState {
  screen: 'intro' | 'setup' | 'game' | 'collection' | 'summary';
  player1: Player;
  player2: Player;
  currentPlayerIndex: 0 | 1;
  currentRound: number;
  selectedCard: CardItem | null;
  cardState: 'deck' | 'shuffling' | 'drawn_hidden' | 'drawn_revealed' | 'completed';
  drawnCardTypeChoice: CardType | null;
  history: {
    card: CardItem;
    player: string;
    action: 'completed' | 'skipped';
    timestamp: number;
  }[];
  favorites: string[]; // card IDs
}

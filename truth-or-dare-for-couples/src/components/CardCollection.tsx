import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Search,
  Plus,
  X,
  Home,
  ArrowLeft,
  Upload,
  RotateCcw,
  Trash2,
  Move,
  ZoomIn,
  Pencil,
  Eraser,
  Code2,
  LockKeyhole,
  Timer,
  SlidersHorizontal,
  Crop,
  ChevronsUp,
  ChevronsDown,
  Cloud,
  CloudOff,
  Download,
  DatabaseBackup,
  ShieldCheck,
} from 'lucide-react';
import {
  TurnAudience,
  CardDeck,
  CardItem,
  CardLevel,
  CardType,
  ClothingEffect,
  DifficultyStars,
  OutfitStage,
  PositionFamily,
  PositionRarity,
  ProgressionConfig,
  LuxuryProgressionConfig,
  PositionDifficultyStars,
} from '../types';
import { soundEngine } from '../utils/audio';
import { GameCard } from './GameCard';
import { CARD_ICON_NAMES, autoAssignIcon, getCardIcon } from './CardIcons';
import { ProgressionConfigModal } from './ProgressionConfigModal';
import { deriveDifficultyStars, derivePositionDifficultyStars, getCardDeck, getCardTurnAudience, POSITION_DIFFICULTY_STARS } from '../utils/progression';
import { compareCollectionCards } from '../utils/cardOrdering';
import type { CatalogSyncStatus } from '../utils/cloudCatalog';
import type { AdminPlayerStats } from '../utils/playerSession';

export type CardCollectionMode = 'player' | 'developer';

export interface CardCollectionProps {
  cards: CardItem[];
  favorites: string[];
  onToggleFavorite: (cardId: string) => void;
  onAddCustomCard?: (newCard: CardItem) => void;
  onUpdateCard?: (
    card: CardItem,
    metadata: {
      clothingEffectTouched: boolean;
      illustrationTouched: boolean;
      timerTouched: boolean;
      progressionTouched: boolean;
      positionTouched: boolean;
    },
  ) => void;
  /** Defaults to developer to preserve the behavior of older call sites. */
  mode?: CardCollectionMode;
  /** Undefined means all cards are unlocked, preserving older saved data/call sites. */
  unlockedCardIds?: string[];
  /** Developer-only action. Omit it when card deletion is not supported. */
  onDeleteCard?: (card: CardItem) => void;
  /** Keeps the back action accurate when the collection is opened mid-game. */
  backDestination?: 'home' | 'game';
  progressionConfig: ProgressionConfig;
  onProgressionConfigChange?: (config: ProgressionConfig) => void;
  luxuryProgressionConfig: LuxuryProgressionConfig;
  onLuxuryProgressionConfigChange?: (config: LuxuryProgressionConfig) => void;
  catalogSync?: CatalogSyncStatus;
  playerStats?: AdminPlayerStats | null;
  onExportCatalog?: () => Promise<string>;
  onImportCatalog?: (file: File) => Promise<string>;
  onCreateCloudBackup?: () => Promise<string>;
  coupleName?: string;
  onOpenAccountModal?: () => void;
  onBack: () => void;
}

type ClothingEffectSelection = 'none' | 'self' | 'opponent' | 'male' | 'female' | 'both' | 'swap';
type CollectionTab = 'all' | 'truth' | 'dare' | 'favorites' | CardLevel;
type StageSelection = 'any' | OutfitStage;
type CardTimerMode = 'inherit' | 'disabled' | 'custom';

const CARD_TIMER_PRESETS = [10, 15, 30, 45, 60] as const;
const DEFAULT_CARD_TIMER_SECONDS = 60;
const MAX_CARD_TIMER_SECONDS = 3600;

interface LockedCollectionCardProps {
  position: number;
}

const LockedCollectionCard: React.FC<LockedCollectionCardProps> = ({ position }) => (
  <div
    role="img"
    aria-label={`Lá bài bí mật số ${position}, chưa mở khóa. Hoàn thành lá bài này trong ván chơi để mở khóa.`}
    className="group relative min-h-[180px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-neutral-950/75 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.2)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-rose-300/30 hover:shadow-[0_20px_45px_rgba(244,63,94,0.12)] motion-reduce:transform-none motion-reduce:transition-none"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(244,114,182,0.12),transparent_42%)] opacity-70" />
    <div className="relative flex h-full min-h-[154px] flex-col items-center justify-center text-center">
      <span className="absolute left-2.5 top-2.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
        <LockKeyhole className="h-3 w-3" aria-hidden="true" /> Bí mật
      </span>
      <span
        aria-hidden="true"
        className="font-serif-romantic text-6xl font-bold leading-none text-rose-200/70 drop-shadow-[0_0_18px_rgba(251,113,133,0.25)] transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
      >
        ?
      </span>
      <p className="mt-3 max-w-[13rem] text-[10px] leading-relaxed text-neutral-500">
        Hoàn thành trong ván chơi để mở khóa
      </p>
    </div>
  </div>
);

type IconPalette = 'standard' | 'position' | 'mythic';

const ICON_PALETTES: Record<IconPalette, { shadow: [number, number, number]; light: [number, number, number] }> = {
  standard: { shadow: [255, 107, 157], light: [255, 246, 249] },
  position: { shadow: [216, 180, 92], light: [255, 248, 231] },
  mythic: { shadow: [224, 145, 158], light: [229, 231, 235] },
};

// Detect the foreground, crop around it, remove a flat corner background and
// recolor the result to the visual language of the selected card deck.
function renderCardIcon(
  originalDataUrl: string,
  options: {
    threshold: number;
    contrast: number;
    zoom: number;
    offsetX: number;
    offsetY: number;
    removeBackground: boolean;
    backgroundTolerance: number;
    whiteOutlineWidth: number;
    autoCrop: boolean;
    palette: IconPalette;
  },
  callback: (dataUrl: string) => void
) {
  const img = new Image();
  img.onload = () => {
    const size = 256;
    const sampleSize = 128;
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleSize;
    sampleCanvas.height = sampleSize;
    const sampleCtx = sampleCanvas.getContext('2d')!;
    sampleCtx.clearRect(0, 0, sampleSize, sampleSize);
    sampleCtx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const sampleData = sampleCtx.getImageData(0, 0, sampleSize, sampleSize).data;

    const cornerSize = 6;
    const cornerOrigins = [[0, 0], [sampleSize - cornerSize, 0], [0, sampleSize - cornerSize], [sampleSize - cornerSize, sampleSize - cornerSize]];
    let backgroundR = 0;
    let backgroundG = 0;
    let backgroundB = 0;
    let backgroundSamples = 0;
    cornerOrigins.forEach(([originX, originY]) => {
      for (let sampleY = originY; sampleY < originY + cornerSize; sampleY += 1) {
        for (let sampleX = originX; sampleX < originX + cornerSize; sampleX += 1) {
          const sampleIndex = (sampleY * sampleSize + sampleX) * 4;
          if (sampleData[sampleIndex + 3] < 20) continue;
          backgroundR += sampleData[sampleIndex];
          backgroundG += sampleData[sampleIndex + 1];
          backgroundB += sampleData[sampleIndex + 2];
          backgroundSamples += 1;
        }
      }
    });
    if (backgroundSamples > 0) {
      backgroundR /= backgroundSamples;
      backgroundG /= backgroundSamples;
      backgroundB /= backgroundSamples;
    }

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = img.width;
    let sourceHeight = img.height;
    if (options.autoCrop) {
      let minX = sampleSize;
      let minY = sampleSize;
      let maxX = -1;
      let maxY = -1;
      for (let sampleY = 0; sampleY < sampleSize; sampleY += 1) {
        for (let sampleX = 0; sampleX < sampleSize; sampleX += 1) {
          const sampleIndex = (sampleY * sampleSize + sampleX) * 4;
          const alpha = sampleData[sampleIndex + 3];
          if (alpha < 24) continue;
          const distance = Math.sqrt(
            ((sampleData[sampleIndex] - backgroundR) ** 2)
            + ((sampleData[sampleIndex + 1] - backgroundG) ** 2)
            + ((sampleData[sampleIndex + 2] - backgroundB) ** 2),
          );
          if (options.removeBackground && backgroundSamples > 0 && distance <= options.backgroundTolerance + 12) continue;
          minX = Math.min(minX, sampleX);
          minY = Math.min(minY, sampleY);
          maxX = Math.max(maxX, sampleX);
          maxY = Math.max(maxY, sampleY);
        }
      }
      if (maxX >= minX && maxY >= minY) {
        const padding = Math.max(3, Math.round(Math.max(maxX - minX, maxY - minY) * 0.08));
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(sampleSize - 1, maxX + padding);
        maxY = Math.min(sampleSize - 1, maxY + padding);
        sourceX = (minX / sampleSize) * img.width;
        sourceY = (minY / sampleSize) * img.height;
        sourceWidth = ((maxX - minX + 1) / sampleSize) * img.width;
        sourceHeight = ((maxY - minY + 1) / sampleSize) * img.height;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const containScale = Math.min(size / sourceWidth, size / sourceHeight) * options.zoom;
    const width = sourceWidth * containScale;
    const height = sourceHeight * containScale;
    const x = (size - width) / 2 + (options.offsetX / 100) * size;
    const y = (size - height) / 2 + (options.offsetY / 100) * size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const palette = ICON_PALETTES[options.palette];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let a = data[i + 3];

      if (a < 10) continue;

      if (options.removeBackground && backgroundSamples > 0) {
        const colorDistance = Math.sqrt(
          ((r - backgroundR) ** 2) +
          ((g - backgroundG) ** 2) +
          ((b - backgroundB) ** 2)
        );
        if (colorDistance <= options.backgroundTolerance) {
          data[i + 3] = 0;
          continue;
        }
        const featherWidth = 42;
        if (colorDistance < options.backgroundTolerance + featherWidth) {
          const featherAlpha = (colorDistance - options.backgroundTolerance) / featherWidth;
          a = Math.round(a * featherAlpha);
        }
      }

      // Calculate brightness
      let brightness = (r * 0.299 + g * 0.587 + b * 0.114);

      // Apply contrast
      brightness = ((brightness / 255 - 0.5) * options.contrast + 0.5) * 255;
      brightness = Math.max(0, Math.min(255, brightness));

      // Map luminance to the selected two-color card palette.
      if (brightness < options.threshold) {
        const intensity = 1 - (brightness / options.threshold);
        const blend = (1 - intensity) * 0.42;
        data[i] = Math.round(palette.shadow[0] + (palette.light[0] - palette.shadow[0]) * blend);
        data[i + 1] = Math.round(palette.shadow[1] + (palette.light[1] - palette.shadow[1]) * blend);
        data[i + 2] = Math.round(palette.shadow[2] + (palette.light[2] - palette.shadow[2]) * blend);
        data[i + 3] = Math.min(a, Math.round(180 + intensity * 75));
      } else {
        const fade = (brightness - options.threshold) / (255 - options.threshold);
        const blend = 0.42 + fade * 0.58;
        data[i] = Math.round(palette.shadow[0] + (palette.light[0] - palette.shadow[0]) * blend);
        data[i + 1] = Math.round(palette.shadow[1] + (palette.light[1] - palette.shadow[1]) * blend);
        data[i + 2] = Math.round(palette.shadow[2] + (palette.light[2] - palette.shadow[2]) * blend);
        data[i + 3] = Math.min(a, Math.round(205 - fade * 55));
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const outlineWidth = Math.max(0, Math.min(12, Math.round(options.whiteOutlineWidth)));
    if (outlineWidth > 0) {
      const foregroundCanvas = document.createElement('canvas');
      foregroundCanvas.width = size;
      foregroundCanvas.height = size;
      const foregroundCtx = foregroundCanvas.getContext('2d')!;
      foregroundCtx.putImageData(imageData, 0, 0);

      ctx.clearRect(0, 0, size, size);
      for (let radius = 1; radius <= outlineWidth; radius += 1) {
        const samples = Math.max(16, Math.ceil(Math.PI * radius * 2));
        for (let sample = 0; sample < samples; sample += 1) {
          const angle = (sample / samples) * Math.PI * 2;
          ctx.drawImage(
            foregroundCanvas,
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
          );
        }
      }
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(foregroundCanvas, 0, 0);
    }
    callback(canvas.toDataURL('image/png'));
  };
  img.src = originalDataUrl;
}

export const CardCollection: React.FC<CardCollectionProps> = ({
  cards,
  favorites,
  onToggleFavorite,
  onAddCustomCard,
  onUpdateCard,
  mode = 'developer',
  unlockedCardIds,
  onDeleteCard,
  backDestination = 'home',
  progressionConfig,
  onProgressionConfigChange,
  luxuryProgressionConfig,
  onLuxuryProgressionConfigChange,
  catalogSync,
  playerStats,
  onExportCatalog,
  onImportCatalog,
  onCreateCloudBackup,
  coupleName,
  onOpenAccountModal,
  onBack,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<CollectionTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [pendingDeleteCardId, setPendingDeleteCardId] = useState<string | null>(null);
  const [showProgressionConfig, setShowProgressionConfig] = useState(false);
  const [deckFilter, setDeckFilter] = useState<'all' | CardDeck>('all');
  const [starFilter, setStarFilter] = useState<'all' | PositionDifficultyStars>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | TurnAudience>('all');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Add Custom Card Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [customType, setCustomType] = useState<CardType>('truth');
  const [customLevel, setCustomLevel] = useState<CardLevel>('gentle');
  const [customContent, setCustomContent] = useState('');
  const [customHint, setCustomHint] = useState('');
  const [customIcon, setCustomIcon] = useState('heart');
  const [customClothingEffect, setCustomClothingEffect] = useState<ClothingEffectSelection>('none');
  const [clothingEffectTouched, setClothingEffectTouched] = useState(false);
  const [illustrationTouched, setIllustrationTouched] = useState(false);
  const [customTimerMode, setCustomTimerMode] = useState<CardTimerMode>('inherit');
  const [customTimerSeconds, setCustomTimerSeconds] = useState(String(DEFAULT_CARD_TIMER_SECONDS));
  const [timerTouched, setTimerTouched] = useState(false);
  const [customDeck, setCustomDeck] = useState<CardDeck>('standard');
  const [customStars, setCustomStars] = useState<PositionDifficultyStars>(1);
  const [customAudience, setCustomAudience] = useState<TurnAudience>('both');
  const [customGainEnabled, setCustomGainEnabled] = useState(false);
  const [customGain, setCustomGain] = useState('4');
  const [customActorStage, setCustomActorStage] = useState<StageSelection>('any');
  const [customPartnerStage, setCustomPartnerStage] = useState<StageSelection>('any');
  const [customPositionFamily, setCustomPositionFamily] = useState<PositionFamily>('oral');
  const [customPositionLabel, setCustomPositionLabel] = useState('');
  const [customPositionRecipient, setCustomPositionRecipient] = useState<TurnAudience>('both');
  const [customPositionOrder, setCustomPositionOrder] = useState<1 | 2 | 3 | 4>(1);
  const [customPositionRarity, setCustomPositionRarity] = useState<PositionRarity>('luxury');
  const [progressionTouched, setProgressionTouched] = useState(false);
  const [positionTouched, setPositionTouched] = useState(false);

  const parsedCustomTimerSeconds = Number(customTimerSeconds);
  const hasValidCustomTimer = customTimerMode !== 'custom'
    || (
      Number.isInteger(parsedCustomTimerSeconds)
      && parsedCustomTimerSeconds >= 1
      && parsedCustomTimerSeconds <= MAX_CARD_TIMER_SECONDS
    );
  const parsedCustomGain = Number(customGain);
  const hasValidCustomGain = !customGainEnabled || (
    Number.isFinite(parsedCustomGain) && parsedCustomGain >= 0 && parsedCustomGain <= 100
  );
  const suggestedClothingEffect = useMemo<ClothingEffectSelection | null>(() => {
    const content = customContent.toLocaleLowerCase('vi');
    if (/đổi[^.!?\n]{0,48}(đồ|trang phục|quần|áo)|đổi[^.!?\n]{0,48}cho nhau/.test(content)) return 'swap';
    if (!/(cởi|bỏ|tháo)/.test(content)) return null;
    if (customDeck === 'position') return customPositionRecipient;
    return /(đối phương|người ấy|của anh|của em)/.test(content) ? 'opponent' : 'self';
  }, [customContent, customDeck, customPositionRecipient]);

  // Image upload & editor state
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [imgThreshold, setImgThreshold] = useState(140);
  const [imgContrast, setImgContrast] = useState(1.5);
  const [imgZoom, setImgZoom] = useState(1);
  const [imgOffsetX, setImgOffsetX] = useState(0);
  const [imgOffsetY, setImgOffsetY] = useState(0);
  const [imgAutoCrop, setImgAutoCrop] = useState(true);
  const [imgRemoveBackground, setImgRemoveBackground] = useState(true);
  const [imgBackgroundTolerance, setImgBackgroundTolerance] = useState(55);
  const [imgWhiteOutlineWidth, setImgWhiteOutlineWidth] = useState(3);
  const [cardIconScale, setCardIconScale] = useState(1);
  const [cardTextScale, setCardTextScale] = useState(1);
  const [cardIconTextGap, setCardIconTextGap] = useState(8);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageProcessingEnabledRef = useRef(false);
  const imageRenderGenerationRef = useRef(0);
  const cropDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null);
  const imagePalette: IconPalette = customDeck === 'position'
    ? (customPositionFamily === 'have_sex' || customPositionRarity === 'mythic' ? 'mythic' : 'position')
    : 'standard';
  const imagePaletteLabel = imagePalette === 'standard'
    ? 'Hồng · trắng'
    : imagePalette === 'position'
      ? 'Champagne · ivory'
      : 'Rose-gold · platinum';

  const clampCropOffset = (value: number) => Math.max(-50, Math.min(50, value));
  const enableImageProcessing = () => {
    imageProcessingEnabledRef.current = true;
    setIllustrationTouched(true);
  };
  const resetCrop = () => {
    enableImageProcessing();
    setImgAutoCrop(true);
    setImgZoom(1);
    setImgOffsetX(0);
    setImgOffsetY(0);
  };
  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    cropDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: imgOffsetX,
      startOffsetY: imgOffsetY,
      width: Math.max(1, bounds.width),
      height: Math.max(1, bounds.height),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = cropDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    enableImageProcessing();
    setImgOffsetX(clampCropOffset(drag.startOffsetX + ((event.clientX - drag.startX) / drag.width) * 100));
    setImgOffsetY(clampCropOffset(drag.startOffsetY + ((event.clientY - drag.startY) / drag.height) * 100));
  };
  const handleCropPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (cropDragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cropDragRef.current = null;
  };
  const handleCropKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 5 : 2;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    enableImageProcessing();
    if (event.key === 'ArrowLeft') setImgOffsetX((value) => clampCropOffset(value - step));
    else if (event.key === 'ArrowRight') setImgOffsetX((value) => clampCropOffset(value + step));
    else if (event.key === 'ArrowUp') setImgOffsetY((value) => clampCropOffset(value - step));
    else if (event.key === 'ArrowDown') setImgOffsetY((value) => clampCropOffset(value + step));
    else resetCrop();
    event.preventDefault();
  };
  const imagePreviewToneClass = imagePalette === 'standard'
    ? 'border-rose-500/30 text-rose-300'
    : imagePalette === 'position'
      ? 'border-amber-300/35 text-amber-200'
      : 'border-violet-300/35 text-violet-200';
  const imagePreviewShadow = imagePalette === 'standard'
    ? 'drop-shadow(0 0 6px rgba(255,107,157,0.4))'
    : imagePalette === 'position'
      ? 'drop-shadow(0 0 7px rgba(216,180,92,0.45))'
      : 'drop-shadow(0 0 8px rgba(224,145,158,0.48))';

  const isDeveloper = mode === 'developer';
  const unlockedCardIdSet = useMemo(
    () => new Set(
      unlockedCardIds === undefined ? cards.map((card) => card.id) : unlockedCardIds,
    ),
    [cards, unlockedCardIds],
  );
  const unlockedCount = cards.reduce(
    (count, card) => count + (unlockedCardIdSet.has(card.id) ? 1 : 0),
    0,
  );
  const unlockPercentage = cards.length === 0
    ? 0
    : Math.round((unlockedCount / cards.length) * 100);
  const visibleFavorites = isDeveloper
    ? favorites
    : favorites.filter((cardId) => unlockedCardIdSet.has(cardId));

  // Filter logic
  const filteredCards = cards
    .filter((card) => {
      const isUnlocked = unlockedCardIdSet.has(card.id);
      if (
        searchQuery &&
        (
          (!isDeveloper && !isUnlocked) ||
          (
            !card.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !(card.hint && card.hint.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        )
      ) {
        return false;
      }
      if (activeTab === 'all') return true;
      if (activeTab === 'truth') return card.type === 'truth';
      if (activeTab === 'dare') return card.type === 'dare';
      if (activeTab === 'favorites') return visibleFavorites.includes(card.id);
      return card.level === activeTab;
    })
    .filter((card) => deckFilter === 'all' || getCardDeck(card) === deckFilter)
    .filter((card) => starFilter === 'all' || (
      getCardDeck(card) === 'position'
        ? derivePositionDifficultyStars(card) === starFilter
        : deriveDifficultyStars(card) === starFilter
    ))
    .filter((card) => {
      if (audienceFilter === 'all') return true;
      return getCardDeck(card) === 'position'
        ? card.position?.recipient === audienceFilter
        : getCardTurnAudience(card) === audienceFilter;
    })
    .sort(compareCollectionCards);

  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError('Vui lòng chọn tệp ảnh PNG, JPG hoặc WEBP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageError('Ảnh cần nhỏ hơn 8 MB để lưu ổn định trên trình duyệt.');
      return;
    }
    setImageError('');
    setIllustrationTouched(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      imageProcessingEnabledRef.current = true;
      imageRenderGenerationRef.current += 1;
      setOriginalImage(dataUrl);
      setImgZoom(1);
      setImgOffsetX(0);
      setImgOffsetY(0);
      setImgAutoCrop(true);
      setImgRemoveBackground(true);
      setImgBackgroundTolerance(55);
      setImgWhiteOutlineWidth(3);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  }, [loadImageFile]);

  useEffect(() => {
    if (!originalImage || !imageProcessingEnabledRef.current) return;
    const renderGeneration = ++imageRenderGenerationRef.current;
    renderCardIcon(originalImage, {
      threshold: imgThreshold,
      contrast: imgContrast,
      zoom: imgZoom,
      offsetX: imgOffsetX,
      offsetY: imgOffsetY,
      removeBackground: imgRemoveBackground,
      backgroundTolerance: imgBackgroundTolerance,
      whiteOutlineWidth: imgWhiteOutlineWidth,
      autoCrop: imgAutoCrop,
      palette: imagePalette,
    }, (result) => {
      if (imageRenderGenerationRef.current === renderGeneration) {
        setProcessedImage(result);
      }
    });
    return () => {
      if (imageRenderGenerationRef.current === renderGeneration) {
        imageRenderGenerationRef.current += 1;
      }
    };
  }, [originalImage, imgThreshold, imgContrast, imgZoom, imgOffsetX, imgOffsetY, imgAutoCrop, imgRemoveBackground, imgBackgroundTolerance, imgWhiteOutlineWidth, imagePalette]);

  const handleClearImage = useCallback(() => {
    imageProcessingEnabledRef.current = false;
    imageRenderGenerationRef.current += 1;
    setOriginalImage(null);
    setProcessedImage(null);
    setImageError('');
    setIllustrationTouched(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const resetEditor = useCallback(() => {
    imageProcessingEnabledRef.current = false;
    imageRenderGenerationRef.current += 1;
    setEditingCard(null);
    setCustomType('truth');
    setCustomLevel('gentle');
    setCustomContent('');
    setCustomHint('');
    setCustomIcon('heart');
    setCustomClothingEffect('none');
    setClothingEffectTouched(false);
    setIllustrationTouched(false);
    setCustomTimerMode('inherit');
    setCustomTimerSeconds(String(DEFAULT_CARD_TIMER_SECONDS));
    setTimerTouched(false);
    setCustomDeck('standard');
    setCustomStars(1);
    setCustomAudience('both');
    setCustomGainEnabled(false);
    setCustomGain('4');
    setCustomActorStage('any');
    setCustomPartnerStage('any');
    setCustomPositionFamily('oral');
    setCustomPositionLabel('');
    setCustomPositionRecipient('both');
    setCustomPositionOrder(1);
    setCustomPositionRarity('luxury');
    setProgressionTouched(false);
    setPositionTouched(false);
    setImgZoom(1);
    setImgOffsetX(0);
    setImgOffsetY(0);
    setImgAutoCrop(true);
    setImgRemoveBackground(true);
    setImgBackgroundTolerance(55);
    setImgWhiteOutlineWidth(3);
    setImgThreshold(140);
    setImgContrast(1.5);
    setCardIconScale(1);
    setCardTextScale(1);
    setCardIconTextGap(8);
    setOriginalImage(null);
    setProcessedImage(null);
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    if (isDeveloper) return;
    if (isAdding) {
      setIsAdding(false);
      resetEditor();
    }
    if (selectedCard && !unlockedCardIdSet.has(selectedCard.id)) {
      setSelectedCard(null);
      setPendingDeleteCardId(null);
    }
  }, [isDeveloper, isAdding, resetEditor, selectedCard, unlockedCardIdSet]);

  useEffect(() => {
    if (!selectedCard && !isAdding) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isAdding) {
          setIsAdding(false);
          resetEditor();
        } else {
          setSelectedCard(null);
          setPendingDeleteCardId(null);
        }
        return;
      }

      if (event.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>('[data-card-collection-dialog="true"]');
        if (!dialog) return;
        const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ));
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    const focusFrame = window.requestAnimationFrame(() => {
      const dialog = document.querySelector<HTMLElement>('[data-card-collection-dialog="true"]');
      dialog?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])')?.focus();
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      previouslyFocusedElement?.focus();
    };
  }, [selectedCard, isAdding, resetEditor]);

  useEffect(() => {
    if (!pendingDeleteCardId) return;
    const focusFrame = window.requestAnimationFrame(() => deleteCancelButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, [pendingDeleteCardId]);

  const openCreateEditor = () => {
    resetEditor();
    setIsAdding(true);
  };

  const openEditEditor = (card: CardItem) => {
    const cardDeck = getCardDeck(card);
    const storedEffect = card.clothingEffect;
    const effectSelection: ClothingEffectSelection = card.position?.family === 'have_sex'
      ? 'none'
      : storedEffect?.kind === 'swap_garments'
        ? 'swap'
        : storedEffect?.kind === 'remove_garment'
          ? cardDeck === 'position'
            ? (storedEffect.target === 'male' || storedEffect.target === 'female' || storedEffect.target === 'both' ? storedEffect.target : 'none')
            : (storedEffect.target === 'self' || storedEffect.target === 'opponent' ? storedEffect.target : 'none')
          : 'none';
    setEditingCard(card);
    setCustomType(card.type);
    setCustomLevel(card.level);
    setCustomContent(card.content);
    setCustomHint(card.hint || '');
    setCustomIcon(card.icon || autoAssignIcon(card.content));
    setCustomClothingEffect(effectSelection);
    setClothingEffectTouched(false);
    setIllustrationTouched(false);
    const existingTimer = typeof card.timerSeconds === 'number'
      && Number.isInteger(card.timerSeconds)
      && card.timerSeconds >= 1
      && card.timerSeconds <= MAX_CARD_TIMER_SECONDS
      ? card.timerSeconds
      : null;
    setCustomTimerMode(existingTimer !== null ? 'custom' : card.timerSeconds === null ? 'disabled' : 'inherit');
    setCustomTimerSeconds(String(existingTimer ?? DEFAULT_CARD_TIMER_SECONDS));
    setTimerTouched(false);
    setCustomDeck(cardDeck);
    setCustomStars(cardDeck === 'position' ? derivePositionDifficultyStars(card) : deriveDifficultyStars(card));
    setCustomAudience(getCardTurnAudience(card));
    const existingGain = cardDeck === 'position'
      ? card.position?.luxuryGain
      : card.progression?.intimacyGain;
    setCustomGainEnabled(typeof existingGain === 'number');
    setCustomGain(String(existingGain ?? 4));
    setCustomActorStage(card.progression?.actorStages?.[0] ?? 'any');
    setCustomPartnerStage(card.progression?.partnerStages?.[0] ?? 'any');
    setCustomPositionFamily(card.position?.family ?? 'oral');
    setCustomPositionLabel(card.position?.customLabel ?? '');
    setCustomPositionRecipient(getCardTurnAudience(card));
    setCustomPositionOrder(card.position?.orderGroup ?? 1);
    setCustomPositionRarity(card.position?.rarity ?? 'luxury');
    setProgressionTouched(false);
    setPositionTouched(false);
    imageProcessingEnabledRef.current = false;
    imageRenderGenerationRef.current += 1;
    setOriginalImage(card.customImage || null);
    setProcessedImage(card.customImage || null);
    setImgAutoCrop(true);
    setImgRemoveBackground(false);
    setImgWhiteOutlineWidth(0);
    setCardIconScale(card.appearance?.iconScale ?? 1);
    setCardTextScale(card.appearance?.textScale ?? 1);
    setCardIconTextGap(card.appearance?.iconTextGap ?? 8);
    setImageError('');
    setIsAdding(true);
    setSelectedCard(null);
  };

  const handleCreateCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customContent.trim() || !hasValidCustomTimer || !hasValidCustomGain) return;

    soundEngine.playCompleteSound();
    const nextCard: CardItem = {
      ...editingCard,
      id: editingCard?.id || `custom-${Date.now()}`,
      type: customDeck === 'position' ? 'dare' : customType,
      level: customDeck === 'position' ? 'passionate' : customLevel,
      content: customContent.trim(),
      hint: customHint.trim() || undefined,
      icon: processedImage ? undefined : customIcon,
      isCustom: editingCard ? editingCard.isCustom : true,
      customImage: processedImage || undefined,
      customImageId: processedImage ? editingCard?.customImageId : undefined,
      appearance: cardIconScale === 1 && cardTextScale === 1 && cardIconTextGap === 8
        ? undefined
        : { iconScale: cardIconScale, textScale: cardTextScale, iconTextGap: cardIconTextGap },
      timerSeconds: customTimerMode === 'custom'
        ? parsedCustomTimerSeconds
        : customTimerMode === 'disabled'
          ? null
          : undefined,
      deck: customDeck,
      progression: {
        difficultyStars: Math.min(customStars, 5) as DifficultyStars,
        turnAudience: customDeck === 'position' ? 'both' : customAudience,
        intimacyGain: customDeck === 'standard' && customGainEnabled ? parsedCustomGain : undefined,
        actorStages: customActorStage === 'any' ? undefined : [customActorStage],
        partnerStages: customPartnerStage === 'any' ? undefined : [customPartnerStage],
      },
      position: customDeck === 'position'
        ? {
            family: customPositionFamily,
            customLabel: customPositionFamily === 'other'
              ? customPositionLabel.trim() || 'Tư thế khác'
              : undefined,
            turnAudience: customPositionRecipient,
            orderGroup: customPositionFamily === 'have_sex' ? 4 : customPositionOrder,
            rarity: customPositionFamily === 'have_sex' ? 'mythic' : customPositionRarity,
            difficultyStars: customStars,
            luxuryGain: customDeck === 'position' && customGainEnabled ? parsedCustomGain : undefined,
          }
        : null,
    };

    // `undefined` keeps system-card gameplay metadata during hydration/merge.
    // `null` is only written after the player explicitly chooses "Không tác động".
    if (clothingEffectTouched) {
      nextCard.clothingEffect = customClothingEffect === 'none'
        ? null
        : customClothingEffect === 'swap'
          ? { kind: 'swap_garments' }
          : { kind: 'remove_garment', target: customClothingEffect };
    }
    if (customDeck === 'position' && customPositionFamily === 'have_sex') {
      delete nextCard.clothingEffect;
    }

    if (editingCard) {
      onUpdateCard?.(nextCard, {
        clothingEffectTouched,
        illustrationTouched,
        timerTouched,
        progressionTouched,
        positionTouched,
      });
    } else {
      onAddCustomCard?.(nextCard);
    }
    resetEditor();
    setIsAdding(false);
  };

  const handleConfirmDelete = () => {
    if (!isDeveloper || !selectedCard || !onDeleteCard) return;
    soundEngine.playTick();
    onDeleteCard(selectedCard);
    setPendingDeleteCardId(null);
    setSelectedCard(null);
  };

  const scrollToCollectionEdge = (edge: 'top' | 'bottom') => {
    soundEngine.playTick();
    window.scrollTo({
      top: edge === 'top' ? 0 : document.documentElement.scrollHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const runBackupAction = async (action: () => Promise<string>) => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupMessage('Đang xử lý dữ liệu…');
    try {
      setBackupMessage(await action());
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'Không thể hoàn tất thao tác dữ liệu.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleBackupFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onImportCatalog) return;
    void runBackupAction(() => onImportCatalog(file));
  };

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 text-white min-h-screen flex flex-col">
      <nav
        aria-label="Điều hướng nhanh Bộ sưu tập"
        className="fixed bottom-4 right-3 z-30 flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#130b13]/90 shadow-2xl backdrop-blur-md sm:right-5"
      >
        <button
          type="button"
          onClick={() => scrollToCollectionEdge('top')}
          aria-label="Nhảy lên đầu Bộ sưu tập"
          title="Lên đầu trang"
          className="grid h-12 w-12 place-items-center border-b border-white/10 text-neutral-300 transition-colors hover:bg-rose-400/12 hover:text-rose-100 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300 motion-reduce:transition-none"
        >
          <ChevronsUp className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollToCollectionEdge('bottom')}
          aria-label="Nhảy xuống cuối Bộ sưu tập"
          title="Xuống cuối trang"
          className="grid h-12 w-12 place-items-center text-neutral-300 transition-colors hover:bg-amber-300/12 hover:text-amber-100 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-200 motion-reduce:transition-none"
        >
          <ChevronsDown className="h-5 w-5" aria-hidden="true" />
        </button>
      </nav>
      {/* Header Bar */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4 mb-6 pb-4 border-b border-rose-500/20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          {backDestination === 'game'
            ? <ArrowLeft className="w-4 h-4" />
            : <Home className="w-4 h-4" />}
          <span>{backDestination === 'game' ? 'Trở lại bàn chơi' : 'Về trang chủ'}</span>
        </button>

        <h2 className="font-serif-romantic text-lg sm:text-3xl text-center font-bold text-gold-gradient leading-tight">
          Bộ Sưu Tập Bài Tình Yêu
        </h2>

        <div className="flex items-center justify-end gap-2">
          {onOpenAccountModal && (
            <button
              type="button"
              onClick={onOpenAccountModal}
              title={coupleName ? `Tài khoản: ${coupleName}` : 'Đăng nhập tài khoản'}
              className="flex min-h-10 items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-950/50 px-3 text-xs text-rose-200 transition-colors hover:border-rose-300 hover:text-white cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline max-w-[120px] truncate">{coupleName || 'Tài khoản'}</span>
            </button>
          )}

          {isDeveloper && (
            <span className="hidden items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-200 sm:flex" aria-label="Khu vực quản trị nội dung">
              <Code2 className="h-3 w-3" aria-hidden="true" /> Admin
            </span>
          )}

          {isDeveloper && (
            <>
              <button
                type="button"
                aria-label="Cấu hình tiến triển"
                onClick={() => setShowProgressionConfig(true)}
                className="flex min-h-10 items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden lg:inline">Tiến triển</span>
              </button>
              <button
                aria-label="Thêm bài riêng"
                onClick={() => {
                  soundEngine.playTick();
                  openCreateEditor();
                }}
                className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-rose-600/80 px-3 text-xs font-semibold text-white shadow-md transition-all hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 motion-reduce:transition-none"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Thêm bài riêng</span>
              </button>
            </>
          )}
        </div>
      </div>

      {isDeveloper && catalogSync && (
        <section
          aria-label="Trạng thái dữ liệu cloud"
          className="mb-6 border-b border-white/10 pb-5"
        >
          <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.035] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                catalogSync.mode === 'cloud'
                  ? 'bg-emerald-400/10 text-emerald-300'
                  : 'bg-amber-300/10 text-amber-200'
              }`}>
                {catalogSync.mode === 'cloud'
                  ? <Cloud className="h-4 w-4" aria-hidden="true" />
                  : <CloudOff className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <strong className="text-neutral-100">
                    {catalogSync.mode === 'cloud' ? 'Cloud đã kết nối' : catalogSync.mode === 'loading' ? 'Đang kết nối' : 'Dữ liệu chưa đồng bộ'}
                  </strong>
                  <span className="font-mono text-[10px] text-neutral-500">revision {catalogSync.datasetRevision}</span>
                  {catalogSync.lastBackupAt && (
                    <span className="text-[10px] text-neutral-500">
                      Backup gần nhất {new Date(catalogSync.lastBackupAt).toLocaleString('vi-VN')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-400" aria-live="polite">
                  {backupMessage || catalogSync.message || 'Catalog, ảnh và cấu hình Developer được lưu trên Cloudflare.'}
                </p>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-2">
              <button
                type="button"
                disabled={backupBusy || !onExportCatalog}
                onClick={() => onExportCatalog && void runBackupAction(onExportCatalog)}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-[11px] font-semibold text-neutral-200 transition-colors hover:border-rose-300/30 hover:bg-rose-300/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-4 w-4" aria-hidden="true" /> Xuất
              </button>
              <button
                type="button"
                disabled={backupBusy || !onImportCatalog}
                onClick={() => backupInputRef.current?.click()}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-[11px] font-semibold text-neutral-200 transition-colors hover:border-amber-200/30 hover:bg-amber-200/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Upload className="h-4 w-4" aria-hidden="true" /> Nhập
              </button>
              <button
                type="button"
                disabled={backupBusy || catalogSync.mode !== 'cloud' || !onCreateCloudBackup}
                onClick={() => onCreateCloudBackup && void runBackupAction(onCreateCloudBackup)}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-[11px] font-semibold text-neutral-200 transition-colors hover:border-violet-200/30 hover:bg-violet-200/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <DatabaseBackup className="h-4 w-4" aria-hidden="true" /> Snapshot
              </button>
              <input
                ref={backupInputRef}
                type="file"
                accept=".zip,.todbackup.zip,application/zip"
                onChange={handleBackupFile}
                className="hidden"
                aria-label="Chọn file backup để nhập"
              />
            </div>
          </div>
          {playerStats && (
            <div className="mt-3 grid grid-cols-3 divide-x divide-white/10 border-t border-white/8 pt-3 text-center" aria-label="Thống kê người chơi">
              <div>
                <strong className="block text-lg font-semibold text-emerald-300">{playerStats.online}</strong>
                <span className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">Đang online</span>
              </div>
              <div>
                <strong className="block text-lg font-semibold text-rose-200">{playerStats.activeToday}</strong>
                <span className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">Trong 24 giờ</span>
              </div>
              <div>
                <strong className="block text-lg font-semibold text-neutral-100">{playerStats.total}</strong>
                <span className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">Tổng người chơi</span>
              </div>
            </div>
          )}
        </section>
      )}

      <section
        aria-labelledby="collection-progress-title"
        className="mx-auto mb-6 w-full max-w-2xl border-b border-white/10 pb-5"
      >
        <div className="mb-2 flex items-end justify-between gap-4">
          <div>
            <h3 id="collection-progress-title" className="text-sm font-semibold text-neutral-100">
              Tiến độ mở khóa
            </h3>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {isDeveloper
                ? 'Developer thấy toàn bộ; tiến độ vẫn ghi nhận các lá đã hoàn thành.'
                : 'Hoàn thành thành công một lá trong ván chơi để nhìn thấy nội dung.'}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-rose-200" aria-live="polite">
            {unlockedCount}/{cards.length}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Tiến độ mở khóa lá bài"
          aria-valuemin={0}
          aria-valuemax={cards.length}
          aria-valuenow={unlockedCount}
          aria-valuetext={`${unlockedCount} trên ${cards.length} lá đã mở khóa`}
          className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
        >
          <div
            className="h-full rounded-full bg-rose-400 transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${unlockPercentage}%` }}
          />
        </div>
      </section>

      {/* Search Bar & Filter Tabs */}
      <div className="space-y-4 mb-6">
        <div className="relative w-full max-w-md mx-auto">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm trong bộ sưu tập"
            placeholder={isDeveloper
              ? 'Tìm kiếm nội dung câu hỏi hoặc thử thách...'
              : 'Tìm trong các lá bài đã mở khóa...'}
            className="input-shimmer input-focus-glow w-full bg-neutral-900/90 border border-neutral-700/60 focus:border-amber-400 focus:outline-none rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm text-white transition-all duration-300"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'truth', label: '🔍 Sự Thật' },
            { id: 'dare', label: '⚡ Thử Thách' },
            { id: 'gentle', label: '🌸 Nhẹ nhàng' },
            { id: 'intimate', label: '🔥 Thân mật' },
            { id: 'passionate', label: '💋 Nồng nhiệt' },
            { id: 'favorites', label: `♥ Đã thích (${visibleFavorites.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => {
                soundEngine.playTick();
                setActiveTab(tab.id as CollectionTab);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 motion-reduce:transition-none ${
                activeTab === tab.id
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-md'
                  : 'bg-neutral-900/60 text-neutral-300 hover:text-white border border-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mx-auto grid w-full max-w-2xl grid-cols-3 gap-2">
          <label className="text-[10px] text-neutral-500">
            Bộ bài
            <select
              value={deckFilter}
              onChange={(event) => setDeckFilter(event.target.value as 'all' | CardDeck)}
              className="mt-1 min-h-10 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-2 text-xs text-neutral-200 outline-none focus:border-amber-300/50"
            >
              <option value="all">Tất cả</option>
              <option value="standard">Bài thường</option>
              <option value="position">Tư thế</option>
            </select>
          </label>
          <label className="text-[10px] text-neutral-500">
            Độ khó
            <select
              value={starFilter}
              onChange={(event) => setStarFilter(event.target.value === 'all' ? 'all' : Number(event.target.value) as PositionDifficultyStars)}
              className="mt-1 min-h-10 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-2 text-xs text-neutral-200 outline-none focus:border-amber-300/50"
            >
              <option value="all">Mọi sao</option>
              {POSITION_DIFFICULTY_STARS.map((star) => <option key={star} value={star}>{star}★</option>)}
            </select>
          </label>
          <label className="text-[10px] text-neutral-500">
            Lượt được phép rút
            <select
              value={audienceFilter}
              onChange={(event) => setAudienceFilter(event.target.value as 'all' | TurnAudience)}
              className="mt-1 min-h-10 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-2 text-xs text-neutral-200 outline-none focus:border-amber-300/50"
            >
              <option value="all">Tất cả</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="both">Cả hai</option>
            </select>
          </label>
        </div>
      </div>

      {/* CARD GRID */}
      {filteredCards.length === 0 ? (
        <div className="my-auto py-16 text-center text-neutral-400 font-light">
          <p className="text-base mb-2">Chưa tìm thấy lá bài phù hợp nào.</p>
          <p className="text-xs text-neutral-500">
            Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {filteredCards.map((card, index) => {
            const isUnlocked = unlockedCardIdSet.has(card.id);
            if (!isDeveloper && !isUnlocked) {
              return <LockedCollectionCard key={card.id} position={index + 1} />;
            }

            return (
              <div
                key={card.id}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 300px' }}
              >
                <GameCard
                  card={card}
                  size="sm"
                  isFavorited={favorites.includes(card.id)}
                  onToggleFavorite={onToggleFavorite}
                  onClick={() => {
                    setPendingDeleteCardId(null);
                    setSelectedCard(card);
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* CARD DETAIL POPUP */}
      <AnimatePresence>
        {selectedCard && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết lá bài"
            data-card-collection-dialog="true"
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
              className="relative w-full max-w-sm"
            >
              <button
                onClick={() => {
                  setSelectedCard(null);
                  setPendingDeleteCardId(null);
                }}
                aria-label="Đóng chi tiết lá bài"
                className="absolute -top-3 -right-3 z-50 w-8 h-8 rounded-full bg-neutral-800 border border-neutral-600 text-neutral-300 hover:text-white flex items-center justify-center shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                <X className="w-4 h-4" />
              </button>
              <GameCard
                card={selectedCard}
                size="lg"
                isFavorited={favorites.includes(selectedCard.id)}
                onToggleFavorite={onToggleFavorite}
              />
              {isDeveloper && pendingDeleteCardId !== selectedCard.id && (
                <div className={`mt-3 grid gap-2 ${onDeleteCard && selectedCard.position?.family !== 'have_sex' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button
                    onClick={() => openEditEditor(selectedCard)}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-rose-400/40 bg-rose-600/20 px-3 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 motion-reduce:transition-none"
                  >
                    <Pencil className="w-4 h-4" /> Chỉnh sửa
                  </button>
                  {onDeleteCard && selectedCard.position?.family !== 'have_sex' && (
                    <button
                      onClick={() => setPendingDeleteCardId(selectedCard.id)}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-neutral-600/70 bg-neutral-950/70 px-3 text-sm font-semibold text-neutral-300 transition-colors hover:border-red-400/50 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 motion-reduce:transition-none"
                    >
                      <Trash2 className="h-4 w-4" /> Xóa
                    </button>
                  )}
                </div>
              )}

              {isDeveloper && onDeleteCard && selectedCard.position?.family !== 'have_sex' && pendingDeleteCardId === selectedCard.id && (
                <div className="mt-3 rounded-2xl border border-red-400/30 bg-neutral-950/95 p-3" aria-live="polite">
                  <p className="text-center text-xs leading-relaxed text-neutral-300">
                    Xóa lá bài này khỏi bộ sưu tập?
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      ref={deleteCancelButtonRef}
                      type="button"
                      onClick={() => setPendingDeleteCardId(null)}
                      className="min-h-10 rounded-full border border-neutral-700 text-xs font-semibold text-neutral-300 hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                    >
                      Giữ lại
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="min-h-10 rounded-full bg-red-500/90 text-xs font-bold text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                      Xác nhận xóa
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD CUSTOM CARD MODAL WITH IMAGE EDITOR */}
      <AnimatePresence>
        {isAdding && isDeveloper && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/80 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-editor-title"
            data-card-collection-dialog="true"
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
              className="relative w-full max-w-lg max-h-[calc(100svh-2rem)] overflow-y-auto glass-dark rounded-3xl p-5 sm:p-6 border border-rose-500/40 shadow-2xl"
            >
              <button
                onClick={() => { setIsAdding(false); resetEditor(); }}
                aria-label="Đóng trình chỉnh sửa"
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 id="card-editor-title" className="font-serif-romantic text-2xl font-bold text-gold-gradient mb-1 pr-10">
                {editingCard ? 'Chỉnh Sửa Lá Bài' : 'Thêm Lá Bài Riêng'}
              </h3>
              <p className="text-xs text-neutral-400 mb-5">
                {editingCard ? 'Thay đổi nội dung, cấp độ và biểu tượng của lá bài.' : 'Tự viết câu hỏi hoặc thử thách bí mật. Có thể thêm ảnh minh hoạ!'}
              </p>

              <form onSubmit={handleCreateCustomCard} className="space-y-4">
                <div>
                  <label htmlFor="card-deck" className="text-xs text-neutral-300 mb-1 block">Bộ bài</label>
                  <select
                    id="card-deck"
                    value={customDeck}
                    onChange={(event) => {
                      const nextDeck = event.target.value as CardDeck;
                      setCustomDeck(nextDeck);
                      setPositionTouched(true);
                      setProgressionTouched(true);
                      if (nextDeck === 'position') {
                        setCustomType('dare');
                        setCustomLevel('passionate');
                        if (customPositionFamily !== 'have_sex') {
                          setCustomStars(customPositionFamily === 'handjob' ? 7 : customPositionFamily === 'blowjob' ? 5 : 3);
                        }
                        if (customClothingEffect === 'self' || customClothingEffect === 'opponent') {
                          setCustomClothingEffect(customPositionRecipient);
                          setClothingEffectTouched(true);
                        }
                      } else if (customClothingEffect === 'male' || customClothingEffect === 'female' || customClothingEffect === 'both') {
                        setCustomClothingEffect('none');
                        setClothingEffectTouched(true);
                      }
                    }}
                    className="appearance-none w-full bg-neutral-900 border border-neutral-700 hover:border-amber-500/50 text-xs text-white rounded-xl p-2.5 transition-all duration-300"
                  >
                    <option value="standard">Bài thường</option>
                    <option value="position">✦ Bộ Tư thế</option>
                  </select>
                </div>

                {/* Type & Level */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-300 mb-1 block">Thể loại</label>
                    <select
                      value={customType}
                      disabled={customDeck === 'position'}
                      onChange={(event) => {
                        const nextType = event.target.value as CardType;
                        setCustomType(nextType);
                      }}
                      className="appearance-none w-full bg-neutral-900 border border-neutral-700 hover:border-rose-500/50 text-xs text-white rounded-xl p-2.5 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="truth">🔍 Sự Thật</option>
                      <option value="dare">⚡ Thử Thách</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-300 mb-1 block">Cấp độ</label>
                    <select
                      value={customLevel}
                      disabled={customDeck === 'position'}
                      onChange={(e) => setCustomLevel(e.target.value as CardLevel)}
                      className="appearance-none w-full bg-neutral-900 border border-neutral-700 hover:border-amber-500/50 text-xs text-white rounded-xl p-2.5 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="gentle">🌸 Nhẹ nhàng</option>
                      <option value="intimate">🔥 Thân mật</option>
                      <option value="passionate">💋 Nồng nhiệt</option>
                    </select>
                  </div>
                </div>

                {/* Journey metadata */}
                <section className="space-y-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.035] p-3.5" aria-labelledby="card-progression-title">
                  <div>
                    <h4 id="card-progression-title" className="text-xs font-semibold text-amber-100">Tiến triển thân mật</h4>
                    <p className="mt-0.5 text-[10px] text-neutral-500">Sao quyết định tỉ lệ xuất hiện và điểm mặc định.</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400">Độ khó</span>
                    <div className={`mt-1.5 grid grid-cols-5 gap-1.5 ${customDeck === 'position' ? 'sm:grid-cols-10' : ''}`}>
                      {(customDeck === 'position' ? POSITION_DIFFICULTY_STARS : ([1, 2, 3, 4, 5] as DifficultyStars[])).map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-pressed={customStars === star}
                          onClick={() => {
                            setCustomStars(star);
                            if (customDeck === 'position') setPositionTouched(true);
                            else setProgressionTouched(true);
                          }}
                          className={`min-h-11 rounded-xl border text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ${
                            customStars === star
                              ? 'border-amber-200/60 bg-amber-200/15 text-amber-100'
                              : 'border-neutral-700 bg-neutral-950/60 text-neutral-500 hover:text-neutral-200'
                          }`}
                        >
                          {star}★
                        </button>
                      ))}
                    </div>
                    {customDeck === 'position' && customPositionFamily === 'have_sex' && (
                      <p className="mt-2 text-[9px] leading-relaxed text-amber-100/65">
                        Có thể chọn tự do từ 1–10★. Lá Have sex vẫn kết thúc ván theo nhóm thẻ, không phụ thuộc số sao.
                      </p>
                    )}
                  </div>

                  {customDeck === 'standard' ? (
                    <label className="block text-[10px] text-neutral-400">
                      Lượt được phép rút
                      <select
                        value={customAudience}
                        onChange={(event) => { setCustomAudience(event.target.value as TurnAudience); setProgressionTouched(true); }}
                        className="mt-1 min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white outline-none focus:border-amber-300/50"
                      >
                        <option value="both">Cả hai</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                      </select>
                      <span className="mt-1.5 block text-[9px] leading-relaxed text-neutral-500">
                        Chỉ quyết định lượt nào có thể rút. Người rút luôn là người được tính kết quả.
                      </span>
                    </label>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[10px] text-neutral-400">
                        Nhóm Tư thế
                        <select
                          value={customPositionFamily}
                          onChange={(event) => {
                            const family = event.target.value as PositionFamily;
                          setCustomPositionFamily(family);
                          setCustomPositionOrder(family === 'oral' ? 1 : family === 'blowjob' ? 2 : family === 'handjob' ? 3 : family === 'have_sex' ? 4 : 1);
                          setCustomPositionRarity(family === 'have_sex' ? 'mythic' : 'luxury');
                          if (family !== 'have_sex') {
                            setCustomStars(family === 'handjob' ? 7 : family === 'blowjob' ? 5 : 3);
                          }
                            if (family === 'have_sex') {
                              setCustomClothingEffect('none');
                              setClothingEffectTouched(true);
                            }
                            setPositionTouched(true);
                          }}
                          className="mt-1 min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2 text-xs text-white outline-none focus:border-amber-300/50"
                        >
                          <option value="oral">Oral sex</option>
                          <option value="blowjob">Blow</option>
                          <option value="handjob">Hand</option>
                          <option value="have_sex">Have sex</option>
                          <option value="other">Khác / Tùy chỉnh…</option>
                        </select>
                      </label>
                      <label className="text-[10px] text-neutral-400">
                        Lượt được phép rút
                        <select
                          value={customPositionRecipient}
                          onChange={(event) => { setCustomPositionRecipient(event.target.value as TurnAudience); setPositionTouched(true); }}
                          className="mt-1 min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2 text-xs text-white outline-none focus:border-amber-300/50"
                        >
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                          <option value="both">Cả hai</option>
                        </select>
                      </label>
                      {customPositionFamily === 'other' && (
                        <label className="col-span-2 text-[10px] text-neutral-400">
                          Tên dạng Tư thế
                          <input
                            type="text"
                            maxLength={40}
                            value={customPositionLabel}
                            onChange={(event) => { setCustomPositionLabel(event.target.value); setPositionTouched(true); }}
                            placeholder="Ví dụ: Massage, Roleplay…"
                            className="mt-1 min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white outline-none focus:border-amber-300/50"
                          />
                        </label>
                      )}
                      <label className="text-[10px] text-neutral-400">
                        Thứ tự nhóm
                        <select
                          disabled={customPositionFamily === 'have_sex'}
                          value={customPositionFamily === 'have_sex' ? 4 : customPositionOrder}
                          onChange={(event) => { setCustomPositionOrder(Number(event.target.value) as 1 | 2 | 3 | 4); setPositionTouched(true); }}
                          className="mt-1 min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2 text-xs text-white outline-none disabled:opacity-50"
                        >
                          <option value={1}>1 · Oral</option>
                          <option value={2}>2 · Blowjob</option>
                          <option value={3}>3 · Handjob</option>
                          <option value={4}>4 · Cuối</option>
                        </select>
                      </label>
                      <label className="text-[10px] text-neutral-400">
                        Độ hiếm
                        <select
                          disabled={customPositionFamily === 'have_sex'}
                          value={customPositionFamily === 'have_sex' ? 'mythic' : customPositionRarity}
                          onChange={(event) => { setCustomPositionRarity(event.target.value as PositionRarity); setPositionTouched(true); }}
                          className="mt-1 min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2 text-xs text-white outline-none disabled:opacity-50"
                        >
                          <option value="luxury">Luxury</option>
                          <option value="mythic">Mythic</option>
                        </select>
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-neutral-400">
                      Đồ người đang lượt
                      <select
                        value={customActorStage}
                        onChange={(event) => { setCustomActorStage(event.target.value as StageSelection); setProgressionTouched(true); }}
                        className="mt-1 min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2 text-xs text-white outline-none"
                      >
                        <option value="any">Không giới hạn</option>
                        <option value="dressed">Đang mặc đồ</option>
                        <option value="underwear_only">Chỉ đồ lót</option>
                        <option value="empty">Hết đồ</option>
                      </select>
                    </label>
                    <label className="text-[10px] text-neutral-400">
                      Đồ đối phương
                      <select
                        value={customPartnerStage}
                        onChange={(event) => { setCustomPartnerStage(event.target.value as StageSelection); setProgressionTouched(true); }}
                        className="mt-1 min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2 text-xs text-white outline-none"
                      >
                        <option value="any">Không giới hạn</option>
                        <option value="dressed">Đang mặc đồ</option>
                        <option value="underwear_only">Chỉ đồ lót</option>
                        <option value="empty">Hết đồ</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={customGainEnabled}
                      onClick={() => {
                        setCustomGainEnabled((value) => !value);
                        if (customDeck === 'position') setPositionTouched(true);
                        else setProgressionTouched(true);
                      }}
                      className={`relative h-11 w-[68px] shrink-0 rounded-full border ${customGainEnabled ? 'border-rose-300/50 bg-rose-400/20' : 'border-neutral-700 bg-neutral-900'}`}
                    >
                      <span className={`absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-white transition-[left] motion-reduce:transition-none ${customGainEnabled ? 'left-[34px]' : 'left-1'}`} />
                      <span className="sr-only">Dùng điểm {customDeck === 'position' ? 'Luxury' : 'thân mật'} riêng</span>
                    </button>
                    <label className="flex-1 text-[10px] text-neutral-400">
                      Điểm {customDeck === 'position' ? 'Luxury' : 'thân mật'} riêng
                      <div className="relative mt-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={!customGainEnabled}
                          value={customGain}
                          onChange={(event) => {
                            setCustomGain(event.target.value);
                            if (customDeck === 'position') setPositionTouched(true);
                            else setProgressionTouched(true);
                          }}
                          className="min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 pr-9 text-xs text-white outline-none disabled:opacity-40"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-600">%</span>
                      </div>
                    </label>
                  </div>
                  {!hasValidCustomGain && <p role="alert" className="text-[10px] text-rose-300">Điểm riêng phải nằm trong 0–100%.</p>}
                </section>

                {/* Content */}
                <div>
                  <label className="text-xs text-neutral-300 mb-1 block">Nội dung lá bài</label>
                  <textarea
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    rows={3}
                    required
                    placeholder="Nhập câu hỏi hoặc thử thách ngọt ngào..."
                    className="input-shimmer input-focus-glow w-full bg-neutral-900/90 border border-neutral-700 text-xs sm:text-sm text-white rounded-xl p-3 focus:border-rose-400 focus:outline-none transition-all duration-300"
                  />
                </div>

                {/* Gameplay effect */}
                <div>
                  <label htmlFor="card-clothing-effect" className="text-xs text-neutral-300 mb-1 block">
                    Tác động trang phục
                  </label>
                  <select
                    id="card-clothing-effect"
                    value={customClothingEffect}
                    disabled={customDeck === 'position' && customPositionFamily === 'have_sex'}
                    onChange={(event) => {
                      setCustomClothingEffect(event.target.value as ClothingEffectSelection);
                      setClothingEffectTouched(true);
                    }}
                    className="appearance-none w-full bg-neutral-900 border border-neutral-700 hover:border-rose-500/50 text-xs text-white rounded-xl p-2.5 transition-all duration-300 focus:border-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
                  >
                    <option value="none">Không tác động</option>
                    {customDeck === 'standard' ? (
                      <>
                        <option value="self">Người đang lượt bỏ 1 món</option>
                        <option value="opponent">Đối phương bỏ 1 món</option>
                      </>
                    ) : (
                      <>
                        <option value="male">Nam bỏ 1 món</option>
                        <option value="female">Nữ bỏ 1 món</option>
                        <option value="both">Cả hai cùng bỏ 1 món</option>
                      </>
                    )}
                    <option value="swap">Hai người đổi 1 món cho nhau</option>
                  </select>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-neutral-500">
                    {customDeck === 'position' && customPositionFamily === 'have_sex'
                      ? 'Lá Have Sex chỉ kết thúc ván sau khi xem; không được gắn tác động trang phục.'
                      : 'Khi hoàn thành thẻ, trò chơi sẽ mở bước chọn và xác nhận món đồ phù hợp.'}
                  </p>
                  {!(customDeck === 'position' && customPositionFamily === 'have_sex') && suggestedClothingEffect && suggestedClothingEffect !== customClothingEffect && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomClothingEffect(suggestedClothingEffect);
                        setClothingEffectTouched(true);
                      }}
                      className="mt-2 min-h-11 w-full rounded-xl border border-amber-300/25 bg-amber-300/[0.06] px-3 text-left text-[10px] font-semibold text-amber-100 transition hover:border-amber-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/50"
                    >
                      Gợi ý từ nội dung: áp dụng “{suggestedClothingEffect === 'swap'
                        ? 'Hai người đổi đồ'
                        : suggestedClothingEffect === 'opponent'
                          ? 'Đối phương bỏ 1 món'
                          : suggestedClothingEffect === 'male'
                            ? 'Nam bỏ 1 món'
                            : suggestedClothingEffect === 'female'
                              ? 'Nữ bỏ 1 món'
                              : suggestedClothingEffect === 'both'
                                ? 'Cả hai cùng bỏ 1 món'
                                : 'Người đang lượt bỏ 1 món'}”
                    </button>
                  )}
                </div>

                {/* Per-card countdown for Truth, Action and Position cards */}
                <section
                  aria-labelledby="card-timer-label"
                  className="overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-400/[0.04]"
                >
                  <div className="space-y-3 px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200">
                        <Timer className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <div>
                        <p id="card-timer-label" className="text-xs font-semibold text-neutral-100">Thời gian đếm ngược</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-neutral-500">
                          Áp dụng cho cả Sự thật, Hành động và bài Tư thế.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="card-timer-label">
                      {([
                        ['inherit', 'Mặc định 60s'],
                        ['disabled', 'Không đếm'],
                        ['custom', 'Thời gian riêng'],
                      ] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          role="radio"
                          aria-checked={customTimerMode === mode}
                          onClick={() => {
                            setCustomTimerMode(mode);
                            setTimerTouched(true);
                            if (
                              mode === 'custom'
                              && !(Number.isInteger(parsedCustomTimerSeconds)
                                && parsedCustomTimerSeconds >= 1
                                && parsedCustomTimerSeconds <= MAX_CARD_TIMER_SECONDS)
                            ) {
                              setCustomTimerSeconds(String(DEFAULT_CARD_TIMER_SECONDS));
                            }
                          }}
                          className={`min-h-11 rounded-xl border px-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60 ${customTimerMode === mode ? 'border-amber-200/60 bg-amber-200/15 text-amber-100' : 'border-neutral-700 bg-neutral-950/55 text-neutral-400 hover:text-white'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                    <AnimatePresence initial={false}>
                      {customTimerMode === 'custom' && (
                        <motion.div
                          id="card-timer-options"
                          initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0, y: -4 }}
                          animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1, y: 0 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0, y: -4 }}
                          transition={{ duration: prefersReducedMotion ? 0.1 : 0.18 }}
                          className="overflow-hidden border-t border-amber-200/10"
                        >
                          <div className="space-y-3 p-3.5">
                            <div>
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100/70">
                                Chọn nhanh
                              </p>
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                                {CARD_TIMER_PRESETS.map((seconds) => {
                                  const isSelected = customTimerSeconds === String(seconds);
                                  return (
                                    <button
                                      key={seconds}
                                      type="button"
                                      aria-pressed={isSelected}
                                      onClick={() => {
                                        setCustomTimerSeconds(String(seconds));
                                        setTimerTouched(true);
                                      }}
                                      className={`min-h-11 rounded-xl border px-2 text-xs font-semibold transition-[border-color,background-color,color,transform] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60 motion-reduce:transform-none motion-reduce:transition-none ${
                                        isSelected
                                          ? 'border-amber-200/70 bg-amber-200/15 text-amber-100'
                                          : 'border-neutral-700 bg-neutral-950/50 text-neutral-400 hover:-translate-y-0.5 hover:border-amber-300/30 hover:text-neutral-200'
                                      }`}
                                    >
                                      {seconds}s
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <label htmlFor="card-timer-seconds" className="mb-1.5 block text-[11px] text-neutral-300">
                                Số giây tùy chỉnh
                              </label>
                              <div className="relative">
                                <input
                                  id="card-timer-seconds"
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={MAX_CARD_TIMER_SECONDS}
                                  step={1}
                                  required
                                  value={customTimerSeconds}
                                  aria-invalid={!hasValidCustomTimer}
                                  aria-describedby="card-timer-help"
                                  onChange={(event) => {
                                    setCustomTimerSeconds(event.target.value);
                                    setTimerTouched(true);
                                  }}
                                  className={`min-h-11 w-full rounded-xl border bg-neutral-950/70 px-3 pr-14 text-sm text-white outline-none transition-colors focus:ring-2 focus:ring-amber-200/30 ${
                                    hasValidCustomTimer
                                      ? 'border-neutral-700 focus:border-amber-200/50'
                                      : 'border-rose-400/70 focus:border-rose-300'
                                  }`}
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-neutral-500">
                                  giây
                                </span>
                              </div>
                              <p
                                id="card-timer-help"
                                role={!hasValidCustomTimer ? 'alert' : undefined}
                                className={`mt-1.5 text-[10px] leading-relaxed ${
                                  hasValidCustomTimer ? 'text-neutral-500' : 'text-rose-300'
                                }`}
                              >
                                {hasValidCustomTimer
                                  ? 'Nhập số nguyên từ 1 đến 3600 giây.'
                                  : 'Thời gian phải là số nguyên từ 1 đến 3600 giây.'}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                {/* Hint */}
                <div>
                  <label className="text-xs text-neutral-300 mb-1 block">
                    Gợi ý thêm (Không bắt buộc)
                  </label>
                  <input
                    type="text"
                    value={customHint}
                    onChange={(e) => setCustomHint(e.target.value)}
                    placeholder="Gợi ý nhỏ..."
                    className="input-shimmer input-focus-glow w-full bg-neutral-900/90 border border-neutral-700 text-xs text-white rounded-xl p-2.5 focus:border-rose-400 focus:outline-none transition-all duration-300"
                  />
                </div>

                {/* Built-in icon picker */}
                {!originalImage && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-xs text-neutral-300">Biểu tượng trên thẻ</label>
                      <span className="text-[10px] text-neutral-500">{CARD_ICON_NAMES.length} lựa chọn</span>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950/60 p-2">
                      {CARD_ICON_NAMES.map((iconName) => {
                        const Icon = getCardIcon(iconName);
                        if (!Icon) return null;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            title={iconName}
                            aria-label={`Chọn biểu tượng ${iconName}`}
                            onClick={() => {
                              setCustomIcon(iconName);
                              setIllustrationTouched(true);
                            }}
                            className={`aspect-square rounded-lg p-1.5 transition-all hover:-translate-y-0.5 hover:bg-rose-500/15 ${customIcon === iconName ? 'bg-rose-500/20 ring-1 ring-rose-400' : 'bg-white/[0.03]'}`}
                          >
                            <Icon className="w-full h-full text-rose-400" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <section className="space-y-3 rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-3.5" aria-labelledby="card-appearance-title">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200">
                      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h4 id="card-appearance-title" className="text-xs font-semibold text-neutral-100">Bố cục hiển thị</h4>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-neutral-500">Chỉnh kích thước và khoảng cách giữa icon với nội dung.</p>
                    </div>
                  </div>

                  <div className="flex min-h-44 flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#140b13] px-4 py-4 text-center">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-visible text-rose-300">
                      <div
                        className="h-14 w-14 transition-transform duration-200 motion-reduce:transition-none"
                        style={{ transform: `scale(${cardIconScale})` }}
                      >
                        {processedImage ? (
                          <img src={processedImage} alt="" className="h-full w-full object-contain" style={{ filter: imagePreviewShadow }} />
                        ) : (() => {
                          const PreviewIcon = getCardIcon(customIcon);
                          return PreviewIcon ? <PreviewIcon className="h-full w-full" /> : null;
                        })()}
                      </div>
                    </div>
                    <div className="min-w-0" style={{ marginTop: `${cardIconTextGap}px` }}>
                      <p
                        className="font-medium leading-relaxed text-white transition-[font-size] duration-200 motion-reduce:transition-none"
                        style={{ fontSize: `${12 * cardTextScale}px` }}
                      >
                        Xem trước nội dung lá bài
                      </p>
                      <p
                        className="mt-1 italic text-rose-300/75 transition-[font-size] duration-200 motion-reduce:transition-none"
                        style={{ fontSize: `${9 * cardTextScale}px` }}
                      >
                        Nhãn, gợi ý và thời gian cũng đổi theo.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <ZoomIn className="h-3.5 w-3.5 shrink-0 text-violet-200" aria-hidden="true" />
                      <label htmlFor="card-icon-scale" className="w-20 shrink-0 text-[10px] text-neutral-400">Icon</label>
                      <input
                        id="card-icon-scale"
                        type="range"
                        min="50"
                        max="180"
                        step="5"
                        value={Math.round(cardIconScale * 100)}
                        onChange={(event) => setCardIconScale(Number(event.target.value) / 100)}
                        className="h-1 flex-1 accent-violet-400"
                      />
                      <output htmlFor="card-icon-scale" className="w-10 text-right text-[10px] tabular-nums text-neutral-400">{Math.round(cardIconScale * 100)}%</output>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 shrink-0 text-center text-xs font-serif text-violet-200" aria-hidden="true">Aa</span>
                      <label htmlFor="card-text-scale" className="w-20 shrink-0 text-[10px] text-neutral-400">Tất cả chữ</label>
                      <input
                        id="card-text-scale"
                        type="range"
                        min="75"
                        max="150"
                        step="5"
                        value={Math.round(cardTextScale * 100)}
                        onChange={(event) => setCardTextScale(Number(event.target.value) / 100)}
                        className="h-1 flex-1 accent-violet-400"
                      />
                      <output htmlFor="card-text-scale" className="w-10 text-right text-[10px] tabular-nums text-neutral-400">{Math.round(cardTextScale * 100)}%</output>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 shrink-0 text-center text-sm leading-none text-violet-200" aria-hidden="true">↕</span>
                      <label htmlFor="card-icon-text-gap" className="w-20 shrink-0 text-[10px] text-neutral-400">Icon ↔ chữ</label>
                      <input
                        id="card-icon-text-gap"
                        type="range"
                        min="0"
                        max="48"
                        step="2"
                        value={cardIconTextGap}
                        onChange={(event) => setCardIconTextGap(Number(event.target.value))}
                        className="h-1 flex-1 accent-violet-400"
                      />
                      <output htmlFor="card-icon-text-gap" className="w-10 text-right text-[10px] tabular-nums text-neutral-400">{cardIconTextGap}px</output>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCardIconScale(1); setCardTextScale(1); setCardIconTextGap(8); }}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] text-[10px] font-semibold text-neutral-400 transition-colors hover:border-violet-200/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/50"
                  >
                    Khôi phục bố cục mặc định
                  </button>
                </section>

                {/* ========= IMAGE UPLOAD & EDITOR ========= */}
                <div className="border border-dashed border-rose-500/30 rounded-2xl p-4 space-y-3">
                  <label className="text-xs text-neutral-300 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    Ảnh minh hoạ (không bắt buộc)
                  </label>
                  {editingCard?.customImage && !illustrationTouched && (
                    <p className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-[9px] leading-relaxed text-emerald-100/70">
                      Ảnh đã lưu đang được giữ nguyên. Chỉ xử lý lại khi bạn dùng crop, xóa nền, màu hoặc tải ảnh mới.
                    </p>
                  )}

                  {/* Upload button */}
                  {!originalImage ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const file = event.dataTransfer.files[0];
                        if (file) loadImageFile(file);
                      }}
                      className="w-full py-8 flex flex-col items-center justify-center gap-2 bg-neutral-900/60 rounded-xl border border-neutral-700/50 cursor-pointer hover:border-rose-500/40 hover:bg-neutral-900/80 transition-all"
                    >
                      <Upload className="w-8 h-8 text-neutral-500" />
                      <span className="text-xs text-neutral-400">
                        Bấm để chọn ảnh hoặc kéo thả
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        PNG, JPG, WEBP — Tự crop, xóa nền và đồng bộ màu theo thẻ
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Preview: Original vs Processed */}
                      <div className="flex gap-3 items-start">
                        {/* Original */}
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-neutral-500 mb-1.5">Ảnh gốc</p>
                          <div className="w-full aspect-square rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700/40 flex items-center justify-center">
                            <img
                              src={originalImage}
                              alt="original"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center pt-8 text-neutral-500 text-lg">→</div>

                        {/* Processed (pink/white) */}
                        <div className="flex-1 text-center">
                          <p className={`mb-1.5 text-[10px] ${imagePreviewToneClass}`}>Icon · {imagePaletteLabel}</p>
                          <div
                            role="group"
                            tabIndex={0}
                            aria-label="Khung crop ảnh. Kéo ảnh hoặc dùng phím mũi tên để căn chủ thể; giữ Shift để dịch nhanh."
                            onPointerDown={handleCropPointerDown}
                            onPointerMove={handleCropPointerMove}
                            onPointerUp={handleCropPointerEnd}
                            onPointerCancel={handleCropPointerEnd}
                            onKeyDown={handleCropKeyDown}
                            className={`transparency-grid group/crop relative flex aspect-square w-full touch-none select-none items-center justify-center overflow-hidden rounded-xl border cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 ${imagePreviewToneClass}`}
                          >
                            {processedImage ? (
                              <img
                                src={processedImage}
                                alt="processed"
                                draggable={false}
                                className="pointer-events-none h-full w-full object-contain"
                                style={{ filter: imagePreviewShadow }}
                              />
                            ) : (
                              <span className="text-xs text-neutral-500">Đang xử lý...</span>
                            )}
                            <span className="pointer-events-none absolute inset-2 rounded-lg border border-dashed border-white/55 opacity-70 transition-opacity group-hover/crop:opacity-100 group-focus-visible/crop:opacity-100" aria-hidden="true" />
                            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-2 py-1 text-[8px] text-white/80 opacity-0 transition-opacity group-hover/crop:opacity-100 group-focus-visible/crop:opacity-100">
                              Kéo để crop
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Editor Controls */}
                      <div className="space-y-3 pt-3 border-t border-neutral-800">
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-900/70 border border-neutral-800 p-2.5">
                          <div className="flex items-center gap-2">
                            <Crop className="w-4 h-4 text-amber-200" />
                            <div>
                              <div className="text-[11px] text-neutral-200 font-medium">Tự crop theo chủ thể</div>
                              <div className="text-[9px] text-neutral-500">Căn chủ thể vào giữa rồi vẫn cho phép scale và dịch chuyển</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={imgAutoCrop}
                            aria-label="Tự crop ảnh theo chủ thể"
                            onClick={() => { enableImageProcessing(); setImgAutoCrop((enabled) => !enabled); }}
                            className={`flex h-8 w-12 items-center rounded-full p-1 transition-colors ${imgAutoCrop ? 'justify-end bg-amber-500' : 'justify-start bg-neutral-700'}`}
                          >
                            <span className="h-6 w-6 rounded-full bg-white shadow" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-900/70 border border-neutral-800 p-2.5">
                          <div className="flex items-center gap-2">
                            <Eraser className="w-4 h-4 text-rose-300" />
                            <div>
                              <div className="text-[11px] text-neutral-200 font-medium">Xóa nền tự động</div>
                              <div className="text-[9px] text-neutral-500">Nhận diện màu nền từ các góc ảnh</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={imgRemoveBackground}
                            onClick={() => { enableImageProcessing(); setImgRemoveBackground((enabled) => !enabled); }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center ${imgRemoveBackground ? 'bg-rose-500 justify-end' : 'bg-neutral-700 justify-start'}`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow" />
                          </button>
                        </div>
                        {imgRemoveBackground && (
                          <div className="flex items-center gap-3">
                            <Eraser className="w-3.5 h-3.5 text-rose-300" />
                            <label className="text-[10px] text-neutral-400 w-14 shrink-0">Độ xóa</label>
                            <input type="range" min="10" max="180" value={imgBackgroundTolerance} onChange={(e) => { enableImageProcessing(); setImgBackgroundTolerance(Number(e.target.value)); }} className="flex-1 h-1 accent-rose-500" />
                            <span className="text-[10px] text-neutral-500 w-9 text-right">{imgBackgroundTolerance}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 border-white bg-neutral-700" aria-hidden="true" />
                          <label htmlFor="image-white-outline" className="w-20 shrink-0 text-[10px] text-neutral-400">Viền trắng</label>
                          <input
                            id="image-white-outline"
                            type="range"
                            min="0"
                            max="12"
                            step="1"
                            value={imgWhiteOutlineWidth}
                            onChange={(event) => { enableImageProcessing(); setImgWhiteOutlineWidth(Number(event.target.value)); }}
                            className="h-1 flex-1 accent-white"
                          />
                          <output htmlFor="image-white-outline" className="w-9 text-right text-[10px] tabular-nums text-neutral-400">
                            {imgWhiteOutlineWidth === 0 ? 'Tắt' : `${imgWhiteOutlineWidth}px`}
                          </output>
                        </div>
                        <p className="-mt-1 pl-7 text-[9px] text-neutral-500">Viền được tạo theo mép chủ thể và lưu cùng ảnh.</p>
                        <div className="flex items-center gap-3">
                          <ZoomIn className="w-3.5 h-3.5 text-rose-300" />
                          <label className="text-[10px] text-neutral-400 w-14 shrink-0">Scale icon</label>
                          <input type="range" min="100" max="300" step="10" value={imgZoom * 100} onChange={(e) => { enableImageProcessing(); setImgZoom(Number(e.target.value) / 100); }} className="flex-1 h-1 accent-rose-500" />
                          <span className="text-[10px] text-neutral-500 w-9 text-right">{imgZoom.toFixed(1)}×</span>
                        </div>
                        <p className="text-[9px] text-neutral-500 -mt-1 pl-7">1× luôn hiển thị trọn ảnh; tối đa 3× trong khung icon.</p>
                        <div className="flex items-center gap-3">
                          <Move className="w-3.5 h-3.5 text-rose-300" />
                          <label className="text-[10px] text-neutral-400 w-14 shrink-0">Ngang</label>
                          <input type="range" min="-50" max="50" value={imgOffsetX} onChange={(e) => { enableImageProcessing(); setImgOffsetX(Number(e.target.value)); }} className="flex-1 h-1 accent-rose-500" />
                          <span className="text-[10px] text-neutral-500 w-9 text-right">{Math.round(imgOffsetX)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Move className="w-3.5 h-3.5 rotate-90 text-rose-300" />
                          <label className="text-[10px] text-neutral-400 w-14 shrink-0">Dọc</label>
                          <input type="range" min="-50" max="50" value={imgOffsetY} onChange={(e) => { enableImageProcessing(); setImgOffsetY(Number(e.target.value)); }} className="flex-1 h-1 accent-rose-500" />
                          <span className="text-[10px] text-neutral-500 w-9 text-right">{Math.round(imgOffsetY)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5">
                          <div>
                            <p className="text-[10px] font-medium text-neutral-300">Crop vuông 1:1</p>
                            <p className="mt-0.5 text-[9px] text-neutral-500">Kéo trực tiếp trên preview, phóng bằng Scale icon.</p>
                          </div>
                          <button
                            type="button"
                            onClick={resetCrop}
                            className="min-h-11 shrink-0 rounded-lg border border-white/10 px-3 text-[10px] font-semibold text-neutral-300 transition-colors hover:border-amber-300/35 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                          >
                            Đặt lại crop
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-[10px] text-neutral-400 w-16 shrink-0">Ngưỡng sáng</label>
                          <input
                            type="range"
                            min="50"
                            max="220"
                            value={imgThreshold}
                            onChange={(e) => { enableImageProcessing(); setImgThreshold(Number(e.target.value)); }}
                            className="flex-1 h-1 accent-rose-500"
                          />
                          <span className="text-[10px] text-neutral-500 w-8 text-right">{imgThreshold}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-[10px] text-neutral-400 w-16 shrink-0">Tương phản</label>
                          <input
                            type="range"
                            min="50"
                            max="300"
                            value={imgContrast * 100}
                            onChange={(e) => { enableImageProcessing(); setImgContrast(Number(e.target.value) / 100); }}
                            className="flex-1 h-1 accent-amber-500"
                          />
                          <span className="text-[10px] text-neutral-500 w-8 text-right">{imgContrast.toFixed(1)}</span>
                        </div>

                        <div className="flex gap-2">
                          <button type="button" onClick={() => { enableImageProcessing(); setImgZoom(1); setImgOffsetX(0); setImgOffsetY(0); setImgThreshold(140); setImgContrast(1.5); setImgAutoCrop(true); setImgRemoveBackground(true); setImgBackgroundTolerance(55); setImgWhiteOutlineWidth(3); }} className="flex-1 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-center gap-1.5 hover:bg-rose-600/30 transition-all cursor-pointer">
                            <RotateCcw className="w-3 h-3" /> Đặt lại
                          </button>
                          <button
                            type="button"
                            onClick={handleClearImage}
                            className="py-1.5 px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs flex items-center gap-1.5 hover:text-white transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Xóa ảnh
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {imageError && <p className="text-[11px] text-rose-300">{imageError}</p>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!hasValidCustomTimer || !hasValidCustomGain}
                  className="mt-2 w-full rounded-full bg-gold-gradient py-3 text-sm font-bold text-neutral-950 shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {editingCard ? 'Lưu Thay Đổi' : 'Lưu Vào Bộ Sưu Tập'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProgressionConfig && isDeveloper && onProgressionConfigChange && onLuxuryProgressionConfigChange && (
          <ProgressionConfigModal
            config={progressionConfig}
            onChange={onProgressionConfigChange}
            luxuryConfig={luxuryProgressionConfig}
            onLuxuryChange={onLuxuryProgressionConfigChange}
            onClose={() => setShowProgressionConfig(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

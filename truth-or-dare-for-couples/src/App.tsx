import React, { lazy, Suspense, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { ParticleBackground } from './components/ParticleBackground';
import { IntroScreen } from './components/IntroScreen';
import { SetupScreen } from './components/SetupScreen';
import { GameTable } from './components/GameTable';
import { SummaryModal } from './components/SummaryModal';
import { RulesModal } from './components/RulesModal';
import {
  CardItem,
  CardResolutionEvent,
  ClothingRemovalEvent,
  GameEndReason,
  GameSettings,
  IntimacyEvent,
  JourneyPhase,
  LuxuryProgressionConfig,
  OutfitState,
  PendingDifficultyBoost,
  Player,
  PlayerRewardState,
  PositionSessionStats,
  ProgressionConfig,
  RewardEvent,
} from './types';
import { INITIAL_CARDS } from './data/cards';
import { mergeEditedSystemCard, normalizeCardClothingEffect } from './utils/cardSelection';
import { createOutfitState, hydrateGameSettings } from './utils/wardrobe';
import { getCardDeck, hydrateLuxuryProgressionConfig, hydrateProgressionConfig } from './utils/progression';
import { browserCardImageStore, hydrateCardImages, prepareCardsForStorage } from './utils/cardImageStore';
import { DEFAULT_PLAYER_1, DEFAULT_PLAYER_2, loadStoredPlayer } from './utils/playerStorage';
import { createRewardStates } from './utils/rewards';
import { compareCollectionCards } from './utils/cardOrdering';
import {
  EMPTY_POSITION_SESSION_STATS,
  appendCardResolutionEvent,
  applyPositionResolution,
  recordPositionDraw,
  recordPositionOpen,
} from './utils/gameResolution';
import { PlayerLoginScreen } from './components/PlayerLoginScreen';
import {
  fetchAdminPlayerStats,
  getPlayerSession,
  heartbeatPlayer,
  loginPlayer,
  logoutPlayer,
  type AdminPlayerStats,
  type PlayerSession,
} from './utils/playerSession';
import {
  getCoupleSession,
  loginCouple,
  logoutCouple,
  registerCouple,
  syncCoupleUnlockedCards,
  type CoupleSession,
} from './utils/coupleSession';
import { parseStoredCards, type CatalogPayload } from './utils/cardSchema';
import {
  catalogCache,
  createCloudBackup,
  deleteCloudCard,
  exportLocalCatalogZip,
  fetchCloudCatalog,
  fetchCloudCatalogIfChanged,
  hydrateCloudCatalogImages,
  importCloudBackup,
  readCatalogZip,
  saveCloudCard,
  saveCloudConfig,
  type CatalogSyncStatus,
} from './utils/cloudCatalog';

const CardCollection = lazy(async () => {
  const module = await import('./components/CardCollection');
  return { default: module.CardCollection };
});

const STORAGE_KEYS = {
  CUSTOM_CARDS: 'tod_couples_custom_cards',
  EDITED_CARDS: 'tod_couples_edited_cards',
  FAVORITES: 'tod_couples_favorites',
  SETTINGS: 'tod_couples_settings',
  PLAYER1: 'tod_couples_player1',
  PLAYER2: 'tod_couples_player2',
  UNLOCKED_CARDS: 'tod_couples_unlocked_cards',
  DELETED_SYSTEM_CARDS: 'tod_couples_deleted_system_cards',
  PROGRESSION_CONFIG: 'tod_couples_progression_config',
  LUXURY_PROGRESSION_CONFIG: 'tod_couples_luxury_progression_config',
};

type AppMode = 'player' | 'developer';

const loadStoredAppMode = (): AppMode => {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
    ? 'developer'
    : 'player';
};

const loadStoredArray = <T,>(
  key: string,
  isValid: (value: unknown) => value is T,
): T[] => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch {
    return [];
  }
};

const loadStoredCards = (key: string): CardItem[] => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? parseStoredCards(JSON.parse(saved)).map(normalizeCardClothingEffect) : [];
  } catch {
    return [];
  }
};

const loadStoredStringArray = (key: string): string[] => Array.from(new Set(
  loadStoredArray(
    key,
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  ),
));

export default function App() {
  const [screen, setScreen] = useState<'intro' | 'setup' | 'game' | 'collection'>('intro');
  const [collectionReturnScreen, setCollectionReturnScreen] = useState<'intro' | 'game'>('intro');
  const [showSummary, setShowSummary] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [gameEndReason, setGameEndReason] = useState<GameEndReason | null>(null);
  const [gameNavigationLocked, setGameNavigationLocked] = useState(false);
  const [appMode] = useState<AppMode>(loadStoredAppMode);
  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(
    appMode === 'developer' ? { loggedIn: true } : null,
  );
  const [coupleSession, setCoupleSession] = useState<CoupleSession | null>(null);
  const [playerSessionError, setPlayerSessionError] = useState<string | null>(null);
  const [adminPlayerStats, setAdminPlayerStats] = useState<AdminPlayerStats | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [cloudCatalog, setCloudCatalog] = useState<CatalogPayload | null>(null);
  const [catalogSync, setCatalogSync] = useState<CatalogSyncStatus>({
    mode: 'loading',
    datasetRevision: 0,
    message: 'Đang kiểm tra catalog cloud…',
  });
  const datasetRevisionRef = useRef(0);
  const screenRef = useRef<'intro' | 'setup' | 'game' | 'collection'>('intro');
  const catalogSyncModeRef = useRef<CatalogSyncStatus['mode']>('loading');
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Keep refs in sync so async closures never read stale values
  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => { catalogSyncModeRef.current = catalogSync.mode; }, [catalogSync.mode]);

  // Every view is a full-page destination. Reset the document scroll before
  // paint so entering the game from the bottom of Setup never clips its header.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  // Load custom cards from localStorage
  const [customCards, setCustomCards] = useState<CardItem[]>(() =>
    loadStoredCards(STORAGE_KEYS.CUSTOM_CARDS)
  );

  const [editedCards, setEditedCards] = useState<CardItem[]>(() =>
    loadStoredCards(STORAGE_KEYS.EDITED_CARDS)
  );

  // Load favorited card IDs
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadStoredStringArray(STORAGE_KEYS.FAVORITES)
  );
  const [unlockedCardIds, setUnlockedCardIds] = useState<string[]>(() =>
    loadStoredStringArray(STORAGE_KEYS.UNLOCKED_CARDS)
  );
  const [deletedSystemCardIds, setDeletedSystemCardIds] = useState<string[]>(() =>
    loadStoredStringArray(STORAGE_KEYS.DELETED_SYSTEM_CARDS)
  );

  // Players
  const [player1, setPlayer1] = useState<Player>(() => loadStoredPlayer(STORAGE_KEYS.PLAYER1, DEFAULT_PLAYER_1));
  const [player2, setPlayer2] = useState<Player>(() => loadStoredPlayer(STORAGE_KEYS.PLAYER2, DEFAULT_PLAYER_2));

  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return hydrateGameSettings(saved ? JSON.parse(saved) : null);
    } catch {
      return hydrateGameSettings(null);
    }
  });
  const [progressionConfig, setProgressionConfig] = useState<ProgressionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROGRESSION_CONFIG);
      return hydrateProgressionConfig(saved ? JSON.parse(saved) : null);
    } catch {
      return hydrateProgressionConfig(null);
    }
  });
  const [luxuryProgressionConfig, setLuxuryProgressionConfig] = useState<LuxuryProgressionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LUXURY_PROGRESSION_CONFIG);
      return hydrateLuxuryProgressionConfig(saved ? JSON.parse(saved) : null);
    } catch {
      return hydrateLuxuryProgressionConfig(null);
    }
  });

  // Current turn state
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<0 | 1>(0);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [outfitStates, setOutfitStates] = useState<[OutfitState, OutfitState]>(() => [
    createOutfitState(settings.outfits[0], 0),
    createOutfitState(settings.outfits[1], 1),
  ]);
  const [clothingRemovalEvents, setClothingRemovalEvents] = useState<ClothingRemovalEvent[]>([]);
  const [intimacyPercent, setIntimacyPercent] = useState(0);
  const [luxuryIntimacyPercent, setLuxuryIntimacyPercent] = useState(0);
  const [intimacyEvents, setIntimacyEvents] = useState<IntimacyEvent[]>([]);
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>('standard');
  const [sessionPositionCardIds, setSessionPositionCardIds] = useState<string[]>([]);
  const [positionSessionStats, setPositionSessionStats] = useState<PositionSessionStats>({ ...EMPTY_POSITION_SESSION_STATS });
  const [cardResolutionEvents, setCardResolutionEvents] = useState<CardResolutionEvent[]>([]);
  const [playerRewards, setPlayerRewards] = useState<[PlayerRewardState, PlayerRewardState]>(createRewardStates);
  const [pendingDifficultyBoosts, setPendingDifficultyBoosts] = useState<PendingDifficultyBoost[]>([]);
  const [rewardEvents, setRewardEvents] = useState<RewardEvent[]>([]);

  useEffect(() => {
    if (appMode === 'developer') return;
    let active = true;
    void Promise.all([
      getCoupleSession().catch(() => ({ loggedIn: false } as CoupleSession)),
      getPlayerSession().catch(() => ({ loggedIn: false } as PlayerSession)),
    ]).then(([cSession, pSession]) => {
      if (!active) return;
      if (cSession.loggedIn) {
        setCoupleSession(cSession);
        setPlayerSession({ loggedIn: true, displayName: cSession.coupleName });
        if (Array.isArray(cSession.unlockedCardIds) && cSession.unlockedCardIds.length > 0) {
          setUnlockedCardIds((current) => Array.from(new Set([...current, ...cSession.unlockedCardIds!])));
        }
      } else if (pSession.loggedIn) {
        setPlayerSession(pSession);
      } else {
        setPlayerSession({ loggedIn: false });
      }
    }).catch((error) => {
      if (!active) return;
      setPlayerSession({ loggedIn: false });
      setPlayerSessionError(error instanceof Error ? error.message : 'Không thể kiểm tra phiên đăng nhập.');
    });
    return () => { active = false; };
  }, [appMode]);

  useEffect(() => {
    if (appMode === 'developer' || !playerSession?.loggedIn) return;
    const sendHeartbeat = () => {
      if (document.visibilityState === 'visible') void heartbeatPlayer().catch(() => undefined);
    };
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 60_000);
    document.addEventListener('visibilitychange', sendHeartbeat);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', sendHeartbeat);
    };
  }, [appMode, playerSession?.loggedIn]);

  useEffect(() => {
    if (appMode !== 'developer') return;
    let active = true;
    const refresh = () => {
      void fetchAdminPlayerStats().then((stats) => {
        if (active) setAdminPlayerStats(stats);
      }).catch(() => undefined);
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [appMode]);

  useEffect(() => {
    let active = true;
    const applyCatalog = async (payload: CatalogPayload, mode: 'cloud' | 'offline') => {
      if (!active) return;
      setCustomCards(payload.customCards);
      setEditedCards(payload.editedCards);
      setDeletedSystemCardIds(payload.deletedSystemCardIds);
      setProgressionConfig(hydrateProgressionConfig(payload.progressionConfig));
      setLuxuryProgressionConfig(hydrateLuxuryProgressionConfig(payload.luxuryProgressionConfig));
      setCloudCatalog(payload);
      datasetRevisionRef.current = payload.datasetRevision;
      setCatalogSync({
        mode,
        datasetRevision: payload.datasetRevision,
        updatedAt: payload.updatedAt,
        lastBackupAt: payload.lastBackupAt,
        message: mode === 'cloud'
          ? 'Đã đồng bộ với Cloudflare'
          : 'Đang dùng dữ liệu offline gần nhất',
      });
      try {
        const hydrated = await hydrateCloudCatalogImages(payload);
        if (!active) return;
        setCustomCards(hydrated.customCards);
        setEditedCards(hydrated.editedCards);
      } catch (error) {
        if (!active) return;
        setCatalogSync((current) => ({
          ...current,
          message: error instanceof Error
            ? `Catalog đã tải; một số ảnh đang thiếu: ${error.message}`
            : 'Catalog đã tải; một số ảnh chưa thể đồng bộ.',
        }));
      }
    };

    const bootstrapCatalog = async () => {
      let cached: CatalogPayload | null = null;
      try {
        cached = await catalogCache.get();
      } catch {
        // A broken browser cache must never prevent the cloud copy from loading.
      }
      try {
        const remote = await fetchCloudCatalog();
        await catalogCache.put(remote);
        await applyCatalog(remote, 'cloud');
      } catch (error) {
        if (!active) return;
        if (cached) {
          try {
            await applyCatalog(cached, 'offline');
            return;
          } catch {
            // Fall through to the legacy local copy below.
          }
        }
        setCatalogSync({
          mode: 'local',
          datasetRevision: 0,
          message: error instanceof Error
            ? `${error.message}. Đang dùng dữ liệu cục bộ trên thiết bị.`
            : 'Đang dùng dữ liệu cục bộ trên thiết bị.',
        });
      }
    };
    void bootstrapCatalog();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (catalogSync.mode === 'draft') return;
    let active = true;
    let running = false;
    const refreshCatalog = async () => {
      if (!active || running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const remote = await fetchCloudCatalogIfChanged(datasetRevisionRef.current);
        if (!active || !remote || remote.datasetRevision <= datasetRevisionRef.current) return;
        await catalogCache.put(remote);
        if (!active) return;
        setCustomCards(remote.customCards);
        setEditedCards(remote.editedCards);
        setDeletedSystemCardIds(remote.deletedSystemCardIds);
        setProgressionConfig(hydrateProgressionConfig(remote.progressionConfig));
        setLuxuryProgressionConfig(hydrateLuxuryProgressionConfig(remote.luxuryProgressionConfig));
        setCloudCatalog(remote);
        datasetRevisionRef.current = remote.datasetRevision;
        setCatalogSync({
          mode: 'cloud',
          datasetRevision: remote.datasetRevision,
          updatedAt: remote.updatedAt,
          lastBackupAt: remote.lastBackupAt,
          message: 'Đã nhận bản cập nhật thẻ mới',
        });
        const hydrated = await hydrateCloudCatalogImages(remote);
        if (!active) return;
        setCustomCards(hydrated.customCards);
        setEditedCards(hydrated.editedCards);
      } catch {
        // A transient poll failure must not replace or clear the last valid catalog.
      } finally {
        running = false;
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') void refreshCatalog(); };
    const interval = window.setInterval(() => {
      // Suppress mid-game polling to avoid catalog churn during gameplay
      if (screenRef.current !== 'game') void refreshCatalog();
    }, 10_000);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [catalogSync.mode]);

  // Combine built-in cards + custom cards (memoized to avoid re-computation every render)
  const allCards = useMemo(() => {
    const editedCardMap = new Map<string, CardItem>(
      editedCards.map((card) => [card.id, card] as const),
    );
    return [
      ...INITIAL_CARDS
        .filter((card) => !deletedSystemCardIds.includes(card.id))
        .map((card) => mergeEditedSystemCard(card, editedCardMap.get(card.id))),
      ...customCards,
    ].sort(compareCollectionCards);
  }, [customCards, editedCards, deletedSystemCardIds]);

  // Filter available cards by active levels selected in settings (memoized)
  const availableCards = useMemo(
    () => allCards.filter(
      (card) => getCardDeck(card) === 'position' || settings.levels.includes(card.level),
    ),
    [allCards, settings.levels],
  );

  useEffect(() => {
    let active = true;
    const hydrateImages = async () => {
      const [customResult, editedResult] = await Promise.all([
        hydrateCardImages(customCards),
        hydrateCardImages(editedCards),
      ]);
      if (!active) return;
      const applyImages = (current: CardItem[], hydrated: CardItem[]) => {
        const byId = new Map(hydrated.map((card) => [card.id, card.customImage] as const));
        return current.map((card) => byId.get(card.id) ? { ...card, customImage: byId.get(card.id) } : card);
      };
      setCustomCards((current) => applyImages(current, customResult.cards));
      setEditedCards((current) => applyImages(current, editedResult.cards));
      const errors = [...customResult.errors, ...editedResult.errors];
      if (errors.length) setStorageError(errors[0]);
    };
    void hydrateImages();
    return () => { active = false; };
    // Only hydrate the metadata loaded during initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save changes to localStorage. Image bytes are committed to IndexedDB first;
  // failed migrations retain the legacy base64 value so data is never lost.
  useEffect(() => {
    if (catalogSync.mode !== 'local' && catalogSync.mode !== 'draft') return;
    let active = true;
    void prepareCardsForStorage(customCards).then((result) => {
      if (!active) return;
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_CARDS, JSON.stringify(result.cards));
        if (result.errors.length) setStorageError(result.errors[0]);
      } catch {
        setStorageError('Không đủ dung lượng để lưu bài riêng. Ảnh và nội dung hiện vẫn được giữ trong phiên này.');
      }
    });
    return () => { active = false; };
  }, [customCards, catalogSync.mode]);

  useEffect(() => {
    if (catalogSync.mode !== 'local' && catalogSync.mode !== 'draft') return;
    let active = true;
    void prepareCardsForStorage(editedCards).then((result) => {
      if (!active) return;
      try {
        localStorage.setItem(STORAGE_KEYS.EDITED_CARDS, JSON.stringify(result.cards));
        if (result.errors.length) setStorageError(result.errors[0]);
      } catch {
        setStorageError('Không đủ dung lượng để lưu chỉnh sửa thẻ. Dữ liệu hiện vẫn được giữ trong phiên này.');
      }
    });
    return () => { active = false; };
  }, [editedCards, catalogSync.mode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.UNLOCKED_CARDS, JSON.stringify(unlockedCardIds));
    } catch {}
  }, [unlockedCardIds]);

  useEffect(() => {
    if (catalogSync.mode !== 'local' && catalogSync.mode !== 'draft') return;
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_SYSTEM_CARDS, JSON.stringify(deletedSystemCardIds));
    } catch {}
  }, [deletedSystemCardIds, catalogSync.mode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYER1, JSON.stringify(player1));
      localStorage.setItem(STORAGE_KEYS.PLAYER2, JSON.stringify(player2));
    } catch {}
  }, [player1, player2]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    if (catalogSync.mode !== 'local' && catalogSync.mode !== 'draft') return;
    try {
      localStorage.setItem(STORAGE_KEYS.PROGRESSION_CONFIG, JSON.stringify(progressionConfig));
    } catch {}
  }, [progressionConfig, catalogSync.mode]);

  useEffect(() => {
    if (catalogSync.mode !== 'local' && catalogSync.mode !== 'draft') return;
    try {
      localStorage.setItem(STORAGE_KEYS.LUXURY_PROGRESSION_CONFIG, JSON.stringify(luxuryProgressionConfig));
    } catch {}
  }, [luxuryProgressionConfig, catalogSync.mode]);

  // Favorite toggle
  const handleToggleFavorite = (cardId: string) => {
    setFavorites((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const queueCloudMutation = (
    label: string,
    mutation: (expectedRevision: number) => Promise<{ datasetRevision: number }>,
  ) => {
    if (catalogSync.mode === 'draft') {
      // Already in draft — don't stack another draft message, just queue the attempt
    }
    setCatalogSync((current) => ({ ...current, message: `${label}…` }));
    mutationQueueRef.current = mutationQueueRef.current.then(async () => {
      // If we are not connected to cloud, try to reconnect first so the
      // mutation goes through (e.g. user edits stars while on cached data)
      if (catalogSyncModeRef.current !== 'cloud') {
        try {
          const remote = await fetchCloudCatalog();
          await catalogCache.put(remote);
          datasetRevisionRef.current = remote.datasetRevision;
          setCustomCards(remote.customCards);
          setEditedCards(remote.editedCards);
          setDeletedSystemCardIds(remote.deletedSystemCardIds);
          setProgressionConfig(hydrateProgressionConfig(remote.progressionConfig));
          setLuxuryProgressionConfig(hydrateLuxuryProgressionConfig(remote.luxuryProgressionConfig));
          setCloudCatalog(remote);
          setCatalogSync({
            mode: 'cloud',
            datasetRevision: remote.datasetRevision,
            updatedAt: remote.updatedAt,
            lastBackupAt: remote.lastBackupAt,
            message: `Đã kết nối lại cloud. ${label}…`,
          });
        } catch {
          setCatalogSync((current) => ({
            ...current,
            mode: 'draft',
            message: `${label} đang được giữ dưới dạng bản nháp trên thiết bị. Hãy kết nối lại rồi thử lưu.`,
          }));
          return;
        }
      }
      const result = await mutation(datasetRevisionRef.current);
      datasetRevisionRef.current = result.datasetRevision;
      const remote = await fetchCloudCatalog();
      await catalogCache.put(remote);
      setCloudCatalog(remote);
      datasetRevisionRef.current = remote.datasetRevision;
      setCatalogSync({
        mode: 'cloud',
        datasetRevision: remote.datasetRevision,
        updatedAt: remote.updatedAt,
        lastBackupAt: remote.lastBackupAt,
        message: 'Đã lưu và đồng bộ với Cloudflare',
      });
    }).catch((error) => {
      setCatalogSync((current) => ({
        ...current,
        mode: 'draft',
        message: error instanceof Error
          ? `${error.message} Bản chỉnh sửa vẫn còn trên thiết bị.`
          : 'Không thể đồng bộ. Bản chỉnh sửa vẫn còn trên thiết bị.',
      }));
    });
  };

  // Add custom card
  const handleAddCustomCard = (newCard: CardItem) => {
    setCustomCards((prev) => [newCard, ...prev]);
    queueCloudMutation('Đang thêm thẻ', async (expectedRevision) => {
      const result = await saveCloudCard(newCard, 'custom', expectedRevision);
      setCustomCards((current) => current.map((card) => card.id === result.card.id ? result.card : card));
      return result;
    });
  };

  const handleUnlockCard = (cardId: string) => {
    setUnlockedCardIds((current) => {
      if (current.includes(cardId)) return current;
      const next = [...current, cardId];
      if (coupleSession?.loggedIn) {
        void syncCoupleUnlockedCards(next);
      }
      return next;
    });
  };

  const handleDeleteCard = (card: CardItem) => {
    if (card.position?.family === 'have_sex') return;
    const cardId = card.id;
    if (card.isCustom) {
      setCustomCards((current) => current.filter((item) => item.id !== cardId));
    } else {
      setDeletedSystemCardIds((current) => current.includes(cardId) ? current : [...current, cardId]);
      setEditedCards((current) => current.filter((item) => item.id !== cardId));
    }
    setFavorites((current) => current.filter((id) => id !== cardId));
    setUnlockedCardIds((current) => current.filter((id) => id !== cardId));
    if (card.customImageId) {
      void browserCardImageStore.delete(card.customImageId).catch(() => {
        setStorageError('Đã xóa lá bài nhưng chưa thể dọn ảnh cũ khỏi bộ nhớ trình duyệt.');
      });
    }
    queueCloudMutation('Đang xóa thẻ', (expectedRevision) =>
      deleteCloudCard(cardId, card.isCustom ? 'custom' : 'system', expectedRevision));
  };

  const openCollection = (returnScreen: 'intro' | 'game') => {
    if (returnScreen === 'game' && gameNavigationLocked) return;
    setCollectionReturnScreen(returnScreen);
    setScreen('collection');
  };

  const handleUpdateCard = (
    updatedCard: CardItem,
    {
      clothingEffectTouched,
      illustrationTouched,
      timerTouched,
      progressionTouched,
      positionTouched,
    }: {
      clothingEffectTouched: boolean;
      illustrationTouched: boolean;
      timerTouched: boolean;
      progressionTouched: boolean;
      positionTouched: boolean;
    },
  ) => {
    if (updatedCard.deck === 'position' && updatedCard.position?.family === 'have_sex') {
      updatedCard = { ...updatedCard };
      delete updatedCard.clothingEffect;
    }
    if (updatedCard.isCustom) {
      setCustomCards((prev) => prev.map((card) => card.id === updatedCard.id ? updatedCard : card));
      queueCloudMutation('Đang lưu thẻ', async (expectedRevision) => {
        const result = await saveCloudCard(updatedCard, 'custom', expectedRevision);
        setCustomCards((current) => current.map((card) => card.id === result.card.id ? result.card : card));
        return result;
      });
      return;
    }
    const previousRawEdit = editedCards.find((card) => card.id === updatedCard.id);
    const nextRawEdit = { ...updatedCard };

    if (illustrationTouched) {
      nextRawEdit.illustrationOverride = true;
    } else if (previousRawEdit?.illustrationOverride) {
      nextRawEdit.illustrationOverride = true;
      nextRawEdit.icon = previousRawEdit.icon;
      nextRawEdit.customImage = previousRawEdit.customImage;
    } else {
      // Keep inherited system artwork absent so later curated updates still flow through.
      delete nextRawEdit.icon;
      delete nextRawEdit.customImage;
      delete nextRawEdit.customImageId;
      delete nextRawEdit.illustrationOverride;
    }

    if (!clothingEffectTouched) {
      if (previousRawEdit?.clothingEffect !== undefined) {
        nextRawEdit.clothingEffect = previousRawEdit.clothingEffect;
      } else {
        delete nextRawEdit.clothingEffect;
      }
    }

    if (!timerTouched) {
      if (previousRawEdit && Object.prototype.hasOwnProperty.call(previousRawEdit, 'timerSeconds')) {
        nextRawEdit.timerSeconds = previousRawEdit.timerSeconds;
      } else {
        delete nextRawEdit.timerSeconds;
      }
    }

    if (!progressionTouched) {
      if (previousRawEdit && Object.prototype.hasOwnProperty.call(previousRawEdit, 'progression')) {
        nextRawEdit.progression = previousRawEdit.progression;
      } else {
        delete nextRawEdit.progression;
      }
    }

    if (!positionTouched) {
      if (previousRawEdit && Object.prototype.hasOwnProperty.call(previousRawEdit, 'position')) {
        nextRawEdit.position = previousRawEdit.position;
        nextRawEdit.deck = previousRawEdit.deck;
      } else {
        delete nextRawEdit.position;
        delete nextRawEdit.deck;
      }
    }

    setEditedCards((prev) => [nextRawEdit, ...prev.filter((card) => card.id !== updatedCard.id)]);
    queueCloudMutation('Đang lưu chỉnh sửa thẻ', async (expectedRevision) => {
      const result = await saveCloudCard(nextRawEdit, 'system_override', expectedRevision);
      setEditedCards((current) => current.map((card) => card.id === result.card.id ? result.card : card));
      return result;
    });
  };

  const handleProgressionConfigChange = (config: ProgressionConfig) => {
    setProgressionConfig(config);
    queueCloudMutation('Đang lưu cấu hình Tim hồng', (expectedRevision) =>
      saveCloudConfig('progression', config, expectedRevision));
  };

  const handleLuxuryProgressionConfigChange = (config: LuxuryProgressionConfig) => {
    setLuxuryProgressionConfig(config);
    queueCloudMutation('Đang lưu cấu hình Tim Luxury', (expectedRevision) =>
      saveCloudConfig('luxury_progression', config, expectedRevision));
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const handleExportCatalog = async (): Promise<string> => {
    const backup = await exportLocalCatalogZip({
      schemaVersion: cloudCatalog?.schemaVersion,
      datasetRevision: datasetRevisionRef.current,
      customCards: [...customCards].sort(compareCollectionCards),
      editedCards: [...editedCards].sort(compareCollectionCards),
      deletedSystemCardIds,
      progressionConfig,
      luxuryProgressionConfig,
      cloudAssets: cloudCatalog?.assets,
    });
    downloadBlob(backup, `true-or-dare-r${datasetRevisionRef.current}.todbackup.zip`);
    return `Đã xuất ${INITIAL_CARDS.length - deletedSystemCardIds.length + customCards.length} thẻ từ trạng thái hiện tại trên thiết bị.`;
  };

  const handleCreateCloudBackup = async (): Promise<string> => {
    if (catalogSync.mode !== 'cloud') throw new Error('Cần kết nối cloud để tạo snapshot R2.');
    const result = await createCloudBackup();
    setCatalogSync((current) => ({
      ...current,
      lastBackupAt: new Date().toISOString(),
      message: `Đã tạo snapshot ${result.id}`,
    }));
    return 'Đã tạo snapshot thủ công trên R2.';
  };

  const handleImportCatalog = async (file: File): Promise<string> => {
    // A brand-new D1 catalog intentionally returns 503 until its first seed.
    // Do not gate the bootstrap import on an already-connected catalog; the
    // protected admin endpoint remains the source of truth for authorization.
    const bundle = await readCatalogZip(file);
    const dryRun = await importCloudBackup(bundle, { dryRun: true, replace: true });
    const total = INITIAL_CARDS.length - dryRun.counts.deletedSystemCards + dryRun.counts.customCards;
    if (!window.confirm(
      `Dry-run hợp lệ: ${total} thẻ, ${dryRun.counts.assets} ảnh. Tiếp tục thay catalog hiện tại? Cloud sẽ tự tạo backup trước khi thay.`,
    )) return 'Đã kiểm tra backup; chưa thay đổi dữ liệu cloud.';
    await importCloudBackup(bundle, { dryRun: false, replace: true });
    const remote = await fetchCloudCatalog();
    await catalogCache.put(remote);
    const hydrated = await hydrateCloudCatalogImages(remote);
    setCustomCards(hydrated.customCards);
    setEditedCards(hydrated.editedCards);
    setDeletedSystemCardIds(hydrated.deletedSystemCardIds);
    setProgressionConfig(hydrateProgressionConfig(hydrated.progressionConfig));
    setLuxuryProgressionConfig(hydrateLuxuryProgressionConfig(hydrated.luxuryProgressionConfig));
    setCloudCatalog(remote);
    datasetRevisionRef.current = remote.datasetRevision;
    setCatalogSync({
      mode: 'cloud',
      datasetRevision: remote.datasetRevision,
      updatedAt: remote.updatedAt,
      lastBackupAt: remote.lastBackupAt,
      message: 'Đã phục hồi backup và đồng bộ catalog mới',
    });
    return `Đã phục hồi ${INITIAL_CARDS.length - remote.counts.deletedSystemCards + remote.counts.customCards} thẻ.`;
  };

  // Start game handler
  const handleStartGame = (p1: Player, p2: Player, newSettings: GameSettings) => {
    setPlayer1(p1);
    setPlayer2(p2);
    setSettings(newSettings);
    setCurrentPlayerIndex(0);
    setCurrentRound(1);
    setOutfitStates([
      createOutfitState(newSettings.outfits[0], 0),
      createOutfitState(newSettings.outfits[1], 1),
    ]);
    setClothingRemovalEvents([]);
    setIntimacyPercent(0);
    setLuxuryIntimacyPercent(0);
    setIntimacyEvents([]);
    setJourneyPhase('standard');
    setSessionPositionCardIds([]);
    setPositionSessionStats({ ...EMPTY_POSITION_SESSION_STATS });
    setCardResolutionEvents([]);
    setPlayerRewards(createRewardStates());
    setPendingDifficultyBoosts([]);
    setRewardEvents([]);
    setGameEndReason(null);
    setShowSummary(false);
    setScreen('game');
  };

  // Turn rotation
  const handleNextTurn = () => {
    setCurrentPlayerIndex((prev) => (prev === 0 ? 1 : 0));
    setCurrentRound((prev) => prev + 1);
  };

  // Restart new session
  const handleRestartSession = () => {
    setPlayer1((prev) => ({ ...prev, completedCount: 0, skippedCount: 0 }));
    setPlayer2((prev) => ({ ...prev, completedCount: 0, skippedCount: 0 }));
    setCurrentPlayerIndex(0);
    setCurrentRound(1);
    setOutfitStates([
      createOutfitState(settings.outfits[0], 0),
      createOutfitState(settings.outfits[1], 1),
    ]);
    setClothingRemovalEvents([]);
    setIntimacyPercent(0);
    setLuxuryIntimacyPercent(0);
    setIntimacyEvents([]);
    setJourneyPhase('standard');
    setSessionPositionCardIds([]);
    setPositionSessionStats({ ...EMPTY_POSITION_SESSION_STATS });
    setCardResolutionEvents([]);
    setPlayerRewards(createRewardStates());
    setPendingDifficultyBoosts([]);
    setRewardEvents([]);
    setShowSummary(false);
    setGameEndReason(null);
    setScreen('setup');
  };

  const handleFinishGame = (reason: GameEndReason) => {
    setGameEndReason(reason);
    setShowSummary(true);
  };

  const handleReturnHome = () => {
    setShowSummary(false);
    setGameEndReason(null);
    setScreen('intro');
  };

  const handleLogout = async () => {
    await logoutCouple();
    await logoutPlayer().catch(() => undefined);
    setCoupleSession(null);
    setPlayerSession({ loggedIn: false });
    setScreen('intro');
  };

  const keepGameMounted = screen === 'game' || (screen === 'collection' && collectionReturnScreen === 'game');

  if (appMode === 'player' && playerSession === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#12090f] text-sm text-rose-200" role="status">
        Đang kiểm tra phiên người chơi…
      </div>
    );
  }

  if (appMode === 'player' && !playerSession?.loggedIn) {
    return (
      <PlayerLoginScreen
        initialError={playerSessionError}
        onLogin={async (displayName) => {
          const session = await loginPlayer(displayName);
          setPlayerSession(session);
          setPlayerSessionError(null);
        }}
        onCoupleLogin={async (coupleName, pin) => {
          const session = await loginCouple(coupleName, pin, unlockedCardIds);
          setCoupleSession(session);
          setPlayerSession({ loggedIn: true, displayName: session.coupleName });
          if (Array.isArray(session.unlockedCardIds) && session.unlockedCardIds.length > 0) {
            setUnlockedCardIds((current) => Array.from(new Set([...current, ...session.unlockedCardIds!])));
          }
          setPlayerSessionError(null);
        }}
        onCoupleRegister={async (coupleName, pin) => {
          const session = await registerCouple(coupleName, pin, unlockedCardIds);
          setCoupleSession(session);
          setPlayerSession({ loggedIn: true, displayName: session.coupleName });
          setPlayerSessionError(null);
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Romantic Ambient Particle Background */}
      <ParticleBackground />

      {/* Main Screen Views */}
      <main className="relative z-10">
        {screen === 'intro' && (
          <IntroScreen
            mode={appMode}
            coupleName={coupleSession?.coupleName}
            unlockedCount={unlockedCardIds.length}
            onLogout={handleLogout}
            onStart={() => appMode === 'developer' ? openCollection('intro') : setScreen('setup')}
            onOpenCollection={() => openCollection('intro')}
            onOpenRules={() => setShowRules(true)}
          />
        )}

        {screen === 'setup' && (
          <SetupScreen
            initialPlayer1={player1}
            initialPlayer2={player2}
            initialSettings={settings}
            onBack={() => setScreen('intro')}
            onOpenRules={() => setShowRules(true)}
            onStartGame={handleStartGame}
          />
        )}

        {keepGameMounted && (
          <div hidden={screen !== 'game'} aria-hidden={screen !== 'game' || undefined}>
            <GameTable
            player1={player1}
            player2={player2}
            currentPlayerIndex={currentPlayerIndex}
            currentRound={currentRound}
            settings={settings}
            outfitStates={outfitStates}
            availableCards={availableCards}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onOpenCollection={() => openCollection('game')}
            onOpenRules={() => setShowRules(true)}
            onOpenSummary={() => {
              setGameEndReason(null);
              setShowSummary(true);
            }}
            onFinishGame={handleFinishGame}
            isSuspended={screen !== 'game' || showRules || showSummary}
            onNavigationLockChange={setGameNavigationLocked}
            onUpdatePlayers={(p1, p2) => {
              setPlayer1(p1);
              setPlayer2(p2);
            }}
            onUpdateOutfits={setOutfitStates}
            onAddClothingRemovalEvent={(event) => {
              setClothingRemovalEvents((events) => [...events, event]);
            }}
            unlockedCardIds={unlockedCardIds}
            onUnlockCard={handleUnlockCard}
            onNextTurn={handleNextTurn}
            progressionConfig={progressionConfig}
            luxuryProgressionConfig={luxuryProgressionConfig}
            intimacyPercent={intimacyPercent}
            luxuryIntimacyPercent={luxuryIntimacyPercent}
            journeyPhase={journeyPhase}
            sessionPositionCardIds={sessionPositionCardIds}
            onIntimacyPercentChange={setIntimacyPercent}
            onLuxuryIntimacyPercentChange={setLuxuryIntimacyPercent}
            onAddIntimacyEvents={(events) => setIntimacyEvents((current) => [...current, ...events])}
            onJourneyPhaseChange={setJourneyPhase}
            onDrawPositionCard={() => setPositionSessionStats(recordPositionDraw)}
            onOpenPositionCard={() => setPositionSessionStats(recordPositionOpen)}
            onSessionPositionCardIdsChange={setSessionPositionCardIds}
            playerRewards={playerRewards}
            pendingDifficultyBoosts={pendingDifficultyBoosts}
            onPlayerRewardsChange={setPlayerRewards}
            onPendingDifficultyBoostsChange={setPendingDifficultyBoosts}
            onAddRewardEvent={(event) => setRewardEvents((events) => [...events, event])}
            onAddCardResolutionEvent={(event) => {
              setCardResolutionEvents((events) => appendCardResolutionEvent(events, event));
              setPositionSessionStats((stats) => applyPositionResolution(stats, event));
            }}
          />
          </div>
        )}

        {screen === 'collection' && (
          <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-rose-200">Đang mở Bộ sưu tập…</div>}>
            <CardCollection
            cards={allCards}
            mode={appMode}
            unlockedCardIds={unlockedCardIds}
            backDestination={collectionReturnScreen === 'game' ? 'game' : 'home'}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onAddCustomCard={appMode === 'developer' ? handleAddCustomCard : undefined}
            onUpdateCard={appMode === 'developer' ? handleUpdateCard : undefined}
            onDeleteCard={appMode === 'developer' ? handleDeleteCard : undefined}
            progressionConfig={progressionConfig}
            onProgressionConfigChange={appMode === 'developer' ? handleProgressionConfigChange : undefined}
            luxuryProgressionConfig={luxuryProgressionConfig}
            onLuxuryProgressionConfigChange={appMode === 'developer' ? handleLuxuryProgressionConfigChange : undefined}
            catalogSync={appMode === 'developer' ? catalogSync : undefined}
            playerStats={appMode === 'developer' ? adminPlayerStats : undefined}
            onExportCatalog={appMode === 'developer' ? handleExportCatalog : undefined}
            onImportCatalog={appMode === 'developer' ? handleImportCatalog : undefined}
            onCreateCloudBackup={appMode === 'developer' ? handleCreateCloudBackup : undefined}
            onBack={() => setScreen(collectionReturnScreen)}
          />
          </Suspense>
        )}
      </main>

      {/* Summary Stats Modal */}
      {showSummary && (
        <SummaryModal
          player1={player1}
          player2={player2}
          totalRounds={currentRound}
          favoritesCount={favorites.length}
          outfitStates={outfitStates}
          removalEvents={clothingRemovalEvents}
          intimacyPercent={intimacyPercent}
          luxuryIntimacyPercent={luxuryIntimacyPercent}
          intimacyEvents={intimacyEvents}
          positionSessionStats={positionSessionStats}
          cardResolutionEvents={cardResolutionEvents}
          journeyPhase={journeyPhase}
          playerRewards={playerRewards}
          rewardEvents={rewardEvents}
          onRestart={handleRestartSession}
          onClose={() => {
            if (!gameEndReason) setShowSummary(false);
          }}
          onHome={handleReturnHome}
          terminal={gameEndReason !== null}
          endReason={gameEndReason}
        />
      )}

      <AnimatePresence>
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </AnimatePresence>

      {storageError && (
        <div role="alert" className="fixed bottom-4 left-1/2 z-[90] flex w-[min(92vw,34rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-rose-300/35 bg-[#1a0b11]/95 px-4 py-3 text-xs text-rose-100 shadow-2xl">
          <span>{storageError}</span>
          <button type="button" onClick={() => setStorageError(null)} className="min-h-10 shrink-0 rounded-full border border-white/15 px-3 font-semibold">Đóng</button>
        </div>
      )}
    </div>
  );
}

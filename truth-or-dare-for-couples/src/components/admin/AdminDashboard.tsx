import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  CircleCheck,
  Cloud,
  CloudOff,
  DatabaseBackup,
  Download,
  ExternalLink,
  Gamepad2,
  History,
  LogOut,
  ShieldCheck,
  Layers,
  LayoutDashboard,
  Plus,
  SlidersHorizontal,
  SquareDashed,
  TriangleAlert,
  Upload,
  Users,
  Wand2,
} from 'lucide-react';
import type { CardItem, LuxuryProgressionConfig, ProgressionConfig } from '../../types';
import type { CatalogSyncStatus } from '../../utils/cloudCatalog';
import type { AdminPlayerStats } from '../../utils/playerSession';
import { CardCollection, type CardCollectionProps } from '../CardCollection';
import { ProgressionConfigModal } from '../ProgressionConfigModal';
import { isCardFrame } from '../../utils/cardFrames';
import { ADMIN_LOGOUT_PATH, checkAdminSession } from '../../utils/adminSession';
import {
  DEFAULT_LUXURY_PROGRESSION_CONFIG,
  DEFAULT_PROGRESSION_CONFIG,
  DIFFICULTY_STARS,
  POSITION_DIFFICULTY_STARS,
  getCardDeck,
} from '../../utils/progression';

type AdminSection = 'overview' | 'cards' | 'frames' | 'config' | 'players' | 'data';

const SECTION_IDS: readonly AdminSection[] = ['overview', 'cards', 'frames', 'config', 'players', 'data'];

const SECTION_COPY: Record<AdminSection, { title: string; description: string }> = {
  overview: {
    title: 'Tổng quan',
    description: 'Tình trạng game, kho thẻ và những việc nên làm tiếp.',
  },
  cards: {
    title: 'Thẻ bài',
    description: 'Thêm, sửa hoặc xóa thẻ. Bấm "Lưu" là thẻ được ghi lên cloud ngay.',
  },
  frames: {
    title: 'Khung cần điền',
    description: 'Lá bài đã đặt sẵn loại, cấp độ và số sao, chỉ chờ nội dung. Khung chỉ vào game sau khi bạn thay chữ [KHUNG] bằng nội dung thật.',
  },
  config: {
    title: 'Cấu hình game',
    description: 'Tốc độ tăng Tim Hồng, Tim Luxury và tỉ lệ rút bài theo từng chặng.',
  },
  players: {
    title: 'Người chơi',
    description: 'Số người đang chơi và những lượt vào game gần đây.',
  },
  data: {
    title: 'Dữ liệu & sao lưu',
    description: 'Sao lưu, khôi phục và lịch sử mọi thay đổi trên cloud.',
  },
};

export interface AdminRevision {
  id: string | number;
  dataset_revision: number;
  entity_type: string;
  entity_id: string;
  operation: string;
  actor_email: string | null;
  created_at: string;
}

export interface AdminDashboardProps {
  cards: CardItem[];
  favorites: string[];
  onToggleFavorite: (cardId: string) => void;
  unlockedCardIds: string[];
  onAddCustomCard: NonNullable<CardCollectionProps['onAddCustomCard']>;
  onUpdateCard: NonNullable<CardCollectionProps['onUpdateCard']>;
  onDeleteCard: NonNullable<CardCollectionProps['onDeleteCard']>;
  progressionConfig: ProgressionConfig;
  onProgressionConfigChange: (config: ProgressionConfig) => void;
  luxuryProgressionConfig: LuxuryProgressionConfig;
  onLuxuryProgressionConfigChange: (config: LuxuryProgressionConfig) => void;
  catalogSync: CatalogSyncStatus;
  playerStats: AdminPlayerStats | null;
  onExportCatalog: () => Promise<string>;
  onImportCatalog: (file: File) => Promise<string>;
  onCreateCloudBackup: () => Promise<string>;
}

const readSectionFromHash = (): AdminSection => {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace('#', '') as AdminSection;
  return SECTION_IDS.includes(hash) ? hash : 'overview';
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const formatRelative = (value?: string | null): string => {
  if (!value) return '—';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '—';
  const minutes = Math.round((Date.now() - time) / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
};

const syncLabel = (sync: CatalogSyncStatus): { connected: boolean; label: string } => {
  if (sync.mode === 'cloud') return { connected: true, label: 'Đã kết nối cloud' };
  if (sync.mode === 'loading') return { connected: false, label: 'Đang kết nối…' };
  if (sync.mode === 'draft') return { connected: false, label: 'Đang lưu thay đổi…' };
  return { connected: false, label: 'Chưa đồng bộ với cloud' };
};

const CONFIG_LABELS: Record<string, string> = {
  progression: 'Tim Hồng',
  luxury_progression: 'Tim Luxury',
};

/** Plain-language line for one catalog revision. */
const describeRevision = (revision: AdminRevision, cardLabel: (id: string) => string): string => {
  const { entity_type: type, operation, entity_id: id } = revision;
  if (type === 'catalog') return operation === 'replace' ? 'Thay toàn bộ kho thẻ từ file sao lưu' : `Kho thẻ · ${operation}`;
  if (type === 'config') return `Sửa cấu hình ${CONFIG_LABELS[id] ?? id}`;
  if (type === 'system_override' || type === 'system_card_overrides') {
    return `${operation === 'delete' ? 'Hoàn tác sửa' : 'Sửa'} thẻ · ${cardLabel(id)}`;
  }
  if (type === 'system_deletion') return `${operation === 'delete' ? 'Hiện lại' : 'Xóa'} thẻ · ${cardLabel(id)}`;
  if (type === 'custom' || type === 'custom_cards') {
    const verb = operation === 'create' ? 'Thêm' : operation === 'delete' ? 'Xóa' : operation === 'restore' ? 'Khôi phục' : 'Sửa';
    return `${verb} thẻ tự thêm · ${cardLabel(id)}`;
  }
  if (type === 'asset') return `Tải ảnh lên · ${id}`;
  return `${operation} · ${type} · ${id}`;
};

/** Fields the Admin should match so the game plays as designed (~70 min). */
const getConfigIssues = (standard: ProgressionConfig, luxury: LuxuryProgressionConfig): string[] => {
  const issues: string[] = [];
  if (standard.cardRemovalBonus !== DEFAULT_PROGRESSION_CONFIG.cardRemovalBonus) {
    issues.push(`Thưởng khi lá bài làm cởi đồ đang +${standard.cardRemovalBonus}%, khuyến nghị +${DEFAULT_PROGRESSION_CONFIG.cardRemovalBonus}%.`);
  }
  const standardGainsDiffer = DIFFICULTY_STARS.some((star) => standard.starGains[star] !== DEFAULT_PROGRESSION_CONFIG.starGains[star]);
  if (standardGainsDiffer) {
    issues.push(`Tim Hồng tăng theo sao đang ${DIFFICULTY_STARS.map((star) => standard.starGains[star]).join('/')}, khuyến nghị ${DIFFICULTY_STARS.map((star) => DEFAULT_PROGRESSION_CONFIG.starGains[star]).join('/')}.`);
  }
  const positionStars = POSITION_DIFFICULTY_STARS.filter((star) => star < 10);
  if (positionStars.some((star) => luxury.starGains[star] !== DEFAULT_LUXURY_PROGRESSION_CONFIG.starGains[star])) {
    issues.push(`Tim Luxury tăng theo sao ✦6–✦9 đang ${positionStars.map((star) => luxury.starGains[star]).join('/')}, khuyến nghị ${positionStars.map((star) => DEFAULT_LUXURY_PROGRESSION_CONFIG.starGains[star]).join('/')}.`);
  }
  if (luxury.bands.some((band) => (band.starWeights[10] ?? 0) > 0)) {
    issues.push('Có chặng Tư thế vẫn rút lá 10★. Lá 10★ (Have Sex) chỉ nên xuất hiện ở màn chọn 1 trong 3 lá cuối.');
  }
  return issues;
};

const withRecommendedStandard = (config: ProgressionConfig): ProgressionConfig => ({
  ...config,
  cardRemovalBonus: DEFAULT_PROGRESSION_CONFIG.cardRemovalBonus,
  starGains: { ...DEFAULT_PROGRESSION_CONFIG.starGains },
});

const withRecommendedLuxury = (config: LuxuryProgressionConfig): LuxuryProgressionConfig => {
  const bands = config.bands.map((band) => ({ ...band, starWeights: { ...band.starWeights, 10: 0 } }));
  const anyEmpty = bands.some((band) => POSITION_DIFFICULTY_STARS.every((star) => (band.starWeights[star] ?? 0) <= 0));
  return {
    ...config,
    bands: anyEmpty
      ? DEFAULT_LUXURY_PROGRESSION_CONFIG.bands.map((band) => ({ ...band, starWeights: { ...band.starWeights } }))
      : bands,
    starGains: {
      ...config.starGains,
      ...Object.fromEntries(POSITION_DIFFICULTY_STARS.filter((star) => star < 10)
        .map((star) => [star, DEFAULT_LUXURY_PROGRESSION_CONFIG.starGains[star]])),
    },
  };
};

const Panel: React.FC<{ title?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title,
  action,
  className = '',
  children,
}) => (
  <section className={`rounded-2xl border border-white/[0.08] bg-[#160e14]/85 p-4 sm:p-5 ${className}`}>
    {(title || action) && (
      <div className="mb-3 flex items-center justify-between gap-3">
        {title && <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </section>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string; hint?: string }> = ({ label, value, tone = 'text-neutral-50', hint }) => (
  <div className="min-w-0 rounded-xl bg-white/[0.035] px-3 py-2.5">
    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
    <p className={`mt-0.5 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    {hint && <p className="mt-0.5 truncate text-[10px] text-neutral-500">{hint}</p>}
  </div>
);

const ActionButton: React.FC<{
  icon: React.ElementType;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}> = ({ icon: Icon, children, onClick, disabled, primary }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-40 ${
      primary
        ? 'bg-[linear-gradient(135deg,#f7e7b0,#cda95c)] text-[#1a1008] hover:brightness-105'
        : 'border border-white/10 bg-white/[0.03] text-neutral-200 hover:border-white/25 hover:bg-white/[0.06]'
    }`}
  >
    <Icon className="h-4 w-4" aria-hidden="true" />
    {children}
  </button>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  cards,
  favorites,
  onToggleFavorite,
  unlockedCardIds,
  onAddCustomCard,
  onUpdateCard,
  onDeleteCard,
  progressionConfig,
  onProgressionConfigChange,
  luxuryProgressionConfig,
  onLuxuryProgressionConfigChange,
  catalogSync,
  playerStats,
  onExportCatalog,
  onImportCatalog,
  onCreateCloudBackup,
}) => {
  const [section, setSection] = useState<AdminSection>(readSectionFromHash);
  const [createNonce, setCreateNonce] = useState(0);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [confirmRecommended, setConfirmRecommended] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [revisions, setRevisions] = useState<AdminRevision[] | null>(null);
  const [revisionsError, setRevisionsError] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void checkAdminSession().then((session) => {
      if (active && session.email) setAdminEmail(session.email);
    });
    return () => { active = false; };
  }, []);

  const goTo = useCallback((next: AdminSection) => {
    setSection(next);
    setConfirmRecommended(false);
    try { window.history.replaceState(null, '', `#${next}`); } catch { /* ignore */ }
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onHashChange = () => setSection(readSectionFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const loadRevisions = useCallback(() => {
    setRevisionsError('');
    void fetch('/api/admin/revisions', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = await response.json() as { revisions?: AdminRevision[] };
        setRevisions(Array.isArray(body.revisions) ? body.revisions : []);
      })
      .catch((error: unknown) => {
        setRevisions([]);
        setRevisionsError(error instanceof Error ? error.message : 'Không tải được lịch sử.');
      });
  }, []);

  // Refresh the history whenever the dataset revision moves (a save landed).
  useEffect(() => {
    loadRevisions();
  }, [loadRevisions, catalogSync.datasetRevision]);

  const stats = useMemo(() => {
    const frames = cards.filter(isCardFrame);
    const playable = cards.filter((card) => !isCardFrame(card));
    const standard = playable.filter((card) => getCardDeck(card) === 'standard');
    return {
      total: playable.length,
      frames: frames.length,
      truth: standard.filter((card) => card.type === 'truth').length,
      dare: standard.filter((card) => card.type === 'dare').length,
      gentle: standard.filter((card) => card.level === 'gentle').length,
      intimate: standard.filter((card) => card.level === 'intimate').length,
      passionate: standard.filter((card) => card.level === 'passionate').length,
      position: playable.filter((card) => getCardDeck(card) === 'position').length,
      custom: playable.filter((card) => card.isCustom).length,
    };
  }, [cards]);

  const configIssues = useMemo(
    () => getConfigIssues(progressionConfig, luxuryProgressionConfig),
    [progressionConfig, luxuryProgressionConfig],
  );

  const sync = syncLabel(catalogSync);
  const backupAgeDays = catalogSync.lastBackupAt
    ? (Date.now() - new Date(catalogSync.lastBackupAt).getTime()) / 86_400_000
    : Infinity;

  const todos = [
    !sync.connected && catalogSync.mode !== 'loading' ? {
      id: 'sync',
      tone: 'warn' as const,
      text: catalogSync.message || 'Dữ liệu chưa đồng bộ với cloud. Thay đổi đang chỉ nằm trên máy này.',
      action: { label: 'Xem dữ liệu', go: 'data' as AdminSection },
    } : null,
    configIssues.length > 0 ? {
      id: 'config',
      tone: 'warn' as const,
      text: `Cấu hình game lệch ${configIssues.length} điểm so với khuyến nghị cho ván ~70 phút.`,
      action: { label: 'Sửa cấu hình', go: 'config' as AdminSection },
    } : null,
    stats.frames > 0 ? {
      id: 'frames',
      tone: 'info' as const,
      text: `Còn ${stats.frames} khung bài trống chờ điền nội dung.`,
      action: { label: 'Điền khung', go: 'frames' as AdminSection },
    } : null,
    sync.connected && backupAgeDays > 7 ? {
      id: 'backup',
      tone: 'info' as const,
      text: Number.isFinite(backupAgeDays)
        ? `Bản sao lưu gần nhất cách đây ${Math.floor(backupAgeDays)} ngày.`
        : 'Chưa có bản sao lưu nào trên cloud.',
      action: { label: 'Sao lưu', go: 'data' as AdminSection },
    } : null,
  ].filter(Boolean) as Array<{ id: string; tone: 'warn' | 'info'; text: string; action: { label: string; go: AdminSection } }>;

  const runAction = async (action: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setActionMessage('');
    try {
      setActionMessage(await action());
      loadRevisions();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Không thể hoàn tất thao tác.');
    } finally {
      setBusy(false);
    }
  };

  const applyRecommended = () => {
    onProgressionConfigChange(withRecommendedStandard(progressionConfig));
    onLuxuryProgressionConfigChange(withRecommendedLuxury(luxuryProgressionConfig));
    setConfirmRecommended(false);
    setActionMessage('Đã áp dụng cấu hình khuyến nghị. Thay đổi đang được lưu lên cloud.');
  };

  const cardLabel = (id: string): string => {
    const card = cards.find((item) => item.id === id);
    if (!card) return id;
    const text = card.content.replace(/\s+/g, ' ').trim();
    return text.length > 64 ? `${text.slice(0, 64)}…` : text;
  };

  const navItems: Array<{ id: AdminSection; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'cards', label: 'Thẻ bài', icon: Layers, badge: String(stats.total) },
    { id: 'frames', label: 'Khung cần điền', icon: SquareDashed, badge: stats.frames > 0 ? String(stats.frames) : undefined },
    { id: 'config', label: 'Cấu hình game', icon: SlidersHorizontal, badge: configIssues.length > 0 ? '!' : undefined },
    { id: 'players', label: 'Người chơi', icon: Users, badge: playerStats ? String(playerStats.online) : undefined },
    { id: 'data', label: 'Dữ liệu & sao lưu', icon: DatabaseBackup },
  ];

  const collectionProps = {
    cards,
    mode: 'developer' as const,
    favorites,
    onToggleFavorite,
    unlockedCardIds,
    onAddCustomCard,
    onUpdateCard,
    onDeleteCard,
    progressionConfig,
    luxuryProgressionConfig,
    onBack: () => goTo('overview'),
    embedded: true,
  };

  const renderRevisionList = (limit: number) => {
    if (revisions === null) return <p className="text-xs text-neutral-500">Đang tải lịch sử…</p>;
    if (revisions.length === 0) {
      return (
        <p className="text-xs text-neutral-500">
          {revisionsError ? `Chưa đọc được lịch sử (${revisionsError}).` : 'Chưa có thay đổi nào được ghi lại.'}
        </p>
      );
    }
    return (
      <ol className="divide-y divide-white/[0.06]">
        {revisions.slice(0, limit).map((revision) => (
          <li key={`${revision.id}-${revision.dataset_revision}`} className="flex items-start gap-3 py-2.5">
            <span className="mt-0.5 shrink-0 rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
              r{revision.dataset_revision}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-neutral-200">{describeRevision(revision, cardLabel)}</p>
              <p className="mt-0.5 text-[10px] text-neutral-500">
                {formatDateTime(revision.created_at)}{revision.actor_email ? ` · ${revision.actor_email}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ol>
    );
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel>
          <div className="flex items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${sync.connected ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-300/10 text-amber-200'}`}>
              {sync.connected ? <Cloud className="h-5 w-5" aria-hidden="true" /> : <CloudOff className="h-5 w-5" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-100">{sync.label}</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">Bản dữ liệu r{catalogSync.datasetRevision}</p>
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-400/10 text-rose-200">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-100">
                {playerStats ? `${playerStats.online} đang chơi` : 'Chưa có số liệu'}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {playerStats ? `${playerStats.activeToday} người trong 24 giờ · ${playerStats.total} tổng` : 'Cần kết nối cloud'}
              </p>
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-300/10 text-violet-200">
              <DatabaseBackup className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-100">Sao lưu gần nhất</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {catalogSync.lastBackupAt ? `${formatRelative(catalogSync.lastBackupAt)} · ${formatDateTime(catalogSync.lastBackupAt)}` : 'Chưa có'}
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Việc cần làm">
        {todos.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-emerald-200">
            <CircleCheck className="h-4 w-4" aria-hidden="true" /> Mọi thứ đã sẵn sàng. Không có việc nào tồn đọng.
          </p>
        ) : (
          <ul className="space-y-2">
            {todos.map((todo) => (
              <li key={todo.id} className="flex flex-col gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-start gap-2 text-xs leading-relaxed text-neutral-200">
                  {todo.tone === 'warn'
                    ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    : <SquareDashed className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />}
                  {todo.text}
                </span>
                <button
                  type="button"
                  onClick={() => goTo(todo.action.go)}
                  className="flex min-h-9 shrink-0 items-center gap-1 self-start rounded-full border border-white/15 px-3 text-[11px] font-semibold text-neutral-100 hover:border-amber-200/40 hover:text-amber-100 sm:self-auto"
                >
                  {todo.action.label} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Kho thẻ"
          action={(
            <button type="button" onClick={() => goTo('cards')} className="flex items-center gap-1 text-[11px] font-semibold text-amber-200 hover:text-amber-100">
              Quản lý thẻ <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Đang dùng" value={stats.total} tone="text-amber-100" hint="lá người chơi rút được" />
            <Stat label="Sự thật" value={stats.truth} tone="text-sky-200" />
            <Stat label="Thử thách" value={stats.dare} tone="text-rose-200" />
            <Stat label="Tư thế" value={stats.position} tone="text-violet-200" />
            <Stat label="Nhẹ nhàng" value={stats.gentle} />
            <Stat label="Thân mật" value={stats.intimate} />
            <Stat label="Nồng nhiệt" value={stats.passionate} />
            <Stat label="Khung trống" value={stats.frames} tone={stats.frames > 0 ? 'text-sky-200' : 'text-neutral-50'} />
          </div>
        </Panel>

        <Panel title="Thao tác nhanh">
          <div className="grid gap-2">
            <ActionButton
              icon={Plus}
              primary
              onClick={() => {
                setCreateNonce((value) => value + 1);
                goTo('cards');
              }}
            >
              Thêm thẻ mới
            </ActionButton>
            <ActionButton icon={SlidersHorizontal} onClick={() => goTo('config')}>Chỉnh cấu hình game</ActionButton>
            <ActionButton icon={DatabaseBackup} disabled={busy || !sync.connected} onClick={() => void runAction(onCreateCloudBackup)}>
              Tạo bản sao lưu ngay
            </ActionButton>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Mở trang người chơi
            </a>
          </div>
        </Panel>
      </div>

      <Panel
        title="Thay đổi gần đây"
        action={(
          <button type="button" onClick={() => goTo('data')} className="flex items-center gap-1 text-[11px] font-semibold text-amber-200 hover:text-amber-100">
            Xem tất cả <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      >
        {renderRevisionList(6)}
      </Panel>

      <p className="px-1 text-[11px] leading-relaxed text-neutral-500">
        Thẻ và cấu hình bạn lưu ở đây được ghi lên cloud ngay. Người chơi nhận bản mới khi mở lại game hoặc tải lại trang.
      </p>
    </div>
  );

  const renderConfig = () => {
    const standardBands = progressionConfig.bands;
    const luxuryBands = luxuryProgressionConfig.bands;
    return (
      <div className="space-y-4">
        <Panel>
          {configIssues.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-emerald-200">
              <CircleCheck className="h-4 w-4" aria-hidden="true" /> Cấu hình đang khớp khuyến nghị cho ván ~70 phút.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                <TriangleAlert className="h-4 w-4 text-amber-300" aria-hidden="true" /> Lệch so với khuyến nghị
              </p>
              <ul className="space-y-1.5 pl-6 text-xs leading-relaxed text-neutral-300 [list-style:disc]">
                {configIssues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
              {!confirmRecommended ? (
                <ActionButton icon={Wand2} primary onClick={() => setConfirmRecommended(true)}>
                  Áp dụng giá trị khuyến nghị
                </ActionButton>
              ) : (
                <div role="alertdialog" aria-label="Xác nhận áp dụng cấu hình khuyến nghị" className="flex flex-col gap-2 rounded-xl border border-amber-200/25 bg-amber-200/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-neutral-200">Chỉ đổi các điểm ở trên, phần còn lại giữ nguyên. Áp dụng cho mọi người chơi?</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmRecommended(false)} className="min-h-9 rounded-full border border-white/15 px-3 text-[11px] font-semibold text-neutral-300">Hủy</button>
                    <button type="button" onClick={applyRecommended} className="min-h-9 rounded-full bg-amber-200 px-3 text-[11px] font-bold text-[#1a1008]">Áp dụng</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Tim Hồng · bài thường">
            <p className="mb-3 text-[11px] text-neutral-500">Mỗi lá hoàn thành cộng % theo số sao. Đầy 100% thì mở Bộ Tư thế.</p>
            <div className="grid grid-cols-5 gap-1.5">
              {DIFFICULTY_STARS.map((star) => (
                <Stat key={star} label={`${star}★`} value={`+${progressionConfig.starGains[star]}`} tone="text-rose-100" />
              ))}
            </div>
            <p className="mt-3 text-xs text-neutral-300">Lá bài làm cởi đồ: <strong className="text-rose-100">+{progressionConfig.cardRemovalBonus}%</strong></p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[280px] text-left text-[11px]">
                <thead className="text-neutral-500">
                  <tr><th className="py-1 font-medium">Chặng</th><th className="py-1 font-medium">Sự thật / Thử thách</th></tr>
                </thead>
                <tbody className="text-neutral-300">
                  {standardBands.map((band) => (
                    <tr key={`${band.minPercent}-${band.maxPercent}`} className="border-t border-white/[0.05]">
                      <td className="py-1.5 tabular-nums">{band.minPercent}–{band.maxPercent}%</td>
                      <td className="py-1.5 tabular-nums">{band.typeWeights.truth} / {band.typeWeights.dare}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Tim Luxury · Bộ Tư thế">
            <p className="mb-3 text-[11px] text-neutral-500">Mỗi lá tư thế hoàn thành cộng % theo số sao. Đầy thì tới màn chọn 1 trong 3 lá Have Sex.</p>
            <div className="grid grid-cols-4 gap-1.5">
              {POSITION_DIFFICULTY_STARS.filter((star) => star < 10).map((star) => (
                <Stat key={star} label={`✦${star}`} value={`+${luxuryProgressionConfig.starGains[star]}`} tone="text-violet-100" />
              ))}
            </div>
            <p className="mt-3 text-xs text-neutral-300">Cơ hội rút Have Sex sớm (80–99%): <strong className="text-violet-100">{luxuryProgressionConfig.finalCardChance}%</strong></p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[280px] text-left text-[11px]">
                <thead className="text-neutral-500">
                  <tr><th className="py-1 font-medium">Chặng</th>{POSITION_DIFFICULTY_STARS.map((star) => <th key={star} className="py-1 font-medium">✦{star}</th>)}</tr>
                </thead>
                <tbody className="text-neutral-300">
                  {luxuryBands.map((band) => (
                    <tr key={`${band.minPercent}-${band.maxPercent}`} className="border-t border-white/[0.05]">
                      <td className="py-1.5 tabular-nums">{band.minPercent}–{band.maxPercent}%</td>
                      {POSITION_DIFFICULTY_STARS.map((star) => (
                        <td key={star} className={`py-1.5 tabular-nums ${star === 10 && (band.starWeights[10] ?? 0) > 0 ? 'text-amber-300' : ''}`}>
                          {band.starWeights[star] ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <ActionButton icon={SlidersHorizontal} onClick={() => setShowConfigEditor(true)}>
          Mở trình chỉnh chi tiết
        </ActionButton>
      </div>
    );
  };

  const renderPlayers = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Đang chơi" value={playerStats?.online ?? '—'} tone="text-emerald-300" />
        <Stat label="Trong 24 giờ" value={playerStats?.activeToday ?? '—'} tone="text-rose-200" />
        <Stat label="Tổng" value={playerStats?.total ?? '—'} />
      </div>
      <Panel title="Vào game gần đây">
        {!playerStats ? (
          <p className="text-xs text-neutral-500">Chưa đọc được số liệu người chơi. Trang này cần kết nối cloud.</p>
        ) : playerStats.recent.length === 0 ? (
          <p className="text-xs text-neutral-500">Chưa có ai vào game.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-[0.1em] text-neutral-500">
                <tr>
                  <th className="py-2 font-medium">Tên hiển thị</th>
                  <th className="py-2 font-medium">Lần cuối</th>
                  <th className="py-2 font-medium">Lần đầu</th>
                  <th className="py-2 text-right font-medium">Số lần vào</th>
                </tr>
              </thead>
              <tbody className="text-neutral-200">
                {playerStats.recent.map((player, index) => (
                  <tr key={`${player.display_name}-${index}`} className="border-t border-white/[0.06]">
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${player.online ? 'bg-emerald-400' : 'bg-neutral-600'}`} aria-label={player.online ? 'Đang chơi' : 'Ngoại tuyến'} />
                        {player.display_name}
                      </span>
                    </td>
                    <td className="py-2 text-neutral-400">{formatRelative(player.last_seen_at)}</td>
                    <td className="py-2 text-neutral-400">{formatDateTime(player.first_seen_at)}</td>
                    <td className="py-2 text-right tabular-nums">{player.login_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {playerStats && <p className="mt-3 text-[10px] text-neutral-500">Cập nhật {formatRelative(playerStats.measuredAt)} · tự làm mới mỗi 30 giây.</p>}
      </Panel>
    </div>
  );

  const renderData = () => (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${sync.connected ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-300/10 text-amber-200'}`}>
            {sync.connected ? <Cloud className="h-5 w-5" aria-hidden="true" /> : <CloudOff className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0 text-xs">
            <p className="text-sm font-semibold text-neutral-100">{sync.label} · r{catalogSync.datasetRevision}</p>
            <p className="mt-1 leading-relaxed text-neutral-400">{catalogSync.message || 'Thẻ, ảnh và cấu hình được lưu trên Cloudflare.'}</p>
            <p className="mt-1 text-neutral-500">Sao lưu gần nhất: {formatDateTime(catalogSync.lastBackupAt)}</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel>
          <p className="text-sm font-semibold text-neutral-100">Tải file sao lưu</p>
          <p className="mt-1 min-h-[3rem] text-[11px] leading-relaxed text-neutral-500">Tải toàn bộ thẻ, ảnh và cấu hình hiện tại về máy dưới dạng file .zip.</p>
          <div className="mt-3"><ActionButton icon={Download} disabled={busy} onClick={() => void runAction(onExportCatalog)}>Tải về</ActionButton></div>
        </Panel>
        <Panel>
          <p className="text-sm font-semibold text-neutral-100">Khôi phục từ file</p>
          <p className="mt-1 min-h-[3rem] text-[11px] leading-relaxed text-neutral-500">Chọn file .zip đã tải. Hệ thống kiểm tra trước, hỏi lại, rồi tự sao lưu bản cũ trước khi thay.</p>
          <div className="mt-3"><ActionButton icon={Upload} disabled={busy} onClick={() => importInputRef.current?.click()}>Chọn file…</ActionButton></div>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip,.todbackup.zip,application/zip"
            className="hidden"
            aria-label="Chọn file sao lưu để khôi phục"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void runAction(() => onImportCatalog(file));
            }}
          />
        </Panel>
        <Panel>
          <p className="text-sm font-semibold text-neutral-100">Sao lưu trên cloud</p>
          <p className="mt-1 min-h-[3rem] text-[11px] leading-relaxed text-neutral-500">Lưu một bản chụp vào kho R2 của Cloudflare, không cần tải về máy.</p>
          <div className="mt-3"><ActionButton icon={DatabaseBackup} disabled={busy || !sync.connected} onClick={() => void runAction(onCreateCloudBackup)}>Sao lưu ngay</ActionButton></div>
        </Panel>
      </div>

      <Panel
        title="Lịch sử thay đổi"
        action={(
          <button type="button" onClick={loadRevisions} className="flex items-center gap-1 text-[11px] font-semibold text-amber-200 hover:text-amber-100">
            <History className="h-3.5 w-3.5" aria-hidden="true" /> Làm mới
          </button>
        )}
      >
        {renderRevisionList(50)}
      </Panel>
    </div>
  );

  const copy = SECTION_COPY[section];

  return (
    <div className="admin-shell relative z-10 min-h-screen bg-[#0d080b]/90 text-white lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/[0.07] bg-[#120b10]/95 px-4 py-5 lg:flex">
        <div className="px-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200/70">Truth or Dare</p>
          <p className="mt-1 font-serif-romantic text-xl font-bold text-neutral-50">Quản trị game</p>
        </div>
        <nav aria-label="Mục quản trị" className="mt-6 flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ${
                  active ? 'bg-amber-200/[0.1] font-semibold text-amber-100' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${item.badge === '!' ? 'bg-amber-300 text-[#1a1008]' : 'bg-white/[0.08] text-neutral-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-white/[0.07] pt-4">
          <p className={`flex items-center gap-2 px-2 pb-1 text-[11px] ${sync.connected ? 'text-emerald-300' : 'text-amber-200'}`}>
            {sync.connected ? <Cloud className="h-3.5 w-3.5" aria-hidden="true" /> : <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />}
            {sync.label}
          </p>
          {adminEmail && (
            <p className="flex items-center gap-2 truncate px-2 pb-1 text-[11px] text-neutral-400" title={adminEmail}>
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-200" aria-hidden="true" />
              <span className="truncate">{adminEmail}</span>
            </p>
          )}
          <a href="/" className="flex min-h-10 items-center gap-2 rounded-xl px-2 text-xs text-neutral-300 hover:bg-white/[0.04] hover:text-neutral-100">
            <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" /> Về trang người chơi
          </a>
          <a href={ADMIN_LOGOUT_PATH} className="flex min-h-10 items-center gap-2 rounded-xl px-2 text-xs text-neutral-500 hover:bg-white/[0.04] hover:text-rose-200">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Đăng xuất admin
          </a>
        </div>
      </aside>

      <div ref={mainRef} className="min-w-0">
        {/* Top bar (mobile) */}
        <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#120b10]/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-3">
            <div className="min-w-0">
              <p className="font-serif-romantic text-lg font-bold text-neutral-50">Quản trị game</p>
              <span className={`flex items-center gap-1.5 text-[11px] ${sync.connected ? 'text-emerald-300' : 'text-amber-200'}`}>
                {sync.connected ? <Cloud className="h-3.5 w-3.5" aria-hidden="true" /> : <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />}
                {sync.connected ? `Đã kết nối · r${catalogSync.datasetRevision}` : 'Chưa đồng bộ'}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <a href="/" className="flex min-h-9 items-center gap-1.5 rounded-full border border-white/12 px-3 text-[11px] font-semibold text-neutral-200">
                <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" /> Trang chơi
              </a>
              <a href={ADMIN_LOGOUT_PATH} aria-label="Đăng xuất admin" title="Đăng xuất admin" className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-neutral-400">
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
          <nav aria-label="Mục quản trị" className="flex gap-1.5 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs transition-colors ${
                    active ? 'bg-amber-200 font-semibold text-[#1a1008]' : 'border border-white/10 text-neutral-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                  {item.badge && item.id !== 'cards' && (
                    <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? 'bg-black/15' : item.badge === '!' ? 'bg-amber-300 text-[#1a1008]' : 'bg-white/10'}`}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="mb-6">
            <h1 className="font-serif-romantic text-2xl font-bold text-neutral-50 sm:text-3xl">{copy.title}</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-400 sm:text-sm">{copy.description}</p>
          </header>

          {actionMessage && (
            <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-neutral-200">
              {actionMessage}
            </p>
          )}

          {section === 'overview' && renderOverview()}
          {section === 'cards' && (
            <CardCollection key={`cards-${createNonce}`} {...collectionProps} autoOpenEditor={createNonce > 0} />
          )}
          {section === 'frames' && (
            stats.frames === 0 ? (
              <Panel>
                <p className="flex items-center gap-2 text-xs text-emerald-200">
                  <CircleCheck className="h-4 w-4" aria-hidden="true" /> Đã điền hết khung. Mọi lá đều đã vào game.
                </p>
              </Panel>
            ) : (
              <CardCollection key="frames" {...collectionProps} initialTab="frames" />
            )
          )}
          {section === 'config' && renderConfig()}
          {section === 'players' && renderPlayers()}
          {section === 'data' && renderData()}
        </main>
      </div>

      <AnimatePresence>
        {showConfigEditor && (
          <ProgressionConfigModal
            config={progressionConfig}
            onChange={onProgressionConfigChange}
            luxuryConfig={luxuryProgressionConfig}
            onLuxuryChange={onLuxuryProgressionConfigChange}
            cards={cards}
            onClose={() => setShowConfigEditor(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

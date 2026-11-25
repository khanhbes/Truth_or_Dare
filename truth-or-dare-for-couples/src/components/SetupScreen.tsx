import React, { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { EyeOff, Shuffle, Check, ArrowLeft, Play, ChevronDown, HelpCircle, Shirt, ShieldCheck, Clock3, AlertCircle } from 'lucide-react';
import { CardLevel, GameSettings, OutfitConfig, Player } from '../types';
import { LEVEL_INFO } from '../data/cards';
import { soundEngine } from '../utils/audio';
import { OutfitConfigurator } from './OutfitConfigurator';
import { OutfitFigure } from './OutfitFigure';
import { GARMENT_CATALOG, GARMENT_DISPLAY_ORDER, GARMENT_LABELS } from '../utils/wardrobe';

interface SetupScreenProps {
  initialPlayer1: Player;
  initialPlayer2: Player;
  initialSettings: GameSettings;
  coupleName?: string;
  unlockedCount?: number;
  onOpenAccountModal?: () => void;
  onLogout?: () => void;
  onBack: () => void;
  onOpenRules: () => void;
  onStartGame: (p1: Player, p2: Player, settings: GameSettings) => void;
}

const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '👑', '💖', '🔥', '🍷', '🌹', '🦋'];
const LEVEL_ORDER: CardLevel[] = ['gentle', 'intimate', 'passionate'];

/** Same colour code as the level badges in game: rose, gold, wine. */
const LEVEL_TONE: Record<CardLevel, { selected: string; check: string; dot: string }> = {
  gentle: {
    selected: 'border-rose-400/70 bg-rose-500/[0.1] shadow-[0_0_22px_rgba(255,107,157,0.12)]',
    check: 'border-rose-400 bg-rose-400 text-neutral-950',
    dot: 'bg-rose-400',
  },
  intimate: {
    selected: 'border-amber-300/70 bg-amber-400/[0.08] shadow-[0_0_22px_rgba(212,175,55,0.12)]',
    check: 'border-amber-300 bg-amber-300 text-neutral-950',
    dot: 'bg-amber-300',
  },
  passionate: {
    selected: 'border-red-500/75 bg-red-700/[0.16] shadow-[0_0_22px_rgba(185,28,28,0.16)]',
    check: 'border-red-500 bg-red-600 text-white',
    dot: 'bg-red-500',
  },
};

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#140d11]';

const SECTION_IDS = {
  players: 'setup-players',
  levels: 'setup-levels',
  outfits: 'setup-outfits',
  options: 'setup-options',
} as const;

const cloneOutfitConfig = (outfit: OutfitConfig): OutfitConfig => ({
  presentation: outfit.presentation,
  garments: { ...outfit.garments },
});

/** "Áo thun · Quần jean · Quần lót" style summary of an outfit. */
const describeOutfit = (outfit: OutfitConfig): string => {
  const parts = GARMENT_DISPLAY_ORDER.flatMap((slot) => {
    const garment = outfit.garments[slot];
    if (!garment) return [];
    const style = GARMENT_CATALOG[outfit.presentation][slot]?.find((option) => option.id === garment.styleId);
    return [style?.label ?? GARMENT_LABELS[slot]];
  });
  return parts.length ? parts.join(' · ') : 'Không mặc gì';
};

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const scrollToElement = (element: Element | null, block: ScrollLogicalPosition = 'start') => {
  element?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block });
};

/** Shown in the tile of the last chosen level when a player tries to turn it off. */
const LEVEL_NOTICE = 'Cần giữ ít nhất một mức. Hãy chọn mức khác trước.';

interface SetupSectionProps {
  id: string;
  headingId: string;
  step: number;
  title: string;
  description: string;
  optional?: boolean;
  complete?: boolean;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const SetupSection: React.FC<SetupSectionProps> = ({ id, headingId, step, title, description, optional, complete, aside, className = '', children }) => (
  <section id={id} aria-labelledby={headingId} className={`glass-dark scroll-mt-4 rounded-2xl p-4 shadow-xl sm:p-5 ${className}`}>
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ring-1 ${
            complete ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/40' : 'bg-rose-500/15 text-rose-100 ring-rose-400/35'
          }`}
          aria-hidden="true"
        >
          {complete ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : step}
        </span>
        <div className="min-w-0">
          <h3 id={headingId} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] font-semibold leading-snug text-white">
            {title}
            {optional && (
              <span className="rounded-full border border-white/15 px-2 py-px text-xs font-medium text-neutral-300 [font-family:'Be_Vietnam_Pro',system-ui,sans-serif]">Không bắt buộc</span>
            )}
          </h3>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-neutral-300">{description}</p>
        </div>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
    {children}
  </section>
);

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
  tone: 'rose' | 'amber';
  playerLabel: string;
}

const AvatarPicker: React.FC<AvatarPickerProps> = ({ value, onChange, tone, playerLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const toneClass = tone === 'rose'
    ? 'bg-rose-950/70 border-rose-500/40 hover:border-rose-300'
    : 'bg-amber-950/70 border-amber-500/40 hover:border-amber-300';

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = Math.max(0, AVATAR_OPTIONS.indexOf(value));
    optionRefs.current[selectedIndex]?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // Focus the current choice only when the menu opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const choose = (avatar: string) => {
    onChange(avatar);
    setIsOpen(false);
    soundEngine.playTick();
    triggerRef.current?.focus();
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent, index: number) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (index + moves[event.key] + AVATAR_OPTIONS.length) % AVATAR_OPTIONS.length;
    optionRefs.current[next]?.focus();
  };

  return (
    <div ref={rootRef} className={`relative ${isOpen ? 'z-50' : 'z-10'}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Biểu tượng của ${playerLabel}: ${value}. Đổi biểu tượng`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-11 min-w-[4.25rem] cursor-pointer items-center justify-between gap-1.5 rounded-xl border px-2.5 text-xl transition-colors ${toneClass} ${FOCUS_RING}`}
      >
        <span className="leading-none">{value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="group"
          aria-label="Chọn biểu tượng"
          className="avatar-menu absolute left-0 top-[calc(100%+8px)] grid w-[12.5rem] grid-cols-4 gap-1.5 rounded-2xl border border-white/15 bg-[#171014]/98 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl"
        >
          {AVATAR_OPTIONS.map((avatar, index) => (
            <button
              key={avatar}
              ref={(node) => { optionRefs.current[index] = node; }}
              type="button"
              aria-label={`Chọn ${avatar}`}
              aria-pressed={value === avatar}
              onClick={() => choose(avatar)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              className={`flex aspect-square items-center justify-center rounded-xl text-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 ${FOCUS_RING} ${value === avatar ? 'bg-rose-500/20 ring-1 ring-rose-300/70' : 'bg-white/[0.035]'}`}
            >
              {avatar}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface SwitchRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  tone: string;
}

/** The whole row toggles the setting, not just the small switch. */
const SwitchRow: React.FC<SwitchRowProps> = ({ icon, title, description, checked, onChange, tone }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-white/[0.03] ${FOCUS_RING} focus-visible:ring-offset-0`}
  >
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.05]" aria-hidden="true">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium text-white">{title}</span>
      <span className="mt-0.5 block text-pretty text-[0.8125rem] leading-relaxed text-neutral-300">{description}</span>
    </span>
    <span className="flex shrink-0 items-center gap-2">
      <span className={`hidden text-xs font-semibold sm:inline ${checked ? 'text-white' : 'text-neutral-300'}`}>{checked ? 'Bật' : 'Tắt'}</span>
      <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors duration-300 ${checked ? `${tone} justify-end` : 'justify-start bg-neutral-700'}`} aria-hidden="true">
        <span className="h-5 w-5 rounded-full bg-white shadow-md" />
      </span>
    </span>
  </button>
);

export const SetupScreen: React.FC<SetupScreenProps> = ({
  initialPlayer1,
  initialPlayer2,
  initialSettings,
  coupleName,
  unlockedCount,
  onOpenAccountModal,
  onBack,
  onOpenRules,
  onStartGame,
}) => {
  const [p1Name, setP1Name] = useState(initialPlayer1.name || 'Anh');
  const [p1Avatar, setP1Avatar] = useState(initialPlayer1.avatar || '👨‍💼');
  const [p2Name, setP2Name] = useState(initialPlayer2.name || 'Em');
  const [p2Avatar, setP2Avatar] = useState(initialPlayer2.avatar || '👩‍💼');

  const [selectedLevels, setSelectedLevels] = useState<CardLevel[]>(initialSettings.levels);
  const [privacyDefault, setPrivacyDefault] = useState<boolean>(initialSettings.privacyDefault);
  const [drawMode, setDrawMode] = useState<'random' | 'choose'>(initialSettings.drawMode);
  const [outfits, setOutfits] = useState<[OutfitConfig, OutfitConfig]>(() => [
    cloneOutfitConfig(initialSettings.outfits[0]),
    cloneOutfitConfig(initialSettings.outfits[1]),
  ]);
  const [activeOutfitTab, setActiveOutfitTab] = useState<0 | 1>(0);
  const [penaltyClothingEnabled, setPenaltyClothingEnabled] = useState(initialSettings.penaltyClothingEnabled);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [showOutfitEditor, setShowOutfitEditor] = useState(false);

  const [touched, setTouched] = useState<{ p1: boolean; p2: boolean }>({ p1: false, p2: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [levelNotice, setLevelNotice] = useState<CardLevel | null>(null);
  const [ctaInView, setCtaInView] = useState(true);

  const p1InputRef = useRef<HTMLInputElement>(null);
  const p2InputRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const consentBoxRef = useRef<HTMLLabelElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const levelNoticeTimer = useRef<number | undefined>(undefined);

  const p1Display = p1Name.trim() || 'Người chơi 1';
  const p2Display = p2Name.trim() || 'Người chơi 2';
  const sameNames = Boolean(p1Name.trim()) && p1Name.trim().toLocaleLowerCase('vi') === p2Name.trim().toLocaleLowerCase('vi');
  const nameErrors = {
    p1: !p1Name.trim() ? 'Nhập tên để hiển thị trong từng lượt.' : null,
    p2: !p2Name.trim() ? 'Nhập tên để hiển thị trong từng lượt.' : sameNames ? 'Hai người chơi cần hai tên khác nhau.' : null,
  };
  const playersReady = !nameErrors.p1 && !nameErrors.p2;
  const missing = [
    !playersReady ? 'tên người chơi' : null,
    !consentConfirmed ? 'xác nhận 18+' : null,
  ].filter(Boolean) as string[];
  const ready = missing.length === 0;
  const garmentCounts = outfits.map((outfit) => Object.keys(outfit.garments).length);

  useEffect(() => () => window.clearTimeout(levelNoticeTimer.current), []);

  // On phones a compact start bar appears while the real button is off screen.
  useEffect(() => {
    const element = ctaRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setCtaInView(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const toggleLevel = (lvl: CardLevel) => {
    if (selectedLevels.includes(lvl)) {
      if (selectedLevels.length === 1) {
        // Keep at least one level; say why instead of silently ignoring the tap.
        setLevelNotice(lvl);
        window.clearTimeout(levelNoticeTimer.current);
        levelNoticeTimer.current = window.setTimeout(() => setLevelNotice(null), 2600);
        return;
      }
      soundEngine.playTick();
      setSelectedLevels(selectedLevels.filter((l) => l !== lvl));
    } else {
      soundEngine.playTick();
      setSelectedLevels(LEVEL_ORDER.filter((l) => l === lvl || selectedLevels.includes(l)));
    }
    setLevelNotice(null);
  };

  const openOutfitEditor = (index: 0 | 1) => {
    setActiveOutfitTab(index);
    setShowOutfitEditor(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (nameErrors.p1 || nameErrors.p2) {
      const input = nameErrors.p1 ? p1InputRef.current : p2InputRef.current;
      scrollToElement(input, 'center');
      input?.focus({ preventScroll: true });
      return;
    }
    if (!consentConfirmed) {
      scrollToElement(consentBoxRef.current, 'center');
      consentRef.current?.focus({ preventScroll: true });
      return;
    }
    soundEngine.playCardFlip();
    const p1: Player = {
      name: p1Name.trim(),
      avatar: p1Avatar,
      color: '#FF6B9D',
      completedCount: 0,
      skippedCount: 0,
    };
    const p2: Player = {
      name: p2Name.trim(),
      avatar: p2Avatar,
      color: '#D4AF37',
      completedCount: 0,
      skippedCount: 0,
    };
    const settings: GameSettings = {
      levels: selectedLevels,
      roundsMode: 'unlimited',
      targetRounds: initialSettings.targetRounds,
      privacyDefault,
      drawMode,
      outfits,
      penaltyClothingEnabled,
    };
    onStartGame(p1, p2, settings);
  };

  const players = [
    {
      key: 'p1' as const,
      inputId: 'setup-p1-name',
      label: 'Người chơi 1',
      role: 'Nhân vật nam',
      dot: 'bg-rose-400',
      tone: 'rose' as const,
      focus: 'focus:border-rose-400',
      avatar: p1Avatar,
      setAvatar: setP1Avatar,
      name: p1Name,
      setName: setP1Name,
      inputRef: p1InputRef,
    },
    {
      key: 'p2' as const,
      inputId: 'setup-p2-name',
      label: 'Người chơi 2',
      role: 'Nhân vật nữ',
      dot: 'bg-amber-400',
      tone: 'amber' as const,
      focus: 'focus:border-amber-400',
      avatar: p2Avatar,
      setAvatar: setP2Avatar,
      name: p2Name,
      setName: setP2Name,
      inputRef: p2InputRef,
    },
  ];

  const editLink = (sectionId: string, label: string) => (
    <button
      type="button"
      onClick={() => scrollToElement(document.getElementById(sectionId))}
      aria-label={`Sửa ${label}`}
      className={`-my-1.5 -mr-2 inline-flex min-h-8 items-center rounded-md px-2 text-xs font-semibold text-rose-300 transition-colors hover:text-rose-100 ${FOCUS_RING}`}
    >
      Sửa
    </button>
  );

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-4 pb-10 pt-4 text-white lg:max-w-6xl">
      {/* Navigation Header */}
      <header className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 lg:grid-cols-[1fr_auto_1fr]">
          <button
            type="button"
            onClick={onBack}
            className={`-ml-2 flex min-h-11 items-center gap-2 justify-self-start rounded-xl px-2 text-sm text-neutral-200 transition-colors hover:bg-white/[0.05] hover:text-white ${FOCUS_RING}`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Quay lại</span>
          </button>

          <div className="col-start-3 row-start-1 flex items-center gap-2 justify-self-end">
            {coupleName && (
              <button
                type="button"
                onClick={onOpenAccountModal}
                className={`hidden min-h-10 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 text-xs text-emerald-200 transition-colors hover:border-emerald-300 hover:text-white sm:flex ${FOCUS_RING}`}
                title="Tài khoản của hai bạn"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                <span className="max-w-[120px] truncate">{coupleName}</span>
                {typeof unlockedCount === 'number' && (
                  <span className="text-xs font-bold tabular-nums text-emerald-200">{unlockedCount} lá</span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onOpenRules}
              className={`flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-950/30 px-3 text-sm text-rose-200 transition-all hover:border-rose-400/55 hover:bg-rose-500/10 hover:text-rose-50 ${FOCUS_RING}`}
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              <span>Luật chơi</span>
            </button>
          </div>
        <div className="col-span-3 text-center lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <h2 className="serif-title text-2xl font-bold text-[#e3c05a] sm:text-3xl">Thiết lập trò chơi</h2>
          <p className="mt-1.5 text-sm text-neutral-300">Bốn bước nhanh, đã có sẵn lựa chọn gợi ý. Chỉ cần xác nhận 18+ là vào ván.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} noValidate className="lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6">
        <div className="space-y-4 sm:space-y-5">
          {/* STEP 1: Players */}
          <SetupSection
            id={SECTION_IDS.players}
            headingId="setup-step-players"
            step={1}
            title="Hai người chơi"
            description="Tên và biểu tượng hiện ở mỗi lượt. Người chơi 1 dùng nhân vật nam, người chơi 2 dùng nhân vật nữ."
            complete={playersReady}
            className="relative z-20"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {players.map((player) => {
                const error = (touched[player.key] || submitAttempted) ? nameErrors[player.key] : null;
                const errorId = `${player.inputId}-error`;
                return (
                  <div key={player.key} className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label htmlFor={player.inputId} className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-neutral-100">
                        <span className={`h-2 w-2 rounded-full ${player.dot}`} aria-hidden="true" />
                        {player.label}
                      </label>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-neutral-300">{player.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AvatarPicker value={player.avatar} onChange={player.setAvatar} tone={player.tone} playerLabel={player.label} />
                      <input
                        ref={player.inputRef}
                        id={player.inputId}
                        type="text"
                        value={player.name}
                        onChange={(e) => player.setName(e.target.value)}
                        onBlur={() => setTouched((current) => ({ ...current, [player.key]: true }))}
                        onKeyDown={(event) => {
                          // Enter moves on to the next name instead of submitting the whole form.
                          if (event.key !== 'Enter') return;
                          event.preventDefault();
                          if (player.key === 'p1') p2InputRef.current?.focus();
                          else event.currentTarget.blur();
                        }}
                        placeholder={player.key === 'p1' ? 'vd: Anh' : 'vd: Em'}
                        maxLength={30}
                        autoComplete="off"
                        enterKeyHint="next"
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? errorId : undefined}
                        className={`input-focus-glow min-h-11 w-full rounded-xl border bg-neutral-950/60 px-3.5 text-base text-white transition-all duration-300 placeholder:text-neutral-400 focus:outline-none ${
                          error ? 'border-rose-400/80' : `border-neutral-700/60 ${player.focus}`
                        }`}
                      />
                    </div>
                    {error && (
                      <p id={errorId} className="mt-2 flex items-center gap-1.5 text-xs text-rose-300">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </SetupSection>

          {/* STEP 2: Levels */}
          <SetupSection
            id={SECTION_IDS.levels}
            headingId="setup-step-levels"
            step={2}
            title="Mức độ lá bài"
            description="Chỉ rút những lá thuộc mức đã chọn. Có thể chọn nhiều mức, ít nhất một."
            complete
            aside={<span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-neutral-300">{selectedLevels.length}/3</span>}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" role="group" aria-labelledby="setup-step-levels">
              {LEVEL_ORDER.map((lvl) => {
                const info = LEVEL_INFO[lvl];
                const tone = LEVEL_TONE[lvl];
                const isSelected = selectedLevels.includes(lvl);
                return (
                  <button
                    key={lvl}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleLevel(lvl)}
                    className={`relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 sm:min-h-[8.5rem] sm:flex-col sm:items-start sm:gap-2 sm:p-4 ${FOCUS_RING} ${
                      isSelected ? tone.selected : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]'
                    } ${levelNotice === lvl ? 'setup-shake' : ''}`}
                  >
                    <span className="text-2xl leading-none sm:text-[1.6rem]" aria-hidden="true">{info.icon}</span>
                    <span className="min-w-0 flex-1 sm:pr-6">
                      <span className="block font-serif-romantic text-base font-bold text-white">{info.name}</span>
                      <span className={`mt-0.5 block text-balance text-[0.8125rem] leading-relaxed ${levelNotice === lvl ? 'text-amber-200' : isSelected ? 'text-neutral-200' : 'text-neutral-300'}`}>
                        {levelNotice === lvl ? LEVEL_NOTICE : info.description}
                      </span>
                    </span>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors sm:absolute sm:right-3 sm:top-3 ${isSelected ? tone.check : 'border-white/30'}`}
                      aria-hidden="true"
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="sr-only" aria-live="polite">{levelNotice ? LEVEL_NOTICE : ''}</p>
          </SetupSection>

          {/* STEP 3: Outfits (collapsed to a summary by default) */}
          <SetupSection
            id={SECTION_IDS.outfits}
            headingId="setup-step-outfits"
            step={3}
            title="Trang phục ban đầu"
            description="Số món mỗi người mặc khi vào ván. Mỗi lá kèm cởi đồ sẽ bớt đi một món."
            optional
          >
            {/* The two summary cards double as the tabs of the editor below. */}
            <div
              className="grid grid-cols-2 gap-2 sm:gap-3"
              role={showOutfitEditor ? 'tablist' : undefined}
              aria-label={showOutfitEditor ? 'Chọn nhân vật để chỉnh trang phục' : undefined}
            >
              {([0, 1] as const).map((index) => {
                const playerName = index === 0 ? p1Display : p2Display;
                const isActive = showOutfitEditor && activeOutfitTab === index;
                return (
                  <button
                    key={index}
                    type="button"
                    role={showOutfitEditor ? 'tab' : undefined}
                    aria-selected={showOutfitEditor ? isActive : undefined}
                    aria-label={showOutfitEditor ? undefined : `Chỉnh trang phục của ${playerName}`}
                    onClick={() => openOutfitEditor(index)}
                    className={`flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-colors sm:gap-3 sm:px-3 ${FOCUS_RING} ${
                      isActive
                        ? 'border-rose-400/70 bg-rose-500/[0.12]'
                        : 'border-white/[0.07] bg-black/15 hover:border-rose-300/30 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="w-11 shrink-0 sm:w-12">
                      <OutfitFigure outfit={outfits[index]} compact ariaLabel={`Trang phục của ${playerName}`} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{playerName}</span>
                      <span className="block text-[0.8125rem] text-neutral-300">{garmentCounts[index]} món</span>
                      <span className="hidden truncate text-xs text-neutral-400 sm:block">{describeOutfit(outfits[index])}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {showOutfitEditor ? (
              <div className="mt-3 space-y-2.5">
                <OutfitConfigurator
                  key={activeOutfitTab}
                  value={outfits[activeOutfitTab]}
                  presentation={activeOutfitTab === 0 ? 'male' : 'female'}
                  label={activeOutfitTab === 0 ? p1Display : p2Display}
                  onChange={(next) => setOutfits((current) => activeOutfitTab === 0 ? [next, current[1]] : [current[0], next])}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.8125rem] text-neutral-300">Nam tối đa 3 món, nữ tối đa 4 món. Có thể bắt đầu với 0 món.</p>
                  <button
                    type="button"
                    aria-expanded
                    onClick={() => setShowOutfitEditor(false)}
                    className={`flex min-h-10 items-center gap-1.5 rounded-full border border-white/10 px-4 text-xs font-semibold text-neutral-200 transition-colors hover:border-rose-300/35 hover:bg-white/[0.04] ${FOCUS_RING}`}
                  >
                    <Check className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />
                    Xong
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                aria-expanded={false}
                onClick={() => openOutfitEditor(activeOutfitTab)}
                className={`mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 text-sm font-semibold text-neutral-200 transition-colors hover:border-rose-300/35 hover:bg-white/[0.04] ${FOCUS_RING}`}
              >
                <Shirt className="h-4 w-4 text-rose-300" aria-hidden="true" />
                Đổi số món, kiểu và màu
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </SetupSection>

          {/* STEP 4: Extra options */}
          <SetupSection
            id={SECTION_IDS.options}
            headingId="setup-step-options"
            step={4}
            title="Tuỳ chọn thêm"
            description="Mặc định đã phù hợp cho lần chơi đầu."
            optional
          >
            <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-black/15">
              <SwitchRow
                icon={<EyeOff className="h-4.5 w-4.5 text-amber-300" />}
                title="Che nội dung lá bài"
                description={'Lá bài úp cho tới khi bấm "Xem nội dung", người kia không đọc trộm được.'}
                checked={privacyDefault}
                onChange={setPrivacyDefault}
                tone="bg-amber-500"
              />
              <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.05]" aria-hidden="true">
                    <Shuffle className="h-4.5 w-4.5 text-rose-300" />
                  </span>
                  <span className="min-w-0">
                    <span id="setup-draw-mode" className="block text-sm font-medium text-white">Sự thật hay Thử thách</span>
                    <span className="mt-0.5 block text-pretty text-[0.8125rem] leading-relaxed text-neutral-300">Để game chọn ngẫu nhiên, hoặc người chơi tự chọn trước mỗi lượt.</span>
                  </span>
                </span>
                <div role="radiogroup" aria-labelledby="setup-draw-mode" className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-black/30 p-1 sm:w-52">
                  {(['random', 'choose'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={drawMode === mode}
                      onClick={() => setDrawMode(mode)}
                      className={`min-h-10 rounded-lg px-3 text-[0.8125rem] font-semibold transition-colors ${FOCUS_RING} focus-visible:ring-offset-0 ${drawMode === mode ? 'bg-rose-500/25 text-white ring-1 ring-rose-400/60' : 'text-neutral-300 hover:text-white'}`}
                    >
                      {mode === 'random' ? 'Ngẫu nhiên' : 'Tự chọn'}
                    </button>
                  ))}
                </div>
              </div>
              <SwitchRow
                icon={<Shirt className="h-4.5 w-4.5 text-rose-300" />}
                title="Hỏi cởi 1 món khi bỏ lá"
                description="Từ 20% Tim Hồng, người bỏ lá được chọn: không phạt, hoặc cởi 1 món của mình."
                checked={penaltyClothingEnabled}
                onChange={setPenaltyClothingEnabled}
                tone="bg-rose-500"
              />
            </div>
          </SetupSection>
        </div>

        {/* Review + start: a sticky side panel on desktop, the last block on phones. */}
        <aside className="mt-5 space-y-3 lg:sticky lg:top-4 lg:mt-0 lg:flex lg:max-h-[calc(100svh-7rem)] lg:flex-col lg:gap-3 lg:space-y-0" aria-label="Tóm tắt và bắt đầu">
          <div className="glass-dark rounded-2xl p-4 shadow-xl sm:p-5 lg:min-h-0 lg:overflow-y-auto lg:py-4">
            <p className="text-sm font-bold text-rose-200">Tóm tắt ván chơi</p>

            <div className="mt-3 hidden items-end justify-center gap-6 lg:[@media(min-height:860px)]:flex" aria-hidden="true">
              {([0, 1] as const).map((index) => (
                <div key={index} className="w-[4.5rem] text-center">
                  <OutfitFigure outfit={outfits[index]} compact />
                </div>
              ))}
            </div>

            <dl className="mt-1 divide-y divide-white/[0.08] text-sm">
              <div className="flex items-start justify-between gap-3 py-2">
                <dt className="w-20 shrink-0 text-[0.8125rem] text-neutral-300">Người chơi</dt>
                <dd className="min-w-0 flex-1 truncate text-white">
                  {p1Avatar} {p1Display} <span className="text-neutral-400">&amp;</span> {p2Avatar} {p2Display}
                </dd>
                {editLink(SECTION_IDS.players, 'người chơi')}
              </div>
              <div className="flex items-start justify-between gap-3 py-2">
                <dt className="w-20 shrink-0 text-[0.8125rem] text-neutral-300">Mức độ</dt>
                <dd className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1 text-white">
                  {selectedLevels.map((lvl) => (
                    <span key={lvl} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span className={`h-2 w-2 rounded-full ${LEVEL_TONE[lvl].dot}`} aria-hidden="true" />
                      {LEVEL_INFO[lvl].name}
                    </span>
                  ))}
                </dd>
                {editLink(SECTION_IDS.levels, 'mức độ')}
              </div>
              <div className="flex items-start justify-between gap-3 py-2">
                <dt className="w-20 shrink-0 text-[0.8125rem] text-neutral-300">Trang phục</dt>
                <dd className="min-w-0 flex-1 text-white">
                  {p1Display} {garmentCounts[0]} món · {p2Display} {garmentCounts[1]} món
                </dd>
                {editLink(SECTION_IDS.outfits, 'trang phục')}
              </div>
              <div className="flex items-start justify-between gap-3 py-2">
                <dt className="w-20 shrink-0 text-[0.8125rem] text-neutral-300">Tuỳ chọn</dt>
                <dd className="min-w-0 flex-1 space-y-0.5 text-[0.8125rem] leading-snug text-neutral-100">
                  <span className="block">{privacyDefault ? 'Che nội dung lá bài' : 'Không che nội dung'}</span>
                  <span className="block">{drawMode === 'random' ? 'Loại lá: ngẫu nhiên' : 'Loại lá: tự chọn'}</span>
                  <span className="block">{penaltyClothingEnabled ? 'Bỏ lá: hỏi cởi 1 món' : 'Bỏ lá: không hỏi phạt'}</span>
                </dd>
                {editLink(SECTION_IDS.options, 'tuỳ chọn')}
              </div>
            </dl>
            <p className="mt-2 flex items-center gap-1.5 text-[0.8125rem] text-neutral-300">
              <Clock3 className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              Khoảng 70 phút · dừng lúc nào cũng được
            </p>
          </div>

          <label
            ref={consentBoxRef}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition lg:shrink-0 ${
              consentConfirmed
                ? 'border-emerald-400/45 bg-emerald-500/[0.07]'
                : submitAttempted
                  ? 'setup-attention border-rose-400/80 bg-rose-500/[0.1]'
                  : 'border-rose-400/35 bg-rose-500/[0.05] hover:border-rose-400/55'
            }`}
          >
            <input
              ref={consentRef}
              type="checkbox"
              checked={consentConfirmed}
              onChange={(event) => setConsentConfirmed(event.target.checked)}
              aria-describedby="setup-consent-text"
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-rose-500"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                Xác nhận 18+ và đồng thuận
              </span>
              <span id="setup-consent-text" className="mt-1 block text-pretty text-[0.8125rem] leading-relaxed text-neutral-200">
                Cả hai đều là người trưởng thành, tự nguyện tham gia và đã thống nhất giới hạn cũng như từ dừng.
              </span>
            </span>
          </label>

          <div ref={ctaRef} className="space-y-1.5 lg:shrink-0">
            <motion.button
              whileHover={ready ? { scale: 1.015 } : undefined}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className={`btn-shine flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-gold-gradient py-3.5 text-lg font-semibold text-neutral-950 transition-all ${FOCUS_RING} ${
                ready ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_35px_rgba(255,107,157,0.55)]' : 'opacity-85 saturate-50'
              }`}
            >
              <Play className="h-5 w-5 fill-neutral-950" aria-hidden="true" />
              <span>Vào bàn chơi</span>
            </motion.button>
            <p className={`text-center text-[0.8125rem] ${ready ? 'text-neutral-300' : 'text-rose-200'}`} aria-live="polite">
              {ready ? 'Mọi thứ đã sẵn sàng.' : `Còn thiếu: ${missing.join(' và ')}.`}
            </p>
          </div>
        </aside>

        {/* Phones: keep the start action reachable while scrolling through the steps. */}
        {!ctaInView && (
          <div className="setup-start-bar fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#140d11]/92 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{p1Display} &amp; {p2Display}</p>
                <p className={`truncate text-xs ${ready ? 'text-neutral-300' : 'text-rose-200'}`}>
                  {ready ? `${selectedLevels.length} mức độ · ${garmentCounts[0] + garmentCounts[1]} món đồ` : `Còn thiếu: ${missing.join(' và ')}`}
                </p>
              </div>
              <button
                type="submit"
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-gold-gradient px-5 text-sm font-semibold text-neutral-950 ${FOCUS_RING}`}
              >
                <Play className="h-4 w-4 fill-neutral-950" aria-hidden="true" />
                {ready ? 'Vào ván' : 'Tiếp tục'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { EyeOff, Shuffle, Check, ArrowLeft, Play, ChevronDown, HelpCircle, Shirt, ShieldCheck } from 'lucide-react';
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

const StepHeading: React.FC<{ id: string; step: number; title: string; hint?: string }> = ({ id, step, title, hint }) => (
  <div className="mb-3 flex items-center gap-2.5">
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-500/20 text-[11px] font-bold text-rose-100 ring-1 ring-rose-400/40">{step}</span>
    <h3 id={id} className="text-sm font-semibold text-white">{title}</h3>
    {hint && <span className="text-[11px] text-neutral-500">· {hint}</span>}
  </div>
);

const OptionRow: React.FC<{ icon: React.ReactNode; title: string; description: string; children: React.ReactNode }> = ({ icon, title, description, children }) => (
  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs leading-relaxed text-neutral-400">{description}</div>
      </div>
    </div>
    <div className="self-end sm:self-auto">{children}</div>
  </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (value: boolean) => void; label: string; tone: string }> = ({ checked, onChange, label, tone }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`flex h-6 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-300 ${checked ? `${tone} justify-end` : 'justify-start bg-neutral-700'}`}
  >
    <span className="h-4 w-4 rounded-full bg-white shadow-md" />
  </button>
);

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
  tone: 'rose' | 'amber';
}

const AvatarPicker: React.FC<AvatarPickerProps> = ({ value, onChange, tone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toneClass = tone === 'rose'
    ? 'bg-rose-950/80 border-rose-500/40 hover:border-rose-300'
    : 'bg-amber-950/80 border-amber-500/40 hover:border-amber-300';

  return (
    <div className={`relative z-30 ${isOpen ? 'z-50' : ''}`}>
      <button
        type="button"
        aria-label="Chọn biểu tượng người chơi"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`interactive-box h-11 min-w-[66px] px-2.5 rounded-xl border flex items-center justify-between gap-2 text-xl cursor-pointer ${toneClass}`}
      >
        <span className="leading-none">{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="avatar-menu absolute left-0 top-[calc(100%+8px)] z-[80] grid grid-cols-4 gap-1.5 w-[190px] rounded-2xl border border-white/15 bg-[#171014]/98 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          {AVATAR_OPTIONS.map((avatar) => (
            <button
              key={avatar}
              type="button"
              aria-label={`Chọn ${avatar}`}
              onClick={() => {
                onChange(avatar);
                setIsOpen(false);
                soundEngine.playTick();
              }}
              className={`aspect-square rounded-xl text-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:bg-white/10 ${value === avatar ? 'bg-rose-500/20 ring-1 ring-rose-300/70' : 'bg-white/[0.035]'}`}
            >
              {avatar}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const SetupScreen: React.FC<SetupScreenProps> = ({
  initialPlayer1,
  initialPlayer2,
  initialSettings,
  coupleName,
  unlockedCount,
  onOpenAccountModal,
  onLogout,
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
  const [showOptions, setShowOptions] = useState(false);

  const toggleLevel = (lvl: CardLevel) => {
    soundEngine.playTick();
    if (selectedLevels.includes(lvl)) {
      if (selectedLevels.length > 1) {
        setSelectedLevels(selectedLevels.filter((l) => l !== lvl));
      }
    } else {
      setSelectedLevels([...selectedLevels, lvl]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentConfirmed) return;
    soundEngine.playCardFlip();
    const p1: Player = {
      name: p1Name.trim() || 'Người chơi 1',
      avatar: p1Avatar,
      color: '#FF6B9D',
      completedCount: 0,
      skippedCount: 0,
    };
    const p2: Player = {
      name: p2Name.trim() || 'Người chơi 2',
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

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-4 py-6 text-white">
      {/* Navigation Header */}
      <div className="mb-5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <h2 className="serif-title text-center text-lg sm:text-2xl font-bold text-[#D4AF37] uppercase tracking-wider">
          Thiết Lập Trò Chơi
        </h2>

        <div className="flex items-center gap-2">
          {coupleName && (
            <button
              type="button"
              onClick={onOpenAccountModal}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-xs text-emerald-200 hover:border-emerald-300 hover:text-white transition-colors cursor-pointer"
              title="Xem thông tin tài khoản & Đăng xuất"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="max-w-[120px] truncate">{coupleName}</span>
              {typeof unlockedCount === 'number' && (
                <span className="text-[11px] font-bold text-emerald-300">({unlockedCount})</span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenRules}
            aria-label="Cách chơi và luật phạt"
            title="Cách chơi & luật phạt"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-950/30 text-rose-300 transition-all hover:border-rose-400/55 hover:bg-rose-500/10 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <HelpCircle className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 pb-4">
        {/* STEP 1: Players */}
        <section className="glass-dark relative z-20 rounded-2xl border border-rose-500/20 p-4 shadow-xl sm:p-5" aria-labelledby="setup-step-players">
          <StepHeading id="setup-step-players" step={1} title="Hai người chơi" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {([
              { label: 'Người chơi 1', dot: 'bg-rose-400', avatar: p1Avatar, setAvatar: setP1Avatar, name: p1Name, setName: setP1Name, tone: 'rose' as const, focus: 'focus:border-rose-400' },
              { label: 'Người chơi 2', dot: 'bg-amber-400', avatar: p2Avatar, setAvatar: setP2Avatar, name: p2Name, setName: setP2Name, tone: 'amber' as const, focus: 'focus:border-amber-400' },
            ]).map((player) => (
              <div key={player.label} className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                  <span className={`h-1.5 w-1.5 rounded-full ${player.dot}`} />
                  {player.label}
                </span>
                <div className="flex items-center gap-2">
                  <AvatarPicker value={player.avatar} onChange={player.setAvatar} tone={player.tone} />
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => player.setName(e.target.value)}
                    placeholder="Nhập tên..."
                    aria-label={`Tên ${player.label.toLowerCase()}`}
                    maxLength={30}
                    required
                    className={`input-focus-glow min-h-11 w-full rounded-xl border border-neutral-700/60 bg-neutral-900/80 px-3.5 text-sm text-white transition-all duration-300 focus:outline-none ${player.focus}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* STEP 2: Levels */}
        <section className="glass-dark rounded-2xl border border-rose-500/20 p-4 shadow-xl sm:p-5" aria-labelledby="setup-step-levels">
          <StepHeading id="setup-step-levels" step={2} title="Mức độ lá bài" hint="Chọn một hoặc nhiều" />
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {(['gentle', 'intimate', 'passionate'] as CardLevel[]).map((lvl) => {
              const info = LEVEL_INFO[lvl];
              const isSelected = selectedLevels.includes(lvl);
              const selectedStyle = {
                gentle: 'border-rose-400/80 bg-rose-500/[0.12] shadow-[0_0_18px_rgba(255,107,157,0.18)]',
                intimate: 'border-sky-400/80 bg-sky-500/[0.1] shadow-[0_0_18px_rgba(96,165,250,0.18)]',
                passionate: 'border-amber-400/80 bg-amber-500/[0.1] shadow-[0_0_18px_rgba(212,175,55,0.2)]',
              }[lvl];
              const checkStyle = { gentle: 'bg-rose-400', intimate: 'bg-sky-400', passionate: 'bg-amber-400' }[lvl];
              return (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleLevel(lvl)}
                  title={info.description}
                  className={`relative flex min-h-[4.75rem] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition-all duration-200 sm:min-h-28 sm:items-start sm:px-4 sm:text-left ${
                    isSelected ? selectedStyle : 'border-neutral-800 bg-neutral-900/40 opacity-60 hover:opacity-100'
                  }`}
                >
                  {isSelected && (
                    <span className={`absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full ${checkStyle} text-neutral-950`}>
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  )}
                  <span className="text-xl leading-none">{info.icon}</span>
                  <span className="font-serif-romantic text-sm font-bold text-white sm:text-base">{info.name}</span>
                  <span className="hidden text-[11px] leading-relaxed text-neutral-400 sm:block">{info.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* STEP 3: Outfits (collapsed to a summary by default) */}
        <section className="glass-dark rounded-2xl border border-rose-500/20 p-4 shadow-xl sm:p-5" aria-labelledby="setup-step-outfits">
          <StepHeading id="setup-step-outfits" step={3} title="Trang phục ban đầu" hint="Không bắt buộc" />
          <div className="flex items-center gap-2 sm:gap-4">
            {([0, 1] as const).map((index) => (
              <div key={index} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/[0.03] px-2 py-1.5">
                <div className="w-11 shrink-0 sm:w-12">
                  <OutfitFigure outfit={outfits[index]} compact ariaLabel={`Trang phục của ${index === 0 ? p1Name || 'Người chơi 1' : p2Name || 'Người chơi 2'}`} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{(index === 0 ? p1Name : p2Name) || `Người chơi ${index + 1}`}</p>
                  <p className="text-[11px] text-neutral-400">{Object.keys(outfits[index].garments).length} món</p>
                  <p className="hidden truncate text-[10px] text-neutral-500 sm:block">{describeOutfit(outfits[index])}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            aria-expanded={showOutfitEditor}
            onClick={() => setShowOutfitEditor((open) => !open)}
            className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 text-xs font-semibold text-neutral-200 transition-colors hover:border-rose-300/35 hover:bg-white/[0.04]"
          >
            <Shirt className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />
            {showOutfitEditor ? 'Thu gọn' : 'Đổi số món, kiểu và màu'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOutfitEditor ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {showOutfitEditor && (
            <div className="mt-4 space-y-3">
              <p className="text-[11px] text-neutral-400">Nam tối đa 3 món, nữ tối đa 4 món. Có thể bắt đầu với bất kỳ số món nào, kể cả 0.</p>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5 sm:hidden" role="tablist" aria-label="Chọn nhân vật để chỉnh trang phục">
                {([0, 1] as const).map((index) => (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-selected={activeOutfitTab === index}
                    onClick={() => setActiveOutfitTab(index)}
                    className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${activeOutfitTab === index ? 'bg-rose-500/18 text-rose-100 ring-1 ring-rose-400/45' : 'text-neutral-400 hover:bg-white/[0.05] hover:text-white'}`}
                  >
                    {index === 0 ? p1Name || 'Người chơi 1' : p2Name || 'Người chơi 2'}
                  </button>
                ))}
              </div>
              <div className="sm:hidden">
                <OutfitConfigurator
                  value={outfits[activeOutfitTab]}
                  presentation={activeOutfitTab === 0 ? 'male' : 'female'}
                  label={activeOutfitTab === 0 ? p1Name || 'Người chơi 1' : p2Name || 'Người chơi 2'}
                  onChange={(next) => setOutfits((current) => activeOutfitTab === 0 ? [next, current[1]] : [current[0], next])}
                />
              </div>
              <div className="hidden gap-4 sm:grid sm:grid-cols-2">
                <OutfitConfigurator
                  value={outfits[0]}
                  presentation="male"
                  label={p1Name || 'Người chơi 1'}
                  onChange={(next) => setOutfits((current) => [next, current[1]])}
                />
                <OutfitConfigurator
                  value={outfits[1]}
                  presentation="female"
                  label={p2Name || 'Người chơi 2'}
                  onChange={(next) => setOutfits((current) => [current[0], next])}
                />
              </div>
            </div>
          )}
        </section>

        {/* STEP 4: Extra options (collapsed by default) */}
        <section className="glass-dark rounded-2xl border border-rose-500/20 p-4 shadow-xl sm:p-5" aria-labelledby="setup-step-options">
          <StepHeading id="setup-step-options" step={4} title="Tuỳ chọn thêm" hint="Không bắt buộc" />
          <button
            type="button"
            aria-expanded={showOptions}
            onClick={() => setShowOptions((open) => !open)}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
          >
            <span className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-neutral-300">Che nội dung: <strong className="text-white">{privacyDefault ? 'Bật' : 'Tắt'}</strong></span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-neutral-300">Loại bài: <strong className="text-white">{drawMode === 'random' ? 'Ngẫu nhiên' : 'Tự chọn'}</strong></span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-neutral-300">Phạt cởi đồ: <strong className="text-white">{penaltyClothingEnabled ? 'Bật' : 'Tắt'}</strong></span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${showOptions ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {showOptions && (
            <div className="mt-3 space-y-4 px-1">
              <OptionRow
                icon={<EyeOff className="h-5 w-5 text-amber-400" />}
                title="Che nội dung lá bài"
                description={'Lá bài úp cho tới khi người chơi bấm "Xem nội dung".'}
              >
                <ToggleSwitch checked={privacyDefault} onChange={setPrivacyDefault} label="Che nội dung lá bài" tone="bg-amber-500" />
              </OptionRow>
              <OptionRow
                icon={<Shuffle className="h-5 w-5 text-rose-400" />}
                title="Chọn Sự thật hay Thử thách"
                description="Để game tự chọn, hoặc người chơi tự chọn trước mỗi lượt."
              >
                <div className="flex shrink-0 gap-1.5">
                  {(['random', 'choose'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={drawMode === mode}
                      onClick={() => setDrawMode(mode)}
                      className={`min-h-9 rounded-xl px-3 text-xs font-medium transition-all ${drawMode === mode ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
                    >
                      {mode === 'random' ? 'Ngẫu nhiên' : 'Tự chọn'}
                    </button>
                  ))}
                </div>
              </OptionRow>
              <OptionRow
                icon={<Shirt className="h-5 w-5 text-rose-400" />}
                title="Bỏ lượt thì cởi 1 món"
                description="Khi bỏ qua lá bài, người đó tự chọn một món của mình để cởi."
              >
                <ToggleSwitch checked={penaltyClothingEnabled} onChange={setPenaltyClothingEnabled} label="Bỏ lượt thì cởi 1 món" tone="bg-rose-500" />
              </OptionRow>
            </div>
          )}
        </section>

        <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 transition ${consentConfirmed ? 'border-emerald-400/45 bg-emerald-500/[0.07]' : 'border-rose-400/35 bg-rose-500/[0.06] hover:border-rose-400/55'}`}>
          <input
            type="checkbox"
            checked={consentConfirmed}
            onChange={(event) => setConsentConfirmed(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-rose-500"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Xác nhận 18+ và đồng thuận
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-neutral-400">
              Chúng tôi đều là người trưởng thành, tự nguyện tham gia và đã thống nhất giới hạn cũng như từ dừng.
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <motion.button
            whileHover={consentConfirmed ? { scale: 1.02 } : undefined}
            whileTap={consentConfirmed ? { scale: 0.98 } : undefined}
            type="submit"
            disabled={!consentConfirmed}
            aria-disabled={!consentConfirmed}
            className="btn-shine flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-gold-gradient py-4 text-lg font-semibold text-neutral-950 shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all hover:shadow-[0_0_35px_rgba(255,107,157,0.6)] disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale"
          >
            <Play className="h-5 w-5 fill-neutral-950" />
            <span>Vào Bàn Chơi Ngay</span>
          </motion.button>
          <p className="text-center text-[11px] text-neutral-500" aria-live="polite">
            {consentConfirmed
              ? 'Một ván khoảng 70 phút · có thể dừng bất cứ lúc nào.'
              : 'Đánh dấu ô xác nhận 18+ ở trên để bắt đầu.'}
          </p>
        </div>
      </form>
    </div>
  );
};

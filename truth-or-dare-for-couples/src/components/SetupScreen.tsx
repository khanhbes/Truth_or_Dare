import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, User, EyeOff, Shuffle, Check, ArrowLeft, Play, ChevronDown, HelpCircle, Shirt, ShieldCheck, LogOut } from 'lucide-react';
import { CardLevel, GameSettings, OutfitConfig, Player } from '../types';
import { LEVEL_INFO } from '../data/cards';
import { soundEngine } from '../utils/audio';
import { OutfitConfigurator } from './OutfitConfigurator';

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
    <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 text-white">
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-2 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <h2 className="serif-title text-center text-lg sm:text-2xl font-bold text-[#D4AF37] uppercase tracking-wider">
          Thiết Lập Trò Chơi
        </h2>

        <div className="flex items-center gap-2">
          {coupleName && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-950/50 px-2.5 py-1 text-xs text-rose-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <button
                type="button"
                onClick={onOpenAccountModal}
                className="max-w-[120px] truncate hover:text-white"
                title="Quản lý tài khoản"
              >
                {coupleName}
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 text-[11px] text-rose-300 hover:text-white underline"
                  title="Đăng xuất"
                >
                  Đăng xuất
                </button>
              )}
            </div>
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: Player Names */}
        <div className="interactive-box glass-dark rounded-2xl p-5 border border-rose-500/20 shadow-xl space-y-4 relative z-20">
          <h3 className="text-sm uppercase tracking-wider text-rose-300 font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-rose-400" />
            <span>Tên 2 Người Chơi</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Player 1 */}
            <div className="space-y-2">
              <label className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                Người chơi 1
              </label>
              <div className="flex items-center gap-2">
                <AvatarPicker value={p1Avatar} onChange={setP1Avatar} tone="rose" />
                <input
                  type="text"
                  value={p1Name}
                  onChange={(e) => setP1Name(e.target.value)}
                  placeholder="Nhập tên..."
                  required
                  className="input-shimmer input-focus-glow w-full bg-neutral-900/80 border border-neutral-700/60 focus:border-rose-400 focus:outline-none rounded-xl px-3.5 py-2 text-sm text-white transition-all duration-300"
                />
              </div>
            </div>

            {/* Player 2 */}
            <div className="space-y-2">
              <label className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Người chơi 2
              </label>
              <div className="flex items-center gap-2">
                <AvatarPicker value={p2Avatar} onChange={setP2Avatar} tone="amber" />
                <input
                  type="text"
                  value={p2Name}
                  onChange={(e) => setP2Name(e.target.value)}
                  placeholder="Nhập tên..."
                  required
                  className="input-shimmer input-focus-glow w-full bg-neutral-900/80 border border-neutral-700/60 focus:border-amber-400 focus:outline-none rounded-xl px-3.5 py-2 text-sm text-white transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Initial layered outfits */}
        <section className="space-y-4" aria-labelledby="outfit-settings-title">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 id="outfit-settings-title" className="text-sm uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-2">
                <Shirt className="h-4 w-4 text-rose-400" />
                Trang Phục Ban Đầu
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                Tự chọn số món, kiểu và màu. Có thể bắt đầu với bất kỳ cấu hình nào, kể cả 0 món.
              </p>
            </div>
            <p className="text-[11px] text-rose-200/70">Nam tối đa 3 · Nữ tối đa 4 món</p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5 sm:hidden" role="tablist" aria-label="Chọn nhân vật để chỉnh trang phục">
            {([0, 1] as const).map((index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={activeOutfitTab === index}
                onClick={() => setActiveOutfitTab(index)}
                className={`min-h-12 rounded-xl px-3 text-sm font-semibold transition ${activeOutfitTab === index ? 'bg-rose-500/18 text-rose-100 ring-1 ring-rose-400/45' : 'text-neutral-400 hover:bg-white/[0.05] hover:text-white'}`}
              >
                {index === 0 ? `👨 ${p1Name || 'Người chơi 1'}` : `👩 ${p2Name || 'Người chơi 2'}`}
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
        </section>

        {/* SECTION 3: Select Card Levels */}
        <div className="space-y-3">
          <label className="text-sm uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            <span>Chọn Cấp Độ Thách</span>
            <span className="text-xs font-normal text-neutral-400">(Có thể chọn nhiều cấp độ)</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['gentle', 'intimate', 'passionate'] as CardLevel[]).map((lvl) => {
              const info = LEVEL_INFO[lvl];
              const isSelected = selectedLevels.includes(lvl);
              const selectedStyle = {
                gentle: 'bg-gradient-to-b from-rose-950/60 to-neutral-900/90 border-rose-400/90 shadow-[0_0_20px_rgba(255,107,157,0.22)]',
                intimate: 'bg-gradient-to-b from-blue-950/60 to-neutral-900/90 border-blue-400/90 shadow-[0_0_20px_rgba(96,165,250,0.22)]',
                passionate: 'bg-gradient-to-b from-amber-950/60 to-neutral-900/90 border-amber-400/90 shadow-[0_0_20px_rgba(212,175,55,0.25)]',
              }[lvl];
              const checkStyle = {
                gentle: 'bg-rose-400',
                intimate: 'bg-blue-400',
                passionate: 'bg-amber-400',
              }[lvl];

              return (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleLevel(lvl)}
                  className={`interactive-box relative min-h-36 w-full cursor-pointer rounded-2xl p-4 border text-left transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? selectedStyle
                      : 'bg-neutral-900/40 border-neutral-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  {isSelected && (
                    <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full ${checkStyle} text-neutral-950 flex items-center justify-center text-xs font-bold`}>
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}

                  <div>
                    <div className="text-2xl mb-1">{info.icon}</div>
                    <div className="font-serif-romantic font-bold text-lg text-white mb-1">
                      {info.name}
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {info.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: Additional Options */}
        <div className="interactive-box glass-dark rounded-2xl p-5 border border-rose-500/20 shadow-xl space-y-5">
          <h3 className="text-sm uppercase tracking-wider text-amber-300 font-semibold">
            Tùy Chỉnh Lượt Chơi & Bảo Mật
          </h3>

          {/* Journey is the single game mode. */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-3.5 py-3">
            <Heart className="mt-0.5 h-5 w-5 shrink-0 fill-rose-400/20 text-rose-300" aria-hidden="true" />
            <div>
              <div className="text-sm font-medium text-white">Hành trình thân mật · 0–100%</div>
              <div className="mt-0.5 text-xs leading-relaxed text-neutral-400">
                Lá bài tăng dần từ 1 đến 5 sao. Ván kết thúc sau khi hai bạn mở lá hiếm cuối hành trình.
              </div>
            </div>
          </div>

          {/* Privacy Default Toggle */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <EyeOff className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-medium text-white">Chế độ bảo mật câu hỏi</div>
                <div className="text-xs text-neutral-400">
                  Che nội dung lá bài cho tới khi người chơi bấm "Xem nội dung"
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={privacyDefault}
              aria-label="Che nội dung thẻ theo mặc định"
              onClick={() => setPrivacyDefault(!privacyDefault)}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${
                privacyDefault ? 'bg-amber-500 justify-end' : 'bg-neutral-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Draw Mode: Choose vs Random */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <Shuffle className="w-5 h-5 text-rose-400" />
              <div>
                <div className="text-sm font-medium text-white">Cách chọn thể loại bài</div>
                <div className="text-xs text-neutral-400">Chọn trước Sự Thật/Thách hay để hệ thống ngẫu nhiên</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawMode('random')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  drawMode === 'random'
                    ? 'bg-rose-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Ngẫu nhiên cả hai
              </button>
              <button
                type="button"
                onClick={() => setDrawMode('choose')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  drawMode === 'choose'
                    ? 'bg-rose-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Tự chọn trước
              </button>
            </div>
          </div>

          {/* Clothing penalty toggle */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Shirt className="w-5 h-5 text-rose-400" />
              <div>
                <div className="text-sm font-medium text-white">Luật phạt cởi 1 món</div>
                <div className="text-xs text-neutral-400">
                  Khi bỏ lượt, người đang chơi chọn một món của chính mình để bỏ
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={penaltyClothingEnabled}
              aria-label="Bật luật phạt cởi một món"
              onClick={() => setPenaltyClothingEnabled((enabled) => !enabled)}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${penaltyClothingEnabled ? 'bg-rose-500 justify-end' : 'bg-neutral-700 justify-start'}`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

        <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 transition ${consentConfirmed ? 'border-emerald-400/45 bg-emerald-500/[0.07]' : 'border-rose-400/25 bg-rose-500/[0.045] hover:border-rose-400/45'}`}>
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

        {/* Start Game Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={!consentConfirmed}
          aria-disabled={!consentConfirmed}
          title={!consentConfirmed ? 'Hãy xác nhận 18+ và đồng thuận trước khi bắt đầu' : undefined}
          className="w-full py-4 rounded-full font-semibold text-lg text-neutral-950 bg-gold-gradient shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_35px_rgba(255,107,157,0.6)] transition-all cursor-pointer flex items-center justify-center gap-3 disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale"
        >
          <Play className="w-5 h-5 fill-neutral-950" />
          <span>Vào Bàn Chơi Ngay</span>
        </motion.button>
      </form>
    </div>
  );
};

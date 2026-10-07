import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Heart,
  Flame,
  Sparkles,
  Volume2,
  VolumeX,
  BookOpen,
  Play,
  HelpCircle,
  Code2,
  LogOut,
  LogIn,
  ShieldCheck,
  User,
} from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface IntroScreenProps {
  mode: 'player' | 'developer';
  coupleName?: string;
  unlockedCount?: number;
  onLogout?: () => void;
  onOpenLogin?: () => void;
  onOpenAccountModal?: () => void;
  onQuickLoginKhanh?: () => void;
  onStart: () => void;
  onOpenCollection: () => void;
  onOpenRules: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({
  mode,
  coupleName,
  unlockedCount,
  onLogout,
  onOpenLogin,
  onOpenAccountModal,
  onQuickLoginKhanh,
  onStart,
  onOpenCollection,
  onOpenRules,
}) => {
  const [isMusicOn, setIsMusicOn] = useState(soundEngine.isMusicOn());

  const handleToggleMusic = () => {
    const newState = soundEngine.toggleBackgroundMusic();
    setIsMusicOn(newState);
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-between min-h-[90vh] px-4 py-8 max-w-4xl mx-auto text-center">
      {/* Top Header Bar with Music & Collection & Account controls */}
      <div className="w-full px-2 py-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Music Toggle */}
          <button
            onClick={handleToggleMusic}
            className="flex min-h-11 items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/40 px-3 text-xs text-rose-200 transition-all duration-300 hover:border-rose-400 md:text-sm"
          >
            {isMusicOn ? <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
            <span>{isMusicOn ? 'Nhạc: Bật' : 'Nhạc: Tắt'}</span>
          </button>

          {/* Account Pill in Top Header */}
          {coupleName ? (
            <div className="flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-950/70 px-3.5 py-1.5 text-xs text-rose-100 shadow-md">
              <button
                type="button"
                onClick={onOpenAccountModal}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                title="Xem chi tiết tài khoản"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-semibold max-w-[140px] sm:max-w-[200px] truncate">{coupleName}</span>
                {typeof unlockedCount === 'number' && (
                  <span className="text-[11px] text-amber-300 font-medium">({unlockedCount} bài)</span>
                )}
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1.5 flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-200 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                  title="Đăng xuất khỏi tài khoản này"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex min-h-11 items-center gap-2 rounded-full border border-rose-400/50 bg-gradient-to-r from-rose-900/60 to-pink-900/60 px-4 py-1.5 text-xs font-bold text-rose-100 transition-all hover:scale-105 hover:border-rose-300 hover:text-white shadow-lg cursor-pointer"
              >
                <LogIn className="h-4 w-4 text-amber-300" />
                <span>Đăng nhập / Tài khoản</span>
              </button>
            </div>
          )}

          {/* Card Collection Button */}
          <button
            onClick={onOpenCollection}
            className="flex min-h-11 items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 text-xs text-amber-200 transition-all duration-300 hover:border-amber-400 md:text-sm cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden min-[370px]:inline">Bộ sưu tập thẻ</span>
          </button>
        </div>

        {/* Prominent Account Status Banner */}
        {coupleName ? (
          <div className="mx-auto mt-3 flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-200 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2.5 truncate">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="truncate">
                Tài khoản: <strong className="text-white">{coupleName}</strong>
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 shrink-0">
                {unlockedCount ?? 0} thẻ đã lưu
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenAccountModal}
                className="text-[11px] font-semibold text-emerald-300 hover:text-white underline cursor-pointer"
              >
                Chi tiết
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1 rounded-xl border border-rose-400/40 bg-rose-950/80 px-2.5 py-1 text-[11px] font-bold text-rose-200 hover:bg-rose-700 hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  Đăng xuất
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-3 flex w-full max-w-xl flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-100 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2.5 text-left">
              <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
              <div>
                <p className="font-semibold text-white">Chưa lưu thẻ vào tài khoản</p>
                <p className="text-[11px] text-rose-200/70">
                  Đăng nhập để tự động lưu thẻ đã mở và đồng bộ trên mọi thiết bị
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onQuickLoginKhanh && (
                <button
                  type="button"
                  onClick={onQuickLoginKhanh}
                  className="rounded-xl border border-amber-400/40 bg-amber-500/25 px-3 py-1.5 font-bold text-amber-200 hover:bg-amber-500/40 hover:border-amber-300 transition-all text-xs cursor-pointer"
                >
                  Lưu vào khanhnhim…
                </button>
              )}
              <button
                type="button"
                onClick={onOpenLogin}
                className="rounded-xl border border-rose-400/40 bg-rose-600/70 px-3 py-1.5 font-bold text-white hover:bg-rose-600 transition-all text-xs cursor-pointer"
              >
                Đăng nhập
              </button>
            </div>
          </div>
        )}

        {mode === 'developer' && (
          <div className="mx-auto mt-3 flex w-full max-w-xs items-center justify-between rounded-full border border-amber-300/20 bg-black/25 px-3 py-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-100"><Code2 className="h-3.5 w-3.5" /> Quản trị nội dung</span>
            <a href="/" className="rounded-full px-2 py-1 text-neutral-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">Xem trang chơi</a>
          </div>
        )}
      </div>

      {/* Main Center Intro Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center my-auto py-8"
      >
        {/* Animated Candle Flame Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-500/20 via-rose-500/10 to-transparent flex items-center justify-center animate-candle-glow">
            <Flame className="w-10 h-10 text-amber-400 drop-shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
          </div>
          <Sparkles className="w-5 h-5 text-rose-300 absolute -top-1 -right-1 animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="serif-title text-5xl sm:text-7xl md:text-8xl font-bold tracking-widest text-[#D4AF37] uppercase mb-3 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
          Truth or Dare
        </h1>
        <p className="serif-title text-xl sm:text-2xl text-[#FF6B9D] pink-glow italic font-medium mb-4">
          Dành Cho Cặp Đôi • Sự Thật Hay Thách
        </p>

        <p className="text-neutral-300 max-w-lg text-sm sm:text-base leading-relaxed font-light mb-8">
          {mode === 'player'
            ? 'Khám phá từng lá bài qua những câu hỏi gắn kết và thử thách dành riêng cho hai người.'
            : 'Quản lý toàn bộ nội dung, xem trước thẻ khóa và chỉnh sửa bộ bài dành cho người chơi.'}
        </p>

        {/* Level Badges Preview */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
            <span>🌸</span>
            <span>Nhẹ nhàng</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/50 border border-amber-500/30 text-amber-300 text-xs sm:text-sm">
            <span>🔥</span>
            <span>Thân mật</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/50 border border-red-500/40 text-red-300 text-xs sm:text-sm">
            <span>💋</span>
            <span>Nồng nhiệt</span>
          </div>
        </div>

        {/* Big Action Play Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            soundEngine.playCardFlip();
            onStart();
          }}
          className="relative group px-10 py-4 rounded-full font-medium text-base sm:text-lg text-neutral-900 bg-gold-gradient shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_35px_rgba(255,107,157,0.6)] transition-all duration-300 flex items-center gap-3 cursor-pointer"
        >
          {mode === 'player' ? <Play className="w-5 h-5 fill-neutral-900" /> : <Code2 className="h-5 w-5" />}
          <span className="font-semibold tracking-wide">{mode === 'player' ? 'Bắt Đầu Chơi' : 'Mở Trình Quản Lý'}</span>
          <Heart className="w-5 h-5 text-rose-900 fill-rose-900 group-hover:scale-125 transition-transform" />
        </motion.button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playTick();
            onOpenRules();
          }}
          className="mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-neutral-300 transition-all hover:bg-white/[0.04] hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 text-rose-300" />
          <span>Cách chơi & luật phạt</span>
        </button>
      </motion.div>

      {/* Footer tagline */}
      <div className="text-xs text-neutral-500 font-light flex items-center gap-1">
        <span>Thiết kế dành riêng cho 2 người</span>
        <span className="text-rose-500">♥</span>
        <span>Giữ trọn cảm xúc ngọt ngào</span>
      </div>
    </div>
  );
};

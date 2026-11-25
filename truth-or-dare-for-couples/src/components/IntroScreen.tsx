import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BookHeart,
  BookOpen,
  Code2,
  Flame,
  Heart,
  HelpCircle,
  LogIn,
  Play,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { CardLevel } from '../types';
import { LEVEL_INFO } from '../data/cards';
import { soundEngine } from '../utils/audio';
import { EASE_OUT } from '../utils/motionTokens';
import type { SavedGameSession } from '../utils/gameSession';
import { AdminModeButton } from './AdminModeButton';
import { ConfirmDialog } from './ConfirmDialog';

interface IntroScreenProps {
  mode: 'player' | 'developer';
  coupleName?: string;
  unlockedCount?: number;
  onOpenLogin?: () => void;
  onOpenAccountModal?: () => void;
  onStart: () => void;
  onOpenCollection: () => void;
  onOpenRules: () => void;
  /** An unfinished game kept on this device. */
  savedGame?: SavedGameSession | null;
  onResume?: () => void;
  onDiscardSavedGame?: () => void;
  /** Evenings the couple kept on this device. */
  journalCount?: number;
  onOpenJournal?: () => void;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200';
const LEVELS: CardLevel[] = ['gentle', 'intimate', 'passionate'];

export const IntroScreen: React.FC<IntroScreenProps> = ({
  mode,
  coupleName,
  unlockedCount,
  onOpenLogin,
  onOpenAccountModal,
  onStart,
  onOpenCollection,
  onOpenRules,
  savedGame = null,
  onResume,
  onDiscardSavedGame,
  journalCount = 0,
  onOpenJournal,
}) => {
  const reduceMotion = useReducedMotion();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(soundEngine.isMusicOn());
  const isPlayer = mode === 'player';

  const handleToggleMusic = () => setIsMusicOn(soundEngine.toggleBackgroundMusic());

  return (
    <div className="intro-screen">
      <header className="w-full">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleToggleMusic}
            aria-pressed={isMusicOn}
            aria-label={isMusicOn ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-rose-400/35 bg-rose-950/50 px-3 text-sm text-rose-100 transition-colors hover:border-rose-300 ${FOCUS}`}
          >
            {isMusicOn ? <Volume2 className="h-4 w-4 text-amber-300" aria-hidden="true" /> : <VolumeX className="h-4 w-4 text-neutral-300" aria-hidden="true" />}
            <span className="hidden sm:inline">{isMusicOn ? 'Nhạc: bật' : 'Nhạc: tắt'}</span>
          </button>

          {coupleName ? (
            <button
              type="button"
              onClick={onOpenAccountModal}
              title="Tài khoản của hai bạn"
              className={`flex min-h-11 min-w-0 items-center gap-2 rounded-full border border-emerald-400/45 bg-emerald-950/70 px-3 text-sm font-semibold text-emerald-100 transition-colors hover:border-emerald-300 sm:px-4 ${FOCUS}`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <span className="min-w-0 max-w-[84px] truncate text-white min-[400px]:max-w-[130px] sm:max-w-[200px]">{coupleName}</span>
              {typeof unlockedCount === 'number' && (
                <span className="whitespace-nowrap rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-200">
                  {unlockedCount} lá
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className={`flex min-h-11 items-center gap-2 rounded-full border border-rose-300/50 bg-gradient-to-r from-rose-900/70 to-pink-900/70 px-4 text-sm font-semibold text-rose-50 transition-colors hover:border-rose-200 ${FOCUS}`}
            >
              <LogIn className="h-4 w-4 text-amber-200" aria-hidden="true" />
              <span>Đăng nhập</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCollection}
            className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-amber-400/35 bg-amber-950/50 px-3 text-sm text-amber-100 transition-colors hover:border-amber-300 ${FOCUS}`}
          >
            <BookOpen className="h-4 w-4 text-amber-300" aria-hidden="true" />
            <span className="hidden min-[340px]:inline">Bộ sưu tập</span>
          </button>
        </div>

        {!isPlayer && (
          <div className="mx-auto mt-3 flex w-full max-w-xs items-center justify-between rounded-full border border-amber-300/25 bg-black/25 px-3 py-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-100"><Code2 className="h-3.5 w-3.5" aria-hidden="true" /> Quản trị nội dung</span>
            <a href="/" className={`rounded-full px-2 py-1 text-neutral-300 transition-colors hover:text-white ${FOCUS}`}>Xem trang chơi</a>
          </div>
        )}
      </header>

      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(14px) scale(0.94)' }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px) scale(1)' }}
        transition={{ duration: reduceMotion ? 0.12 : 0.7, ease: EASE_OUT }}
        className="intro-screen__main"
        data-saved-game={savedGame ? 'true' : undefined}
      >
        <div className="intro-screen__candle" aria-hidden="true">
          <div className="grid h-full w-full place-items-center rounded-full bg-gradient-to-b from-amber-500/20 via-rose-500/10 to-transparent animate-candle-glow">
            <Flame className="h-1/2 w-1/2 text-amber-300" />
          </div>
          <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-rose-300 animate-pulse" />
        </div>

        <h1 className="intro-screen__title title-shimmer serif-title">Truth or Dare</h1>
        <p className="intro-screen__tagline serif-title">Dành cho cặp đôi · Sự thật hay thử thách</p>

        <p className="intro-screen__lead">
          {isPlayer
            ? 'Khám phá từng lá bài qua những câu hỏi gắn kết và thử thách dành riêng cho hai người.'
            : 'Quản lý toàn bộ nội dung, xem trước thẻ khóa và chỉnh sửa bộ bài dành cho người chơi.'}
        </p>

        <ul className="intro-screen__levels" aria-label="Ba cấp độ">
          {LEVELS.map((level) => (
            <li key={level} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${LEVEL_INFO[level].badgeBg}`}>
              <span aria-hidden="true">{LEVEL_INFO[level].icon}</span>
              <span>{LEVEL_INFO[level].name}</span>
            </li>
          ))}
        </ul>

        {savedGame ? (
          <section aria-label="Ván đang chơi dở" className="w-full max-w-sm rounded-3xl border border-amber-200/30 bg-[#170d12]/90 p-5">
            <p className="text-sm font-semibold text-amber-100">Ván đang chơi dở</p>
            <p className="mt-1 text-base text-neutral-100">
              {savedGame.player1.avatar} {savedGame.player1.name} & {savedGame.player2.name} {savedGame.player2.avatar}
            </p>
            <p className="mt-1 text-sm tabular-nums text-neutral-300">
              Lượt {savedGame.currentRound}
              {' · '}
              {savedGame.journeyPhase === 'standard' || savedGame.journeyPhase === 'position_consent'
                ? `Tim Hồng ${savedGame.intimacyPercent}%`
                : `Bộ Tư thế ${savedGame.luxuryIntimacyPercent}%`}
              {' · '}
              lưu lúc {new Date(savedGame.savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => {
                soundEngine.playCardFlip();
                onResume?.();
              }}
              className={`btn-shine mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 text-base font-semibold text-neutral-900 shadow-[0_0_25px_rgba(212,175,55,0.4)] ${FOCUS}`}
            >
              <Play className="h-5 w-5 fill-neutral-900" aria-hidden="true" />
              Tiếp tục ván
            </motion.button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onStart}
                className={`min-h-11 rounded-full border border-white/20 bg-white/[0.05] px-3 text-sm font-medium text-neutral-100 transition-colors hover:border-white/40 ${FOCUS}`}
              >
                Chơi ván mới
              </button>
              <button
                type="button"
                onClick={() => setConfirmDiscard(true)}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm text-neutral-300 transition-colors hover:text-rose-200 ${FOCUS}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Bỏ ván này
              </button>
            </div>
            <p className="mt-2 text-xs text-neutral-300">Ván mới sẽ thay ván đang lưu khi hai bạn vào bàn.</p>
          </section>
        ) : (
          <motion.button
            type="button"
            whileHover={reduceMotion ? undefined : { scale: 1.04 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            onClick={() => {
              soundEngine.playCardFlip();
              onStart();
            }}
            className={`btn-shine group flex min-h-14 items-center gap-3 rounded-full bg-gold-gradient px-10 text-lg font-semibold text-neutral-900 shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-shadow duration-300 hover:shadow-[0_0_35px_rgba(255,107,157,0.6)] ${FOCUS}`}
          >
            {isPlayer ? <Play className="h-5 w-5 fill-neutral-900" aria-hidden="true" /> : <Code2 className="h-5 w-5" aria-hidden="true" />}
            <span>{isPlayer ? 'Bắt đầu chơi' : 'Mở trình quản lý'}</span>
            <Heart className="h-5 w-5 fill-rose-900 text-rose-900" aria-hidden="true" />
          </motion.button>
        )}

        {confirmDiscard && (
          <ConfirmDialog
            icon={<Trash2 className="h-5 w-5" />}
            title="Bỏ ván đang lưu?"
            description="Ván này sẽ bị xóa khỏi máy. Lá đã mở vẫn được giữ."
            confirmLabel="Bỏ ván"
            cancelLabel="Giữ lại"
            onCancel={() => setConfirmDiscard(false)}
            onConfirm={() => {
              setConfirmDiscard(false);
              onDiscardSavedGame?.();
            }}
          />
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTick();
              onOpenRules();
            }}
            className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/[0.05] hover:text-rose-100 ${FOCUS}`}
          >
            <HelpCircle className="h-4 w-4 text-rose-300" aria-hidden="true" />
            <span>Cách chơi & luật phạt</span>
          </button>
          {isPlayer && journalCount > 0 && (
            <button
              type="button"
              data-action="journal"
              onClick={() => {
                soundEngine.playTick();
                onOpenJournal?.();
              }}
              className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/[0.05] hover:text-rose-100 ${FOCUS}`}
            >
              <BookHeart className="h-4 w-4 text-amber-200" aria-hidden="true" />
              <span>Nhật ký · {journalCount}</span>
            </button>
          )}
        </div>
      </motion.div>

      <footer className="intro-screen__footer">
        {isPlayer && (
          <p className="text-sm text-neutral-300">
            <strong className="font-semibold text-rose-200">18+</strong> · Dành cho hai người lớn, tự nguyện, dừng lúc nào cũng được.
          </p>
        )}
        {isPlayer && <AdminModeButton />}
      </footer>
    </div>
  );
};

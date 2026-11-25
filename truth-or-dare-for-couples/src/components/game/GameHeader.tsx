import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  BookOpen,
  Ellipsis,
  Flag,
  Flame,
  Heart,
  HelpCircle,
  Info,
  Pause,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { JourneyPhase, Player, PlayerIndex } from '../../types';
import {
  DIFFICULTY_STARS,
  POSITION_DIFFICULTY_STARS,
  type JourneyDrawProbabilities,
  type LuxuryDrawProbabilities,
} from '../../utils/progression';
import { DURATION, EASE_OUT } from '../../utils/motionTokens';
import { FOCUS_RING } from './tableStyles';

interface GameHeaderProps {
  player: Player;
  playerIndex: PlayerIndex;
  round: number;
  targetRounds: number | null;
  journeyPhase: JourneyPhase;
  intimacyPercent: number;
  luxuryPercent: number;
  heatLevel: number;
  /** True while the odds belong to the card already on the table. */
  oddsAreForOpenCard: boolean;
  drawProbabilities: JourneyDrawProbabilities;
  luxuryProbabilities: LuxuryDrawProbabilities | null;
  difficultyBoostActive: boolean;
  locked: boolean;
  isMuted: boolean;
  coupleName?: string;
  reduceMotion: boolean;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onOpenCollection: () => void;
  onOpenSummary: () => void;
  onOpenAccount?: () => void;
  onPause: () => void;
  onEnd: () => void;
}

const chance = (value: number) => `${Math.round(value * 100)}%`;

const ICON_BUTTON = `game-tip relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-neutral-200 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 lg:h-10 lg:w-10 ${FOCUS_RING}`;

/** Closes a popover on an outside press or Escape. */
const useDismiss = (open: boolean, close: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) closeRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);
  return ref;
};

/** Turn, journey progress, heat and tools in one bar. */
export const GameHeader: React.FC<GameHeaderProps> = ({
  player,
  playerIndex,
  round,
  targetRounds,
  journeyPhase,
  intimacyPercent,
  luxuryPercent,
  heatLevel,
  oddsAreForOpenCard,
  drawProbabilities,
  luxuryProbabilities,
  difficultyBoostActive,
  locked,
  isMuted,
  coupleName,
  reduceMotion,
  onToggleMute,
  onOpenRules,
  onOpenCollection,
  onOpenSummary,
  onOpenAccount,
  onPause,
  onEnd,
}) => {
  const [showOdds, setShowOdds] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const oddsRef = useDismiss(showOdds, () => setShowOdds(false));
  const menuRef = useDismiss(showMenu, () => setShowMenu(false));

  const standard = journeyPhase === 'standard' || journeyPhase === 'position_consent';
  // While the couple decides about the Position deck, the next card is already one of its cards.
  const standardOdds = journeyPhase === 'standard';
  const percent = standard ? intimacyPercent : luxuryPercent;
  const previousRef = useRef({ percent, standard });
  const [gain, setGain] = useState<{ id: number; amount: number } | null>(null);
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { percent, standard };
    const amount = percent - previous.percent;
    if (amount <= 0 || previous.standard !== standard) {
      // The old label's timer was cancelled with the last effect: take it away here.
      setGain(null);
      return;
    }
    const id = Date.now();
    setGain({ id, amount });
    const timeout = window.setTimeout(() => setGain((current) => (current?.id === id ? null : current)), 1600);
    return () => window.clearTimeout(timeout);
  }, [percent, standard]);

  const progressHint = !standard
    ? percent >= 100 ? 'đã đầy, tới lá cuối' : 'đầy thì tới lá cuối'
    : journeyPhase === 'position_consent'
      ? 'đã đầy'
      : percent >= 100 ? 'cởi nốt đồ để mở Bộ Tư thế' : 'đầy thì mở Bộ Tư thế';
  const finalChance = luxuryProbabilities?.finalCardChance ?? 0;
  const menuItems = [
    { label: 'Tạm dừng', icon: Pause, tone: 'text-sky-200', onSelect: onPause },
    { label: 'Bộ sưu tập', icon: BookOpen, tone: 'text-amber-200', onSelect: onOpenCollection },
    { label: 'Thống kê ván', icon: BarChart3, tone: 'text-rose-200', onSelect: onOpenSummary },
    ...(onOpenAccount
      ? [{ label: coupleName ? `Tài khoản · ${coupleName}` : 'Tài khoản', icon: ShieldCheck, tone: 'text-emerald-300', onSelect: onOpenAccount }]
      : []),
    { label: 'Kết thúc ván', icon: Flag, tone: 'text-neutral-200', onSelect: onEnd },
  ];

  return (
    <header className="game-header">
      <div className="game-header__turn">
        <span className="game-header__avatar" data-player={playerIndex} aria-hidden="true">{player.avatar}</span>
        <div className="min-w-0">
          <p className="truncate font-serif-romantic text-lg font-bold leading-tight text-white">{player.name}</p>
          <p className="text-xs text-neutral-300">
            Lượt {round}{targetRounds ? ` / ${targetRounds}` : ''}
          </p>
        </div>
      </div>

      <section className="game-header__progress" aria-label="Hành trình thân mật hai giai đoạn">
        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-neutral-100">
            <span
              key={gain?.id ?? 'heart'}
              className={`relative grid h-5 w-5 shrink-0 place-items-center ${gain ? 'game-header__beat' : ''}`}
              aria-hidden="true"
            >
              <Heart className={`h-5 w-5 ${standard ? 'fill-rose-500/80 text-rose-300' : 'fill-[#d7b1ff]/40 text-[#f0d7ff]'}`} />
            </span>
            <span className="shrink-0">{standard ? 'Tim Hồng' : 'Bộ Tư thế'}</span>
            <span className="hidden truncate text-xs font-normal text-neutral-300 xl:inline">
              {progressHint}
            </span>
          </p>
          <span className="relative shrink-0">
            <AnimatePresence>
              {gain && (
                <motion.span
                  key={gain.id}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateX(6px) scale(0.8)' }}
                  animate={{ opacity: 1, transform: 'translateX(0px) scale(1)' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DURATION.slow, ease: EASE_OUT }}
                  className={`pointer-events-none absolute right-full top-0.5 mr-2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-black ${standard ? 'bg-rose-500/30 text-rose-50' : 'bg-[#d7b1ff]/25 text-[#f4e8ff]'}`}
                  aria-hidden="true"
                >
                  +{gain.amount}%
                </motion.span>
              )}
            </AnimatePresence>
            <strong className={`text-lg font-bold tabular-nums ${standard ? 'text-rose-100' : 'text-[#f1d6ff]'}`}>{percent}%</strong>
          </span>
        </div>
        <div className="relative mt-1 h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/40">
          {/* The full-width bars slide in from the left: no layout on the way. */}
          <div
            role="progressbar"
            aria-label={`Tim Hồng ${intimacyPercent} phần trăm`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={intimacyPercent}
            className={`game-header__fill progress-shimmer bg-[#f9a8d4] shadow-[0_0_14px_rgba(249,168,212,.45)] ${standard ? '' : 'opacity-25'}`}
            style={{ transform: `translateX(${intimacyPercent - 100}%)` }}
          />
          {!standard && (
            <div
              role="progressbar"
              aria-label={`Bộ Tư thế ${luxuryPercent} phần trăm`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={luxuryPercent}
              className="game-header__fill luxury-heart-fill bg-[linear-gradient(90deg,#e8a48c,#d7b1ff,#f4e8ff,#cda95c)] shadow-[0_0_20px_rgba(215,177,255,.5)]"
              style={{ transform: `translateX(${luxuryPercent - 100}%)` }}
            />
          )}
        </div>
      </section>

      <div ref={oddsRef} className="game-header__heat">
        <div>
          {/* The Position deck starts its own scale (6★–10★), in its own colour. */}
          <div className="flex items-center gap-2" role="img" aria-label={`Độ nóng ${standard ? '' : 'Bộ Tư thế '}${heatLevel} trên 5`}>
            <Flame className={`h-4 w-4 ${standard ? 'text-amber-300' : 'text-[#d7b1ff]'}`} aria-hidden="true" />
            <span className="flex items-center gap-1" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((pip) => (
                <span
                  key={pip}
                  className={`h-1.5 w-3.5 rounded-full ${pip > heatLevel ? 'bg-white/15' : standard ? 'bg-gradient-to-r from-amber-300 to-rose-400' : 'bg-gradient-to-r from-[#d7b1ff] to-[#f0c7a0]'}`}
                />
              ))}
            </span>
          </div>
          <p className="mt-1 whitespace-nowrap text-xs text-neutral-300">
            {!standard
              ? <>Have Sex <strong className="text-[#f4e8ff]">{chance(finalChance)}</strong></>
              : difficultyBoostActive ? <strong className="text-orange-200">Tăng khó +1</strong> : 'Độ nóng'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowOdds((value) => !value)}
          aria-expanded={showOdds}
          aria-controls="game-odds"
          className={`flex h-9 items-center gap-1 rounded-full border border-white/12 px-3 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS_RING}`}
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" /> Tỉ lệ
        </button>
        <AnimatePresence>
          {showOdds && (
            <motion.div
              id="game-odds"
              role="region"
              aria-label="Tỉ lệ rút bài"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px) scale(0.98)' }}
              animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast }}
              className="game-header__odds"
            >
              <p className="text-sm font-semibold text-white">{oddsAreForOpenCard ? 'Tỉ lệ lúc rút lá này' : 'Tỉ lệ của lá kế tiếp'}</p>
              {standardOdds && (
                <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-blue-500/10 py-2"><dt className="text-xs text-blue-200">Sự thật</dt><dd className="text-lg font-bold text-blue-100">{chance(drawProbabilities.types.truth)}</dd></div>
                  <div className="rounded-xl bg-rose-500/10 py-2"><dt className="text-xs text-rose-200">Thử thách</dt><dd className="text-lg font-bold text-rose-100">{chance(drawProbabilities.types.dare)}</dd></div>
                </dl>
              )}
              <dl className="mt-3 grid grid-cols-5 gap-1 text-center">
                {standardOdds
                  ? DIFFICULTY_STARS.map((star) => (
                    <div key={star} className={drawProbabilities.stars[star] <= 0 ? 'opacity-70' : ''}>
                      <dt className="text-xs text-neutral-300">{star}★</dt>
                      <dd className="text-sm font-bold text-amber-200">{chance(drawProbabilities.stars[star])}</dd>
                    </div>
                  ))
                  : POSITION_DIFFICULTY_STARS.map((star) => (
                    <div key={star} className={(luxuryProbabilities?.stars[star] ?? 0) <= 0 ? 'opacity-70' : ''}>
                      <dt className="text-xs text-neutral-300">{star}★</dt>
                      <dd className="text-sm font-bold text-[#ead2ff]">{chance(luxuryProbabilities?.stars[star] ?? 0)}</dd>
                    </div>
                  ))}
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="game-header__tools">
        <button type="button" onClick={onToggleMute} aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'} data-tip={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'} className={ICON_BUTTON}>
          {isMuted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4 text-amber-200" aria-hidden="true" />}
        </button>
        <button type="button" onClick={onOpenRules} disabled={locked} aria-label="Cách chơi và luật phạt" data-tip="Cách chơi" className={ICON_BUTTON}>
          <HelpCircle className="h-4 w-4 text-rose-200" aria-hidden="true" />
        </button>
        <button type="button" onClick={onOpenCollection} disabled={locked} aria-label="Mở bộ sưu tập" data-tip="Bộ sưu tập" className={`${ICON_BUTTON} max-sm:hidden`}>
          <BookOpen className="h-4 w-4 text-amber-200" aria-hidden="true" />
        </button>
        <button type="button" onClick={onOpenSummary} disabled={locked} aria-label="Mở thống kê ván" data-tip="Thống kê" className={`${ICON_BUTTON} max-sm:hidden`}>
          <BarChart3 className="h-4 w-4 text-rose-200" aria-hidden="true" />
        </button>
        {onOpenAccount && (
          <button type="button" onClick={onOpenAccount} disabled={locked} aria-label="Tài khoản và đồng bộ" data-tip={coupleName ? `Tài khoản: ${coupleName}` : 'Tài khoản'} className={`${ICON_BUTTON} max-sm:hidden`}>
            <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          </button>
        )}
        <span className="mx-0.5 hidden h-6 w-px bg-white/12 sm:block" aria-hidden="true" />
        <button type="button" onClick={onPause} disabled={locked} aria-label="Tạm dừng" data-tip="Tạm dừng · P" className={`${ICON_BUTTON} max-sm:hidden`}>
          <Pause className="h-4 w-4 text-sky-200" aria-hidden="true" />
        </button>
        <button type="button" onClick={onEnd} disabled={locked} aria-label="Kết thúc ván" data-tip="Kết thúc ván" data-tip-align="end" className={`${ICON_BUTTON} max-sm:hidden hover:border-rose-400/50 hover:bg-rose-500/10`}>
          <Flag className="h-4 w-4" aria-hidden="true" />
        </button>

        <div ref={menuRef} className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setShowMenu((open) => !open)}
            aria-expanded={showMenu}
            aria-haspopup="menu"
            className={`flex h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-neutral-100 ${FOCUS_RING}`}
          >
            <Ellipsis className="h-4 w-4" aria-hidden="true" /> Thêm
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                role="menu"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px) scale(0.97)' }}
                animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.fast }}
                className="absolute right-0 top-[calc(100%+8px)] z-[60] w-56 overflow-hidden rounded-2xl border border-white/12 bg-[#171014] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              >
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      disabled={locked}
                      onClick={() => {
                        setShowMenu(false);
                        item.onSelect();
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-neutral-100 hover:bg-white/[0.06] disabled:opacity-40"
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${item.tone}`} aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

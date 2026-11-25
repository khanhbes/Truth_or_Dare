import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BookHeart, Heart, RotateCcw, X, CheckCircle2, Shirt, Star } from 'lucide-react';
import { CardResolutionEvent, ClothingRemovalEvent, GameEndReason, IntimacyEvent, JourneyPhase, OutfitState, Player, PlayerRewardState, PositionSessionStats, RewardEvent } from '../types';
import { getPresentGarmentSlots } from '../utils/wardrobe';
import { ConfirmDialog } from './ConfirmDialog';
import { dialogPanelMotion } from '../utils/motionTokens';
import { useDialogFocus } from './useDialogFocus';

interface SummaryModalProps {
  player1: Player;
  player2: Player;
  totalRounds: number;
  favoritesCount: number;
  outfitStates?: [OutfitState, OutfitState];
  removalEvents?: ClothingRemovalEvent[];
  intimacyPercent?: number;
  luxuryIntimacyPercent?: number;
  intimacyEvents?: IntimacyEvent[];
  positionSessionStats?: PositionSessionStats;
  cardResolutionEvents?: CardResolutionEvent[];
  journeyPhase?: JourneyPhase;
  playerRewards?: [PlayerRewardState, PlayerRewardState];
  rewardEvents?: RewardEvent[];
  onRestart: () => void;
  onClose: () => void;
  onHome?: () => void;
  terminal?: boolean;
  endReason?: GameEndReason | null;
  journalSaved?: boolean;
}

const ENDING_COPY: Record<GameEndReason, string> = {
  have_sex: 'Hai bạn đã đi trọn hành trình. Lá cuối chỉ là gợi ý: làm hay không là tùy hai bạn.',
  pink_complete: 'Tim Hồng đã đầy. Dừng ở đây cũng là một cái kết đẹp.',
  no_cards: 'Hai bạn đã đi hết những lá hợp với ván này. Ôm nhau một cái nhé.',
  manual: 'Cảm ơn hai bạn đã dành thời gian cho nhau.',
};

const getInitialGarmentCount = (outfitState: OutfitState) =>
  Object.values(outfitState.initial.garments).filter(Boolean).length;

const getRemovalCount = (
  events: ClothingRemovalEvent[] | undefined,
  targetPlayerIndex: 0 | 1,
  source: ClothingRemovalEvent['source']
) => events?.filter(
  (event) => event.targetPlayerIndex === targetPlayerIndex && event.source === source && event.action !== 'transferred'
).length ?? 0;

export const SummaryModal: React.FC<SummaryModalProps> = ({
  player1,
  player2,
  totalRounds,
  favoritesCount,
  outfitStates,
  removalEvents,
  intimacyPercent,
  luxuryIntimacyPercent = 0,
  intimacyEvents,
  positionSessionStats = { drawn: 0, opened: 0, completed: 0, skipped: 0 },
  cardResolutionEvents,
  journeyPhase,
  playerRewards,
  rewardEvents = [],
  onRestart,
  onClose,
  onHome,
  terminal = false,
  endReason,
  journalSaved = false,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  // After a finished game there is nothing to go back to, so Escape does nothing,
  // and focus starts on the title: one more Space must not start a new game.
  const panelRef = useDialogFocus<HTMLDivElement>({
    onEscape: terminal ? undefined : onClose,
    initialFocusRef: terminal ? titleRef : closeButtonRef,
  });
  const shouldReduceMotion = useReducedMotion();
  const totalCompleted = player1.completedCount + player2.completedCount;
  const legacyIntimacyScore = Math.min(100, Math.round((totalCompleted / Math.max(1, totalRounds)) * 100));
  const intimacyScore = intimacyPercent ?? legacyIntimacyScore;
  const swapCount = Math.floor((removalEvents?.filter((event) => event.action === 'transferred').length ?? 0) / 2);

  let intimacyBadge = 'Gắn kết nhẹ nhàng 🌸';
  if (journeyPhase === 'final') intimacyBadge = 'Hành trình trọn vẹn 💞';
  else if (journeyPhase === 'position') intimacyBadge = 'Đã mở Bộ Tư thế ✨';
  else if (intimacyScore > 75) intimacyBadge = 'Nồng nhiệt 💋';
  else if (intimacyScore > 40) intimacyBadge = 'Thân mật đắm say 🔥';
  const totalRemoved = ([0, 1] as const).reduce((sum, index) => {
    const state = outfitStates?.[index];
    return state ? sum + Math.max(0, getInitialGarmentCount(state) - getPresentGarmentSlots(state).length) : sum;
  }, 0);

  // A purchase from the shared wallet may be paid by both: one purchase, two events.
  const purchases = (kind: RewardEvent['kind']): number =>
    new Set(rewardEvents.filter((event) => event.kind === kind).map((event) => event.timestamp)).size;
  const sharedSpending = [
    ['đổi lá Tư thế', purchases('position_reroll')],
    ['rút 2 chọn 1', purchases('position_pair')],
    ['chọn nhóm', purchases('position_family')],
    ['lật lá cuối', purchases('final_card_flips')],
  ].flatMap(([label, count]) => (Number(count) > 0 ? [`${label} ${count} lần`] : []));
  const eventStars = rewardEvents
    .filter((event) => event.kind === 'event_stars' && event.playerIndex === 0)
    .reduce((sum, event) => sum + event.amount, 0);

  const renderOutfitSummary = (playerIndex: 0 | 1) => {
    const outfitState = outfitStates?.[playerIndex];
    if (!outfitState) return null;
    const initialCount = getInitialGarmentCount(outfitState);
    const remainingCount = getPresentGarmentSlots(outfitState).length;
    const removedCount = Math.max(0, initialCount - remainingCount);
    const penaltyRemovalCount = getRemovalCount(removalEvents, playerIndex, 'penalty');
    return (
      <div className="mt-3 border-t border-white/10 pt-3 [@media(max-height:760px)]:mt-2 [@media(max-height:760px)]:pt-2">
        <div className="flex items-center gap-1.5 text-sm text-neutral-200">
          <Shirt className="h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
          <span className="text-balance">Đã cởi <strong className="tabular-nums text-rose-100">{removedCount}/{initialCount}</strong> món</span>
        </div>
        <div className="mt-1.5 flex gap-1" aria-hidden="true">
          {Array.from({ length: initialCount }, (_, index) => (
            <span key={index} className={`h-1.5 flex-1 rounded-full ${index < removedCount ? 'bg-rose-400' : 'bg-white/10'}`} />
          ))}
        </div>
        {penaltyRemovalCount > 0 && (
          <p className="mt-1.5 text-xs text-neutral-300">{penaltyRemovalCount} món do bỏ lượt</p>
        )}
      </div>
    );
  };

  const renderRewardSummary = (playerIndex: 0 | 1) => {
    const reward = playerRewards?.[playerIndex];
    if (!reward) return null;
    const extras = [
      reward.rerollsUsed > 0 ? `đổi bài ${reward.rerollsUsed} lần` : null,
      reward.difficultyBoostsUsed > 0 ? `tăng khó ${reward.difficultyBoostsUsed} lần` : null,
    ].filter(Boolean);
    return (
      <div className="mt-3 border-t border-white/10 pt-3 [@media(max-height:760px)]:mt-2 [@media(max-height:760px)]:pt-2">
        <div className="flex items-center gap-1.5 text-sm text-neutral-200">
          <Star className="h-4 w-4 shrink-0 fill-amber-300/20 text-amber-300" aria-hidden="true" />
          <span>Kiếm <strong className="text-amber-200">{reward.totalStarsEarned}★</strong>, <span className="whitespace-nowrap">còn <strong className="text-amber-200">{reward.starBalance}★</strong></span></span>
        </div>
        {extras.length > 0 && <p className="mt-1 text-xs text-neutral-300">Đã {extras.join(', ')}</p>}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.08 : 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
      aria-describedby="summary-description"
      onMouseDown={(event) => {
        if (!terminal && event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        {...dialogPanelMotion(Boolean(shouldReduceMotion))}
        className="relative flex max-h-[calc(100svh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-amber-300/45 bg-[#1c0c13] text-center text-white shadow-2xl"
      >
        {!terminal && (
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng thống kê"
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-neutral-300 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-3 pt-5 sm:px-7 sm:pt-7 [@media(max-height:760px)]:pt-4">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border border-amber-300/50 bg-gradient-to-tr from-rose-500/30 to-amber-500/30 [@media(max-height:760px)]:hidden">
            <Heart className="h-7 w-7 fill-rose-300/60 text-rose-200" aria-hidden="true" />
          </div>

          <h3 ref={titleRef} tabIndex={-1} id="summary-title" className="px-8 font-serif-romantic text-2xl font-bold text-gold-gradient focus:outline-none sm:text-3xl">
            {terminal ? 'Tổng kết cuộc chơi' : 'Thống kê ván này'}
          </h3>
          <p id="summary-description" className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-rose-100">
            {terminal ? ENDING_COPY[endReason ?? 'manual'] : 'Chặng đường hai bạn đã đi cùng nhau.'}
            {journalSaved && (
              <span className="mt-1 flex items-center justify-center gap-1.5 font-semibold text-emerald-200">
                <BookHeart className="h-4 w-4 shrink-0" aria-hidden="true" /> Đã lưu vào nhật ký.
              </span>
            )}
          </p>

          <div className="mt-4 space-y-3 rounded-2xl border border-rose-400/30 bg-black/35 p-4 [@media(max-height:760px)]:mt-3 [@media(max-height:760px)]:space-y-2 [@media(max-height:760px)]:p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-rose-500/[0.1] p-2">
                <div className="text-sm text-rose-100">Tim Hồng</div>
                <div className="font-serif-romantic text-2xl font-bold tabular-nums text-rose-100">{intimacyScore}%</div>
              </div>
              <div className="rounded-xl bg-violet-400/[0.1] p-2">
                <div className="text-sm text-violet-100">Tim Luxury</div>
                <div className="font-serif-romantic text-2xl font-bold tabular-nums text-violet-100">{luxuryIntimacyPercent}%</div>
              </div>
            </div>
            <div className="inline-block rounded-full border border-rose-400/45 bg-rose-950/80 px-3 py-1 text-sm font-medium text-rose-100">
              {intimacyBadge}
            </div>
            <dl className="grid grid-cols-3 gap-1.5 text-center">
              {([
                ['Lá hoàn thành', totalCompleted, 'bg-white/[0.06]'],
                ['Món đã cởi', totalRemoved, 'bg-rose-500/[0.1]'],
                ['Tư thế đã làm', positionSessionStats.completed, 'bg-violet-500/[0.1]'],
              ] as const).map(([label, value, tone]) => (
                <div key={label} className={`rounded-lg px-1 py-2 ${tone}`}>
                  <dt className="text-xs text-neutral-200">{label}</dt>
                  <dd className="mt-0.5 text-lg font-bold tabular-nums text-white">{value}</dd>
                </div>
              ))}
            </dl>
            {swapCount > 0 && (
              <p className="text-sm text-neutral-200">Hai bạn đã đổi đồ cho nhau {swapCount} lần.</p>
            )}
            {eventStars > 0 && (
              <p className="text-sm text-neutral-200">Đoán trùng ý nhau: <strong className="text-amber-200">+{eventStars}★</strong> mỗi người.</p>
            )}
            {sharedSpending.length > 0 && (
              <p className="text-sm text-neutral-200">Ví chung: {sharedSpending.join(', ')}.</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-left">
            {([0, 1] as const).map((index) => {
              const player = index === 0 ? player1 : player2;
              return (
                <div key={index} className={`min-w-0 rounded-2xl border bg-black/30 p-3.5 ${index === 0 ? 'border-rose-400/30' : 'border-amber-400/30'}`}>
                  <div className="mb-1 truncate text-lg">{player.avatar} {player.name}</div>
                  <div className="flex items-center gap-1.5 text-sm text-neutral-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                    <span className="text-balance">{player.completedCount} lá hoàn thành</span>
                  </div>
                  {renderRewardSummary(index)}
                  {renderOutfitSummary(index)}
                </div>
              );
            })}
          </div>

          {favoritesCount > 0 && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-neutral-200">
              <Heart className="h-4 w-4 fill-rose-500 text-rose-500" aria-hidden="true" />
              <span>{favoritesCount} lá trong mục yêu thích</span>
            </div>
          )}

        </div>
        {/* Actions: while a game is running, going back to it is the main choice. */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 px-5 pb-5 pt-4 sm:flex-row-reverse sm:px-7 [@media(max-height:760px)]:pb-4 [@media(max-height:760px)]:pt-3">
          {terminal ? (
            <>
              <button
                type="button"
                onClick={onRestart}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-gold-gradient py-3 text-sm font-bold text-neutral-950 shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Ván mới</span>
              </button>
              <button
                type="button"
                onClick={onHome}
                className="min-h-11 flex-1 rounded-full border border-white/20 bg-white/[0.05] py-3 text-sm font-semibold text-neutral-100 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                Về trang đầu
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 flex-1 rounded-full bg-gold-gradient py-3 text-sm font-bold text-neutral-950 shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Chơi tiếp
              </button>
              <button
                type="button"
                onClick={() => setConfirmRestart(true)}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.05] py-3 text-sm font-semibold text-neutral-100 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Bỏ ván, chơi lại</span>
              </button>
            </>
          )}
        </div>
      </motion.div>
      {confirmRestart && (
        <ConfirmDialog
          icon={<RotateCcw className="h-5 w-5" />}
          title="Bỏ ván đang chơi?"
          description="Tim Hồng, sao và trang phục của ván này sẽ mất. Các lá đã mở trong Bộ sưu tập vẫn được giữ."
          confirmLabel="Bỏ ván này"
          cancelLabel="Chơi tiếp"
          onCancel={() => setConfirmRestart(false)}
          onConfirm={() => {
            setConfirmRestart(false);
            onRestart();
          }}
        />
      )}
    </motion.div>
  );
};

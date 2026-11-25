import React from 'react';
import { CheckCircle2, Eye, FastForward, Feather, Layers, Layers2, Shuffle, Sparkles, Timer as TimerIcon, TrendingUp, XCircle } from 'lucide-react';
import {
  DIFFICULTY_BOOST_STAR_COST,
  POSITION_FAMILY_STAR_COST,
  POSITION_PAIR_STAR_COST,
  POSITION_REROLL_STAR_COST,
  REROLL_STAR_COST,
} from '../../utils/rewards';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_LUXURY, BUTTON_QUIET, BUTTON_SECONDARY, formatSeconds } from './tableStyles';

interface IdleActions {
  state: 'idle';
  deck: 'standard' | 'position';
  playerName: string;
  /** Extra difficulty for the partner's next turn; null hides the option. */
  boost: { targetName: string; pending: boolean; affordable: boolean } | null;
  /** The shared wallet, for the paid draws of the Position deck; null hides them. */
  sharedBalance: number | null;
  onDraw: () => void;
  onBoost: () => void;
  onPair: () => void;
  onFamily: () => void;
}

interface AnswerActions {
  state: 'answer';
  /** A timed dare must be started before it can be completed. */
  startSeconds: number | null;
  skipLabel: string;
  completeLabel: string;
  reroll: { playerName: string; balance: number; used: boolean };
  /** The free swap for an easier card, once per player and game. */
  lighter: boolean;
  onSkip: () => void;
  onStart: () => void;
  onComplete: () => void;
  onReroll: () => void;
  onLighter: () => void;
}

interface PositionActions {
  state: 'position';
  completeLabel: string;
  /** Paid by the shared wallet, once per card. */
  reroll: { balance: number; used: boolean } | null;
  onSkip: () => void;
  onComplete: () => void;
  onReroll: () => void;
}

type TableActionsProps =
  | IdleActions
  | { state: 'moving'; text: string; onSkip: () => void }
  | { state: 'choose'; onBack: () => void }
  | { state: 'hidden'; luxury: boolean; onReveal: () => void }
  | AnswerActions
  | PositionActions
  | { state: 'final'; onFinish: () => void }
  | { state: 'none' };

/**
 * Buttons under the card. Always the same place and height, so nothing jumps.
 * Each state has its own key: a reused button would keep the focus while its
 * meaning changes, and a second Space after opening a card would skip it.
 */
export const TableActions: React.FC<TableActionsProps> = (props) => {
  switch (props.state) {
    case 'idle': {
      const luxury = props.deck === 'position';
      return (
        <div key="idle" className="table-actions">
          <div className="table-actions__main">
            <button type="button" data-action="draw" data-main-action onClick={props.onDraw} className={luxury ? BUTTON_PRIMARY_LUXURY : BUTTON_PRIMARY}>
              <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{props.playerName} {luxury ? 'rút lá Tư thế' : 'rút bài'}</span>
            </button>
          </div>
          <div className="table-actions__more">
            {props.boost && (
              <button
                type="button"
                data-action="boost"
                onClick={props.onBoost}
                disabled={props.boost.pending || !props.boost.affordable}
                className={BUTTON_QUIET}
                aria-label={`Tăng khó ${props.boost.targetName}: lượt kế tiếp khó hơn một bậc, tốn ${DIFFICULTY_BOOST_STAR_COST} sao`}
              >
                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-orange-200" aria-hidden="true" />
                <span className="truncate">
                  {props.boost.pending
                    ? `Đã đặt tăng khó cho ${props.boost.targetName}`
                    : `Tăng khó ${props.boost.targetName} · ${DIFFICULTY_BOOST_STAR_COST}★`}
                </span>
              </button>
            )}
            {props.sharedBalance !== null && (props.sharedBalance < POSITION_PAIR_STAR_COST ? (
              <span className="flex items-center gap-1.5 text-xs text-neutral-300">
                <Layers2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Rút 2 chọn 1 cần {POSITION_PAIR_STAR_COST}★ · ví chung {props.sharedBalance}★
              </span>
            ) : (
              <>
                <button
                  type="button"
                  data-action="pair"
                  onClick={props.onPair}
                  className={BUTTON_QUIET}
                  aria-label={`Rút 2 chọn 1: mở hai lá rồi giữ một, tốn ${POSITION_PAIR_STAR_COST} sao của ví chung`}
                >
                  <Layers2 className="h-3.5 w-3.5 shrink-0 text-[#ead2ff]" aria-hidden="true" />
                  <span className="truncate">Rút 2 chọn 1 · {POSITION_PAIR_STAR_COST}★</span>
                </button>
                {props.sharedBalance >= POSITION_FAMILY_STAR_COST && (
                  <button
                    type="button"
                    data-action="family-open"
                    onClick={props.onFamily}
                    className={BUTTON_QUIET}
                    aria-label={`Chọn nhóm tư thế cho lá kế tiếp, tốn ${POSITION_FAMILY_STAR_COST} sao của ví chung`}
                  >
                    <Layers className="h-3.5 w-3.5 shrink-0 text-[#f7e7b0]" aria-hidden="true" />
                    <span className="truncate">Chọn nhóm · {POSITION_FAMILY_STAR_COST}★</span>
                  </button>
                )}
              </>
            ))}
          </div>
        </div>
      );
    }
    case 'moving':
      return (
        <div key="moving" className="table-actions">
          <div className="table-actions__main">
            <p role="status" className="font-serif-romantic text-base italic text-amber-100">{props.text}</p>
          </div>
          <div className="table-actions__more">
            <button type="button" data-action="fast-forward" data-main-action onClick={props.onSkip} className={BUTTON_QUIET}>
              <FastForward className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Mở nhanh
            </button>
          </div>
        </div>
      );
    case 'choose':
      return (
        <div key="choose" className="table-actions">
          <div className="table-actions__main">
            <button type="button" onClick={props.onBack} className={`${BUTTON_SECONDARY} max-w-48`}>Quay lại</button>
          </div>
          <div className="table-actions__more" />
        </div>
      );
    case 'hidden':
      return (
        <div key="hidden" className="table-actions">
          <div className="table-actions__main">
            <button type="button" data-action="reveal" data-main-action onClick={props.onReveal} className={props.luxury ? BUTTON_PRIMARY_LUXURY : BUTTON_PRIMARY}>
              <Eye className="h-5 w-5 shrink-0" aria-hidden="true" /> Xem nội dung
            </button>
          </div>
          <div className="table-actions__more" />
        </div>
      );
    case 'answer': {
      const { reroll } = props;
      const mustStart = props.startSeconds !== null;
      return (
        <div key="answer" className="table-actions">
          <div className="table-actions__main">
            <button type="button" data-action="skip" onClick={props.onSkip} className={BUTTON_SECONDARY}>
              <XCircle className="h-4 w-4 shrink-0 text-neutral-300 max-sm:hidden" aria-hidden="true" />
              <span>{props.skipLabel}</span>
            </button>
            {mustStart ? (
              <button type="button" data-action="start-timer" data-main-action onClick={props.onStart} className={BUTTON_PRIMARY}>
                <TimerIcon className="h-5 w-5 shrink-0" aria-hidden="true" /> Bắt đầu · {formatSeconds(props.startSeconds ?? 0)}
              </button>
            ) : (
              <button type="button" data-action="complete" data-main-action onClick={props.onComplete} className={BUTTON_PRIMARY}>
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{props.completeLabel}</span>
              </button>
            )}
          </div>
          <div className="table-actions__more">
            {props.lighter && (
              <button
                type="button"
                data-action="lighter"
                onClick={props.onLighter}
                className={BUTTON_QUIET}
                aria-label="Lá nhẹ hơn: đổi miễn phí, mỗi người một lần trong ván"
              >
                <Feather className="h-3.5 w-3.5 shrink-0 text-emerald-200" aria-hidden="true" />
                <span className="truncate">Lá nhẹ hơn</span>
              </button>
            )}
            {reroll.used ? (
              <span className="text-xs text-neutral-300">Đã đổi bài trong lượt này</span>
            ) : reroll.balance < REROLL_STAR_COST ? (
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-300">
                <Shuffle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Đổi lá cần {REROLL_STAR_COST}★ · {reroll.playerName} có {reroll.balance}★</span>
              </span>
            ) : (
              <button
                type="button"
                data-action="reroll"
                onClick={props.onReroll}
                className={BUTTON_QUIET}
                aria-label={`Đổi lá khác, tốn ${REROLL_STAR_COST} sao của ${reroll.playerName}`}
              >
                <Shuffle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Đổi lá khác · {REROLL_STAR_COST}★ của {reroll.playerName}</span>
              </button>
            )}
          </div>
        </div>
      );
    }
    case 'position':
      return (
        <div key="position" className="table-actions">
          <div className="table-actions__main">
            <button type="button" data-action="skip" onClick={props.onSkip} className={BUTTON_SECONDARY}>
              <XCircle className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden="true" /> Bỏ qua
            </button>
            <button type="button" data-action="complete" data-main-action onClick={props.onComplete} className={BUTTON_PRIMARY_LUXURY}>
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{props.completeLabel}</span>
            </button>
          </div>
          <div className="table-actions__more">
            <span className="shrink-0 text-xs text-neutral-300">Bỏ qua không bị phạt</span>
            {props.reroll && !props.reroll.used && props.reroll.balance >= POSITION_REROLL_STAR_COST && (
              <button
                type="button"
                data-action="reroll"
                onClick={props.onReroll}
                className={BUTTON_QUIET}
                aria-label={`Đổi lá khác, tốn ${POSITION_REROLL_STAR_COST} sao của ví chung`}
              >
                <Shuffle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Đổi lá khác · {POSITION_REROLL_STAR_COST}★ ví chung</span>
              </button>
            )}
          </div>
        </div>
      );
    case 'final':
      return (
        <div key="final" className="table-actions">
          <div className="table-actions__main">
            <button type="button" data-action="complete" data-main-action onClick={props.onFinish} className={BUTTON_PRIMARY_LUXURY}>
              Khép lại ván chơi
            </button>
          </div>
          <div className="table-actions__more">
            <span className="text-xs text-neutral-200">Lá cuối chỉ là gợi ý, không bắt buộc.</span>
          </div>
        </div>
      );
    default:
      return <div className="table-actions" aria-hidden="true" />;
  }
};

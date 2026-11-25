import React from 'react';
import { CheckCircle2, Eye, FastForward, Shuffle, Sparkles, Timer as TimerIcon, TrendingUp, XCircle } from 'lucide-react';
import { DIFFICULTY_BOOST_STAR_COST, REROLL_STAR_COST } from '../../utils/rewards';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_LUXURY, BUTTON_QUIET, BUTTON_SECONDARY } from './tableStyles';

interface IdleActions {
  state: 'idle';
  deck: 'standard' | 'position';
  playerName: string;
  /** Extra difficulty for the partner's next turn; null hides the option. */
  boost: { targetName: string; pending: boolean; affordable: boolean } | null;
  onDraw: () => void;
  onBoost: () => void;
}

interface AnswerActions {
  state: 'answer';
  /** A timed dare must be started before it can be completed. */
  startSeconds: number | null;
  skipLabel: string;
  completeLabel: string;
  reroll: { playerName: string; balance: number; used: boolean };
  onSkip: () => void;
  onStart: () => void;
  onComplete: () => void;
  onReroll: () => void;
}

type TableActionsProps =
  | IdleActions
  | { state: 'moving'; text: string; onSkip: () => void }
  | { state: 'choose'; onBack: () => void }
  | { state: 'hidden'; luxury: boolean; onReveal: () => void }
  | AnswerActions
  | { state: 'position'; completeLabel: string; onSkip: () => void; onComplete: () => void }
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
                aria-label={`Tăng một bậc độ khó cho lượt kế tiếp của ${props.boost.targetName}, tốn ${DIFFICULTY_BOOST_STAR_COST} sao`}
              >
                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-orange-200" aria-hidden="true" />
                <span className="truncate">
                  {props.boost.pending
                    ? `Đã đặt tăng khó cho ${props.boost.targetName}`
                    : `Tăng khó ${props.boost.targetName} · ${DIFFICULTY_BOOST_STAR_COST}★`}
                </span>
              </button>
            )}
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
                <TimerIcon className="h-5 w-5 shrink-0" aria-hidden="true" /> Bắt đầu · {props.startSeconds}s
              </button>
            ) : (
              <button type="button" data-action="complete" data-main-action onClick={props.onComplete} className={BUTTON_PRIMARY}>
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{props.completeLabel}</span>
              </button>
            )}
          </div>
          <div className="table-actions__more">
            {reroll.used ? (
              <span className="text-xs text-neutral-300">Đã đổi bài trong lượt này</span>
            ) : reroll.balance < REROLL_STAR_COST ? (
              <span className="flex items-center gap-1.5 text-xs text-neutral-300">
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                Đổi lá cần {REROLL_STAR_COST}★ · {reroll.playerName} có {reroll.balance}★
              </span>
            ) : (
              <button
                type="button"
                data-action="reroll"
                onClick={props.onReroll}
                className={BUTTON_QUIET}
                aria-label={`Đổi lá bài, tốn ${REROLL_STAR_COST} sao của ${reroll.playerName}`}
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
            <span className="text-xs text-neutral-300">Bỏ qua không bị phạt</span>
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

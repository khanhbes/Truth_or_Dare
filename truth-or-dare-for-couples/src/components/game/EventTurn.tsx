import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, EyeOff, Heart, HeartHandshake, Repeat2, Sparkles, type LucideIcon } from 'lucide-react';
import type { MatchQuestion } from '../../data/eventQuestions';
import type { Player } from '../../types';
import { soundEngine } from '../../utils/audio';
import {
  DOUBLE_MULTIPLIER,
  MATCH_QUESTION_COUNT,
  MATCH_STAR_REWARD,
  countMatches,
  fillNames,
  type DueGameEvent,
} from '../../utils/gameEvents';
import { DURATION, EASE_OUT } from '../../utils/motionTokens';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FOCUS_RING } from './tableStyles';
import { useActionGuard } from './useActionGuard';

interface EventTurnProps {
  event: DueGameEvent;
  /** The player whose turn it is, then the partner. */
  player: Player;
  partner: Player;
  /** Names in seat order, for the answers of a question. */
  seatNames: readonly [string, string];
  /** Questions of a running "Đoán ý" turn; null before it starts. */
  questions: readonly MatchQuestion[] | null;
  /** Nobody may read over the shoulder after the table was hidden. */
  concealed: boolean;
  reduceMotion: boolean;
  onAccept: () => void;
  onRefuse: () => void;
  onMatchDone: (matches: number) => void;
}

const INTRO: Record<DueGameEvent['kind'], { icon: LucideIcon; title: string; action: string }> = {
  match: { icon: HeartHandshake, title: 'Đoán ý nhau', action: 'Bắt đầu' },
  swap: { icon: Repeat2, title: 'Đổi vai', action: 'Đổi vai' },
  double: { icon: Sparkles, title: 'Nhân đôi Tim Hồng', action: 'Nhận cơ hội' },
};

const introText = (event: DueGameEvent, player: string, partner: string): string => {
  if (event.kind === 'match') {
    return `${MATCH_QUESTION_COUNT} câu hỏi, mỗi người bí mật chọn một đáp án. Mỗi câu chọn giống nhau, cả hai được +${MATCH_STAR_REWARD}★.`;
  }
  if (event.kind === 'swap') return `${partner} xem trước hai lá và chọn lá nào ${player} sẽ làm.`;
  return `Lá hoàn thành kế tiếp cho gấp ${DOUBLE_MULTIPLIER === 2 ? 'đôi' : DOUBLE_MULTIPLIER} % Tim Hồng.`;
};

const Panel: React.FC<{ labelledBy: string; reduceMotion: boolean; children: React.ReactNode }> = ({ labelledBy, reduceMotion, children }) => (
  <motion.section
    className="table-panel table-panel--event"
    aria-labelledby={labelledBy}
    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(14px) scale(0.98)' }}
    animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
    transition={{ duration: reduceMotion ? DURATION.instant : DURATION.slow, ease: EASE_OUT }}
  >
    {children}
  </motion.section>
);

type MatchStage = { who: 0 | 1; step: 'gate' } | { who: 0 | 1; step: 'answer' } | { step: 'result' };

/** Both answer the same questions in secret on one device, then compare. */
const MatchTurn: React.FC<{
  questions: readonly MatchQuestion[];
  names: readonly [string, string];
  seatNames: readonly [string, string];
  concealed: boolean;
  reduceMotion: boolean;
  onDone: (matches: number) => void;
}> = ({ questions, names, seatNames, concealed, reduceMotion, onDone }) => {
  const [stage, setStage] = useState<MatchStage>({ who: 0, step: 'gate' });
  const [answers, setAnswers] = useState<[number[], number[]]>([[], []]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const who = stage.step === 'result' ? 0 : stage.who;
  const questionIndex = answers[who].length;
  const guarded = useActionGuard(stage, questionIndex);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, [stage, questionIndex]);

  // Hidden in the middle of an answer: the same person starts again from the gate, answers kept.
  useEffect(() => {
    if (!concealed) return;
    setStage((current) => (current.step === 'answer' ? { who: current.who, step: 'gate' } : current));
  }, [concealed]);

  const matches = countMatches(answers[0], answers[1]);
  useEffect(() => {
    if (stage.step === 'result' && matches > 0) soundEngine.play('match');
    // Once, when the answers are turned over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.step]);

  const answer = (choice: number) => {
    if (stage.step !== 'answer') return;
    soundEngine.playTick();
    const mine = [...answers[stage.who], choice];
    setAnswers(stage.who === 0 ? [mine, answers[1]] : [answers[0], mine]);
    if (mine.length < questions.length) return;
    setStage(stage.who === 0 ? { who: 1, step: 'gate' } : { step: 'result' });
  };

  if (stage.step === 'result') {
    return (
      <Panel key="result" labelledBy="match-title" reduceMotion={reduceMotion}>
        <p className="text-sm font-semibold text-amber-200">Đoán ý nhau</p>
        <h2 ref={titleRef} tabIndex={-1} id="match-title" className="mt-1 font-serif-romantic text-2xl font-bold text-white focus:outline-none">
          {matches === questions.length ? 'Đúng là hiểu nhau!' : matches > 0 ? `Trùng ${matches}/${questions.length} câu` : 'Lần này mỗi người một ý'}
        </h2>
        <ul className="mt-4 space-y-2.5 text-left">
          {questions.map((question, index) => {
            const same = answers[0][index] === answers[1][index];
            return (
              <li key={question.id} className={`rounded-2xl border px-3.5 py-3 ${same ? 'border-emerald-300/40 bg-emerald-400/[0.08]' : 'border-white/12 bg-white/[0.04]'}`}>
                <p className="flex items-start justify-between gap-2 text-sm font-semibold text-white">
                  <span>{fillNames(question.text, seatNames)}</span>
                  {same && <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-200"><Check className="h-4 w-4" aria-hidden="true" /> Trùng</span>}
                </p>
                <dl className="mt-1.5 grid grid-cols-2 gap-2 text-sm">
                  {names.map((name, player) => (
                    <div key={player} className="min-w-0">
                      <dt className="truncate text-xs text-neutral-300">{name} chọn</dt>
                      <dd className="font-medium text-rose-50">{fillNames(question.options[answers[player][index]] ?? '', seatNames)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-neutral-200">
          {matches > 0
            ? <>Cả hai được <strong className="text-amber-200">+{matches * MATCH_STAR_REWARD}★</strong> mỗi người.</>
            : 'Hỏi nhau xem vì sao nhé, rồi chơi tiếp.'}
        </p>
        <button type="button" data-action="event-done" data-main-action onClick={guarded(() => onDone(matches))} className={`${BUTTON_PRIMARY} mt-4 w-full`}>
          Chơi tiếp
        </button>
      </Panel>
    );
  }

  const name = names[stage.who];
  const other = names[stage.who === 0 ? 1 : 0];
  if (stage.step === 'gate') {
    return (
      <Panel key={`gate-${stage.who}`} labelledBy="match-title" reduceMotion={reduceMotion}>
        <span className="table-panel__seal" aria-hidden="true"><EyeOff className="h-6 w-6" /></span>
        <h2 ref={titleRef} tabIndex={-1} id="match-title" className="mt-3 font-serif-romantic text-2xl font-bold text-white focus:outline-none">
          {stage.who === 0 ? `${name} trả lời trước` : `Đưa máy cho ${name}`}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-200">
          {stage.who === 0
            ? `${other} nhìn đi chỗ khác một chút nhé.`
            : `Đáp án của ${other} đã được giữ kín. Chọn điều ${name} nghĩ ${other} cũng sẽ chọn.`}
        </p>
        <button
          type="button"
          data-action="match-ready"
          data-main-action
          onClick={guarded(() => setStage({ who: stage.who, step: 'answer' }))}
          className={`${BUTTON_PRIMARY} mt-5 w-full`}
        >
          {name} sẵn sàng
        </button>
      </Panel>
    );
  }

  const question = questions[Math.min(questionIndex, questions.length - 1)];
  return (
    <Panel key={`question-${stage.who}-${question.id}`} labelledBy="match-title" reduceMotion={reduceMotion}>
      <p className="text-sm font-semibold text-amber-200">{name} · câu {questionIndex + 1}/{questions.length}</p>
      <h2 ref={titleRef} tabIndex={-1} id="match-title" className="mt-1.5 text-balance font-serif-romantic text-2xl font-bold text-white focus:outline-none">
        {fillNames(question.text, seatNames)}
      </h2>
      <div className="mt-4 grid gap-2">
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            data-action="match-answer"
            onClick={guarded(() => answer(index))}
            className={`min-h-12 rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-[15px] font-semibold text-neutral-50 transition-colors hover:border-amber-200/60 hover:bg-amber-200/10 ${FOCUS_RING}`}
          >
            {fillNames(option, seatNames)}
          </button>
        ))}
      </div>
    </Panel>
  );
};

/** An event turn: what it is, and the choice to play it or not. */
export const EventTurn: React.FC<EventTurnProps> = ({
  event,
  player,
  partner,
  seatNames,
  questions,
  concealed,
  reduceMotion,
  onAccept,
  onRefuse,
  onMatchDone,
}) => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const running = event.kind === 'match' && questions !== null;
  useEffect(() => {
    if (running) return;
    titleRef.current?.focus({ preventScroll: true });
    soundEngine.play('event');
    // Once for each event that comes up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.index]);

  if (running) {
    return (
      <MatchTurn
        questions={questions}
        names={[player.name, partner.name]}
        seatNames={seatNames}
        concealed={concealed}
        reduceMotion={reduceMotion}
        onDone={onMatchDone}
      />
    );
  }

  const intro = INTRO[event.kind];
  const Icon = intro.icon;
  return (
    <Panel key="intro" labelledBy="event-title" reduceMotion={reduceMotion}>
      <span className="table-panel__seal" aria-hidden="true"><Icon className="h-6 w-6" /></span>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-200">
        <Heart className="h-4 w-4 fill-rose-400/70 text-rose-300" aria-hidden="true" /> Lượt sự kiện · Tim Hồng {event.milestone}%
      </p>
      <h2 ref={titleRef} tabIndex={-1} id="event-title" className="mt-1 font-serif-romantic text-3xl font-bold text-white focus:outline-none">{intro.title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-200">{introText(event, player.name, partner.name)}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" data-action="event-skip" onClick={onRefuse} className={BUTTON_SECONDARY}>Bỏ qua</button>
        <button type="button" data-action="event-start" data-main-action onClick={onAccept} className={BUTTON_PRIMARY}>{intro.action}</button>
      </div>
      <p className="mt-3 text-xs text-neutral-300">Bỏ qua sự kiện không bị phạt, ván vẫn tiếp tục như thường.</p>
    </Panel>
  );
};

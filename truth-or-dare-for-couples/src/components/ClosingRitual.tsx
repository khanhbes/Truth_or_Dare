import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookHeart, Heart, MoonStar, Play, Square } from 'lucide-react';
import type { Player, PlayerIndex } from '../types';
import { soundEngine } from '../utils/audio';
import { JOURNAL_NOTE_MAX, type GameHighlight } from '../utils/gameJournal';
import { DURATION, EASE_OUT } from '../utils/motionTokens';
import { useDialogFocus } from './useDialogFocus';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FOCUS_RING } from './game/tableStyles';
import { useActionGuard } from './game/useActionGuard';

export interface ClosingResult {
  moments: [string | null, string | null];
  notes: [string, string];
}

interface ClosingRitualProps {
  players: readonly [Player, Player];
  highlights: readonly GameHighlight[];
  /** Changes when the Back button asks for the step before; before the first one comes the summary. */
  backRequestId: number;
  /** What the couple keeps in the journal; null when they keep nothing. */
  onFinish: (result: ClosingResult | null) => void;
}

const WHOLE_EVENING = 'Cả buổi tối';
const BREATH_SECONDS = 60;
/** Four seconds in, four seconds out. */
const BREATH_HALF = 4;

const KIND_LABELS: Record<GameHighlight['kind'], string> = {
  truth: 'Sự thật',
  dare: 'Thử thách',
  clothing: 'Trang phục',
  position: 'Tư thế',
  final: 'Lá cuối',
};

/** A minute of breathing together. Nothing moves with reduced motion; the words lead instead. */
const Breathing: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => {
  const [elapsed, setElapsed] = useState<number | null>(null);
  const running = elapsed !== null && elapsed < BREATH_SECONDS;
  useEffect(() => {
    if (!running) return;
    const timeout = window.setTimeout(() => setElapsed((value) => (value === null ? value : value + 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [running, elapsed]);
  const breathingIn = running && Math.floor(elapsed / BREATH_HALF) % 2 === 0;

  return (
    <div className="closing-breath">
      <span className="closing-breath__circle" data-in={breathingIn && !reduceMotion ? '' : undefined} aria-hidden="true">
        <Heart className="h-10 w-10 fill-rose-300/60 text-rose-100" />
      </span>
      <p role="status" className="min-h-6 text-base font-semibold text-rose-50">
        {running ? (breathingIn ? 'Hít vào thật chậm…' : 'Thở ra…') : elapsed === null ? '' : 'Ôm nhau thêm chút nữa nhé.'}
      </p>
      <button
        type="button"
        data-action="closing-breath"
        onClick={() => setElapsed(running ? null : 0)}
        className={`mt-1 flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-5 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/40 ${FOCUS_RING}`}
      >
        {running
          ? <><Square className="h-3.5 w-3.5" aria-hidden="true" /> Dừng · còn {BREATH_SECONDS - elapsed}s</>
          : <><Play className="h-4 w-4" aria-hidden="true" /> {elapsed === null ? 'Thở cùng nhau 1 phút' : 'Thêm 1 phút'}</>}
      </button>
    </div>
  );
};

type Step = 'rest' | 'moment-0' | 'moment-1' | 'notes';
const STEPS: readonly Step[] = ['rest', 'moment-0', 'moment-1', 'notes'];

/** After the last card: rest, the favourite moment of each player, a note for the other. Every step can be skipped. */
export const ClosingRitual: React.FC<ClosingRitualProps> = ({ players, highlights, backRequestId, onFinish }) => {
  const reduceMotion = Boolean(useReducedMotion());
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  // Nothing is lost by leaving, but Escape must not skip the end of an evening by accident.
  const panelRef = useDialogFocus<HTMLDivElement>({ initialFocusRef: titleRef });
  const [stepIndex, setStepIndex] = useState(0);
  const [moments, setMoments] = useState<ClosingResult['moments']>([null, null]);
  const [notes, setNotes] = useState<ClosingResult['notes']>(['', '']);
  const step = STEPS[stepIndex];
  const guarded = useActionGuard(stepIndex);

  useEffect(() => {
    soundEngine.setMusicHeat(0);
    soundEngine.play('closing');
  }, []);

  // The next step mounts once the last one has faded out; its title takes the focus then.
  const opened = useRef(false);
  const setTitle = useCallback((title: HTMLHeadingElement | null) => {
    titleRef.current = title;
    if (title && opened.current) title.focus({ preventScroll: true });
    if (title) opened.current = true;
  }, []);

  const go = (by: 1 | -1) => {
    soundEngine.playTick();
    setStepIndex((index) => Math.max(0, Math.min(STEPS.length - 1, index + by)));
  };
  const next = guarded(() => go(1));
  const previous = guarded(() => go(-1));
  const handledBackRef = useRef(backRequestId);
  useEffect(() => {
    if (backRequestId === handledBackRef.current) return;
    handledBackRef.current = backRequestId;
    if (stepIndex > 0) go(-1);
    else onFinish(null);
    // Once for each press.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backRequestId]);

  const pickMoment = (who: PlayerIndex, text: string) => {
    soundEngine.playTick();
    setMoments((current) => (who === 0
      ? [current[0] === text ? null : text, current[1]]
      : [current[0], current[1] === text ? null : text]));
  };
  const writeNote = (who: PlayerIndex, text: string) =>
    setNotes((current) => (who === 0 ? [text, current[1]] : [current[0], text]));

  const renderMoment = (who: PlayerIndex) => {
    const options = [{ id: 'evening', label: 'Không chỉ một lá', text: WHOLE_EVENING }, ...highlights.map((item) => ({
      id: item.id,
      label: `${KIND_LABELS[item.kind]} · lượt ${item.round}`,
      text: item.text,
    }))];
    return (
      <>
        <div className="closing__body">
          <h2 ref={setTitle} tabIndex={-1} id={titleId} className="closing__title">
            {players[who].avatar} {players[who].name} thích nhất lúc nào?
          </h2>
          <p className="closing__lead">Kể cho nhau nghe, rồi chọn một khoảnh khắc để nhớ.</p>
          <div role="group" aria-labelledby={titleId} className="closing__moments">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                data-action="closing-moment"
                aria-pressed={moments[who] === option.text}
                onClick={() => pickMoment(who, option.text)}
                className={`closing__moment ${FOCUS_RING}`}
              >
                <span className="text-xs font-semibold text-amber-200">{option.label}</span>
                <span className="text-sm leading-snug text-neutral-50">{option.text}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="closing__actions">
          <button type="button" data-action="closing-next" onClick={next} className={BUTTON_PRIMARY}>
            {moments[who] ? 'Tiếp' : 'Bỏ qua bước này'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? DURATION.instant : DURATION.slow }}
      className="closing"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div ref={panelRef} tabIndex={-1} className="closing__panel">
        <div className="closing__top">
          <div className="flex items-center">
            {stepIndex > 0 && (
              <button
                type="button"
                data-action="closing-back"
                onClick={previous}
                aria-label="Bước trước"
                className={`-ml-3 grid h-11 w-11 place-items-center rounded-full text-neutral-200 transition-colors hover:text-white ${FOCUS_RING}`}
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <span className="text-xs font-semibold tabular-nums text-rose-100">
              Khép lại · {step === 'rest' ? 1 : step === 'notes' ? 3 : 2}/3
            </span>
          </div>
          <button
            type="button"
            data-action="closing-skip"
            onClick={() => onFinish(null)}
            className={`min-h-11 rounded-full px-3 text-sm font-semibold text-neutral-200 transition-colors hover:text-white ${FOCUS_RING}`}
          >
            Xem tổng kết
          </button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className="closing__step"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(10px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? DURATION.instant : DURATION.base, ease: EASE_OUT }}
          >
            {step === 'rest' && (
              <>
                <div className="closing__body">
                  <span className="closing__seal" aria-hidden="true"><MoonStar className="h-6 w-6" /></span>
                  <h2 ref={setTitle} tabIndex={-1} id={titleId} className="closing__title">Nghỉ một chút, ôm nhau nhé</h2>
                  <p className="closing__lead">
                    Ván đã khép lại. Nằm sát vào nhau, uống chút nước, hỏi nhau thấy thế nào.
                  </p>
                  <Breathing reduceMotion={reduceMotion} />
                </div>
                <div className="closing__actions">
                  <button type="button" data-action="closing-next" onClick={next} className={BUTTON_PRIMARY}>
                    Tiếp <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
            {step === 'moment-0' && renderMoment(0)}
            {step === 'moment-1' && renderMoment(1)}
            {step === 'notes' && (
              <>
                <div className="closing__body">
                  <span className="closing__seal" aria-hidden="true"><BookHeart className="h-6 w-6" /></span>
                  <h2 ref={setTitle} tabIndex={-1} id={titleId} className="closing__title">Nhắn cho nhau một câu</h2>
                  <p className="closing__lead">Một lời cảm ơn, một điều muốn lặp lại. Để trống cũng được.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {([0, 1] as const).map((who) => (
                      <label key={who} className="block text-left">
                        <span className="text-sm font-semibold text-white">
                          {players[who].name} nhắn {players[who === 0 ? 1 : 0].name}
                        </span>
                        <textarea
                          value={notes[who]}
                          maxLength={JOURNAL_NOTE_MAX}
                          rows={4}
                          onChange={(event) => writeNote(who, event.target.value)}
                          placeholder="Viết vài chữ…"
                          className="closing__note"
                        />
                        <span className="block text-right text-xs tabular-nums text-neutral-300">{notes[who].length}/{JOURNAL_NOTE_MAX}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-balance text-xs leading-relaxed text-neutral-300">
                    Nhật ký chỉ nằm trên máy này, không gửi lên mạng. Xóa được bất cứ lúc nào ở trang đầu.
                  </p>
                </div>
                <div className="closing__actions">
                  <button type="button" data-action="closing-discard" onClick={guarded(() => onFinish(null))} className={BUTTON_SECONDARY}>Không lưu</button>
                  <button type="button" data-action="closing-save" onClick={guarded(() => onFinish({ moments, notes }))} className={BUTTON_PRIMARY}>Lưu vào nhật ký</button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

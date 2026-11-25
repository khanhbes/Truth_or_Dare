import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useDialogFocus } from '../useDialogFocus';
import { BUTTON_PRIMARY, FOCUS_RING } from './tableStyles';
import { useActionGuard } from './useActionGuard';

const SEEN_KEY = 'tod_couples_table_guide';

export const hasSeenTableGuide = (): boolean => {
  // Without storage the guide would come back in every game.
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; }
};

const rememberTableGuide = () => {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* not remembered */ }
};

interface GuideStep {
  /** The first visible one is pointed at. */
  anchors: readonly string[];
  title: string;
  text: string;
}

const STEPS: readonly GuideStep[] = [
  {
    anchors: ['.table-actions__main', '.game-stage__center'],
    title: 'Nút vàng là việc kế tiếp',
    text: 'Rút bài, xem nội dung, hoàn thành: luôn ở chỗ này. Không thích lá nào thì bỏ qua, không ai bị ép.',
  },
  {
    anchors: ['.game-header__progress'],
    title: 'Làm lá nào, Tim Hồng đầy thêm',
    text: 'Mỗi lá hoàn thành còn cho sao để đổi lá. Tim đầy 100% và cởi hết đồ qua lá bài thì Bộ Tư thế mở.',
  },
  {
    anchors: ['[data-guide="safety"]', '.game-header__tools'],
    title: 'Nghỉ hoặc ẩn lúc nào cũng được',
    text: 'Tạm dừng làm đồng hồ đứng lại. Ẩn nhanh che cả màn hình trong một chạm. Bấm nhầm thì có 5 giây để hoàn tác.',
  },
];

interface Box { top: number; left: number; width: number; height: number }

const PANEL_WIDTH = 336;
const EDGE = 12;

const findAnchor = (step: GuideStep): HTMLElement | null => {
  for (const selector of step.anchors) {
    const found = [...document.querySelectorAll<HTMLElement>(`.game-root ${selector}`)]
      .find((element) => element.getClientRects().length > 0);
    if (found) return found;
  }
  return null;
};

/** Three short steps on the table itself, the first time a couple plays. */
export const TableGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const textId = useId();
  const finish = () => {
    rememberTableGuide();
    onClose();
  };
  const panelRef = useDialogFocus<HTMLDivElement>({ onEscape: finish, initialFocusRef: nextRef });
  const guarded = useActionGuard(index);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  useLayoutEffect(() => {
    const anchor = findAnchor(step);
    anchor?.scrollIntoView({ block: 'center', behavior: 'auto' });
    const measure = () => {
      const rect = findAnchor(step)?.getBoundingClientRect();
      setBox(rect ? { top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 } : null);
    };
    measure();
    // The table may still be settling (web fonts, the entrance of the screen).
    const timeout = window.setTimeout(measure, 350);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step]);

  const viewportW = document.documentElement.clientWidth;
  const viewportH = window.innerHeight;
  const width = Math.min(PANEL_WIDTH, viewportW - EDGE * 2);
  const below = box !== null && box.top + box.height / 2 < viewportH / 2;
  const panelStyle: React.CSSProperties = box
    ? {
        width,
        left: Math.max(EDGE, Math.min(viewportW - width - EDGE, box.left + box.width / 2 - width / 2)),
        ...(below ? { top: box.top + box.height + 14 } : { bottom: viewportH - box.top + 14 }),
      }
    : { width, left: (viewportW - width) / 2, top: viewportH / 3 };

  return createPortal(
    <div className="table-guide" role="presentation">
      {box
        ? <span className="table-guide__hole" style={box} aria-hidden="true" />
        : <span className="table-guide__dim" aria-hidden="true" />}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        className="table-guide__panel"
        style={panelStyle}
      >
        <p className="text-xs font-semibold tabular-nums text-amber-200">Hướng dẫn · {index + 1}/{STEPS.length}</p>
        <h2 id={titleId} className="mt-1 font-serif-romantic text-xl font-bold text-white">{step.title}</h2>
        <p id={textId} className="mt-1.5 text-sm leading-relaxed text-neutral-100" aria-live="polite">{step.text}</p>
        <div className="mt-4 flex items-center gap-2">
          {!last && (
            <button
              type="button"
              data-action="guide-skip"
              onClick={finish}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold text-neutral-200 transition-colors hover:text-white ${FOCUS_RING}`}
            >
              Bỏ qua
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            data-action="guide-next"
            onClick={guarded(() => (last ? finish() : setIndex(index + 1)))}
            className={BUTTON_PRIMARY}
          >
            {last ? <>Chơi thôi <Check className="h-4 w-4" aria-hidden="true" /></> : <>Tiếp <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

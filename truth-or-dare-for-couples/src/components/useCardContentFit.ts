import { useLayoutEffect, useRef, useState } from 'react';

// The card collection can show hundreds of cards at once. Measuring and then
// writing one card at a time would force a layout per card, so all pending
// cards are measured together, then written together, once per frame.
interface FitJob {
  /** Reads the layout; returns the style write to apply, if any. */
  measure: () => (() => void) | null;
  /** Runs after every write has been applied. */
  after: () => void;
}

const pendingFits = new Set<FitJob>();
let fitFrame = 0;

const runPendingFits = () => {
  fitFrame = 0;
  const jobs = [...pendingFits];
  pendingFits.clear();
  jobs.map((job) => job.measure()).forEach((write) => write?.());
  jobs.forEach((job) => job.after());
};

const scheduleFit = (job: FitJob) => {
  pendingFits.add(job);
  if (!fitFrame) fitFrame = requestAnimationFrame(runPendingFits);
};

/** Smallest text size, as a share of the size chosen for the card. */
const MIN_TEXT_SHRINK = 0.78;

/**
 * Keeps a card's content inside its fixed frame.
 *
 * The content area (the returned ref) holds one block: the icon box, marked
 * with `data-card-icon`, then the text. When the text needs more room, the
 * icon gives it up first: this hook sets `--icon-max` on the area (see
 * `.card-fit-area [data-card-icon]` in index.css) so the icon shrinks just
 * enough for the text to fit, down to `minIconPx`. Then the text itself shrinks
 * a little (`--text-shrink`). Only text that still does not fit scrolls, and
 * `hasMoreBelow` then drives a fade at the bottom.
 *
 * `fitKey` changes whenever the content does (card id, reveal state, density…).
 *
 * Not for card grids: their cells are off-screen `content-visibility: auto`
 * boxes, and measuring one makes the browser lay it out, so with hundreds of
 * cards it costs seconds. Grid cards cap the icon in CSS instead
 * (`.card-fit-static`); pass `enabled: false` there.
 */
export function useCardContentFit<T extends HTMLElement>(fitKey: string, { enabled = true, minIconPx = 44 } = {}) {
  const ref = useRef<T>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useLayoutEffect(() => {
    const area = ref.current;
    if (!area || !enabled) {
      setHasMoreBelow(false);
      return;
    }
    area.scrollTop = 0;
    area.style.removeProperty('--text-shrink');

    const updateMore = () => setHasMoreBelow(area.scrollHeight - area.scrollTop - area.clientHeight > 4);
    const job: FitJob = {
      measure: () => {
        const block = area.firstElementChild as HTMLElement | null;
        if (!block) return null;
        const icon = block.querySelector<HTMLElement>('[data-card-icon]');
        const areaStyle = getComputedStyle(area);
        const available = area.clientHeight
          - parseFloat(areaStyle.paddingTop)
          - parseFloat(areaStyle.paddingBottom);
        const iconGap = icon ? parseFloat(getComputedStyle(icon).marginBottom) || 0 : 0;
        // Everything except the icon (banner, text, hint). The icon's current
        // size cancels out, so a running size transition does not matter.
        const rest = block.offsetHeight - (icon ? icon.offsetHeight + iconGap : 0);
        const room = available - (icon ? minIconPx + iconGap : 0);
        const shrink = Number(area.style.getPropertyValue('--text-shrink')) || 1;
        // Only ever smaller for one card and size, so the two sizes cannot chase each other.
        const nextShrink = rest > room + 1 && room > 0 && shrink > MIN_TEXT_SHRINK
          ? Math.max(MIN_TEXT_SHRINK, shrink * Math.max(0.86, Math.sqrt(room / rest)) * 0.99)
          : shrink;
        const nextIcon = icon ? `${Math.max(minIconPx, Math.floor(available - rest - iconGap))}px` : '';
        const iconChanged = area.style.getPropertyValue('--icon-max') !== nextIcon;
        const shrinkChanged = nextShrink < shrink;
        if (!iconChanged && !shrinkChanged) return null;
        return () => {
          if (iconChanged) {
            if (nextIcon) area.style.setProperty('--icon-max', nextIcon);
            else area.style.removeProperty('--icon-max');
          }
          if (shrinkChanged) area.style.setProperty('--text-shrink', nextShrink.toFixed(3));
        };
      },
      after: updateMore,
    };

    // First fit before the browser paints, so the text never jumps in front of the players.
    for (let pass = 0; pass < 4; pass += 1) {
      const write = job.measure();
      if (!write) break;
      write();
    }
    updateMore();

    const fit = () => scheduleFit(job);
    let lastHeight = area.clientHeight;
    area.addEventListener('scroll', updateMore, { passive: true });
    const observer = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
        if (Math.abs(area.clientHeight - lastHeight) > 1) {
          lastHeight = area.clientHeight;
          area.style.removeProperty('--text-shrink');
        }
        fit();
      })
      : null;
    observer?.observe(area);
    if (area.firstElementChild) observer?.observe(area.firstElementChild);
    return () => {
      pendingFits.delete(job);
      area.removeEventListener('scroll', updateMore);
      observer?.disconnect();
    };
  }, [fitKey, enabled, minIconPx]);

  return { ref, hasMoreBelow };
}

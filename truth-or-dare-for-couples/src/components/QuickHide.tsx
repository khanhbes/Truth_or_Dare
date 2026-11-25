import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from './useDialogFocus';

/** What the tab is called while the game is hidden. */
const NEUTRAL_TITLE = 'Ghi chú';
const NEUTRAL_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="18" y="10" width="64" height="80" rx="8" fill="#eceae4" stroke="#8d8a82" stroke-width="6"/><path d="M32 34h36M32 50h36M32 66h22" stroke="#8d8a82" stroke-width="6" stroke-linecap="round"/></svg>',
)}`;

/** Tab title and icon say "Ghi chú" while `active`. */
export const useDiscreetTab = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const title = document.title;
    const icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const href = icon?.getAttribute('href') ?? null;
    document.title = NEUTRAL_TITLE;
    icon?.setAttribute('href', NEUTRAL_ICON);
    return () => {
      document.title = title;
      if (icon && href !== null) icon.setAttribute('href', href);
    };
  }, [active]);
};

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

/** H hides everything and brings it back, also while a dialog is open. */
export const useQuickHideKey = (enabled: boolean, onToggle: () => void) => {
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() !== 'h' || isTyping(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      toggleRef.current();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);
};

const NOTES = ['Mua sữa, trứng, rau', 'Đóng tiền điện', 'Gọi thợ xem vòi nước', 'Trả sách thư viện', 'Đặt lịch bảo dưỡng xe'];

/** A plain notes page over the whole game. Nothing of the game is visible, heard or read out. */
export const QuickHide: React.FC<{ onReturn: () => void }> = ({ onReturn }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Escape does nothing: only the button or H brings the game back.
  const pageRef = useDialogFocus<HTMLDivElement>({ initialFocusRef: titleRef });

  return createPortal(
    <div ref={pageRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={NEUTRAL_TITLE} className="quick-hide">
      <div className="quick-hide__page">
        <header>
          <h1 ref={titleRef} tabIndex={-1}>{NEUTRAL_TITLE}</h1>
          <button type="button" data-action="quick-return" onClick={onReturn}>Mở lại</button>
        </header>
        <ul>
          {NOTES.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </div>
    </div>,
    document.body,
  );
};

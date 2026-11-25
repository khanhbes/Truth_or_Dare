import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface OpenDialog {
  getElement: () => HTMLElement | null;
}

// Dialogs can stack (a confirmation over Statistics) or overlap while one is
// still animating out. Only the one on top reacts to the keyboard.
const openDialogs: OpenDialog[] = [];
let bodyOverflowBefore = '';
let bodyPaddingBefore = '';

// Read when the page has been laid out anyway: asking while a dialog opens would force an extra layout.
let scrollbarWidth = 0;
if (typeof ResizeObserver !== 'undefined' && typeof document !== 'undefined') {
  new ResizeObserver(() => {
    if (openDialogs.length === 0) scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  }).observe(document.documentElement);
}

const topDialog = (): OpenDialog | undefined => openDialogs[openDialogs.length - 1];

/** True while any dialog is open (the table's keyboard shortcuts pause then). */
export const isDialogOpen = (): boolean => openDialogs.length > 0;

interface DialogFocusOptions {
  /** Called on Escape. Leave out for dialogs that must be answered. */
  onEscape?: () => void;
  /** Receives focus when the dialog opens; otherwise the first control does. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** For dialogs that stay mounted while closed. */
  enabled?: boolean;
}

/**
 * Keyboard behaviour shared by every dialog: moves focus in, keeps Tab inside,
 * closes on Escape, stops the page behind from scrolling, and gives focus back.
 * Attach the returned ref to the dialog panel (with `tabIndex={-1}`).
 */
export function useDialogFocus<T extends HTMLElement>({
  onEscape,
  initialFocusRef,
  enabled = true,
}: DialogFocusOptions = {}) {
  const dialogRef = useRef<T>(null);
  // The table re-renders every timer tick; keep the latest callback without re-running the effect.
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return;
    const dialog: OpenDialog = { getElement: () => dialogRef.current };
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (openDialogs.length === 0) {
      bodyOverflowBefore = document.body.style.overflow;
      bodyPaddingBefore = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';
      // Takes the place of the scrollbar, so the page behind does not jump sideways.
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.documentElement.dataset.dialogOpen = '';
    }
    openDialogs.push(dialog);

    const getFocusable = (): HTMLElement[] => [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []),
    ].filter((element) => element.getClientRects().length > 0);

    const focusFrame = window.requestAnimationFrame(() => {
      (initialFocusRef?.current ?? getFocusable()[0] ?? dialogRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (topDialog() !== dialog) return;
      if (event.key === 'Escape') {
        if (!onEscapeRef.current) return;
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      const index = openDialogs.indexOf(dialog);
      if (index !== -1) openDialogs.splice(index, 1);
      if (openDialogs.length === 0) {
        document.body.style.overflow = bodyOverflowBefore;
        document.body.style.paddingRight = bodyPaddingBefore;
        delete document.documentElement.dataset.dialogOpen;
      }
      // A dialog that opened meanwhile keeps the focus, unless focus belongs inside it.
      const remaining = topDialog()?.getElement();
      if (previouslyFocused?.isConnected && (!remaining || remaining.contains(previouslyFocused))) {
        previouslyFocused.focus();
      }
    };
    // Runs once per opening; the latest onEscape is read through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return dialogRef;
}

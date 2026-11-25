import { useEffect } from 'react';
import { isDialogOpen } from '../useDialogFocus';

const press = (selector: string): boolean => {
  const button = [...document.querySelectorAll<HTMLButtonElement>(selector)]
    .find((element) => element.getClientRects().length > 0 && !element.disabled);
  button?.click();
  return Boolean(button);
};

/**
 * Space or Enter does the main action, S skips, R rerolls, P pauses. Buttons
 * that have the focus keep their own Space and Enter.
 */
export const useTableShortcuts = (enabled: boolean, onPause: () => void) => {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isDialogOpen()) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (event.repeat) {
        // The focus follows the main button, so a key held down would play on by itself.
        if ((key === ' ' || key === 'enter') && target?.closest('[data-main-action]')) event.preventDefault();
        return;
      }
      let handled = false;
      if (key === ' ' || key === 'enter') {
        if (target?.closest('button, a, [role="button"], [role="menuitem"]')) return;
        handled = press('[data-main-action]');
      } else if (key === 's') handled = press('[data-action="skip"]');
      else if (key === 'r') handled = press('[data-action="reroll"]');
      else if (key === 'p') {
        onPause();
        handled = true;
      }
      if (handled) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onPause]);
};

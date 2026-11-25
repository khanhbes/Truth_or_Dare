import { useCallback, useEffect, useRef, useState } from 'react';
import { TABLE_TIMING } from '../../utils/motionTokens';

export interface UndoWindow<T> {
  id: number;
  data: T;
  /** What had to wait until the turn is final. */
  onClose: () => void;
}

/**
 * Keeps the last turn reversible for a few seconds. `close` makes it final, `take` hands
 * back what is needed to undo it. Leaving the page or the table makes it final too.
 */
export const useUndoWindow = <T,>(held: boolean) => {
  const [pending, setPending] = useState<UndoWindow<T> | null>(null);
  const pendingRef = useRef<UndoWindow<T> | null>(null);
  const remainingRef = useRef<number>(TABLE_TIMING.undo);

  const close = useCallback(() => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    current.onClose();
  }, []);

  const open = useCallback((data: T, onClose: () => void) => {
    close();
    const next = { id: Date.now(), data, onClose };
    remainingRef.current = TABLE_TIMING.undo;
    pendingRef.current = next;
    setPending(next);
  }, [close]);

  const take = useCallback((): T | null => {
    const current = pendingRef.current;
    if (!current) return null;
    pendingRef.current = null;
    setPending(null);
    return current.data;
  }, []);

  useEffect(() => {
    if (!pending || held) return;
    const startedAt = performance.now();
    const timeout = window.setTimeout(close, remainingRef.current);
    return () => {
      window.clearTimeout(timeout);
      remainingRef.current = Math.max(600, remainingRef.current - (performance.now() - startedAt));
    };
  }, [pending, held, close]);

  useEffect(() => {
    window.addEventListener('pagehide', close);
    return () => {
      window.removeEventListener('pagehide', close);
      close();
    };
  }, [close]);

  return { pending, open, close, take };
};

import { useLayoutEffect, useRef } from 'react';
import { TABLE_TIMING } from '../../utils/motionTokens';

/** Clicks right after the screen changes are ignored, so a double click never does two things. */
export const useActionGuard = (...changes: readonly unknown[]) => {
  const lastChangeRef = useRef(0);
  useLayoutEffect(() => {
    lastChangeRef.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, changes);
  return (action: () => void) => () => {
    if (performance.now() - lastChangeRef.current >= TABLE_TIMING.actionGuard) action();
  };
};

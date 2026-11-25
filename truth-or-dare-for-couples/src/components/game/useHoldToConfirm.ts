import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { TABLE_TIMING } from '../../utils/motionTokens';

/**
 * Press and hold to confirm, with a mouse, a finger or the keyboard. A click
 * without any press comes from assistive technology and confirms right away.
 */
export const useHoldToConfirm = (onConfirm: () => void, enabled = true, ms: number = TABLE_TIMING.holdToConfirm) => {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef(0);
  const pressedRef = useRef(false);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const cancel = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = 0;
    setHolding(false);
  };
  const start = () => {
    if (!enabled || timerRef.current) return;
    pressedRef.current = true;
    setHolding(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = 0;
      setHolding(false);
      onConfirmRef.current();
    }, ms);
  };

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return {
    holding,
    holdProps: {
      onPointerDown: (event: PointerEvent) => { if (event.button === 0) start(); },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (event: MouseEvent) => event.preventDefault(),
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) start();
      },
      onKeyUp: (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        cancel();
      },
      onBlur: cancel,
      onClick: (event: MouseEvent) => {
        const pressed = pressedRef.current;
        pressedRef.current = false;
        if (enabled && !pressed && event.detail === 0) onConfirmRef.current();
      },
    },
  };
};

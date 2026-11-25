import { useEffect } from 'react';

/** A table nobody has touched for this long may dim like any other page. */
const IDLE_LIMIT_MS = 10 * 60 * 1000;

/**
 * Keeps the screen on while a game is on the table: a dare leaves the phone untouched
 * for a minute or two, which is when it would lock. The browser drops the lock when the
 * page goes to the background, so it is asked for again on the way back.
 */
export const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let asking = false;
    let over = false;
    let idleTimer = 0;

    const release = () => {
      const held = lock;
      lock = null;
      void held?.release().catch(() => undefined);
    };
    const request = async () => {
      if (over || lock || asking || document.visibilityState !== 'visible') return;
      asking = true;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (over) {
          void next.release().catch(() => undefined);
        } else {
          lock = next;
          next.addEventListener('release', () => { if (lock === next) lock = null; });
        }
      } catch {
        // Battery saver or a blocked permission: the screen simply follows its own settings.
      }
      asking = false;
    };
    const onActivity = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(release, IDLE_LIMIT_MS);
      void request();
    };

    onActivity();
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    document.addEventListener('visibilitychange', onActivity);
    return () => {
      over = true;
      window.clearTimeout(idleTimer);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      document.removeEventListener('visibilitychange', onActivity);
      release();
    };
  }, [active]);
};

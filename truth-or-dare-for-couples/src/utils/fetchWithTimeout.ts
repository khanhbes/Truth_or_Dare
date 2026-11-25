/** Longest wait for a request the first screen depends on. */
export const SESSION_TIMEOUT_MS = 8000;

/** fetch() that gives up instead of leaving the loading screen on forever. */
export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = SESSION_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

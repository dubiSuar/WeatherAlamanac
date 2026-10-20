/**
 * fetch() with a deadline.
 *
 * React Native's fetch has no default timeout: on Android, OkHttp will wait on
 * a stalled connection indefinitely, which leaves a spinner up forever. Every
 * network call in the app goes through here so a dead network fails in a
 * bounded time with an error the UI can show.
 *
 * An outer `signal` (for cancelling when the user moves on) is honoured too.
 */
export async function fetchWithTimeout(url, { timeout = 12000, signal, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const onOuterAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onOuterAbort);
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}

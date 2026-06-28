/**
 * Single choke point for reporting errors we don't surface to the user
 * (e.g. background update checks, best-effort network calls). Today this
 * just logs to the console; swap the implementation here for a real
 * crash-reporting SDK (Sentry, Bugsnag, etc.) later, without touching
 * every call site.
 */
export function logError(scope: string, err: unknown) {
  console.warn(`[${scope}]`, err);
}

import type { Context } from "hono";

/**
 * "Today" must mean the *user's* calendar day, not the server's UTC day.
 *
 * The mobile client sends an `x-timezone-offset` header carrying
 * `new Date().getTimezoneOffset()` — the minutes local time is BEHIND UTC
 * (US-Eastern EDT = 240, US-Pacific PDT = 420). Without it, a UTC day boundary
 * rolls over at ~5–8pm local, so an afternoon reading reads back as "yesterday"
 * all evening — which is exactly why the "done today" / group checkmark state
 * kept flickering off for real users. Everything that asks "did this happen
 * today?" should bound its window with this helper instead of `toISOString()`.
 */
export function localDayWindow(offsetMinutes: number): { start: Date; end: Date } {
  const offset = Number.isFinite(offsetMinutes) ? offsetMinutes : 0;
  // Shift the instant by the offset so its UTC calendar fields read as local,
  // then take that local calendar date.
  const localDate = new Date(Date.now() - offset * 60_000).toISOString().slice(0, 10);
  // Local midnight expressed back in UTC = UTC-midnight-of(localDate) + offset.
  const startMs = new Date(localDate + "T00:00:00.000Z").getTime() + offset * 60_000;
  return { start: new Date(startMs), end: new Date(startMs + 86_400_000) };
}

/** Local-day window derived from the request's `x-timezone-offset` header (UTC fallback). */
export function clientDayWindow(c: Context): { start: Date; end: Date } {
  const raw = c.req.header("x-timezone-offset");
  const parsed = raw == null ? NaN : Number(raw);
  return localDayWindow(Number.isFinite(parsed) ? parsed : 0);
}

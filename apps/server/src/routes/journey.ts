import { Hono } from "hono";
import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  devotionalSubmissions,
  devotionalDays,
  devotionalPlans,
  communityResponses,
  communityDevotionals,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import {
  CANON,
  bookVerseTotal,
  chaptersTouched,
  coverageByBook,
  parsePassage,
} from "../lib/bible-coverage.js";
import { chapterLengths } from "../lib/bible-lengths.js";

/**
 * Your Bible Journey — how much of the Bible a man has actually read this year.
 *
 * Nothing here is stored. Every reading already carries the day it happened, so
 * a year is a filter over history rather than a counter that has to be reset:
 * January 1 takes care of itself, and no past year is ever lost.
 */
export const journey = new Hono<AppEnv>();

journey.use("*", requireAuth);

type Reading = { ref: string; source: string; at: Date };

/** Every passage this user finished inside the given year. */
async function readingsInYear(userId: string, from: Date, to: Date): Promise<Reading[]> {
  // Plan days: a day counts the moment it's answered, whether or not the plan
  // it belongs to is finished, and whether it was read alone or with a group.
  const planRows = await db
    .select({
      ref: devotionalDays.chapter,
      source: devotionalPlans.title,
      at: devotionalSubmissions.submittedAt,
    })
    .from(devotionalSubmissions)
    .innerJoin(
      devotionalDays,
      and(
        eq(devotionalDays.planId, devotionalSubmissions.planId),
        eq(devotionalDays.dayNumber, devotionalSubmissions.dayNumber)
      )
    )
    .innerJoin(devotionalPlans, eq(devotionalPlans.id, devotionalSubmissions.planId))
    .where(
      and(
        eq(devotionalSubmissions.userId, userId),
        gte(devotionalSubmissions.submittedAt, from),
        lt(devotionalSubmissions.submittedAt, to)
      )
    )
    .orderBy(asc(devotionalSubmissions.submittedAt));

  // The daily community reading is Bible too — it counts the same way.
  const communityRows = await db
    .select({
      ref: communityDevotionals.passageReference,
      source: communityDevotionals.title,
      at: communityResponses.createdAt,
    })
    .from(communityResponses)
    .innerJoin(
      communityDevotionals,
      eq(communityDevotionals.id, communityResponses.communityDevotionalId)
    )
    .where(
      and(
        eq(communityResponses.userId, userId),
        gte(communityResponses.createdAt, from),
        lt(communityResponses.createdAt, to)
      )
    )
    .orderBy(asc(communityResponses.createdAt));

  return [...planRows, ...communityRows].sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Years this user has any reading in, newest first — what the year picker offers. */
async function yearsWithReading(userId: string): Promise<number[]> {
  const [planYears, communityYears] = await Promise.all([
    db
      .select({ year: sql<number>`EXTRACT(YEAR FROM ${devotionalSubmissions.submittedAt})::int` })
      .from(devotionalSubmissions)
      .where(eq(devotionalSubmissions.userId, userId))
      .groupBy(sql`1`),
    db
      .select({ year: sql<number>`EXTRACT(YEAR FROM ${communityResponses.createdAt})::int` })
      .from(communityResponses)
      .where(eq(communityResponses.userId, userId))
      .groupBy(sql`1`),
  ]);

  const years = new Set<number>();
  for (const r of [...planYears, ...communityYears]) years.add(Number(r.year));
  // The current year is always offered, even before the first reading of it —
  // an empty January should look like a fresh start, not a missing year.
  years.add(new Date().getUTCFullYear());
  return [...years].sort((a, b) => b - a);
}

// GET /api/journey?year=2026
journey.get("/", async (c) => {
  const userId = c.var.user.id;

  const requested = Number(c.req.query("year"));
  const year =
    Number.isInteger(requested) && requested >= 1970 && requested <= 9999
      ? requested
      : new Date().getUTCFullYear();

  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));

  const [lengths, readings, availableYears] = await Promise.all([
    chapterLengths(),
    readingsInYear(userId, from, to),
    yearsWithReading(userId),
  ]);

  const covered = coverageByBook(
    readings.map((r) => r.ref),
    lengths
  );

  // What took you into each book — the tap-through on a book row. Only books
  // that actually gained coverage get entries, so a row can never show a list
  // of readings behind a bar sitting at nothing (which is what a reference to a
  // chapter the book doesn't have would otherwise produce).
  const entriesByBook = new Map<string, { ref: string; source: string; at: string }[]>();
  for (const r of readings) {
    const book = parsePassage(r.ref)[0]?.book;
    if (!book || !covered.has(book)) continue;
    const list = entriesByBook.get(book) ?? [];
    list.push({ ref: r.ref, source: r.source, at: r.at.toISOString() });
    entriesByBook.set(book, list);
  }

  const books = CANON.map((meta) => {
    const verses = covered.get(meta.book);
    const versesRead = verses?.size ?? 0;
    const versesTotal = bookVerseTotal(lengths, meta.book);
    return {
      ...meta,
      versesRead,
      versesTotal,
      chaptersRead: verses ? chaptersTouched(verses) : 0,
      // A book is finished only when every verse of it has been read. A near
      // miss shows its real number rather than being rounded into a check mark.
      complete: versesTotal > 0 && versesRead >= versesTotal,
      entries: entriesByBook.get(meta.book) ?? [],
    };
  });

  const totals = {
    books: books.filter((b) => b.versesRead > 0).length,
    booksComplete: books.filter((b) => b.complete).length,
    chapters: books.reduce((n, b) => n + b.chaptersRead, 0),
    versesRead: books.reduce((n, b) => n + b.versesRead, 0),
    // Distinct calendar days, so the two copies of a plan read with a group and
    // on your own count as the one day it actually was.
    days: new Set(readings.map((r) => r.at.toISOString().slice(0, 10))).size,
  };

  return c.json({ year, availableYears, totals, books });
});

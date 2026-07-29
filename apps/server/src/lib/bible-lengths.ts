/**
 * How long every chapter of the Bible is, read from the stored text.
 *
 * Kept apart from bible-coverage.ts so the parsing and coverage math stays
 * pure and testable without a database — this is the one piece that needs one.
 */

import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { bibleChapters } from "../db/schema.js";
import type { ChapterLengths } from "./bible-coverage.js";

let cached: Promise<ChapterLengths> | null = null;

/**
 * Chapter lengths straight from the stored Bible text, so the denominator is
 * the real one — Matthew is 1,071 verses because that's what's in the table,
 * not because a constant somewhere says so. Cached for the life of the process;
 * the Bible does not get longer.
 */
export function chapterLengths(): Promise<ChapterLengths> {
  if (!cached) {
    cached = db
      .select({
        book: bibleChapters.book,
        chapter: bibleChapters.chapter,
        verses: sql<number>`jsonb_array_length(${bibleChapters.verses})`,
      })
      .from(bibleChapters)
      .where(eqKjv())
      .then((rows) => {
        const map: ChapterLengths = new Map();
        for (const r of rows) {
          let byChapter = map.get(r.book);
          if (!byChapter) map.set(r.book, (byChapter = new Map()));
          byChapter.set(r.chapter, Number(r.verses));
        }
        return map;
      })
      .catch((err) => {
        // Don't poison the cache — a failed load should be retried, not
        // remembered as an empty Bible.
        cached = null;
        throw err;
      });
  }
  return cached;
}

// Verse numbering is the same across the seeded translations, so the KJV rows
// alone give every chapter length without reading the text twice.
function eqKjv() {
  return sql`${bibleChapters.translation} = 'KJV'`;
}

/**
 * Turning passage references into verses actually read.
 *
 * Every devotional day carries its passage as free text ("Ephesians 1:1–14",
 * "Psalm 46:10"). Your Bible Journey needs that as a SET of verses, so a book
 * can be measured against its real length and two plans covering the same
 * ground are counted once, not twice.
 *
 * Coverage is a set, never a tally — a passage read in a group plan and again
 * in the personal copy of it (which the app deliberately keeps as two separate
 * runs) is the same ground walked twice, not twice as much Bible.
 */

const BOOK_NAMES = [
  // Old Testament (39)
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
  // New Testament (27)
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy",
  "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
  "Jude", "Revelation",
];

const OT_COUNT = 39;

export type CanonBook = { book: string; testament: "OT" | "NT"; bookOrder: number };

/** All 66 books in reading order — the fixed spine of the Journey screen. */
export const CANON: CanonBook[] = BOOK_NAMES.map((book, i) => ({
  book,
  testament: i < OT_COUNT ? "OT" : "NT",
  bookOrder: i + 1,
}));

const CANON_BY_LOWER = new Map(BOOK_NAMES.map((b) => [b.toLowerCase(), b]));

/**
 * Fold the ways a book gets written down onto its canonical name.
 *
 * Mirrors the alias rules in the plan generator, plus "Psalm" → "Psalms": the
 * seeded plans say "Psalm 46:10" while the Bible text is stored under "Psalms",
 * so without this every Psalms reading would silently count for nothing.
 */
export function normalizeBookName(raw: string): string | null {
  const key = raw
    .toLowerCase()
    .trim()
    .replace(/\./g, "")
    .replace(/^(the book of |book of |the )/, "")
    .replace(/\bfirst\b/, "1")
    .replace(/\bsecond\b/, "2")
    .replace(/\bthird\b/, "3")
    .replace(/^i{3} /, "3 ")
    .replace(/^i{2} /, "2 ")
    .replace(/^i /, "1 ")
    .replace(/^([123])(st|nd|rd) /, "$1 ")
    .replace(/\bpsalm\b/, "psalms")
    .replace(/\bsong of songs\b/, "song of solomon")
    .replace(/\bsong of sol\b/, "song of solomon")
    .replace(/\bcanticles?\b/, "song of solomon")
    .replace(/\brevelations\b/, "revelation")
    .replace(/\s+/g, " ")
    .trim();
  return CANON_BY_LOWER.get(key) ?? null;
}

/**
 * A run of verses inside one chapter. `to: null` means "to the end of the
 * chapter", which is only resolvable once we know how long the chapter is.
 */
export type Segment = { book: string; chapter: number; from: number; to: number | null };

/**
 * Break a passage reference into per-chapter verse runs.
 *
 * Handles what the library actually contains ("Ephesians 1:1–14", "Psalm
 * 46:10") plus the shapes a generated plan could plausibly produce: a whole
 * chapter ("Romans 8"), a chapter span ("Romans 8-9"), a passage crossing a
 * chapter line ("Romans 8:31-9:5"), and comma-separated groups ("Romans
 * 8:1-4, 12-17"). Anything it can't read returns empty rather than guessing —
 * an unreadable reference should cost a man nothing, not credit him wrongly.
 */
export function parsePassage(ref: string): Segment[] {
  // En/em dashes and minus signs all mean "through" here.
  const cleaned = ref
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ");
  const m = cleaned.match(/^((?:[1-3] )?[A-Za-z][A-Za-z' ]*?) (\d.*)$/);
  if (!m) return [];

  const book = normalizeBookName(m[1]!);
  if (!book) return [];

  const rest = m[2]!.replace(/\s/g, "");
  const out: Segment[] = [];
  let chapter: number | null = null;

  for (const part of rest.split(",")) {
    if (!part) continue;
    let g: RegExpMatchArray | null;

    if ((g = part.match(/^(\d+):(\d+)-(\d+):(\d+)$/))) {
      const [c1, v1, c2, v2] = [+g[1]!, +g[2]!, +g[3]!, +g[4]!];
      if (c2 < c1) continue;
      if (c1 === c2) {
        out.push({ book, chapter: c1, from: v1, to: v2 });
      } else {
        out.push({ book, chapter: c1, from: v1, to: null });
        for (let c = c1 + 1; c < c2; c++) out.push({ book, chapter: c, from: 1, to: null });
        out.push({ book, chapter: c2, from: 1, to: v2 });
      }
      chapter = c2;
    } else if ((g = part.match(/^(\d+):(\d+)-(\d+)$/))) {
      chapter = +g[1]!;
      out.push({ book, chapter, from: +g[2]!, to: +g[3]! });
    } else if ((g = part.match(/^(\d+):(\d+)$/))) {
      chapter = +g[1]!;
      out.push({ book, chapter, from: +g[2]!, to: +g[2]! });
    } else if ((g = part.match(/^(\d+)-(\d+)$/))) {
      // After a chapter is established these are more verses in it; on its own
      // it's a span of whole chapters.
      if (chapter !== null) {
        out.push({ book, chapter, from: +g[1]!, to: +g[2]! });
      } else {
        for (let c = +g[1]!; c <= +g[2]!; c++) out.push({ book, chapter: c, from: 1, to: null });
        chapter = +g[2]!;
      }
    } else if ((g = part.match(/^(\d+)$/))) {
      if (chapter !== null) {
        out.push({ book, chapter, from: +g[1]!, to: +g[1]! });
      } else {
        chapter = +g[1]!;
        out.push({ book, chapter, from: 1, to: null });
      }
    }
  }

  return out;
}

/** book → chapter → how many verses that chapter has. */
export type ChapterLengths = Map<string, Map<number, number>>;

/** Total verses in a book, or 0 if the Bible text hasn't been seeded. */
export function bookVerseTotal(lengths: ChapterLengths, book: string): number {
  let total = 0;
  for (const n of lengths.get(book)?.values() ?? []) total += n;
  return total;
}

/**
 * Fold passage references into the set of verses covered, per book.
 *
 * Verses are keyed `chapter * 1000 + verse`, which is unambiguous for a book
 * whose longest chapter is Psalm 119 at 176 verses.
 */
export function coverageByBook(refs: string[], lengths: ChapterLengths): Map<string, Set<number>> {
  const covered = new Map<string, Set<number>>();

  for (const ref of refs) {
    for (const seg of parsePassage(ref)) {
      const chapterLength = lengths.get(seg.book)?.get(seg.chapter);
      // A chapter the Bible doesn't have (a typo, or a bad generation) is
      // dropped rather than counted against a book it doesn't belong to.
      if (!chapterLength) continue;

      const from = Math.max(1, seg.from);
      const to = Math.min(seg.to ?? chapterLength, chapterLength);
      if (to < from) continue;

      let set = covered.get(seg.book);
      if (!set) covered.set(seg.book, (set = new Set()));
      for (let v = from; v <= to; v++) set.add(seg.chapter * 1000 + v);
    }
  }

  return covered;
}

/** How many distinct chapters a covered-verse set touches. */
export function chaptersTouched(verses: Set<number>): number {
  const seen = new Set<number>();
  for (const key of verses) seen.add(Math.floor(key / 1000));
  return seen.size;
}

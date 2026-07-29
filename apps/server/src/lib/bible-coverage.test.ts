import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsePassage,
  normalizeBookName,
  coverageByBook,
  bookVerseTotal,
  chaptersTouched,
  CANON,
  type ChapterLengths,
} from "./bible-coverage.js";

// True KJV verse counts for Ephesians — the book both seeded Ephesians plans
// walk, and small enough to reason about by hand.
const EPHESIANS: ChapterLengths = new Map([
  ["Ephesians", new Map([[1, 23], [2, 22], [3, 21], [4, 32], [5, 33], [6, 24]])],
]);

// The two seeded Ephesians plans, verbatim from the library.
const READ_THROUGH = [
  "Ephesians 1:1–14", "Ephesians 1:15–23", "Ephesians 2:1–22",
  "Ephesians 3:1–21", "Ephesians 4:1–32", "Ephesians 5:1–33",
  "Ephesians 6:1–24",
];
const TOPICAL = [
  "Ephesians 1:3–6", "Ephesians 1:15–19", "Ephesians 2:4–9",
  "Ephesians 2:19–22", "Ephesians 4:29–32", "Ephesians 6:1–4",
  "Ephesians 6:10–17",
];

test("CANON is the whole Bible in order", () => {
  assert.equal(CANON.length, 66);
  assert.equal(CANON[0]!.book, "Genesis");
  assert.equal(CANON[65]!.book, "Revelation");
  assert.equal(CANON.filter((b) => b.testament === "OT").length, 39);
  assert.equal(CANON.filter((b) => b.testament === "NT").length, 27);
});

test("normalizeBookName folds the ways a book gets written", () => {
  // The one that actually bites: the library says "Psalm", the Bible text is
  // stored under "Psalms", so without this every Psalms reading counts nothing.
  assert.equal(normalizeBookName("Psalm"), "Psalms");
  assert.equal(normalizeBookName("Song of Songs"), "Song of Solomon");
  assert.equal(normalizeBookName("II Timothy"), "2 Timothy");
  assert.equal(normalizeBookName("First John"), "1 John");
  assert.equal(normalizeBookName("Revelations"), "Revelation");
  assert.equal(normalizeBookName("the book of Romans"), "Romans");
  assert.equal(normalizeBookName("Hezekiah"), null);
});

test("parsePassage reads the shapes the library uses", () => {
  assert.deepEqual(parsePassage("Ephesians 1:1–14"), [
    { book: "Ephesians", chapter: 1, from: 1, to: 14 },
  ]);
  assert.deepEqual(parsePassage("Revelation 1:9-20"), [
    { book: "Revelation", chapter: 1, from: 9, to: 20 },
  ]);
  assert.deepEqual(parsePassage("Psalm 46:10"), [
    { book: "Psalms", chapter: 46, from: 10, to: 10 },
  ]);
  assert.equal(parsePassage("Song of Solomon 2:10-13")[0]?.book, "Song of Solomon");
  assert.equal(parsePassage("1 John 1:8-10")[0]?.book, "1 John");
});

test("parsePassage reads the shapes a generated plan could produce", () => {
  assert.deepEqual(parsePassage("Romans 8"), [
    { book: "Romans", chapter: 8, from: 1, to: null },
  ]);
  assert.deepEqual(parsePassage("Romans 8-9"), [
    { book: "Romans", chapter: 8, from: 1, to: null },
    { book: "Romans", chapter: 9, from: 1, to: null },
  ]);
  assert.deepEqual(parsePassage("Romans 8:31-9:5"), [
    { book: "Romans", chapter: 8, from: 31, to: null },
    { book: "Romans", chapter: 9, from: 1, to: 5 },
  ]);
  assert.deepEqual(parsePassage("Romans 8:1-4, 12-17"), [
    { book: "Romans", chapter: 8, from: 1, to: 4 },
    { book: "Romans", chapter: 8, from: 12, to: 17 },
  ]);
});

test("parsePassage gives up rather than guessing", () => {
  // An unreadable reference must cost a man nothing, not credit him wrongly.
  assert.deepEqual(parsePassage("see notes"), []);
  assert.deepEqual(parsePassage(""), []);
  assert.deepEqual(parsePassage("Hezekiah 4:4"), []);
});

test("a read-through finishes its book; a topical plan does not", () => {
  assert.equal(bookVerseTotal(EPHESIANS, "Ephesians"), 155);

  const readThrough = coverageByBook(READ_THROUGH, EPHESIANS).get("Ephesians")!;
  assert.equal(readThrough.size, 155);
  assert.equal(chaptersTouched(readThrough), 6);

  // This gap is the whole reason coverage counts verses and not chapters: by
  // chapter the topical plan would read 4-of-6 and all but match the
  // read-through, when it covers less than a quarter of the book.
  const topical = coverageByBook(TOPICAL, EPHESIANS).get("Ephesians")!;
  assert.equal(topical.size, 35);
  assert.equal(chaptersTouched(topical), 4);
});

test("reading the same ground twice counts once", () => {
  // A plan read with a group and again in its personal copy is the same ground
  // walked twice, not twice as much Bible.
  const doubled = coverageByBook(
    [...READ_THROUGH, ...READ_THROUGH, ...TOPICAL],
    EPHESIANS
  ).get("Ephesians")!;
  assert.equal(doubled.size, 155);
});

test("coverage stays inside the book that exists", () => {
  // A range running past the end of a chapter clamps to it.
  assert.equal(coverageByBook(["Ephesians 1:1-99"], EPHESIANS).get("Ephesians")!.size, 23);
  // A chapter the book doesn't have is dropped, not counted.
  assert.equal(coverageByBook(["Ephesians 9:1-5"], EPHESIANS).size, 0);
  // A book with no seeded text has no denominator to measure against.
  assert.equal(bookVerseTotal(EPHESIANS, "Habakkuk"), 0);
});

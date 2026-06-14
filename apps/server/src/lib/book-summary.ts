/**
 * Derive a short "book of the Bible" summary for a devotional plan from its
 * daily passage references (e.g. "Matthew 6:5–13", "1 John 1:8–10").
 *
 *   1 book   → "Romans"
 *   2 books  → "Ruth and Romans"
 *   3+ books → "Ruth and various books in the Bible"  (most-referenced book first)
 */

/** Extract the book name from a passage reference, stripping chapter:verse. */
export function parseBook(ref: string): string {
  const trimmed = ref.trim();
  // Capture an optional leading number (1/2/3 John, etc.) + book name, up to the
  // first chapter number.
  const m = trimmed.match(/^((?:[1-3]\s)?[A-Za-z][A-Za-z' ]*?)\s+\d/);
  return (m?.[1] ?? trimmed).trim();
}

export function summarizeBooks(refs: string[]): string {
  const books = refs.map(parseBook).filter(Boolean);
  if (books.length === 0) return "";

  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const b of books) {
    if (!counts.has(b)) order.push(b);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }

  if (order.length === 1) return order[0]!;
  if (order.length === 2) return `${order[0]} and ${order[1]}`;

  // 3+ distinct books: lead with the most-referenced (ties broken by first appearance).
  let top = order[0]!;
  for (const b of order) {
    if ((counts.get(b) ?? 0) > (counts.get(top) ?? 0)) top = b;
  }
  return `${top} and various books in the Bible`;
}

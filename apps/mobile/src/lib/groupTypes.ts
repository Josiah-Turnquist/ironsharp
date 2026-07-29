export const GROUP_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  "one-on-one":  { label: "One-on-One",  color: "#89B4C9" },
  "family":      { label: "Family",      color: "#7FAF8A" },
  "small-group": { label: "Small Group", color: "#C49A78" },
  "large-group": { label: "Large Group", color: "#9B8EC4" },
  "community":   { label: "Church",      color: "#7A9EAF" },
};

export const GROUP_TYPE_KEYS = Object.keys(GROUP_TYPE_CONFIG);

/**
 * Types that are public enough that naming who's behind would single someone
 * out, regardless of how few people are in them. A church group is not an
 * intimate setting even at six people.
 */
const PUBLIC_TYPES: ReadonlySet<string> = new Set(["large-group", "community"]);

/** Above this headcount, no group is intimate enough for per-person status. */
export const INDIVIDUAL_STATUS_MAX = 10;

/**
 * Whether a group shows per-person completion — the check, the dim, the
 * unfinished-first ordering, and nudging — or an aggregate bar instead.
 *
 * Headcount AND type both flip it, because neither is sufficient alone: group
 * type doesn't constrain size (limits are per membership tier, so a
 * "one-on-one" can hold twelve people), and a small church group still isn't
 * a place to display who hasn't done their reading.
 *
 * Mirrored server-side in apps/server/src/routes/groups.ts, which refuses a
 * nudge on the same terms.
 */
export function showsIndividualStatus(groupType: string, memberCount: number): boolean {
  return memberCount <= INDIVIDUAL_STATUS_MAX && !PUBLIC_TYPES.has(groupType);
}

// Mirror of apps/server/src/lib/group-pacing.ts — keep the two in sync.
const CALENDAR_PACED: ReadonlySet<string> = new Set(["large-group", "community"]);

/**
 * Calendar-paced groups advance a day at a time on the clock rather than waiting
 * for every member, so falling behind is normal in them. Unknown types fall back
 * to convoy, matching the server.
 */
export function isCalendarPaced(groupType: string): boolean {
  return CALENDAR_PACED.has(groupType);
}

/**
 * Where a group's "open the devotional" action should land. Calendar-paced
 * groups get the day list — with people routinely behind, the honest landing
 * place is "here's where you are", not today's reading. Convoy groups go
 * straight in, since the group waits and nobody is behind by definition.
 *
 * Returns null when the group has no plan running.
 */
export function groupReadingHref(g: {
  id: string;
  groupType: string;
  plan: { id: string } | null;
}): string | null {
  if (!g.plan) return null;
  return isCalendarPaced(g.groupType)
    ? `/devotional/days/${g.plan.id}?groupId=${g.id}`
    : `/devotional/${g.plan.id}?groupId=${g.id}`;
}

## 1. Drag-to-reorder on Groups page

Mirror the same native drag pattern used in `DevotionalHub.tsx`:
- Add a drag handle (`GripVertical` icon) on the left of each collapsed group row in `src/pages/Groups.tsx`.
- Use HTML5 drag events (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) on the row container, same approach as the hub.
- Persist the order in `localStorage` under `ironsharp.groups_order`, hydrating on mount.
- Disable drag while a row is expanded (to avoid conflicts with the expand toggle).
- Tapping the row body still expands; the handle is the only drag affordance.

## 2. "Done. Come back tomorrow." completion screen

Replace the auto-advance behavior in `handleSubmit` (`src/pages/Devotional.tsx`):

- On submit:
  - Save progress (advance `current_day` in `user_plan_progress` so tomorrow opens the next day).
  - **Do not** load the next day's content into view.
  - Set a `completedToday` state and render a full-card completion view in place of the devotional.

- Completion view contents:
  - Large serif headline: **"Done. Come back tomorrow."**
  - Subline: "Day {currentDay} of {totalDays} complete."
  - A rotating **encouragement verse** card (verse text + reference) — picked randomly from a local array of ~15 short, public-domain verses (e.g. Joshua 1:9, Phil 4:13, Isaiah 40:31, Lam 3:22-23, Psalm 1:2-3, etc.). Different verse each time the user lands on this state.
  - A single secondary button: "Back to Devotionals" → navigates to `/devotional` (hub).
  - No "Next Day" button. No preview of tomorrow's chapter.

- If it was the final day of the plan, show a celebratory variant instead: "Plan complete." with the same encouragement verse pattern and a CTA to `/plans`.

## 3. Lock tomorrow's devotional until tomorrow

Today we let users keep submitting back-to-back days. New behavior:

- Track `last_completed_at` so we know whether today's day is already done. Two options for storing this — recommended is option **A** since it avoids a schema change:
  - **A (chosen):** Persist `ironsharp.last_completed:{planId}` = ISO date string in `localStorage` on submit. On mount, if today's date matches, the devotional renders the "Done. Come back tomorrow." view instead of the form.
  - B (alternative, requires migration): Add `last_completed_at timestamptz` to `user_plan_progress`. Skip unless you want server-side enforcement.

- On the Devotional page load:
  - If `last_completed:{planId}` === today (local date), short-circuit to the completion view (same UI as #2) using the **just-completed** day number.
  - Otherwise, render the normal devotional form for `current_day`.

- The Devotional Hub's "Continue Reading" button still routes here; the page itself decides whether to show the form or the locked/done state. No surprise preview of tomorrow's content anywhere.

## 4. Files touched

- `src/pages/Groups.tsx` — add drag-to-reorder + handle + localStorage persistence.
- `src/pages/Devotional.tsx` — rework `handleSubmit`, add completion view + encouragement-verse rotation, add today-lock check on mount.

No database migrations. No new dependencies.

## Open question

For the encouragement verses on the completion screen — do you want them pulled from the same `bible-api.com` integration (live, current translation) or hardcoded as a small curated list (faster, always works offline)? Defaulting to **hardcoded curated list** for reliability; easy to swap later.

Replace the hardcoded placeholder "Shared Plans" list in `src/components/devotional/DevotionalHub.tsx` with a real empty state since the user has no shared plans.

**Changes to `src/components/devotional/DevotionalHub.tsx`:**
- Remove the `defaultPlaceholders` array, the drag-to-reorder DnD setup, the `ORDER_KEY` localStorage, and the `SortablePlanRow` component (all dead weight once the placeholders go).
- Query real shared plans for the user (community / partner / family / group). For now, since no shared-plan data sources exist yet, render an empty state by default:
  - Section header: `Shared Plans` (drop the "Drag to reorder" suffix when empty).
  - Empty card matching the "No active plan yet" style: title **"No active shared plans"**, subtitle **"Join a group or pair with a discipler to start a shared plan."**, secondary button **"Find a Group →"** routing to `/groups`.
- Keep the personal-plan hero exactly as it is.

No DB or routing changes. Purely a frontend cleanup of the Devotionals hub.

## Home Screen Changes (`src/pages/Home.tsx`)

1. **Remove** the "Today's Devotional" group reading card (Day 5 of 7 / Proverbs 27)
2. **Promote "My Time with God"** as the main, prominent card at the top (below greeting/streak) with:
   - Larger, more prominent styling
   - A scripture preview snippet (a few opening verses from the current reading) so there's substance
3. **Move the "Iron sharpens iron" quote** to sit directly below the personal devotional card
4. **Remove** the Group Progress section entirely
5. **Replace** the full-width Community button with two half-width tiles side by side:
   - **Community Devotional** (renamed from "Community") -- navigates to `/community`
   - **Podcast** -- a new tile (placeholder/coming soon for now)

**New Home layout order:**
1. Greeting + streak
2. Personal Devotional (prominent, with verse preview)
3. Daily quote ("Iron sharpens iron")
4. Two tiles: Community Devotional | Podcast

## Profile Changes (`src/pages/Profile.tsx`)

1. **Remove** the "My Groups" section entirely
2. **Remove** the standalone "Themes" button (Themes is already accessible from Settings page)

## No changes needed to Settings
The Themes button already exists inside `SettingsPage.tsx`, so that flow is already correct.

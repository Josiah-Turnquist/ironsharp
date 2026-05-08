
## Load Launch Devotionals into IronSharp

Your document contains three complete 7-day devotional plans ready to go. Here's what I'll do:

### 1. Create Database Tables

**`devotional_plans`** — stores each plan:
- id, title, subtitle, description, category (men/husband/general), total_days, how_to_use text, image_url, created_at

**`devotional_days`** — stores each day's content:
- id, plan_id (FK), day_number, chapter (e.g. "Proverbs 27"), theme (short intro), commentary (full text), reflection_q1, reflection_q2

Both tables will have RLS policies allowing authenticated users to read.

### 2. Seed All Three Plans (21 days total)

From your document:
- **Being a Man** (Men's Devotional) — 7 days: Proverbs 27, 1 Corinthians 16, James 1, Psalm 15, 1 Timothy 4, Micah 6, Joshua 1
- **Being a Husband** (Husbands & Fathers) — 7 days: Ephesians 5, 1 Peter 3, Song of Solomon 2, Colossians 3, Proverbs 31, Genesis 2, Ruth 3
- **Joy That Doesn't Make Sense** (General) — 7 days: Philippians 1, 2, 3, 4, 1 (return), 2 (return), 4 (return)

Each day includes the full commentary and both reflection questions extracted from your document.

### 3. Wire Up the UI

- **Plans page**: Show real plan count per category (instead of hardcoded "12 Plans")
- **Devotional page**: When a user opens a plan, load the actual day's chapter, commentary, and reflection questions from the database instead of the current hardcoded Proverbs 27 content
- **Home page "My Time with God"**: Show the current day's scripture from the user's active plan

### 4. User Progress Table

**`user_plan_progress`** — tracks which plan a user has started and what day they're on:
- id, user_id, plan_id (FK), current_day, started_at, completed_at

RLS: users can only read/write their own rows.

### Technical Details

**Files created/modified:**
- Database migration with all 4 tables + seed data + RLS policies
- `src/pages/Plans.tsx` — fetch real plans from database
- `src/pages/Devotional.tsx` — load day content dynamically
- `src/pages/Home.tsx` — show active plan's current reading
- `src/components/devotional/DevotionalHub.tsx` — show real plan progress

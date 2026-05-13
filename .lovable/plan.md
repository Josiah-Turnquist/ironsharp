# Updated IronSharp Overview Deck (v2)

Refresh the existing overview presentation with current product state, fold in the pricing one-pager, and add a slide on additional revenue streams (excluding podcast).

## Deck structure (12 slides)

1. **Title** — IronSharp · "Sharpen each other. Every day." · Proverbs 27:17
2. **The Problem** — Solo devotional apps; no accountability, no community, no depth
3. **The Solution** — Read together → Reflect honestly → Wait & compare → Stay accountable
4. **The Daily Flow** — Read · Reflect · Record · Submit · Compare
5. **Key Features** — Scripture reading, streaks, roles, voice memos, group progress, blind submissions
6. **Roles & Relationships** — Discipler · Disciple · Accountability Partner
7. **Now in the App** *(updated)* — Devotional Hub with up to 3 active plans, Plan Library shelves (7/14/30-day), completion celebration, 5 themes (Vesper/Parchment/Sage/Dusk/Slate), Google + email auth
8. **Plans & Pricing** *(new)* — Four tiers in a card grid: Free · Connect $18/yr · Sharpen $40/yr (most popular) · Family $55/yr
9. **Pricing At a Glance** *(new)* — Compact feature comparison table
10. **Beyond Subscriptions** *(new, podcast omitted)* — Church Licensing, Plan Sponsorships, Brand-Sponsored Themed Plans (additional ideas: gift subscriptions, ministry/seminary bulk licenses, branded merch — kept brief)
11. **On the Roadmap** *(updated, podcast removed)* — Family Plan, Community Feed, Leader Analytics, Discipler Side-Notes
12. **Closing** — "Ready to sharpen each other?"

## Design

- Reuse the Vesper-inspired dark palette to match the app: deep slate background, warm parchment text, muted gold accent.
- Playfair Display (serif) for titles/scripture, DM Sans for body — matches IronSharp brand.
- "Most Popular" pricing card highlighted with the gold accent border.
- No accent lines under titles; rely on color and whitespace.

## Process

1. Generate deck with `pptxgenjs` to `/mnt/documents/IronSharp_Overview_v2.pptx`.
2. Render every slide to JPG and visually QA each one for overflow, contrast, and alignment; fix and re-render until clean.
3. Deliver via `<presentation-artifact>` tag.

## Out of scope

- Podcast slide and podcast sponsorship row (per your instruction).
- No code or app changes.

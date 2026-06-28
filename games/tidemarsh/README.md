# Tidemarsh 🌊

> A cozy tidal-survival prototype. Read the tide, forage the flats, build above the water.

A playable HTML5 + Canvas prototype (vanilla TypeScript, zero dependencies) of the
**Tidemarsh** concept: the marsh floods and drains on a tide clock, and the whole
game is about *elevation* — being on high enough ground when the water rises, and
building your stilt-village at a height that survives the spring tides.

This lives in its own folder and is completely independent of the IronSharp app.

## Run it

The compiled output is committed, so you can just open it:

```bash
# from this folder, serve the directory and open the page
npx serve games/tidemarsh      # or: python3 -m http.server
# then open the printed URL (the page is index.html)
```

Opening `index.html` over `file://` works in most browsers too, but a tiny static
server avoids ES-module CORS quirks.

## Rebuild after editing the source

```bash
cd games/tidemarsh
npx tsc -p tsconfig.json   # recompiles src/main.ts -> dist/main.js
```

## How to play

| Action | Control |
| ------ | ------- |
| Move | `W` `A` `S` `D` or arrow keys |
| Forage | walk onto an exposed flat (wood / reeds / clams) |
| Store haul | walk onto your house |
| Harvest / clear crop | walk onto a ripe (or dead) crop |
| Pick an action | `1` boardwalk · `2` platform · `3` plant crop · `0` cancel |
| Build / plant | with an action selected, **click** an adjacent tile |
| Restart (new marsh) | `R` |

### The loop

1. **Low tide** (daylight) exposes the mudflats — run out and forage. Your basket is
   limited, so come home to store before it's full.
2. **The tide rises** (and night falls) on a clock you can read (top-left gauge). If
   your tile floods while you're standing on it, you swim home and **drop half your haul**.
3. **Farm to survive.** You eat **2 food per day** (each tide cycle). Plant crops
   (`3`, costs 1 reed) on high ground or a platform; they ripen over ~1.3 cycles and
   yield food when you walk onto them. **Run out of food and it's game over.**
4. **Build** to extend your reach and grow the village:
   - **Boardwalk** (cheap) — a low deck. Lets you cross water… but a boardwalk laid
     on a deep channel sits low and **floods at spring tide**. The build ghost warns you.
   - **Platform** (expensive) — a high deck that survives any tide. Platforms grow the
     village (raise **6** to win, then keep playing) *and* double as safe, raised farmland.
5. **Neighbours move in.** Every platform you raise becomes home to a villager who
   wants something — a few clams, some driftwood, or a hot meal (shown in a speech
   bubble above them). Walk onto a villager with the goods in your stores to deliver:
   you earn **reputation** and a small thank-you gift, and they soon ask for something
   new. Reach **10 reputation** and the marsh becomes a true village.

### The hook — elevation everywhere

Every structure **and every crop** has a **deck height** = its tile's elevation + an
offset. That's the core decision throughout the game:

- A boardwalk over a deep channel is the path to far foraging grounds, but it's exactly
  the thing the spring tide drowns.
- A crop on low marsh grows fine on calm days, but the **salt water kills any crop the
  tide reaches** — so the lowest beds get wiped at spring tide unless you saw it coming.

### Read the moon

The **lunar dial** (top HUD) shows the moon phase and counts down to the next **spring
tide** (the extra-high tide at new and full moon, every 3rd cycle). Spring tides flood
things normal tides don't — plant and build ahead of them, not into them.

### Watch the weather

Some days a **storm** rolls in (the tide bar turns purple and reads `⛈ STORM`; rain
falls and the marsh darkens). A storm adds a **surge** on top of the normal tide,
pushing the water *past* its usual high-water mark — drowning crops and boardwalks that
a calm tide would have spared. The HUD warns you the day before (`storm coming`). The
worst case is a **storm landing on a spring tide**, where the surge can climb high
enough to flood even platforms — get to the highest ground you have. Storms are fixed by
the marsh's seed, so a given marsh always has the same weather (and reloads reproduce it).

### Other touches

- **Day/night** colour cycle tied to the tide (bright at low water, dark at high).
- **Particles & sound** on foraging, building, planting, harvesting, and getting caught.
- **Autosave** to `localStorage` — close the tab and your marsh is waiting when you return.
  Press `R` to abandon it and generate a fresh marsh.

## Files

```
games/tidemarsh/
├── index.html        # page shell + controls help
├── src/main.ts       # the entire game (terrain, tide model, forage, build, render)
├── dist/main.js      # compiled output (committed so it runs without building)
└── tsconfig.json
```

## Status / next steps

The core fun is in: tide-reading, elevation building, **tidal farming**, a **lunar
calendar**, **storms/weather**, a **hunger/win-lose** stake, **villagers + requests**
(reputation arc), **day/night + particles + sound**, and **autosave**. Natural next
additions:

- A cooking station + multiple crop types so villager "food" requests feed a deeper economy.
- Progression/upgrades: bigger basket, faster crops, sturdier boardwalks.
- Storm-warning structures (a tide gauge / weathervane you build to forecast further ahead).
- A proper title/menu screen and difficulty options (food rate, tide speed, storm frequency).

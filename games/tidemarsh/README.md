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
| Pick a structure | `1` boardwalk · `2` platform · `0` cancel |
| Build | with a structure selected, **click** an adjacent tile |
| Restart (new marsh) | `R` |

### The loop

1. **Low tide** exposes the mudflats — run out and forage. Your basket is limited,
   so come home to store before it's full.
2. **The tide rises** on a clock you can read (top-left gauge). If your tile floods
   while you're standing on it, you swim home and **drop half your haul**.
3. **Build** to extend your reach and grow the village:
   - **Boardwalk** (cheap) — a low deck. Lets you cross water… but a boardwalk laid
     on a deep channel sits low and **floods at spring tide** (every 3rd cycle, the
     gauge turns brighter and reads `SPRING TIDE`). The build ghost warns you.
   - **Platform** (expensive) — a high deck that survives any tide. Platforms are
     what grow the village; raise **6** to win (then keep playing).

### The hook

Every structure has a **deck height** = its tile's elevation + an offset. That's the
core decision: a boardwalk over a deep channel is the path to far foraging grounds,
but it's exactly the thing the spring tide drowns. Build smart, build high.

## Files

```
games/tidemarsh/
├── index.html        # page shell + controls help
├── src/main.ts       # the entire game (terrain, tide model, forage, build, render)
├── dist/main.js      # compiled output (committed so it runs without building)
└── tsconfig.json
```

## Status / next steps

This is a vertical slice proving the core fun: tide-reading + elevation building.
Natural next additions:

- Crops that die if planted below the waterline (the "plant at the right elevation"
  layer from the original pitch).
- Lunar calendar UI so spring tides can be *predicted*, not just survived.
- Neighbours/quests once the village grows; cooking with foraged ingredients.
- Persistence (save the marsh) and sound.

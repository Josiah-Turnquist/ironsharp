"use strict";
/*
 * Tidemarsh — a cozy tidal-survival prototype.
 *
 * Core loop:
 *   1. At LOW tide the mudflats are exposed — run out and forage wood, reeds, clams.
 *   2. The tide RISES on a clock you can read. Get back onto high ground or a
 *      boardwalk before your tile floods, or you swim home and drop half your haul.
 *   3. At HIGH tide you build: boardwalks extend your reach, platforms grow the village.
 *
 * The hook is ELEVATION. Every structure has a deck height. Build a boardwalk on a
 * low channel tile and its deck sits low — a spring tide (every 3rd cycle) will flood
 * it. Platforms sit high enough to survive anything, but they cost more. Reading the
 * tide and building at the right height is the whole game.
 */
// ----------------------------------------------------------------------------
// Layout
// ----------------------------------------------------------------------------
const TILE = 32;
const COLS = 30;
const ROWS = 16;
const HUD_TOP = 64;
const HUD_BOTTOM = 64;
const GRID_W = COLS * TILE; // 960
const GRID_H = ROWS * TILE; // 512
const W = GRID_W; // 960
const H = HUD_TOP + GRID_H + HUD_BOTTOM; // 640
// ----------------------------------------------------------------------------
// Tide model
// ----------------------------------------------------------------------------
const CYCLE_SECONDS = 48; // one full low→high→low cycle
const TIDE_BASE = 0.45;
const TIDE_AMP_NORMAL = 0.18; // range 0.27 .. 0.63
const TIDE_AMP_SPRING = 0.29; // range 0.16 .. 0.74
const SPRING_EVERY = 3; // every 3rd cycle is a spring tide
const STRUCTS = {
    boardwalk: {
        kind: "boardwalk",
        label: "Boardwalk",
        cost: { wood: 2, reed: 1, clam: 0 },
        deckOffset: 0.26,
        deckFloor: 0.0, // a low channel boardwalk really can sit low
    },
    platform: {
        kind: "platform",
        label: "Platform",
        cost: { wood: 3, reed: 2, clam: 1 },
        deckOffset: 0.4,
        deckFloor: 0.78, // always above even a spring tide; this is the village
    },
};
const RES_ORDER = ["wood", "reed", "clam"];
const RES_META = {
    wood: { name: "Driftwood", color: "#c08440" },
    reed: { name: "Reeds", color: "#86c06a" },
    clam: { name: "Clams", color: "#dcd0c0" },
};
const FORAGE_TARGET = 11; // how many nodes try to exist at once
// ----------------------------------------------------------------------------
// Small seeded RNG (mulberry32) so a marsh is reproducible per run.
// ----------------------------------------------------------------------------
function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
let state;
const idx = (c, r) => r * COLS + c;
const inBounds = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
// ----------------------------------------------------------------------------
// Terrain generation: noisy field, smoothed, with a high home plateau.
// ----------------------------------------------------------------------------
function generateTerrain(seed) {
    const rng = makeRng(seed);
    let field = new Array(COLS * ROWS).fill(0).map(() => rng());
    // smooth a few passes (box blur) to make flats and channels
    for (let pass = 0; pass < 4; pass++) {
        const next = field.slice();
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                let sum = 0;
                let n = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const cc = c + dc;
                        const rr = r + dr;
                        if (inBounds(cc, rr)) {
                            sum += field[idx(cc, rr)];
                            n++;
                        }
                    }
                }
                next[idx(c, r)] = sum / n;
            }
        }
        field = next;
    }
    // home plateau near centre-left so there's open marsh to the right
    const home = { c: Math.floor(COLS * 0.32), r: Math.floor(ROWS * 0.5) };
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const dx = c - home.c;
            const dy = r - home.r;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const bump = Math.max(0, 1 - dist / 5); // plateau falls off over ~5 tiles
            field[idx(c, r)] = field[idx(c, r)] * 0.7 + bump * 0.9;
        }
    }
    // normalise to 0..1
    let min = Infinity;
    let max = -Infinity;
    for (const v of field) {
        if (v < min)
            min = v;
        if (v > max)
            max = v;
    }
    const elev = field.map((v) => (v - min) / (max - min || 1));
    // guarantee the home tile is solid high ground
    elev[idx(home.c, home.r)] = 0.92;
    return { elev, home };
}
// ----------------------------------------------------------------------------
// Tide helpers
// ----------------------------------------------------------------------------
function cycleIndexAt(t) {
    return Math.floor(t / CYCLE_SECONDS);
}
function ampForCycle(ci) {
    return ci % SPRING_EVERY === SPRING_EVERY - 1 ? TIDE_AMP_SPRING : TIDE_AMP_NORMAL;
}
function waterLevelAt(t) {
    const ci = cycleIndexAt(t);
    const phase = (t / CYCLE_SECONDS - ci) * Math.PI * 2;
    return TIDE_BASE - ampForCycle(ci) * Math.cos(phase);
}
function tidePhaseInfo(t) {
    const ci = cycleIndexAt(t);
    const frac = t / CYCLE_SECONDS - ci; // 0..1 within cycle (0 = low, .5 = high)
    const rising = frac < 0.5;
    let label;
    if (frac < 0.08 || frac > 0.92)
        label = "LOW TIDE";
    else if (frac > 0.42 && frac < 0.58)
        label = "HIGH TIDE";
    else
        label = rising ? "RISING" : "FALLING";
    const highFrac = 0.5;
    const nextHighIn = ((highFrac - frac + 1) % 1) * CYCLE_SECONDS;
    const nextLowIn = ((1 - frac) % 1) * CYCLE_SECONDS;
    return { rising, label, nextHighIn, nextLowIn };
}
/** Deck height of whatever is at a tile (structure deck, or bare ground). */
function deckHeight(c, r) {
    const s = state.structs[idx(c, r)];
    const ground = state.elev[idx(c, r)];
    if (!s)
        return ground;
    const def = STRUCTS[s];
    return Math.max(def.deckFloor, ground + def.deckOffset);
}
function isWalkable(c, r, water) {
    if (!inBounds(c, r))
        return false;
    return deckHeight(c, r) >= water;
}
// ----------------------------------------------------------------------------
// Foraging
// ----------------------------------------------------------------------------
function spawnNodes() {
    const rng = makeRng(state.seed ^ 0x9e3779b9 ^ Math.floor(state.t * 7));
    let guard = 0;
    while (state.nodes.length < FORAGE_TARGET && guard < 400) {
        guard++;
        const c = Math.floor(rng() * COLS);
        const r = Math.floor(rng() * ROWS);
        const e = state.elev[idx(c, r)];
        // forage nodes live on low/mud ground (the stuff the tide reveals)
        if (e > 0.5)
            continue;
        if (c === state.home.c && r === state.home.r)
            continue;
        if (state.nodes.some((n) => n.c === c && n.r === r))
            continue;
        const kind = e < 0.32 ? (rng() < 0.5 ? "clam" : "wood") : rng() < 0.5 ? "reed" : "wood";
        state.nodes.push({ c, r, kind, amount: 1 + Math.floor(rng() * 2) });
    }
}
function totalCarry() {
    return state.carry.wood + state.carry.reed + state.carry.clam;
}
function tryForage() {
    const water = waterLevelAt(state.t);
    const i = state.nodes.findIndex((n) => n.c === state.player.c && n.r === state.player.r);
    if (i < 0)
        return;
    const node = state.nodes[i];
    // can only harvest while the node is exposed (not underwater)
    if (state.elev[idx(node.c, node.r)] < water && !state.structs[idx(node.c, node.r)]) {
        setMessage("That flat is underwater — wait for the tide to fall.");
        return;
    }
    if (totalCarry() >= state.carryCap) {
        setMessage("Your basket is full — head home to store your haul.");
        return;
    }
    state.carry[node.kind] += node.amount;
    setMessage(`+${node.amount} ${RES_META[node.kind].name}`);
    state.nodes.splice(i, 1);
}
// ----------------------------------------------------------------------------
// Home / storing
// ----------------------------------------------------------------------------
function atHome() {
    return state.player.c === state.home.c && state.player.r === state.home.r;
}
function storeHaul() {
    if (totalCarry() === 0)
        return;
    for (const k of RES_ORDER) {
        state.stored[k] += state.carry[k];
        state.carry[k] = 0;
    }
    setMessage("Stored your haul at home.");
}
// ----------------------------------------------------------------------------
// Building
// ----------------------------------------------------------------------------
function canAfford(def) {
    return (state.stored.wood >= def.cost.wood &&
        state.stored.reed >= def.cost.reed &&
        state.stored.clam >= def.cost.clam);
}
function tryBuild(c, r) {
    if (!state.buildSel)
        return;
    if (!inBounds(c, r))
        return;
    const def = STRUCTS[state.buildSel];
    // must be orthogonally adjacent to the player
    const adj = Math.abs(c - state.player.c) + Math.abs(r - state.player.r) === 1;
    if (!adj) {
        setMessage("Build on a tile next to you.");
        return;
    }
    if (c === state.home.c && r === state.home.r) {
        setMessage("Can't build on the house.");
        return;
    }
    if (state.structs[idx(c, r)]) {
        setMessage("Something's already built there.");
        return;
    }
    if (!canAfford(def)) {
        setMessage(`Not enough materials for a ${def.label.toLowerCase()}.`);
        return;
    }
    state.stored.wood -= def.cost.wood;
    state.stored.reed -= def.cost.reed;
    state.stored.clam -= def.cost.clam;
    state.structs[idx(c, r)] = def.kind;
    if (def.kind === "platform") {
        state.platformsBuilt++;
        if (state.platformsBuilt === GOAL_PLATFORMS) {
            setMessage("The village thrives! Neighbours are moving in. Keep going as long as you like.");
        }
        else {
            setMessage(`Platform raised — the village grows (${state.platformsBuilt}/${GOAL_PLATFORMS}).`);
        }
    }
    else {
        setMessage("Boardwalk laid. Watch its deck height at spring tide.");
    }
}
const GOAL_PLATFORMS = 6;
// ----------------------------------------------------------------------------
// Movement & tide-catching
// ----------------------------------------------------------------------------
function tryMove(dc, dr) {
    const nc = state.player.c + dc;
    const nr = state.player.r + dr;
    const water = waterLevelAt(state.t);
    if (!isWalkable(nc, nr, water)) {
        setMessage("Too deep to wade — you need higher ground or a boardwalk.");
        return;
    }
    state.player.c = nc;
    state.player.r = nr;
    tryForage();
    if (atHome())
        storeHaul();
}
function checkStranded() {
    const water = waterLevelAt(state.t);
    if (!isWalkable(state.player.c, state.player.r, water)) {
        // swim home, drop half the haul
        let dropped = 0;
        for (const k of RES_ORDER) {
            const lose = Math.floor(state.carry[k] / 2);
            state.carry[k] -= lose;
            dropped += lose;
        }
        state.player.c = state.home.c;
        state.player.r = state.home.r;
        storeHaul();
        setMessage(dropped > 0
            ? "The tide caught you! You swam home and lost half your haul."
            : "The tide caught you — you swam home empty-handed.");
    }
}
// ----------------------------------------------------------------------------
// Messages
// ----------------------------------------------------------------------------
function setMessage(m) {
    state.message = m;
    state.messageT = 4.0;
}
// ----------------------------------------------------------------------------
// Init / restart
// ----------------------------------------------------------------------------
function newGame(seed) {
    const { elev, home } = generateTerrain(seed);
    state = {
        elev,
        structs: new Array(COLS * ROWS).fill(null),
        nodes: [],
        home,
        player: { c: home.c, r: home.r },
        carry: { wood: 0, reed: 0, clam: 0 },
        stored: { wood: 4, reed: 2, clam: 0 },
        t: 0,
        day: 1,
        buildSel: null,
        platformsBuilt: 0,
        message: "Low tide. Head out onto the flats and forage.",
        messageT: 6,
        seed,
        carryCap: 12,
    };
    spawnNodes();
}
// ----------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
function elevColor(e) {
    // exposed terrain ramp: deep mud -> mud -> marsh grass -> high ground
    if (e < 0.3)
        return "#6f5a3e"; // wet mud
    if (e < 0.45)
        return "#8a724a"; // mudflat
    if (e < 0.6)
        return "#6f8f55"; // low marsh
    if (e < 0.78)
        return "#5e9a52"; // marsh grass
    return "#7caa5a"; // high ground
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function drawTile(c, r, water, time) {
    const x = c * TILE;
    const y = HUD_TOP + r * TILE;
    const e = state.elev[idx(c, r)];
    const submerged = e < water;
    if (submerged) {
        // water depth shading + subtle shimmer
        const depth = Math.min(1, (water - e) / 0.35);
        const shimmer = 0.04 * Math.sin(time * 1.6 + c * 0.7 + r * 0.9);
        const r1 = Math.floor(lerp(58, 18, depth) + shimmer * 60);
        const g1 = Math.floor(lerp(120, 70, depth) + shimmer * 60);
        const b1 = Math.floor(lerp(140, 110, depth));
        ctx.fillStyle = `rgb(${r1},${g1},${b1})`;
        ctx.fillRect(x, y, TILE, TILE);
    }
    else {
        ctx.fillStyle = elevColor(e);
        ctx.fillRect(x, y, TILE, TILE);
        // texture dots on mud
        if (e < 0.45) {
            ctx.fillStyle = "rgba(0,0,0,0.08)";
            ctx.fillRect(x + 6, y + 8, 2, 2);
            ctx.fillRect(x + 18, y + 20, 2, 2);
            ctx.fillRect(x + 24, y + 6, 2, 2);
        }
    }
    // grid line
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.strokeRect(x + 0.5, y + 0.5, TILE, TILE);
}
function drawStruct(c, r, water) {
    const kind = state.structs[idx(c, r)];
    if (!kind)
        return;
    const x = c * TILE;
    const y = HUD_TOP + r * TILE;
    const deck = deckHeight(c, r);
    const flooded = deck < water;
    if (kind === "boardwalk") {
        ctx.fillStyle = flooded ? "rgba(150,110,70,0.45)" : "#b5793f";
        ctx.fillRect(x + 3, y + 9, TILE - 6, TILE - 18);
        ctx.fillStyle = flooded ? "rgba(120,85,55,0.45)" : "#946031";
        for (let i = 0; i < 4; i++)
            ctx.fillRect(x + 4 + i * 6, y + 10, 2, TILE - 20);
    }
    else {
        // platform: raised deck with corner posts
        ctx.fillStyle = "#7a4f28";
        ctx.fillRect(x + 5, y + 5, 3, TILE - 10);
        ctx.fillRect(x + TILE - 8, y + 5, 3, TILE - 10);
        ctx.fillStyle = flooded ? "rgba(190,140,80,0.6)" : "#caa15e";
        ctx.fillRect(x + 3, y + 6, TILE - 6, TILE - 14);
        ctx.fillStyle = "#8a5f30";
        ctx.strokeStyle = "#8a5f30";
        ctx.strokeRect(x + 3.5, y + 6.5, TILE - 7, TILE - 15);
    }
}
function drawNode(n, water) {
    const x = n.c * TILE;
    const y = HUD_TOP + n.r * TILE;
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;
    const underwater = state.elev[idx(n.c, n.r)] < water && !state.structs[idx(n.c, n.r)];
    ctx.globalAlpha = underwater ? 0.35 : 1;
    if (n.kind === "wood") {
        ctx.fillStyle = "#7b4a22";
        ctx.fillRect(cx - 8, cy - 2, 16, 5);
        ctx.fillRect(cx - 6, cy - 7, 14, 5);
    }
    else if (n.kind === "reed") {
        ctx.strokeStyle = "#5fae42";
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 4, cy + 8);
            ctx.lineTo(cx + i * 4 + i, cy - 8);
            ctx.stroke();
        }
        ctx.lineWidth = 1;
    }
    else {
        ctx.fillStyle = "#e7ddcf";
        ctx.beginPath();
        ctx.arc(cx, cy, 7, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "#b9a98f";
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy);
        ctx.lineTo(cx + 7, cy);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}
function drawHome() {
    const x = state.home.c * TILE;
    const y = HUD_TOP + state.home.r * TILE;
    // stilts
    ctx.fillStyle = "#6b4523";
    ctx.fillRect(x + 6, y + 18, 3, 12);
    ctx.fillRect(x + TILE - 9, y + 18, 3, 12);
    // body
    ctx.fillStyle = "#caa15e";
    ctx.fillRect(x + 5, y + 12, TILE - 10, 12);
    // roof
    ctx.fillStyle = "#8a4b2f";
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 12);
    ctx.lineTo(x + TILE / 2, y + 3);
    ctx.lineTo(x + TILE - 2, y + 12);
    ctx.closePath();
    ctx.fill();
    // door
    ctx.fillStyle = "#5b3a1f";
    ctx.fillRect(x + TILE / 2 - 2, y + 16, 4, 8);
}
function drawPlayer() {
    const x = state.player.c * TILE;
    const y = HUD_TOP + state.player.r * TILE;
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;
    ctx.fillStyle = "#1c2b2b";
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e9c46a"; // sou'wester hat
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 6, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 8, cy - 4, 16, 2);
}
function drawBuildGhost(water) {
    if (!state.buildSel)
        return;
    const def = STRUCTS[state.buildSel];
    const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ];
    for (const [dc, dr] of dirs) {
        const c = state.player.c + dc;
        const r = state.player.r + dr;
        if (!inBounds(c, r))
            continue;
        if (state.structs[idx(c, r)] || (c === state.home.c && r === state.home.r))
            continue;
        const ok = canAfford(def);
        const x = c * TILE;
        const y = HUD_TOP + r * TILE;
        ctx.fillStyle = ok ? "rgba(233,196,106,0.25)" : "rgba(220,90,90,0.25)";
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = ok ? "rgba(233,196,106,0.8)" : "rgba(220,90,90,0.8)";
        ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
        // show whether this deck would survive a spring tide
        const futureDeck = Math.max(def.deckFloor, state.elev[idx(c, r)] + def.deckOffset);
        const springHigh = TIDE_BASE + TIDE_AMP_SPRING;
        if (futureDeck < springHigh && ok) {
            ctx.fillStyle = "rgba(80,160,200,0.9)";
            ctx.font = "9px sans-serif";
            ctx.fillText("floods @spring", x + 3, y + TILE - 4);
        }
    }
    void water;
}
// ---- HUD ----
function drawHUD(water) {
    // top bar background
    ctx.fillStyle = "#0a2123";
    ctx.fillRect(0, 0, W, HUD_TOP);
    const info = tidePhaseInfo(state.t);
    const ci = cycleIndexAt(state.t);
    const isSpring = ci % SPRING_EVERY === SPRING_EVERY - 1;
    // tide gauge (horizontal bar)
    const gx = 16;
    const gy = 14;
    const gw = 250;
    const gh = 14;
    ctx.fillStyle = "#06292b";
    ctx.fillRect(gx, gy, gw, gh);
    const lo = TIDE_BASE - TIDE_AMP_SPRING;
    const hi = TIDE_BASE + TIDE_AMP_SPRING;
    const frac = (water - lo) / (hi - lo);
    ctx.fillStyle = isSpring ? "#3a86a8" : "#2f6f86";
    ctx.fillRect(gx, gy, gw * Math.max(0, Math.min(1, frac)), gh);
    ctx.strokeStyle = "#1c4a4c";
    ctx.strokeRect(gx + 0.5, gy + 0.5, gw, gh);
    ctx.fillStyle = "#cfe7e0";
    ctx.font = "12px Segoe UI, sans-serif";
    ctx.fillText(`${info.label}${isSpring ? "  ·  SPRING TIDE" : ""}  ${info.rising ? "▲" : "▼"}`, gx, gy - 2);
    ctx.fillStyle = "#8fb0a8";
    ctx.font = "11px Segoe UI, sans-serif";
    const nextTxt = info.rising
        ? `high in ${info.nextHighIn.toFixed(0)}s`
        : `low in ${info.nextLowIn.toFixed(0)}s`;
    ctx.fillText(`Day ${state.day}  ·  ${nextTxt}`, gx, gy + gh + 14);
    // resources (stored / carried)
    const rx = 320;
    ctx.font = "12px Segoe UI, sans-serif";
    RES_ORDER.forEach((k, i) => {
        const x = rx + i * 150;
        ctx.fillStyle = RES_META[k].color;
        ctx.fillRect(x, 12, 10, 10);
        ctx.fillStyle = "#e8f1ee";
        ctx.fillText(`${RES_META[k].name}`, x + 16, 21);
        ctx.fillStyle = "#8fb0a8";
        ctx.fillText(`store ${state.stored[k]}  ·  carry ${state.carry[k]}`, x + 16, 36);
    });
    // basket fullness
    ctx.fillStyle = "#8fb0a8";
    ctx.fillText(`Basket ${totalCarry()}/${state.carryCap}`, rx, 52);
    // village progress
    ctx.fillStyle = "#e8f1ee";
    ctx.fillText(`Village ${state.platformsBuilt}/${GOAL_PLATFORMS}`, rx + 150, 52);
    // ---- bottom bar: build menu + message ----
    const by = HUD_TOP + GRID_H;
    ctx.fillStyle = "#0a2123";
    ctx.fillRect(0, by, W, HUD_BOTTOM);
    const opts = [
        { key: "1", kind: "boardwalk" },
        { key: "2", kind: "platform" },
    ];
    let bx = 16;
    opts.forEach((o) => {
        const def = STRUCTS[o.kind];
        const selected = state.buildSel === o.kind;
        const afford = canAfford(def);
        ctx.fillStyle = selected ? "#15413f" : "#0d2e30";
        ctx.fillRect(bx, by + 10, 210, 44);
        ctx.strokeStyle = selected ? "#e9c46a" : "#1c4a4c";
        ctx.strokeRect(bx + 0.5, by + 10.5, 210, 44);
        ctx.fillStyle = afford ? "#e8f1ee" : "#6d8983";
        ctx.font = "13px Segoe UI, sans-serif";
        ctx.fillText(`[${o.key}] ${def.label}`, bx + 10, by + 28);
        ctx.fillStyle = "#8fb0a8";
        ctx.font = "11px Segoe UI, sans-serif";
        const cost = [
            def.cost.wood ? `${def.cost.wood} wood` : "",
            def.cost.reed ? `${def.cost.reed} reed` : "",
            def.cost.clam ? `${def.cost.clam} clam` : "",
        ]
            .filter(Boolean)
            .join(", ");
        ctx.fillText(cost, bx + 10, by + 46);
        bx += 224;
    });
    // selection hint
    ctx.fillStyle = "#8fb0a8";
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.fillText(state.buildSel ? "click an adjacent tile to build · [0] cancel" : "press 1 or 2 to pick a structure", bx + 4, by + 24);
    // message
    if (state.messageT > 0) {
        ctx.fillStyle = `rgba(233,196,106,${Math.min(1, state.messageT)})`;
        ctx.font = "13px Segoe UI, sans-serif";
        ctx.fillText(state.message, bx + 4, by + 46);
    }
}
// ----------------------------------------------------------------------------
// Main loop
// ----------------------------------------------------------------------------
let last = 0;
let nodeTimer = 0;
function frame(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    // advance time
    const prevCycle = cycleIndexAt(state.t);
    state.t += dt;
    const newCycle = cycleIndexAt(state.t);
    if (newCycle > prevCycle)
        state.day++;
    state.messageT -= dt;
    // periodically top up forage nodes (only when exposed flats exist)
    nodeTimer += dt;
    if (nodeTimer > 2) {
        nodeTimer = 0;
        spawnNodes();
    }
    const water = waterLevelAt(state.t);
    checkStranded();
    // ---- draw ----
    ctx.clearRect(0, 0, W, H);
    const time = state.t;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++)
            drawTile(c, r, water, time);
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++)
            drawStruct(c, r, water);
    }
    for (const n of state.nodes)
        drawNode(n, water);
    drawHome();
    drawBuildGhost(water);
    drawPlayer();
    drawHUD(water);
    requestAnimationFrame(frame);
}
// ----------------------------------------------------------------------------
// Input
// ----------------------------------------------------------------------------
window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
        e.preventDefault();
    switch (k) {
        case "w":
        case "arrowup":
            tryMove(0, -1);
            break;
        case "s":
        case "arrowdown":
            tryMove(0, 1);
            break;
        case "a":
        case "arrowleft":
            tryMove(-1, 0);
            break;
        case "d":
        case "arrowright":
            tryMove(1, 0);
            break;
        case "1":
            state.buildSel = "boardwalk";
            setMessage("Boardwalk selected — click an adjacent tile.");
            break;
        case "2":
            state.buildSel = "platform";
            setMessage("Platform selected — click an adjacent tile.");
            break;
        case "0":
        case "escape":
            state.buildSel = null;
            break;
        case "r":
            newGame(state.seed + 1);
            break;
    }
});
canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (py < HUD_TOP || py >= HUD_TOP + GRID_H)
        return;
    const c = Math.floor(px / TILE);
    const r = Math.floor((py - HUD_TOP) / TILE);
    tryBuild(c, r);
});
// ----------------------------------------------------------------------------
// Go
// ----------------------------------------------------------------------------
newGame(1337);
requestAnimationFrame(frame);
//# sourceMappingURL=main.js.map
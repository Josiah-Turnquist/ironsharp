"use strict";
/*
 * Tidemarsh — a cozy tidal-survival prototype.
 *
 * Core loop:
 *   1. At LOW tide the mudflats are exposed (and it's daylight) — forage wood, reeds, clams.
 *   2. The tide RISES on a clock you can read; at HIGH tide it's night. Get onto high
 *      ground or a boardwalk before your tile floods, or you swim home and drop half your haul.
 *   3. Build boardwalks to reach farther, platforms to grow the village, and FARM crops
 *      to feed yourself — but the salt water kills any crop the tide reaches.
 *
 * The hook is ELEVATION. Every structure (and every crop) has a deck height. The
 * spring tide — predictable from the lunar calendar — drowns anything built or planted
 * too low. Read the moon, build high, plant on safe ground.
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
// Tide & lunar model
// ----------------------------------------------------------------------------
const CYCLE_SECONDS = 48; // one full low→high→low cycle (also one "day")
const TIDE_BASE = 0.45;
const TIDE_AMP_NORMAL = 0.18; // range 0.27 .. 0.63
const TIDE_AMP_SPRING = 0.29; // range 0.16 .. 0.74
const SPRING_EVERY = 3; // a spring tide every 3rd cycle (new & full moon)
const LUNAR_CYCLES = 6; // cycles per full lunar month (new=0, full=3)
const STRUCTS = {
    boardwalk: {
        kind: "boardwalk",
        label: "Boardwalk",
        cost: { wood: 2, reed: 1, clam: 0 },
        deckOffset: 0.26,
        deckFloor: 0.0,
    },
    platform: {
        kind: "platform",
        label: "Platform",
        cost: { wood: 3, reed: 2, clam: 1 },
        deckOffset: 0.4,
        deckFloor: 0.78, // above even a spring tide; this is the village + safe farmland
    },
};
const RES_ORDER = ["wood", "reed", "clam"];
const RES_META = {
    wood: { name: "Driftwood", color: "#c08440" },
    reed: { name: "Reeds", color: "#86c06a" },
    clam: { name: "Clams", color: "#dcd0c0" },
};
const FORAGE_TARGET = 11;
const SEED_COST_REED = 1; // planting a crop costs one reed
const CROP_GROW_SECONDS = 64; // ~1.3 cycles from seed to ripe
const CROP_FOOD_YIELD = 4;
const FOOD_PER_DAY = 2; // eaten at each tide rollover
const START_FOOD = 12;
const GOAL_PLATFORMS = 6;
// ----------------------------------------------------------------------------
// Villagers & requests
// ----------------------------------------------------------------------------
const REP_GOAL = 10; // reputation needed for the village to "thrive"
const VILLAGER_COOLDOWN = 8; // seconds of gratitude before a new request appears
const VILLAGER_HATS = ["#e07a5f", "#5f8fe0", "#c77dd6", "#5fc0a0", "#d6b14a"];
function rollWant() {
    if (Math.random() < 0.4) {
        return { type: "food", amount: 2 + Math.floor(Math.random() * 2) };
    }
    const res = RES_ORDER[Math.floor(Math.random() * RES_ORDER.length)];
    return { type: "resource", res, amount: 2 + Math.floor(Math.random() * 3) };
}
let particles = [];
function spawnParticles(c, r, color, n, spread = 1) {
    const cx = c * TILE + TILE / 2;
    const cy = HUD_TOP + r * TILE + TILE / 2;
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (0.5 + Math.random() * 1.5) * spread;
        particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(a) * sp * 30,
            vy: Math.sin(a) * sp * 30 - 20,
            life: 0.6 + Math.random() * 0.5,
            max: 1.1,
            color,
            size: 2 + Math.random() * 2,
        });
    }
}
// ----------------------------------------------------------------------------
// Sound (tiny Web Audio synth; resumed on first user gesture)
// ----------------------------------------------------------------------------
let audio = null;
function initAudio() {
    if (!audio) {
        try {
            audio = new (window.AudioContext || window.webkitAudioContext)();
        }
        catch {
            audio = null;
        }
    }
    if (audio && audio.state === "suspended")
        void audio.resume();
}
function beep(freq, dur, type = "sine", gain = 0.05) {
    if (!audio)
        return;
    const t0 = audio.currentTime;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
}
const SFX = {
    forage: () => beep(620, 0.12, "triangle", 0.05),
    build: () => beep(160, 0.16, "square", 0.04),
    plant: () => beep(440, 0.1, "sine", 0.04),
    harvest: () => {
        beep(660, 0.1, "triangle", 0.05);
        setTimeout(() => beep(880, 0.12, "triangle", 0.05), 90);
    },
    error: () => beep(120, 0.18, "sawtooth", 0.035),
    splash: () => {
        beep(300, 0.2, "sine", 0.05);
        setTimeout(() => beep(180, 0.25, "sine", 0.04), 80);
    },
    spring: () => {
        beep(200, 0.25, "sine", 0.05);
        setTimeout(() => beep(150, 0.35, "sine", 0.05), 120);
    },
};
// ----------------------------------------------------------------------------
// Seeded RNG
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
// Terrain generation (deterministic from seed → not stored in saves)
// ----------------------------------------------------------------------------
function generateTerrain(seed) {
    const rng = makeRng(seed);
    let field = new Array(COLS * ROWS).fill(0).map(() => rng());
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
    const home = { c: Math.floor(COLS * 0.32), r: Math.floor(ROWS * 0.5) };
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const dx = c - home.c;
            const dy = r - home.r;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const bump = Math.max(0, 1 - dist / 5);
            field[idx(c, r)] = field[idx(c, r)] * 0.7 + bump * 0.9;
        }
    }
    let min = Infinity;
    let max = -Infinity;
    for (const v of field) {
        if (v < min)
            min = v;
        if (v > max)
            max = v;
    }
    const elev = field.map((v) => (v - min) / (max - min || 1));
    elev[idx(home.c, home.r)] = 0.92;
    return { elev, home };
}
// ----------------------------------------------------------------------------
// Tide / lunar helpers
// ----------------------------------------------------------------------------
function cycleIndexAt(t) {
    return Math.floor(t / CYCLE_SECONDS);
}
function isSpringCycle(ci) {
    return ci % SPRING_EVERY === 0;
}
function ampForCycle(ci) {
    return isSpringCycle(ci) ? TIDE_AMP_SPRING : TIDE_AMP_NORMAL;
}
function waterLevelAt(t) {
    const ci = cycleIndexAt(t);
    const phase = (t / CYCLE_SECONDS - ci) * Math.PI * 2;
    return TIDE_BASE - ampForCycle(ci) * Math.cos(phase);
}
/** 0..1 within the current cycle (0 = low/day, .5 = high/night). */
function cycleFrac(t) {
    const ci = cycleIndexAt(t);
    return t / CYCLE_SECONDS - ci;
}
/** how "day" it is: 1 at low tide (bright), 0 at high tide (night). */
function dayness(t) {
    return (Math.cos(cycleFrac(t) * Math.PI * 2) + 1) / 2;
}
function tidePhaseInfo(t) {
    const frac = cycleFrac(t);
    const rising = frac < 0.5;
    let label;
    if (frac < 0.08 || frac > 0.92)
        label = "LOW TIDE";
    else if (frac > 0.42 && frac < 0.58)
        label = "HIGH TIDE";
    else
        label = rising ? "RISING" : "FALLING";
    const nextHighIn = ((0.5 - frac + 1) % 1) * CYCLE_SECONDS;
    const nextLowIn = ((1 - frac) % 1) * CYCLE_SECONDS;
    return { rising, label, nextHighIn, nextLowIn };
}
function moonPhase(ci) {
    return (ci % LUNAR_CYCLES) / LUNAR_CYCLES; // 0 new, .5 full
}
/** cycles until the next spring tide (0 = this cycle is a spring). */
function cyclesToSpring(ci) {
    let n = 0;
    while (!isSpringCycle(ci + n))
        n++;
    return n;
}
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
        if (e > 0.5)
            continue;
        if (c === state.home.c && r === state.home.r)
            continue;
        if (state.nodes.some((n) => n.c === c && n.r === r))
            continue;
        if (state.crops[idx(c, r)])
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
    if (state.elev[idx(node.c, node.r)] < water && !state.structs[idx(node.c, node.r)]) {
        setMessage("That flat is underwater — wait for the tide to fall.");
        return;
    }
    if (totalCarry() >= state.carryCap) {
        setMessage("Your basket is full — head home to store your haul.");
        SFX.error();
        return;
    }
    state.carry[node.kind] += node.amount;
    setMessage(`+${node.amount} ${RES_META[node.kind].name}`);
    spawnParticles(node.c, node.r, RES_META[node.kind].color, 8);
    SFX.forage();
    state.nodes.splice(i, 1);
}
// ----------------------------------------------------------------------------
// Crops
// ----------------------------------------------------------------------------
function tryHarvestOrClear() {
    const crop = state.crops[idx(state.player.c, state.player.r)];
    if (!crop)
        return;
    const i = idx(state.player.c, state.player.r);
    if (crop.dead) {
        state.crops[i] = null;
        setMessage("Cleared a salt-killed crop. Replant on higher ground.");
        spawnParticles(state.player.c, state.player.r, "#7a6a4a", 6);
        return;
    }
    if (crop.growth >= 1) {
        state.food += CROP_FOOD_YIELD;
        state.crops[i] = null;
        setMessage(`Harvested +${CROP_FOOD_YIELD} food (${state.food} stored).`);
        spawnParticles(state.player.c, state.player.r, "#e9c46a", 12);
        SFX.harvest();
    }
}
function tryPlant(c, r) {
    if (!inBounds(c, r))
        return;
    const adj = Math.abs(c - state.player.c) + Math.abs(r - state.player.r) === 1;
    if (!adj) {
        setMessage("Plant on a tile next to you.");
        return;
    }
    const i = idx(c, r);
    if (c === state.home.c && r === state.home.r) {
        setMessage("Can't plant on the house.");
        return;
    }
    if (state.crops[i]) {
        setMessage("Already planted there.");
        return;
    }
    if (state.nodes.some((n) => n.c === c && n.r === r)) {
        setMessage("Forage that spot before planting.");
        return;
    }
    const onPlatform = state.structs[i] === "platform";
    if (state.structs[i] === "boardwalk") {
        setMessage("Crops won't grow on a boardwalk — try soil or a platform.");
        return;
    }
    // soil must be farmland: marsh/high ground, or a raised platform bed
    if (!onPlatform && state.elev[i] < 0.45) {
        setMessage("Too muddy to farm — plant on higher soil or a platform.");
        return;
    }
    if (state.stored.reed < SEED_COST_REED) {
        setMessage("Need 1 reed to sow a seed.");
        SFX.error();
        return;
    }
    state.stored.reed -= SEED_COST_REED;
    state.crops[i] = { growth: 0, dead: false };
    setMessage("Sowed a seed. Keep it above the tideline or the salt will take it.");
    spawnParticles(c, r, "#86c06a", 6);
    SFX.plant();
}
function updateCrops(dt, water) {
    for (let i = 0; i < state.crops.length; i++) {
        const crop = state.crops[i];
        if (!crop || crop.dead)
            continue;
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        if (deckHeight(c, r) < water) {
            crop.dead = true; // salt water reached it
            spawnParticles(c, r, "#6b6b6b", 5);
            continue;
        }
        if (crop.growth < 1)
            crop.growth = Math.min(1, crop.growth + dt / CROP_GROW_SECONDS);
    }
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
    if (state.buildSel === "crop") {
        tryPlant(c, r);
        return;
    }
    if (!state.buildSel)
        return;
    if (!inBounds(c, r))
        return;
    const def = STRUCTS[state.buildSel];
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
        SFX.error();
        return;
    }
    state.stored.wood -= def.cost.wood;
    state.stored.reed -= def.cost.reed;
    state.stored.clam -= def.cost.clam;
    state.structs[idx(c, r)] = def.kind;
    state.crops[idx(c, r)] = null;
    spawnParticles(c, r, "#caa15e", 10);
    SFX.build();
    if (def.kind === "platform") {
        state.platformsBuilt++;
        // a neighbour moves onto the new platform with a request
        state.villagers.push({
            c,
            r,
            hat: state.villagers.length % VILLAGER_HATS.length,
            want: rollWant(),
            cooldown: 0,
        });
        if (state.platformsBuilt >= GOAL_PLATFORMS && !state.won) {
            state.won = true;
            setMessage("The village has its six platforms! A neighbour moved in — see what they need.");
        }
        else {
            setMessage(`Platform raised — a neighbour moves in (${state.platformsBuilt}/${GOAL_PLATFORMS}). Safe to farm.`);
        }
    }
    else {
        setMessage("Boardwalk laid. Watch its deck height at spring tide.");
    }
}
// ----------------------------------------------------------------------------
// Villagers
// ----------------------------------------------------------------------------
function wantText(w) {
    return w.type === "food" ? `${w.amount} food` : `${w.amount} ${RES_META[w.res].name.toLowerCase()}`;
}
function tryFulfillVillager() {
    const v = state.villagers.find((vv) => vv.c === state.player.c && vv.r === state.player.r);
    if (!v || !v.want || v.cooldown > 0)
        return;
    const w = v.want;
    // pay from the home stockpile / food stores
    if (w.type === "food") {
        if (state.food < w.amount) {
            setMessage(`Neighbour wants ${wantText(w)} — harvest more first.`);
            SFX.error();
            return;
        }
        state.food -= w.amount;
    }
    else {
        if (state.stored[w.res] < w.amount) {
            setMessage(`Neighbour wants ${wantText(w)} — gather more first.`);
            SFX.error();
            return;
        }
        state.stored[w.res] -= w.amount;
    }
    // reward: reputation + a small gift so the economy keeps flowing
    state.rep += 1;
    v.want = null;
    v.cooldown = VILLAGER_COOLDOWN;
    let gift;
    if (Math.random() < 0.5) {
        state.food += 2;
        gift = "+2 food";
    }
    else {
        const r = RES_ORDER[Math.floor(Math.random() * RES_ORDER.length)];
        state.stored[r] += 1;
        gift = `+1 ${RES_META[r].name.toLowerCase()}`;
    }
    spawnParticles(v.c, v.r, "#e9c46a", 12);
    SFX.harvest();
    if (state.rep >= REP_GOAL && !state.thrived) {
        state.thrived = true;
        setMessage(`Reputation ${state.rep}! The marsh is a true village now. Thank you, neighbour. (${gift})`);
    }
    else {
        setMessage(`Delivered ${wantText(w)}. Reputation ${state.rep}/${REP_GOAL}. They gift you ${gift}.`);
    }
}
function updateVillagers(dt) {
    for (const v of state.villagers) {
        if (v.cooldown > 0) {
            v.cooldown -= dt;
            if (v.cooldown <= 0) {
                v.cooldown = 0;
                v.want = rollWant();
            }
        }
    }
}
// ----------------------------------------------------------------------------
// Movement & tide-catching
// ----------------------------------------------------------------------------
function tryMove(dc, dr) {
    if (state.gameOver)
        return;
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
    tryHarvestOrClear();
    tryFulfillVillager();
    if (atHome())
        storeHaul();
}
function checkStranded() {
    const water = waterLevelAt(state.t);
    if (!isWalkable(state.player.c, state.player.r, water)) {
        let dropped = 0;
        for (const k of RES_ORDER) {
            const lose = Math.floor(state.carry[k] / 2);
            state.carry[k] -= lose;
            dropped += lose;
        }
        spawnParticles(state.player.c, state.player.r, "#7fd3e0", 16, 1.6);
        SFX.splash();
        state.player.c = state.home.c;
        state.player.r = state.home.r;
        storeHaul();
        setMessage(dropped > 0
            ? "The tide caught you! You swam home and lost half your haul."
            : "The tide caught you — you swam home empty-handed.");
    }
}
// ----------------------------------------------------------------------------
// Daily upkeep (hunger) + day rollover
// ----------------------------------------------------------------------------
function onNewDay() {
    state.day++;
    state.food -= FOOD_PER_DAY;
    if (state.food < 0) {
        state.food = 0;
        state.gameOver = "starved";
        SFX.error();
        return;
    }
    if (isSpringCycle(cycleIndexAt(state.t)))
        SFX.spring();
    if (state.food <= FOOD_PER_DAY * 2) {
        setMessage(`Day ${state.day}. Low on food (${state.food}) — harvest a crop soon.`);
    }
    else {
        setMessage(`Day ${state.day}. Ate ${FOOD_PER_DAY} food (${state.food} left).`);
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
// Save / load (localStorage)
// ----------------------------------------------------------------------------
const SAVE_KEY = "tidemarsh.save";
const SAVE_VERSION = 4;
function saveGame() {
    try {
        const data = {
            v: SAVE_VERSION,
            seed: state.seed,
            t: state.t,
            day: state.day,
            food: state.food,
            platformsBuilt: state.platformsBuilt,
            rep: state.rep,
            thrived: state.thrived,
            villagers: state.villagers,
            won: state.won,
            gameOver: state.gameOver,
            player: state.player,
            stored: state.stored,
            carry: state.carry,
            structs: state.structs,
            crops: state.crops.map((c) => (c ? { g: +c.growth.toFixed(3), d: c.dead ? 1 : 0 } : 0)),
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    }
    catch {
        /* storage unavailable; ignore */
    }
}
function loadGame() {
    let raw = null;
    try {
        raw = localStorage.getItem(SAVE_KEY);
    }
    catch {
        return false;
    }
    if (!raw)
        return false;
    try {
        const d = JSON.parse(raw);
        if (d.v !== SAVE_VERSION || typeof d.seed !== "number")
            return false;
        const { elev, home } = generateTerrain(d.seed);
        state = {
            elev,
            home,
            structs: Array.isArray(d.structs) && d.structs.length === COLS * ROWS ? d.structs : new Array(COLS * ROWS).fill(null),
            crops: Array.isArray(d.crops) && d.crops.length === COLS * ROWS
                ? d.crops.map((c) => (c ? { growth: c.g, dead: !!c.d } : null))
                : new Array(COLS * ROWS).fill(null),
            nodes: [],
            player: d.player ?? { ...home },
            carry: d.carry ?? { wood: 0, reed: 0, clam: 0 },
            stored: d.stored ?? { wood: 0, reed: 0, clam: 0 },
            food: typeof d.food === "number" ? d.food : START_FOOD,
            t: typeof d.t === "number" ? d.t : 0,
            day: typeof d.day === "number" ? d.day : 1,
            buildSel: null,
            platformsBuilt: d.platformsBuilt ?? 0,
            villagers: Array.isArray(d.villagers) ? d.villagers : [],
            rep: typeof d.rep === "number" ? d.rep : 0,
            thrived: !!d.thrived,
            won: !!d.won,
            gameOver: d.gameOver === "starved" ? "starved" : "",
            message: "Welcome back to the marsh.",
            messageT: 5,
            seed: d.seed,
            carryCap: 12,
        };
        spawnNodes();
        return true;
    }
    catch {
        return false;
    }
}
// ----------------------------------------------------------------------------
// Init / restart
// ----------------------------------------------------------------------------
function newGame(seed) {
    const { elev, home } = generateTerrain(seed);
    state = {
        elev,
        structs: new Array(COLS * ROWS).fill(null),
        crops: new Array(COLS * ROWS).fill(null),
        nodes: [],
        home,
        player: { c: home.c, r: home.r },
        carry: { wood: 0, reed: 0, clam: 0 },
        stored: { wood: 4, reed: 3, clam: 0 },
        food: START_FOOD,
        t: 0,
        day: 1,
        buildSel: null,
        platformsBuilt: 0,
        villagers: [],
        rep: 0,
        thrived: false,
        won: false,
        gameOver: "",
        message: "Low tide, daylight. Forage the flats, then plant a crop on high ground.",
        messageT: 7,
        seed,
        carryCap: 12,
    };
    particles = [];
    spawnNodes();
    saveGame();
}
// ----------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
function elevColor(e) {
    if (e < 0.3)
        return "#6f5a3e";
    if (e < 0.45)
        return "#8a724a";
    if (e < 0.6)
        return "#6f8f55";
    if (e < 0.78)
        return "#5e9a52";
    return "#7caa5a";
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function drawTile(c, r, water, time) {
    const x = c * TILE;
    const y = HUD_TOP + r * TILE;
    const e = state.elev[idx(c, r)];
    if (e < water) {
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
        if (e < 0.45) {
            ctx.fillStyle = "rgba(0,0,0,0.08)";
            ctx.fillRect(x + 6, y + 8, 2, 2);
            ctx.fillRect(x + 18, y + 20, 2, 2);
            ctx.fillRect(x + 24, y + 6, 2, 2);
        }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.strokeRect(x + 0.5, y + 0.5, TILE, TILE);
}
function drawStruct(c, r, water) {
    const kind = state.structs[idx(c, r)];
    if (!kind)
        return;
    const x = c * TILE;
    const y = HUD_TOP + r * TILE;
    const flooded = deckHeight(c, r) < water;
    if (kind === "boardwalk") {
        ctx.fillStyle = flooded ? "rgba(150,110,70,0.45)" : "#b5793f";
        ctx.fillRect(x + 3, y + 9, TILE - 6, TILE - 18);
        ctx.fillStyle = flooded ? "rgba(120,85,55,0.45)" : "#946031";
        for (let i = 0; i < 4; i++)
            ctx.fillRect(x + 4 + i * 6, y + 10, 2, TILE - 20);
    }
    else {
        ctx.fillStyle = "#7a4f28";
        ctx.fillRect(x + 5, y + 5, 3, TILE - 10);
        ctx.fillRect(x + TILE - 8, y + 5, 3, TILE - 10);
        ctx.fillStyle = flooded ? "rgba(190,140,80,0.6)" : "#caa15e";
        ctx.fillRect(x + 3, y + 6, TILE - 6, TILE - 14);
        ctx.strokeStyle = "#8a5f30";
        ctx.strokeRect(x + 3.5, y + 6.5, TILE - 7, TILE - 15);
    }
}
function drawCrop(c, r) {
    const crop = state.crops[idx(c, r)];
    if (!crop)
        return;
    const x = c * TILE;
    const y = HUD_TOP + r * TILE;
    const cx = x + TILE / 2;
    const baseY = y + TILE - 7;
    if (crop.dead) {
        ctx.strokeStyle = "#6f6149";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 3, baseY);
        ctx.lineTo(cx - 5, baseY - 6);
        ctx.moveTo(cx + 3, baseY);
        ctx.lineTo(cx + 6, baseY - 5);
        ctx.stroke();
        ctx.lineWidth = 1;
        return;
    }
    const ripe = crop.growth >= 1;
    const hgt = 5 + crop.growth * 13;
    ctx.strokeStyle = ripe ? "#cde06a" : "#79b94e";
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 4, baseY);
        ctx.lineTo(cx + i * 4 + i * 1.5, baseY - hgt);
        ctx.stroke();
    }
    ctx.lineWidth = 1;
    if (ripe) {
        ctx.fillStyle = "#e9c46a";
        for (let i = -1; i <= 1; i++)
            ctx.fillRect(cx + i * 4 - 1.5, baseY - hgt - 2, 4, 4);
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
    ctx.fillStyle = "#6b4523";
    ctx.fillRect(x + 6, y + 18, 3, 12);
    ctx.fillRect(x + TILE - 9, y + 18, 3, 12);
    ctx.fillStyle = "#caa15e";
    ctx.fillRect(x + 5, y + 12, TILE - 10, 12);
    ctx.fillStyle = "#8a4b2f";
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 12);
    ctx.lineTo(x + TILE / 2, y + 3);
    ctx.lineTo(x + TILE - 2, y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5b3a1f";
    ctx.fillRect(x + TILE / 2 - 2, y + 16, 4, 8);
}
function drawResIcon(kind, x, y) {
    ctx.fillStyle = RES_META[kind].color;
    ctx.fillRect(x, y, 8, 8);
}
function drawVillagers() {
    for (const v of state.villagers) {
        const x = v.c * TILE;
        const y = HUD_TOP + v.r * TILE;
        const cx = x + TILE / 2;
        const cy = y + TILE / 2;
        // little figure
        ctx.fillStyle = "#23323a";
        ctx.beginPath();
        ctx.arc(cx, cy + 1, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = VILLAGER_HATS[v.hat];
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 5, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx - 6, cy - 4, 12, 2);
        // request bubble above
        const bx = cx;
        const by = y - 6;
        if (v.want && v.cooldown <= 0) {
            const label = v.want.type === "food" ? `${v.want.amount}` : `${v.want.amount}`;
            ctx.fillStyle = "rgba(245,245,235,0.95)";
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            const bw = 34;
            const bh = 18;
            ctx.beginPath();
            ctx.roundRect(bx - bw / 2, by - bh, bw, bh, 4);
            ctx.fill();
            ctx.stroke();
            // little tail
            ctx.beginPath();
            ctx.moveTo(bx - 3, by);
            ctx.lineTo(bx + 3, by);
            ctx.lineTo(bx, by + 4);
            ctx.closePath();
            ctx.fill();
            if (v.want.type === "food") {
                ctx.fillStyle = "#e07a5f";
                ctx.font = "11px Segoe UI, sans-serif";
                ctx.fillText("🍲", bx - 13, by - 4);
            }
            else {
                drawResIcon(v.want.res, bx - 13, by - bh + 5);
            }
            ctx.fillStyle = "#243038";
            ctx.font = "bold 11px Segoe UI, sans-serif";
            ctx.fillText(label, bx + 1, by - 4);
        }
        else if (v.cooldown > 0) {
            ctx.fillStyle = "rgba(233,120,120,0.95)";
            ctx.font = "12px Segoe UI, sans-serif";
            ctx.fillText("♥", bx - 4, by - 2);
        }
    }
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
    ctx.fillStyle = "#e9c46a";
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 6, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 8, cy - 4, 16, 2);
}
function drawBuildGhost() {
    if (!state.buildSel)
        return;
    const isCrop = state.buildSel === "crop";
    const def = isCrop ? null : STRUCTS[state.buildSel];
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
        const i = idx(c, r);
        if (c === state.home.c && r === state.home.r)
            continue;
        if (state.crops[i])
            continue;
        let ok;
        if (isCrop) {
            const onPlatform = state.structs[i] === "platform";
            ok = state.stored.reed >= SEED_COST_REED && state.structs[i] !== "boardwalk" && (onPlatform || state.elev[i] >= 0.45);
        }
        else {
            ok = !state.structs[i] && canAfford(def);
        }
        const x = c * TILE;
        const y = HUD_TOP + r * TILE;
        const tint = isCrop ? "120,200,110" : "233,196,106";
        ctx.fillStyle = ok ? `rgba(${tint},0.25)` : "rgba(220,90,90,0.22)";
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = ok ? `rgba(${tint},0.8)` : "rgba(220,90,90,0.7)";
        ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
        if (ok) {
            const futureDeck = isCrop
                ? (state.structs[i] === "platform" ? STRUCTS.platform.deckFloor : state.elev[i])
                : Math.max(def.deckFloor, state.elev[i] + def.deckOffset);
            const springHigh = TIDE_BASE + TIDE_AMP_SPRING;
            if (futureDeck < springHigh) {
                ctx.fillStyle = "rgba(120,200,235,0.95)";
                ctx.font = "9px sans-serif";
                ctx.fillText(isCrop ? "salts @spring" : "floods @spring", x + 3, y + TILE - 4);
            }
        }
    }
}
function drawNightOverlay() {
    const d = dayness(state.t);
    // darkness toward night (high tide)
    const dark = (1 - d) * 0.5;
    if (dark > 0.01) {
        ctx.fillStyle = `rgba(8,16,42,${dark})`;
        ctx.fillRect(0, HUD_TOP, GRID_W, GRID_H);
    }
    // warm dawn/dusk glow when transitioning
    const glow = Math.max(0, 1 - Math.abs(d - 0.5) * 4) * 0.12;
    if (glow > 0.01) {
        ctx.fillStyle = `rgba(255,150,70,${glow})`;
        ctx.fillRect(0, HUD_TOP, GRID_W, GRID_H);
    }
}
function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}
function updateParticles(dt) {
    for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 90 * dt;
        p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
}
// ---- HUD ----
function drawMoon(x, y, rad, phase) {
    // phase 0 = new (dark), 0.5 = full (bright)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fillStyle = "#2a3550";
    ctx.fill();
    // illuminated fraction = full at .5, new at 0/1
    const illum = 1 - Math.abs(phase * 2 - 1); // 0..1
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#e8eaf2";
    const waxing = phase < 0.5;
    const w = rad * 2 * illum;
    if (waxing)
        ctx.fillRect(x + rad - w, y - rad, w, rad * 2);
    else
        ctx.fillRect(x - rad, y - rad, w, rad * 2);
    ctx.restore();
    ctx.strokeStyle = "#46506e";
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.stroke();
}
function drawHUD(water) {
    ctx.fillStyle = "#0a2123";
    ctx.fillRect(0, 0, W, HUD_TOP);
    const info = tidePhaseInfo(state.t);
    const ci = cycleIndexAt(state.t);
    const spring = isSpringCycle(ci);
    // tide gauge
    const gx = 16;
    const gy = 14;
    const gw = 230;
    const gh = 14;
    ctx.fillStyle = "#06292b";
    ctx.fillRect(gx, gy, gw, gh);
    const lo = TIDE_BASE - TIDE_AMP_SPRING;
    const hi = TIDE_BASE + TIDE_AMP_SPRING;
    const frac = (water - lo) / (hi - lo);
    ctx.fillStyle = spring ? "#3a86a8" : "#2f6f86";
    ctx.fillRect(gx, gy, gw * Math.max(0, Math.min(1, frac)), gh);
    ctx.strokeStyle = "#1c4a4c";
    ctx.strokeRect(gx + 0.5, gy + 0.5, gw, gh);
    ctx.fillStyle = "#cfe7e0";
    ctx.font = "12px Segoe UI, sans-serif";
    ctx.fillText(`${info.label}${spring ? "  ·  SPRING TIDE" : ""}  ${info.rising ? "▲" : "▼"}`, gx, gy - 2);
    ctx.fillStyle = "#8fb0a8";
    ctx.font = "11px Segoe UI, sans-serif";
    const nextTxt = info.rising ? `high in ${info.nextHighIn.toFixed(0)}s` : `low in ${info.nextLowIn.toFixed(0)}s`;
    ctx.fillText(`Day ${state.day}  ·  ${nextTxt}`, gx, gy + gh + 14);
    // moon + spring prediction
    const mx = gx + gw + 26;
    drawMoon(mx, gy + 8, 11, moonPhase(ci));
    ctx.fillStyle = "#8fb0a8";
    ctx.font = "11px Segoe UI, sans-serif";
    const toSpring = cyclesToSpring(ci);
    ctx.fillText(spring ? "spring now!" : `spring in ${toSpring}d`, mx + 16, gy + 5);
    ctx.fillText("moon", mx + 16, gy + 19);
    // resources
    const rx = 330;
    ctx.font = "12px Segoe UI, sans-serif";
    RES_ORDER.forEach((k, i) => {
        const x = rx + i * 130;
        ctx.fillStyle = RES_META[k].color;
        ctx.fillRect(x, 12, 10, 10);
        ctx.fillStyle = "#e8f1ee";
        ctx.fillText(`${RES_META[k].name}`, x + 16, 21);
        ctx.fillStyle = "#8fb0a8";
        ctx.fillText(`${state.stored[k]} · +${state.carry[k]}`, x + 16, 36);
    });
    // food + basket + village
    ctx.fillStyle = state.food <= FOOD_PER_DAY * 2 ? "#e07a5f" : "#e9c46a";
    ctx.font = "13px Segoe UI, sans-serif";
    ctx.fillText(`🍲 Food ${state.food}`, rx, 54);
    ctx.fillStyle = "#8fb0a8";
    ctx.font = "12px Segoe UI, sans-serif";
    ctx.fillText(`Basket ${totalCarry()}/${state.carryCap}`, rx + 130, 54);
    ctx.fillStyle = "#e8f1ee";
    ctx.fillText(`Village ${state.platformsBuilt}/${GOAL_PLATFORMS}`, rx + 240, 54);
    ctx.fillStyle = state.thrived ? "#9be07a" : "#e8f1ee";
    ctx.fillText(`★ Rep ${state.rep}/${REP_GOAL}`, rx + 360, 54);
    // bottom: build menu
    const by = HUD_TOP + GRID_H;
    ctx.fillStyle = "#0a2123";
    ctx.fillRect(0, by, W, HUD_BOTTOM);
    const opts = [
        { key: "1", sel: "boardwalk", label: "Boardwalk", cost: "2 wood, 1 reed", afford: canAfford(STRUCTS.boardwalk) },
        { key: "2", sel: "platform", label: "Platform", cost: "3 wood, 2 reed, 1 clam", afford: canAfford(STRUCTS.platform) },
        { key: "3", sel: "crop", label: "Plant crop", cost: "1 reed → food", afford: state.stored.reed >= SEED_COST_REED },
    ];
    let bx = 12;
    for (const o of opts) {
        const selected = state.buildSel === o.sel;
        ctx.fillStyle = selected ? "#15413f" : "#0d2e30";
        ctx.fillRect(bx, by + 10, 184, 44);
        ctx.strokeStyle = selected ? "#e9c46a" : "#1c4a4c";
        ctx.strokeRect(bx + 0.5, by + 10.5, 184, 44);
        ctx.fillStyle = o.afford ? "#e8f1ee" : "#6d8983";
        ctx.font = "13px Segoe UI, sans-serif";
        ctx.fillText(`[${o.key}] ${o.label}`, bx + 10, by + 28);
        ctx.fillStyle = "#8fb0a8";
        ctx.font = "11px Segoe UI, sans-serif";
        ctx.fillText(o.cost, bx + 10, by + 46);
        bx += 196;
    }
    ctx.fillStyle = "#8fb0a8";
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.fillText(state.buildSel ? "click an adjacent tile · [0] cancel" : "pick 1/2/3, then click a tile", bx + 4, by + 24);
    if (state.messageT > 0) {
        ctx.fillStyle = `rgba(233,196,106,${Math.min(1, state.messageT)})`;
        ctx.font = "13px Segoe UI, sans-serif";
        ctx.fillText(state.message, bx + 4, by + 46);
    }
}
function drawGameOver() {
    if (!state.gameOver)
        return;
    ctx.fillStyle = "rgba(6,12,18,0.78)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e07a5f";
    ctx.font = "bold 34px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("The marsh outlasted you", W / 2, H / 2 - 30);
    ctx.fillStyle = "#e8f1ee";
    ctx.font = "16px Segoe UI, sans-serif";
    ctx.fillText(`You ran out of food on day ${state.day}.`, W / 2, H / 2 + 6);
    ctx.fillStyle = "#8fb0a8";
    ctx.font = "14px Segoe UI, sans-serif";
    ctx.fillText("Press R to start a new marsh.", W / 2, H / 2 + 36);
    ctx.textAlign = "left";
}
// ----------------------------------------------------------------------------
// Main loop
// ----------------------------------------------------------------------------
let last = 0;
let nodeTimer = 0;
let saveTimer = 0;
function frame(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!state.gameOver) {
        const prevCycle = cycleIndexAt(state.t);
        state.t += dt;
        if (cycleIndexAt(state.t) > prevCycle)
            onNewDay();
        state.messageT -= dt;
        const water = waterLevelAt(state.t);
        updateCrops(dt, water);
        updateVillagers(dt);
        checkStranded();
        nodeTimer += dt;
        if (nodeTimer > 2) {
            nodeTimer = 0;
            spawnNodes();
        }
        saveTimer += dt;
        if (saveTimer > 3) {
            saveTimer = 0;
            saveGame();
        }
    }
    updateParticles(dt);
    const water = waterLevelAt(state.t);
    ctx.clearRect(0, 0, W, H);
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
            drawTile(c, r, water, state.t);
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
            drawStruct(c, r, water);
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
            drawCrop(c, r);
    for (const n of state.nodes)
        drawNode(n, water);
    drawHome();
    drawBuildGhost();
    drawVillagers();
    drawPlayer();
    drawParticles();
    drawNightOverlay();
    drawHUD(water);
    drawGameOver();
    requestAnimationFrame(frame);
}
// ----------------------------------------------------------------------------
// Input
// ----------------------------------------------------------------------------
window.addEventListener("keydown", (e) => {
    initAudio();
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
        e.preventDefault();
    if (k === "r") {
        newGame(state.seed + 1);
        return;
    }
    if (state.gameOver)
        return;
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
        case "3":
            state.buildSel = "crop";
            setMessage("Planting — click adjacent soil or a platform (keep it above the tideline).");
            break;
        case "0":
        case "escape":
            state.buildSel = null;
            break;
    }
});
canvas.addEventListener("mousedown", (e) => {
    initAudio();
    if (state.gameOver)
        return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (py < HUD_TOP || py >= HUD_TOP + GRID_H)
        return;
    const c = Math.floor(px / TILE);
    const r = Math.floor((py - HUD_TOP) / TILE);
    tryBuild(c, r);
});
window.addEventListener("beforeunload", saveGame);
// Debug accessor (handy for a prototype: poke state from the console / tests).
window.__tm = {
    state: () => state,
    setTime: (v) => {
        state.t = v;
    },
};
// ----------------------------------------------------------------------------
// Go
// ----------------------------------------------------------------------------
if (!loadGame())
    newGame(1337);
requestAnimationFrame(frame);
//# sourceMappingURL=main.js.map
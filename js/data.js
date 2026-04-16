// ============================================================
// DATA + HELPERS — constants, rosters, math utilities
// ============================================================

// Math helpers
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if(!m) return null;
  return parseInt(m[1],16) + ',' + parseInt(m[2],16) + ',' + parseInt(m[3],16);
}
function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
function easeInQuad(t) { return t * t; }
function easeOutBack(t) { const c = 2.2; return 1 + c * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }


// Character roster + stage roster (add new entries here)
// ============================================================
// CHARACTER & STAGE ROSTERS
// ============================================================
const CHARACTERS = [
  { id: 'aurora',  name: 'AURORA',  color: '#e8f4ff', glow: '#3bf0ff', hp: 100, speed: 1.00, dmg: 1.00, desc: 'BALANCED',     ultName: 'AURORA STORM',  ultSeq: 'aurora'  },
  { id: 'crimson', name: 'CRIMSON', color: '#ffe0e8', glow: '#ff3860', hp:  92, speed: 1.10, dmg: 1.08, desc: 'GLASS · QUICK', ultName: 'CRIMSON BLAZE', ultSeq: 'crimson' },
  { id: 'jade',    name: 'JADE',    color: '#dfffe0', glow: '#44ff88', hp: 125, speed: 0.88, dmg: 0.95, desc: 'TANK · SLOW',   ultName: 'JADE QUAKE',    ultSeq: 'jade'    },
  { id: 'noir',    name: 'NOIR',    color: '#fff0c0', glow: '#ffcc00', hp:  88, speed: 1.18, dmg: 1.12, desc: 'BERSERKER',     ultName: 'NOIR SHROUD',   ultSeq: 'noir'    },
];
const STAGES = [
  { id: 'twilight', name: 'TWILIGHT TOWER' },
  { id: 'dojo',     name: 'OLD DOJO' },
  { id: 'inferno',  name: 'INFERNO PIT' },
];
let p1Char = CHARACTERS[0];
let p2Char = CHARACTERS[1];
let currentStage = STAGES[0];
let setupPhase = 'p1';   // 'p1' | 'p2' | 'stage'

// Ultimate move choreography — 9 hits timed as frame ranges
// ============================================================
// ULTIMATE CHOREOGRAPHY  (multi-hit cinematic combo)
// ============================================================
// ============================================================
// PER-CHARACTER ULTIMATE SEQUENCES
// ============================================================
// Each sequence: { total, theme: { color, accent, particle }, hits: [...] }
// 'pull' keeps victim close. 'launch' pops them up. 'aerial' expects
// both fighters airborne. 'finisher' is the final big hit.

// --- AURORA STORM: 11 quick lightning zaps, ice shatter finish ---
const AURORA_ULT = {
  total: 120,
  theme: { color: '#3bf0ff', accent: '#ffffff', particle: '#80f0ff' },
  hits: [
    { start: 12, end: 16, dmg: 2, kb: 1,   up: 0,   reach: 60, boxY: -72, boxH: 26, pull: true },
    { start: 22, end: 25, dmg: 2, kb: 1,   up: 0,   reach: 55, boxY: -70, boxH: 24, pull: true },
    { start: 28, end: 31, dmg: 2, kb: 1,   up: 0,   reach: 55, boxY: -68, boxH: 24, pull: true },
    { start: 34, end: 37, dmg: 2, kb: 1,   up: 0,   reach: 55, boxY: -72, boxH: 24, pull: true },
    { start: 42, end: 48, dmg: 4, kb: 2,   up: -1,  reach: 68, boxY: -55, boxH: 30, pull: true },
    { start: 54, end: 60, dmg: 4, kb: 2,   up: -14, reach: 68, boxY: -80, boxH: 40, launch: true, pull: true },
    { start: 68, end: 72, dmg: 3, kb: 1.5, up: -2,  reach: 65, boxY: -50, boxH: 28, aerial: true, pull: true },
    { start: 76, end: 80, dmg: 3, kb: 1.5, up: -2,  reach: 65, boxY: -55, boxH: 28, aerial: true, pull: true },
    { start: 86, end: 90, dmg: 3, kb: 2,   up: 0,   reach: 80, boxY: -65, boxH: 35, pull: true },
    { start: 96, end: 100,dmg: 3, kb: 3,   up: -3,  reach: 75, boxY: -70, boxH: 40, pull: true },
    { start: 106,end: 114,dmg: 10,kb: 20,  up: 8,   reach: 85, boxY: -35, boxH: 60, finisher: true },
  ],
};

// --- CRIMSON BLAZE: 7 heavy fire hits, inferno slam finish ---
const CRIMSON_ULT = {
  total: 100,
  theme: { color: '#ff3860', accent: '#ff8800', particle: '#ff6040' },
  hits: [
    { start: 10, end: 16, dmg: 5, kb: 2,   up: 0,   reach: 70, boxY: -72, boxH: 30, pull: true },
    { start: 24, end: 32, dmg: 6, kb: 3,   up: -16, reach: 68, boxY: -85, boxH: 45, launch: true, pull: true },
    { start: 42, end: 48, dmg: 4, kb: 1.5, up: -3,  reach: 65, boxY: -50, boxH: 30, aerial: true, pull: true },
    { start: 52, end: 58, dmg: 4, kb: 1.5, up: -2,  reach: 65, boxY: -55, boxH: 30, aerial: true, pull: true },
    { start: 64, end: 72, dmg: 6, kb: 4,   up: -4,  reach: 80, boxY: -65, boxH: 45, pull: true },
    { start: 80, end: 86, dmg: 5, kb: 5,   up: 5,   reach: 75, boxY: -40, boxH: 50, pull: true },
    { start: 90, end: 98, dmg: 12,kb: 22,  up: 10,  reach: 90, boxY: -30, boxH: 60, finisher: true },
  ],
};

// --- JADE QUAKE: 5 devastating earth hits, ground-pound finish ---
const JADE_ULT = {
  total: 130,
  theme: { color: '#44ff88', accent: '#886644', particle: '#66cc44' },
  hits: [
    { start: 16, end: 26, dmg: 6,  kb: 3, up: 0,   reach: 90, boxY: -50, boxH: 50, pull: true },
    { start: 36, end: 48, dmg: 8,  kb: 4, up: -2,  reach: 80, boxY: -70, boxH: 40, pull: true },
    { start: 58, end: 68, dmg: 8,  kb: 3, up: -18, reach: 72, boxY: -90, boxH: 50, launch: true, pull: true },
    { start: 82, end: 92, dmg: 8,  kb: 4, up: -5,  reach: 80, boxY: -60, boxH: 50, aerial: true, pull: true },
    { start: 108,end: 120,dmg: 18, kb: 24,up: 12,  reach: 100,boxY: -30, boxH: 70, finisher: true },
  ],
};

// --- NOIR SHROUD: 8 shadow-chain hits, darkness explosion finish ---
const NOIR_ULT = {
  total: 110,
  theme: { color: '#ffcc00', accent: '#8a40cc', particle: '#cc80ff' },
  hits: [
    { start: 10, end: 14, dmg: 3, kb: 1,   up: 0,   reach: 60, boxY: -72, boxH: 28, pull: true },
    { start: 20, end: 24, dmg: 3, kb: 1,   up: 0,   reach: 58, boxY: -70, boxH: 26, pull: true },
    { start: 28, end: 32, dmg: 3, kb: 1,   up: 0,   reach: 58, boxY: -68, boxH: 26, pull: true },
    { start: 36, end: 40, dmg: 3, kb: 1,   up: 0,   reach: 60, boxY: -72, boxH: 26, pull: true },
    { start: 48, end: 56, dmg: 5, kb: 2,   up: -16, reach: 68, boxY: -85, boxH: 45, launch: true, pull: true },
    { start: 64, end: 70, dmg: 5, kb: 2,   up: -3,  reach: 70, boxY: -55, boxH: 35, aerial: true, pull: true },
    { start: 78, end: 84, dmg: 4, kb: 3,   up: -2,  reach: 75, boxY: -65, boxH: 40, pull: true },
    { start: 96, end: 106,dmg: 14,kb: 22,  up: 10,  reach: 90, boxY: -30, boxH: 60, finisher: true },
  ],
};

// Lookup table — keyed by character.ultSeq
const ULT_SEQUENCES = {
  aurora:  AURORA_ULT,
  crimson: CRIMSON_ULT,
  jade:    JADE_ULT,
  noir:    NOIR_ULT,
};

// Legacy fallback (used by any code that still references the old global)
const ULT_SEQUENCE = AURORA_ULT;

// Resolve which hit is active at a given frame, for a given sequence.
function currentUltHit(frame, seq) {
  const s = seq || ULT_SEQUENCE;
  for(let i = 0; i < s.hits.length; i++) {
    const h = s.hits[i];
    if(frame >= h.start && frame <= h.end) return { hit: h, index: i };
  }
  return null;
}

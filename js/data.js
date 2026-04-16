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
// Total duration ~135 frames.  Each "hit" has { start, end, dmg, kb, up, reach, boxY, boxH, pull, finisher }
const ULT_SEQUENCE = {
  total: 135,
  hits: [
    // Phase 1 — dash punch
    { start: 16, end: 22, dmg: 3, kb: 1.5, up: -1, reach: 68, boxY: -70, boxH: 30, pull: true },
    // Phase 2 — three-punch flurry
    { start: 30, end: 34, dmg: 3, kb: 1,   up: 0,  reach: 60, boxY: -72, boxH: 26, pull: true },
    { start: 38, end: 42, dmg: 3, kb: 1,   up: 0,  reach: 60, boxY: -68, boxH: 26, pull: true },
    { start: 46, end: 50, dmg: 3, kb: 1,   up: 0,  reach: 62, boxY: -72, boxH: 26, pull: true },
    // Phase 3 — spinning roundhouse kick
    { start: 56, end: 64, dmg: 5, kb: 2,   up: -1, reach: 72, boxY: -55, boxH: 34, pull: true },
    // Phase 4 — rising uppercut launcher
    { start: 70, end: 78, dmg: 6, kb: 2,   up: -16, reach: 72, boxY: -85, boxH: 45, launch: true, pull: true },
    // Phase 5 — aerial double kick
    { start: 90, end: 95, dmg: 4, kb: 1.5, up: -3, reach: 70, boxY: -50, boxH: 30, aerial: true, pull: true },
    { start: 98, end: 103, dmg: 4, kb: 1.5, up: -2, reach: 70, boxY: -60, boxH: 30, aerial: true, pull: true },
    // Phase 6 — diving slam finisher
    { start: 118, end: 126, dmg: 14, kb: 22, up: 10, reach: 85, boxY: -30, boxH: 60, finisher: true },
  ]
};

function currentUltHit(frame) {
  for(let i = 0; i < ULT_SEQUENCE.hits.length; i++) {
    const h = ULT_SEQUENCE.hits[i];
    if(frame >= h.start && frame <= h.end) return { hit: h, index: i };
  }
  return null;
}

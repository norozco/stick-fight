// ============================================================
// RING-OUT — ult victim locking + throw victim locking + stage-fall finisher
// ============================================================
// Ken-style shoulder throw — single smooth half-circle arc from front to back.
// 35-frame attack: 0-3 grab, 4-24 arc, 24 impact, 25-35 recovery.
// Victim rotates a full 360° over the arc for a clean head-over-heels flip.
function lockVictimToThrow(victim, attacker) {
  const t = attacker.stateTime;
  const fc = attacker.facing;
  // -1 = over-the-shoulder back throw (default); +1 = slam forward
  const dir = attacker.throwDir || -1;

  if(t <= 3) {
    // Caught — victim hovers in front of the attacker
    victim.x = attacker.x + fc * 44;
    victim.y = attacker.y - 4;
    victim.throwSpin = 0;
  } else if(t <= 24) {
    const raw = (t - 3) / 21;
    const p = easeInOutCubic(raw);
    if(dir < 0) {
      // Back throw — single arc front → overhead → behind (original choreography)
      const angle = p * Math.PI;
      victim.x = attacker.x + Math.cos(angle) * 62 * fc;
      victim.y = attacker.y - Math.sin(angle) * 95 - 4;
      victim.throwSpin = p * Math.PI * 2 * (-fc);
    } else {
      // Forward throw — lift them up in front, slam them further forward.
      //   x : 62 (front) → 84 (further front)
      //   y : ground → apex → ground
      const xOff = 62 + p * 22;
      victim.x = attacker.x + fc * xOff;
      victim.y = attacker.y - Math.sin(p * Math.PI) * 95 - 4;
      // Forward somersault in the direction of travel
      victim.throwSpin = p * Math.PI * 2 * fc;
    }
  } else {
    // Final landed position — behind for back throw, further in front for forward throw
    const finalX = dir < 0 ? -62 : 84;
    victim.x = attacker.x + fc * finalX;
    victim.y = attacker.y - 4;
    victim.throwSpin = Math.PI * 2 * (dir < 0 ? -fc : fc);
  }

  // Face the attacker throughout (their body rotates, so direction of the eye dot doesn't matter much)
  victim.facing = -fc;
  victim.vx = 0;
  victim.vy = 0;
  victim.knockback = 0;
  victim.knockUp = 0;
  victim.onGround = false;
  if(victim.x < 40) victim.x = 40;
  if(victim.x > W - 40) victim.x = W - 40;
}

// Force the victim to follow the attacker's ult choreography so every hit connects
function lockVictimToUlt(victim, attacker) {
  const t = attacker.stateTime;
  const fc = attacker.facing;
  let targetX = attacker.x + fc * 54;
  let targetY = GROUND;
  let airborne = false;

  if(t < 26) {
    // Dash-in punch — ground level, in front
    targetX = attacker.x + fc * 54;
    targetY = GROUND;
  } else if(t < 52) {
    // Three-punch flurry
    targetX = attacker.x + fc * 50;
    targetY = GROUND;
  } else if(t < 66) {
    // Roundhouse kick
    targetX = attacker.x + fc * 56;
    targetY = GROUND;
  } else if(t < 80) {
    // Uppercut launcher — begin rising
    const p = (t - 66) / 14;
    targetX = attacker.x + fc * 52;
    targetY = GROUND - p * 45;
    airborne = p > 0.2;
  } else if(t < 110) {
    // Aerial phase — float with attacker
    targetX = attacker.x + fc * 48;
    targetY = attacker.y - 8;
    airborne = true;
  } else if(t < 128) {
    // Slam — crash down with attacker
    const p = (t - 110) / 18;
    targetX = attacker.x + fc * 44;
    targetY = lerp(attacker.y, GROUND, p * p);
    airborne = p < 0.9;
  } else {
    targetX = attacker.x + fc * 50;
    targetY = GROUND;
  }

  // Smooth snap so first lock is not a teleport
  victim.x = lerp(victim.x, targetX, 0.55);
  victim.y = lerp(victim.y, targetY, 0.55);
  victim.onGround = !airborne;
  // Keep the victim inside stage bounds
  if(victim.x < 40) victim.x = 40;
  if(victim.x > W - 40) victim.x = W - 40;
  // Face the attacker (so the hurt pose looks right)
  victim.facing = attacker.x > victim.x ? 1 : -1;
  victim.targetFacing = victim.facing;
}

// ============================================================


// ============================================================
// RING-OUT — Killer-Instinct-style stage fall finisher
// ============================================================
const EDGE_THRESHOLD = 150;   // px from screen edge that counts as "near edge"

function canRingOut(loser, winningPlayer) {
  // Only fires when THIS KO ends the match (winner already has 1 round win)
  if(roundsWon[winningPlayer - 1] < 1) return false;
  // Must be near an edge of the stage
  return loser.x < EDGE_THRESHOLD || loser.x > W - EDGE_THRESHOLD;
}

// ============================================================
// RING-OUT CINEMATIC — phase-driven, hard-cut MK-style sequence
// ============================================================
// Six phases, total ~240 frames (~4s wall-clock, ~6-8s perceived through slow-mo).
// Hard cuts between phases (snap zoom + position, no lerp). Loser's position is
// CHOREOGRAPHED per phase, not physics-driven, so the cinematic looks identical
// every time. Camera in game.js reads ringoutPhaseIdx and applies phase-specific
// values — see updateRingout() below for the per-phase camera intent.
const RINGOUT_PHASES = [
  { name: 'IMPACT',   duration: 18 },   // frozen close-up on hit point
  { name: 'LAUNCH',   duration: 22 },   // arcs out off-screen, speed lines
  { name: 'FREEFALL', duration: 90 },   // FRONT VIEW — flailing, parallax behind
  { name: 'APPROACH', duration: 22 },   // looking up at loser plummeting in
  { name: 'CRASH',    duration: 32 },   // top-down impact, cracks, X-ray
  { name: 'SETTLE',   duration: 60 },   // wide pull-back, embers, then endRound
];
const PIT_FLOOR = GROUND + 1200;        // visual depth — used by stages.js pits

function ringoutPhase(t) {
  let acc = 0;
  for(let i = 0; i < RINGOUT_PHASES.length; i++) {
    const next = acc + RINGOUT_PHASES[i].duration;
    if(t < next) return { idx: i, name: RINGOUT_PHASES[i].name, frame: t - acc, total: RINGOUT_PHASES[i].duration };
    acc = next;
  }
  return { idx: RINGOUT_PHASES.length, name: 'DONE', frame: 0, total: 0 };
}

function triggerRingOut(loser, winningPlayer) {
  ringoutFighter = loser;
  ringoutWinner = winningPlayer;
  ringoutTime = 0;
  ringoutAnnounced = false;
  ringoutPhaseIdx = 0;
  ringoutPhaseFrame = 0;
  ringoutXrayFlashTime = 0;
  state = 'ringout';

  // Direction the loser will be launched — toward whichever edge they're closer to
  const dir = loser.x < W / 2 ? -1 : 1;
  loser.ringoutLaunchDir = dir;
  loser.ringoutAnchorX = loser.x;       // remember the hit point for choreography
  loser.ringoutAnchorY = loser.y;
  loser.onGround = false;
  loser.hitStun = 999;
  loser.state = 'ringout';
  loser.stateTime = 0;
  loser.ringoutSpin = 0;
  loser.beingUlted = 0;
  loser.invuln = 0;
  loser.ringoutFinalized = false;       // guards the X-ray/CRASH effects

  // PHASE 1 entry FX: hard-cut close-up, red flash, freeze
  hitstop = 18;
  slowMo = 60;
  shake(38, 22);
  flashTime = 30;
  flashAlpha = 1.0;
  flashColor = '255,40,40';
  ultTargetDarken = 0.55;
  cameraTargetZoom = 2.4;
  cameraZoom = 2.4;                     // SNAP — no zoom-in animation
  Audio.ultFinisher();
  Audio.musicStop();
  spawnHitSpark(loser.x, loser.y - 60, '#ff3030', 36, 3);
}

function updateRingout() {
  if(!ringoutFighter) return;
  const f = ringoutFighter;
  ringoutTime++;

  // Launch ramp — the first 8 frames ease velocities up to full throw so the
  // exit looks like a follow-through rather than a jump cut.
  if((f.ringoutLaunchFrames || 0) < 8) {
    f.ringoutLaunchFrames = (f.ringoutLaunchFrames || 0) + 1;
    const p = f.ringoutLaunchFrames / 8;
    const ease = p * p * (3 - 2 * p);                  // smoothstep
    const dir = f.ringoutLaunchDir || (f.x < W / 2 ? -1 : 1);
    f.vx = lerp(f.vx, dir * 18, ease);
    f.vy = lerp(f.vy, -16, ease);
  }

  // Custom physics — eased gravity so terminal velocity is approached smoothly
  // and slight air drag on horizontal so the arc actually curves visibly.
  const terminal = 34;
  f.vy += (terminal - f.vy) * 0.035 + 0.45;            // smooth ramp, not a clamp
  if(f.vy > terminal) f.vy = terminal;
  f.vx *= 0.994;
  // Rotational air resistance — the tumble winds down on its own instead of
  // spinning at a constant rate until the bounce.
  f.ringoutSpinSpeed = (f.ringoutSpinSpeed || 0.2) * 0.995;
  f.x += f.vx;
  f.y += f.vy;
  f.ringoutSpin = (f.ringoutSpin || 0) + f.ringoutSpinSpeed;

  // Cinematic camera swap: once the fighter has actually cleared the stage
  // (falling past ~80 px below the ground), cut to a front-facing "flailing"
  // view. The finalizer turns it back off so we see the crash impact.
  if(!f.ringoutFinalized && f.y > GROUND + 80 && !f.ringoutFrontView) {
    f.ringoutFrontView = true;
    f.ringoutFrontViewStart = ringoutTime;
  }

  // Afterimage trail — only during the side-view phase; in front-view the
  // trail would be a stack of flailing copies which reads as clutter.
  if(!f.ringoutTrail) f.ringoutTrail = [];
  const speed = Math.abs(f.vx) + Math.abs(f.vy) + Math.abs(f.ringoutSpinSpeed) * 20;
  if(!f.ringoutFrontView && ringoutTime % 2 === 0 && speed > 1.2) {
    f.ringoutTrail.push({ x: f.x, y: f.y, spin: f.ringoutSpin, life: 18 });
    if(f.ringoutTrail.length > 8) f.ringoutTrail.shift();
  }
  // Age out existing trail samples
  for(const s of f.ringoutTrail) s.life--;
  f.ringoutTrail = f.ringoutTrail.filter(s => s.life > 0);

  // Bounce off the pit floor
  f.ringoutBounces = f.ringoutBounces || 0;
  f.ringoutRestTime = f.ringoutRestTime || 0;
  if(f.y >= PIT_FLOOR && f.vy > 0) {
    f.y = PIT_FLOOR;
    if(f.ringoutBounces < MAX_BOUNCES) {
      const dampen = f.ringoutBounces === 0 ? 0.6 : 0.35;
      f.vy = -Math.abs(f.vy) * dampen;
      f.vx *= 0.55;
      // Dampen spin without flipping it — a flipped spin reads as jittery; a
      // smoothly decelerating tumble reads as momentum.
      f.ringoutSpinSpeed = (f.ringoutSpinSpeed || 0.2) * 0.55;
      f.ringoutBounces++;

      // Stage-themed impact
      const stageId = currentStage && currentStage.id;
      const splashColor = stageId === 'inferno' ? 'rgba(255,200,80,0.85)'
                       : stageId === 'dojo'    ? 'rgba(220,190,140,0.75)'
                       : 'rgba(180,200,255,0.7)';
      const sparkColor = stageId === 'inferno' ? '#ffe080'
                       : stageId === 'dojo'    ? '#ffcc88'
                       : '#aaccff';
      for(let i = 0; i < 28; i++) {
        spawnParticle({
          type: 'dust',
          x: f.x + (Math.random() - 0.5) * 70,
          y: PIT_FLOOR + 2,
          vx: (Math.random() - 0.5) * 12,
          vy: -Math.random() * 9 - 3,
          life: 50, maxLife: 50,
          size: Math.random() * 5 + 4,
          color: splashColor,
          grav: stageId === 'inferno' ? 0.35 : 0.25,
        });
      }
      spawnHitSpark(f.x, PIT_FLOOR - 10, sparkColor, 22, 2.2);
      shake(16 - f.ringoutBounces * 4, 22);
      hitstop = f.ringoutBounces === 1 ? 8 : 4;
      Audio.bounce();
      if(stageId === 'inferno' && f.ringoutBounces === 1) Audio.heavy();   // lava sizzle
      if(stageId === 'twilight' && f.ringoutBounces === 1) Audio.parry();   // glass shatter
    } else {
      // Final rest — ease velocities to zero instead of snapping, so the
      // ragdoll visibly settles instead of jumping to a statue pose.
      f.vy = 0;
      f.vx *= 0.75;
      f.ringoutSpinSpeed = (f.ringoutSpinSpeed || 0) * 0.82;
      if(Math.abs(f.vx) < 0.15) f.vx = 0;
      if(Math.abs(f.ringoutSpinSpeed) < 0.01) f.ringoutSpinSpeed = 0;
      f.ringoutRestTime++;

      // --- Killer-Instinct finalizer: fires once when the ragdoll lands ---
      if(!f.ringoutFinalized) {
        f.ringoutFinalized = true;
        f.ringoutFrontView = false;   // cut back to side view for the crash impact
        f.ringoutTrail = [];          // clear any stale snapshots
        // Dramatic freeze-frame on impact
        hitstop = 14;
        shake(22, 30);
        flashTime = 22;
        flashAlpha = 0.85;
        flashColor = '255,80,60';
        // Expanding shockwave ring
        const stageId = currentStage && currentStage.id;
        const ringColor = stageId === 'inferno' ? '#ffcc66'
                        : stageId === 'dojo'    ? '#ffd9a0'
                        : '#c8d8ff';
        for(let r = 0; r < 3; r++) {
          spawnParticle({
            type: 'ring',
            x: f.x, y: PIT_FLOOR,
            vx: 0, vy: 0,
            life: 40 + r * 6, maxLife: 40 + r * 6,
            size: 10 + r * 4,
            power: 4 + r,
            color: ringColor,
          });
        }
        // Secondary debris burst
        for(let i = 0; i < 40; i++) {
          const ang = Math.random() * Math.PI - Math.PI;    // mostly upward
          spawnParticle({
            type: 'spark',
            x: f.x + (Math.random() - 0.5) * 50,
            y: PIT_FLOOR - 2,
            vx: Math.cos(ang) * (Math.random() * 10 + 2),
            vy: Math.sin(ang) * (Math.random() * 9 + 4) - 4,
            life: 36, maxLife: 36,
            size: Math.random() * 3 + 2,
            color: ringColor,
            grav: 0.35,
          });
        }
        // KI-style text overlay + announcer voice line
        announce('ULTRA K.O.!', 120);
        Audio.ultFinisher();
        try { Audio.say('Ultra K O!', { interrupt: true }); } catch(e){}
      }
    }
  }

  // (no trail particles during the fall — we use radial speed lines instead)

  // Announce after initial burst
  if(ringoutTime === 18 && !ringoutAnnounced) {
    ringoutAnnounced = true;
    Audio.say('K O!', { interrupt: true });
    announce('K.O.!', 140);
    flashTime = 14;
    flashAlpha = 0.5;
    flashColor = '255,200,60';
  }

  // Finish once the ragdoll has settled after the final bounce
  if(f.ringoutRestTime > 60) {
    state = 'playing';
    ringoutFighter = null;
    cameraTargetZoom = 1;
    ultTargetDarken = 0;
    endRound(ringoutWinner);
  }
}

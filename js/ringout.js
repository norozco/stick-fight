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

// Stage-themed colors used by particles + parallax during the fall
function ringoutStageColors() {
  const stageId = currentStage && currentStage.id;
  if(stageId === 'inferno') return { spark: '#ffd060', ring: '#ffcc66', dust: 'rgba(255,200,80,0.85)' };
  if(stageId === 'dojo')    return { spark: '#ffcc88', ring: '#ffd9a0', dust: 'rgba(220,190,140,0.75)' };
  return { spark: '#c0d0ff', ring: '#c8d8ff', dust: 'rgba(180,200,255,0.7)' };
}

function updateRingout() {
  if(!ringoutFighter) return;
  const f = ringoutFighter;
  ringoutTime++;
  if(ringoutXrayFlashTime > 0) ringoutXrayFlashTime--;

  // Resolve current phase + sub-frame
  const ph = ringoutPhase(ringoutTime);
  const justEntered = ph.idx !== ringoutPhaseIdx;
  ringoutPhaseIdx = ph.idx;
  ringoutPhaseFrame = ph.frame;

  const dir = f.ringoutLaunchDir || (f.x < W / 2 ? -1 : 1);
  const colors = ringoutStageColors();

  // ----- PHASE-DRIVEN CHOREOGRAPHY -----
  // Each phase positions the loser deterministically (no physics integration).
  switch(ph.name) {
    case 'IMPACT': {
      // Loser frozen at the hit point — camera locked on (handled in game.js)
      f.x = f.ringoutAnchorX;
      f.y = f.ringoutAnchorY;
      f.ringoutSpin = 0;
      if(justEntered) {
        Audio.say('K O!', { interrupt: true });
        announce('K.O.!', 60);
      }
      break;
    }
    case 'LAUNCH': {
      // Smooth arc from the anchor point off-screen in `dir` direction.
      // By end of phase, loser is well off-screen.
      const p = ph.frame / ph.total;
      const ease = p * p * (3 - 2 * p);                 // smoothstep
      const launchDist = 600;                            // off-screen by ~end
      f.x = f.ringoutAnchorX + dir * launchDist * ease;
      f.y = f.ringoutAnchorY - 70 * Math.sin(p * Math.PI) - 40 * p;  // arc up then down
      f.ringoutSpin = ease * Math.PI * 1.6 * dir;        // ~290° tumble during launch
      // Speed lines streaking from the loser
      if(ringoutTime % 2 === 0) {
        spawnStreak(f.x, f.y - 50, -dir, '#ff5040');
        spawnStreak(f.x - dir * 14, f.y - 30, -dir, '#ff8a40');
      }
      if(justEntered) {
        Audio.fallYell();
      }
      break;
    }
    case 'FREEFALL': {
      // FRONT VIEW — the user-requested moment. Loser is locked at center
      // of screen (the camera handles centering). Pose is overridden in
      // poses.js when phase === 'FREEFALL'. Position-wise we just keep them
      // at a stable world location so the camera math is simple.
      f.x = f.ringoutAnchorX;       // (camera locks to f.x in game.js anyway)
      f.y = GROUND + 600;            // somewhere mid-pit visually
      f.ringoutSpin = 0;             // no tumble — flailing is in the pose
      break;
    }
    case 'APPROACH': {
      // HARD CUT to looking up at the falling loser. Rapid descent.
      const p = ph.frame / ph.total;
      f.x = f.ringoutAnchorX;
      f.y = lerp(GROUND + 600, PIT_FLOOR - 80, p * p);   // accelerating down
      f.ringoutSpin = (1 - p) * 0.3 * dir;
      // Building hitstun / wind
      if(ph.frame === 4) Audio.fallYell();
      break;
    }
    case 'CRASH': {
      // HARD CUT to top-down. Massive impact at the start of this phase.
      f.x = f.ringoutAnchorX;
      f.y = PIT_FLOOR;
      f.ringoutSpin = 0;
      if(!f.ringoutFinalized) {
        f.ringoutFinalized = true;
        // X-ray skeleton flash
        ringoutXrayFlashTime = 8;
        // Dramatic freeze-frame + flash
        hitstop = 28;
        shake(50, 36);
        flashTime = 36;
        flashAlpha = 1.0;
        flashColor = '255,255,255';
        ultTargetDarken = 0.7;
        // Expanding shockwave rings (multi-layer)
        for(let r = 0; r < 4; r++) {
          spawnParticle({
            type: 'ring', x: f.x, y: PIT_FLOOR,
            vx: 0, vy: 0,
            life: 44 + r * 6, maxLife: 44 + r * 6,
            size: 10 + r * 4, power: 5 + r,
            color: r === 0 ? '#ffffff' : colors.ring,
          });
        }
        // Heavy debris
        for(let i = 0; i < 56; i++) {
          const ang = -Math.PI/2 + (Math.random() - 0.5) * Math.PI * 1.1;
          spawnParticle({
            type: 'spark',
            x: f.x + (Math.random() - 0.5) * 60,
            y: PIT_FLOOR - 4,
            vx: Math.cos(ang) * (Math.random() * 12 + 4),
            vy: Math.sin(ang) * (Math.random() * 11 + 5),
            life: 44, maxLife: 44,
            size: Math.random() * 4 + 2,
            color: i % 3 === 0 ? '#ffffff' : colors.spark,
            grav: 0.32,
          });
        }
        // ULTRA K.O. — text + voice + sound stinger
        announce('ULTRA K.O.!', 120);
        Audio.ultFinisher();
        try { Audio.say('Ultra K O!', { interrupt: true }); } catch(e){}
      }
      break;
    }
    case 'SETTLE': {
      f.x = f.ringoutAnchorX;
      f.y = PIT_FLOOR;
      f.ringoutSpin = 0;
      // Lazy ember rain rising from impact
      if(ringoutTime % 4 === 0) {
        spawnParticle({
          type: 'spark',
          x: f.x + (Math.random() - 0.5) * 80,
          y: PIT_FLOOR + 4,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 2 - 1,
          life: 50, maxLife: 50,
          size: Math.random() * 3 + 2,
          color: colors.spark,
          grav: -0.04,
        });
      }
      break;
    }
    case 'DONE': {
      state = 'playing';
      ringoutFighter = null;
      cameraTargetZoom = 1;
      ultTargetDarken = 0;
      endRound(ringoutWinner);
      return;
    }
  }
}

// X-ray skeleton flash — drawn in screen space at the impact point during CRASH.
// Called from the main render loop when ringoutXrayFlashTime > 0.
function drawXraySkeletonFlash() {
  if(ringoutXrayFlashTime <= 0 || !ringoutFighter) return;
  const f = ringoutFighter;
  const a = ringoutXrayFlashTime / 8;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 24;
  // Stick-figure skeleton silhouette — slightly larger than normal
  const s = 1.4;
  const x = f.x, y = f.y;
  // Head
  ctx.beginPath();
  ctx.arc(x, y - 95 * s, 16 * s, 0, Math.PI * 2);
  ctx.stroke();
  // Spine
  ctx.beginPath();
  ctx.moveTo(x, y - 80 * s);
  ctx.lineTo(x, y - 40 * s);
  ctx.stroke();
  // Arms splayed (impact pose)
  ctx.beginPath();
  ctx.moveTo(x, y - 75 * s);
  ctx.lineTo(x - 36 * s, y - 30 * s);
  ctx.moveTo(x, y - 75 * s);
  ctx.lineTo(x + 36 * s, y - 30 * s);
  ctx.stroke();
  // Legs splayed
  ctx.beginPath();
  ctx.moveTo(x, y - 40 * s);
  ctx.lineTo(x - 22 * s, y);
  ctx.moveTo(x, y - 40 * s);
  ctx.lineTo(x + 22 * s, y);
  ctx.stroke();
  // Rib lines for "skeleton" feel
  ctx.lineWidth = 4;
  for(let i = 0; i < 4; i++) {
    const ry = y - 70 * s + i * 8 * s;
    ctx.beginPath();
    ctx.moveTo(x - 12 * s, ry);
    ctx.lineTo(x + 12 * s, ry);
    ctx.stroke();
  }
  ctx.restore();
}

// Background parallax during the FREEFALL phase — vertical bands streaking up
// at high speed, giving the sensation of plummeting straight down.
function drawRingoutFreefallBackdrop() {
  const colors = ringoutStageColors();
  const t = (globalTime * 28) | 0;        // fast scroll
  ctx.save();
  // Dark base
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#02030a');
  grad.addColorStop(0.5, '#08060f');
  grad.addColorStop(1, '#000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Vertical bands (10 of them) scrolling upward at varying speeds
  for(let i = 0; i < 14; i++) {
    const x = (i * 73) % W;
    const speed = 1 + (i % 4) * 0.4;       // parallax — different bands move at different speeds
    const offset = (t * speed) % 200;
    const w = 6 + (i % 3);
    ctx.fillStyle = i % 3 === 0 ? '#1a0a08' : '#0a0508';
    for(let y = -200 + offset; y < H + 100; y += 200) {
      ctx.fillRect(x, y, w, 80);
    }
  }
  // Speed lines — bright streaks suggesting wind
  ctx.strokeStyle = colors.spark;
  ctx.lineWidth = 2;
  for(let i = 0; i < 30; i++) {
    const lx = (i * 47 + t * 3) % W;
    const ly = (i * 91 + t * 12) % (H + 200) - 100;
    const a = 0.4 + (i % 5) * 0.1;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx, ly + 60);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

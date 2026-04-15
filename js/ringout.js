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

function triggerRingOut(loser, winningPlayer) {
  ringoutFighter = loser;
  ringoutWinner = winningPlayer;
  ringoutTime = 0;
  ringoutAnnounced = false;
  state = 'ringout';

  // Flick them off whichever side they were closer to
  const dir = loser.x < W / 2 ? -1 : 1;
  loser.vx = dir * 18;
  loser.vy = -16;
  loser.onGround = false;
  loser.hitStun = 999;
  loser.state = 'ringout';
  loser.stateTime = 0;
  loser.ringoutSpin = 0;
  loser.ringoutSpinSpeed = (Math.random() * 0.1 + 0.18) * dir;
  loser.beingUlted = 0;
  loser.invuln = 0;

  // Initial dramatic effects
  slowMo = 60;
  shake(18, 28);
  flashTime = 30;
  flashAlpha = 0.9;
  flashColor = '255,60,60';
  ultTargetDarken = 0.45;
  cameraTargetZoom = 1;          // no zoom — pan must do all the camera work cleanly
  cameraZoom = 1;                // snap immediately so the lerp doesn't fight the pan
  hitstop = 12;
  Audio.ultFinisher();
  Audio.fallYell();
  Audio.musicStop();              // music drops out for the cinematic fall

  // Spawn a big burst at the loser's current position
  spawnHitSpark(loser.x, loser.y - 60, '#ff3860', 36, 3);
  spawnStar(loser.x, loser.y - 60, '#ffcc00', 3);
  spawnCombo(loser.x, loser.y - 140, 'K.O.', '#ff3860');
}

const PIT_FLOOR = GROUND + 1200;   // where the ragdoll bounces
const MAX_BOUNCES = 2;

function updateRingout() {
  if(!ringoutFighter) return;
  const f = ringoutFighter;
  ringoutTime++;

  // Custom physics — stronger gravity, terminal velocity
  f.vy = Math.min(f.vy + 0.7, 34);
  f.vx *= 0.997;
  f.x += f.vx;
  f.y += f.vy;
  f.ringoutSpin = (f.ringoutSpin || 0) + (f.ringoutSpinSpeed || 0.2);

  // Bounce off the pit floor
  f.ringoutBounces = f.ringoutBounces || 0;
  f.ringoutRestTime = f.ringoutRestTime || 0;
  if(f.y >= PIT_FLOOR && f.vy > 0) {
    f.y = PIT_FLOOR;
    if(f.ringoutBounces < MAX_BOUNCES) {
      const dampen = f.ringoutBounces === 0 ? 0.6 : 0.35;
      f.vy = -Math.abs(f.vy) * dampen;
      f.vx *= 0.55;
      f.ringoutSpinSpeed = (f.ringoutSpinSpeed || 0.2) * -0.75;
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
      // Final rest — stop
      f.vy = 0;
      f.vx = 0;
      f.ringoutSpinSpeed = 0;
      f.ringoutRestTime++;
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

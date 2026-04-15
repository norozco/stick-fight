// ============================================================
// POSES — target pose computation + smoothing + rendering + physics
// ============================================================
function makePose(x, y) {
  return {
    head:   { x, y: y - 98 },
    neck:   { x, y: y - 82 },
    pelvis: { x, y: y - 42 },
    lHand:  { x: x - 14, y: y - 60 },
    rHand:  { x: x + 14, y: y - 60 },
    lElbow: { x: x - 10, y: y - 72 },
    rElbow: { x: x + 10, y: y - 72 },
    lFoot:  { x: x - 12, y },
    rFoot:  { x: x + 12, y },
    lKnee:  { x: x - 8, y: y - 22 },
    rKnee:  { x: x + 8, y: y - 22 },
    bodyLean: 0,
    headTilt: 0,
  };
}

function computeTargetPose(f) {
  const x = f.x, y = f.y;
  const fc = f.facing;
  const pose = makePose(x, y);

  // Idle breathing
  const breath = Math.sin(globalTime * 0.05) * 1.5;
  pose.neck.y -= breath * 0.3;
  pose.head.y -= breath * 0.3;
  pose.lHand.y += breath * 0.5;
  pose.rHand.y -= breath * 0.5;

  // Walking
  if(f.onGround && Math.abs(f.vx) > 1 && f.state !== 'attack' && f.state !== 'hurt' && f.state !== 'dash') {
    const sw = Math.sin(f.walkPhase);
    const sw2 = Math.cos(f.walkPhase);
    const bob = Math.abs(Math.sin(f.walkPhase)) * 3;
    pose.lFoot.x = x - 14 + sw * 11;
    pose.lFoot.y = y - Math.max(0, sw) * 8;
    pose.rFoot.x = x + 14 - sw * 11;
    pose.rFoot.y = y - Math.max(0, -sw) * 8;
    pose.lKnee.x = (pose.pelvis.x + pose.lFoot.x) / 2 - 2;
    pose.lKnee.y = (pose.pelvis.y + pose.lFoot.y) / 2 + 3;
    pose.rKnee.x = (pose.pelvis.x + pose.rFoot.x) / 2 + 2;
    pose.rKnee.y = (pose.pelvis.y + pose.rFoot.y) / 2 + 3;
    pose.lHand.x = x - 14 - sw * 6;
    pose.lHand.y = y - 60 + sw2 * 7;
    pose.rHand.x = x + 14 + sw * 6;
    pose.rHand.y = y - 60 - sw2 * 7;
    pose.lElbow.x = x - 10 - sw * 3;
    pose.rElbow.x = x + 10 + sw * 3;
    pose.head.y = y - 98 + bob;
    pose.neck.y = y - 82 + bob;
    pose.pelvis.y = y - 42 + bob;
    pose.bodyLean = fc * 3;
  }

  // Airborne (non-ult)
  if(!f.onGround && !(f.state === 'attack' && f.attackType === 'ult')) {
    const tuck = clamp(f.vy * 0.5, -10, 10);
    pose.lFoot.x = x - 10 + tuck * 0.3;
    pose.lFoot.y = y - 12 - Math.min(0, f.vy) * 0.4;
    pose.rFoot.x = x + 8;
    pose.rFoot.y = y - 18 - Math.min(0, f.vy) * 0.3;
    pose.lKnee.x = x - 10; pose.lKnee.y = y - 32;
    pose.rKnee.x = x + 6;  pose.rKnee.y = y - 30;
    pose.lHand.x = x - 18 - tuck * 0.2; pose.lHand.y = y - 72 + f.vy * 0.3;
    pose.rHand.x = x + 18; pose.rHand.y = y - 72 + f.vy * 0.3;
    pose.bodyLean = fc * 2;
  }

  // Blocking
  if(f.blocking) {
    pose.lHand.x = x + fc * 2;   pose.lHand.y = y - 88;
    pose.lElbow.x = x - fc * 4;  pose.lElbow.y = y - 75;
    pose.rHand.x = x + fc * 14;  pose.rHand.y = y - 66;
    pose.rElbow.x = x + fc * 6;  pose.rElbow.y = y - 72;
    pose.bodyLean = -fc * 8;
    pose.head.x += -fc * 3;
  }

  // Dash — lean in the direction of travel, not the facing direction.
  // (Backdash keeps the fighter facing the opponent but sliding backward, so
  // the body should lean and the trailing leg drag in the dashDir.)
  if(f.state === 'dash') {
    const dc = f.dashDir || fc;
    pose.bodyLean = dc * 18;
    pose.head.x += dc * 4;
    pose.lFoot.x = x - dc * 22; pose.lFoot.y = y - 6;
    pose.rFoot.x = x + dc * 12; pose.rFoot.y = y;
    pose.lKnee.x = x - dc * 14; pose.lKnee.y = y - 18;
    pose.rKnee.x = x + dc * 8;  pose.rKnee.y = y - 22;
    pose.lHand.x = x - dc * 24; pose.lHand.y = y - 62;
    pose.rHand.x = x + dc * 10; pose.rHand.y = y - 58;
    pose.lElbow.x = x - dc * 14; pose.lElbow.y = y - 68;
    pose.rElbow.x = x + dc * 4; pose.rElbow.y = y - 68;
  }

  // Hurt
  if(f.state === 'hurt') {
    const shakeAmt = Math.sin(f.stateTimeF * 1.2) * 4;
    pose.head.x += shakeAmt;
    pose.neck.x += shakeAmt * 0.5;
    pose.bodyLean = -fc * 14;
    pose.lHand.y += 6; pose.rHand.y += 6;
    pose.lHand.x += -fc * 6; pose.rHand.x += -fc * 6;
    if(!f.onGround) {
      pose.lFoot.x = x - 6; pose.lFoot.y = y - 20;
      pose.rFoot.x = x + 6; pose.rFoot.y = y - 18;
      pose.lKnee.x = x - 6; pose.lKnee.y = y - 40;
      pose.rKnee.x = x + 6; pose.rKnee.y = y - 38;
    }
    pose.headTilt = -fc * 0.3;
  }

  // Stagger
  if(f.state === 'stagger') {
    const shake = Math.sin(f.stateTimeF * 0.5) * 2;
    pose.head.x += shake;
    pose.bodyLean = -fc * 10;
    pose.lHand.y += 4; pose.rHand.y += 4;
  }

  // Attacks
  if(f.state === 'attack' && f.attackType) {
    const t = f.stateTimeF;
    if(f.attackType === 'light') {
      const data = f.attackData();
      const phase = t < data.start ? 'startup'
                  : t < data.start + data.active ? 'active'
                  : 'recovery';

      if(f.comboStep < 2) {
        // Alternating punches
        let ext = 0;
        if(phase === 'startup') {
          const pp = t / data.start;
          ext = -18 + easeOutCubic(pp) * 5;
        } else if(phase === 'active') {
          const at = (t - data.start) / data.active;
          ext = lerp(-13, 48, easeOutCubic(clamp(at * 1.4, 0, 1)));
        } else {
          const rt = (t - data.start - data.active) / (data.total - data.start - data.active);
          ext = lerp(48, 8, easeOutQuad(clamp(rt, 0, 1)));
        }
        const useRight = (f.comboStep % 2 === 0);
        const mainHand = useRight ? 'rHand' : 'lHand';
        const mainElbow = useRight ? 'rElbow' : 'lElbow';
        const offHand = useRight ? 'lHand' : 'rHand';
        pose[mainHand].x = x + fc * ext;
        pose[mainHand].y = y - 72 + Math.sin(t * 0.6) * 1;
        pose[mainElbow].x = x + fc * Math.max(6, ext * 0.45);
        pose[mainElbow].y = y - 76;
        pose[offHand].x = x - fc * 14;
        pose[offHand].y = y - 60;
        pose.bodyLean = fc * (4 + (phase === 'active' ? 4 : 0));
        pose.head.x += fc * 2;
      } else {
        // Finisher spin kick
        let legExt = 0;
        let spin = 0;
        if(phase === 'startup') {
          spin = t / data.start * 0.3;
          legExt = 10;
        } else if(phase === 'active') {
          const at = (t - data.start) / data.active;
          spin = 0.3 + at * 0.9;
          legExt = lerp(15, 58, easeOutCubic(clamp(at * 1.3, 0, 1)));
        } else {
          const rt = (t - data.start - data.active) / (data.total - data.start - data.active);
          spin = 1.2 - rt * 0.4;
          legExt = lerp(58, 12, rt);
        }
        pose.rFoot.x = x + fc * legExt * Math.cos(spin * 0.6);
        pose.rFoot.y = y - 50 - Math.sin(spin * 0.5) * 10;
        pose.rKnee.x = x + fc * legExt * 0.5;
        pose.rKnee.y = y - 48;
        pose.lFoot.x = x - fc * 6; pose.lFoot.y = y;
        pose.lKnee.x = x - fc * 4; pose.lKnee.y = y - 22;
        pose.lHand.x = x - fc * 18; pose.lHand.y = y - 68;
        pose.rHand.x = x + fc * 4; pose.rHand.y = y - 56;
        pose.bodyLean = -fc * 10;
      }
    }
    else if(f.attackType === 'heavy') {
      const data = f.attackData();
      const phase = t < data.start ? 'startup'
                  : t < data.start + data.active ? 'active'
                  : 'recovery';
      let ext = 0, vertical = 0;
      if(phase === 'startup') {
        const pp = t / data.start;
        ext = lerp(-10, -34, easeOutCubic(pp));
        vertical = lerp(0, -16, easeOutCubic(pp));
        pose.bodyLean = -fc * 14 * pp;
      } else if(phase === 'active') {
        const at = (t - data.start) / data.active;
        ext = lerp(-34, 72, easeOutCubic(clamp(at * 1.4, 0, 1)));
        vertical = lerp(-16, 16, easeOutCubic(clamp(at * 1.4, 0, 1)));
        pose.bodyLean = fc * (14 - at * 4);
      } else {
        const rt = (t - data.start - data.active) / (data.total - data.start - data.active);
        ext = lerp(72, 8, easeOutQuad(rt));
        vertical = lerp(16, 0, rt);
        pose.bodyLean = fc * (10 - rt * 12);
      }
      pose.rHand.x = x + fc * ext;
      pose.rHand.y = y - 90 + vertical;
      pose.rElbow.x = x + fc * ext * 0.5;
      pose.rElbow.y = y - 80 + vertical * 0.4;
      pose.lHand.x = x - fc * 16; pose.lHand.y = y - 60;
      pose.lElbow.x = x - fc * 8; pose.lElbow.y = y - 68;
      // Slight pivot foot
      pose.rFoot.x = x + fc * 8;
      pose.lFoot.x = x - fc * 14;
      pose.head.x += fc * 2;
    }
    else if(f.attackType === 'throw') {
      // Ken-style shoulder throw — smooth arm-arc that mirrors the victim's path
      // 0-3 grab / 4-24 arc / 24 impact / 25-35 recovery
      if(t <= 3) {
        // Lunge and reach
        const p = t / 3;
        pose.bodyLean = fc * (4 + p * 6);
        const ext = easeOutCubic(p) * 40;
        pose.rHand.x = x + fc * ext; pose.rHand.y = y - 78;
        pose.lHand.x = x + fc * ext; pose.lHand.y = y - 70;
        pose.rElbow.x = x + fc * ext * 0.5; pose.rElbow.y = y - 78;
        pose.lElbow.x = x + fc * ext * 0.5; pose.lElbow.y = y - 72;
        pose.head.x += fc * 4;
      } else if(t <= 24) {
        // Arms track the victim's arc — hands stay roughly on the victim
        const raw = (t - 3) / 21;
        const p = easeInOutCubic(raw);
        const angle = p * Math.PI;
        const handX = Math.cos(angle) * 50 * fc;
        const handY = -Math.sin(angle) * 80 - 55;
        pose.rHand.x = x + handX;         pose.rHand.y = y + handY;
        pose.lHand.x = x + handX - fc*4;  pose.lHand.y = y + handY + 8;
        pose.rElbow.x = x + handX * 0.45; pose.rElbow.y = y - 78 + handY * 0.3;
        pose.lElbow.x = x + handX * 0.45; pose.lElbow.y = y - 74 + handY * 0.3;
        // Body leans opposite to the victim — counterbalance
        pose.bodyLean = fc * lerp(10, -18, p);
        pose.head.x += fc * (4 - p * 8);
        // Slight knee bend at apex
        pose.pelvis.y = y - 42 + Math.sin(angle) * 6;
      } else {
        // Recovery — straighten up, arms drop
        const p = clamp((t - 24) / 11, 0, 1);
        pose.bodyLean = -fc * (10 - p * 10);
        pose.rHand.x = x + fc * lerp(8, 14, p);  pose.rHand.y = y - 62 + p * 4;
        pose.lHand.x = x - fc * lerp(8, 14, p);  pose.lHand.y = y - 62;
        pose.rElbow.x = x + fc * 8; pose.rElbow.y = y - 72;
        pose.lElbow.x = x - fc * 8; pose.lElbow.y = y - 72;
      }
    }
    else if(f.attackType === 'ult') {
      computeUltPose(f, pose, t);
    }
  }

  return pose;
}

// Detailed ultimate pose — 6 cinematic phases
function computeUltPose(f, pose, t) {
  const x = f.x, y = f.y;
  const fc = f.facing;

  // PHASE 0 — windup (0-14) : crouch + pull arm back, aura effect
  if(t < 14) {
    const p = t / 14;
    const crouch = easeOutCubic(p) * 10;
    pose.pelvis.y = y - 42 + crouch * 0.5;
    pose.neck.y = y - 82 + crouch;
    pose.head.y = y - 98 + crouch;
    pose.bodyLean = -fc * 10;
    pose.rHand.x = x - fc * 30; pose.rHand.y = y - 74;
    pose.rElbow.x = x - fc * 18; pose.rElbow.y = y - 70;
    pose.lHand.x = x - fc * 10; pose.lHand.y = y - 62;
    pose.lFoot.x = x - 10; pose.lFoot.y = y;
    pose.rFoot.x = x + 14; pose.rFoot.y = y;
    pose.lKnee.y = y - 18; pose.rKnee.y = y - 18;
  }
  // PHASE 1 — dash-in punch (14-26)
  else if(t < 26) {
    const p = (t - 14) / 12;
    const ext = lerp(-20, 70, easeOutCubic(p));
    pose.bodyLean = fc * 14;
    pose.rHand.x = x + fc * ext; pose.rHand.y = y - 72;
    pose.rElbow.x = x + fc * ext * 0.5; pose.rElbow.y = y - 74;
    pose.lHand.x = x - fc * 16; pose.lHand.y = y - 58;
    pose.head.x += fc * 4;
    // Running legs
    pose.lFoot.x = x - fc * 18 * Math.cos(p * Math.PI);
    pose.rFoot.x = x + fc * 14 * Math.cos(p * Math.PI + Math.PI);
    pose.lKnee.x = (pose.pelvis.x + pose.lFoot.x) / 2;
    pose.rKnee.x = (pose.pelvis.x + pose.rFoot.x) / 2;
  }
  // PHASE 2 — 3-punch flurry (26-52)
  else if(t < 52) {
    const localT = t - 26;       // 0..26
    const punchIdx = Math.floor(localT / 8); // 0,1,2
    const pp = (localT % 8) / 8;
    const useRight = punchIdx % 2 === 0;
    const main = useRight ? 'rHand' : 'lHand';
    const mainElb = useRight ? 'rElbow' : 'lElbow';
    const off = useRight ? 'lHand' : 'rHand';
    const offElb = useRight ? 'lElbow' : 'rElbow';
    const ext = lerp(-15, 65, easeOutCubic(clamp(pp * 1.6, 0, 1)));
    const retract = pp > 0.6 ? (pp - 0.6) / 0.4 : 0;
    const finalExt = ext - retract * 50;
    pose[main].x = x + fc * finalExt;
    pose[main].y = y - 72 - punchIdx * 2;
    pose[mainElb].x = x + fc * finalExt * 0.45;
    pose[mainElb].y = y - 76;
    pose[off].x = x - fc * 12;
    pose[off].y = y - 60;
    pose[offElb].x = x - fc * 6;
    pose[offElb].y = y - 68;
    pose.bodyLean = fc * (6 + (useRight ? 4 : -4));
    pose.head.x += fc * 3;
    // Small hops
    pose.lFoot.x = x - 12 + Math.sin(localT * 0.5) * 4;
    pose.rFoot.x = x + 12 - Math.sin(localT * 0.5) * 4;
  }
  // PHASE 3 — roundhouse kick (52-66)
  else if(t < 66) {
    const p = (t - 52) / 14;
    const spin = p * Math.PI * 1.2;
    const legExt = lerp(15, 62, easeOutCubic(clamp(p * 1.3, 0, 1)));
    pose.rFoot.x = x + fc * legExt * Math.cos(spin * 0.5);
    pose.rFoot.y = y - 55 - Math.sin(p * Math.PI) * 8;
    pose.rKnee.x = x + fc * legExt * 0.5;
    pose.rKnee.y = y - 50;
    pose.lFoot.x = x - fc * 4; pose.lFoot.y = y;
    pose.lKnee.x = x - fc * 2; pose.lKnee.y = y - 22;
    pose.bodyLean = -fc * 14 + Math.sin(spin) * 10;
    pose.rHand.x = x + fc * 8; pose.rHand.y = y - 62;
    pose.lHand.x = x - fc * 18; pose.lHand.y = y - 68;
    pose.head.x += Math.sin(spin) * 3;
  }
  // PHASE 4 — uppercut launcher (66-80)
  else if(t < 80) {
    const p = (t - 66) / 14;
    const rise = easeOutCubic(p) * 35;
    pose.bodyLean = fc * (20 + p * 6);
    pose.rHand.x = x + fc * (30 + p * 30);
    pose.rHand.y = y - 100 - rise;
    pose.rElbow.x = x + fc * 20;
    pose.rElbow.y = y - 75 - rise * 0.3;
    pose.lHand.x = x - fc * 14; pose.lHand.y = y - 56;
    pose.pelvis.y = y - 42 - rise * 0.3;
    pose.neck.y = y - 82 - rise * 0.3;
    pose.head.y = y - 98 - rise * 0.3;
    pose.lFoot.y = y - rise * 0.15;
    pose.rFoot.y = y - rise * 0.15;
  }
  // PHASE 5 — aerial double kick (80-110)
  else if(t < 110) {
    // Fighter position is overridden by update() to be airborne
    const localT = t - 80;
    const phase = localT / 30;
    if(localT < 16) {
      // First aerial kick
      const p = localT / 16;
      const ext = lerp(5, 55, easeOutCubic(clamp(p * 1.6, 0, 1)));
      pose.rFoot.x = x + fc * ext;
      pose.rFoot.y = y - 40 + Math.sin(p * Math.PI) * 8;
      pose.rKnee.x = x + fc * ext * 0.5; pose.rKnee.y = y - 35;
      pose.lFoot.x = x - 6; pose.lFoot.y = y - 10;
      pose.lKnee.x = x - 4; pose.lKnee.y = y - 30;
      pose.rHand.x = x - fc * 10; pose.rHand.y = y - 78;
      pose.lHand.x = x - fc * 18; pose.lHand.y = y - 72;
      pose.bodyLean = -fc * 12;
    } else {
      // Second aerial kick
      const p = (localT - 16) / 14;
      const ext = lerp(5, 58, easeOutCubic(clamp(p * 1.6, 0, 1)));
      pose.lFoot.x = x + fc * ext;
      pose.lFoot.y = y - 55 + Math.sin(p * Math.PI) * 8;
      pose.lKnee.x = x + fc * ext * 0.5; pose.lKnee.y = y - 42;
      pose.rFoot.x = x - 4; pose.rFoot.y = y - 8;
      pose.rKnee.x = x - 2; pose.rKnee.y = y - 28;
      pose.rHand.x = x + fc * 8; pose.rHand.y = y - 72;
      pose.lHand.x = x - fc * 12; pose.lHand.y = y - 78;
      pose.bodyLean = -fc * 16;
    }
  }
  // PHASE 6 — diving slam (110-135)
  else {
    const localT = t - 110;
    if(localT < 10) {
      // wind up in air — raise both arms
      const p = localT / 10;
      pose.bodyLean = fc * (4 - p * 2);
      pose.rHand.x = x + fc * 8;  pose.rHand.y = y - 140 + p * 10;
      pose.lHand.x = x - fc * 8;  pose.lHand.y = y - 140 + p * 10;
      pose.rElbow.x = x + fc * 10; pose.rElbow.y = y - 110;
      pose.lElbow.x = x - fc * 10; pose.lElbow.y = y - 110;
      pose.lFoot.x = x - 6; pose.rFoot.x = x + 6;
      pose.lFoot.y = y - 4; pose.rFoot.y = y - 4;
    } else if(localT < 20) {
      // slam down
      const p = (localT - 10) / 10;
      pose.bodyLean = fc * 6;
      pose.rHand.x = x + fc * 20;  pose.rHand.y = y - 30 + p * 10;
      pose.lHand.x = x - fc * 20;  pose.lHand.y = y - 30 + p * 10;
      pose.rElbow.x = x + fc * 15; pose.rElbow.y = y - 60;
      pose.lElbow.x = x - fc * 15; pose.lElbow.y = y - 60;
      pose.lFoot.x = x - 10; pose.rFoot.x = x + 10;
      pose.lKnee.x = x - 8; pose.lKnee.y = y - 22;
      pose.rKnee.x = x + 8; pose.rKnee.y = y - 22;
    } else {
      // recovery crouch
      const p = clamp((localT - 20) / 15, 0, 1);
      const crouch = (1 - p) * 14;
      pose.pelvis.y = y - 42 + crouch * 0.4;
      pose.neck.y = y - 82 + crouch;
      pose.head.y = y - 98 + crouch;
      pose.bodyLean = fc * 4 * (1 - p);
      pose.rHand.x = x + fc * 16;  pose.rHand.y = y - 60 + crouch;
      pose.lHand.x = x - fc * 16;  pose.lHand.y = y - 60 + crouch;
      pose.rElbow.x = x + fc * 10; pose.rElbow.y = y - 70;
      pose.lElbow.x = x - fc * 10; pose.lElbow.y = y - 70;
    }
  }
}

// ============================================================
// POSE SMOOTHING + RENDERING
// ============================================================
const JOINT_KEYS = ['head','neck','pelvis','lHand','rHand','lElbow','rElbow','lFoot','rFoot','lKnee','rKnee'];

function clonePose(p) {
  const c = {};
  for(const k of JOINT_KEYS) c[k] = { x: p[k].x, y: p[k].y };
  c.bodyLean = p.bodyLean;
  c.headTilt = p.headTilt || 0;
  return c;
}

function smoothPose(current, target, factor) {
  for(const k of JOINT_KEYS) {
    current[k].x = lerp(current[k].x, target[k].x, factor);
    current[k].y = lerp(current[k].y, target[k].y, factor);
  }
  current.bodyLean = lerp(current.bodyLean, target.bodyLean, factor);
  current.headTilt = lerp(current.headTilt || 0, target.headTilt || 0, factor);
}

function captureFighterPose(f) {
  // Deep clone smoothPose for afterimage use + facing
  const p = f.smoothPose ? clonePose(f.smoothPose) : clonePose(computeTargetPose(f));
  p.facing = f.facing;
  p.hurtFlash = 0;
  p.onGround = f.onGround;
  p.x = f.x;
  p.y = f.y;
  return p;
}

// Apply secondary physics offsets to a pose in-place.
// impactVx/Vy — head whips and arms snap on hits
// squashY    — vertical compression on landings
// limbDragX  — arms trail when body changes velocity
function applyPosePhysics(f, pose) {
  const ix = f.impactVx || 0;
  const iy = f.impactVy || 0;
  const sq = f.squashY || 0;
  const ld = f.limbDragX || 0;

  // Head whips hardest, then hands, then elbows
  if(ix !== 0 || iy !== 0) {
    pose.head.x   += ix * 1.4;
    pose.head.y   += iy * 1.4;
    pose.neck.x   += ix * 0.7;
    pose.neck.y   += iy * 0.5;
    pose.lHand.x  += ix * 1.1;
    pose.rHand.x  += ix * 1.1;
    pose.lHand.y  += iy * 0.9;
    pose.rHand.y  += iy * 0.9;
    pose.lElbow.x += ix * 0.6;
    pose.rElbow.x += ix * 0.6;
    pose.pelvis.x += ix * 0.25;
  }

  // Landing squash — compresses the body vertically, feet stay put
  if(sq > 0.01) {
    pose.pelvis.y += sq * 0.4;
    pose.neck.y   += sq * 0.8;
    pose.head.y   += sq * 1.0;
    pose.lHand.y  += sq * 0.7;
    pose.rHand.y  += sq * 0.7;
    pose.lElbow.y += sq * 0.6;
    pose.rElbow.y += sq * 0.6;
    pose.lKnee.y  += sq * 0.3;
    pose.rKnee.y  += sq * 0.3;
  }

  // Limb drag — arms and head trail behind velocity changes
  if(Math.abs(ld) > 0.05) {
    pose.lHand.x += ld * 1.2;
    pose.rHand.x += ld * 1.2;
    pose.lElbow.x += ld * 0.7;
    pose.rElbow.x += ld * 0.7;
    pose.head.x   += ld * 0.5;
  }
}

function renderStoredPose(pose, color, shadowFactor = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const lean = pose.bodyLean;
  const neckX = pose.neck.x + lean;
  const neckY = pose.neck.y;

  // Legs
  drawLimb(pose.pelvis, pose.lKnee);
  drawLimb(pose.lKnee, pose.lFoot);
  drawLimb(pose.pelvis, pose.rKnee);
  drawLimb(pose.rKnee, pose.rFoot);

  // Body
  ctx.beginPath();
  ctx.moveTo(pose.pelvis.x, pose.pelvis.y);
  ctx.lineTo(neckX, neckY);
  ctx.stroke();

  // Arms
  drawLimb({ x: neckX, y: neckY }, pose.lElbow);
  drawLimb(pose.lElbow, pose.lHand);
  drawLimb({ x: neckX, y: neckY }, pose.rElbow);
  drawLimb(pose.rElbow, pose.rHand);

  // Head
  const hx = pose.head.x + lean;
  const hy = pose.head.y;
  const tilt = pose.headTilt || 0;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.stroke();
  if(pose.facing) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pose.facing * 5, -2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

function drawLimb(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

// Front-facing stick figure flailing in distress — used mid-ringout for the
// cinematic camera cut. All limbs driven by sine/cosine of globalTime so it
// reads as panicked waving, not animation-locked.
function frontFacingFlailPose(f) {
  const x = f.x, y = f.y;
  const t = globalTime;
  const s1 = Math.sin(t * 0.36);
  const s2 = Math.sin(t * 0.29 + 1.7);
  const s3 = Math.sin(t * 0.43 + 0.6);
  const s4 = Math.sin(t * 0.31 + 2.4);
  return {
    head:   { x, y: y - 98 },
    neck:   { x, y: y - 80 },
    pelvis: { x, y: y - 42 },
    // Legs kicking outward — feet splay
    lFoot:  { x: x - 14 - s3 * 6, y: y - Math.abs(s1) * 4 },
    rFoot:  { x: x + 14 + s4 * 6, y: y - Math.abs(s2) * 4 },
    lKnee:  { x: x - 9 + s3 * 3,  y: y - 22 },
    rKnee:  { x: x + 9 - s4 * 3,  y: y - 22 },
    // Arms waving overhead — elbows out, hands up and flailing
    lElbow: { x: x - 18 + s1 * 8,  y: y - 92 + s2 * 5 },
    lHand:  { x: x - 34 + s1 * 18, y: y - 116 - Math.abs(s1) * 10 },
    rElbow: { x: x + 18 - s2 * 8,  y: y - 92 + s1 * 5 },
    rHand:  { x: x + 34 - s2 * 18, y: y - 116 - Math.abs(s2) * 10 },
    bodyLean: s1 * 4,
    headTilt: s3 * 0.35,
    facing: 0,   // face camera — no eye-dot side indicator
  };
}

function drawFighter(f) {
  // Ring-out: phase-driven rendering. The cinematic uses HARD CUTS between
  // distinct camera/pose moments — see RINGOUT_PHASES in ringout.js.
  if(f.state === 'ringout') {
    const phName = (typeof RINGOUT_PHASES !== 'undefined' && RINGOUT_PHASES[ringoutPhaseIdx])
                   ? RINGOUT_PHASES[ringoutPhaseIdx].name : null;

    // FREEFALL phase — front-facing flailing pose, slight dramatic scale-up
    if(phName === 'FREEFALL') {
      const pose = frontFacingFlailPose(f);
      ctx.save();
      const scale = 1.4;
      ctx.translate(f.x, f.y - 55);
      ctx.scale(scale, scale);
      ctx.translate(-f.x, -(f.y - 55));
      renderStoredPose(pose, f.color);
      ctx.restore();
      return;
    }

    // CRASH phase — flat splayed pose, body flush with the ground
    if(phName === 'CRASH' || phName === 'SETTLE') {
      const x = f.x, y = f.y;
      const splayed = {
        head:   { x, y: y - 18 },
        neck:   { x, y: y - 14 },
        pelvis: { x, y: y - 4 },
        lFoot:  { x: x - 26, y: y - 2 },
        rFoot:  { x: x + 26, y: y - 2 },
        lKnee:  { x: x - 14, y: y - 6 },
        rKnee:  { x: x + 14, y: y - 6 },
        lHand:  { x: x - 32, y: y - 12 },
        rHand:  { x: x + 32, y: y - 12 },
        lElbow: { x: x - 16, y: y - 14 },
        rElbow: { x: x + 16, y: y - 14 },
        bodyLean: 0,
        headTilt: 0,
        facing: 0,
      };
      ctx.save();
      const scale = phName === 'CRASH' ? 1.2 : 1.0;
      ctx.translate(f.x, f.y - 10);
      ctx.scale(scale, scale);
      ctx.translate(-f.x, -(f.y - 10));
      renderStoredPose(splayed, f.color);
      ctx.restore();
      return;
    }

    // IMPACT / LAUNCH / APPROACH — tumbling side-view with rotation
    const target = computeTargetPose(f);
    if(!f.smoothPose) f.smoothPose = clonePose(target);
    smoothPose(f.smoothPose, target, 0.4);
    ctx.save();
    ctx.translate(f.x, f.y - 55);
    ctx.rotate(f.ringoutSpin || 0);
    ctx.translate(-f.x, -(f.y - 55));
    renderStoredPose({ ...f.smoothPose, facing: f.facing }, f.color);
    ctx.restore();
    return;
  }

  // Being thrown — tumble head-over-heels through the over-the-shoulder arc
  if(f.beingThrown > 0 && f.throwSpin !== undefined && f.throwSpin !== 0) {
    ctx.save();
    const pivotY = f.y - 50;
    ctx.translate(f.x, pivotY);
    ctx.rotate(f.throwSpin);
    ctx.translate(-f.x, -pivotY);
    const target = computeTargetPose(f);
    if(!f.smoothPose) f.smoothPose = clonePose(target);
    smoothPose(f.smoothPose, target, 0.4);
    renderStoredPose({ ...f.smoothPose, facing: f.facing }, f.color);
    ctx.restore();
    return;
  }

  const target = computeTargetPose(f);
  if(!f.smoothPose) f.smoothPose = clonePose(target);

  // Variable smoothing: crisper for attacks, silkier for idle/walk
  let factor = 0.32;
  if(f.state === 'attack') factor = 0.55;
  if(f.state === 'dash') factor = 0.6;
  if(f.state === 'hurt') factor = 0.5;
  if(f.state === 'stagger') factor = 0.4;
  if(f.state === 'attack' && f.attackType === 'ult') factor = 0.45;
  smoothPose(f.smoothPose, target, factor);

  // ---- Apply secondary physics to the rendered pose ----
  // We mutate smoothPose directly; next frame the lerp rebuilds toward target.
  applyPosePhysics(f, f.smoothPose);

  // Shadow
  const airFactor = Math.max(0, 1 - (GROUND - f.y) / 250);
  ctx.save();
  ctx.globalAlpha = 0.3 * airFactor;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND + 3, 22 * airFactor, 5 * airFactor, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ult-ready aura glow
  if(f.ult >= f.maxUlt && f.state !== 'attack') {
    ctx.save();
    const g = Math.abs(Math.sin(globalTime * 0.08));
    ctx.strokeStyle = f.glow;
    ctx.globalAlpha = 0.35 + g * 0.25;
    ctx.lineWidth = 10;
    ctx.shadowColor = f.glow;
    ctx.shadowBlur = 20;
    renderStoredPose({ ...f.smoothPose, facing: f.facing }, f.glow);
    ctx.restore();
  }

  // Ult attack aura
  if(f.state === 'attack' && f.attackType === 'ult') {
    ctx.save();
    ctx.shadowColor = f.glow;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = f.glow;
    ctx.lineWidth = 9;
    ctx.globalAlpha = 0.55;
    renderStoredPose({ ...f.smoothPose, facing: f.facing }, f.glow);
    ctx.restore();
    // Continuous ult particles
    if(globalTime % 2 === 0) {
      spawnParticle({
        type: 'spark',
        x: f.x + (Math.random() - 0.5) * 50,
        y: f.y - 30 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3,
        life: 26, maxLife: 26,
        size: Math.random() * 5 + 3,
        color: f.glow,
        grav: -0.05,
      });
    }
    // Swirling energy ring at feet during windup
    if(f.stateTime < 16 && globalTime % 2 === 0) {
      const ang = globalTime * 0.3;
      for(let i = 0; i < 3; i++) {
        const a2 = ang + i * Math.PI * 2 / 3;
        spawnParticle({
          type: 'spark',
          x: f.x + Math.cos(a2) * 30,
          y: GROUND - 2 + Math.sin(a2) * 6,
          vx: -Math.sin(a2) * 2,
          vy: -Math.cos(a2) * 0.5,
          life: 20, maxLife: 20,
          size: 4,
          color: f.glow,
          grav: 0,
        });
      }
    }
    // Motion streaks at impact frames
    const info = currentUltHit(f.stateTime);
    if(info && f.stateTime === info.hit.start) {
      for(let i = 0; i < 4; i++) {
        spawnStreak(f.x + f.facing * 30, f.y - 60 - i * 10, f.facing, f.glow);
      }
    }
  }

  // Hurt flash overlay
  const flash = f.hurtFlash > 0 && Math.floor(f.hurtFlash / 2) % 2 === 0;
  const col = flash ? '#ffe0e0' : f.color;

  ctx.save();
  ctx.shadowColor = f.color;
  ctx.shadowBlur = 4;
  renderStoredPose({ ...f.smoothPose, facing: f.facing }, col);
  ctx.restore();
}

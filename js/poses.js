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

  // Per-character idle breathing + stance
  const vis = f.character && f.character.visual;
  const ia = vis && vis.idleAnim;
  const ba = (ia && ia.breathAmp) || 1.5;
  const breath = Math.sin(globalTime * 0.05) * ba;
  pose.neck.y -= breath * 0.3;
  pose.head.y -= breath * 0.3;
  pose.lHand.y += breath * 0.5;
  pose.rHand.y -= breath * 0.5;

  // Character-specific secondary idle motion
  if(ia && ia.motion === 'float') {
    // Aurora: gentle up-down float
    const fl = Math.sin(globalTime * (ia.swayFreq || 0.03)) * 3;
    pose.head.y -= fl; pose.neck.y -= fl * 0.8;
    pose.lHand.y -= fl * 0.5; pose.rHand.y -= fl * 0.5;
  } else if(ia && ia.motion === 'bounce') {
    // Crimson: rhythmic boxer bounce
    const bn = Math.abs(Math.sin(globalTime * (ia.swayFreq || 0.07))) * 4;
    pose.pelvis.y += bn; pose.neck.y += bn * 0.5; pose.head.y += bn * 0.3;
    if(Math.sin(globalTime * (ia.swayFreq || 0.07)) > 0) pose.lFoot.y -= 3;
    else pose.rFoot.y -= 3;
  } else if(ia && ia.motion === 'flicker') {
    // Noir: subtle micro-teleport jitter
    if(Math.random() < 0.03) {
      pose.head.x += (Math.random() - 0.5) * 6;
      pose.pelvis.x += (Math.random() - 0.5) * 3;
    }
  }

  // Per-character idle stance offsets (only when idle on ground)
  const is = vis && vis.idleStance;
  if(is && f.state === 'idle' && f.onGround) {
    pose.lHand.x += (is.lHandX || 0) * fc;
    pose.lHand.y += (is.lHandY || 0);
    pose.rHand.x += (is.rHandX || 0) * fc;
    pose.rHand.y += (is.rHandY || 0);
    pose.lFoot.x += (is.lFootX || 0) * fc;
    pose.rFoot.x += (is.rFootX || 0) * fc;
    pose.bodyLean += (is.lean || 0) * fc;
  }

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

  // ============================================================
  // KO — directional collapse driven by lastHitDir
  // ============================================================
  if(f.state === 'ko') {
    const t = Math.min(f.stateTime, 40);
    const dir = f.lastHitDir || -fc;  // direction of the final blow
    if(!f.koLanded) {
      // AIRBORNE PHASE: body ragdolls backward, limbs trail
      const tumble = Math.min(t / 12, 1);  // 0→1 over 12 frames
      pose.bodyLean = dir * lerp(0, 50, easeOutCubic(tumble));
      pose.headTilt = dir * lerp(0, 0.8, tumble);
      pose.head.x += dir * tumble * 20;
      pose.head.y += tumble * 12;
      pose.neck.x += dir * tumble * 14;
      pose.neck.y += tumble * 8;
      // Arms go limp, trailing behind
      pose.lHand.x = x - dir * lerp(14, 40, tumble);
      pose.lHand.y = y - lerp(60, 30, tumble);
      pose.rHand.x = x - dir * lerp(-14, 30, tumble);
      pose.rHand.y = y - lerp(60, 25, tumble);
      pose.lElbow.x = x - dir * lerp(10, 28, tumble);
      pose.lElbow.y = y - lerp(72, 45, tumble);
      pose.rElbow.x = x - dir * lerp(-10, 18, tumble);
      pose.rElbow.y = y - lerp(72, 40, tumble);
      // Legs splay
      pose.lFoot.x = x - dir * lerp(12, 26, tumble);
      pose.lFoot.y = y - lerp(0, 16, tumble);
      pose.rFoot.x = x + dir * lerp(12, 6, tumble);
      pose.rFoot.y = y - lerp(0, 22, tumble);
      pose.lKnee.x = x - dir * lerp(8, 18, tumble);
      pose.lKnee.y = y - lerp(22, 28, tumble);
      pose.rKnee.x = x + dir * lerp(8, 4, tumble);
      pose.rKnee.y = y - lerp(22, 30, tumble);
    } else {
      // LANDED — collapse to ground, settle into defeated flat pose
      const settle = Math.min((f.stateTime - (f.koLandFrame || 0)) / 10, 1);
      const sp = easeOutCubic(settle);
      // Body goes nearly flat on the ground
      pose.head.x   = x + dir * lerp(20, 28, sp);
      pose.head.y   = y - lerp(60, 10, sp);
      pose.neck.x   = x + dir * lerp(14, 18, sp);
      pose.neck.y   = y - lerp(50, 8, sp);
      pose.pelvis.x = x + dir * lerp(0, 4, sp);
      pose.pelvis.y = y - lerp(42, 4, sp);
      pose.bodyLean  = dir * lerp(50, 80, sp);
      pose.headTilt  = dir * lerp(0.8, 0.5, sp);
      // Arms splayed on ground
      pose.lHand.x  = x - dir * 10 + dir * sp * 20;
      pose.lHand.y  = y - lerp(30, 6, sp);
      pose.rHand.x  = x + dir * 30 + dir * sp * 8;
      pose.rHand.y  = y - lerp(25, 8, sp);
      pose.lElbow.x = x + dir * lerp(-5, 10, sp);
      pose.lElbow.y = y - lerp(45, 8, sp);
      pose.rElbow.x = x + dir * lerp(18, 22, sp);
      pose.rElbow.y = y - lerp(40, 10, sp);
      // Legs crumpled
      pose.lFoot.x  = x - dir * lerp(26, 18, sp);
      pose.lFoot.y  = y - lerp(16, 2, sp);
      pose.rFoot.x  = x + dir * lerp(6, 22, sp);
      pose.rFoot.y  = y - lerp(22, 2, sp);
      pose.lKnee.x  = x - dir * lerp(18, 6, sp);
      pose.lKnee.y  = y - lerp(28, 10, sp);
      pose.rKnee.x  = x + dir * lerp(4, 14, sp);
      pose.rKnee.y  = y - lerp(30, 8, sp);
    }
  }

  // ============================================================
  // KNOCKDOWN — flat on ground, defeated
  // ============================================================
  if(f.state === 'knockdown') {
    const dir = f.lastHitDir || -fc;
    // Completely flat splayed pose
    pose.head.x   = x + dir * 28;   pose.head.y   = y - 10;
    pose.neck.x   = x + dir * 18;   pose.neck.y   = y - 8;
    pose.pelvis.x = x + dir * 4;    pose.pelvis.y  = y - 4;
    pose.bodyLean = dir * 80;
    pose.headTilt = dir * 0.5;
    pose.lHand.x  = x + dir * 10;   pose.lHand.y  = y - 6;
    pose.rHand.x  = x + dir * 38;   pose.rHand.y  = y - 8;
    pose.lElbow.x = x + dir * 10;   pose.lElbow.y = y - 8;
    pose.rElbow.x = x + dir * 22;   pose.rElbow.y = y - 10;
    pose.lFoot.x  = x - dir * 18;   pose.lFoot.y  = y - 2;
    pose.rFoot.x  = x + dir * 22;   pose.rFoot.y  = y - 2;
    pose.lKnee.x  = x - dir * 6;    pose.lKnee.y  = y - 10;
    pose.rKnee.x  = x + dir * 14;   pose.rKnee.y  = y - 8;
  }

  // ============================================================
  // GRABBED — defender is held by attacker, looks off-balance / compressed
  // ============================================================
  if(f.state === 'grabbed') {
    const dir = f.facing;   // facing attacker
    const t = Math.min(f.stateTime, 20);
    const pull = Math.min(t / 6, 1);  // ramp up over 6 frames
    // Body leans INTO the attacker — pulled off-balance
    pose.bodyLean = dir * lerp(0, 25, pull);
    pose.headTilt = dir * lerp(0, 0.4, pull);
    pose.head.y += lerp(0, 8, pull);        // head droops
    pose.neck.y += lerp(0, 6, pull);
    pose.pelvis.y += lerp(0, 4, pull);      // compressed stance
    // Arms dangling / pushed back — no control
    pose.lHand.x = x - dir * lerp(14, 6, pull);
    pose.lHand.y = y - lerp(60, 40, pull);
    pose.rHand.x = x + dir * lerp(14, 2, pull);
    pose.rHand.y = y - lerp(60, 44, pull);
    pose.lElbow.x = x - dir * lerp(10, 8, pull);
    pose.lElbow.y = y - lerp(72, 52, pull);
    pose.rElbow.x = x + dir * lerp(10, 6, pull);
    pose.rElbow.y = y - lerp(72, 56, pull);
    // Feet stumbling — one lifted
    pose.lFoot.x = x + dir * lerp(-12, -4, pull);
    pose.lFoot.y = y - lerp(0, 6, pull);     // lifted off ground
    pose.rFoot.x = x + dir * lerp(12, 16, pull);
    pose.rFoot.y = y;
    pose.lKnee.x = x + dir * lerp(-8, -2, pull);
    pose.lKnee.y = y - lerp(22, 18, pull);
    pose.rKnee.x = x + dir * lerp(8, 12, pull);
    pose.rKnee.y = y - lerp(22, 24, pull);
  }

  // ============================================================
  // THROWN — airborne after release, limp ragdoll tumble
  // ============================================================
  if(f.state === 'thrown') {
    const t = Math.min(f.stateTime, 30);
    const tumble = Math.min(t / 8, 1);
    const dir = (f.vx > 0) ? 1 : -1;
    // Body rotating backward in the air
    pose.bodyLean = dir * lerp(0, 45, tumble);
    pose.headTilt = dir * lerp(0, 0.6, tumble);
    // Head leads the tumble
    pose.head.x += dir * tumble * 16;
    pose.head.y += tumble * 8;
    // Arms trailing limp
    pose.lHand.x = x - dir * lerp(14, 30, tumble);
    pose.lHand.y = y - lerp(60, 35, tumble);
    pose.rHand.x = x - dir * lerp(-14, 20, tumble);
    pose.rHand.y = y - lerp(60, 30, tumble);
    pose.lElbow.x = x - dir * lerp(10, 22, tumble);
    pose.lElbow.y = y - lerp(72, 48, tumble);
    pose.rElbow.x = x - dir * lerp(-10, 12, tumble);
    pose.rElbow.y = y - lerp(72, 42, tumble);
    // Legs splayed outward
    pose.lFoot.y = y - lerp(0, 14, tumble);
    pose.rFoot.y = y - lerp(0, 20, tumble);
    pose.lKnee.y = y - lerp(22, 30, tumble);
    pose.rKnee.y = y - lerp(22, 34, tumble);
  }

  // ============================================================
  // ATTACKS — proper anticipation → strike → recovery with body mechanics
  // ============================================================
  if(f.state === 'attack' && f.attackType) {
    const t = f.stateTimeF;
    if(f.attackType === 'light') {
      const data = f.attackData();
      const phase = t < data.start ? 'startup'
                  : t < data.start + data.active ? 'active'
                  : 'recovery';

      if(f.comboStep === 0) {
        // ---- JAB (lead hand) — fast, compact, straight punch ----
        // Anticipation: shoulder pulls back, fist chambers at chin
        // Strike: fist drives FORWARD at chin height, shoulder rotates in
        // Recovery: fist retracts to guard
        if(phase === 'startup') {
          const pp = easeOutCubic(t / data.start);
          // Chamber — pull lead fist back to chin, rear hand guards face
          pose.rHand.x = x + fc * lerp(14, -4, pp);    // fist retracts to chin
          pose.rHand.y = y - lerp(60, 78, pp);          // rises to chin level
          pose.rElbow.x = x + fc * lerp(10, -2, pp);
          pose.rElbow.y = y - 72;
          pose.lHand.x = x - fc * 8;                    // rear guard at face
          pose.lHand.y = y - 74;
          pose.lElbow.x = x - fc * 6;
          pose.lElbow.y = y - 66;
          // Slight torso rotation — loading the shoulder
          pose.bodyLean = fc * lerp(0, -4, pp);
          pose.head.x += -fc * pp * 2;
          // Feet planted, weight shifts to rear
          pose.rFoot.x = x + fc * 10; pose.lFoot.x = x - fc * 14;
          pose.pelvis.y = y - 40;  // slight squat
        } else if(phase === 'active') {
          const at = easeOutCubic(clamp((t - data.start) / data.active * 1.3, 0, 1));
          // PUNCH — fist drives forward from chin, shoulder rotates into it
          const fistExt = lerp(-4, 52, at);
          pose.rHand.x = x + fc * fistExt;
          pose.rHand.y = y - 74;                        // stays at chin/face height
          pose.rElbow.x = x + fc * Math.max(4, fistExt * 0.4);
          pose.rElbow.y = y - 76;
          // Body drives forward — shoulder rotation, weight transfer
          pose.bodyLean = fc * lerp(-4, 10, at);
          pose.head.x += fc * lerp(-2, 4, at);
          pose.pelvis.x = x + fc * lerp(0, 3, at);     // hip pushes forward
          pose.neck.x = x + fc * lerp(0, 4, at);       // torso follows
          // Rear hand stays guarding chin
          pose.lHand.x = x - fc * 10;   pose.lHand.y = y - 72;
          pose.lElbow.x = x - fc * 8;   pose.lElbow.y = y - 66;
          // Front foot steps into punch
          pose.rFoot.x = x + fc * lerp(10, 16, at); pose.rFoot.y = y;
          pose.rKnee.x = x + fc * lerp(8, 12, at);
          pose.lFoot.x = x - fc * 14; pose.lFoot.y = y;
          pose.pelvis.y = y - 40;
        } else {
          // Recovery — retract fist, body settles back
          const rt = easeOutQuad(clamp((t - data.start - data.active) / (data.total - data.start - data.active), 0, 1));
          pose.rHand.x = x + fc * lerp(52, 14, rt);
          pose.rHand.y = y - lerp(74, 62, rt);
          pose.rElbow.x = x + fc * lerp(20, 10, rt);
          pose.rElbow.y = y - 74;
          pose.bodyLean = fc * lerp(10, 2, rt);
          pose.head.x += fc * lerp(4, 0, rt);
          pose.lHand.x = x - fc * 10;   pose.lHand.y = y - lerp(72, 62, rt);
          pose.lElbow.x = x - fc * 8;   pose.lElbow.y = y - 66;
          pose.rFoot.x = x + fc * lerp(16, 12, rt);
          pose.lFoot.x = x - fc * 14;
          pose.pelvis.y = y - lerp(40, 42, rt);
        }
      } else if(f.comboStep === 1) {
        // ---- CROSS (rear hand) — stronger straight, more hip rotation ----
        if(phase === 'startup') {
          const pp = easeOutCubic(t / data.start);
          // Rear hand chambers at chin, lead hand drops to guard body
          pose.lHand.x = x + fc * lerp(-14, -6, pp);
          pose.lHand.y = y - lerp(60, 76, pp);
          pose.lElbow.x = x - fc * lerp(10, 4, pp);
          pose.lElbow.y = y - 70;
          pose.rHand.x = x + fc * 10;  pose.rHand.y = y - 68;  // lead guards mid
          pose.rElbow.x = x + fc * 6;  pose.rElbow.y = y - 64;
          // Load rear hip — torso twists away
          pose.bodyLean = fc * lerp(0, -8, pp);
          pose.head.x += -fc * pp * 3;
          pose.pelvis.y = y - 40;
          // Rear foot pivots
          pose.lFoot.x = x - fc * lerp(12, 8, pp);
          pose.rFoot.x = x + fc * 12;
        } else if(phase === 'active') {
          const at = easeOutCubic(clamp((t - data.start) / data.active * 1.3, 0, 1));
          // CROSS — rear fist drives through, BIG hip rotation
          const fistExt = lerp(-6, 56, at);
          pose.lHand.x = x + fc * fistExt;
          pose.lHand.y = y - 74;
          pose.lElbow.x = x + fc * Math.max(2, fistExt * 0.35);
          pose.lElbow.y = y - 76;
          // Full body rotates into the cross
          pose.bodyLean = fc * lerp(-8, 14, at);
          pose.head.x += fc * lerp(-3, 5, at);
          pose.pelvis.x = x + fc * lerp(0, 6, at);   // big hip push
          pose.neck.x = x + fc * lerp(0, 5, at);
          // Lead hand drops to body guard
          pose.rHand.x = x + fc * 8;    pose.rHand.y = y - 64;
          pose.rElbow.x = x + fc * 6;   pose.rElbow.y = y - 60;
          // Rear foot pivots hard — weight transfers
          pose.lFoot.x = x - fc * lerp(8, 2, at);
          pose.lKnee.x = x - fc * lerp(6, 2, at);
          pose.rFoot.x = x + fc * lerp(12, 16, at);
          pose.pelvis.y = y - 40;
        } else {
          const rt = easeOutQuad(clamp((t - data.start - data.active) / (data.total - data.start - data.active), 0, 1));
          pose.lHand.x = x + fc * lerp(56, -12, rt);
          pose.lHand.y = y - lerp(74, 62, rt);
          pose.lElbow.x = x + fc * lerp(18, -8, rt);
          pose.lElbow.y = y - 72;
          pose.bodyLean = fc * lerp(14, 2, rt);
          pose.head.x += fc * lerp(5, 0, rt);
          pose.rHand.x = x + fc * 8;    pose.rHand.y = y - lerp(64, 62, rt);
          pose.lFoot.x = x - fc * lerp(2, 12, rt);
          pose.rFoot.x = x + fc * lerp(16, 12, rt);
          pose.pelvis.y = y - lerp(40, 42, rt);
        }
      } else {
        // ---- FINISHER ROUNDHOUSE KICK — big chamber, full extension, clean arc ----
        if(phase === 'startup') {
          const pp = easeOutCubic(t / data.start);
          // CHAMBER — kicking leg pulls up and back, body loads
          pose.rFoot.x = x + fc * lerp(12, -4, pp);       // foot pulls BEHIND body
          pose.rFoot.y = y - lerp(0, 30, pp);              // knee rises
          pose.rKnee.x = x + fc * lerp(8, 4, pp);
          pose.rKnee.y = y - lerp(22, 42, pp);             // knee up = chamber
          // Support leg braces — slight bend
          pose.lFoot.x = x - fc * 10; pose.lFoot.y = y;
          pose.lKnee.x = x - fc * 6;  pose.lKnee.y = y - 20;
          // Body leans back to counterbalance chamber
          pose.bodyLean = -fc * lerp(0, 14, pp);
          pose.pelvis.y = y - lerp(42, 38, pp);            // squat into it
          // Arms come up for balance
          pose.rHand.x = x + fc * 6;    pose.rHand.y = y - lerp(60, 72, pp);
          pose.lHand.x = x - fc * 16;   pose.lHand.y = y - lerp(60, 76, pp);
          pose.rElbow.x = x + fc * 4;   pose.rElbow.y = y - 68;
          pose.lElbow.x = x - fc * 10;  pose.lElbow.y = y - 70;
          pose.head.x += -fc * pp * 3;
        } else if(phase === 'active') {
          const at = easeOutCubic(clamp((t - data.start) / data.active * 1.2, 0, 1));
          // KICK — leg drives forward and UP in a clean arc
          const kickExt = lerp(-4, 60, at);
          pose.rFoot.x = x + fc * kickExt;
          pose.rFoot.y = y - lerp(30, 48, at);            // high kick — mid/head height
          pose.rKnee.x = x + fc * lerp(4, kickExt * 0.45, at);
          pose.rKnee.y = y - lerp(42, 44, at);
          // Support leg stays planted, slight pivot
          pose.lFoot.x = x - fc * 10; pose.lFoot.y = y;
          pose.lKnee.x = x - fc * 6;  pose.lKnee.y = y - 20;
          // Body leans opposite to kick for counterbalance — clear silhouette
          pose.bodyLean = fc * lerp(-14, 8, at);           // body rotates into kick
          pose.pelvis.y = y - 38;
          pose.pelvis.x = x + fc * lerp(0, 4, at);        // hip drives forward
          // Arms counterbalance — away from kick direction
          pose.lHand.x = x - fc * lerp(16, 26, at);  pose.lHand.y = y - 70;
          pose.rHand.x = x + fc * lerp(6, -8, at);   pose.rHand.y = y - 64;
          pose.lElbow.x = x - fc * lerp(10, 18, at); pose.lElbow.y = y - 68;
          pose.rElbow.x = x + fc * 2;                pose.rElbow.y = y - 66;
          pose.head.x += fc * lerp(-3, 4, at);
        } else {
          const rt = easeOutQuad(clamp((t - data.start - data.active) / (data.total - data.start - data.active), 0, 1));
          // RECOVERY — leg returns, body settles, noticeable follow-through
          pose.rFoot.x = x + fc * lerp(60, 14, rt);
          pose.rFoot.y = y - lerp(48, 0, rt);
          pose.rKnee.x = x + fc * lerp(28, 8, rt);
          pose.rKnee.y = y - lerp(44, 22, rt);
          pose.lFoot.x = x - fc * 10; pose.lFoot.y = y;
          pose.lKnee.x = x - fc * 6;  pose.lKnee.y = y - 22;
          pose.bodyLean = fc * lerp(8, 0, rt);
          pose.pelvis.y = y - lerp(38, 42, rt);
          pose.lHand.x = x - fc * lerp(26, 14, rt);  pose.lHand.y = y - lerp(70, 62, rt);
          pose.rHand.x = x + fc * lerp(-8, 14, rt);  pose.rHand.y = y - lerp(64, 62, rt);
          pose.lElbow.x = x - fc * lerp(18, 10, rt); pose.lElbow.y = y - 68;
          pose.rElbow.x = x + fc * lerp(2, 10, rt);  pose.rElbow.y = y - 68;
          pose.head.x += fc * lerp(4, 0, rt);
        }
      }
    }
    else if(f.attackType === 'heavy') {
      // ---- HEAVY CROSS / HAYMAKER — big windup, full body commitment ----
      const data = f.attackData();
      const phase = t < data.start ? 'startup'
                  : t < data.start + data.active ? 'active'
                  : 'recovery';
      if(phase === 'startup') {
        const pp = easeOutCubic(t / data.start);
        // BIG WINDUP — rear shoulder pulls way back, hips load, body coils
        // Fist pulls back behind head, torso twists away from target
        pose.rHand.x = x + fc * lerp(14, -28, pp);       // fist goes BEHIND body
        pose.rHand.y = y - lerp(60, 88, pp);              // up near ear
        pose.rElbow.x = x + fc * lerp(10, -16, pp);
        pose.rElbow.y = y - lerp(72, 80, pp);
        // Lead hand guards face
        pose.lHand.x = x + fc * lerp(-14, 8, pp);
        pose.lHand.y = y - lerp(60, 76, pp);
        pose.lElbow.x = x + fc * lerp(-8, 2, pp);
        pose.lElbow.y = y - 70;
        // Big torso coil — twist away, then unwind
        pose.bodyLean = -fc * lerp(0, 18, pp);
        pose.head.x += -fc * pp * 5;
        pose.pelvis.y = y - lerp(42, 36, pp);             // deep squat for power
        // Rear foot pivots — loading the hip
        pose.rFoot.x = x + fc * 12;
        pose.lFoot.x = x - fc * lerp(12, 6, pp);
        pose.lKnee.x = x - fc * lerp(8, 4, pp);
        pose.rKnee.y = y - lerp(22, 18, pp);              // rear knee bends
      } else if(phase === 'active') {
        const at = easeOutCubic(clamp((t - data.start) / data.active * 1.2, 0, 1));
        // STRIKE — fist EXPLODES forward from behind, full body uncoils
        const fistExt = lerp(-28, 68, at);
        pose.rHand.x = x + fc * fistExt;
        pose.rHand.y = y - lerp(88, 72, at);              // drops to face height
        pose.rElbow.x = x + fc * lerp(-16, fistExt * 0.4, at);
        pose.rElbow.y = y - lerp(80, 76, at);
        // Full body uncoils — hips drive, torso rotates through
        pose.bodyLean = fc * lerp(-18, 18, at);            // massive rotation
        pose.head.x += fc * lerp(-5, 8, at);
        pose.pelvis.x = x + fc * lerp(0, 8, at);          // hips drive forward
        pose.neck.x = x + fc * lerp(0, 7, at);
        pose.pelvis.y = y - lerp(36, 40, at);             // rises from squat
        // Lead hand drops to guard body
        pose.lHand.x = x - fc * lerp(-8, 14, at);
        pose.lHand.y = y - lerp(76, 58, at);
        pose.lElbow.x = x - fc * lerp(-2, 8, at);
        pose.lElbow.y = y - 66;
        // Rear foot pivots HARD — full weight transfer
        pose.lFoot.x = x - fc * lerp(6, -2, at);          // rear foot almost crosses
        pose.lKnee.x = x - fc * lerp(4, 0, at);
        pose.rFoot.x = x + fc * lerp(12, 18, at);         // front foot braces
        pose.rKnee.x = x + fc * lerp(8, 14, at);
      } else {
        const rt = easeOutQuad(clamp((t - data.start - data.active) / (data.total - data.start - data.active), 0, 1));
        // RECOVERY — extended follow-through, slow retract
        pose.rHand.x = x + fc * lerp(68, 14, rt);
        pose.rHand.y = y - lerp(72, 62, rt);
        pose.rElbow.x = x + fc * lerp(28, 10, rt);
        pose.rElbow.y = y - lerp(76, 72, rt);
        // Body settles back from rotation
        pose.bodyLean = fc * lerp(18, 2, rt);
        pose.head.x += fc * lerp(8, 0, rt);
        pose.pelvis.x = x + fc * lerp(8, 0, rt);
        pose.neck.x = x + fc * lerp(7, 0, rt);
        pose.pelvis.y = y - lerp(40, 42, rt);
        // Hands return to guard
        pose.lHand.x = x - fc * lerp(-14, 14, rt);
        pose.lHand.y = y - lerp(58, 62, rt);
        pose.lElbow.x = x - fc * lerp(-8, 10, rt);
        pose.lElbow.y = y - 68;
        // Feet return
        pose.lFoot.x = x - fc * lerp(-2, 12, rt);
        pose.lKnee.x = x - fc * lerp(0, 8, rt);
        pose.rFoot.x = x + fc * lerp(18, 12, rt);
        pose.rKnee.x = x + fc * lerp(14, 8, rt);
      }
    }
    else if(f.attackType === 'kick_light') {
      const data = f.attackData();
      const phase = t < data.start ? 'startup'
                  : t < data.start + data.active ? 'active'
                  : 'recovery';
      if(phase === 'startup') {
        const pp = easeOutCubic(t / data.start);
        // Chamber — knee rises, body braces
        pose.rFoot.x = x + fc * lerp(12, -2, pp);
        pose.rFoot.y = y - lerp(0, 28, pp);
        pose.rKnee.x = x + fc * lerp(8, 6, pp);
        pose.rKnee.y = y - lerp(22, 40, pp);
        pose.lFoot.x = x - fc * 10; pose.lFoot.y = y;
        pose.bodyLean = -fc * lerp(0, 8, pp);
        pose.pelvis.y = y - lerp(42, 38, pp);
        pose.rHand.x = x + fc * 6;  pose.rHand.y = y - 68;
        pose.lHand.x = x - fc * 14; pose.lHand.y = y - 72;
      } else if(phase === 'active') {
        const at = easeOutCubic(clamp((t - data.start) / data.active * 1.2, 0, 1));
        const kickExt = lerp(-2, 58, at);
        pose.rFoot.x = x + fc * kickExt;
        pose.rFoot.y = y - lerp(28, 40, at);
        pose.rKnee.x = x + fc * lerp(6, kickExt * 0.4, at);
        pose.rKnee.y = y - lerp(40, 38, at);
        pose.lFoot.x = x - fc * 10; pose.lFoot.y = y;
        pose.bodyLean = fc * lerp(-8, 6, at);
        pose.pelvis.y = y - 38;
        pose.pelvis.x = x + fc * lerp(0, 4, at);
        pose.lHand.x = x - fc * 20; pose.lHand.y = y - 68;
        pose.rHand.x = x + fc * 4;  pose.rHand.y = y - 62;
      } else {
        const rt = easeOutQuad(clamp((t - data.start - data.active) / (data.total - data.start - data.active), 0, 1));
        pose.rFoot.x = x + fc * lerp(58, 12, rt);
        pose.rFoot.y = y - lerp(40, 0, rt);
        pose.rKnee.x = x + fc * lerp(24, 8, rt);
        pose.rKnee.y = y - lerp(38, 22, rt);
        pose.bodyLean = fc * lerp(6, 0, rt);
        pose.pelvis.y = y - lerp(38, 42, rt);
      }
    }
    else if(f.attackType === 'kick_heavy') {
      const data = f.attackData();
      const phase = t < data.start ? 'startup'
                  : t < data.start + data.active ? 'active'
                  : 'recovery';
      if(phase === 'startup') {
        const pp = easeOutCubic(t / data.start);
        pose.rFoot.x = x + fc * lerp(12, -6, pp);
        pose.rFoot.y = y - lerp(0, 34, pp);
        pose.rKnee.x = x + fc * lerp(8, 4, pp);
        pose.rKnee.y = y - lerp(22, 44, pp);
        pose.lFoot.x = x - fc * 10; pose.lFoot.y = y;
        pose.bodyLean = -fc * lerp(0, 12, pp);
        pose.pelvis.y = y - lerp(42, 36, pp);
        pose.rHand.x = x + fc * 8;  pose.rHand.y = y - 72;
        pose.lHand.x = x - fc * 18; pose.lHand.y = y - 76;
      } else if(phase === 'active') {
        const at = easeOutCubic(clamp((t - data.start) / data.active * 1.2, 0, 1));
        const kickExt = lerp(-6, 66, at);
        pose.rFoot.x = x + fc * kickExt;
        pose.rFoot.y = y - lerp(34, 52, at);
        pose.rKnee.x = x + fc * lerp(4, kickExt * 0.4, at);
        pose.rKnee.y = y - lerp(44, 46, at);
        pose.lFoot.x = x - fc * 10; pose.lFoot.y = y;
        pose.bodyLean = fc * lerp(-12, 10, at);
        pose.pelvis.y = y - 36;
        pose.pelvis.x = x + fc * lerp(0, 6, at);
        pose.lHand.x = x - fc * lerp(18, 28, at); pose.lHand.y = y - 70;
        pose.rHand.x = x + fc * lerp(8, -6, at);  pose.rHand.y = y - 64;
      } else {
        const rt = easeOutQuad(clamp((t - data.start - data.active) / (data.total - data.start - data.active), 0, 1));
        pose.rFoot.x = x + fc * lerp(66, 12, rt);
        pose.rFoot.y = y - lerp(52, 0, rt);
        pose.rKnee.x = x + fc * lerp(28, 8, rt);
        pose.rKnee.y = y - lerp(46, 22, rt);
        pose.bodyLean = fc * lerp(10, 0, rt);
        pose.pelvis.y = y - lerp(36, 42, rt);
        pose.lHand.x = x - fc * lerp(28, 14, rt); pose.lHand.y = y - lerp(70, 62, rt);
        pose.rHand.x = x + fc * lerp(-6, 14, rt);  pose.rHand.y = y - lerp(64, 62, rt);
      }
    }
    else if(f.attackType === 'throw') {
      // Phase-synced throw pose — matches the 4-phase system in fighter.js
      // Uses f.throwPhase + f.throwTimer so the visual is LOCKED to the mechanic
      const ph = f.throwPhase || 0;
      const tt = f.throwTimer || 0;

      if(ph === 1) {
        // PHASE 1: GRAB — lunge forward, both hands reach out to seize defender
        const p = Math.min(tt / 8, 1);
        const ep = easeOutCubic(p);
        pose.bodyLean = fc * (4 + ep * 10);
        pose.head.x += fc * ep * 6;
        // Both hands extend to grab point (where defender is: fc * 30-44px ahead)
        const grabReach = lerp(14, 38, ep);
        pose.rHand.x = x + fc * grabReach;       pose.rHand.y = y - lerp(60, 72, ep);
        pose.lHand.x = x + fc * (grabReach - 4); pose.lHand.y = y - lerp(60, 64, ep);
        pose.rElbow.x = x + fc * grabReach * 0.5; pose.rElbow.y = y - 76;
        pose.lElbow.x = x + fc * grabReach * 0.4; pose.lElbow.y = y - 70;
        // Front foot steps forward
        pose.rFoot.x = x + fc * lerp(12, 22, ep); pose.rFoot.y = y;
        pose.lFoot.x = x - fc * lerp(12, 6, ep);  pose.lFoot.y = y;
        pose.rKnee.x = x + fc * lerp(8, 16, ep);
        pose.lKnee.x = x - fc * lerp(8, 4, ep);
      } else if(ph === 2) {
        // PHASE 2: SECURED HOLD — hands clamped on defender, pulling them close
        // Attacker is braced, visibly controlling the defender
        const p = Math.min(tt / 10, 1);
        pose.bodyLean = fc * lerp(14, 8, p);
        pose.head.x += fc * 4;
        // Hands stay locked at grab position — close to body now
        const holdDist = lerp(38, 28, p);
        pose.rHand.x = x + fc * holdDist;         pose.rHand.y = y - lerp(72, 68, p);
        pose.lHand.x = x + fc * (holdDist - 6);   pose.lHand.y = y - lerp(64, 60, p);
        pose.rElbow.x = x + fc * holdDist * 0.4;  pose.rElbow.y = y - 74;
        pose.lElbow.x = x + fc * holdDist * 0.3;  pose.lElbow.y = y - 68;
        // Braced wide stance
        pose.rFoot.x = x + fc * 20; pose.rFoot.y = y;
        pose.lFoot.x = x - fc * 10; pose.lFoot.y = y;
        pose.rKnee.x = x + fc * 14; pose.rKnee.y = y - 20;
        pose.lKnee.x = x - fc * 6;  pose.lKnee.y = y - 22;
        // Slight squat for control
        pose.pelvis.y = y - 38;
        pose.neck.y = y - 78;
        pose.head.y = y - 94;
      } else if(ph === 3) {
        // PHASE 3: THROW ARC — arms track the defender's semicircular path
        const p = Math.min(tt / 14, 1);
        const ep = easeInOutCubic(p);
        const angle = ep * Math.PI;  // 0 (front) → π (behind)
        // Hands track the arc where the defender actually is
        const handX = Math.cos(angle) * 50 * fc;
        const handY = -Math.sin(angle) * 75 - 50;
        pose.rHand.x = x + handX;         pose.rHand.y = y + handY;
        pose.lHand.x = x + handX - fc*6;  pose.lHand.y = y + handY + 10;
        pose.rElbow.x = x + handX * 0.4;  pose.rElbow.y = y - 76 + handY * 0.25;
        pose.lElbow.x = x + handX * 0.35; pose.lElbow.y = y - 72 + handY * 0.25;
        // Body counterbalances — leans opposite to the throw arc
        pose.bodyLean = fc * lerp(8, -20, ep);
        pose.head.x += fc * lerp(4, -8, ep);
        // Pivot on feet, slight squat at apex
        pose.pelvis.y = y - 42 + Math.sin(angle) * 8;
        pose.rFoot.x = x + fc * 14; pose.rFoot.y = y;
        pose.lFoot.x = x - fc * 14; pose.lFoot.y = y;
      } else if(ph === 4 || ph === 0) {
        // PHASE 4 / RECOVERY — straighten up after release
        const p = clamp(tt / 8, 0, 1);
        pose.bodyLean = -fc * lerp(20, 0, p);
        pose.rHand.x = x + fc * lerp(-10, 14, p);  pose.rHand.y = y - lerp(50, 60, p);
        pose.lHand.x = x - fc * lerp(-6, 14, p);   pose.lHand.y = y - lerp(48, 60, p);
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

// ============================================================
// DATA-DRIVEN ULT POSE — adapts to each character's hit sequence
// ============================================================
// Instead of hardcoding "phase 0 is frames 0-14", we derive pose intent
// from the hit data: windup → ground combo → launch → aerial → finisher.
// This makes all 4 character ults automatically animate correctly.

// --- Shared pose helpers ---
function ultPoseWindup(pose, x, y, fc, p) {
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

function ultPoseGroundHit(pose, x, y, fc, hitIdx, isActive) {
  // Alternating punch/kick based on hit index — odd = left, even = right
  const useRight = (hitIdx % 2 === 0);
  const ext = isActive ? 50 : 12;
  const main = useRight ? 'rHand' : 'lHand';
  const mainElb = useRight ? 'rElbow' : 'lElbow';
  const off = useRight ? 'lHand' : 'rHand';
  pose[main].x = x + fc * ext; pose[main].y = y - 72;
  pose[mainElb].x = x + fc * ext * 0.45; pose[mainElb].y = y - 76;
  pose[off].x = x - fc * 14; pose[off].y = y - 60;
  pose.bodyLean = fc * (4 + (isActive ? 8 : 0));
  pose.head.x += fc * 3;
  // Last ground hit → spin kick variant
  if(hitIdx >= 3 && isActive) {
    pose.rFoot.x = x + fc * (ext * 0.8); pose.rFoot.y = y - 50;
    pose.rKnee.x = x + fc * ext * 0.4; pose.rKnee.y = y - 45;
    pose.bodyLean = -fc * 10;
  }
}

function ultPoseLaunch(pose, x, y, fc, p) {
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

function ultPoseAerial(pose, x, y, fc, hitIdx, isActive) {
  const ext = isActive ? 55 : 10;
  if(hitIdx % 2 === 0) {
    // Kick right
    pose.rFoot.x = x + fc * ext; pose.rFoot.y = y - 40;
    pose.rKnee.x = x + fc * ext * 0.5; pose.rKnee.y = y - 35;
    pose.lFoot.x = x - 6; pose.lFoot.y = y - 10;
    pose.rHand.x = x - fc * 10; pose.rHand.y = y - 78;
    pose.lHand.x = x - fc * 18; pose.lHand.y = y - 72;
    pose.bodyLean = -fc * 12;
  } else {
    // Kick left
    pose.lFoot.x = x + fc * ext; pose.lFoot.y = y - 55;
    pose.lKnee.x = x + fc * ext * 0.5; pose.lKnee.y = y - 42;
    pose.rFoot.x = x - 4; pose.rFoot.y = y - 8;
    pose.rHand.x = x + fc * 8; pose.rHand.y = y - 72;
    pose.lHand.x = x - fc * 12; pose.lHand.y = y - 78;
    pose.bodyLean = -fc * 16;
  }
}

function ultPoseFinisher(pose, x, y, fc, p) {
  if(p < 0.3) {
    // Wind up — arms raised
    const pp = p / 0.3;
    pose.bodyLean = fc * (4 - pp * 2);
    pose.rHand.x = x + fc * 8;  pose.rHand.y = y - 140 + pp * 10;
    pose.lHand.x = x - fc * 8;  pose.lHand.y = y - 140 + pp * 10;
    pose.rElbow.x = x + fc * 10; pose.rElbow.y = y - 110;
    pose.lElbow.x = x - fc * 10; pose.lElbow.y = y - 110;
  } else if(p < 0.7) {
    // Slam down
    const pp = (p - 0.3) / 0.4;
    pose.bodyLean = fc * 6;
    pose.rHand.x = x + fc * 20;  pose.rHand.y = y - 30 + pp * 10;
    pose.lHand.x = x - fc * 20;  pose.lHand.y = y - 30 + pp * 10;
    pose.rElbow.x = x + fc * 15; pose.rElbow.y = y - 60;
    pose.lElbow.x = x - fc * 15; pose.lElbow.y = y - 60;
  } else {
    // Recovery crouch
    const pp = clamp((p - 0.7) / 0.3, 0, 1);
    const crouch = (1 - pp) * 14;
    pose.pelvis.y = y - 42 + crouch * 0.4;
    pose.neck.y = y - 82 + crouch;
    pose.head.y = y - 98 + crouch;
    pose.bodyLean = fc * 4 * (1 - pp);
    pose.rHand.x = x + fc * 16;  pose.rHand.y = y - 60 + crouch;
    pose.lHand.x = x - fc * 16;  pose.lHand.y = y - 60 + crouch;
    pose.rElbow.x = x + fc * 10; pose.rElbow.y = y - 70;
    pose.lElbow.x = x - fc * 10; pose.lElbow.y = y - 70;
  }
}

// --- Main dispatcher ---
function computeUltPose(f, pose, t) {
  const seq = f.ultSeq;
  const x = f.x, y = f.y, fc = f.facing;

  // Derive pose intent from hit data
  const hitInfo = currentUltHit(t, seq);
  const firstHit    = seq.hits[0];
  const launchHit   = seq.hits.find(h => h.launch);
  const finisherHit = seq.hits.find(h => h.finisher);
  const aerialStart = launchHit ? launchHit.end + 2 : seq.total;
  const slamStart   = finisherHit ? finisherHit.start - 8 : seq.total;

  // WINDUP — before first hit
  if(t < firstHit.start) {
    ultPoseWindup(pose, x, y, fc, t / firstHit.start);
    return;
  }
  // GROUND COMBO — from first hit to launch
  if(launchHit && t < launchHit.start) {
    ultPoseGroundHit(pose, x, y, fc, hitInfo ? hitInfo.index : 0, !!hitInfo);
    return;
  }
  // LAUNCH — the uppercut
  if(launchHit && t >= launchHit.start && t < aerialStart) {
    const p = (t - launchHit.start) / Math.max(1, aerialStart - launchHit.start);
    ultPoseLaunch(pose, x, y, fc, p);
    return;
  }
  // AERIAL — airborne hits
  if(t >= aerialStart && t < slamStart) {
    ultPoseAerial(pose, x, y, fc, hitInfo ? hitInfo.index : 0, !!hitInfo);
    return;
  }
  // FINISHER — slam down + recovery
  if(t >= slamStart) {
    const p = clamp((t - slamStart) / Math.max(1, seq.total - slamStart), 0, 1);
    ultPoseFinisher(pose, x, y, fc, p);
    return;
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
  // Deep clone smoothPose for afterimage use + facing + visual identity
  const p = f.smoothPose ? clonePose(f.smoothPose) : clonePose(computeTargetPose(f));
  p.facing = f.facing;
  p.hurtFlash = 0;
  p.onGround = f.onGround;
  p.x = f.x;
  p.y = f.y;
  p.visual = (f.character && f.character.visual) || null;
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

// ============================================================
// HEAD DECORATIONS — hair, crowns, hoods (drawn in head-local space)
// ============================================================
function drawHeadDecor(visual, facing) {
  if(!visual || !visual.headDecor) return;
  const fc = facing || 1;
  for(const d of visual.headDecor) {
    if(d.type === 'line') {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.width || 2;
      ctx.beginPath();
      ctx.moveTo(d.x1 * fc, d.y1);
      ctx.lineTo(d.x2 * fc, d.y2);
      ctx.stroke();
    } else if(d.type === 'diamond') {
      ctx.fillStyle = d.color;
      const s = d.size;
      ctx.beginPath();
      ctx.moveTo(d.cx, d.cy - s);
      ctx.lineTo(d.cx + s, d.cy);
      ctx.lineTo(d.cx, d.cy + s);
      ctx.lineTo(d.cx - s, d.cy);
      ctx.closePath();
      ctx.fill();
    } else if(d.type === 'rect') {
      if(d.fill) { ctx.fillStyle = d.fill; ctx.fillRect(d.x, d.y, d.w, d.h); }
      if(d.border) { ctx.strokeStyle = d.border; ctx.lineWidth = 1.5; ctx.strokeRect(d.x, d.y, d.w, d.h); }
    } else if(d.type === 'arc') {
      // Hood — half-ellipse over the top of head
      ctx.beginPath();
      ctx.ellipse(0, -2, d.rx || 16, d.ry || 14, 0, Math.PI, 0);
      if(d.fill) { ctx.fillStyle = d.fill; ctx.fill(); }
      if(d.border) { ctx.strokeStyle = d.border; ctx.lineWidth = d.width || 2; ctx.stroke(); }
    }
  }
}

// ============================================================
// EYES — per-character expression system
// ============================================================
function drawEyes(visual, facing, color) {
  const eyes = visual && visual.eyes;
  const fc = facing || 1;
  if(!eyes) {
    // Fallback: classic dot
    if(fc !== 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(fc * 5, -2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  const drawOne = (ex) => {
    if(eyes.type === 'wide') {
      ctx.fillStyle = eyes.color;
      ctx.beginPath();
      ctx.ellipse(ex, -2, eyes.w / 2, eyes.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if(eyes.highlight) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + 1, -3, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if(eyes.type === 'slit') {
      ctx.save();
      ctx.translate(ex, -2);
      ctx.rotate(eyes.angle || 0);
      ctx.fillStyle = eyes.color;
      ctx.fillRect(-eyes.w / 2, -eyes.h / 2, eyes.w, eyes.h);
      ctx.restore();
    } else if(eyes.type === 'dot') {
      ctx.fillStyle = eyes.color;
      ctx.beginPath();
      ctx.arc(ex, -1, eyes.radius || 2, 0, Math.PI * 2);
      ctx.fill();
    } else if(eyes.type === 'glow') {
      ctx.save();
      ctx.shadowColor = eyes.color;
      ctx.shadowBlur = eyes.glowRadius || 6;
      ctx.fillStyle = eyes.color;
      ctx.beginPath();
      ctx.ellipse(ex, -2, eyes.w / 2, eyes.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  if(fc === 0) {
    // Camera-facing (ringout) — draw both eyes symmetrically
    drawOne(-4);
    drawOne(4);
  } else {
    drawOne(fc * 5);
  }
}

// ============================================================
// COSTUME ELEMENTS — capes, armor, wraps
// ============================================================
function drawCostumeBack(pose, visual) {
  // Drawn BEFORE the body so capes / cloaks appear behind
  if(!visual || !visual.costume) return;
  const lean = pose.bodyLean || 0;
  const neckX = pose.neck.x + lean;
  const neckY = pose.neck.y;
  for(const c of visual.costume) {
    if(c.attach === 'cape') {
      // Simple bezier cape trailing behind the body lean
      const tipX = neckX - lean * 2.5;
      const tipY = neckY + c.length;
      ctx.beginPath();
      ctx.moveTo(neckX - 4, neckY);
      ctx.quadraticCurveTo(neckX - lean * 1.8, neckY + c.length * 0.6, tipX, tipY);
      ctx.lineTo(neckX + 4, neckY);
      ctx.closePath();
      ctx.fillStyle = c.color;
      ctx.fill();
      if(c.border) {
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(neckX - 4, neckY);
        ctx.quadraticCurveTo(neckX - lean * 1.8, neckY + c.length * 0.6, tipX, tipY);
        ctx.stroke();
      }
    }
    if(c.attach === 'sash') {
      // Short trailing line from pelvis
      const px = pose.pelvis.x, py = pose.pelvis.y;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px - lean * 1.5, py + c.length * 0.5, px - lean * 2, py + c.length);
      ctx.stroke();
    }
  }
}

function drawCostumeFront(pose, visual, baseLineWidth) {
  // Drawn AFTER the body for overlays: shoulder pads, chest plate, limb wraps
  if(!visual || !visual.costume) return;
  const lean = pose.bodyLean || 0;
  const neckX = pose.neck.x + lean;
  const neckY = pose.neck.y;
  for(const c of visual.costume) {
    if(c.attach === 'shoulders') {
      // Dome pads on each shoulder
      const lsx = neckX - 8, rsx = neckX + 8;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(lsx, neckY, c.radius, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rsx, neckY, c.radius, Math.PI, 0);
      ctx.fill();
      if(c.border) {
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(lsx, neckY, c.radius, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(rsx, neckY, c.radius, Math.PI, 0); ctx.stroke();
      }
    }
    if(c.attach === 'chest') {
      // Filled rect on torso midpoint
      const mx = (pose.pelvis.x + neckX) / 2;
      const my = (pose.pelvis.y + neckY) / 2;
      ctx.fillStyle = c.color;
      ctx.fillRect(mx - c.width / 2, my - 10, c.width, 20);
      if(c.border) {
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(mx - c.width / 2, my - 10, c.width, 20);
      }
    }
    if(c.attach === 'forearms') {
      // Thicker overlay on elbow→hand limbs
      ctx.strokeStyle = c.color;
      ctx.lineWidth = baseLineWidth + c.extraWidth;
      drawLimb(pose.lElbow, pose.lHand);
      drawLimb(pose.rElbow, pose.rHand);
    }
    if(c.attach === 'shins') {
      // Thicker overlay on knee→foot limbs
      ctx.strokeStyle = c.color;
      ctx.lineWidth = baseLineWidth + c.extraWidth;
      drawLimb(pose.lKnee, pose.lFoot);
      drawLimb(pose.rKnee, pose.rFoot);
    }
  }
}

// ============================================================
// FILLED-SHAPE LIMB — trapezoid between two joints with width at each end
// ============================================================
function drawFilledLimb(a, b, wa, wb, fillColor, outlineColor) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  const nx = -dy / len, ny = dx / len;  // perpendicular normal
  ctx.beginPath();
  ctx.moveTo(a.x + nx * wa/2, a.y + ny * wa/2);
  ctx.lineTo(b.x + nx * wb/2, b.y + ny * wb/2);
  ctx.lineTo(b.x - nx * wb/2, b.y - ny * wb/2);
  ctx.lineTo(a.x - nx * wa/2, a.y - ny * wa/2);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  if(outlineColor) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

// Torso — 4-point polygon from shoulders to waist
function drawTorso(neckX, neckY, pelvisX, pelvisY, shoulderW, waistW, fillColor, darkColor, outlineColor) {
  const sw = shoulderW / 2, ww = waistW / 2;
  // Main fill
  ctx.beginPath();
  ctx.moveTo(neckX - sw, neckY);
  ctx.lineTo(neckX + sw, neckY);
  ctx.lineTo(pelvisX + ww, pelvisY);
  ctx.lineTo(pelvisX - ww, pelvisY);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  // Dark shading on one side (left half for "light from right" feel)
  ctx.beginPath();
  ctx.moveTo(neckX - sw, neckY);
  ctx.lineTo(neckX, neckY);
  ctx.lineTo(pelvisX, pelvisY);
  ctx.lineTo(pelvisX - ww, pelvisY);
  ctx.closePath();
  ctx.fillStyle = darkColor;
  ctx.fill();
  // Outline
  if(outlineColor) {
    ctx.beginPath();
    ctx.moveTo(neckX - sw, neckY);
    ctx.lineTo(neckX + sw, neckY);
    ctx.lineTo(pelvisX + ww, pelvisY);
    ctx.lineTo(pelvisX - ww, pelvisY);
    ctx.closePath();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

// Filled head — circle with skin color + face features
function drawFilledHead(hx, hy, radius, skinColor, outlineColor, visual, facing, tilt) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt || 0);
  // Filled head circle
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  if(outlineColor) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Head decorations (hair, crown, hood)
  drawHeadDecor(visual, facing);
  // Eyes
  drawEyes(visual, facing, outlineColor || '#000');
  // Mouth — small line
  const fc = facing || 1;
  if(fc !== 0) {
    ctx.strokeStyle = outlineColor || '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fc * 3, radius * 0.3);
    ctx.lineTo(fc * 6, radius * 0.25);
    ctx.stroke();
  }
  ctx.restore();
}

// Hand — filled circle
function drawHand(x, y, r, skinColor, outlineColor) {
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if(outlineColor) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Foot — rounded rectangle
function drawFoot(x, y, w, h, facing, fillColor, outlineColor) {
  const fc = facing || 1;
  const fx = x + (fc > 0 ? -w * 0.3 : -w * 0.7);
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(fx, y - h, w, h, 2);
  ctx.fill();
  if(outlineColor) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(fx, y - h, w, h, 2);
    ctx.stroke();
  }
}

// ============================================================
// SNES-QUALITY FILLED POSE RENDERER
// ============================================================
function renderFilledPose(pose, visual) {
  const b = visual.body;
  const lean = pose.bodyLean || 0;
  const neckX = pose.neck.x + lean, neckY = pose.neck.y;
  const fc = pose.facing || 1;

  ctx.save();

  // --- Back-layer costume (capes) ---
  drawCostumeBack(pose, visual);

  // --- Legs (behind torso) ---
  drawFilledLimb(pose.pelvis, pose.lKnee, b.thighW, b.shinW, b.outfitColor, b.outlineColor);
  drawFilledLimb(pose.lKnee, pose.lFoot, b.shinW, b.shinW * 0.8, b.outfitColor, b.outlineColor);
  drawFilledLimb(pose.pelvis, pose.rKnee, b.thighW, b.shinW, b.outfitColor, b.outlineColor);
  drawFilledLimb(pose.rKnee, pose.rFoot, b.shinW, b.shinW * 0.8, b.outfitColor, b.outlineColor);

  // Feet
  drawFoot(pose.lFoot.x, pose.lFoot.y, b.footW, b.footH, fc, b.outfitDark, b.outlineColor);
  drawFoot(pose.rFoot.x, pose.rFoot.y, b.footW, b.footH, fc, b.outfitDark, b.outlineColor);

  // --- Torso ---
  drawTorso(neckX, neckY, pose.pelvis.x, pose.pelvis.y,
            b.shoulderW, b.waistW, b.outfitColor, b.outfitDark, b.outlineColor);

  // --- Arms ---
  drawFilledLimb({ x: neckX - b.shoulderW/2 * 0.6, y: neckY }, pose.lElbow,
                 b.upperArmW, b.forearmW, b.outfitColor, b.outlineColor);
  drawFilledLimb(pose.lElbow, pose.lHand, b.forearmW, b.forearmW * 0.7,
                 b.skinColor, b.outlineColor);
  drawFilledLimb({ x: neckX + b.shoulderW/2 * 0.6, y: neckY }, pose.rElbow,
                 b.upperArmW, b.forearmW, b.outfitColor, b.outlineColor);
  drawFilledLimb(pose.rElbow, pose.rHand, b.forearmW, b.forearmW * 0.7,
                 b.skinColor, b.outlineColor);

  // Hands
  drawHand(pose.lHand.x, pose.lHand.y, b.handR, b.skinColor, b.outlineColor);
  drawHand(pose.rHand.x, pose.rHand.y, b.handR, b.skinColor, b.outlineColor);

  // --- Costume front (armor, wraps — on top) ---
  drawCostumeFront(pose, visual, b.upperArmW);

  // --- Head ---
  const hx = pose.head.x + lean, hy = pose.head.y;
  drawFilledHead(hx, hy, visual.headRadius || 13,
                 b.skinColor, b.outlineColor, visual, fc, pose.headTilt);

  ctx.restore();
}

// ============================================================
// MAIN POSE RENDERER — dispatches to filled or line-based
// ============================================================
function renderStoredPose(pose, color, shadowFactor = 1, visual = null) {
  // If we have SNES-quality body data, use the filled renderer
  if(visual && visual.body) {
    renderFilledPose(pose, visual);
    return;
  }
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const lw = (visual && visual.lineWidth) || 4.5;
  const headR = (visual && visual.headRadius) || 13;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const lean = pose.bodyLean;
  const neckX = pose.neck.x + lean;
  const neckY = pose.neck.y;

  // Layer 1: costume back (capes, cloaks — behind the body)
  drawCostumeBack(pose, visual);

  // Layer 2: stick figure body
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;

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

  // Layer 3: costume front (armor, wraps — on top of limbs)
  drawCostumeFront(pose, visual, lw);

  // Reset stroke for head
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;

  // Head
  const hx = pose.head.x + lean;
  const hy = pose.head.y;
  const tilt = pose.headTilt || 0;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  // Head circle
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.stroke();
  // Head decorations (hair, crown, hood)
  drawHeadDecor(visual, pose.facing);
  // Eyes
  drawEyes(visual, pose.facing, color);
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
  const vis = f.character && f.character.visual;

  // Sprite-based rendering for ALL states. Special states (thrown, ringout, ko, knockdown)
  // apply transforms (rotation, etc.) around the sprite.
  if(typeof drawFighterSprite === 'function') {
    // Determine rotation for special states
    const hasThrowSpin = f.beingThrown > 0 && f.throwSpin;
    const hasRingoutSpin = f.state === 'ringout' && f.ringoutSpin;
    const dir = f.lastHitDir || -f.facing;

    // KO: tumble rotation while airborne, then tilt flat when landed
    let koRotation = 0;
    if(f.state === 'ko') {
      if(!f.koLanded) {
        // Airborne: progressive backward tumble (up to ~100 degrees)
        const tumbleP = Math.min(f.stateTime / 18, 1);
        koRotation = dir * easeOutCubic(tumbleP) * 1.7;
      } else {
        // Landed: settle to ~90° (lying flat)
        const settleP = Math.min((f.stateTime - (f.koLandFrame || 0)) / 8, 1);
        koRotation = dir * lerp(1.7, Math.PI / 2, easeOutCubic(settleP));
      }
    }

    // Knockdown: settle from impact rotation into flat, then recover to upright
    // Skip rotation if character has real sprite frames (the art handles the collapse)
    const charId = f.character && f.character.id;
    const hasRealFrames = charId && spriteSheets[charId];
    let knockdownRotation = 0;
    if(f.state === 'knockdown' && !(hasRealFrames && hasRealFrames['knockdown'])) {
      const t = f.stateTime;
      if(t < 5) {
        // First 5 frames: settle from impact tumble into flat (~90°)
        const settleP = easeOutCubic(t / 5);
        knockdownRotation = dir * lerp(Math.PI * 1.1, Math.PI / 2, settleP);
      } else if(f.hitStun > 6) {
        // Middle: stay flat on ground
        knockdownRotation = dir * Math.PI / 2;
      } else {
        // Last 6 frames of hitStun: tilt from flat back to upright (getting up)
        const recoverP = 1 - (f.hitStun / 6);
        knockdownRotation = dir * lerp(Math.PI / 2, 0, easeOutCubic(recoverP));
      }
    }

    // Grabbed state: progressive tilt as attacker secures the hold
    let grabbedRotation = 0;
    if(f.state === 'grabbed') {
      // Gradual tilt toward attacker over the grab duration
      const grabP = Math.min(f.stateTime / 12, 1);
      const grabDir = f.facing;  // facing = toward attacker
      grabbedRotation = grabDir * easeOutCubic(grabP) * 0.5;  // ~30° lean into attacker

      // If attacker is in throw arc phase (phase 3), rotate with the arc
      if(f.throwBy && f.throwBy.throwPhase === 3) {
        const arcP = Math.min((f.throwBy.throwTimer || 0) / 14, 1);
        const arcAngle = easeInOutCubic(arcP) * Math.PI;  // full semicircle
        grabbedRotation = grabDir * (0.5 + arcAngle);  // starts from lean, adds arc rotation
      }
    }

    // Thrown state: tumble through the air after release
    let thrownRotation = 0;
    if(f.state === 'thrown') {
      // Continue rotation from where grabbed left off (~3.6 rad) and keep spinning
      const throwDir = (f.vx > 0) ? 1 : -1;
      thrownRotation = throwDir * (Math.PI + Math.min(f.stateTime / 6, 1) * 1.2);
    }

    const needsRotation = hasThrowSpin || hasRingoutSpin || koRotation || knockdownRotation || grabbedRotation || thrownRotation;

    if(needsRotation) {
      const spin = hasThrowSpin ? f.throwSpin
                 : hasRingoutSpin ? f.ringoutSpin
                 : koRotation || knockdownRotation || grabbedRotation || thrownRotation;
      ctx.save();
      // Pivot at the fighter's center-mass
      const pivotX = f.x;
      const pivotY = (f.state === 'knockdown' || (f.state === 'ko' && f.koLanded))
                   ? f.y - 20   // lower pivot for ground states
                   : (f.state === 'grabbed')
                   ? f.y - SPRITE_DRAW_H * 0.35  // pivot at waist when grabbed
                   : f.y - SPRITE_DRAW_H / 2 + 10;
      ctx.translate(pivotX, pivotY);
      ctx.rotate(spin);
      ctx.translate(-pivotX, -pivotY);
      drawFighterSprite(f);
      ctx.restore();
    } else {
      drawFighterSprite(f);
    }
    // Shadow
    const airFactor = Math.max(0, 1 - (GROUND - f.y) / 250);
    if(airFactor > 0.01) {
      ctx.save();
      ctx.globalAlpha = 0.3 * airFactor;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(f.x, GROUND + 3, 22 * airFactor, 5 * airFactor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }

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
      renderStoredPose(pose, f.color, 1, vis);
      ctx.restore();
      return;
    }

    // CRASH phase — transition smoothly:
    //   frames 0-3: still use the falling/tumbling pose (body just hit floor,
    //               limbs still in motion from the impact)
    //   frames 4+ : splayed flat pose (body settled)
    // This eliminates the "jump cut to flat-on-ground" that felt like a frame skip.
    if(phName === 'CRASH' && ringoutPhaseFrame < 4) {
      const target = computeTargetPose(f);
      if(!f.smoothPose) f.smoothPose = clonePose(target);
      smoothPose(f.smoothPose, target, 0.6);
      ctx.save();
      ctx.translate(f.x, f.y - 55);
      ctx.rotate(f.ringoutSpin || 0);
      ctx.translate(-f.x, -(f.y - 55));
      renderStoredPose({ ...f.smoothPose, facing: f.facing }, f.color, 1, vis);
      ctx.restore();
      return;
    }
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
      renderStoredPose(splayed, f.color, 1, vis);
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
    renderStoredPose({ ...f.smoothPose, facing: f.facing }, f.color, 1, vis);
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
    renderStoredPose({ ...f.smoothPose, facing: f.facing }, f.color, 1, vis);
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
  if(f.state === 'ko') factor = 0.5;          // snappy collapse
  if(f.state === 'knockdown') factor = 0.25;  // stay flat, minimal drift
  if(f.state === 'grabbed') factor = 0.45;    // quick snap into grabbed pose
  if(f.state === 'thrown') factor = 0.5;       // responsive ragdoll
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
    // Per-character ult aura particles — theme-colored, character-distinct shapes.
    const theme = (f.ultSeq && f.ultSeq.theme) || { color: f.glow, accent: '#fff', particle: f.glow };
    const charId = f.character && f.character.id;

    if(globalTime % 2 === 0) {
      if(charId === 'aurora') {
        // Lightning crackle — short bright lines that fork
        spawnParticle({ type: 'streak', x: f.x + (Math.random()-0.5)*40, y: f.y - 30 - Math.random()*70,
          vx: (Math.random()-0.5)*6, vy: -Math.random()*3, life: 10, maxLife: 10, length: 20+Math.random()*20, color: theme.accent });
        spawnParticle({ type: 'spark', x: f.x + (Math.random()-0.5)*50, y: f.y - 50 - Math.random()*40,
          vx: (Math.random()-0.5)*2, vy: -Math.random()*2, life: 18, maxLife: 18, size: Math.random()*3+2, color: theme.particle, grav: -0.03 });
      } else if(charId === 'crimson') {
        // Fire licks — upward-drifting warm sparks
        spawnParticle({ type: 'spark', x: f.x + (Math.random()-0.5)*44, y: f.y - 10 - Math.random()*60,
          vx: (Math.random()-0.5)*2, vy: -Math.random()*4-2, life: 28, maxLife: 28, size: Math.random()*5+3, color: theme.particle, grav: -0.06 });
        spawnParticle({ type: 'spark', x: f.x + (Math.random()-0.5)*30, y: f.y - 5,
          vx: (Math.random()-0.5)*1, vy: -Math.random()*3-1, life: 20, maxLife: 20, size: Math.random()*4+2, color: theme.accent, grav: -0.04 });
      } else if(charId === 'jade') {
        // Earth chunks — heavier, downward drift
        spawnParticle({ type: 'dust', x: f.x + (Math.random()-0.5)*50, y: GROUND - Math.random()*20,
          vx: (Math.random()-0.5)*3, vy: -Math.random()*4-1, life: 30, maxLife: 30, size: Math.random()*5+4, color: 'rgba(100,80,50,0.7)', grav: 0.25 });
        spawnParticle({ type: 'spark', x: f.x + (Math.random()-0.5)*40, y: f.y - 40 - Math.random()*50,
          vx: (Math.random()-0.5)*2, vy: -Math.random()*2, life: 22, maxLife: 22, size: Math.random()*4+2, color: theme.particle, grav: -0.02 });
      } else if(charId === 'noir') {
        // Shadow wisps — dark purple motes that drift outward
        spawnParticle({ type: 'spark', x: f.x + (Math.random()-0.5)*60, y: f.y - 30 - Math.random()*70,
          vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*3, life: 24, maxLife: 24, size: Math.random()*5+3, color: theme.particle, grav: 0 });
        spawnParticle({ type: 'spark', x: f.x + (Math.random()-0.5)*35, y: f.y - 50,
          vx: (Math.random()-0.5)*2, vy: -Math.random()*2, life: 18, maxLife: 18, size: Math.random()*3+2, color: theme.accent, grav: 0 });
      } else {
        // Fallback generic
        spawnParticle({ type: 'spark', x: f.x + (Math.random()-0.5)*50, y: f.y - 30 - Math.random()*80,
          vx: (Math.random()-0.5)*2, vy: -Math.random()*3, life: 26, maxLife: 26, size: Math.random()*5+3, color: f.glow, grav: -0.05 });
      }
    }
    // Swirling energy ring at feet during windup (uses theme color)
    if(f.stateTime < 16 && globalTime % 2 === 0) {
      const ang = globalTime * 0.3;
      for(let i = 0; i < 3; i++) {
        const a2 = ang + i * Math.PI * 2 / 3;
        spawnParticle({ type: 'spark', x: f.x + Math.cos(a2) * 30, y: GROUND - 2 + Math.sin(a2) * 6,
          vx: -Math.sin(a2)*2, vy: -Math.cos(a2)*0.5, life: 20, maxLife: 20, size: 4, color: theme.color, grav: 0 });
      }
    }
    // Motion streaks at impact frames (theme accent)
    const info = currentUltHit(f.stateTime, f.ultSeq);
    if(info && f.stateTime === info.hit.start) {
      for(let i = 0; i < 4; i++) {
        spawnStreak(f.x + f.facing * 30, f.y - 60 - i * 10, f.facing, theme.color);
      }
      // Finisher hit burst — huge per-character explosion
      if(info.hit.finisher) {
        const fc = f.facing;
        const hx = f.x + fc * 30, hy = f.y - 50;
        if(charId === 'aurora') {
          // Ice shatter — cyan/white radial burst + ring
          spawnHitSpark(hx, hy, '#ffffff', 50, 3.5);
          spawnStar(hx, hy, '#3bf0ff', 5);
          for(let i = 0; i < 20; i++) spawnParticle({ type: 'spark', x: hx, y: hy,
            vx: (Math.random()-0.5)*16, vy: (Math.random()-0.5)*16, life: 35, maxLife: 35,
            size: Math.random()*4+3, color: '#a0f0ff', grav: 0.15 });
        } else if(charId === 'crimson') {
          // Inferno explosion — red/orange fireball
          spawnHitSpark(hx, hy, '#ff4400', 60, 4);
          spawnStar(hx, hy, '#ff8800', 5);
          for(let i = 0; i < 30; i++) spawnParticle({ type: 'spark', x: hx, y: hy,
            vx: (Math.random()-0.5)*14, vy: -Math.random()*10-3, life: 40, maxLife: 40,
            size: Math.random()*5+3, color: i%2===0 ? '#ff6600' : '#ffcc00', grav: -0.04 });
        } else if(charId === 'jade') {
          // Earth spike eruption — green/brown debris flying up from ground
          spawnHitSpark(hx, GROUND - 4, '#44ff88', 40, 3.5);
          for(let i = 0; i < 30; i++) { const a = -Math.PI/2 + (Math.random()-0.5)*Math.PI*0.8;
            spawnParticle({ type: 'dust', x: hx + (Math.random()-0.5)*80, y: GROUND,
              vx: Math.cos(a)*8, vy: Math.sin(a)*10, life: 50, maxLife: 50,
              size: Math.random()*6+4, color: i%3===0 ? 'rgba(68,255,136,0.8)' : 'rgba(100,80,50,0.8)', grav: 0.35 }); }
          // Ground shake ring
          spawnParticle({ type: 'ring', x: hx, y: GROUND, vx: 0, vy: 0, life: 30, maxLife: 30, size: 12, power: 5, color: '#44ff88' });
        } else if(charId === 'noir') {
          // Shadow burst — dark purple implosion then expansion
          spawnHitSpark(hx, hy, '#8a40cc', 50, 3.5);
          spawnStar(hx, hy, '#ffcc00', 4);
          for(let i = 0; i < 25; i++) spawnParticle({ type: 'spark', x: hx, y: hy,
            vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12, life: 30, maxLife: 30,
            size: Math.random()*4+3, color: i%2===0 ? '#cc80ff' : '#ffcc00', grav: 0 });
        }
      }
    }
  }

  // Hurt flash overlay
  const flash = f.hurtFlash > 0 && Math.floor(f.hurtFlash / 2) % 2 === 0;
  const col = flash ? '#ffe0e0' : f.color;

  ctx.save();
  ctx.shadowColor = f.color;
  ctx.shadowBlur = 4;
  renderStoredPose({ ...f.smoothPose, facing: f.facing }, col, 1, vis);
  ctx.restore();
}

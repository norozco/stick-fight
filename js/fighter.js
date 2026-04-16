// ============================================================
// FIGHTER — the Fighter class + CPU AI input
// ============================================================
// ============================================================
class Fighter {
  // Returns this character's ult sequence (or the default Aurora one as fallback)
  get ultSeq() {
    return (this.character && ULT_SEQUENCES[this.character.ultSeq]) || ULT_SEQUENCE;
  }

  constructor(x, color, facing, isP2, glow) {
    this.x = x;
    this.y = GROUND;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.glow = glow;
    this.facing = facing;
    this.targetFacing = facing;
    this.isP2 = isP2;

    this.hp = 100;
    this.maxHp = 100;
    this.ult = 0;
    this.maxUlt = 100;

    this.onGround = true;
    this.jumpsLeft = 2;
    this.coyote = 0;
    this.jumpBuffer = 0;

    this.blocking = false;
    this.blockTime = 0;

    this.state = 'idle';
    this.stateTime = 0;          // integer frames
    this.stateTimeF = 0;         // float (smoothed) frames for animation
    this.attackType = null;
    this.attackHit = false;
    this.ultHitIndex = -1;       // last ult hit index that has been consumed
    this.comboStep = 0;
    this.comboWindow = 0;

    this.dashTime = 0;
    this.dashDir = 0;
    this.dashCooldown = 0;

    this.hitStun = 0;
    this.knockback = 0;
    this.knockUp = 0;
    this.walkPhase = 0;
    this.hurtFlash = 0;
    this.invuln = 0;

    this.combo = 0;
    this.comboTimer = 0;

    this.suspended = 0;
    this.beingUlted = 0;
    this.beingThrown = 0;

    // --- KO SYSTEM ---
    // 'ko' state: fighter lost, falling with momentum from last hit
    // 'knockdown': on the ground after KO or throw, stays down
    this.koVx = 0;               // KO launch velocity
    this.koVy = 0;
    this.koLanded = false;       // true once KO body hits the ground
    this.koLandFrame = 0;        // stateTime at the moment of KO ground contact
    this.lastHitDir = 1;         // direction of last hit received (+1 right, -1 left)
    this.lastHitUp = 0;          // vertical component of last hit

    // --- THROW SYSTEM (4-phase) ---
    // Phase tracking: 0=none, 1=grab, 2=attach, 3=motion, 4=release
    this.throwPhase = 0;
    this.throwTarget = null;     // reference to the defender being thrown
    this.throwBy = null;         // reference to the attacker throwing this fighter
    this.throwTimer = 0;         // frames within current throw phase
    this.grabOffset = { x: 0, y: 0 }; // defender's position relative to attacker

    // Smoothed animation pose (lerped each frame)
    this.smoothPose = null;

    // ---- Video-game-style secondary physics ----
    // These layer on top of the smoothed pose for reactive feel.
    this.impactVx = 0;        // head/limbs get pushed sideways on hits, decays
    this.impactVy = 0;        // and vertically
    this.squashY = 0;         // vertical squash on landings (positive = compressed)
    this.squashVel = 0;       // squash spring velocity
    this.limbDragX = 0;       // limbs trail behind velocity changes
    this.lastVx = 0;          // to detect velocity changes for drag
  }

  reset(x, facing) {
    this.x = x; this.y = GROUND;
    this.vx = 0; this.vy = 0;
    this.facing = this.targetFacing = facing;
    this.hp = 100;
    this.onGround = true;
    this.jumpsLeft = 2;
    this.state = 'idle'; this.stateTime = 0; this.stateTimeF = 0;
    this.attackType = null; this.attackHit = false; this.ultHitIndex = -1;
    this.comboStep = 0; this.comboWindow = 0;
    this.dashTime = 0; this.dashCooldown = 0;
    this.hitStun = 0; this.knockback = 0; this.knockUp = 0;
    this.blocking = false; this.blockTime = 0;
    this.combo = 0; this.comboTimer = 0;
    this.invuln = 0;
    this.suspended = 0; this.beingUlted = 0; this.beingThrown = 0;
    this.koVx = 0; this.koVy = 0; this.koLanded = false;
    this.lastHitDir = 1; this.lastHitUp = 0;
    this.throwPhase = 0; this.throwTarget = null; this.throwBy = null; this.throwTimer = 0;
    this.impactVx = 0; this.impactVy = 0;
    this.squashY = 0; this.squashVel = 0;
    this.limbDragX = 0; this.lastVx = 0;
    this.smoothPose = null;
    this.walkPhase = 0;
    // Ring-out state from any prior round MUST be cleared
    this.ringoutFinalized = false;
    this.ringoutSpin = 0;
    this.ringoutAnchorX = 0;
    this.ringoutAnchorY = 0;
    this.ringoutLaunchDir = 0;
  }

  addUlt(amount) { this.ult = Math.min(this.maxUlt, this.ult + amount); }

  // Non-ultimate attack data
  attackData() {
    if(this.attackType === 'light') {
      // ARCADE: short startup (2-3 frames), generous active, some recovery for commitment
      if(this.comboStep === 0) return { start: 2, active: 8, total: 16, dmg: 5, kb: 5, up: 0, reach: 60, boxH: 30, boxY: -75, ult: 6, canCombo: true };
      if(this.comboStep === 1) return { start: 2, active: 9, total: 18, dmg: 6, kb: 6, up: 0, reach: 64, boxH: 30, boxY: -75, ult: 7, canCombo: true };
      return { start: 3, active: 10, total: 24, dmg: 8, kb: 9, up: -3, reach: 70, boxH: 36, boxY: -70, ult: 8, canCombo: false };
    }
    if(this.attackType === 'heavy') {
      // Slower startup (commitment) but bigger reward
      return { start: 8, active: 12, total: 34, dmg: 14, kb: 16, up: -6, reach: 82, boxH: 40, boxY: -70, ult: 12, canCombo: false };
    }
    if(this.attackType === 'throw') {
      // Ken-style shoulder throw — tight 35-frame sequence.
      // 0-3 startup/grab, 4-24 arc (victim flips overhead), 24-35 recovery.
      // Reach 95 so it reliably connects past the 44px push-apart distance.
      // Active window 10 frames (was 8) for more forgiving grab timing.
      return { start: 3, active: 10, total: 35, dmg: 22, kb: 18, up: -4, reach: 95, boxH: 110, boxY: -110, ult: 14, canCombo: false, beatsBlock: true, isGrab: true };
    }
    return null;
  }

  startAttack(type) {
    if(this.hitStun > 0) return false;
    // Light combo chaining (existing 3-hit combo)
    if(type === 'light' && this.state === 'attack' && this.comboWindow > 0 && this.attackType === 'light' && this.comboStep < 2) {
      this.comboStep++;
      this.state = 'attack';
      this.stateTime = 0;
      this.stateTimeF = 0;
      this.attackType = 'light';
      this.attackHit = false;
      this.comboWindow = 0;
      Audio.whoosh();
      return true;
    }
    // ARCADE CANCEL: during attack recovery (after active frames end),
    // allow canceling into a DIFFERENT move type. This keeps gameplay fluid.
    // Throws are EXCLUDED — they use the 4-phase system initiated from idle only.
    if(this.state === 'attack' && this.attackHit && type !== 'throw' && type !== 'ult') {
      const data = this.attackData();
      if(data && this.stateTime > data.start + data.active && type !== this.attackType) {
        this.state = 'attack';
        this.stateTime = 0;
        this.stateTimeF = 0;
        this.attackType = type;
        this.attackHit = false;
        this.comboStep = 0;
        this.comboWindow = 0;
        this.juggleWindow = 0;
        Audio.whoosh();
        return true;
      }
    }
    // Air combo cancel: if last hit launched the opponent, allow canceling
    // recovery into another attack (juggle window)
    if(this.state === 'attack' && this.juggleWindow > 0 && (type === 'light' || type === 'heavy')) {
      this.state = 'attack';
      this.stateTime = 0;
      this.stateTimeF = 0;
      this.attackType = type;
      this.attackHit = false;
      this.comboStep = 0;
      this.comboWindow = 0;
      this.juggleWindow = 0;
      Audio.whoosh();
      return true;
    }
    if(this.state !== 'idle') return false;
    this.state = 'attack';
    this.stateTime = 0;
    this.stateTimeF = 0;
    this.attackType = type;
    this.attackHit = false;
    this.comboStep = 0;
    this.comboWindow = 0;
    if(type === 'ult') {
      this.ult = 0;
      this.invuln = this.ultSeq.total;   // fully invincible during ult
      this.ultHitIndex = -1;
      flashTime = 30;
      flashAlpha = 0.7;
      // Use character glow color for the screen flash
      const rgb = hexToRgb(this.glow);
      flashColor = rgb || (this.isP2 ? '255,56,96' : '59,240,255');
      slowMo = 50;
      ultTargetDarken = 0.6;
      cameraTargetZoom = 1.3;
      Audio.ultStart();
      // Per-character ult name announcement
      const ultName = this.character && this.character.ultName;
      if(ultName) {
        announce(ultName + '!', 90);
        Audio.say(ultName.toLowerCase() + '!', { interrupt: true, character: this.character && this.character.id });
      }
    } else {
      Audio.whoosh();
    }
    return true;
  }

  startDash(dir) {
    if(this.dashCooldown > 0 || this.state === 'attack' || this.hitStun > 0) return;
    this.state = 'dash';
    this.stateTime = 0;
    this.stateTimeF = 0;
    this.dashDir = dir;
    this.dashTime = 12;
    this.dashCooldown = 35;
    this.invuln = 8;
  }

  attackBox() {
    if(this.state !== 'attack') return null;
    if(this.attackType === 'ult') {
      const info = currentUltHit(this.stateTime, this.ultSeq);
      if(!info) return null;
      const h = info.hit;
      const reach = h.reach;
      const boxH = h.boxH;
      return {
        x: this.x + this.facing * 10 - (this.facing < 0 ? reach : 0),
        y: this.y + h.boxY,
        w: reach,
        h: boxH,
        dmg: h.dmg,
        kb: h.kb,
        up: h.up,
        type: 'ult',
        ultGain: 0,
        ultHit: h,
        ultIndex: info.index,
      };
    }
    const data = this.attackData();
    if(!data) return null;
    const st = this.stateTime;
    if(st < data.start || st > data.start + data.active) return null;
    // When airborne attacking a grounded opponent, extend the hitbox downward
    // so jump attacks can actually connect. Without this, the hitbox sits entirely
    // above the opponent at max jump height (boxY=-70, boxH=26 → box at y-70 to
    // y-44, but opponent's hurtbox starts at y-100 from GROUND=470 → 370).
    let boxY = data.boxY;
    let boxH = data.boxH;
    if(!this.onGround) {
      // Extend hitbox down to reach grounded opponents
      const airHeight = GROUND - this.y;
      if(airHeight > 20) {
        boxH = Math.max(boxH, airHeight + 30);
      }
    }
    return {
      x: this.x + this.facing * 10 - (this.facing < 0 ? data.reach : 0),
      y: this.y + boxY,
      w: data.reach,
      h: boxH,
      dmg: data.dmg,
      kb: data.kb,
      up: data.up,
      type: this.attackType,
      ultGain: data.ult,
    };
  }

  hurtBox() {
    // Slightly shrink vertical if airborne (juggled)
    return { x: this.x - 22, y: this.y - 100, w: 44, h: 100 };
  }

  takeHit(box, fromFacing, attacker) {
    if(this.invuln > 0 && box.type !== 'ult') return 'dodge';

    // Apply attacker's character damage multiplier
    const dmgMult = (attacker && attacker.dmgMult) || 1;
    // Combo damage scaling — long combos hit for less so single touches can't 100%
    const comboCount = (attacker && attacker.combo) || 0;
    const scaling = comboCount < 3 ? 1.0
                  : comboCount < 5 ? 0.80
                  : comboCount < 7 ? 0.60
                  : 0.40;
    // Ult and finishers ignore scaling
    const finalScale = (box.type === 'ult') ? 1.0 : scaling;
    box = { ...box, dmg: box.dmg * dmgMult * finalScale };

    // Counter-hit detection — receiver was caught during startup of their own attack
    if(box.type !== 'ult' && box.type !== 'throw' &&
       this.state === 'attack' && this.attackType && this.attackType !== 'ult') {
      const d = this.attackData();
      if(d && this.stateTime < d.start) {
        box = { ...box, dmg: box.dmg * 1.5, kb: box.kb * 1.2 };
        spawnCombo(this.x, this.y - 150, 'COUNTER!', '#ffcc00');
        if(attacker) {
          attacker.combo = Math.max(attacker.combo, 1);
          attacker.addUlt(8);
        }
        Audio.parry();
        flashTime = 8;
        flashAlpha = 0.4;
        flashColor = '255,200,40';
      }
    }

    // Ult hits always connect
    if(box.type === 'ult') {
      const ulHit = box.ultHit;
      this.hp -= box.dmg;
      this.hurtFlash = 8;
      this.state = 'hurt';
      this.stateTime = 0;
      this.stateTimeF = 0;
      this.attackType = null;
      this.combo = 0;
      this.beingUlted = 60;  // keep locked between hits

      // Pull opponent toward attacker (firm snap to ensure full combo connects)
      if(ulHit.pull) {
        const desired = attacker.x + attacker.facing * 54;
        this.x = lerp(this.x, desired, 0.85);
      }
      if(ulHit.launch) {
        this.onGround = false;
        this.vy = -8;
        this.knockUp = box.up || -12;
      }
      if(ulHit.aerial) {
        this.onGround = false;
        this.y = attacker.y;
      }
      if(ulHit.finisher) {
        this.knockback = fromFacing * box.kb;
        this.knockUp = box.up || 8;
        this.hitStun = 60;
        Audio.ultFinisher();
        spawnDamageNumber(this.x, this.y - 115, box.dmg, '#ff3860', true);
        const sparkX = this.x + fromFacing * -15;
        const sparkY = this.y - 60;
        spawnHitSpark(sparkX, sparkY, '#ffcc00', 30, 2.8);
        spawnStar(sparkX, sparkY, '#ffee00', 3);
        shake(18, 24);
        hitstop = 18;
        flashTime = 18;
        flashAlpha = 0.8;
        flashColor = '255,230,80';
      } else {
        this.hitStun = 22;
        const sparkX = this.x + fromFacing * -10;
        const sparkY = this.y - 70;
        spawnHitSpark(sparkX, sparkY, attacker.glow, 10 + (ulHit.launch ? 14 : 0), ulHit.launch ? 1.8 : 1.2);
        if(ulHit.launch) spawnStar(sparkX, sparkY, attacker.glow, 2);
        spawnDamageNumber(this.x, this.y - 110, box.dmg, attacker.glow);
        Audio.ultHit();
        shake(6, 8);
        hitstop = ulHit.launch ? 10 : 5;
      }
      if(this.hp < 0) this.hp = 0;
      return 'hit';
    }

    // Throws beat blocks and parries entirely
    const isThrow = box.type === 'throw';

    // Throws now bypass takeHit entirely — they're initiated directly in the
    // update() input handler as a 4-phase grab system. This old path is kept
    // as a safety fallback but shouldn't fire in normal gameplay.
    if(isThrow) {
      return 'hit'; // no-op, throw is handled by the 4-phase system
    }

    if(!isThrow && this.blocking && this.blockTime < 6 && this.facing === -fromFacing) {
      attacker.hitStun = 24;
      attacker.state = 'stagger';
      attacker.stateTime = 0;
      attacker.stateTimeF = 0;
      attacker.attackType = null;
      attacker.knockback = -fromFacing * 6;
      spawnHitSpark(this.x + fromFacing * 20, this.y - 70, '#3bf0ff', 22, 1.5);
      flashTime = 10;
      flashAlpha = 0.35;
      flashColor = '59,240,255';
      shake(10, 10);
      hitstop = 10;
      Audio.parry();
      this.addUlt(15);
      return 'parry';
    }

    if(!isThrow && this.blocking && this.facing === -fromFacing) {
      this.hp -= box.dmg * 0.15;
      this.knockback = fromFacing * 3;
      this.hurtFlash = 4;
      spawnHitSpark(this.x + fromFacing * 18, this.y - 65, '#88ccff', 8, 0.8);
      Audio.block();
      this.addUlt(4);
      hitstop = 3;
      return 'block';
    }

    this.hp -= box.dmg;
    this.hitStun = box.type === 'heavy' ? 28 : 14;
    this.knockback = fromFacing * box.kb;
    this.knockUp = box.up || 0;
    if(box.up && box.up < 0) this.onGround = false;
    this.hurtFlash = 14;
    this.state = 'hurt';
    this.stateTime = 0;
    this.stateTimeF = 0;
    this.attackType = null;
    this.addUlt(box.dmg * 0.8);
    this.combo = 0;

    // Track last hit direction for KO physics
    this.lastHitDir = fromFacing;
    this.lastHitUp = box.up || 0;

    // Physics impulse — head whips back, arms snap on the hit vector
    const impulseMag = box.type === 'heavy' ? 10 : 6;
    this.impactVx = fromFacing * impulseMag;
    this.impactVy = (box.up && box.up < 0) ? -4 : -1.5;

    spawnDamageNumber(this.x, this.y - 110, box.dmg, box.type === 'heavy' ? '#ff3860' : '#fff');

    if(this.hp < 0) this.hp = 0;

    // --- KO TRIGGER: transition to 'ko' state with directional fall ---
    if(this.hp <= 0) {
      this.state = 'ko';
      this.stateTime = 0;
      this.koLanded = false;
      // Launch velocity based on hit direction
      this.koVx = fromFacing * (box.kb || 8) * 0.6;
      if(box.up && box.up < 0) {
        // Upward hit → lift then fall
        this.koVy = box.up * 0.8;
        this.onGround = false;
      } else if(box.type === 'heavy' || box.type === 'ult') {
        // Heavy/ult → strong backward launch
        this.koVx = fromFacing * (box.kb || 14) * 0.7;
        this.koVy = -6;
        this.onGround = false;
      } else {
        // Light hit KO → lose balance backward
        this.koVy = -3;
        this.onGround = false;
      }
      this.vx = 0; this.vy = 0;
      this.attackType = null;
      this.blocking = false;
    }

    const power = box.type === 'heavy' ? 1.5 : 1;
    const sparkX = this.x + fromFacing * -15;
    const sparkY = this.y - 70;
    spawnHitSpark(sparkX, sparkY, '#ffee55', 14 * power, power);
    hitstop = box.type === 'heavy' ? 8 : 5;
    shake(5 * power, 8 * power);
    if(box.type === 'heavy') Audio.heavy(); else Audio.hit();
    return 'hit';
  }

  update(input, opponent, dt) {
    const prevOnGround = this.onGround;
    if(this.hitStun > 0) this.hitStun--;
    if(this.hurtFlash > 0) this.hurtFlash--;
    if(this.dashCooldown > 0) this.dashCooldown--;
    if(this.invuln > 0) this.invuln--;
    if(this.comboWindow > 0) this.comboWindow--;
    if(this.comboTimer > 0) { this.comboTimer--; if(this.comboTimer === 0) this.combo = 0; }
    if(this.jumpBuffer > 0) this.jumpBuffer--;
    if(this.coyote > 0) this.coyote--;
    if(this.beingUlted > 0) this.beingUlted--;
    if(this.beingThrown > 0) this.beingThrown--;
    if(this.juggleWindow > 0) this.juggleWindow--;

    // --- KO STATE UPDATE: physics-driven fall with momentum ---
    if(this.state === 'ko') {
      this.stateTime++;
      // Apply KO velocity (directional momentum from the killing blow)
      this.x += this.koVx;
      this.koVx *= 0.94;          // air drag
      if(!this.koLanded) {
        // Airborne: apply gravity, let them fall
        this.koVy += 0.85;        // heavier gravity than normal jump — body has weight
        this.y += this.koVy;
        // Ground contact → land in knockdown
        if(this.y >= GROUND) {
          this.y = GROUND;
          this.koLanded = true;
          this.koLandFrame = this.stateTime;  // record for pose settle animation
          this.koVy = 0;
          this.koVx *= 0.3;       // friction on landing
          // Impact effects
          shake(8, 12);
          spawnDust(this.x, GROUND + 2);
          spawnDust(this.x - 15, GROUND + 2);
          spawnDust(this.x + 15, GROUND + 2);
          try { Audio.land(); } catch(e) {}
        }
      } else {
        // On ground: slide to a stop
        this.y = GROUND;
        this.koVx *= 0.85;
        if(Math.abs(this.koVx) < 0.3) this.koVx = 0;
      }
      // Clamp to stage
      if(this.x < 40) this.x = 40;
      if(this.x > W - 40) this.x = W - 40;
      return; // KO overrides everything
    }

    // --- KNOCKDOWN STATE: on the ground, stays down ---
    if(this.state === 'knockdown') {
      this.stateTime++;
      this.y = GROUND;
      this.onGround = true;
      return; // stays down until round ends
    }

    // --- GRABBED STATE: locked by attacker's throw, no input ---
    if(this.state === 'grabbed' && this.throwBy) {
      this.stateTime++;
      // Position is controlled by the attacker's throw update
      // Just stay put — no physics, no input
      this.vx = 0; this.vy = 0;
      this.knockback = 0;
      return;
    }

    // --- THROWN STATE: airborne after throw release ---
    if(this.state === 'thrown') {
      this.stateTime++;
      this.vy += 0.85;
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.98;
      if(this.y >= GROUND) {
        this.y = GROUND;
        this.state = 'knockdown';
        this.stateTime = 0;
        this.onGround = true;
        this.hitStun = 30;
        shake(6, 10);
        spawnDust(this.x, GROUND + 2);
        try { Audio.land(); } catch(e) {}
      }
      if(this.x < 40) this.x = 40;
      if(this.x > W - 40) this.x = W - 40;
      return;
    }

    // --- 4-PHASE THROW UPDATE (attacker side) ---
    if(this.state === 'attack' && this.attackType === 'throw' && this.throwPhase > 0 && this.throwTarget) {
      this.throwTimer++;
      const def = this.throwTarget;
      const fc = this.facing;

      if(this.throwPhase === 1) {
        // PHASE 1: GRAB (frames 0-8) — lunge, hands make contact
        // Defender snapped CLOSE so hands visibly land on their body
        const p = Math.min(this.throwTimer / 8, 1);
        def.x = this.x + fc * lerp(44, 32, easeOutCubic(p));
        def.y = GROUND;
        def.facing = -fc;
        if(this.throwTimer >= 8) {
          this.throwPhase = 2;
          this.throwTimer = 0;
          hitstop = 4;  // micro-freeze: "I've got you" moment
        }
      } else if(this.throwPhase === 2) {
        // PHASE 2: SECURED HOLD (frames 0-10) — attacker visibly controls defender
        // Defender is pulled close, lifted slightly, held for a readable beat
        const p = Math.min(this.throwTimer / 10, 1);
        def.x = this.x + fc * lerp(32, 26, easeOutCubic(p));
        def.y = lerp(GROUND, GROUND - 14, easeOutCubic(p));
        def.facing = -fc;
        def.onGround = false;
        if(this.throwTimer >= 10) {
          this.throwPhase = 3;
          this.throwTimer = 0;
        }
      } else if(this.throwPhase === 3) {
        // PHASE 3: THROW MOTION (frames 0-14) — smooth arc over the attacker
        // Defender follows a controlled semicircular path, NOT free rotation
        const p = this.throwTimer / 14;
        const ep = easeInOutCubic ? easeInOutCubic(p) : p;
        const angle = ep * Math.PI;  // 0 (front) → π (behind)
        const radius = 55;
        def.x = this.x + Math.cos(angle) * radius * fc;
        def.y = GROUND - Math.sin(angle) * 80 - 10;
        def.facing = -fc;
        def.onGround = false;
        if(this.throwTimer >= 14) {
          this.throwPhase = 4;
          this.throwTimer = 0;
        }
      } else if(this.throwPhase === 4) {
        // PHASE 4: RELEASE — detach, apply force, defender becomes 'thrown'
        const dmgMult = this.dmgMult || 1;
        const dmg = 22 * dmgMult;
        def.hp = Math.max(0, def.hp - dmg);
        def.state = 'thrown';
        def.stateTime = 0;
        def.throwBy = null;
        def.hitStun = 0;
        def.vx = fc * -14;       // launched in throw direction
        def.vy = -8;
        def.onGround = false;
        def.hurtFlash = 16;
        // Effects
        spawnDamageNumber(def.x, def.y - 80, dmg, '#ff6600', true);
        spawnHitSpark(def.x, def.y - 40, '#ffaa44', 22, 1.8);
        for(let i = 0; i < 12; i++) spawnDust(def.x + (Math.random()-0.5)*50, GROUND + 2, -fc);
        shake(10, 14);
        hitstop = 8;
        Audio.heavy();
        this.addUlt(14);
        // Attacker recovers
        this.throwPhase = 0;
        this.throwTarget = null;
        this.state = 'idle';
        this.stateTime = 0;
        this.attackType = null;
        // Check KO
        if(def.hp <= 0) {
          def.state = 'ko';
          def.koVx = fc * -12;
          def.koVy = -6;
          def.koLanded = false;
        }
      }
      this.stateTime++;
      return; // throw overrides normal update for the attacker
    }

    // Safety: recover from hurt/stagger if hitStun expired (even if main check below
    // was skipped by an early return or slowMo gating on a previous frame)
    if((this.state === 'hurt' || this.state === 'stagger') && this.hitStun <= 0 &&
       this.beingUlted <= 0 && this.beingThrown <= 0) {
      this.state = 'idle'; this.stateTime = 0; this.stateTimeF = 0;
    }

    // ---- Secondary physics integration ----
    // Impact impulses decay toward zero
    this.impactVx *= 0.82;
    this.impactVy *= 0.82;
    if(Math.abs(this.impactVx) < 0.05) this.impactVx = 0;
    if(Math.abs(this.impactVy) < 0.05) this.impactVy = 0;

    // Landing squash: spring back up (damped harmonic)
    if(this.squashY !== 0) {
      const springK = 0.35;
      const damping = 0.65;
      this.squashVel += -this.squashY * springK;
      this.squashVel *= damping;
      this.squashY += this.squashVel;
      if(Math.abs(this.squashY) < 0.1 && Math.abs(this.squashVel) < 0.1) {
        this.squashY = 0; this.squashVel = 0;
      }
    }

    // Limb drag — arms trail when horizontal velocity changes
    const vxDelta = this.vx - this.lastVx;
    this.limbDragX += -vxDelta * 0.8;       // kick back on acceleration
    this.limbDragX *= 0.78;
    if(Math.abs(this.limbDragX) < 0.08) this.limbDragX = 0;
    this.lastVx = this.vx;

    this.stateTime++;

    // If being ulted by opponent — freeze own physics and let attacker control position
    if(this.beingUlted > 0 && opponent &&
       opponent.state === 'attack' && opponent.attackType === 'ult' &&
       opponent.stateTime < opponent.ultSeq.total) {
      lockVictimToUlt(this, opponent);
      this.vx = 0; this.vy = 0;
      this.knockback = 0; this.knockUp = 0;
      if(this.state !== 'hurt') { this.state = 'hurt'; this.stateTimeF = 0; }
      this.hitStun = Math.max(this.hitStun, 4);
      return;
    }

    // Old throw lock system removed — throws now use the 4-phase system above.
    // beingThrown is no longer the primary mechanism; 'grabbed'/'thrown' states handle it.

    // Face opponent when idle/dash
    if(opponent && (this.state === 'idle' || this.state === 'dash')) {
      this.targetFacing = opponent.x > this.x ? 1 : -1;
    }
    if(this.facing !== this.targetFacing && this.state !== 'attack') {
      this.facing = this.targetFacing;
    }

    // Inputs
    let wantLeft = input.left && this.state !== 'attack' && this.hitStun === 0;
    let wantRight = input.right && this.state !== 'attack' && this.hitStun === 0;
    this.blocking = input.block && this.onGround && this.state !== 'attack' && this.hitStun === 0 && this.state !== 'dash';
    if(this.blocking) this.blockTime++; else this.blockTime = 0;

    if(input.jumpPressed) this.jumpBuffer = 8;
    // ARCADE: allow jump cancel from attack recovery (after hit landed)
    if(this.jumpBuffer > 0 && this.state === 'attack' && this.attackHit) {
      const data = this.attackData();
      if(data && this.stateTime > data.start + data.active) {
        this.state = 'idle'; this.attackType = null; this.stateTime = 0;
      }
    }
    if(this.jumpBuffer > 0) {
      if(this.onGround || this.coyote > 0) {
        this.vy = -15;
        this.onGround = false;
        this.jumpsLeft = 1;
        this.jumpBuffer = 0;
        this.coyote = 0;
        spawnDust(this.x, GROUND + 4);
        Audio.jump();
      } else if(this.jumpsLeft > 0) {
        this.vy = -12;
        this.jumpsLeft--;
        this.jumpBuffer = 0;
        spawnDust(this.x, this.y + 2);
        Audio.jump();
      }
    }

    if(input.lightPressed) this.startAttack('light');
    if(input.heavyPressed) this.startAttack('heavy');
    // Throw: works from idle OR during attack recovery (after hit landed).
    // This makes throw feel responsive — you don't need to wait for full recovery.
    const canThrow = (this.state === 'idle') ||
                     (this.state === 'attack' && this.attackHit && this.attackType !== 'throw' && this.attackType !== 'ult');
    if(input.throwPressed && canThrow && this.hitStun === 0 && opponent) {
      // --- 4-PHASE THROW: initiate grab attempt ---
      const dist = Math.abs(this.x - opponent.x);
      if(dist < 95 && opponent.state !== 'ko' && opponent.state !== 'knockdown' &&
         opponent.state !== 'grabbed' && opponent.state !== 'thrown') {
        // PHASE 1: GRAB — lock both fighters
        this.state = 'attack';
        this.attackType = 'throw';
        this.stateTime = 0;
        this.throwPhase = 1;
        this.throwTimer = 0;
        this.throwTarget = opponent;
        this.attackHit = true;     // treat as connected immediately

        // Lock defender
        opponent.state = 'grabbed';
        opponent.stateTime = 0;
        opponent.throwBy = this;
        opponent.vx = 0; opponent.vy = 0;
        opponent.knockback = 0;
        opponent.hitStun = 999;    // can't act while grabbed
        opponent.blocking = false;

        // Snap defender to grab position (in front of attacker)
        opponent.x = this.x + this.facing * 44;
        opponent.y = GROUND;
        opponent.facing = -this.facing;

        // Hitstop on grab contact
        hitstop = 6;
        Audio.whoosh();
      }
    }
    if(input.ultPressed && this.ult >= this.maxUlt && this.state === 'idle') this.startAttack('ult');
    if(input.dashPressed) {
      // Forward/back dash based on held direction; default to forward
      const dashDir = input.left ? -1 : input.right ? 1 : this.facing;
      this.startDash(dashDir);
    }

    // Physics — horizontal
    let targetVx = 0;
    if(this.state === 'dash') {
      this.dashTime--;
      targetVx = this.dashDir * 16;  // faster dash for arcade feel
      if(this.stateTime % 2 === 0) spawnAfterimage(this, 0.55);
      if(this.dashTime <= 0) { this.state = 'idle'; this.stateTime = 0; this.stateTimeF = 0; }
    } else if(this.blocking) {
      targetVx = 0;
    } else if(this.state === 'attack' || this.hitStun > 0) {
      targetVx = 0;
      // Forward drift on certain ult phases
      if(this.state === 'attack' && this.attackType === 'ult') {
        const t = this.stateTime;
        if(t >= 14 && t < 26) targetVx = this.facing * 10;    // dash-in
        else if(t >= 28 && t < 52) targetVx = this.facing * 2;  // slight drift during flurry
        else if(t >= 56 && t < 66) targetVx = this.facing * 4;  // kick push
        else if(t >= 118 && t < 126) targetVx = this.facing * 3; // slam drift
        // spawn afterimages
        if(t < 26 && t % 2 === 0) spawnAfterimage(this, 0.6);
        if(t >= 56 && t < 64 && t % 2 === 0) spawnAfterimage(this, 0.4);
      }
    } else {
      const spd = 6.5 * (this.speedMult || 1);  // faster walk for arcade feel
      if(wantLeft) targetVx = -spd;
      if(wantRight) targetVx = spd;
    }

    // ARCADE PHYSICS: high accel, low inertia, stop on a dime.
    // Ground: 0.92 accel = near-instant response. Air: 0.55 = some drift.
    const accel = this.onGround ? 0.92 : 0.55;
    this.vx += (targetVx - this.vx) * accel;
    // Quick stop when no input (arcade feel — no ice skating)
    if(targetVx === 0 && this.onGround) this.vx *= 0.7;
    this.x += this.vx + this.knockback;
    this.knockback *= 0.78;
    if(Math.abs(this.knockback) < 0.2) this.knockback = 0;

    if(Math.abs(targetVx) > 1 && this.onGround) this.walkPhase += 0.28;
    else this.walkPhase *= 0.92;
    if(this.onGround && Math.abs(this.vx) > 4 && globalTime % 8 === 0) {
      spawnDust(this.x - Math.sign(this.vx) * 10, GROUND + 2, -Math.sign(this.vx) * 0.5);
    }

    // Ultimate aerial positioning — dynamically derived from the character's
    // ult sequence (each character has different launch/aerial/finisher timing).
    if(this.state === 'attack' && this.attackType === 'ult') {
      const seq = this.ultSeq;
      const t = this.stateTime;
      const launchHit   = seq.hits.find(h => h.launch);
      const finisherHit = seq.hits.find(h => h.finisher);
      const aerialStart = launchHit ? launchHit.end + 2 : seq.total;
      const slamStart   = finisherHit ? finisherHit.start - 8 : seq.total;
      const slamEnd     = finisherHit ? finisherHit.end + 2 : seq.total;

      if(launchHit && t >= aerialStart && t < slamStart) {
        // In the air — sine arc
        const phase = (t - aerialStart) / Math.max(1, slamStart - aerialStart);
        this.onGround = false;
        this.y = GROUND - 40 - Math.sin(Math.min(1, phase) * Math.PI) * 60;
        this.vy = 0;
      } else if(finisherHit && t >= slamStart && t < slamEnd) {
        // Slam down
        const phase = (t - slamStart) / Math.max(1, slamEnd - slamStart);
        this.onGround = false;
        this.y = GROUND - 100 + phase * phase * 100;
        this.vy = 0;
        // Dust on contact
        if(Math.abs(this.y - GROUND) < 8 && !this._ultDustSpawned) {
          this._ultDustSpawned = true;
          spawnDust(this.x, GROUND + 4);
          spawnDust(this.x - 30, GROUND + 4);
          spawnDust(this.x + 30, GROUND + 4);
        }
      } else if(t >= slamEnd) {
        this.y = GROUND;
        this.onGround = true;
        this._ultDustSpawned = false;
      }
    } else if(!this.onGround) {
      // ARCADE JUMP: floaty on the way up (low gravity), fast fall after peak
      // (high gravity). Gives hang time at the apex for jump attacks.
      const grav = this.vy < 0 ? 0.52 : 0.95;  // rising vs falling
      this.vy += grav;
      if(this.knockUp) { this.vy += this.knockUp; this.knockUp = 0; }
      this.y += this.vy;
      if(this.y >= GROUND) {
        this.y = GROUND;
        this.vy = 0;
        this.onGround = true;
        this.jumpsLeft = 2;
        this.coyote = 0;
        spawnDust(this.x, GROUND + 2);
        if(!prevOnGround) {
          Audio.land();
          // Trigger a spring-squash proportional to fall speed
          const fallSpeed = Math.max(0, this.vy || 0);
          this.squashY = Math.min(14, fallSpeed * 0.7 + 4);
          this.squashVel = 0;
        }
      }
    } else {
      this.coyote = 6;
    }

    // Attack lifecycle
    if(this.state === 'attack') {
      if(this.attackType === 'ult') {
        if(this.stateTime >= this.ultSeq.total) {
          this.state = 'idle';
          this.attackType = null;
          this.stateTime = 0;
          this.stateTimeF = 0;
          ultTargetDarken = 0;
          cameraTargetZoom = 1;
        }
      } else {
        const data = this.attackData();
        if(data && this.stateTime >= data.total) {
          this.state = 'idle';
          this.attackType = null;
          this.stateTime = 0;
          this.stateTimeF = 0;
        }
        if(data && this.stateTime === data.start + data.active + 1 && data.canCombo) {
          this.comboWindow = 14;
        }
      }
    }
    // Hurt/stagger recovery — also checked in the timer section at top of update()
    // as a safety net in case slowMo/hitstop prevented it from running here.
    if(this.state === 'hurt' && this.hitStun <= 0) { this.state = 'idle'; this.stateTime = 0; this.stateTimeF = 0; }
    if(this.state === 'stagger' && this.hitStun <= 0) { this.state = 'idle'; this.stateTime = 0; this.stateTimeF = 0; }
    if(this.state === 'wallsplat' && this.hitStun <= 0) { this.state = 'hurt'; this.hitStun = 8; this.vy = 4; this.onGround = false; }

    // Wall splat — heavy knockback into a wall sticks the fighter briefly
    const WALL_SPLAT_KB = 9;
    if(this.x < 40) {
      if(Math.abs(this.knockback) >= WALL_SPLAT_KB && this.state === 'hurt') {
        this.state = 'wallsplat';
        this.stateTime = 0;
        this.stateTimeF = 0;
        this.hitStun = 24;
        this.vy = 0;
        this.vx = 0;
        spawnHitSpark(this.x, this.y - 60, '#ffaa44', 18, 1.6);
        for(let i = 0; i < 12; i++) spawnDust(this.x + Math.random() * 30, this.y - 30 + Math.random() * 60, 1);
        shake(8, 12);
        Audio.heavy();
      }
      this.x = 40; this.knockback = 0;
    }
    if(this.x > W - 40) {
      if(Math.abs(this.knockback) >= WALL_SPLAT_KB && this.state === 'hurt') {
        this.state = 'wallsplat';
        this.stateTime = 0;
        this.stateTimeF = 0;
        this.hitStun = 24;
        this.vy = 0;
        this.vx = 0;
        spawnHitSpark(this.x, this.y - 60, '#ffaa44', 18, 1.6);
        for(let i = 0; i < 12; i++) spawnDust(this.x - Math.random() * 30, this.y - 30 + Math.random() * 60, -1);
        shake(8, 12);
        Audio.heavy();
      }
      this.x = W - 40; this.knockback = 0;
    }
    // After wall splat ends, slide to ground
    if(this.state === 'wallsplat' && this.hitStun === 0) {
      this.state = 'hurt';
      this.hitStun = 8;
      this.vy = 4;
      this.onGround = false;
    }

    // Pushback
    // Push-apart: only when BOTH grounded, NEITHER dashing/attacking/thrown/ulting.
    // Previously interfered with jumps, dashes, throws, and crossups.
    if(opponent) {
      const dx = this.x - opponent.x;
      const minDist = 44;
      const thisActive = this.state === 'attack' || this.state === 'dash' ||
                         this.beingThrown > 0 || this.beingUlted > 0 ||
                         (this.state === 'attack' && this.attackType === 'ult');
      const oppActive  = opponent.state === 'attack' || opponent.state === 'dash' ||
                         opponent.beingThrown > 0 || opponent.beingUlted > 0;
      if(Math.abs(dx) < minDist && this.onGround && opponent.onGround &&
         !thisActive && !oppActive && this.state !== 'hurt' && opponent.state !== 'hurt') {
        const push = (minDist - Math.abs(dx)) * 0.4;
        const s = Math.sign(dx) || (this.isP2 ? 1 : -1);
        this.x += s * push;
        opponent.x -= s * push;
      }
    }

    // Attack hit detection
    if(this.state === 'attack') {
      const isUlt = this.attackType === 'ult';
      if(isUlt) {
        const info = currentUltHit(this.stateTime, this.ultSeq);
        if(info && info.index !== this.ultHitIndex) {
          // New hit window
          const box = this.attackBox();
          if(box && opponent) {
            const hb = opponent.hurtBox();
            if(box.x < hb.x + hb.w && box.x + box.w > hb.x &&
               box.y < hb.y + hb.h && box.y + box.h > hb.y) {
              opponent.takeHit(box, this.facing, this);
              this.ultHitIndex = info.index;
            }
          }
        }
      } else if(!this.attackHit) {
        const box = this.attackBox();
        if(box && opponent) {
          const hb = opponent.hurtBox();
          if(box.x < hb.x + hb.w && box.x + box.w > hb.x &&
             box.y < hb.y + hb.h && box.y + box.h > hb.y) {
            const result = opponent.takeHit(box, this.facing, this);
            this.attackHit = true;
            if(result === 'hit' || result === 'block') this.addUlt(box.ultGain);
            if(result === 'hit') {
              this.combo++;
              this.comboTimer = 90;
              if(this.combo >= 2) spawnCombo(this.x, this.y - 130, this.combo);
              if(this.combo === 5) {
                spawnCombo(this.x, this.y - 170, 'BRUTAL!', '#ff3860');
                Audio.parry();
              }
              if(this.combo === 8) {
                spawnCombo(this.x, this.y - 200, 'INSANE!', '#ff8800');
                Audio.heavy();
              }
              // Open a juggle/air-combo window if the opponent was launched
              if(!opponent.onGround || (box.up && box.up < 0)) {
                this.juggleWindow = 28;
              }
            }
          }
        }
      }
    }
  }
}


// --- CPU AI ---
// AI
// ============================================================
function cpuInput(cpu, player) {
  const dist = player.x - cpu.x;
  const ad = Math.abs(dist);
  const dir = Math.sign(dist);
  const input = makeInput();

  if(cpu.hitStun > 0 || cpu.state === 'dash' || cpu.state === 'attack') return input;

  if(cpu.ult >= cpu.maxUlt && ad < 160 && Math.random() < 0.08) {
    input.ultPressed = true;
    return input;
  }

  if(player.state === 'attack' && ad < 100) {
    if(Math.random() < 0.18) { input.block = true; return input; }
    if(Math.random() < 0.05 && cpu.dashCooldown === 0) {
      input.dashPressed = true;
      return input;
    }
  }

  if(ad < 80) {
    if(Math.random() < 0.09) {
      const r = Math.random();
      if(r < 0.55) input.lightPressed = true;
      else if(r < 0.85) input.heavyPressed = true;
      else input.dashPressed = true;
    }
    if(Math.random() < 0.02) {
      if(dir > 0) input.left = true; else input.right = true;
    }
  } else if(ad < 200) {
    if(dir > 0) input.right = true; else input.left = true;
    if(Math.random() < 0.02 && cpu.onGround) input.jumpPressed = true;
    if(Math.random() < 0.02 && cpu.dashCooldown === 0) input.dashPressed = true;
  } else {
    if(dir > 0) input.right = true; else input.left = true;
  }

  if(cpu.hp < 25 && ad < 120 && Math.random() < 0.08) input.block = true;

  return input;
}


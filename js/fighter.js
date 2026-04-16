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

    this.suspended = 0;          // opponent suspended/juggled during ult
    this.beingUlted = 0;
    this.beingThrown = 0;        // locked in opponent's throw choreography

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
      if(this.comboStep === 0) return { start: 4, active: 8, total: 18, dmg: 5, kb: 4, up: 0, reach: 55, boxH: 26, boxY: -70, ult: 6, canCombo: true };
      if(this.comboStep === 1) return { start: 4, active: 9, total: 20, dmg: 6, kb: 5, up: 0, reach: 60, boxH: 26, boxY: -70, ult: 7, canCombo: true };
      return { start: 5, active: 10, total: 26, dmg: 8, kb: 8, up: -2, reach: 68, boxH: 32, boxY: -65, ult: 8, canCombo: false };
    }
    if(this.attackType === 'heavy') {
      return { start: 10, active: 14, total: 40, dmg: 14, kb: 14, up: -5, reach: 78, boxH: 36, boxY: -65, ult: 12, canCombo: false };
    }
    if(this.attackType === 'throw') {
      // Ken-style shoulder throw — tight 35-frame sequence.
      // 0-3 startup/grab, 4-24 arc (victim flips overhead), 24-35 recovery.
      return { start: 3, active: 8, total: 35, dmg: 22, kb: 18, up: -4, reach: 82, boxH: 100, boxY: -100, ult: 14, canCombo: false, beatsBlock: true, isGrab: true };
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
      this.invuln = ULT_SEQUENCE.total;  // fully invincible during ult
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
      const info = currentUltHit(this.stateTime);
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
    return {
      x: this.x + this.facing * 10 - (this.facing < 0 ? data.reach : 0),
      y: this.y + data.boxY,
      w: data.reach,
      h: data.boxH,
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

    // Throw hit — grab and slam choreography
    if(isThrow) {
      this.beingThrown = 30;           // matches Ken-throw 35-frame total
      this.state = 'hurt';
      this.stateTime = 0;
      this.stateTimeF = 0;
      this.attackType = null;
      this.hitStun = 30;
      this.combo = 0;
      this.hurtFlash = 8;
      this.vx = 0; this.vy = 0;
      this.knockback = 0;
      this.onGround = false;
      this.facing = -fromFacing;
      this.addUlt(box.dmg * 0.6);
      if(attacker) attacker.throwConnected = true;
      Audio.whoosh();
      return 'hit';
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

    // Physics impulse — head whips back, arms snap on the hit vector
    const impulseMag = box.type === 'heavy' ? 10 : 6;
    this.impactVx = fromFacing * impulseMag;
    this.impactVy = (box.up && box.up < 0) ? -4 : -1.5;

    spawnDamageNumber(this.x, this.y - 110, box.dmg, box.type === 'heavy' ? '#ff3860' : '#fff');

    if(this.hp < 0) this.hp = 0;

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
       opponent.stateTime < ULT_SEQUENCE.total) {
      lockVictimToUlt(this, opponent);
      this.vx = 0; this.vy = 0;
      this.knockback = 0; this.knockUp = 0;
      if(this.state !== 'hurt') { this.state = 'hurt'; this.stateTimeF = 0; }
      this.hitStun = Math.max(this.hitStun, 4);
      return;
    }

    // Being thrown — locked through the entire arc up to impact (frame 24)
    if(this.beingThrown > 0 && opponent &&
       opponent.state === 'attack' && opponent.attackType === 'throw' &&
       opponent.stateTime <= 24) {
      lockVictimToThrow(this, opponent);
      // Damage + impact effects at impact frame (24)
      if(opponent.stateTime === 24 && !this.throwDamageApplied) {
        this.throwDamageApplied = true;
        const dmgMult = (opponent.dmgMult) || 1;
        const dmg = 22 * dmgMult;
        this.hp = Math.max(0, this.hp - dmg);
        this.hurtFlash = 16;
        this.hitStun = 20;
        // Release in the direction of the throw (forward throw = forward, back throw = behind)
        const throwDir = opponent.throwDir || -1;
        this._throwReleaseKb = throwDir * opponent.facing * 14;
        this._throwReleaseUp = -4;
        spawnDamageNumber(this.x, this.y - 110, dmg, '#ff6600', true);
        spawnHitSpark(this.x, this.y - 30, '#ffaa44', 22, 1.8);
        for(let i = 0; i < 16; i++) spawnDust(this.x + (Math.random()-0.5)*60, GROUND + 2, -opponent.facing);
        shake(10, 14);
        hitstop = 6;
        Audio.heavy();
        if(opponent) opponent.addUlt(12);
      }
      return;
    }
    // Apply the queued throw-release impulse the frame after the lock ends
    if(this._throwReleaseKb !== undefined) {
      this.knockback = this._throwReleaseKb;
      this.knockUp = this._throwReleaseUp;
      this.onGround = false;
      this._throwReleaseKb = undefined;
      this._throwReleaseUp = undefined;
    }
    if(this.throwDamageApplied && this.beingThrown === 0) this.throwDamageApplied = false;

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
    if(this.jumpBuffer > 0) {
      if(this.onGround || this.coyote > 0) {
        this.vy = -14;
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
    if(input.throwPressed) {
      // Directional throw: holding back = toss over shoulder (default);
      // holding forward (or neutral) = slam forward.
      const holdingBack = (this.facing === 1 && input.left) || (this.facing === -1 && input.right);
      this.throwDir = holdingBack ? -1 : 1;
      this.startAttack('throw');
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
      targetVx = this.dashDir * 12;
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
      const spd = 5.5 * (this.speedMult || 1);
      if(wantLeft) targetVx = -spd;
      if(wantRight) targetVx = spd;
    }

    const accel = this.onGround ? 0.8 : 0.4;
    this.vx += (targetVx - this.vx) * accel;
    this.x += this.vx + this.knockback;
    this.knockback *= 0.82;
    if(Math.abs(this.knockback) < 0.15) this.knockback = 0;

    if(Math.abs(targetVx) > 1 && this.onGround) this.walkPhase += 0.28;
    else this.walkPhase *= 0.92;
    if(this.onGround && Math.abs(this.vx) > 4 && globalTime % 8 === 0) {
      spawnDust(this.x - Math.sign(this.vx) * 10, GROUND + 2, -Math.sign(this.vx) * 0.5);
    }

    // Ultimate aerial positioning — attacker rises with opponent
    if(this.state === 'attack' && this.attackType === 'ult') {
      const t = this.stateTime;
      if(t >= 78 && t < 110) {
        // In the air phase - lift off the ground
        const phase = (t - 78) / 32;
        this.onGround = false;
        this.y = GROUND - 40 - Math.sin(phase * Math.PI) * 60;
        this.vy = 0;
      } else if(t >= 110 && t < 128) {
        // Slam down
        const phase = (t - 110) / 18;
        this.onGround = false;
        this.y = GROUND - 100 + phase * phase * 100;
        this.vy = 0;
        if(t === 118) {
          spawnDust(this.x, GROUND + 4);
          spawnDust(this.x - 30, GROUND + 4);
          spawnDust(this.x + 30, GROUND + 4);
        }
      } else if(t >= 128) {
        this.y = GROUND;
        this.onGround = true;
      }
    } else if(!this.onGround) {
      this.vy += 0.68;
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
        if(this.stateTime >= ULT_SEQUENCE.total) {
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
    if(this.state === 'hurt' && this.hitStun === 0) { this.state = 'idle'; this.stateTime = 0; this.stateTimeF = 0; }
    if(this.state === 'stagger' && this.hitStun === 0) { this.state = 'idle'; this.stateTime = 0; this.stateTimeF = 0; }

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
    if(opponent) {
      const dx = this.x - opponent.x;
      const minDist = 50;
      if(Math.abs(dx) < minDist && this.onGround && opponent.onGround &&
         !(this.state === 'attack' && this.attackType === 'ult') &&
         !(opponent.beingUlted > 0)) {
        const push = (minDist - Math.abs(dx)) / 2;
        const s = Math.sign(dx) || (this.isP2 ? 1 : -1);
        this.x += s * push;
        opponent.x -= s * push;
      }
    }

    // Attack hit detection
    if(this.state === 'attack') {
      const isUlt = this.attackType === 'ult';
      if(isUlt) {
        const info = currentUltHit(this.stateTime);
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


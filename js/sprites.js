// ============================================================
// SPRITES — pre-rendered character sprite cache for pixel-art look
// ============================================================
// At game start, each character + animation state is rendered to a tiny
// off-screen canvas (SPRITE_W × SPRITE_H pixels), then stamped to the
// main canvas scaled up with imageSmoothingEnabled=false for crisp
// nearest-neighbor pixel art. This replaces the per-frame procedural
// drawing with cached bitmap stamps — faster AND gives an SNES-quality
// pixel-art aesthetic automatically.
//
// To swap in hand-drawn or AI-generated sprites later:
//   1. Create a PNG sprite sheet for each character
//   2. Load it as an Image
//   3. Replace the cache entry with sliced regions from the sheet
//   The drawFighterSprite() function doesn't care where the bitmap came
//   from — it just ctx.drawImage's from the cache.

const SPRITE_W = 48;        // pixels wide at native sprite resolution
const SPRITE_H = 96;        // pixels tall
const SPRITE_SCALE = 2.2;   // scale-up factor when drawing to main canvas
const SPRITE_DRAW_W = Math.round(SPRITE_W * SPRITE_SCALE);
const SPRITE_DRAW_H = Math.round(SPRITE_H * SPRITE_SCALE);

// Cache: spriteCache[characterId][stateName][frameIndex] = { canvas, flipped }
const spriteCache = {};

// Animation state → number of frames + frame duration (in game ticks)
const SPRITE_ANIMS = {
  idle:         { frames: 4, rate: 12 },
  walk:         { frames: 6, rate: 6 },
  attack_light: { frames: 4, rate: 5 },
  attack_heavy: { frames: 5, rate: 7 },
  hurt:         { frames: 2, rate: 8 },
  jump:         { frames: 2, rate: 10 },
  block:        { frames: 1, rate: 1 },
  dash:         { frames: 2, rate: 4 },
  attack_ult:   { frames: 6, rate: 8 },
  attack_throw: { frames: 4, rate: 6 },
};

// Map game state + attackType to sprite animation name
function getSpriteAnim(f) {
  if(f.state === 'attack') {
    if(f.attackType === 'ult') return 'attack_ult';
    if(f.attackType === 'throw') return 'attack_throw';
    if(f.attackType === 'heavy') return 'attack_heavy';
    return 'attack_light';
  }
  if(f.state === 'hurt' || f.state === 'stagger' || f.state === 'wallsplat') return 'hurt';
  if(f.state === 'dash') return 'dash';
  if(f.state === 'ringout') return 'hurt';
  if(f.blocking) return 'block';
  if(!f.onGround) return 'jump';
  if(Math.abs(f.vx) > 1.5) return 'walk';
  return 'idle';
}

// Get the current frame index for a sprite animation
function getSpriteFrame(f, animName) {
  const anim = SPRITE_ANIMS[animName] || SPRITE_ANIMS.idle;
  const t = f.stateTime || globalTime;
  return Math.floor(t / anim.rate) % anim.frames;
}

// ============================================================
// SPRITE GENERATION — renders the existing filled characters at
// low resolution to create cached bitmaps. Call once at game start.
// ============================================================
function generateSpritesForCharacter(charData) {
  const id = charData.id;
  spriteCache[id] = {};

  for(const [animName, animDef] of Object.entries(SPRITE_ANIMS)) {
    spriteCache[id][animName] = [];

    for(let frame = 0; frame < animDef.frames; frame++) {
      // Create a tiny off-screen canvas
      const offCanvas = document.createElement('canvas');
      offCanvas.width = SPRITE_W;
      offCanvas.height = SPRITE_H;
      const offCtx = offCanvas.getContext('2d');

      // Build a mock fighter at center of the sprite canvas
      const mockX = SPRITE_W / 2;
      const mockY = SPRITE_H - 10;  // feet near bottom

      // Create a simple pose based on animation + frame
      const pose = generateAnimPose(mockX, mockY, animName, frame, animDef.frames, charData);

      // Save the real ctx, swap in the off-screen one, render, swap back
      const realCtx = ctx;
      ctx = offCtx;

      // Scale down: the pose positions are in "world" coordinates relative to
      // mockX/mockY, which fit the sprite canvas at 1:1.
      // We need to scale the rendering to fit inside SPRITE_W × SPRITE_H.
      const s = 0.7;  // shrink factor so the character fits with headroom
      ctx.save();
      ctx.translate(SPRITE_W / 2, SPRITE_H * 0.85);
      ctx.scale(s, s);
      ctx.translate(-mockX, -mockY);

      if(charData.visual && charData.visual.body) {
        renderFilledPose(pose, charData.visual);
      } else {
        renderStoredPose(pose, charData.color, 1, charData.visual);
      }

      ctx.restore();
      ctx = realCtx;  // restore real canvas context

      spriteCache[id][animName].push(offCanvas);
    }
  }
}

// Generate a pose for a given animation state + frame
function generateAnimPose(x, y, animName, frame, totalFrames, charData) {
  const p = frame / Math.max(1, totalFrames - 1);
  const pose = makePose(x, y);

  // Apply character's idle stance as base
  const vis = charData.visual;
  const is = vis && vis.idleStance;
  if(is) {
    pose.lHand.x += (is.lHandX || 0);
    pose.lHand.y += (is.lHandY || 0);
    pose.rHand.x += (is.rHandX || 0);
    pose.rHand.y += (is.rHandY || 0);
    pose.lFoot.x += (is.lFootX || 0);
    pose.rFoot.x += (is.rFootX || 0);
  }

  // Pose variations per animation
  if(animName === 'idle') {
    const breath = Math.sin(p * Math.PI * 2) * 2;
    pose.head.y -= breath * 0.5;
    pose.neck.y -= breath * 0.3;
    pose.lHand.y += breath * 0.4;
    pose.rHand.y -= breath * 0.4;
  } else if(animName === 'walk') {
    const sw = Math.sin(p * Math.PI * 2);
    pose.lFoot.x -= sw * 8;
    pose.rFoot.x += sw * 8;
    pose.lFoot.y -= Math.max(0, sw) * 6;
    pose.rFoot.y -= Math.max(0, -sw) * 6;
    pose.lHand.y += sw * 5;
    pose.rHand.y -= sw * 5;
    pose.bodyLean = 3;
  } else if(animName === 'attack_light') {
    const ext = p < 0.5 ? easeOutCubic(p * 2) * 40 : lerp(40, 10, (p - 0.5) * 2);
    pose.rHand.x = x + ext;
    pose.rHand.y = y - 72;
    pose.rElbow.x = x + ext * 0.5;
    pose.bodyLean = 6;
  } else if(animName === 'attack_heavy') {
    if(p < 0.4) {
      pose.rHand.x = x - 20;
      pose.rHand.y = y - 90;
      pose.bodyLean = -8;
    } else {
      const ext = easeOutCubic((p - 0.4) / 0.6) * 55;
      pose.rHand.x = x + ext;
      pose.rHand.y = y - 65;
      pose.bodyLean = 10;
    }
  } else if(animName === 'hurt') {
    pose.bodyLean = -10;
    pose.head.x -= 4;
    pose.lHand.y += 6;
    pose.rHand.y += 6;
  } else if(animName === 'jump') {
    pose.lFoot.y -= 10;
    pose.rFoot.y -= 14;
    pose.lHand.y -= 8;
    pose.rHand.y -= 8;
  } else if(animName === 'block') {
    pose.lHand.x = x + 2;
    pose.lHand.y = y - 88;
    pose.rHand.x = x + 14;
    pose.rHand.y = y - 66;
    pose.bodyLean = -6;
  } else if(animName === 'dash') {
    pose.bodyLean = 16;
    pose.lFoot.x -= 18;
    pose.rFoot.x += 10;
  } else if(animName === 'attack_ult') {
    // Simplified ult frames
    if(p < 0.3) {
      pose.bodyLean = -10;
      pose.rHand.x = x - 20;
      pose.rHand.y = y - 80;
    } else if(p < 0.7) {
      const ext = easeOutCubic((p - 0.3) / 0.4) * 50;
      pose.rHand.x = x + ext;
      pose.rHand.y = y - 72;
      pose.bodyLean = 12;
    } else {
      pose.rHand.x = x + 10;
      pose.rHand.y = y - 100;
      pose.bodyLean = 18;
    }
  } else if(animName === 'attack_throw') {
    if(p < 0.3) {
      pose.rHand.x = x + 35;
      pose.rHand.y = y - 75;
      pose.lHand.x = x + 35;
      pose.lHand.y = y - 68;
    } else {
      const angle = ((p - 0.3) / 0.7) * Math.PI;
      pose.rHand.x = x + Math.cos(angle) * 40;
      pose.rHand.y = y - 80 - Math.sin(angle) * 30;
    }
  }

  pose.facing = 1;  // sprites are generated facing right; flipped at draw time
  return pose;
}

// ============================================================
// SPRITE DRAWING — replaces procedural rendering with cached bitmaps
// ============================================================
function drawFighterSprite(f) {
  const charId = f.character && f.character.id;
  if(!charId || !spriteCache[charId]) return false;  // fallback to procedural

  const animName = getSpriteAnim(f);
  const anim = spriteCache[charId][animName];
  if(!anim || anim.length === 0) return false;

  const frameIdx = getSpriteFrame(f, animName);
  const spriteCanvas = anim[Math.min(frameIdx, anim.length - 1)];
  if(!spriteCanvas) return false;

  const flip = f.facing < 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;  // crisp pixel art — no bilinear smoothing

  // Position: center sprite on fighter's x, bottom at fighter's y
  const dx = f.x - SPRITE_DRAW_W / 2;
  const dy = f.y - SPRITE_DRAW_H + 12;  // offset so feet align with ground

  if(flip) {
    ctx.translate(f.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-f.x, 0);
  }

  // Hurt flash: tint the sprite by drawing a colored overlay
  if(f.hurtFlash > 0 && Math.floor(f.hurtFlash / 2) % 2 === 0) {
    ctx.globalAlpha = 0.6;
    ctx.drawImage(spriteCanvas, dx, dy, SPRITE_DRAW_W, SPRITE_DRAW_H);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(dx, dy, SPRITE_DRAW_W, SPRITE_DRAW_H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  ctx.drawImage(spriteCanvas, dx, dy, SPRITE_DRAW_W, SPRITE_DRAW_H);

  ctx.imageSmoothingEnabled = true;
  ctx.restore();
  return true;  // signals that sprite rendering handled it
}

// ============================================================
// INIT — generate all character sprites. Call after DOM is ready.
// ============================================================
function initSpriteCache() {
  for(const c of CHARACTERS) {
    generateSpritesForCharacter(c);
  }
}

// Auto-init when the page loads (after all scripts)
if(typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Slight delay so the main canvas ctx is definitely ready
    setTimeout(initSpriteCache, 100);
  });
}

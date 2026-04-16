// ============================================================
// SPRITES — pixel-art character rendering at SNES quality
// ============================================================
// Each character is drawn at native pixel resolution (64×128) using
// pixel-level body-part stamps with 3-tone shading + outlines. The
// sprites are cached at game start and stamped to the main canvas
// with imageSmoothingEnabled=false for crisp nearest-neighbor scaling.

const SPRITE_W = 64;
const SPRITE_H = 128;
const SPRITE_SCALE = 1.7;
const SPRITE_DRAW_W = Math.round(SPRITE_W * SPRITE_SCALE);
const SPRITE_DRAW_H = Math.round(SPRITE_H * SPRITE_SCALE);

const spriteCache = {};

const SPRITE_ANIMS = {
  idle:         { frames: 4, rate: 12 },
  walk:         { frames: 6, rate: 5 },
  attack_light: { frames: 4, rate: 4 },
  attack_heavy: { frames: 5, rate: 6 },
  hurt:         { frames: 2, rate: 8 },
  jump:         { frames: 2, rate: 10 },
  block:        { frames: 1, rate: 1 },
  dash:         { frames: 2, rate: 4 },
  attack_ult:   { frames: 6, rate: 8 },
  attack_throw: { frames: 4, rate: 6 },
};

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

function getSpriteFrame(f, animName) {
  const anim = SPRITE_ANIMS[animName] || SPRITE_ANIMS.idle;
  const t = f.stateTime || globalTime;
  return Math.floor(t / anim.rate) % anim.frames;
}

// ============================================================
// PIXEL DRAWING PRIMITIVES
// ============================================================
// All coordinates are integer pixels on the sprite canvas.
let _spCtx = null; // set during generation

function px(x, y, color) {
  _spCtx.fillStyle = color;
  _spCtx.fillRect(x | 0, y | 0, 1, 1);
}

function pxRect(x, y, w, h, color) {
  _spCtx.fillStyle = color;
  _spCtx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

function pxCircle(cx, cy, r, color) {
  for(let dy = -r; dy <= r; dy++) {
    for(let dx = -r; dx <= r; dx++) {
      if(dx * dx + dy * dy <= r * r) px(cx + dx, cy + dy, color);
    }
  }
}

function pxOutlineCircle(cx, cy, r, fill, outline) {
  pxCircle(cx, cy, r, fill);
  // 1px outline
  for(let a = 0; a < Math.PI * 2; a += 0.15) {
    px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, outline);
  }
}

// Draw a filled limb (rectangle rotated to follow joint angle) with shading
function pxLimb(x1, y1, x2, y2, w, color, dark, outline) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const steps = Math.max(1, Math.ceil(len));
  for(let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x1 + dx * t, cy = y1 + dy * t;
    const hw = w / 2;
    // Main fill
    for(let j = -hw; j <= hw; j++) {
      const px_x = (cx + nx * j) | 0, px_y = (cy + ny * j) | 0;
      const isEdge = Math.abs(j) >= hw - 0.8 || i === 0 || i === steps;
      const isShadow = j < 0; // left side = shadow
      _spCtx.fillStyle = isEdge ? outline : (isShadow ? dark : color);
      _spCtx.fillRect(px_x, px_y, 1, 1);
    }
  }
}

// ============================================================
// CHARACTER PIXEL ART — per-character body part rendering
// ============================================================
// Each character has a draw function that takes the sprite context,
// a center-x, ground-y, and pose data (simplified offsets), then
// renders the character at the pixel level.

function drawCharPixelBody(charData, cx, gy, pose) {
  const b = (charData.visual && charData.visual.body) || {};
  const skin    = b.skinColor    || '#e8d0b8';
  const outfit  = b.outfitColor  || '#4488cc';
  const dark    = b.outfitDark   || '#2a5580';
  const accent  = b.outfitAccent || '#66bbee';
  const outline = b.outlineColor || '#1a1a2a';
  const vis     = charData.visual || {};
  const headR   = Math.round((vis.headRadius || 13) * 0.45);
  const sw      = Math.round((b.shoulderW || 18) * 0.45);
  const ww      = Math.round((b.waistW || 14) * 0.45);
  const armW    = Math.round((b.upperArmW || 7) * 0.35);
  const legW    = Math.round((b.thighW || 9) * 0.35);

  // Body reference points from pose
  const headX  = cx + (pose.headOx || 0);
  const headY  = gy - 52 + (pose.headOy || 0);
  const neckY  = gy - 44;
  const pelvisY = gy - 22;
  const lean   = pose.lean || 0;

  // -- Legs --
  const lFootX = cx - 5 + (pose.lFootOx || 0);
  const lFootY = gy + (pose.lFootOy || 0);
  const rFootX = cx + 5 + (pose.rFootOx || 0);
  const rFootY = gy + (pose.rFootOy || 0);
  const lKneeX = (cx - 3 + lFootX) / 2;
  const lKneeY = (pelvisY + lFootY) / 2 + 1;
  const rKneeX = (cx + 3 + rFootX) / 2;
  const rKneeY = (pelvisY + rFootY) / 2 + 1;
  pxLimb(cx - 2, pelvisY, lKneeX, lKneeY, legW, outfit, dark, outline);
  pxLimb(lKneeX, lKneeY, lFootX, lFootY, legW - 1, outfit, dark, outline);
  pxLimb(cx + 2, pelvisY, rKneeX, rKneeY, legW, outfit, dark, outline);
  pxLimb(rKneeX, rKneeY, rFootX, rFootY, legW - 1, outfit, dark, outline);
  // Feet (boots)
  pxRect(lFootX - 2, lFootY - 1, 5, 3, dark);
  pxRect(lFootX - 2, lFootY - 1, 5, 1, outline);
  pxRect(rFootX - 2, rFootY - 1, 5, 3, dark);
  pxRect(rFootX - 2, rFootY - 1, 5, 1, outline);

  // -- Torso (with hourglass curve for female characters) --
  const hipW = b.female ? Math.round((b.hipW || b.waistW + 4) * 0.45) : ww;
  const torsoH = neckY - pelvisY;
  for(let row = 0; row < torsoH; row++) {
    const t = row / torsoH;  // 0 = bottom (pelvis), 1 = top (neck)
    let w;
    if(b.female) {
      // Hourglass: wide at hips (bottom), narrow at waist (middle), wider at shoulders (top)
      if(t < 0.4) w = Math.round(lerp(hipW, ww, t / 0.4));       // hips → waist
      else        w = Math.round(lerp(ww, sw, (t - 0.4) / 0.6)); // waist → shoulders
    } else {
      w = Math.round(lerp(ww, sw, t));  // straight taper for males
    }
    const y = pelvisY + torsoH - row;
    for(let col = -w; col <= w; col++) {
      const isEdge = Math.abs(col) >= w || row === 0;
      const isShadow = col < 0;
      px(cx + lean + col, y, isEdge ? outline : (isShadow ? dark : outfit));
    }
  }
  // Belt / waist accent line
  pxRect(cx + lean - ww, pelvisY, ww * 2 + 1, 1, accent);
  // Collar accent
  pxRect(cx + lean - 2, neckY, 5, 1, accent);

  // -- Ponytail / long hair for female characters --
  if(b.female && b.hairLength > 0) {
    const hc = b.hairColor || charData.glow;
    const hx = headX + lean - 1;  // slightly behind head center
    const hy = headY + headR - 1;  // starts at bottom of head
    for(let i = 0; i < b.hairLength; i++) {
      const sway = Math.sin(i * 0.4 + (pose.lean || 0) * 0.1) * 1.5;
      const w = Math.max(1, 3 - Math.floor(i / 5));  // tapers
      pxRect(hx + sway - lean * 0.8, hy + i, w, 1, hc);
    }
  }

  // -- Arms --
  const lElbowX = cx - sw + (pose.lElbowOx || -2);
  const lElbowY = neckY + 10 + (pose.lElbowOy || 0);
  const lHandX  = cx - sw - 3 + (pose.lHandOx || 0);
  const lHandY  = neckY + 20 + (pose.lHandOy || 0);
  const rElbowX = cx + sw + (pose.rElbowOx || 2);
  const rElbowY = neckY + 10 + (pose.rElbowOy || 0);
  const rHandX  = cx + sw + 3 + (pose.rHandOx || 0);
  const rHandY  = neckY + 20 + (pose.rHandOy || 0);

  // Upper arms (outfit color)
  pxLimb(cx + lean - sw * 0.6, neckY + 1, lElbowX, lElbowY, armW, outfit, dark, outline);
  pxLimb(cx + lean + sw * 0.6, neckY + 1, rElbowX, rElbowY, armW, outfit, dark, outline);
  // Forearms (skin color)
  pxLimb(lElbowX, lElbowY, lHandX, lHandY, armW - 1, skin, dark, outline);
  pxLimb(rElbowX, rElbowY, rHandX, rHandY, armW - 1, skin, dark, outline);
  // Hands (fists)
  pxOutlineCircle(lHandX, lHandY, Math.max(2, armW - 1), skin, outline);
  pxOutlineCircle(rHandX, rHandY, Math.max(2, armW - 1), skin, outline);

  // -- Head --
  pxOutlineCircle(headX + lean, headY, headR, skin, outline);
  // Neck
  pxRect(cx + lean - 1, neckY - 1, 3, 3, skin);

  // -- Hair / headgear (from headDecor) --
  if(vis.headDecor) {
    for(const d of vis.headDecor) {
      if(d.type === 'line') {
        // Draw 2px-wide line in headDecor color, relative to head center
        const hx = headX + lean, hy = headY;
        const x1 = hx + d.x1 * 0.4, y1 = hy + d.y1 * 0.4;
        const x2 = hx + d.x2 * 0.4, y2 = hy + d.y2 * 0.4;
        const steps = Math.max(1, Math.ceil(Math.sqrt((x2-x1)**2 + (y2-y1)**2)));
        for(let i = 0; i <= steps; i++) {
          const t = i / steps;
          px(lerp(x1, x2, t), lerp(y1, y2, t), d.color);
          px(lerp(x1, x2, t) + 1, lerp(y1, y2, t), d.color);
        }
      } else if(d.type === 'diamond') {
        const hx = headX + lean + d.cx * 0.4, hy = headY + d.cy * 0.4;
        px(hx, hy, d.color);
        px(hx - 1, hy, d.color);
        px(hx + 1, hy, d.color);
        px(hx, hy - 1, d.color);
        px(hx, hy + 1, d.color);
      } else if(d.type === 'rect') {
        const hx = headX + lean, hy = headY;
        pxRect(hx + d.x * 0.4, hy + d.y * 0.4, d.w * 0.4, d.h * 0.4, d.fill || d.border || '#fff');
      } else if(d.type === 'arc') {
        // Hood — simplified as a wider circle behind the head
        pxCircle(headX + lean, headY - 1, headR + 2, d.fill || 'rgba(100,50,150,0.3)');
        // Re-draw head on top
        pxOutlineCircle(headX + lean, headY, headR, skin, outline);
      }
    }
  }

  // -- Eyes --
  const eyes = vis.eyes;
  const eyeX = headX + lean + 2, eyeY = headY - 1;
  if(eyes) {
    if(eyes.type === 'wide') {
      pxRect(eyeX - 1, eyeY, 3, 2, eyes.color);
      px(eyeX + 1, eyeY, '#fff'); // highlight
    } else if(eyes.type === 'slit') {
      pxRect(eyeX - 1, eyeY, 4, 1, eyes.color);
    } else if(eyes.type === 'dot') {
      pxRect(eyeX, eyeY - 1, 2, 2, eyes.color);
    } else if(eyes.type === 'glow') {
      pxRect(eyeX - 1, eyeY, 3, 1, eyes.color);
      px(eyeX - 2, eyeY, eyes.color); // glow spread
      px(eyeX + 2, eyeY, eyes.color);
    }
  } else {
    px(eyeX, eyeY, outline);
    px(eyeX + 1, eyeY, outline);
  }
  // Mouth
  px(eyeX, headY + 2, outline);
  px(eyeX + 1, headY + 2, outline);
}

// ============================================================
// POSE DATA for sprite generation
// ============================================================
function getSpritePose(animName, frame, totalFrames) {
  const p = totalFrames > 1 ? frame / (totalFrames - 1) : 0;
  const pose = { headOx: 0, headOy: 0, lean: 0,
    lFootOx: 0, lFootOy: 0, rFootOx: 0, rFootOy: 0,
    lElbowOx: 0, lElbowOy: 0, lHandOx: 0, lHandOy: 0,
    rElbowOx: 0, rElbowOy: 0, rHandOx: 0, rHandOy: 0 };

  if(animName === 'idle') {
    const b = Math.sin(p * Math.PI * 2) * 1.5;
    pose.headOy = -b;
    pose.lHandOy = b; pose.rHandOy = -b;
  } else if(animName === 'walk') {
    const sw = Math.sin(p * Math.PI * 2);
    pose.lFootOx = -sw * 5; pose.rFootOx = sw * 5;
    pose.lFootOy = -Math.max(0, sw) * 4;
    pose.rFootOy = -Math.max(0, -sw) * 4;
    pose.lHandOy = sw * 4; pose.rHandOy = -sw * 4;
    pose.lean = 1;
  } else if(animName === 'attack_light') {
    const ext = p < 0.5 ? p * 2 : 2 - p * 2;
    pose.rHandOx = ext * 22; pose.rHandOy = -6;
    pose.rElbowOx = ext * 10;
    pose.lean = 2;
  } else if(animName === 'attack_heavy') {
    if(p < 0.4) {
      pose.rHandOx = -10; pose.rHandOy = -16;
      pose.lean = -3;
    } else {
      const ext = (p - 0.4) / 0.6;
      pose.rHandOx = ext * 28; pose.rHandOy = -2;
      pose.rElbowOx = ext * 12;
      pose.lean = 4;
    }
  } else if(animName === 'hurt') {
    pose.lean = -4;
    pose.headOx = -2;
    pose.lHandOy = 4; pose.rHandOy = 4;
  } else if(animName === 'jump') {
    pose.lFootOy = -6; pose.rFootOy = -8;
    pose.lHandOy = -6; pose.rHandOy = -6;
    pose.headOy = -2;
  } else if(animName === 'block') {
    pose.lHandOx = 6; pose.lHandOy = -16;
    pose.rHandOx = 8; pose.rHandOy = -8;
    pose.lean = -2;
  } else if(animName === 'dash') {
    pose.lean = 6;
    pose.lFootOx = -10; pose.rFootOx = 6;
  } else if(animName === 'attack_ult') {
    if(p < 0.2) {
      pose.lean = -4;
      pose.rHandOx = -10; pose.rHandOy = -14;
    } else if(p < 0.6) {
      const ext = (p - 0.2) / 0.4;
      pose.rHandOx = ext * 26; pose.rHandOy = -4;
      pose.lean = 5;
    } else {
      pose.rHandOx = 6; pose.rHandOy = -22;
      pose.lean = 7;
    }
  } else if(animName === 'attack_throw') {
    if(p < 0.3) {
      pose.rHandOx = 18; pose.rHandOy = -6;
      pose.lHandOx = 18; pose.lHandOy = -2;
    } else {
      const angle = ((p - 0.3) / 0.7) * Math.PI;
      pose.rHandOx = Math.cos(angle) * 18;
      pose.rHandOy = -Math.sin(angle) * 14 - 6;
    }
  }
  return pose;
}

// ============================================================
// SPRITE GENERATION
// ============================================================
function generateSpritesForCharacter(charData) {
  const id = charData.id;
  spriteCache[id] = {};

  for(const [animName, animDef] of Object.entries(SPRITE_ANIMS)) {
    spriteCache[id][animName] = [];
    for(let frame = 0; frame < animDef.frames; frame++) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = SPRITE_W;
      offCanvas.height = SPRITE_H;
      _spCtx = offCanvas.getContext('2d');
      _spCtx.imageSmoothingEnabled = false;

      const pose = getSpritePose(animName, frame, animDef.frames);
      drawCharPixelBody(charData, SPRITE_W / 2, SPRITE_H - 8, pose);

      spriteCache[id][animName].push(offCanvas);
    }
  }
  _spCtx = null;
}

// ============================================================
// SPRITE DRAWING
// ============================================================
function drawFighterSprite(f) {
  const charId = f.character && f.character.id;
  if(!charId || !spriteCache[charId]) return false;

  const animName = getSpriteAnim(f);
  const anim = spriteCache[charId][animName];
  if(!anim || anim.length === 0) return false;

  const frameIdx = getSpriteFrame(f, animName);
  const spriteCanvas = anim[Math.min(frameIdx, anim.length - 1)];
  if(!spriteCanvas) return false;

  const flip = f.facing < 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const dx = f.x - SPRITE_DRAW_W / 2;
  const dy = f.y - SPRITE_DRAW_H + 16;

  if(flip) {
    ctx.translate(f.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-f.x, 0);
  }

  // Hurt flash — blink the sprite white by compositing on an off-screen canvas
  // so the tint conforms to the character silhouette (no visible squares).
  const isFlashing = f.hurtFlash > 0 && Math.floor(f.hurtFlash / 2) % 2 === 0;
  if(isFlashing) {
    // Composite the sprite + white tint on a temp canvas so only character pixels tint
    const tmp = document.createElement('canvas');
    tmp.width = spriteCanvas.width;
    tmp.height = spriteCanvas.height;
    const tc = tmp.getContext('2d');
    tc.drawImage(spriteCanvas, 0, 0);
    tc.globalCompositeOperation = 'source-atop';
    tc.fillStyle = 'rgba(255,200,200,0.65)';
    tc.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(tmp, dx, dy, SPRITE_DRAW_W, SPRITE_DRAW_H);
  } else {
    ctx.drawImage(spriteCanvas, dx, dy, SPRITE_DRAW_W, SPRITE_DRAW_H);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.restore();
  return true;
}

// ============================================================
// INIT
// ============================================================
function initSpriteCache() {
  for(const c of CHARACTERS) {
    generateSpritesForCharacter(c);
  }
}

if(typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(initSpriteCache, 100);
  });
}

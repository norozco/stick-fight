// ============================================================
// SPRITES — pixel-art character rendering
// ============================================================
// Each character gets a UNIQUE drawing function that produces obviously
// different body shapes, hair, outfits, and silhouettes. Not parameter
// tweaks on a shared template — each is hand-coded to look distinct.

const SPRITE_W = 80;
const SPRITE_H = 140;
const SPRITE_SCALE = 1.6;
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
  return Math.floor((f.stateTime || globalTime) / anim.rate) % anim.frames;
}

// ============================================================
// DRAWING HELPERS
// ============================================================
let _sp = null; // sprite context, set during generation

function spFill(x, y, w, h, color) {
  _sp.fillStyle = color;
  _sp.fillRect(x|0, y|0, w|0, h|0);
}
function spCircle(cx, cy, r, color) {
  _sp.fillStyle = color;
  _sp.beginPath();
  _sp.arc(cx, cy, r, 0, Math.PI * 2);
  _sp.fill();
}
function spEllipse(cx, cy, rx, ry, color) {
  _sp.fillStyle = color;
  _sp.beginPath();
  _sp.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  _sp.fill();
}
function spLine(x1, y1, x2, y2, w, color) {
  _sp.strokeStyle = color;
  _sp.lineWidth = w;
  _sp.lineCap = 'round';
  _sp.beginPath();
  _sp.moveTo(x1, y1);
  _sp.lineTo(x2, y2);
  _sp.stroke();
}
function spTrapezoid(x1, y1, w1, x2, y2, w2, fill, outline) {
  _sp.beginPath();
  _sp.moveTo(x1 - w1/2, y1);
  _sp.lineTo(x1 + w1/2, y1);
  _sp.lineTo(x2 + w2/2, y2);
  _sp.lineTo(x2 - w2/2, y2);
  _sp.closePath();
  _sp.fillStyle = fill;
  _sp.fill();
  if(outline) { _sp.strokeStyle = outline; _sp.lineWidth = 1; _sp.stroke(); }
}

// ============================================================
// POSE OFFSETS — animation-specific body part positions
// ============================================================
function getPoseOffsets(animName, frame, total) {
  const p = total > 1 ? frame / (total - 1) : 0;
  const o = { headY: 0, lean: 0, lArmAngle: 0, rArmAngle: 0,
    lLegSpread: 0, rLegSpread: 0, lFootLift: 0, rFootLift: 0,
    rArmExtend: 0, lArmExtend: 0 };

  if(animName === 'idle') {
    o.headY = Math.sin(p * Math.PI * 2) * 1.5;
  } else if(animName === 'walk') {
    const s = Math.sin(p * Math.PI * 2);
    o.lLegSpread = -s * 8; o.rLegSpread = s * 8;
    o.lFootLift = Math.max(0, s) * 5;
    o.rFootLift = Math.max(0, -s) * 5;
    o.lArmAngle = s * 0.4; o.rArmAngle = -s * 0.4;
    o.lean = 2;
  } else if(animName === 'attack_light') {
    o.rArmExtend = (p < 0.5 ? p * 2 : 2 - p * 2) * 25;
    o.lean = 3;
  } else if(animName === 'attack_heavy') {
    if(p < 0.35) { o.rArmAngle = -1.2; o.lean = -4; }
    else { o.rArmExtend = ((p - 0.35) / 0.65) * 32; o.lean = 6; }
  } else if(animName === 'hurt') {
    o.lean = -6; o.headY = 2;
  } else if(animName === 'jump') {
    o.lFootLift = 8; o.rFootLift = 10; o.headY = -3;
  } else if(animName === 'block') {
    o.lArmAngle = -1.0; o.rArmAngle = -0.6; o.lean = -2;
  } else if(animName === 'dash') {
    o.lean = 8; o.lLegSpread = -12;
  } else if(animName === 'attack_ult') {
    if(p < 0.25) { o.rArmAngle = -1.5; o.lean = -5; }
    else if(p < 0.65) { o.rArmExtend = 30; o.lean = 7; }
    else { o.rArmAngle = -1.8; o.lean = 8; o.headY = -2; }
  } else if(animName === 'attack_throw') {
    if(p < 0.3) { o.rArmExtend = 20; o.lArmExtend = 20; }
    else { o.rArmAngle = -Math.PI * ((p-0.3)/0.7); o.rArmExtend = 16; }
  }
  return o;
}

// ============================================================
// PER-CHARACTER SPRITE DRAWING — each one is visually unique
// ============================================================

function drawAuroraSprite(cx, gy, o) {
  const skin = '#f0ddd0', outfit = '#4488cc', dark = '#2a5580', accent = '#66bbee', out = '#1a3050';
  const lean = o.lean || 0;
  const bx = cx + lean;

  // --- LEGS (slim, feminine) ---
  const lx = bx - 5 + (o.lLegSpread||0), ly = gy - (o.lFootLift||0);
  const rx = bx + 5 + (o.rLegSpread||0), ry = gy - (o.rFootLift||0);
  spTrapezoid(bx - 3, gy - 28, 7, lx, ly, 5, outfit, out);   // left thigh
  spTrapezoid(bx + 3, gy - 28, 7, rx, ry, 5, outfit, out);   // right thigh
  // Boots
  spFill(lx - 3, ly - 2, 7, 4, dark); spFill(lx - 3, ly - 2, 7, 1, out);
  spFill(rx - 3, ry - 2, 7, 4, dark); spFill(rx - 3, ry - 2, 7, 1, out);

  // --- TORSO (hourglass feminine) ---
  const neckY = gy - 52, pelvisY = gy - 28;
  // Hips
  spEllipse(bx, pelvisY, 9, 4, outfit);
  // Waist (narrow)
  spFill(bx - 5, pelvisY - 10, 10, 10, outfit);
  // Chest (wider)
  spTrapezoid(bx, pelvisY - 10, 10, bx, neckY, 14, outfit, out);
  // Shading: left half darker
  spFill(bx - 7, neckY, 7, pelvisY - neckY, dark + '40');
  // Belt accent
  spFill(bx - 6, pelvisY - 1, 12, 2, accent);
  // Collar
  spFill(bx - 3, neckY, 6, 2, accent);

  // --- ARMS ---
  const shoulderY = neckY + 2;
  const armLen = 18 + (o.rArmExtend||0) * 0.3;
  const lax = bx - 10 - (o.lArmExtend||0);
  const rax = bx + 10 + (o.rArmExtend||0);
  const lay = shoulderY + 16 + Math.sin(o.lArmAngle||0) * 10;
  const ray = shoulderY + 16 + Math.sin(o.rArmAngle||0) * 10;
  spLine(bx - 7, shoulderY, lax, lay, 5, outfit);
  spLine(lax, lay, lax - 2, lay + 10, 4, skin);
  spCircle(lax - 2, lay + 12, 3, skin);   // hand
  spLine(bx + 7, shoulderY, rax, ray, 5, outfit);
  spLine(rax, ray, rax + 2, ray + 10, 4, skin);
  spCircle(rax + 2, ray + 12, 3, skin);

  // --- HEAD ---
  const headY = neckY - 8 + (o.headY||0);
  spFill(bx - 2, neckY - 2, 4, 4, skin);  // neck
  spCircle(bx, headY, 8, skin);            // head
  spCircle(bx, headY, 8.5, out + '60');    // outline

  // Crown — 3 prominent ice spikes
  spLine(bx - 4, headY - 6, bx - 5, headY - 16, 2, '#a0e8ff');
  spLine(bx, headY - 8, bx, headY - 20, 2.5, '#c0f4ff');
  spLine(bx + 4, headY - 6, bx + 5, headY - 16, 2, '#a0e8ff');
  spCircle(bx, headY - 20, 2, '#ffffff');  // diamond gem

  // Ponytail — long flowing cyan hair
  for(let i = 0; i < 18; i++) {
    const sway = Math.sin(i * 0.3 + lean * 0.1) * 2;
    const w = Math.max(1, 4 - i / 5);
    spFill(bx - 2 + sway - lean * 0.5, headY + 5 + i * 1.8, w, 2, '#80d8ee');
  }

  // Eyes — wide cyan
  spFill(bx + 2, headY - 2, 4, 3, '#3bf0ff');
  spFill(bx + 4, headY - 3, 1, 1, '#ffffff'); // highlight
  // Mouth
  spFill(bx + 2, headY + 3, 3, 1, out);

  // Cape hint
  spLine(bx - 2, neckY, bx - 6 - lean, gy - 5, 3, '#3bf0ff30');
}

function drawCrimsonSprite(cx, gy, o) {
  const skin = '#f0d0b8', outfit = '#cc2244', dark = '#881430', accent = '#ff5566', out = '#440a18';
  const lean = o.lean || 0;
  const bx = cx + lean;

  // --- LEGS (lean, martial arts) ---
  const lx = bx - 6 + (o.lLegSpread||0), ly = gy - (o.lFootLift||0);
  const rx = bx + 6 + (o.rLegSpread||0), ry = gy - (o.rFootLift||0);
  spTrapezoid(bx - 3, gy - 30, 8, lx, ly, 6, outfit, out);
  spTrapezoid(bx + 3, gy - 30, 8, rx, ry, 6, outfit, out);
  spFill(lx - 3, ly - 2, 8, 4, dark); spFill(rx - 3, ry - 2, 8, 4, dark);

  // --- TORSO (lean V-shape, masculine) ---
  const neckY = gy - 54, pelvisY = gy - 30;
  spTrapezoid(bx, pelvisY, 12, bx, neckY, 16, outfit, out);
  spFill(bx - 8, neckY, 8, pelvisY - neckY, dark + '40');
  // Belt
  spFill(bx - 6, pelvisY - 1, 12, 2, '#222');
  spFill(bx - 1, pelvisY - 1, 3, 2, accent);  // belt buckle
  // Open collar / chest
  spFill(bx - 1, neckY + 2, 4, 6, skin);  // exposed chest V

  // --- ARMS (wrapped forearms) ---
  const shoulderY = neckY + 2;
  const lax = bx - 12 - (o.lArmExtend||0), rax = bx + 12 + (o.rArmExtend||0);
  const lay = shoulderY + 14 + Math.sin(o.lArmAngle||0) * 10;
  const ray = shoulderY + 14 + Math.sin(o.rArmAngle||0) * 10;
  spLine(bx - 8, shoulderY, lax, lay, 5, outfit);
  spLine(lax, lay, lax - 3, lay + 10, 5, '#ff8866'); // wrapped forearm
  spCircle(lax - 3, lay + 12, 3.5, skin);
  spLine(bx + 8, shoulderY, rax, ray, 5, outfit);
  spLine(rax, ray, rax + 3, ray + 10, 5, '#ff8866');
  spCircle(rax + 3, ray + 12, 3.5, skin);

  // --- HEAD ---
  const headY = neckY - 8 + (o.headY||0);
  spFill(bx - 2, neckY - 2, 4, 4, skin);
  spCircle(bx, headY, 7, skin);
  spCircle(bx, headY, 7.5, out + '60');

  // Flame hair — 5 prominent backward-swept spikes
  spLine(bx - 3, headY - 5, bx - 8, headY - 16, 3, '#ff6644');
  spLine(bx, headY - 6, bx - 4, headY - 22, 3.5, '#ff3860');
  spLine(bx + 2, headY - 5, bx - 1, headY - 18, 2.5, '#ff5533');
  spLine(bx + 4, headY - 4, bx + 1, headY - 14, 2, '#ff4444');
  spLine(bx + 5, headY - 2, bx + 4, headY - 10, 2, '#ff6644');

  // Eyes — narrow angry slits
  spFill(bx + 1, headY - 2, 5, 2, '#ff3860');
  // Mouth — determined
  spFill(bx + 2, headY + 3, 4, 1, out);

  // Waist sash trailing behind
  spLine(bx - 4, pelvisY, bx - 10 - lean, gy - 8, 2, '#ff386060');
}

function drawJadeSprite(cx, gy, o) {
  const skin = '#d8c0a0', outfit = '#2a6640', dark = '#1a4430', accent = '#44aa66', out = '#0a2218';
  const lean = o.lean || 0;
  const bx = cx + lean;

  // --- LEGS (thick, powerful, armored) ---
  const lx = bx - 8 + (o.lLegSpread||0), ly = gy - (o.lFootLift||0);
  const rx = bx + 8 + (o.rLegSpread||0), ry = gy - (o.rFootLift||0);
  spTrapezoid(bx - 4, gy - 32, 12, lx, ly, 9, outfit, out);
  spTrapezoid(bx + 4, gy - 32, 12, rx, ry, 9, outfit, out);
  // Shin armor plates
  spFill(lx - 4, ly - 12, 9, 10, accent + '80');
  spFill(rx - 4, ry - 12, 9, 10, accent + '80');
  // Heavy boots
  spFill(lx - 5, ly - 2, 10, 5, dark); spFill(lx - 5, ly - 2, 10, 1, out);
  spFill(rx - 5, ry - 2, 10, 5, dark); spFill(rx - 5, ry - 2, 10, 1, out);

  // --- TORSO (big hourglass, armored) ---
  const neckY = gy - 56, pelvisY = gy - 32;
  // Hips (wide for female)
  spEllipse(bx, pelvisY, 12, 5, outfit);
  // Waist
  spFill(bx - 7, pelvisY - 10, 14, 10, outfit);
  // Upper torso (broad shoulders)
  spTrapezoid(bx, pelvisY - 10, 14, bx, neckY, 22, outfit, out);
  spFill(bx - 11, neckY, 11, pelvisY - neckY, dark + '40');
  // Chest armor plate
  spFill(bx - 6, neckY + 4, 12, 10, accent + '50');
  spFill(bx - 6, neckY + 4, 12, 2, accent);
  // Belt
  spFill(bx - 8, pelvisY - 1, 16, 2, accent);
  // Shoulder armor pads
  spEllipse(bx - 11, neckY + 2, 6, 4, accent + '80');
  spEllipse(bx + 11, neckY + 2, 6, 4, accent + '80');

  // --- ARMS (thick, powerful) ---
  const shoulderY = neckY + 3;
  const lax = bx - 16 - (o.lArmExtend||0), rax = bx + 16 + (o.rArmExtend||0);
  const lay = shoulderY + 14 + Math.sin(o.lArmAngle||0) * 10;
  const ray = shoulderY + 14 + Math.sin(o.rArmAngle||0) * 10;
  spLine(bx - 11, shoulderY, lax, lay, 8, outfit);
  spLine(lax, lay, lax - 3, lay + 12, 7, skin);
  spCircle(lax - 3, lay + 14, 4.5, skin);   // big fist
  spLine(bx + 11, shoulderY, rax, ray, 8, outfit);
  spLine(rax, ray, rax + 3, ray + 12, 7, skin);
  spCircle(rax + 3, ray + 14, 4.5, skin);

  // --- HEAD (helmeted) ---
  const headY = neckY - 9 + (o.headY||0);
  spFill(bx - 3, neckY - 2, 6, 5, skin);
  spCircle(bx, headY, 9, skin);
  // Helmet
  spEllipse(bx, headY - 2, 10, 7, accent + '60');
  // Visor bar
  spFill(bx - 8, headY - 2, 16, 3, accent);
  spFill(bx - 8, headY - 2, 16, 1, out);
  // Helmet crest
  spFill(bx - 1, headY - 12, 3, 8, accent);

  // Ponytail out the back of helmet
  for(let i = 0; i < 10; i++) {
    const sway = Math.sin(i * 0.3) * 1.5;
    spFill(bx - 3 + sway - lean * 0.4, headY + 6 + i * 1.6, 3, 2, '#44ff88');
  }

  // Eyes — large green dot visible through visor
  spCircle(bx + 3, headY - 1, 2.5, '#44ff88');
  // Mouth
  spFill(bx + 1, headY + 3, 4, 1, out);
}

function drawNoirSprite(cx, gy, o) {
  const skin = '#d8c8a8', outfit = '#2a1840', dark = '#180c28', accent = '#6030a0', out = '#0c0618';
  const lean = o.lean || 0;
  const bx = cx + lean;

  // --- CLOAK (drawn first, behind everything) ---
  _sp.fillStyle = outfit + 'a0';
  _sp.beginPath();
  _sp.moveTo(bx - 10, gy - 50);
  _sp.quadraticCurveTo(bx - 14 - lean * 2, gy - 15, bx - 8 - lean * 3, gy + 2);
  _sp.lineTo(bx + 8 - lean, gy + 2);
  _sp.quadraticCurveTo(bx + 10 - lean, gy - 15, bx + 10, gy - 50);
  _sp.closePath();
  _sp.fill();
  _sp.strokeStyle = accent + '60';
  _sp.lineWidth = 1;
  _sp.stroke();

  // --- LEGS (thin, sleek) ---
  const lx = bx - 5 + (o.lLegSpread||0), ly = gy - (o.lFootLift||0);
  const rx = bx + 5 + (o.rLegSpread||0), ry = gy - (o.rFootLift||0);
  spTrapezoid(bx - 3, gy - 28, 6, lx, ly, 4, outfit, out);
  spTrapezoid(bx + 3, gy - 28, 6, rx, ry, 4, outfit, out);
  spFill(lx - 3, ly - 2, 6, 3, dark); spFill(rx - 3, ry - 2, 6, 3, dark);

  // --- TORSO (slim, dark) ---
  const neckY = gy - 52, pelvisY = gy - 28;
  spTrapezoid(bx, pelvisY, 10, bx, neckY, 13, outfit, out);
  spFill(bx - 6, neckY, 6, pelvisY - neckY, dark + '60');
  // Accent trim
  spFill(bx - 5, pelvisY - 1, 10, 1, accent);

  // --- ARMS (thin, wrist wraps glow) ---
  const shoulderY = neckY + 2;
  const lax = bx - 10 - (o.lArmExtend||0), rax = bx + 10 + (o.rArmExtend||0);
  const lay = shoulderY + 14 + Math.sin(o.lArmAngle||0) * 10;
  const ray = shoulderY + 14 + Math.sin(o.rArmAngle||0) * 10;
  spLine(bx - 6, shoulderY, lax, lay, 4, outfit);
  spLine(lax, lay, lax - 2, lay + 10, 3, '#cc80ff');  // glowing wrist wraps
  spCircle(lax - 2, lay + 12, 2.5, skin);
  spLine(bx + 6, shoulderY, rax, ray, 4, outfit);
  spLine(rax, ray, rax + 2, ray + 10, 3, '#cc80ff');
  spCircle(rax + 2, ray + 12, 2.5, skin);

  // --- HEAD (hooded, mysterious) ---
  const headY = neckY - 8 + (o.headY||0);
  spFill(bx - 2, neckY - 2, 4, 4, skin);
  spCircle(bx, headY, 7, skin);

  // Hood — larger than head, dark, pointed
  _sp.fillStyle = outfit;
  _sp.beginPath();
  _sp.ellipse(bx, headY - 1, 12, 10, 0, Math.PI, 0);
  _sp.fill();
  _sp.strokeStyle = accent;
  _sp.lineWidth = 1.5;
  _sp.beginPath();
  _sp.ellipse(bx, headY - 1, 12, 10, 0, Math.PI, 0);
  _sp.stroke();
  // Pointed tips
  spLine(bx - 11, headY - 1, bx - 14, headY - 8, 2, accent);
  spLine(bx + 11, headY - 1, bx + 14, headY - 8, 2, accent);

  // Eyes — glowing yellow from the shadow of the hood
  _sp.shadowColor = '#ffcc00';
  _sp.shadowBlur = 4;
  spFill(bx + 1, headY - 2, 3, 2, '#ffcc00');
  spFill(bx - 3, headY - 2, 3, 2, '#ffcc00');  // both eyes visible
  _sp.shadowBlur = 0;
  _sp.shadowColor = 'transparent';

  // No visible mouth — hidden in shadow
}

// ============================================================
// SPRITE GENERATION
// ============================================================
function generateSpritesForCharacter(charData) {
  const id = charData.id;
  spriteCache[id] = {};
  const drawFn = id === 'aurora' ? drawAuroraSprite
               : id === 'crimson' ? drawCrimsonSprite
               : id === 'jade' ? drawJadeSprite
               : id === 'noir' ? drawNoirSprite
               : drawAuroraSprite;  // fallback

  for(const [animName, animDef] of Object.entries(SPRITE_ANIMS)) {
    spriteCache[id][animName] = [];
    for(let frame = 0; frame < animDef.frames; frame++) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = SPRITE_W;
      offCanvas.height = SPRITE_H;
      _sp = offCanvas.getContext('2d');
      _sp.imageSmoothingEnabled = false;

      const offsets = getPoseOffsets(animName, frame, animDef.frames);
      drawFn(SPRITE_W / 2, SPRITE_H - 10, offsets);

      spriteCache[id][animName].push(offCanvas);
    }
  }
  _sp = null;
}

// ============================================================
// SPRITE DRAWING — stamps cached bitmap to main canvas
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
  const dy = f.y - SPRITE_DRAW_H + 18;

  if(flip) {
    ctx.translate(f.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-f.x, 0);
  }

  // Hurt flash — tint on a temp canvas so it conforms to character silhouette
  const isFlashing = f.hurtFlash > 0 && Math.floor(f.hurtFlash / 2) % 2 === 0;
  if(isFlashing) {
    const tmp = document.createElement('canvas');
    tmp.width = spriteCanvas.width;
    tmp.height = spriteCanvas.height;
    const tc = tmp.getContext('2d');
    tc.drawImage(spriteCanvas, 0, 0);
    tc.globalCompositeOperation = 'source-atop';
    tc.fillStyle = 'rgba(255,200,200,0.6)';
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

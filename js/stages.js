// ============================================================
// STAGES — per-stage background drawing + ring-out pit drawing
// Depends on globals: ctx, W, H, GROUND, globalTime, currentStage, PIT_FLOOR
// Called from the main render loop.
// Add new stages here + in STAGES array in index.html + in STAGE_PATTERNS in audio.js
// ============================================================

function drawScene() {
  if(currentStage && currentStage.id === 'dojo')    return drawDojoStage();
  if(currentStage && currentStage.id === 'inferno') return drawInfernoStage();
  return drawTwilightStage();
}

// ============================================================
// STAGE: TWILIGHT TOWER
// ============================================================
function drawTwilightStage() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#141a2e');
  grad.addColorStop(0.5, '#2a3050');
  grad.addColorStop(0.7, '#5a4060');
  grad.addColorStop(1, '#3a2030');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const mx = 820, my = 120;
  const g2 = ctx.createRadialGradient(mx, my, 0, mx, my, 140);
  g2.addColorStop(0, 'rgba(255,200,150,0.4)');
  g2.addColorStop(1, 'rgba(255,200,150,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(mx - 140, my - 140, 280, 280);
  ctx.fillStyle = '#ffe8cc';
  ctx.beginPath();
  ctx.arc(mx, my, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2a2f45';
  ctx.beginPath();
  ctx.moveTo(0, GROUND - 10);
  for(let i = 0; i <= W; i += 40) {
    const h = 180 + Math.sin(i * 0.01) * 40 + Math.sin(i * 0.03) * 20;
    ctx.lineTo(i, GROUND - 10 - h * 0.3);
  }
  ctx.lineTo(W, GROUND);
  ctx.lineTo(0, GROUND);
  ctx.fill();

  ctx.fillStyle = '#1a1f35';
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  for(let i = 0; i <= W; i += 30) {
    const h = 100 + Math.sin(i * 0.015 + 1) * 30 + Math.sin(i * 0.04) * 15;
    ctx.lineTo(i, GROUND - h * 0.4);
  }
  ctx.lineTo(W, GROUND);
  ctx.fill();

  const groundGrad = ctx.createLinearGradient(0, GROUND, 0, H);
  groundGrad.addColorStop(0, '#1a1018');
  groundGrad.addColorStop(1, '#0a0508');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND, W, H - GROUND);

  ctx.strokeStyle = 'rgba(255,200,150,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  ctx.lineTo(W, GROUND);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,150,100,0.06)';
  ctx.lineWidth = 1;
  for(let i = 0; i < 10; i++) {
    const t = i / 10;
    const y = GROUND + t * t * (H - GROUND);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

// ============================================================
// STAGE: OLD DOJO
// ============================================================
function drawDojoStage() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#2a1810');
  grad.addColorStop(0.6, '#5a3818');
  grad.addColorStop(1, '#3a200c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1a0e08';
  ctx.fillRect(0, 80, W, GROUND - 80);
  ctx.strokeStyle = '#7a5828';
  ctx.lineWidth = 3;
  ctx.strokeRect(60, 110, W - 120, GROUND - 130);
  ctx.lineWidth = 1;
  for(let x = 60; x <= W - 60; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x, GROUND - 20); ctx.stroke();
  }
  for(let y = 130; y <= GROUND - 30; y += 50) {
    ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(W - 60, y); ctx.stroke();
  }

  for(let i = 0; i < 4; i++) {
    const lx = 120 + i * 250;
    ctx.strokeStyle = '#3a2010';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 50); ctx.stroke();
    const flicker = 0.85 + Math.sin(globalTime * 0.1 + i) * 0.15;
    ctx.fillStyle = `rgba(255,180,80,${flicker})`;
    ctx.beginPath(); ctx.ellipse(lx, 65, 18, 22, 0, 0, Math.PI * 2); ctx.fill();
    const lg = ctx.createRadialGradient(lx, 65, 0, lx, 65, 70);
    lg.addColorStop(0, `rgba(255,200,120,${0.3 * flicker})`);
    lg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(lx - 70, 0, 140, 140);
  }

  const floorGrad = ctx.createLinearGradient(0, GROUND, 0, H);
  floorGrad.addColorStop(0, '#5a3818');
  floorGrad.addColorStop(1, '#2a1808');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.strokeStyle = 'rgba(40,20,10,0.8)';
  ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x, H); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,180,100,0.25)';
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
}

// ============================================================
// STAGE: INFERNO PIT
// ============================================================
function drawInfernoStage() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a0408');
  sky.addColorStop(0.5, '#3a0810');
  sky.addColorStop(0.85, '#7a2010');
  sky.addColorStop(1, '#ff6020');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0a0204';
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  ctx.lineTo(0, GROUND - 90);
  ctx.lineTo(180, GROUND - 230);
  ctx.lineTo(280, GROUND - 200);
  ctx.lineTo(420, GROUND - 280);
  ctx.lineTo(560, GROUND - 200);
  ctx.lineTo(720, GROUND - 240);
  ctx.lineTo(W, GROUND - 110);
  ctx.lineTo(W, GROUND);
  ctx.closePath();
  ctx.fill();

  for(let i = 0; i < 30; i++) {
    const ex = (i * 71 + (globalTime * 0.6) | 0) % W;
    const ey = ((i * 53 + GROUND) - (globalTime * 1.5 + i * 17)) % H;
    const adjEy = ey < 0 ? ey + H : ey;
    const f = (Math.sin(globalTime * 0.05 + i) + 1) * 0.5;
    ctx.fillStyle = `rgba(255,${120 + (f*100)|0},40,${0.3 + f*0.5})`;
    ctx.beginPath();
    ctx.arc(ex, adjEy, 1.5 + f, 0, Math.PI * 2);
    ctx.fill();
  }

  const lavaGrad = ctx.createLinearGradient(0, GROUND, 0, H);
  lavaGrad.addColorStop(0, '#ff6020');
  lavaGrad.addColorStop(0.4, '#ff9040');
  lavaGrad.addColorStop(1, '#ffcc60');
  ctx.fillStyle = lavaGrad;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.strokeStyle = 'rgba(20,5,0,0.6)';
  ctx.lineWidth = 2;
  for(let i = 0; i < 8; i++) {
    const x = (i * 130 + (globalTime * 0.3) % 130) - 50;
    ctx.beginPath();
    ctx.moveTo(x, GROUND + 10);
    ctx.lineTo(x + 30 + Math.sin(i) * 20, H);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,200,80,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
}

// ============================================================
// RING-OUT PIT — only drawn during the fall, varies per stage
// ============================================================
function drawPit() {
  if(currentStage && currentStage.id === 'inferno') return drawInfernoPit();
  if(currentStage && currentStage.id === 'dojo')    return drawDojoPit();
  return drawTwilightPit();
}

// --- Twilight alley: falls past city buildings, lands on a parked car
function drawTwilightPit() {
  const pitTop = GROUND + (H - GROUND);
  const pitBottom = pitTop + 3000;
  const g = ctx.createLinearGradient(0, pitTop, 0, pitBottom);
  g.addColorStop(0, '#0a0d18');
  g.addColorStop(0.3, '#0a0d18');
  g.addColorStop(1, '#03040a');
  ctx.fillStyle = g;
  ctx.fillRect(-500, pitTop, W + 1000, pitBottom - pitTop);

  ctx.fillStyle = '#0f1422';
  ctx.fillRect(-500, pitTop, 580, 3000);
  ctx.fillRect(W - 80, pitTop, 580, 3000);
  ctx.fillStyle = '#1a2236';
  ctx.fillRect(70, pitTop, 14, 3000);
  ctx.fillRect(W - 80, pitTop, 14, 3000);

  ctx.fillStyle = '#ffe080';
  for(let row = 0; row < 60; row++) {
    const yPos = pitTop + (row * 60) + ((globalTime * 0.5) % 60);
    if(yPos < pitTop || yPos > pitBottom) continue;
    for(let c = 0; c < 4; c++) {
      const lit = ((row * 7 + c * 13) % 5) > 1;
      if(lit) ctx.fillRect(8 + c * 18, yPos, 10, 16);
    }
    for(let c = 0; c < 4; c++) {
      const lit = ((row * 11 + c * 17) % 5) > 1;
      if(lit) ctx.fillRect(W - 70 + c * 18, yPos, 10, 16);
    }
  }

  for(let i = 0; i < 18; i++) {
    const lx = 90 + (i * 49) % (W - 180);
    const ly = pitTop + 800 + ((i * 91) % 1500);
    const flick = (Math.sin(globalTime * 0.1 + i) + 1) * 0.5;
    ctx.fillStyle = `rgba(180,200,255,${0.3 + flick * 0.4})`;
    ctx.fillRect(lx, ly, 2, 2);
  }
  const haze = ctx.createLinearGradient(0, PIT_FLOOR - 200, 0, PIT_FLOOR + 50);
  haze.addColorStop(0, 'rgba(140,160,200,0)');
  haze.addColorStop(1, 'rgba(140,160,200,0.25)');
  ctx.fillStyle = haze;
  ctx.fillRect(80, PIT_FLOOR - 200, W - 160, 250);

  const edgeGlow = ctx.createLinearGradient(0, pitTop - 40, 0, pitTop + 80);
  edgeGlow.addColorStop(0, 'rgba(255,100,40,0)');
  edgeGlow.addColorStop(0.5, 'rgba(255,100,40,0.35)');
  edgeGlow.addColorStop(1, 'rgba(255,100,40,0)');
  ctx.fillStyle = edgeGlow;
  ctx.fillRect(-500, pitTop - 40, W + 1000, 120);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for(let i = 0; i < 30; i++) {
    const lx = (i * 97 + (globalTime * 11) % 80) % (W + 200) - 100;
    const ly = pitTop + ((i * 137 + globalTime * 18) % (pitBottom - pitTop));
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx, ly + 60);
    ctx.stroke();
  }

  for(let i = 0; i < 14; i++) {
    const sx2 = (i * 233 + globalTime * 3) % W;
    const sy2 = pitTop + 200 + ((i * 87 + globalTime * 6) % 1400);
    ctx.fillStyle = 'rgba(255,160,80,0.25)';
    ctx.beginPath();
    ctx.arc(sx2, sy2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if(typeof PIT_FLOOR === 'number') {
    const floorY = PIT_FLOOR;
    const floorGrad = ctx.createLinearGradient(0, floorY - 60, 0, floorY + 200);
    floorGrad.addColorStop(0, 'rgba(40,10,0,0)');
    floorGrad.addColorStop(0.5, '#3a0c05');
    floorGrad.addColorStop(1, '#1a0400');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(-500, floorY - 60, W + 1000, 800);

    ctx.strokeStyle = 'rgba(255,90,30,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-500, floorY);
    for(let i = -500; i <= W + 500; i += 40) {
      const off = Math.sin(i * 0.03 + globalTime * 0.02) * 3;
      ctx.lineTo(i, floorY + off);
    }
    ctx.stroke();

    const glow = ctx.createLinearGradient(0, floorY - 30, 0, floorY + 30);
    glow.addColorStop(0, 'rgba(255,140,60,0)');
    glow.addColorStop(0.5, 'rgba(255,140,60,0.55)');
    glow.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-500, floorY - 30, W + 1000, 60);

    // Parked car at the bottom of the alley
    if(currentStage && currentStage.id === 'twilight') {
      const cx = W / 2 + Math.sin(globalTime * 0.005) * 30;
      const cy = floorY - 18;
      ctx.fillStyle = '#7a0c12';
      ctx.beginPath();
      ctx.moveTo(cx - 70, cy);
      ctx.lineTo(cx - 50, cy - 28);
      ctx.lineTo(cx + 50, cy - 28);
      ctx.lineTo(cx + 70, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a060a';
      ctx.fillRect(cx - 80, cy, 160, 22);
      ctx.fillStyle = '#ffe080';
      ctx.beginPath(); ctx.arc(cx - 60, cy + 18, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 60, cy + 18, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#aac4ff';
      ctx.fillRect(cx - 42, cy - 24, 38, 18);
      ctx.fillRect(cx + 6,  cy - 24, 38, 18);
    }
  }
}

// --- Dojo cellar: falls past wooden walls with paper lanterns, lands on tatami
function drawDojoPit() {
  const pitTop = GROUND + (H - GROUND);
  const g = ctx.createLinearGradient(0, pitTop, 0, pitTop + 1500);
  g.addColorStop(0, '#1a0f06');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(-500, pitTop, W + 1000, 3000);

  ctx.fillStyle = '#2a1408';
  for(let x = -500; x <= W + 500; x += 60) {
    const jagged = Math.sin(x * 0.1) * 6 + Math.cos(x * 0.07) * 4;
    ctx.fillRect(x, pitTop, 56, 16 + jagged);
  }
  ctx.strokeStyle = '#6a4020';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-500, pitTop);
  for(let x = -500; x <= W + 500; x += 14) {
    ctx.lineTo(x, pitTop + Math.sin(x * 0.3) * 2);
  }
  ctx.stroke();

  ctx.fillStyle = '#3a200c';
  ctx.fillRect(0, pitTop, 80, 3000);
  ctx.fillRect(W - 80, pitTop, 80, 3000);
  ctx.fillStyle = '#1a0a04';
  for(let y = pitTop - 100; y < pitTop + 3000; y += 80) {
    const offset = ((globalTime * 0.4) % 80);
    ctx.fillRect(0, y + offset, 80, 4);
    ctx.fillRect(W - 80, y + offset, 80, 4);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  for(let xx = 0; xx < 80; xx += 18) {
    ctx.beginPath(); ctx.moveTo(xx, pitTop); ctx.lineTo(xx, pitTop + 3000); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 80 + xx, pitTop); ctx.lineTo(W - 80 + xx, pitTop + 3000); ctx.stroke();
  }
  for(let i = 0; i < 6; i++) {
    const ly = pitTop + 220 + i * 250;
    const lx = (i % 2 === 0) ? 130 : W - 130;
    ctx.strokeStyle = '#1a0a04';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly - 80); ctx.lineTo(lx, ly); ctx.stroke();
    const flicker = 0.85 + Math.sin(globalTime * 0.1 + i) * 0.15;
    ctx.fillStyle = `rgba(255,170,80,${flicker})`;
    ctx.beginPath(); ctx.ellipse(lx, ly + 14, 18, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(140,60,20,${flicker})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(lx - 16, ly + 14); ctx.lineTo(lx + 16, ly + 14); ctx.stroke();
    const lg = ctx.createRadialGradient(lx, ly + 14, 0, lx, ly + 14, 90);
    lg.addColorStop(0, `rgba(255,200,120,${0.35 * flicker})`);
    lg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(lx - 90, ly - 30, 180, 130);
  }
  for(let i = 0; i < 50; i++) {
    const dx = 90 + (i * 113) % (W - 180);
    const dy = pitTop + ((i * 89 + globalTime * 1.2) % 1400);
    const f = (Math.sin(globalTime * 0.05 + i) + 1) * 0.5;
    ctx.fillStyle = `rgba(255,210,160,${0.2 + f * 0.3})`;
    ctx.fillRect(dx, dy, 2, 2);
  }

  if(typeof PIT_FLOOR === 'number') {
    const floorY = PIT_FLOOR;
    const floorGrad = ctx.createLinearGradient(0, floorY - 60, 0, floorY + 200);
    floorGrad.addColorStop(0, 'rgba(60,40,20,0)');
    floorGrad.addColorStop(0.4, '#5a4020');
    floorGrad.addColorStop(1, '#2a1808');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(-500, floorY - 60, W + 1000, 800);

    ctx.fillStyle = '#a08858';
    for(let x = -500; x < W + 500; x += 110) {
      ctx.fillRect(x, floorY, 100, 36);
    }
    ctx.strokeStyle = '#5a3818';
    ctx.lineWidth = 2;
    for(let x = -500; x < W + 500; x += 110) {
      ctx.strokeRect(x, floorY, 100, 36);
    }
    const lamp = ctx.createRadialGradient(W/2, floorY - 80, 20, W/2, floorY - 80, 220);
    lamp.addColorStop(0, 'rgba(255,200,120,0.25)');
    lamp.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(0, floorY - 280, W, 380);
  }
}

// --- Inferno cavern: falls past volcanic rock with magma cracks, lands in lava
function drawInfernoPit() {
  const pitTop = GROUND + (H - GROUND);
  const g = ctx.createLinearGradient(0, pitTop, 0, pitTop + 1200);
  g.addColorStop(0, '#3a0810');
  g.addColorStop(0.3, '#5a1408');
  g.addColorStop(0.7, '#a02810');
  g.addColorStop(1, '#ff5810');
  ctx.fillStyle = g;
  ctx.fillRect(-500, pitTop, W + 1000, 3000);

  ctx.fillStyle = '#1a0408';
  for(let y = pitTop; y < pitTop + 3000; y += 30) {
    const lJag = 60 + Math.sin(y * 0.04) * 18 + Math.cos(y * 0.07) * 10;
    const rJag = 60 + Math.sin(y * 0.04 + 1.5) * 18 + Math.cos(y * 0.06) * 12;
    ctx.fillRect(-200, y, lJag + 200, 32);
    ctx.fillRect(W - rJag, y, rJag + 200, 32);
  }
  ctx.strokeStyle = 'rgba(255,150,40,0.7)';
  ctx.lineWidth = 2;
  for(let i = 0; i < 20; i++) {
    const cy = pitTop + i * 150 + ((globalTime * 0.4) % 150);
    ctx.beginPath();
    ctx.moveTo(20, cy);
    ctx.lineTo(70 + Math.sin(i) * 20, cy + 30 + Math.sin(i*2) * 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W - 20, cy + 70);
    ctx.lineTo(W - 70 - Math.sin(i) * 20, cy + 100 + Math.cos(i*2) * 10);
    ctx.stroke();
  }
  for(let i = 0; i < 6; i++) {
    const vx = 100 + (i * 137) % (W - 200);
    const vy = pitTop + ((i * 211 + globalTime * 0.6) % 1400);
    const vg = ctx.createRadialGradient(vx, vy, 0, vx, vy, 80);
    vg.addColorStop(0, 'rgba(255,100,40,0.5)');
    vg.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(vx - 80, vy - 80, 160, 160);
  }

  ctx.strokeStyle = 'rgba(255,160,80,0.18)';
  ctx.lineWidth = 1;
  for(let i = 0; i < 30; i++) {
    const lx = 100 + (i * 97 + (globalTime * 11) % 80) % (W - 200) - 50;
    const ly = pitTop + ((i * 137 + globalTime * 18) % 1400);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx, ly + 80);
    ctx.stroke();
  }

  for(let i = 0; i < 40; i++) {
    const ex = (i * 71) % W;
    const ey = pitTop + ((i * 53 + globalTime * 2) % 1400);
    const f = (Math.sin(globalTime * 0.05 + i) + 1) * 0.5;
    ctx.fillStyle = `rgba(255,${130 + (f*100)|0},40,${0.4 + f*0.5})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 2 + f, 0, Math.PI * 2);
    ctx.fill();
  }

  if(typeof PIT_FLOOR === 'number') {
    const floorY = PIT_FLOOR;
    const glow = ctx.createLinearGradient(0, floorY - 120, 0, floorY);
    glow.addColorStop(0, 'rgba(255,140,60,0)');
    glow.addColorStop(1, 'rgba(255,200,80,0.7)');
    ctx.fillStyle = glow;
    ctx.fillRect(-500, floorY - 120, W + 1000, 130);

    const lava = ctx.createLinearGradient(0, floorY, 0, floorY + 200);
    lava.addColorStop(0, '#fff4a0');
    lava.addColorStop(0.2, '#ffaa30');
    lava.addColorStop(0.6, '#ff5010');
    lava.addColorStop(1, '#7a1004');
    ctx.fillStyle = lava;
    ctx.fillRect(-500, floorY, W + 1000, 1000);

    ctx.strokeStyle = '#ffe080';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for(let x = -500; x <= W + 500; x += 12) {
      const y = floorY + Math.sin(x * 0.04 + globalTime * 0.08) * 4 + Math.cos(x * 0.07 + globalTime * 0.05) * 3;
      if(x === -500) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    for(let i = 0; i < 6; i++) {
      const bx = ((i * 211) + globalTime * 0.7) % (W + 200) - 100;
      const phase = ((i * 0.13 + globalTime * 0.03) % 1);
      const br = phase * 14;
      ctx.fillStyle = `rgba(255,220,100,${1 - phase})`;
      ctx.beginPath();
      ctx.arc(bx, floorY + 30 - phase * 30, br, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ============================================================
// FALL SPEED LINES — Killer-Instinct-style radial whoosh
// Drawn in SCREEN space (after camera restore)
// ============================================================
function drawFallSpeedLines(intensity = 1) {
  const cx = W / 2, cy = H / 2;
  ctx.save();
  ctx.lineCap = 'round';
  const lineCount = 28;
  for(let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2 + (i * 0.61);
    const phase = ((globalTime * 0.022 + i * 0.137) % 1);
    const innerR = 30 + phase * 720;
    const lineLen = 90 + phase * 260;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const x1 = cx + cosA * innerR;
    const y1 = cy + sinA * innerR;
    const x2 = cx + cosA * (innerR + lineLen);
    const y2 = cy + sinA * (innerR + lineLen);
    const alpha = Math.sin(phase * Math.PI) * 0.55 * intensity;
    if(alpha < 0.02) continue;
    ctx.strokeStyle = `rgba(220,220,225,${alpha})`;
    ctx.lineWidth = 1 + phase * 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

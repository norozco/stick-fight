// ============================================================
// PARTICLES
// ============================================================
const particles = [];
function spawnParticle(p) { particles.push(p); }
function spawnHitSpark(x, y, color = '#ffee55', count = 14, power = 1) {
  for(let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (Math.random() * 5 + 3) * power;
    spawnParticle({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 1,
      life: 20 + Math.random() * 12,
      maxLife: 30,
      size: Math.random() * 4 + 2,
      color,
      type: 'spark',
      grav: 0.2,
    });
  }
  spawnParticle({
    x, y, vx: 0, vy: 0,
    life: 14, maxLife: 14,
    size: 6, color,
    type: 'ring',
    power,
  });
}
function spawnStar(x, y, color, power = 1.5) {
  spawnParticle({
    type: 'star',
    x, y, vx: 0, vy: 0,
    life: 20, maxLife: 20,
    size: 10,
    color, power,
    angle: Math.random() * Math.PI,
  });
}
function spawnDust(x, y, dir = 0) {
  for(let i = 0; i < 4; i++) {
    spawnParticle({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 2,
      vx: (Math.random() - 0.5) * 2 + dir * 1.5,
      vy: -Math.random() * 2 - 1,
      life: 18,
      maxLife: 18,
      size: Math.random() * 4 + 3,
      color: 'rgba(200,190,170,0.6)',
      type: 'dust',
      grav: 0.08,
    });
  }
}
function spawnAfterimage(fighter, opacity = 0.5) {
  spawnParticle({
    type: 'afterimage',
    snapshot: captureFighterPose(fighter),
    life: 14, maxLife: 14,
    color: fighter.color,
    opacity,
  });
}
function spawnDamageNumber(x, y, dmg, color = '#fff', big = false) {
  spawnParticle({
    type: 'damage',
    x, y, vx: (Math.random() - 0.5) * 2, vy: -3,
    life: 50, maxLife: 50,
    text: Math.round(dmg) + '',
    color,
    big,
  });
}
function spawnCombo(x, y, n, color = '#ffcc00') {
  spawnParticle({
    type: 'combo',
    x, y, vx: 0, vy: -1,
    life: 50, maxLife: 50,
    text: n + ' HIT',
    color,
  });
}
function spawnStreak(x, y, fc, color) {
  spawnParticle({
    type: 'streak',
    x, y,
    vx: fc * 6,
    vy: (Math.random() - 0.5) * 2,
    life: 14, maxLife: 14,
    length: 40 + Math.random() * 30,
    color,
  });
}
function updateParticles() {
  for(let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life--;
    if(p.type === 'spark' || p.type === 'dust' || p.type === 'damage' || p.type === 'combo' || p.type === 'streak') {
      p.x += p.vx;
      p.y += p.vy;
      if(p.grav) p.vy += p.grav;
      if(p.type === 'damage' || p.type === 'combo') p.vy += 0.08;
      if(p.type === 'streak') { p.vx *= 0.9; }
    }
    if(p.type === 'ring') p.size += p.power * 3;
    if(p.type === 'star') p.size += p.power * 1.8;
    if(p.life <= 0) particles.splice(i, 1);
  }
}
function drawParticles() {
  for(const p of particles) {
    const a = p.life / p.maxLife;
    if(p.type === 'spark') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    } else if(p.type === 'dust') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a * 0.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if(p.type === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3 * a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if(p.type === 'star') {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(let j = 0; j < 8; j++) {
        const r = j % 2 === 0 ? p.size : p.size * 0.4;
        const ang = (j / 8) * Math.PI * 2;
        if(j === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
        else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if(p.type === 'afterimage') {
      ctx.globalAlpha = a * (p.opacity || 0.5);
      renderStoredPose(p.snapshot, p.color, 1);
    } else if(p.type === 'streak') {
      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * a;
      ctx.globalAlpha = a * 0.7;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
      ctx.stroke();
      ctx.restore();
    } else if(p.type === 'damage') {
      ctx.globalAlpha = Math.min(1, a * 2);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = p.big ? 5 : 3;
      ctx.font = p.big ? 'italic 900 40px Inter' : 'italic 900 26px Inter';
      ctx.textAlign = 'center';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    } else if(p.type === 'combo') {
      ctx.globalAlpha = Math.min(1, a * 2);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.font = 'italic 900 34px Inter';
      ctx.textAlign = 'center';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}

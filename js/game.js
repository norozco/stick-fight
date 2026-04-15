// ============================================================
// GAME — main loop, state machine, input, menu/setup/pause UI
// ============================================================

// Camera shake helper
// CAMERA & SHAKE
// ============================================================
function shake(mag, time) {
  shakeMag = Math.max(shakeMag, mag);
  shakeTime = Math.max(shakeTime, time);
}

// ============================================================
// GROUND CRACKS — terrain damage left by fatal-blow slams
// ============================================================
// Cracks are radial break-lines at the impact point. They stay until
// the next round resets (resetRound clears the groundCracks array).
function spawnGroundCrack(x, strength = 1) {
  const crack = {
    x, y: GROUND,
    born: globalTime,
    strength,                    // scales size & branch count
    lines: [],
  };
  const branchCount = 6 + Math.floor(strength * 4);
  for(let i = 0; i < branchCount; i++) {
    const baseAng = (Math.random() * 0.8 - 0.4) + (i % 2 === 0 ? -Math.PI/2 : -Math.PI/2 + (Math.random()*0.6 - 0.3));
    // Spread roughly left/right along the ground with some downward bias
    const ang = (Math.random() * Math.PI) - Math.PI/2;    // -90° .. +90° on horizontal
    const len = (30 + Math.random() * 70) * strength;
    const segs = [];
    let cx = 0, cy = 0;
    let a = ang;
    const steps = 4 + Math.floor(Math.random() * 3);
    for(let s = 0; s < steps; s++) {
      const segLen = len / steps;
      a += (Math.random() * 0.6 - 0.3);
      cx += Math.cos(a) * segLen;
      cy += Math.sin(a) * segLen * 0.15; // keep mostly horizontal at ground
      segs.push({ x: cx, y: cy });
    }
    crack.lines.push(segs);
  }
  groundCracks.push(crack);

  // Debris particles flying up from the crack
  for(let i = 0; i < 24 * strength; i++) {
    const a = -Math.PI/2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const v = Math.random() * 8 + 4;
    spawnParticle({
      type: 'dust',
      x: x + (Math.random() - 0.5) * 30,
      y: GROUND,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 45, maxLife: 45,
      size: Math.random() * 5 + 3,
      color: 'rgba(80,50,40,0.8)',
      grav: 0.35,
    });
  }
  // Orange sparks for heat
  for(let i = 0; i < 14 * strength; i++) {
    const a = -Math.PI/2 + (Math.random() - 0.5) * Math.PI * 0.7;
    const v = Math.random() * 10 + 5;
    spawnParticle({
      type: 'spark',
      x, y: GROUND - 2,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 30, maxLife: 30,
      size: Math.random() * 3 + 2,
      color: '#ff8840',
      grav: 0.3,
    });
  }
}

function drawGroundCracks() {
  if(!groundCracks || groundCracks.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for(const c of groundCracks) {
    const age = globalTime - c.born;
    // Cracks glow warm for the first ~60 frames, then fade to flat dark lines
    const glow = Math.max(0, 1 - age / 60);
    // Dark base
    ctx.strokeStyle = '#0a0408';
    ctx.lineWidth = 3 * c.strength;
    ctx.translate(c.x, c.y);
    for(const segs of c.lines) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for(const p of segs) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    // Warm glow on top (fades)
    if(glow > 0.02) {
      ctx.strokeStyle = `rgba(255,140,40,${glow * 0.9})`;
      ctx.lineWidth = 1.6 * c.strength;
      for(const segs of c.lines) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for(const p of segs) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }
    ctx.translate(-c.x, -c.y);
  }
  ctx.restore();
}

// ============================================================
// FATAL BLOW — MK-style multi-phase cinematic finisher
// ============================================================
// Triggered when the hit that ends a round was (a) the ult finisher or
// (b) the capstone of a combo ≥ 5. Drives ~2.7s of camera cuts, flashes,
// slow-mo, shake, text overlays, and fire particles around the winner.
// Non-epic KOs skip this and go straight to the existing replay system.

// Character-specific battle cries, used as the mid-cinematic Beat-2 taunt.
const FATAL_TAUNTS = {
  aurora:  { text: 'OUT OF TIME!',   voice: 'Out of time!'   },
  crimson: { text: 'BURN!',          voice: 'Burn!'          },
  jade:    { text: 'SHATTERED!',     voice: 'Shattered!'     },
  noir:    { text: "YOU'RE MINE!",   voice: 'You are mine!'  },
};

function handleKO(loser, winner, winnerIdx) {
  if(canRingOut(loser, winnerIdx)) { triggerRingOut(loser, winnerIdx); return; }

  const wasUlt = winner.state === 'attack' && winner.attackType === 'ult';
  const wasLongCombo = (winner.combo || 0) >= 5;

  if(!(wasUlt || wasLongCombo)) {
    startReplay(winnerIdx);
    return;
  }
  runFatalBlow(winner, loser, winnerIdx, wasUlt ? 'ult' : 'combo');
}

// Spawn a ring of warm particles around a fighter for the finisher glow.
function spawnFatalEmbers(f, count = 30, color = '#ff6020') {
  for(let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * 4 + 2;
    spawnParticle({
      type: 'spark',
      x: f.x + Math.cos(a) * 30,
      y: f.y - 50 + Math.sin(a) * 40,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 2,
      life: 30 + Math.random() * 20, maxLife: 50,
      size: Math.random() * 4 + 2,
      color, grav: -0.05,
    });
  }
}

function runFatalBlow(winner, loser, winnerIdx, reason) {
  state = 'fatalBlow';
  const midX = (winner.x + loser.x) / 2;
  const midY = (winner.y + loser.y) / 2 - 40;
  const winId = winner.character && winner.character.id;
  const taunt = FATAL_TAUNTS[winId] || { text: 'FINISHED!', voice: 'Finished!' };
  // Direction the winner faces toward the loser (−1 or +1)
  const fc = loser.x > winner.x ? 1 : -1;
  // Impact point on the stage floor — where the loser will be slammed
  const slamX = winner.x + fc * 70;

  // ---------- BEAT 1 — IMPACT (0 ms) ----------
  // Hard cut on winner, screen flashes red, dutch tilt begins.
  cameraTargetZoom = 2.1;
  cameraTargetX = winner.x;
  cameraTargetY = winner.y - 40;
  cameraX = cameraTargetX; cameraY = cameraTargetY;
  cameraZoom = 2.1;
  cameraTargetAngle = -fc * 0.08;       // subtle dutch tilt
  hitstop  = 22;
  slowMo   = 260;
  flashTime = 28; flashAlpha = 1.0; flashColor = '255,40,40';
  ultTargetDarken = 0.7;
  ultDarken = 0.7;
  shake(36, 30);
  announce('FATAL BLOW!', 110);
  spawnFatalEmbers(winner, 40, '#ff4020');
  try { Audio.ultFinisher(); } catch(e){}

  // ---------- BEAT 2 — GRAB + TILT (550 ms) ----------
  // Camera tilts further, snaps to loser, character taunt fires.
  setTimeout(() => {
    if(state !== 'fatalBlow') return;
    cameraTargetZoom = 2.4;
    cameraTargetX = loser.x;
    cameraTargetY = loser.y - 55;
    cameraX = cameraTargetX; cameraY = cameraTargetY;
    cameraZoom = 2.4;
    cameraTargetAngle = -fc * 0.22;     // full dutch tilt
    flashTime = 22; flashAlpha = 0.75; flashColor = '255,120,40';
    shake(20, 22);
    hitstop = 14;
    announce(taunt.text, 50);
    // Lift the loser into the air in prep for the slam
    loser.y = GROUND - 130;
    loser.x = winner.x + fc * 50;
    loser.onGround = false;
    spawnFatalEmbers(loser, 20, '#ff8040');
    try { Audio.heavy(); } catch(e){}
    try { Audio.say(taunt.voice, { interrupt: true }); } catch(e){}
  }, 550);

  // ---------- BEAT 3 — SLAM INTO THE GROUND (1300 ms) ----------
  // Whip rotate camera the opposite way, drive loser into the floor,
  // punch a crack into the terrain with massive shockwave + debris.
  setTimeout(() => {
    if(state !== 'fatalBlow') return;
    // Place the loser at the impact point, face-down on the ground
    loser.x = slamX;
    loser.y = GROUND;
    loser.onGround = true;
    loser.vx = 0; loser.vy = 0;
    loser.hurtFlash = 30;

    cameraTargetZoom = 1.8;
    cameraTargetX = slamX;
    cameraTargetY = GROUND - 30;
    cameraX = slamX; cameraY = GROUND - 30;
    cameraZoom = 1.8;
    // WHIP ROTATE to the opposite tilt — camera reacts to the slam
    cameraTargetAngle = fc * 0.18;
    cameraAngle = -fc * 0.22;             // snap to carry-over angle before whipping

    hitstop = 34;
    slowMo = Math.max(slowMo, 200);
    flashTime = 52; flashAlpha = 1.0; flashColor = '255,248,200';
    ultTargetDarken = 0.85; ultDarken = 0.85;
    shake(54, 44);

    // Crack the terrain + heavy debris + sparks
    spawnGroundCrack(slamX, 1.4);
    spawnGroundCrack(slamX - 40, 0.6);
    spawnGroundCrack(slamX + 40, 0.6);
    // Radial shockwave at impact height
    spawnHitSpark(slamX, GROUND - 4, '#ffcc00', 70, 3.6);
    spawnStar(slamX, GROUND - 4, '#ffee00', 5);
    spawnParticle({
      type: 'ring', x: slamX, y: GROUND - 4, vx: 0, vy: 0,
      life: 22, maxLife: 22, size: 8, color: '#ff8828', power: 4,
    });
    announce('FINISHED!', 140);
    try { Audio.ultFinisher(); } catch(e){}
    try { Audio.bounce && Audio.bounce(); } catch(e){}
  }, 1300);

  // ---------- BEAT 4 — SETTLE (2100 ms) ----------
  // Camera untilts, pulls back, ember rain, victor voice line.
  setTimeout(() => {
    if(state !== 'fatalBlow') return;
    cameraTargetZoom = 1.25;
    cameraTargetAngle = 0;
    ultTargetDarken = 0.4;
    spawnFatalEmbers(winner, 25, '#ff8040');
    try { Audio.say(winnerIdx === 1 ? 'Player one!' : (mode === 'cpu' ? 'C P U!' : 'Player two!'), { interrupt: true }); } catch(e){}
  }, 2100);

  // ---------- BEAT 5 — RESOLVE (2900 ms) ----------
  setTimeout(() => {
    cameraTargetZoom = 1.0;
    cameraTargetAngle = 0;
    ultTargetDarken = 0;
    state = 'playing';
    endRound(winnerIdx);
  }, 2900);
}


// Input helpers
// GAME LOGIC
// ============================================================
let p1, p2;

function makeInput() {
  return { left: false, right: false, jumpPressed: false, block: false,
    lightPressed: false, heavyPressed: false, throwPressed: false,
    dashPressed: false, ultPressed: false };
}

function getP1Input() {
  const i = makeInput();
  i.left = !!keys['a'];
  i.right = !!keys['d'];
  i.jumpPressed = !!keyPressed['w'];
  i.block = !!keys['s'];
  i.lightPressed = !!keyPressed['f'];
  i.heavyPressed = !!keyPressed['g'];
  i.throwPressed = !!keyPressed['t'];
  i.dashPressed = !!keyPressed['q'];
  i.ultPressed = !!keyPressed['r'];
  return i;
}
function getP2Input() {
  const i = makeInput();
  i.left = !!keys['arrowleft'];
  i.right = !!keys['arrowright'];
  i.jumpPressed = !!keyPressed['arrowup'];
  i.block = !!keys['arrowdown'];
  i.lightPressed = !!keyPressed['k'];
  i.heavyPressed = !!keyPressed['l'];
  i.throwPressed = !!keyPressed["'"];
  i.dashPressed = !!keyPressed[';'];
  i.ultPressed = !!keyPressed['enter'];
  return i;
}

// Round lifecycle
function resetRound() {
  if(!p1) {
    p1 = new Fighter(280, p1Char.color, 1, false, p1Char.glow);
    p2 = new Fighter(720, p2Char.color, -1, true, p2Char.glow);
    p1.character = p1Char; p2.character = p2Char;
    p1.maxHp = p1Char.hp; p2.maxHp = p2Char.hp;
    p1.speedMult = p1Char.speed; p2.speedMult = p2Char.speed;
    p1.dmgMult = p1Char.dmg; p2.dmgMult = p2Char.dmg;
  } else {
    p1.reset(280, 1);
    p2.reset(720, -1);
  }
  p1.hp = p1.maxHp;
  p2.hp = p2.maxHp;
  roundTime = 99;
  lastSecond = performance.now();
  particles.length = 0;
  hitstop = 0;
  shakeMag = 0;
  shakeTime = 0;
  flashTime = 0;
  ultDarken = 0;
  ultTargetDarken = 0;
  cameraTargetZoom = 1;
  cameraZoom = 1;
  cameraAngle = 0; cameraTargetAngle = 0;
  groundCracks.length = 0;            // fresh stage each round
  // Voice + text: ROUND N appears first, then FIGHT! after a beat
  const roundNum = roundsWon[0] + roundsWon[1] + 1;
  announce('ROUND ' + roundNum, 80);
  setTimeout(() => Audio.say('Round ' + roundNum, { interrupt: true }), 100);
  setTimeout(() => {
    announce('FIGHT!', 60);
    Audio.say('Fight!', { interrupt: true });
  }, 1300);
}

// Menu / setup / stage-picker flow
function startGame(m) {
  mode = m;
  if(mode === '2p') document.getElementById('p2name').textContent = 'PLAYER 2';
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('over').classList.add('hidden');
  showSetup();
}

function showSetup() {
  setupPhase = 'p1';
  const setup = document.getElementById('setup');
  const grid = document.getElementById('charGrid');
  const stageRow = document.getElementById('stageRow');
  const stageGrid = document.getElementById('stageGrid');
  setup.classList.remove('hidden');
  document.getElementById('setupSubtitle').textContent = 'PLAYER 1 — PICK YOUR FIGHTER';
  stageRow.style.display = 'none';

  grid.innerHTML = '';
  CHARACTERS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--card-glow', c.glow);
    card.innerHTML = `
      <svg width="86" height="100" viewBox="0 0 86 100">
        <g stroke="${c.color}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="drop-shadow(0 0 4px ${c.glow})">
          <circle cx="43" cy="20" r="10"/>
          <line x1="43" y1="30" x2="43" y2="60"/>
          <line x1="43" y1="38" x2="28" y2="50"/>
          <line x1="43" y1="38" x2="58" y2="50"/>
          <line x1="43" y1="60" x2="32" y2="84"/>
          <line x1="43" y1="60" x2="54" y2="84"/>
        </g>
      </svg>
      <div class="card-name" style="color:${c.glow}">${c.name}</div>
      <div class="card-stats">${c.desc}<br>HP ${c.hp} · SPD ${(c.speed*100|0)}% · DMG ${(c.dmg*100|0)}%</div>
    `;
    card.onclick = () => pickCharacter(c, card);
    grid.appendChild(card);
  });

  stageGrid.innerHTML = '';
  STAGES.forEach(s => {
    const card = document.createElement('div');
    card.className = 'card stage-card';
    card.style.setProperty('--card-glow', '#ffcc00');
    card.innerHTML = stagePreviewSVG(s) + `<div class="card-name" style="color:#ffcc00">${s.name}</div>`;
    card.onclick = () => pickStage(s);
    stageGrid.appendChild(card);
  });
}

function stagePreviewSVG(s) {
  if(s.id === 'twilight') return `<svg width="180" height="80" viewBox="0 0 180 80"><defs><linearGradient id="t1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2040"/><stop offset="1" stop-color="#5a3060"/></linearGradient></defs><rect width="180" height="80" fill="url(#t1)"/><circle cx="140" cy="22" r="8" fill="#ffe8cc"/><polygon points="0,80 30,50 60,80" fill="#1a1f35"/><polygon points="60,80 90,40 130,80" fill="#1a1f35"/><polygon points="130,80 160,55 180,80" fill="#1a1f35"/></svg>`;
  if(s.id === 'dojo') return `<svg width="180" height="80" viewBox="0 0 180 80"><rect width="180" height="80" fill="#3a2410"/><rect y="60" width="180" height="20" fill="#5a3818"/><rect x="20" y="20" width="140" height="40" fill="#2a1808" stroke="#7a5828" stroke-width="2"/><line x1="20" y1="40" x2="160" y2="40" stroke="#7a5828" stroke-width="1"/><line x1="60" y1="20" x2="60" y2="60" stroke="#7a5828"/><line x1="120" y1="20" x2="120" y2="60" stroke="#7a5828"/></svg>`;
  return `<svg width="180" height="80" viewBox="0 0 180 80"><rect width="180" height="80" fill="#0a0508"/><rect y="55" width="180" height="25" fill="#3a0c05"/><line x1="0" y1="55" x2="180" y2="55" stroke="#ff6600" stroke-width="2"/><circle cx="40" cy="20" r="3" fill="#ff8800"/><circle cx="120" cy="30" r="2" fill="#ffaa00"/><circle cx="80" cy="15" r="2" fill="#ff8800"/></svg>`;
}

function pickCharacter(c, card) {
  if(setupPhase === 'p1') {
    p1Char = c;
    document.querySelectorAll('#charGrid .card').forEach(el => el.classList.remove('picked-p1'));
    card.classList.add('picked-p1');
    Audio.say(c.name, { interrupt: true, character: c.id });
    if(mode === 'cpu') {
      // CPU picks a random different character
      const others = CHARACTERS.filter(x => x.id !== c.id);
      p2Char = others[(Math.random() * others.length) | 0];
      const p2card = [...document.querySelectorAll('#charGrid .card')][CHARACTERS.indexOf(p2Char)];
      p2card.classList.add('picked-p2');
      setupPhase = 'stage';
    } else {
      setupPhase = 'p2';
    }
  } else if(setupPhase === 'p2') {
    p2Char = c;
    document.querySelectorAll('#charGrid .card').forEach(el => el.classList.remove('picked-p2'));
    card.classList.add('picked-p2');
    Audio.say(c.name, { interrupt: true, character: c.id });
    setupPhase = 'stage';
  }

  if(setupPhase === 'p2') {
    document.getElementById('setupSubtitle').textContent = 'PLAYER 2 — PICK YOUR FIGHTER';
  } else if(setupPhase === 'stage') {
    document.getElementById('setupSubtitle').textContent = 'PICK YOUR ARENA';
    document.getElementById('stageRow').style.display = 'block';
  }
}

function pickStage(s) {
  currentStage = s;
  Audio.musicSetStage(s.id);
  Audio.say(s.name, { interrupt: true });
  document.getElementById('setup').classList.add('hidden');
  showLoadingScreen(() => {
    roundsWon = [0, 0];
    updateRoundDots();
    p1 = null; p2 = null;
    resetRound();
    state = 'playing';
    lastSecond = performance.now();
    Audio.musicStart(false);
    requestAnimationFrame(loop);
  });
}

function showLoadingScreen(onDone) {
  const ld = document.getElementById('loading');
  const bar = document.getElementById('loadbar');
  const txt = document.getElementById('loadtext');
  ld.classList.remove('hidden');
  bar.style.width = '0%';
  txt.textContent = 'LOADING';
  let p = 0;
  const tick = setInterval(() => {
    p += 4 + Math.random() * 6;
    if(p >= 100) {
      p = 100;
      clearInterval(tick);
      bar.style.width = '100%';
      txt.textContent = 'READY?';
      Audio.ko();   // little jingle for the menu before fight
      setTimeout(() => {
        txt.textContent = 'FIGHT!';
        setTimeout(() => {
          ld.classList.add('hidden');
          onDone();
        }, 500);
      }, 600);
    } else {
      bar.style.width = p + '%';
    }
  }, 40);
}

function updateRoundDots() {
  document.getElementById('p1r1').classList.toggle('won', roundsWon[0] >= 1);
  document.getElementById('p1r2').classList.toggle('won', roundsWon[0] >= 2);
  document.getElementById('p2r1').classList.toggle('won', roundsWon[1] >= 1);
  document.getElementById('p2r2').classList.toggle('won', roundsWon[1] >= 2);
}

let announceText = '';
let announceTimer = 0;
let announceScale = 0;

function announce(text, frames = 90) {
  announceText = text;
  announceTimer = frames;
  announceScale = 0;
}

// End-of-round handling
function endRound(winner) {
  if(state !== 'playing') return;
  state = 'roundover';
  Audio.ko();
  Audio.musicStop();
  slowMo = 50;
  shake(14, 22);

  if(winner === 0) {
    announce('DRAW', 120);
    Audio.say('Draw!', { interrupt: true });
  } else {
    roundsWon[winner - 1]++;
    updateRoundDots();
    // Achievement: PERFECT (winner took no damage) — bonus pop-up before main announce
    const winFighter = winner === 1 ? p1 : p2;
    if(winFighter && winFighter.hp >= winFighter.maxHp) {
      announce('PERFECT!', 70);
      setTimeout(() => Audio.say('Perfect!', { interrupt: true }), 200);
      setTimeout(() => announce(winner === 1 ? 'PLAYER 1 WINS' : (mode === 'cpu' ? 'CPU WINS' : 'PLAYER 2 WINS'), 120), 1100);
    } else {
      announce(winner === 1 ? 'PLAYER 1 WINS' : (mode === 'cpu' ? 'CPU WINS' : 'PLAYER 2 WINS'), 120);
    }
    setTimeout(() => Audio.say('K O!', { interrupt: true }), 450);
    // "One more round!" line if winner has 1 round, loser has 0 (about to clinch)
    if(roundsWon[winner - 1] === 1 && roundsWon[winner === 1 ? 1 : 0] === 0) {
      setTimeout(() => Audio.say('One more round!', { interrupt: true }), 1700);
    } else if(roundsWon[winner - 1] >= 2) {
      // Achievement: FLAWLESS — winner won 2-0 without losing a round
      const loserIdx = winner === 1 ? 1 : 0;
      const flawless = roundsWon[loserIdx] === 0;
      if(flawless) {
        setTimeout(() => announce('FLAWLESS VICTORY!', 140), 1700);
        setTimeout(() => Audio.say('Flawless victory!', { interrupt: true }), 1800);
      }
      // Match-winning round — fanfare + voice
      setTimeout(() => {
        if(mode === 'cpu' && winner === 2) Audio.youLose();
        else Audio.youWin();
      }, 1200);
      setTimeout(() => Audio.say('You win!', { interrupt: true }), flawless ? 3500 : 2400);
    }
  }
  setTimeout(() => {
    if(roundsWon[0] >= 2 || roundsWon[1] >= 2) {
      state = 'matchover';
      const w = roundsWon[0] >= 2 ? 'PLAYER 1' : (mode === 'cpu' ? 'CPU' : 'PLAYER 2');
      document.getElementById('winner').textContent = w + ' WINS';
      document.getElementById('over').classList.remove('hidden');
      Audio.musicStart(true);   // play-again / win-screen music — intense variant
    } else {
      resetRound();
      state = 'playing';
      Audio.musicStart(false);   // resume music for the next round
    }
  }, 2500);
}

// ============================================================

// Play-again / menu / pause / mute
// ============================================================
function playAgain() {
  Audio.musicStop();
  document.getElementById('over').classList.add('hidden');
  startGame(mode);
}
function backToMenu() {
  Audio.musicStop();
  document.getElementById('over').classList.add('hidden');
  document.getElementById('menu').classList.remove('hidden');
  state = 'menu';
}
function toggleMute() {
  const m = !Audio.isMuted();
  Audio.setMute(m);
  document.getElementById('muteBtn').textContent = m ? 'SOUND OFF' : 'SOUND ON';
}
addEventListener('keydown', e => {
  if(e.key === 'm' || e.key === 'M') toggleMute();
  if(e.key === 'Escape' && state === 'playing') pauseGame();
  else if(e.key === 'Escape' && state === 'paused') resumeGame();
  // Quick-rematch: any non-modifier key on the win screen
  if(state === 'matchover' && !document.getElementById('over').classList.contains('hidden')
      && e.key !== 'Escape' && e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') {
    e.preventDefault();
    playAgain();
  }
});

let prePauseState = null;
function pauseGame() {
  if(state !== 'playing') return;
  prePauseState = state;
  state = 'paused';
  document.getElementById('pause').classList.remove('hidden');
  Audio.musicStop();
}
function resumeGame() {
  if(state !== 'paused') return;
  document.getElementById('pause').classList.add('hidden');
  state = prePauseState || 'playing';
  prePauseState = null;
  Audio.musicStart(false);
  lastSecond = performance.now();
  requestAnimationFrame(loop);
}
function restartMatch() {
  document.getElementById('pause').classList.add('hidden');
  Audio.musicStop();
  state = 'menu';
  showSetup();
}
function quitToMenu() {
  document.getElementById('pause').classList.add('hidden');
  backToMenu();
}

// ============================================================

// Main render + update loop
// MAIN LOOP
// ============================================================
function loop(now) {
  if(state === 'matchover') return;
  globalTime++;

  // Slow-mo controls update cadence
  const inSlow = slowMo > 0;
  const doUpdate = !inSlow || (globalTime % 2 === 0);
  if(slowMo > 0) slowMo--;

  // Duck music at the moment hitstop begins (impact emphasis)
  if(hitstop > 0 && lastHitstop === 0) {
    const intensity = hitstop > 10 ? 0.10 : hitstop > 6 ? 0.20 : 0.30;
    Audio.musicDuck(intensity, hitstop * 0.012);
  }
  lastHitstop = hitstop;
  if(hitstop > 0) {
    hitstop--;
  } else if(state === 'playing' && doUpdate) {
    if(mode === 'training') {
      // Training: regen HP, no timer, no KO
      if(p1.hp < p1.maxHp) p1.hp = Math.min(p1.maxHp, p1.hp + 0.5);
      if(p2.hp < p2.maxHp) p2.hp = Math.min(p2.maxHp, p2.hp + 0.5);
      // Refill ult at moderate rate too
      if(p1.ult < p1.maxUlt) p1.ult = Math.min(p1.maxUlt, p1.ult + 0.4);
      if(p2.ult < p2.maxUlt) p2.ult = Math.min(p2.maxUlt, p2.ult + 0.4);
      // Hide timer display
      document.getElementById('timer').textContent = '∞';
    } else if(now - lastSecond >= 1000) {
      roundTime--;
      lastSecond = now;
      // Timer warning ticks at the final 10 seconds
      if(roundTime > 0 && roundTime <= 10) {
        Audio.bounce && Audio.block();   // soft tick
        if(roundTime === 10) Audio.say('Ten seconds!', { interrupt: true });
      }
      if(roundTime <= 0) {
        Audio.say('Time up!', { interrupt: true });
        if(p1.hp > p2.hp) endRound(1);
        else if(p2.hp > p1.hp) endRound(2);
        else endRound(0);
      }
    }

    const i1 = getP1Input();
    const i2 = mode === 'cpu' ? cpuInput(p2, p1)
            : mode === 'training' ? makeInput()      // dummy stands still
            : getP2Input();
    p1.update(i1, p2);
    p2.update(i2, p1);

    // Intensify music when either fighter drops below 30% HP
    const lowHp = (p1.hp / p1.maxHp < 0.3) || (p2.hp / p2.maxHp < 0.3);
    Audio.musicSetIntense(lowHp);

    // Capture replay frame after both fighters update
    if(mode !== 'training') replaySnapshot();

    if(mode !== 'training') {
      if(p1.hp <= 0 && p2.hp <= 0) {
        endRound(0);
      } else if(p1.hp <= 0) {
        handleKO(p1, p2, 2);
      } else if(p2.hp <= 0) {
        handleKO(p2, p1, 1);
      }
    }
  } else if(state === 'ringout' && doUpdate) {
    if(hitstop === 0) updateRingout();
  }

  for(const k in keyPressed) keyPressed[k] = false;

  // Always tick stateTimeF (float animation time) for smoothness
  // even if physics is paused
  if(p1 && p1.state === 'attack') p1.stateTimeF = lerp(p1.stateTimeF, p1.stateTime, 0.6);
  else if(p1) p1.stateTimeF = p1.stateTime;
  if(p2 && p2.state === 'attack') p2.stateTimeF = lerp(p2.stateTimeF, p2.stateTime, 0.6);
  else if(p2) p2.stateTimeF = p2.stateTime;

  updateParticles();

  // Smooth camera/darken
  ultDarken = lerp(ultDarken, ultTargetDarken, 0.08);
  cameraZoom = lerp(cameraZoom, cameraTargetZoom, 0.05);

  // Focus camera on midpoint during ult — frozen during ring-out so its
  // zoom-centering math doesn't fight the ring-out pan
  if(p1 && p2 && state !== 'ringout') {
    const mid = (p1.x + p2.x) / 2;
    cameraTargetX = (p1.state === 'attack' && p1.attackType === 'ult') ? p1.x
                  : (p2.state === 'attack' && p2.attackType === 'ult') ? p2.x
                  : mid;
    cameraTargetY = GROUND - 80;
    cameraX = lerp(cameraX, cameraTargetX, 0.06);
    cameraY = lerp(cameraY, cameraTargetY, 0.06);
  }

  // Ring-out pan: lock screen to the falling fighter
  // Math: world point (fx, fy) renders at screen (fx - cameraPanX, fy - cameraPanY)
  // when cameraZoom == 1 (which we force during ring-out).
  // We want fighter ~150 px from top of screen so we can see ground below them.
  if(state === 'ringout' && ringoutFighter) {
    cameraPanTargetX = ringoutFighter.x - W / 2;
    cameraPanTargetY = ringoutFighter.y - 180;
    if(ringoutTime < 14) {
      cameraPanX = lerp(cameraPanX, cameraPanTargetX, 0.28);
      cameraPanY = lerp(cameraPanY, cameraPanTargetY, 0.28);
    } else {
      cameraPanX = cameraPanTargetX;
      cameraPanY = cameraPanTargetY;
    }
  } else {
    cameraPanTargetX = 0;
    cameraPanTargetY = 0;
    cameraPanX = lerp(cameraPanX, 0, 0.12);
    cameraPanY = lerp(cameraPanY, 0, 0.12);
  }

  let sx = 0, sy = 0;
  if(shakeTime > 0) {
    sx = (Math.random() - 0.5) * shakeMag;
    sy = (Math.random() - 0.5) * shakeMag;
    shakeTime--;
    if(shakeTime === 0) shakeMag = 0;
    shakeMag *= 0.92;
  }

  // Smooth camera angle (used by fatal-blow for dutch tilt + whip rotations)
  cameraAngle = lerp(cameraAngle, cameraTargetAngle, 0.14);

  // Apply camera: translate to screen center, scale, ROTATE, then re-translate
  ctx.save();
  const cx = W / 2, cy = H / 2;
  ctx.translate(cx + sx - cameraPanX, cy + sy - cameraPanY);
  ctx.scale(cameraZoom, cameraZoom);
  if(Math.abs(cameraAngle) > 0.001) ctx.rotate(cameraAngle);
  ctx.translate(-cx - (cameraX - cx) * (cameraZoom - 1) / cameraZoom,
                -cy - (cameraY - cy) * (cameraZoom - 1) / cameraZoom);

  if(state === 'replay') {
    drawReplay();
  } else {
    drawScene();
    drawGroundCracks();
    if(state === 'ringout' || cameraPanY > 2) drawPit();
  }

  // Dark overlay during ultimate for cinematic look
  if(ultDarken > 0.02) {
    ctx.fillStyle = `rgba(0,0,0,${ultDarken})`;
    ctx.fillRect(0, 0, W, H);
    // Radial spotlight on active fighter
    const active = (p1 && p1.state === 'attack' && p1.attackType === 'ult') ? p1
                 : (p2 && p2.state === 'attack' && p2.attackType === 'ult') ? p2 : null;
    if(active) {
      const grad = ctx.createRadialGradient(active.x, active.y - 60, 10, active.x, active.y - 60, 260);
      grad.addColorStop(0, `rgba(255,255,255,${ultDarken * 0.2})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  }

  if(state !== 'replay') {
    if(p1) drawFighter(p1);
    if(p2) drawFighter(p2);
  }
  drawParticles();
  if(state === 'replay') {
    // Blinking corner badge
    if(Math.floor(globalTime / 18) % 2 === 0) {
      ctx.save();
      ctx.fillStyle = '#ff3030';
      ctx.beginPath(); ctx.arc(28, 28, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'italic 900 18px Inter';
      ctx.fillText('REPLAY', 44, 34);
      ctx.restore();
    }
  }

  ctx.restore();

  // Flash overlay
  if(flashTime > 0) {
    const a = flashAlpha * (flashTime / 30);
    ctx.fillStyle = `rgba(${flashColor},${a})`;
    ctx.fillRect(0, 0, W, H);
    flashTime--;
  }

  // Vignette
  const vg = ctx.createRadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Killer-Instinct void: radial speed lines + dark overlay during ring-out
  if(state === 'ringout' && ringoutFighter) {
    // Fade speed lines in over first 10 frames, ramp down after final bounce
    const f = ringoutFighter;
    let intensity = Math.min(1, ringoutTime / 10);
    if(f.ringoutBounces >= MAX_BOUNCES) {
      intensity *= Math.max(0, 1 - (f.ringoutRestTime || 0) / 30);
    } else if(f.vy < 4) {
      intensity *= Math.max(0.2, Math.min(1, f.vy / 4));
    }
    if(intensity > 0.02) {
      // Heavy darken so the lines pop like the screenshot
      ctx.fillStyle = `rgba(0,0,0,${0.55 * intensity})`;
      ctx.fillRect(0, 0, W, H);
      drawFallSpeedLines(intensity);
    }
  }

  if(p1 && p2) {
    document.getElementById('p1bar').style.width = (p1.hp / p1.maxHp * 100) + '%';
    document.getElementById('p2bar').style.width = (p2.hp / p2.maxHp * 100) + '%';
    document.getElementById('p1bar').classList.toggle('low', p1.hp / p1.maxHp <= 0.25);
    document.getElementById('p2bar').classList.toggle('low', p2.hp / p2.maxHp <= 0.25);
    document.getElementById('p1ult').style.width = (p1.ult / p1.maxUlt * 100) + '%';
    document.getElementById('p2ult').style.width = (p2.ult / p2.maxUlt * 100) + '%';
    document.getElementById('p1ult').classList.toggle('ready', p1.ult >= p1.maxUlt);
    document.getElementById('p2ult').classList.toggle('ready', p2.ult >= p2.maxUlt);
    document.getElementById('timer').textContent = (mode === 'training') ? '∞' : String(Math.max(0, roundTime)).padStart(2, '0');
  }

  if(announceTimer > 0) {
    announceTimer--;
    announceScale = Math.min(1, announceScale + 0.12);
    const a = announceTimer < 20 ? announceTimer / 20 : 1;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.translate(W / 2, H / 2 - 80);
    ctx.scale(announceScale, announceScale);
    ctx.font = 'italic 900 76px Inter';
    ctx.globalAlpha = a;
    const grd = ctx.createLinearGradient(0, -40, 0, 40);
    grd.addColorStop(0, '#fff');
    grd.addColorStop(1, '#ffcc00');
    ctx.fillStyle = grd;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 8;
    ctx.strokeText(announceText, 0, 0);
    ctx.fillText(announceText, 0, 0);
    ctx.restore();
  }

  requestAnimationFrame(loop);
}

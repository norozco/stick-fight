// ============================================================
// REPLAY — circular buffer of last ~2s, played back on normal KOs
// ============================================================
// ============================================================
// REPLAY BUFFER — circular buffer of last ~2s of fighter snapshots
// ============================================================
const REPLAY_MAX = 120;
let replayBuffer = [];
let replayIndex = 0;
let replayPending = null;  // { winner }
function replaySnapshot() {
  if(!p1 || !p2) return;
  if(replayBuffer.length >= REPLAY_MAX) replayBuffer.shift();
  replayBuffer.push({
    p1: { x: p1.x, y: p1.y, facing: p1.facing, color: p1.color, glow: p1.glow,
          pose: p1.smoothPose ? clonePose(p1.smoothPose) : null, hp: p1.hp, hurtFlash: p1.hurtFlash, state: p1.state, ringoutSpin: p1.ringoutSpin,
          visual: (p1.character && p1.character.visual) || null },
    p2: { x: p2.x, y: p2.y, facing: p2.facing, color: p2.color, glow: p2.glow,
          pose: p2.smoothPose ? clonePose(p2.smoothPose) : null, hp: p2.hp, hurtFlash: p2.hurtFlash, state: p2.state, ringoutSpin: p2.ringoutSpin,
          visual: (p2.character && p2.character.visual) || null },
  });
}
function startReplay(winner) {
  if(replayBuffer.length < 30) {
    // Not enough frames, skip replay
    endRound(winner);
    return;
  }
  replayPending = { winner };
  replayIndex = 0;
  state = 'replay';
  Audio.musicStop();
  announce('REPLAY', 60);
}
function drawReplay() {
  // Play back at half speed (each frame advance 0.5 indices)
  const frame = replayBuffer[Math.min(Math.floor(replayIndex), replayBuffer.length - 1)];
  if(!frame) return;
  // Draw scene + both fighters from snapshot
  drawScene();
  // Shadow + body
  for(const side of ['p1','p2']) {
    const s = frame[side];
    if(!s) continue;
    if(s.state === 'ringout' && s.pose) {
      ctx.save();
      ctx.translate(s.x, s.y - 55);
      ctx.rotate(s.ringoutSpin || 0);
      ctx.translate(-s.x, -(s.y - 55));
      renderStoredPose({ ...s.pose, facing: s.facing }, s.color);
      ctx.restore();
    } else if(s.pose) {
      // Shadow
      const airFactor = Math.max(0, 1 - (GROUND - s.y) / 250);
      ctx.save();
      ctx.globalAlpha = 0.3 * airFactor;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(s.x, GROUND + 3, 22 * airFactor, 5 * airFactor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const flash = s.hurtFlash > 0 && Math.floor(s.hurtFlash / 2) % 2 === 0;
      const col = flash ? '#ffe0e0' : s.color;
      ctx.save();
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 4;
      renderStoredPose({ ...s.pose, facing: s.facing }, col);
      ctx.restore();
    }
  }
  replayIndex += 0.5;
  if(replayIndex >= replayBuffer.length) {
    state = 'playing';     // allow endRound to run
    const w = replayPending && replayPending.winner;
    replayPending = null;
    replayBuffer = [];
    endRound(w);
  }
}

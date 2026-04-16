// ============================================================
// SPRITES — detailed pixel-art characters with strong visual identity
// ============================================================
const SPRITE_W = 96;
const SPRITE_H = 160;
const SPRITE_SCALE = 1.45;
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

// Drawing context (set during generation)
let _sp = null;

// Helpers
function sp(x,y,w,h,c) { _sp.fillStyle=c; _sp.fillRect(x|0,y|0,w|0,h|0); }
function spc(cx,cy,r,c) { _sp.fillStyle=c; _sp.beginPath(); _sp.arc(cx,cy,r,0,Math.PI*2); _sp.fill(); }
function spe(cx,cy,rx,ry,c) { _sp.fillStyle=c; _sp.beginPath(); _sp.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); _sp.fill(); }
function spl(x1,y1,x2,y2,w,c) { _sp.strokeStyle=c; _sp.lineWidth=w; _sp.lineCap='round'; _sp.beginPath(); _sp.moveTo(x1,y1); _sp.lineTo(x2,y2); _sp.stroke(); }
function spTrap(x1,y1,w1,x2,y2,w2,c,oc) {
  _sp.beginPath(); _sp.moveTo(x1-w1/2,y1); _sp.lineTo(x1+w1/2,y1); _sp.lineTo(x2+w2/2,y2); _sp.lineTo(x2-w2/2,y2); _sp.closePath();
  _sp.fillStyle=c; _sp.fill();
  if(oc) { _sp.strokeStyle=oc; _sp.lineWidth=1; _sp.stroke(); }
}

// Pose offsets
function getPose(anim, frame, total) {
  const p = total > 1 ? frame / (total - 1) : 0;
  const o = { hY:0, lean:0, lAA:0, rAA:0, lLS:0, rLS:0, lFL:0, rFL:0, rAE:0, lAE:0 };
  if(anim === 'idle')   { o.hY = Math.sin(p*Math.PI*2)*2; }
  else if(anim === 'walk')  { const s=Math.sin(p*Math.PI*2); o.lLS=-s*10; o.rLS=s*10; o.lFL=Math.max(0,s)*6; o.rFL=Math.max(0,-s)*6; o.lAA=s*0.5; o.rAA=-s*0.5; o.lean=2; }
  else if(anim === 'attack_light') { o.rAE=(p<0.5?p*2:2-p*2)*30; o.lean=4; }
  else if(anim === 'attack_heavy') { if(p<0.35){o.rAA=-1.3;o.lean=-5;} else {o.rAE=((p-0.35)/0.65)*36;o.lean=7;} }
  else if(anim === 'hurt')  { o.lean=-7; o.hY=3; }
  else if(anim === 'jump')  { o.lFL=10; o.rFL=12; o.hY=-4; }
  else if(anim === 'block') { o.lAA=-1.1; o.rAA=-0.7; o.lean=-3; }
  else if(anim === 'dash')  { o.lean=10; o.lLS=-14; }
  else if(anim === 'attack_ult')   { if(p<0.25){o.rAA=-1.6;o.lean=-6;} else if(p<0.65){o.rAE=34;o.lean=8;} else {o.rAA=-1.9;o.lean=9;o.hY=-3;} }
  else if(anim === 'attack_throw') { if(p<0.3){o.rAE=24;o.lAE=24;} else {o.rAA=-Math.PI*((p-0.3)/0.7);o.rAE=18;} }
  return o;
}

// ============================================================
// AURORA — elegant ice warrior, feminine, flowing cyan hair
// ============================================================
function drawAurora(cx, gy, o) {
  const lean=o.lean||0, bx=cx+lean;
  const skin='#f2ddd0', hair='#80d8ee', hairDk='#50a8cc';
  const top='#3a78b0', topDk='#284880', topLt='#5098cc';
  const bot='#2a5880', bootC='#1a3860', out='#142840';
  const acc='#60c0e8', crown='#a0e8ff';

  // Ponytail (behind body)
  for(let i=0;i<22;i++){const sw=Math.sin(i*0.25+lean*0.08)*3;const w=Math.max(1,5-i/5);sp(bx-3+sw-lean*0.4,gy-68+i*2.2,w,2,i%3===0?hairDk:hair);}

  // Cape (behind body)
  _sp.fillStyle='rgba(58,120,176,0.18)';_sp.beginPath();_sp.moveTo(bx-6,gy-60);_sp.quadraticCurveTo(bx-12-lean*2,gy-20,bx-8-lean*3,gy+3);_sp.lineTo(bx+6,gy+3);_sp.quadraticCurveTo(bx+8,gy-20,bx+6,gy-60);_sp.closePath();_sp.fill();

  // Legs
  const lx=bx-6+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+6+(o.rLS||0),ry=gy-(o.rFL||0);
  spTrap(bx-3,gy-34,10,lx,ly,7,bot,out);spTrap(bx+3,gy-34,10,rx,ry,7,bot,out);
  // Knee pads
  spe(bx-3+(lx-bx+3)/2,gy-34+(ly-gy+34)/2,4,3,acc+'60');
  spe(bx+3+(rx-bx-3)/2,gy-34+(ry-gy+34)/2,4,3,acc+'60');
  // Boots
  sp(lx-4,ly-2,9,5,bootC);sp(lx-4,ly-2,9,1,out);spl(lx-4,ly,lx+5,ly,1,acc);
  sp(rx-4,ry-2,9,5,bootC);sp(rx-4,ry-2,9,1,out);spl(rx-4,ry,rx+5,ry,1,acc);

  // Torso — hourglass
  const nY=gy-62, pY=gy-34;
  spe(bx,pY,11,5,bot);                         // hips
  sp(bx-6,pY-12,12,12,bot);                    // lower torso
  spTrap(bx,pY-12,12,bx,nY,16,top,out);        // upper torso
  sp(bx-8,nY,8,(pY-nY),topDk+'50');            // shadow side
  sp(bx-6,pY-1,12,2,acc);                      // belt
  spe(bx,pY-1,2,2,'#fff');                     // belt buckle
  sp(bx-3,nY+1,6,2,acc);                       // collar
  // V-neckline detail
  spl(bx,nY+2,bx-2,nY+8,1,skin);spl(bx,nY+2,bx+2,nY+8,1,skin);

  // Arms
  const sY=nY+3;
  const lax=bx-14-(o.lAE||0),lay=sY+16+Math.sin(o.lAA||0)*12;
  const rax=bx+14+(o.rAE||0),ray=sY+16+Math.sin(o.rAA||0)*12;
  spl(bx-8,sY,lax,lay,6,top);spl(lax,lay,lax-3,lay+12,5,skin);spc(lax-3,lay+14,3.5,skin);spc(lax-3,lay+14,3.5,out+'40');
  spl(bx+8,sY,rax,ray,6,top);spl(rax,ray,rax+3,ray+12,5,skin);spc(rax+3,ray+14,3.5,skin);spc(rax+3,ray+14,3.5,out+'40');
  // Bracers
  spl(lax-1,lay+2,lax-2,lay+8,3,acc+'80');spl(rax+1,ray+2,rax+2,ray+8,3,acc+'80');

  // Head
  const hY=nY-10+(o.hY||0);
  sp(bx-2,nY-3,4,5,skin);                      // neck
  spc(bx,hY,10,skin);spc(bx,hY,10.5,out+'40'); // head + outline
  // Bangs
  spe(bx+2,hY-6,8,4,hair);spe(bx-3,hY-7,5,3,hairDk);
  // Crown
  spl(bx-5,hY-8,bx-7,hY-20,2.5,crown);spl(bx,hY-9,bx,hY-24,3,crown);spl(bx+5,hY-8,bx+7,hY-20,2.5,crown);
  spc(bx,hY-24,2.5,'#ffffff');spc(bx,hY-24,1.5,crown);
  // Face
  sp(bx+2,hY-3,5,3,'#3bf0ff');sp(bx+5,hY-4,1,1,'#fff'); // eye
  spl(bx+1,hY-5,bx+6,hY-5,1,out+'80');                   // eyebrow
  sp(bx+3,hY+3,3,1,'#c08080');                            // lips
  spc(bx+4,hY,1,out+'60');                                // nose hint
}

// ============================================================
// CRIMSON — aggressive fire fighter, lean male, spiky red hair
// ============================================================
function drawCrimson(cx, gy, o) {
  const lean=o.lean||0, bx=cx+lean;
  const skin='#f0d0b8', outfit='#cc2244', dk='#881430', lt='#ee4466';
  const band='#222', bandAcc='#ff5566', out='#3a0a14';
  const wrap='#ff8866', wrapDk='#cc5533';

  // Sash behind
  _sp.strokeStyle='rgba(255,56,96,0.35)';_sp.lineWidth=3;_sp.lineCap='round';_sp.beginPath();_sp.moveTo(bx-3,gy-34);_sp.quadraticCurveTo(bx-12-lean*2,gy-15,bx-14-lean*3,gy-4);_sp.stroke();

  // Legs — lean martial arts
  const lx=bx-7+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+7+(o.rLS||0),ry=gy-(o.rFL||0);
  spTrap(bx-3,gy-36,10,lx,ly,7,outfit,out);spTrap(bx+3,gy-36,10,rx,ry,7,outfit,out);
  // Knee wraps
  spl((bx-3+lx)/2,(gy-36+ly)/2-2,(bx-3+lx)/2,(gy-36+ly)/2+4,2,wrap);
  spl((bx+3+rx)/2,(gy-36+ry)/2-2,(bx+3+rx)/2,(gy-36+ry)/2+4,2,wrap);
  // Boots
  sp(lx-4,ly-3,9,5,dk);sp(lx-3,ly-3,7,1,out);
  sp(rx-4,ry-3,9,5,dk);sp(rx-3,ry-3,7,1,out);

  // Torso — V-shape masculine
  const nY=gy-64, pY=gy-36;
  spTrap(bx,pY,13,bx,nY,20,outfit,out);
  sp(bx-10,nY,10,(pY-nY),dk+'50');
  // Belt
  sp(bx-7,pY-1,14,3,band);sp(bx-1,pY,3,2,bandAcc);
  // Open gi showing chest
  _sp.fillStyle=skin;_sp.beginPath();_sp.moveTo(bx,nY+2);_sp.lineTo(bx-4,nY+14);_sp.lineTo(bx+4,nY+14);_sp.closePath();_sp.fill();
  // Gi lapels
  spl(bx,nY+2,bx-5,nY+16,1.5,out+'80');spl(bx,nY+2,bx+5,nY+16,1.5,out+'80');
  // Pecs hint
  spe(bx-3,nY+8,3,2,skin);spe(bx+3,nY+8,3,2,skin);

  // Arms — exposed, wrapped forearms
  const sY=nY+3;
  const lax=bx-16-(o.lAE||0),lay=sY+18+Math.sin(o.lAA||0)*12;
  const rax=bx+16+(o.rAE||0),ray=sY+18+Math.sin(o.rAA||0)*12;
  spl(bx-10,sY,lax,lay,7,skin);                // upper arm (bare)
  spl(lax,lay,lax-3,lay+12,6,wrap);             // wrapped forearm
  spl(lax-1,lay+2,lax-2,lay+10,2,wrapDk);       // wrap detail
  spc(lax-3,lay+14,4,skin);spc(lax-3,lay+14,4,out+'30'); // fist
  spl(bx+10,sY,rax,ray,7,skin);
  spl(rax,ray,rax+3,ray+12,6,wrap);
  spl(rax+1,ray+2,rax+2,ray+10,2,wrapDk);
  spc(rax+3,ray+14,4,skin);spc(rax+3,ray+14,4,out+'30');

  // Head
  const hY=nY-10+(o.hY||0);
  sp(bx-2,nY-3,5,5,skin);                       // neck
  spc(bx,hY,9,skin);spc(bx,hY,9.5,out+'40');
  // Headband
  sp(bx-9,hY-2,18,3,bandAcc);spl(bx-9,hY-2,bx-14,hY+4,2,bandAcc); // trailing end
  // Flame hair — large prominent spikes
  spl(bx-4,hY-6,bx-12,hY-22,3.5,'#ff6644');
  spl(bx-1,hY-7,bx-6,hY-28,4,'#ff3040');
  spl(bx+2,hY-6,bx-2,hY-24,3,'#ff5533');
  spl(bx+4,hY-5,bx+1,hY-18,2.5,'#ff4444');
  spl(bx+6,hY-3,bx+5,hY-14,2,'#ff7744');
  // Face
  sp(bx+2,hY-2,6,2,bandAcc);                    // eye (angry slit)
  spl(bx+1,hY-4,bx+7,hY-5,1.5,out);            // angry eyebrow (angled down)
  sp(bx+3,hY+3,4,1,out+'80');                   // grimace mouth
  spl(bx+3,hY+3,bx+7,hY+2,1,out+'60');          // mouth line
}

// ============================================================
// JADE — powerful armored woman, big build, green
// ============================================================
function drawJade(cx, gy, o) {
  const lean=o.lean||0, bx=cx+lean;
  const skin='#d8c0a0', armor='#2a6640', dk='#1a4430', lt='#44aa66';
  const plate='#3a8855', plateDk='#286838', out='#0a2218';
  const metal='#88cc88', metalDk='#448844';

  // Legs — thick, armored
  const lx=bx-9+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+9+(o.rLS||0),ry=gy-(o.rFL||0);
  spTrap(bx-5,gy-38,14,lx,ly,10,armor,out);spTrap(bx+5,gy-38,14,rx,ry,10,armor,out);
  // Shin armor
  sp(lx-5,ly-16,10,14,plate);sp(lx-5,ly-16,10,2,metal);sp(lx-5,ly-4,10,1,metal);
  sp(rx-5,ry-16,10,14,plate);sp(rx-5,ry-16,10,2,metal);sp(rx-5,ry-4,10,1,metal);
  // Heavy boots
  sp(lx-6,ly-3,12,6,dk);sp(lx-6,ly-3,12,1,out);spl(lx-5,ly+1,lx+6,ly+1,1,metal);
  sp(rx-6,ry-3,12,6,dk);sp(rx-6,ry-3,12,1,out);spl(rx-5,ry+1,rx+6,ry+1,1,metal);

  // Torso — hourglass but powerful
  const nY=gy-66, pY=gy-38;
  spe(bx,pY,14,6,armor);                        // wide hips
  sp(bx-8,pY-14,16,14,armor);                   // lower torso
  spTrap(bx,pY-14,16,bx,nY,24,armor,out);       // upper torso
  sp(bx-12,nY,12,(pY-nY),dk+'50');              // shadow
  // Chest armor plate (prominent)
  sp(bx-8,nY+4,16,14,plate);sp(bx-8,nY+4,16,2,metal);sp(bx-8,nY+16,16,1,metal);
  // Center line on plate
  spl(bx,nY+4,bx,nY+18,1,metalDk);
  // Belt
  sp(bx-10,pY-1,20,3,metal);sp(bx-2,pY,4,2,lt);
  // Shoulder pads (BIG)
  spe(bx-14,nY+3,8,5,plate);spe(bx-14,nY+3,8,1.5,metal);
  spe(bx+14,nY+3,8,5,plate);spe(bx+14,nY+3,8,1.5,metal);
  // Shoulder spikes
  spl(bx-14,nY-2,bx-16,nY-8,2,metal);spl(bx+14,nY-2,bx+16,nY-8,2,metal);

  // Arms — powerful, armored
  const sY=nY+4;
  const lax=bx-20-(o.lAE||0),lay=sY+18+Math.sin(o.lAA||0)*14;
  const rax=bx+20+(o.rAE||0),ray=sY+18+Math.sin(o.rAA||0)*14;
  spl(bx-14,sY,lax,lay,9,armor);spl(lax,lay,lax-4,lay+14,8,skin);spc(lax-4,lay+16,5,skin);spc(lax-4,lay+16,5,out+'30');
  spl(bx+14,sY,rax,ray,9,armor);spl(rax,ray,rax+4,ray+14,8,skin);spc(rax+4,ray+16,5,skin);spc(rax+4,ray+16,5,out+'30');
  // Gauntlets
  spl(lax,lay-2,lax-2,lay+6,4,plate);spl(rax,ray-2,rax+2,ray+6,4,plate);

  // Head — helmeted
  const hY=nY-12+(o.hY||0);
  sp(bx-3,nY-3,6,6,skin);                       // neck
  spc(bx,hY,11,skin);                           // head base
  // Helmet (covers top + sides)
  spe(bx,hY-2,12,9,plate);
  sp(bx-12,hY-3,24,4,metal);sp(bx-12,hY-3,24,1,out);  // visor bar
  sp(bx-2,hY-14,4,10,metal);                    // crest
  spe(bx,hY-14,3,2,lt);                         // crest top
  // Hair out back
  for(let i=0;i<12;i++){const sw=Math.sin(i*0.3)*2;sp(bx-3+sw-lean*0.3,hY+8+i*1.8,4,2,i%2===0?lt:metal);}
  // Face — strong, determined
  spc(bx+4,hY-1,3,lt);sp(bx+3,hY-2,3,2,'#2a6640'); // big green eye
  sp(bx+6,hY-2,1,1,'#fff');                     // highlight
  spl(bx+2,hY-5,bx+7,hY-4,1.5,out);            // eyebrow
  sp(bx+3,hY+4,4,1,'#b09070');                  // mouth
}

// ============================================================
// NOIR — mysterious shadow assassin, thin, cloaked
// ============================================================
function drawNoir(cx, gy, o) {
  const lean=o.lean||0, bx=cx+lean;
  const skin='#d8c8a8', cloak='#2a1840', dk='#180c28', acc='#6030a0';
  const glow='#ffcc00', blade='#c0c0d0', out='#0c0618';

  // Full cloak (behind everything)
  _sp.fillStyle=cloak+'c0';_sp.beginPath();_sp.moveTo(bx-12,gy-58);
  _sp.quadraticCurveTo(bx-18-lean*2,gy-15,bx-12-lean*3,gy+5);
  _sp.lineTo(bx+12-lean,gy+5);
  _sp.quadraticCurveTo(bx+14,gy-15,bx+12,gy-58);_sp.closePath();_sp.fill();
  _sp.strokeStyle=acc+'60';_sp.lineWidth=1.5;_sp.stroke();
  // Cloak inner pattern
  spl(bx-6,gy-40,bx-10-lean*2,gy-5,1,acc+'30');
  spl(bx+4,gy-40,bx+2-lean,gy-5,1,acc+'30');

  // Legs — thin, sleek
  const lx=bx-5+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+5+(o.rLS||0),ry=gy-(o.rFL||0);
  spTrap(bx-3,gy-32,7,lx,ly,5,cloak,out);spTrap(bx+3,gy-32,7,rx,ry,5,cloak,out);
  sp(lx-3,ly-2,7,4,dk);sp(rx-3,ry-2,7,4,dk);

  // Torso — narrow, dark
  const nY=gy-58, pY=gy-32;
  spTrap(bx,pY,11,bx,nY,14,cloak,out);
  sp(bx-7,nY,7,(pY-nY),dk+'60');
  // Belt with glowing buckle
  sp(bx-6,pY-1,12,2,acc);sp(bx-1,pY-1,3,2,glow);
  // Collar high
  sp(bx-4,nY,8,3,cloak);sp(bx-4,nY,8,1,acc);

  // Arms — thin, glowing wrist wraps
  const sY=nY+3;
  const lax=bx-12-(o.lAE||0),lay=sY+16+Math.sin(o.lAA||0)*12;
  const rax=bx+12+(o.rAE||0),ray=sY+16+Math.sin(o.rAA||0)*12;
  spl(bx-7,sY,lax,lay,5,cloak);
  spl(lax,lay,lax-2,lay+10,4,'#9060cc');        // glowing forearm
  spc(lax-2,lay+12,3,skin);
  // Dagger in left hand
  spl(lax-2,lay+12,lax-4,lay+22,1.5,blade);spl(lax-5,lay+20,lax-3,lay+24,1,blade);
  spl(bx+7,sY,rax,ray,5,cloak);
  spl(rax,ray,rax+2,ray+10,4,'#9060cc');
  spc(rax+2,ray+12,3,skin);
  // Dagger in right hand
  spl(rax+2,ray+12,rax+4,ray+22,1.5,blade);spl(rax+3,ray+20,rax+5,ray+24,1,blade);

  // Head — deep hood
  const hY=nY-10+(o.hY||0);
  sp(bx-2,nY-3,4,5,skin);                       // neck
  spc(bx,hY,9,skin);                            // head base
  // Hood (large, dramatic, dark)
  _sp.fillStyle=cloak;_sp.beginPath();_sp.ellipse(bx,hY-1,15,12,0,Math.PI,0);_sp.fill();
  _sp.strokeStyle=acc;_sp.lineWidth=2;_sp.beginPath();_sp.ellipse(bx,hY-1,15,12,0,Math.PI,0);_sp.stroke();
  // Pointed hood tips
  spl(bx-14,hY-1,bx-18,hY-10,2.5,acc);spl(bx+14,hY-1,bx+18,hY-10,2.5,acc);
  // Shadow covering lower face
  spe(bx,hY+2,8,5,cloak+'d0');
  // Glowing eyes from shadow
  _sp.shadowColor=glow;_sp.shadowBlur=6;
  sp(bx-4,hY-2,4,2,glow);sp(bx+2,hY-2,4,2,glow);
  _sp.shadowBlur=0;_sp.shadowColor='transparent';
}

// ============================================================
// SPRITE GENERATION + DRAWING + INIT
// ============================================================
function generateSpritesForCharacter(c) {
  const id=c.id;spriteCache[id]={};
  const fn=id==='aurora'?drawAurora:id==='crimson'?drawCrimson:id==='jade'?drawJade:id==='noir'?drawNoir:drawAurora;
  for(const [anim,def] of Object.entries(SPRITE_ANIMS)) {
    spriteCache[id][anim]=[];
    for(let f=0;f<def.frames;f++) {
      const cv=document.createElement('canvas');cv.width=SPRITE_W;cv.height=SPRITE_H;
      _sp=cv.getContext('2d');_sp.imageSmoothingEnabled=false;
      fn(SPRITE_W/2,SPRITE_H-12,getPose(anim,f,def.frames));
      spriteCache[id][anim].push(cv);
    }
  }
  _sp=null;
}

function drawFighterSprite(f) {
  const id=f.character&&f.character.id;
  if(!id||!spriteCache[id]) return false;
  const anim=spriteCache[id][getSpriteAnim(f)];
  if(!anim||!anim.length) return false;
  const fr=anim[Math.min(getSpriteFrame(f,getSpriteAnim(f)),anim.length-1)];
  if(!fr) return false;
  ctx.save();ctx.imageSmoothingEnabled=false;
  const dx=f.x-SPRITE_DRAW_W/2,dy=f.y-SPRITE_DRAW_H+20;
  if(f.facing<0){ctx.translate(f.x,0);ctx.scale(-1,1);ctx.translate(-f.x,0);}
  if(f.hurtFlash>0&&Math.floor(f.hurtFlash/2)%2===0){
    const t=document.createElement('canvas');t.width=fr.width;t.height=fr.height;
    const tc=t.getContext('2d');tc.drawImage(fr,0,0);tc.globalCompositeOperation='source-atop';
    tc.fillStyle='rgba(255,200,200,0.55)';tc.fillRect(0,0,t.width,t.height);
    ctx.drawImage(t,dx,dy,SPRITE_DRAW_W,SPRITE_DRAW_H);
  } else {
    ctx.drawImage(fr,dx,dy,SPRITE_DRAW_W,SPRITE_DRAW_H);
  }
  ctx.imageSmoothingEnabled=true;ctx.restore();return true;
}

function initSpriteCache(){for(const c of CHARACTERS)generateSpritesForCharacter(c);}
if(typeof window!=='undefined')window.addEventListener('load',()=>setTimeout(initSpriteCache,100));

// ============================================================
// SPRITES — high-detail pixel-art characters at large scale
// ============================================================
const SPRITE_W = 112;
const SPRITE_H = 180;
const SPRITE_SCALE = 1.9;
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
  if(f.state==='attack'){if(f.attackType==='ult')return'attack_ult';if(f.attackType==='throw')return'attack_throw';if(f.attackType==='heavy')return'attack_heavy';return'attack_light';}
  if(f.state==='hurt'||f.state==='stagger'||f.state==='wallsplat')return'hurt';
  if(f.state==='dash')return'dash';if(f.state==='ringout')return'hurt';
  if(f.blocking)return'block';if(!f.onGround)return'jump';
  if(Math.abs(f.vx)>1.5)return'walk';return'idle';
}
function getSpriteFrame(f,a){const d=SPRITE_ANIMS[a]||SPRITE_ANIMS.idle;return Math.floor((f.stateTime||globalTime)/d.rate)%d.frames;}

let _s=null;
function sf(x,y,w,h,c){_s.fillStyle=c;_s.fillRect(x|0,y|0,w|0,h|0);}
function sc(cx,cy,r,c){_s.fillStyle=c;_s.beginPath();_s.arc(cx,cy,r,0,Math.PI*2);_s.fill();}
function se(cx,cy,rx,ry,c){_s.fillStyle=c;_s.beginPath();_s.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);_s.fill();}
function sl(x1,y1,x2,y2,w,c){_s.strokeStyle=c;_s.lineWidth=w;_s.lineCap='round';_s.beginPath();_s.moveTo(x1,y1);_s.lineTo(x2,y2);_s.stroke();}
function st(x1,y1,w1,x2,y2,w2,c,o){_s.beginPath();_s.moveTo(x1-w1/2,y1);_s.lineTo(x1+w1/2,y1);_s.lineTo(x2+w2/2,y2);_s.lineTo(x2-w2/2,y2);_s.closePath();_s.fillStyle=c;_s.fill();if(o){_s.strokeStyle=o;_s.lineWidth=1.2;_s.stroke();}}

function gp(a,f,t){
  const p=t>1?f/(t-1):0;
  const o={hY:0,lean:0,lAA:0,rAA:0,lLS:0,rLS:0,lFL:0,rFL:0,rAE:0,lAE:0};
  if(a==='idle'){o.hY=Math.sin(p*Math.PI*2)*2.5;}
  else if(a==='walk'){const s=Math.sin(p*Math.PI*2);o.lLS=-s*12;o.rLS=s*12;o.lFL=Math.max(0,s)*8;o.rFL=Math.max(0,-s)*8;o.lAA=s*0.6;o.rAA=-s*0.6;o.lean=3;}
  else if(a==='attack_light'){o.rAE=(p<0.5?p*2:2-p*2)*35;o.lean=5;}
  else if(a==='attack_heavy'){if(p<0.35){o.rAA=-1.4;o.lean=-6;}else{o.rAE=((p-0.35)/0.65)*42;o.lean=8;}}
  else if(a==='hurt'){o.lean=-8;o.hY=4;}
  else if(a==='jump'){o.lFL=12;o.rFL=14;o.hY=-5;}
  else if(a==='block'){o.lAA=-1.2;o.rAA=-0.8;o.lean=-3;}
  else if(a==='dash'){o.lean=12;o.lLS=-16;}
  else if(a==='attack_ult'){if(p<0.25){o.rAA=-1.7;o.lean=-7;}else if(p<0.65){o.rAE=40;o.lean=10;}else{o.rAA=-2;o.lean=11;o.hY=-4;}}
  else if(a==='attack_throw'){if(p<0.3){o.rAE=28;o.lAE=28;}else{o.rAA=-Math.PI*((p-0.3)/0.7);o.rAE=22;}}
  return o;
}

// Shaded limb — filled trapezoid with light/dark sides
function shadedLimb(x1,y1,x2,y2,w,light,dark,outline){
  const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1;
  const nx=-dy/len,ny=dx/len;
  // Light side
  _s.beginPath();_s.moveTo(x1,y1);_s.lineTo(x2,y2);_s.lineTo(x2+nx*w/2,y2+ny*w/2);_s.lineTo(x1+nx*w/2,y1+ny*w/2);_s.closePath();_s.fillStyle=light;_s.fill();
  // Dark side
  _s.beginPath();_s.moveTo(x1,y1);_s.lineTo(x2,y2);_s.lineTo(x2-nx*w/2,y2-ny*w/2);_s.lineTo(x1-nx*w/2,y1-ny*w/2);_s.closePath();_s.fillStyle=dark;_s.fill();
  // Outline
  if(outline){_s.strokeStyle=outline;_s.lineWidth=1.2;_s.beginPath();
    _s.moveTo(x1+nx*w/2,y1+ny*w/2);_s.lineTo(x2+nx*w/2,y2+ny*w/2);
    _s.lineTo(x2-nx*w/2,y2-ny*w/2);_s.lineTo(x1-nx*w/2,y1-ny*w/2);_s.closePath();_s.stroke();}
}

// Pixel face helper — draws a detailed face at head position
// Eyes with whites + iris + pupil + highlight, nose, mouth, eyebrows
function pixelFace(bx, hY, opts) {
  const {eyeColor,eyeW,eyeH,browColor,browAngle,mouthW,mouthColor,mouthY,noseColor,skinDark,outline,expression} = opts;
  const out = outline || '#1a1020';
  // Left eye
  sf(bx-7, hY-3, eyeW+2, eyeH+2, '#ffffff');    // white
  sf(bx-6, hY-2, eyeW, eyeH, eyeColor);          // iris
  sf(bx-5, hY-1, 2, 2, out);                      // pupil
  sf(bx-6, hY-3, 1, 1, '#ffffff');                 // highlight
  // Right eye
  sf(bx+3, hY-3, eyeW+2, eyeH+2, '#ffffff');
  sf(bx+4, hY-2, eyeW, eyeH, eyeColor);
  sf(bx+5, hY-1, 2, 2, out);
  sf(bx+4, hY-3, 1, 1, '#ffffff');
  // Eyebrows
  const ba = browAngle || 0;
  sl(bx-8, hY-6+ba, bx-3, hY-7, 2, browColor || out);
  sl(bx+2, hY-7, bx+7, hY-6-ba, 2, browColor || out);
  // Nose
  sf(bx-1, hY+2, 2, 2, noseColor || skinDark || '#c0a090');
  // Mouth
  const my = mouthY || 6;
  if(expression === 'smile') {
    sl(bx-2, hY+my, bx+2, hY+my+1, 1.5, mouthColor || '#c08080');
    sf(bx-1, hY+my, 3, 1, mouthColor || '#c08080');
  } else if(expression === 'grimace') {
    sf(bx-3, hY+my, mouthW||6, 2, mouthColor || out);
    sf(bx-2, hY+my, 2, 1, '#ffffff');  // teeth
    sf(bx+1, hY+my, 2, 1, '#ffffff');
  } else if(expression === 'serious') {
    sf(bx-2, hY+my, mouthW||4, 1.5, mouthColor || '#a07060');
  } else if(expression === 'hidden') {
    // no mouth (Noir's face is in shadow)
  } else {
    sf(bx-2, hY+my, mouthW||4, 1.5, mouthColor || '#c08080');
  }
}

// ============================================================
// AURORA — elegant ice princess, BIG HEAD, visible face
// ============================================================
function drawAurora(cx,gy,o){
  const L=o.lean||0,bx=cx+L;
  const sk='#f2ddd0',skDk='#d4b8a8',hair='#80d8ee',hairDk='#50a8cc',hairLt='#b0f0ff';
  const top='#3a78b0',topDk='#224870',topLt='#5898d0';
  const bot='#2a5880',boot='#1a3860',out='#102838',acc='#60ccee';

  // Hair (behind)
  for(let i=0;i<28;i++){const sw=Math.sin(i*0.22+L*0.06)*4;const w=Math.max(2,7-i/4);
    sf(bx-4+sw-L*0.3,gy-82+i*2.6,w,3,i%4===0?hairLt:i%2===0?hair:hairDk);}

  // Cape
  _s.fillStyle='rgba(58,120,176,0.15)';_s.beginPath();_s.moveTo(bx-8,gy-74);
  _s.quadraticCurveTo(bx-16-L*3,gy-25,bx-10-L*4,gy+5);_s.lineTo(bx+8,gy+5);
  _s.quadraticCurveTo(bx+10,gy-25,bx+8,gy-74);_s.closePath();_s.fill();
  _s.strokeStyle=acc+'40';_s.lineWidth=1;_s.stroke();

  // Legs
  const lx=bx-8+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+8+(o.rLS||0),ry=gy-(o.rFL||0);
  shadedLimb(bx-4,gy-42,lx,ly,10,bot,topDk,out);shadedLimb(bx+4,gy-42,rx,ry,10,bot,topDk,out);
  // Knee accents
  se((bx-4+lx)/2,(gy-42+ly)/2,5,3.5,acc+'50');se((bx+4+rx)/2,(gy-42+ry)/2,5,3.5,acc+'50');
  // Boots
  sf(lx-5,ly-3,11,6,boot);sf(lx-5,ly-3,11,1.5,out);sl(lx-4,ly+1,lx+6,ly+1,1,acc+'60');
  sf(rx-5,ry-3,11,6,boot);sf(rx-5,ry-3,11,1.5,out);sl(rx-4,ry+1,rx+6,ry+1,1,acc+'60');

  // Torso — hourglass
  const nY=gy-76,pY=gy-42;
  se(bx,pY,14,7,bot);sf(bx-8,pY-14,16,14,bot);st(bx,pY-14,16,bx,nY,20,top,out);
  sf(bx-10,nY,10,pY-nY,topDk+'50');
  // Waist accent + buckle
  sf(bx-9,pY-2,18,3,acc);se(bx,pY-1,2.5,2.5,'#fff');
  // V-neckline
  _s.fillStyle=sk;_s.beginPath();_s.moveTo(bx,nY+2);_s.lineTo(bx-5,nY+12);_s.lineTo(bx+5,nY+12);_s.closePath();_s.fill();
  sl(bx,nY+2,bx-5,nY+14,1.2,out+'80');sl(bx,nY+2,bx+5,nY+14,1.2,out+'80');
  // Collar
  sf(bx-4,nY,8,3,acc);sf(bx-4,nY,8,1,acc+'80');
  // Torso highlight streak
  sl(bx+4,nY+6,bx+3,pY-6,1.5,topLt+'60');

  // Arms
  const sY=nY+4;
  const lax=bx-18-(o.lAE||0),lay=sY+20+Math.sin(o.lAA||0)*14;
  const rax=bx+18+(o.rAE||0),ray=sY+20+Math.sin(o.rAA||0)*14;
  shadedLimb(bx-10,sY,lax,lay,8,top,topDk,out);shadedLimb(lax,lay,lax-4,lay+14,7,sk,skDk,out);
  sc(lax-4,lay+17,4.5,sk);sc(lax-4,lay+17,4.5,out+'30');
  shadedLimb(bx+10,sY,rax,ray,8,top,topDk,out);shadedLimb(rax,ray,rax+4,ray+14,7,sk,skDk,out);
  sc(rax+4,ray+17,4.5,sk);sc(rax+4,ray+17,4.5,out+'30');
  // Ice bracers
  sf(lax-2,lay,6,4,acc+'70');sf(rax-2,ray,6,4,acc+'70');

  // Head
  const hY=nY-14+(o.hY||0);
  sf(bx-3,nY-4,6,6,sk);sc(bx,hY,13,sk);sc(bx,hY,13.5,out+'30');
  // Bangs (layered)
  se(bx+3,hY-8,10,5,hair);se(bx-4,hY-9,6,4,hairDk);se(bx+6,hY-6,4,3,hairLt);
  // Crown
  sl(bx-7,hY-10,bx-9,hY-26,3,acc);sl(bx,hY-12,bx,hY-30,3.5,'#c0f4ff');sl(bx+7,hY-10,bx+9,hY-26,3,acc);
  sc(bx,hY-30,3,'#ffffff');sc(bx,hY-30,2,'#c0f4ff');
  // Small side crystals
  sl(bx-12,hY-6,bx-14,hY-14,1.5,acc+'80');sl(bx+12,hY-6,bx+14,hY-14,1.5,acc+'80');
  // Face
  sf(bx+3,hY-4,6,4,'#3bf0ff');sf(bx+7,hY-5,2,1,'#ffffff');  // eye + highlight
  sl(bx+2,hY-6,bx+8,hY-7,1.2,out+'70');                      // eyebrow (soft arch)
  sc(bx+5,hY+1,1.2,out+'40');                                 // nose
  sf(bx+3,hY+4,4,1.5,'#d09090');                              // lips
  // Ear
  se(bx-8,hY,2,3,sk);
}

// ============================================================
// CRIMSON — aggressive flame fighter, lean muscular male
// ============================================================
function drawCrimson(cx,gy,o){
  const L=o.lean||0,bx=cx+L;
  const sk='#f0d0b8',skDk='#d0a890',skLt='#ffe0d0';
  const gi='#cc2244',giDk='#881430',giLt='#ee4466';
  const wrap='#ff8866',wrapDk='#cc5533',band='#ff5566',out='#3a0a14';

  // Sash behind
  _s.strokeStyle='rgba(255,56,96,0.3)';_s.lineWidth=4;_s.lineCap='round';_s.beginPath();
  _s.moveTo(bx-4,gy-42);_s.quadraticCurveTo(bx-16-L*3,gy-18,bx-18-L*4,gy-2);_s.stroke();
  _s.lineWidth=2;_s.strokeStyle='rgba(255,56,96,0.15)';
  _s.beginPath();_s.moveTo(bx-18-L*4,gy-2);_s.quadraticCurveTo(bx-20-L*4,gy+8,bx-16-L*3,gy+12);_s.stroke();

  // Legs
  const lx=bx-9+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+9+(o.rLS||0),ry=gy-(o.rFL||0);
  shadedLimb(bx-4,gy-44,lx,ly,10,gi,giDk,out);shadedLimb(bx+4,gy-44,rx,ry,10,gi,giDk,out);
  // Knee wraps
  sl((bx-4+lx)/2,(gy-44+ly)/2-3,(bx-4+lx)/2,(gy-44+ly)/2+5,3,wrap);
  sl((bx+4+rx)/2,(gy-44+ry)/2-3,(bx+4+rx)/2,(gy-44+ry)/2+5,3,wrap);
  // Boots
  sf(lx-5,ly-3,11,6,giDk);sf(lx-5,ly-3,11,1.5,out);
  sf(rx-5,ry-3,11,6,giDk);sf(rx-5,ry-3,11,1.5,out);

  // Torso — V-shape
  const nY=gy-78,pY=gy-44;
  st(bx,pY,14,bx,nY,24,gi,out);
  sf(bx-12,nY,12,pY-nY,giDk+'50');
  // Open gi chest
  _s.fillStyle=sk;_s.beginPath();_s.moveTo(bx,nY+3);_s.lineTo(bx-6,nY+18);_s.lineTo(bx+6,nY+18);_s.closePath();_s.fill();
  sl(bx,nY+3,bx-7,nY+20,1.5,out+'60');sl(bx,nY+3,bx+7,nY+20,1.5,out+'60');
  // Pecs
  se(bx-4,nY+10,4,2.5,skLt);se(bx+4,nY+10,4,2.5,skLt);
  // Abs hint
  sl(bx,nY+16,bx,pY-4,1,skDk+'60');sl(bx-3,nY+20,bx-3,pY-6,0.8,skDk+'40');sl(bx+3,nY+20,bx+3,pY-6,0.8,skDk+'40');
  // Belt
  sf(bx-8,pY-2,16,3,'#1a1a1a');sf(bx-2,pY-1,4,2,band);
  // Gi highlight
  sl(bx+8,nY+6,bx+6,pY-6,1.5,giLt+'50');

  // Arms — BARE (muscular, skin-colored upper arms)
  const sY=nY+4;
  const lax=bx-20-(o.lAE||0),lay=sY+22+Math.sin(o.lAA||0)*14;
  const rax=bx+20+(o.rAE||0),ray=sY+22+Math.sin(o.rAA||0)*14;
  // Upper arms (bare skin)
  shadedLimb(bx-12,sY,lax,lay,9,sk,skDk,out);
  // Bicep highlight
  sl(bx-12+(lax-bx+12)*0.3,sY+(lay-sY)*0.3,bx-12+(lax-bx+12)*0.6,sY+(lay-sY)*0.6,1,skLt+'60');
  // Wrapped forearms
  shadedLimb(lax,lay,lax-4,lay+14,8,wrap,wrapDk,out);
  sl(lax-1,lay+2,lax-3,lay+12,2,wrapDk);sl(lax+1,lay+4,lax-1,lay+10,1.5,wrap);
  sc(lax-4,lay+17,5,sk);sc(lax-4,lay+17,5,out+'25');
  shadedLimb(bx+12,sY,rax,ray,9,sk,skDk,out);
  sl(bx+12+(rax-bx-12)*0.3,sY+(ray-sY)*0.3,bx+12+(rax-bx-12)*0.6,sY+(ray-sY)*0.6,1,skLt+'60');
  shadedLimb(rax,ray,rax+4,ray+14,8,wrap,wrapDk,out);
  sl(rax+1,ray+2,rax+3,ray+12,2,wrapDk);sl(rax-1,ray+4,rax+1,ray+10,1.5,wrap);
  sc(rax+4,ray+17,5,sk);sc(rax+4,ray+17,5,out+'25');

  // Head
  const hY=nY-14+(o.hY||0);
  sf(bx-3,nY-4,6,6,sk);sc(bx,hY,11,sk);sc(bx,hY,11.5,out+'35');
  // Headband
  sf(bx-11,hY-3,22,4,band);sl(bx-11,hY-2,bx-17,hY+6,2.5,band);sl(bx-17,hY+6,bx-20,hY+10,2,band+'80');
  // Flame hair — BIG dramatic spikes
  sl(bx-5,hY-8,bx-16,hY-30,4.5,'#ff6644');sl(bx-2,hY-9,bx-8,hY-36,5,'#ff3040');
  sl(bx+2,hY-8,bx-3,hY-30,4,'#ff5533');sl(bx+5,hY-7,bx+2,hY-24,3.5,'#ff4444');
  sl(bx+7,hY-5,bx+6,hY-18,3,'#ff7744');sl(bx+9,hY-3,bx+9,hY-12,2,'#ffaa44');
  // Face
  sf(bx+2,hY-3,7,2.5,band);                             // eye slit
  sl(bx+1,hY-6,bx+9,hY-7,2,out);                        // ANGRY eyebrow
  sc(bx+6,hY+1,1.5,out+'50');                            // nose
  sl(bx+3,hY+4,bx+9,hY+3,1.5,out+'70');                 // grimace
  sf(bx+3,hY+3,2,1,sk);                                  // teeth hint
}

// ============================================================
// JADE — powerful armored warrior woman, heavy build
// ============================================================
function drawJade(cx,gy,o){
  const L=o.lean||0,bx=cx+L;
  const sk='#d8c0a0',skDk='#b8a080',ar='#2a6640',dk='#1a4430',lt='#44aa66';
  const pl='#3a8855',plDk='#286838',met='#88cc88',metDk='#558855',out='#0a2218';

  // Legs — thick
  const lx=bx-11+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+11+(o.rLS||0),ry=gy-(o.rFL||0);
  shadedLimb(bx-6,gy-46,lx,ly,14,ar,dk,out);shadedLimb(bx+6,gy-46,rx,ry,14,ar,dk,out);
  // Shin armor
  sf(lx-6,ly-20,13,17,pl);sf(lx-6,ly-20,13,2.5,met);sf(lx-6,ly-5,13,1.5,met);
  sl(lx,ly-20,lx,ly-5,1,plDk);
  sf(rx-6,ry-20,13,17,pl);sf(rx-6,ry-20,13,2.5,met);sf(rx-6,ry-5,13,1.5,met);
  sl(rx,ry-20,rx,ry-5,1,plDk);
  // Heavy boots
  sf(lx-7,ly-4,15,7,dk);sf(lx-7,ly-4,15,2,out);sl(lx-6,ly+1,lx+8,ly+1,1.5,met);
  sf(rx-7,ry-4,15,7,dk);sf(rx-7,ry-4,15,2,out);sl(rx-6,ry+1,rx+8,ry+1,1.5,met);

  // Torso — hourglass but WIDE
  const nY=gy-82,pY=gy-46;
  se(bx,pY,17,8,ar);sf(bx-10,pY-16,20,16,ar);st(bx,pY-16,20,bx,nY,28,ar,out);
  sf(bx-14,nY,14,pY-nY,dk+'50');
  // Chest plate (prominent)
  sf(bx-10,nY+5,20,18,pl);sf(bx-10,nY+5,20,3,met);sf(bx-10,nY+20,20,2,met);
  sl(bx,nY+5,bx,nY+23,1.5,plDk);
  // Diamond emblem
  _s.fillStyle=lt;_s.beginPath();_s.moveTo(bx,nY+9);_s.lineTo(bx-4,nY+14);_s.lineTo(bx,nY+19);_s.lineTo(bx+4,nY+14);_s.closePath();_s.fill();
  // Belt
  sf(bx-12,pY-2,24,4,met);sf(bx-3,pY-1,6,3,lt);
  // Shoulder pads (BIG, with spikes)
  se(bx-17,nY+4,10,6,pl);se(bx-17,nY+4,10,2,met);sl(bx-17,nY-2,bx-20,nY-10,2.5,met);
  se(bx+17,nY+4,10,6,pl);se(bx+17,nY+4,10,2,met);sl(bx+17,nY-2,bx+20,nY-10,2.5,met);

  // Arms — powerful
  const sY=nY+5;
  const lax=bx-24-(o.lAE||0),lay=sY+22+Math.sin(o.lAA||0)*16;
  const rax=bx+24+(o.rAE||0),ray=sY+22+Math.sin(o.rAA||0)*16;
  shadedLimb(bx-17,sY,lax,lay,12,ar,dk,out);
  // Gauntlet
  sf(lax-4,lay-2,12,8,pl);sf(lax-4,lay-2,12,2,met);
  shadedLimb(lax,lay+6,lax-5,lay+18,10,sk,skDk,out);
  sc(lax-5,lay+21,6,sk);sc(lax-5,lay+21,6,out+'25');
  shadedLimb(bx+17,sY,rax,ray,12,ar,dk,out);
  sf(rax-6,ray-2,12,8,pl);sf(rax-6,ray-2,12,2,met);
  shadedLimb(rax,ray+6,rax+5,ray+18,10,sk,skDk,out);
  sc(rax+5,ray+21,6,sk);sc(rax+5,ray+21,6,out+'25');

  // Head — helmeted
  const hY=nY-16+(o.hY||0);
  sf(bx-4,nY-4,8,7,sk);sc(bx,hY,14,sk);
  // Helmet
  se(bx,hY-3,15,11,pl);
  sf(bx-15,hY-4,30,5,met);sf(bx-15,hY-4,30,1.5,out);  // visor bar
  sf(bx-2,hY-18,5,13,met);se(bx,hY-18,4,3,lt);          // crest
  // Helmet outline
  _s.strokeStyle=out;_s.lineWidth=1.5;_s.beginPath();_s.ellipse(bx,hY-3,15,11,0,Math.PI,0);_s.stroke();
  // Hair out back
  for(let i=0;i<14;i++){const sw=Math.sin(i*0.3)*2.5;sf(bx-4+sw-L*0.3,hY+10+i*2,5,2,i%2===0?lt:met);}
  // Face
  sc(bx+5,hY-1,3.5,lt);sf(bx+4,hY-2,4,3,ar);sf(bx+7,hY-2,1.5,1,'#fff'); // eye
  sl(bx+3,hY-6,bx+9,hY-5,1.5,out);                                        // eyebrow
  sc(bx+5,hY+2,1.2,out+'40');                                              // nose
  sf(bx+3,hY+5,5,1.5,'#b09070');                                           // mouth
}

// ============================================================
// NOIR — shadow assassin, cloaked, daggers
// ============================================================
function drawNoir(cx,gy,o){
  const L=o.lean||0,bx=cx+L;
  const sk='#d8c8a8',skDk='#b8a888',cloak='#2a1840',dk='#180c28',acc='#6030a0';
  const glow='#ffcc00',blade='#c0c8d8',bladeDk='#8090a0',out='#0c0618';

  // Full cloak
  _s.fillStyle=cloak+'d0';_s.beginPath();_s.moveTo(bx-14,gy-72);
  _s.quadraticCurveTo(bx-22-L*3,gy-20,bx-16-L*4,gy+6);_s.lineTo(bx+16-L,gy+6);
  _s.quadraticCurveTo(bx+18,gy-20,bx+14,gy-72);_s.closePath();_s.fill();
  _s.strokeStyle=acc+'50';_s.lineWidth=1.5;_s.stroke();
  // Inner pattern
  sl(bx-8,gy-50,bx-14-L*3,gy-8,1,acc+'25');sl(bx+6,gy-50,bx+4-L,gy-8,1,acc+'25');
  sl(bx-4,gy-60,bx-8-L*2,gy-20,0.8,acc+'15');

  // Legs — thin
  const lx=bx-6+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+6+(o.rLS||0),ry=gy-(o.rFL||0);
  shadedLimb(bx-3,gy-36,lx,ly,7,cloak,dk,out);shadedLimb(bx+3,gy-36,rx,ry,7,cloak,dk,out);
  sf(lx-4,ly-3,8,5,dk);sf(rx-4,ry-3,8,5,dk);

  // Torso — narrow
  const nY=gy-72,pY=gy-36;
  st(bx,pY,12,bx,nY,16,cloak,out);
  sf(bx-8,nY,8,pY-nY,dk+'60');
  // High collar
  sf(bx-5,nY,10,4,cloak);sf(bx-5,nY,10,1.5,acc);
  // Belt
  sf(bx-7,pY-2,14,3,acc);
  _s.shadowColor=glow;_s.shadowBlur=4;sf(bx-2,pY-1,4,2,glow);_s.shadowBlur=0;_s.shadowColor='transparent';
  // Accent lines on torso
  sl(bx-5,nY+8,bx-6,pY-6,0.8,acc+'40');sl(bx+5,nY+8,bx+6,pY-6,0.8,acc+'40');

  // Arms — thin, glowing wraps + DAGGERS
  const sY=nY+4;
  const lax=bx-14-(o.lAE||0),lay=sY+18+Math.sin(o.lAA||0)*14;
  const rax=bx+14+(o.rAE||0),ray=sY+18+Math.sin(o.rAA||0)*14;
  shadedLimb(bx-8,sY,lax,lay,6,cloak,dk,out);
  _s.shadowColor='#9060cc';_s.shadowBlur=3;shadedLimb(lax,lay,lax-3,lay+12,5,'#9060cc','#6040a0',out);_s.shadowBlur=0;_s.shadowColor='transparent';
  sc(lax-3,lay+14,3.5,sk);
  // Dagger left
  sl(lax-3,lay+14,lax-6,lay+28,2,blade);sl(lax-6,lay+28,lax-7,lay+30,1.5,bladeDk);
  sl(lax-5,lay+14,lax-1,lay+14,2,bladeDk); // crossguard
  shadedLimb(bx+8,sY,rax,ray,6,cloak,dk,out);
  _s.shadowColor='#9060cc';_s.shadowBlur=3;shadedLimb(rax,ray,rax+3,ray+12,5,'#9060cc','#6040a0',out);_s.shadowBlur=0;_s.shadowColor='transparent';
  sc(rax+3,ray+14,3.5,sk);
  // Dagger right
  sl(rax+3,ray+14,rax+6,ray+28,2,blade);sl(rax+6,ray+28,rax+7,ray+30,1.5,bladeDk);
  sl(rax+1,ray+14,rax+5,ray+14,2,bladeDk);

  // Head — deep dramatic hood
  const hY=nY-14+(o.hY||0);
  sf(bx-2,nY-4,5,6,sk);sc(bx,hY,11,sk);
  // Hood
  _s.fillStyle=cloak;_s.beginPath();_s.ellipse(bx,hY-2,18,14,0,Math.PI,0);_s.fill();
  _s.strokeStyle=acc;_s.lineWidth=2.5;_s.beginPath();_s.ellipse(bx,hY-2,18,14,0,Math.PI,0);_s.stroke();
  // Pointed tips
  sl(bx-17,hY-2,bx-22,hY-12,3,acc);sl(bx+17,hY-2,bx+22,hY-12,3,acc);
  // Shadow covering lower face
  se(bx,hY+3,10,6,cloak+'e0');
  // GLOWING EYES
  _s.shadowColor=glow;_s.shadowBlur=8;
  sf(bx-5,hY-3,5,3,glow);sf(bx+2,hY-3,5,3,glow);
  // Eye inner detail
  sf(bx-4,hY-2,3,1,'#fff8cc');sf(bx+3,hY-2,3,1,'#fff8cc');
  _s.shadowBlur=0;_s.shadowColor='transparent';
}

// ============================================================
// GENERATION + DRAWING + INIT
// ============================================================
function generateSpritesForCharacter(c){
  const id=c.id;spriteCache[id]={};
  const fn=id==='aurora'?drawAurora:id==='crimson'?drawCrimson:id==='jade'?drawJade:id==='noir'?drawNoir:drawAurora;
  for(const[a,d]of Object.entries(SPRITE_ANIMS)){
    spriteCache[id][a]=[];
    for(let f=0;f<d.frames;f++){
      const cv=document.createElement('canvas');cv.width=SPRITE_W;cv.height=SPRITE_H;
      _s=cv.getContext('2d');_s.imageSmoothingEnabled=false;
      fn(SPRITE_W/2,SPRITE_H-14,gp(a,f,d.frames));
      spriteCache[id][a].push(cv);
    }
  }
  _s=null;
}

function drawFighterSprite(f){
  const id=f.character&&f.character.id;if(!id||!spriteCache[id])return false;
  const an=getSpriteAnim(f),am=spriteCache[id][an];if(!am||!am.length)return false;
  const fr=am[Math.min(getSpriteFrame(f,an),am.length-1)];if(!fr)return false;
  ctx.save();ctx.imageSmoothingEnabled=false;
  const dx=f.x-SPRITE_DRAW_W/2,dy=f.y-SPRITE_DRAW_H+22;
  if(f.facing<0){ctx.translate(f.x,0);ctx.scale(-1,1);ctx.translate(-f.x,0);}
  if(f.hurtFlash>0&&Math.floor(f.hurtFlash/2)%2===0){
    const t=document.createElement('canvas');t.width=fr.width;t.height=fr.height;
    const tc=t.getContext('2d');tc.drawImage(fr,0,0);tc.globalCompositeOperation='source-atop';
    tc.fillStyle='rgba(255,200,200,0.55)';tc.fillRect(0,0,t.width,t.height);
    ctx.drawImage(t,dx,dy,SPRITE_DRAW_W,SPRITE_DRAW_H);
  }else{ctx.drawImage(fr,dx,dy,SPRITE_DRAW_W,SPRITE_DRAW_H);}
  ctx.imageSmoothingEnabled=true;ctx.restore();return true;
}

// Real-time character aura — subtle glow beneath each fighter
function drawCharacterAura(f){
  if(!f||!f.character)return;
  const glow=f.character.glow||'#ffffff';
  const pulse=0.3+Math.abs(Math.sin(globalTime*0.06))*0.2;
  // Ground light pool
  const g=ctx.createRadialGradient(f.x,GROUND+4,0,f.x,GROUND+4,40);
  g.addColorStop(0,glow.slice(0,7)+(Math.round(pulse*60).toString(16).padStart(2,'0')));
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.fillRect(f.x-40,GROUND-2,80,20);
}

function initSpriteCache(){for(const c of CHARACTERS)generateSpritesForCharacter(c);}
if(typeof window!=='undefined')window.addEventListener('load',()=>setTimeout(initSpriteCache,100));

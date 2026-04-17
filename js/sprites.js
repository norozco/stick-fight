// ============================================================
// SPRITES — detailed pixel-art with personality
// ============================================================
const SPRITE_W=160,SPRITE_H=220,SPRITE_SCALE=1.4;
const SPRITE_DRAW_W=Math.round(SPRITE_W*SPRITE_SCALE),SPRITE_DRAW_H=Math.round(SPRITE_H*SPRITE_SCALE);
const spriteCache={};
const SPRITE_ANIMS={idle:{frames:6,rate:10},walk:{frames:8,rate:4},attack_light:{frames:6,rate:3},attack_heavy:{frames:6,rate:5},hurt:{frames:3,rate:6},jump:{frames:3,rate:8},block:{frames:2,rate:8},dash:{frames:3,rate:3},attack_ult:{frames:8,rate:6},attack_throw:{frames:6,rate:4},ko:{frames:4,rate:5},knockdown:{frames:2,rate:12},grabbed:{frames:3,rate:6},thrown:{frames:3,rate:4},kick_light:{frames:6,rate:3},kick_heavy:{frames:6,rate:5}};
function getSpriteAnim(f){
  if(f.state==='ko')return'ko';
  if(f.state==='knockdown')return'knockdown';
  if(f.state==='grabbed')return'grabbed';
  if(f.state==='thrown')return'thrown';
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
function shadedLimb(x1,y1,x2,y2,w,l,d,o){const dx=x2-x1,dy=y2-y1,ln=Math.sqrt(dx*dx+dy*dy)||1,nx=-dy/ln,ny=dx/ln;_s.beginPath();_s.moveTo(x1,y1);_s.lineTo(x2,y2);_s.lineTo(x2+nx*w/2,y2+ny*w/2);_s.lineTo(x1+nx*w/2,y1+ny*w/2);_s.closePath();_s.fillStyle=l;_s.fill();_s.beginPath();_s.moveTo(x1,y1);_s.lineTo(x2,y2);_s.lineTo(x2-nx*w/2,y2-ny*w/2);_s.lineTo(x1-nx*w/2,y1-ny*w/2);_s.closePath();_s.fillStyle=d;_s.fill();if(o){_s.strokeStyle=o;_s.lineWidth=1;_s.beginPath();_s.moveTo(x1+nx*w/2,y1+ny*w/2);_s.lineTo(x2+nx*w/2,y2+ny*w/2);_s.lineTo(x2-nx*w/2,y2-ny*w/2);_s.lineTo(x1-nx*w/2,y1-ny*w/2);_s.closePath();_s.stroke();}}
// === PROFESSIONAL DRAWING PRIMITIVES ===
// drawLimb — tapered, contoured limb with bezier muscle bulge and 3-tone shading
function drawLimb(x1,y1,x2,y2,w1,w2,light,mid,dark,outline){
  const dx=x2-x1,dy=y2-y1,ln=Math.sqrt(dx*dx+dy*dy)||1;
  const nx=-dy/ln,ny=dx/ln; // perpendicular normal
  const mx=(x1+x2)*0.5,my=(y1+y2)*0.5; // midpoint
  const bulge=Math.max(w1,w2)*0.18; // subtle muscle bulge at midpoint
  // Control points for the bezier contour (right side = highlight, left side = shadow)
  const r1x=x1+nx*w1/2, r1y=y1+ny*w1/2;
  const r2x=x2+nx*w2/2, r2y=y2+ny*w2/2;
  const l1x=x1-nx*w1/2, l1y=y1-ny*w1/2;
  const l2x=x2-nx*w2/2, l2y=y2-ny*w2/2;
  const rmx=mx+nx*(Math.max(w1,w2)/2+bulge), rmy=my+ny*(Math.max(w1,w2)/2+bulge);
  const lmx=mx-nx*(Math.max(w1,w2)/2+bulge), lmy=my-ny*(Math.max(w1,w2)/2+bulge);
  // Full shape path (used for outline and midtone fill)
  function limbPath(){
    _s.beginPath();
    _s.moveTo(r1x,r1y);
    _s.quadraticCurveTo(rmx,rmy,r2x,r2y);
    _s.lineTo(l2x,l2y);
    _s.quadraticCurveTo(lmx,lmy,l1x,l1y);
    _s.closePath();
  }
  // 1. Midtone base fill
  limbPath();_s.fillStyle=mid;_s.fill();
  // 2. Highlight on right side (light catches the outer edge)
  _s.beginPath();
  _s.moveTo(r1x,r1y);
  _s.quadraticCurveTo(rmx,rmy,r2x,r2y);
  _s.lineTo((r2x+x2)/2,(r2y+y2)/2);
  _s.quadraticCurveTo((rmx+mx)/2,(rmy+my)/2,(r1x+x1)/2,(r1y+y1)/2);
  _s.closePath();_s.fillStyle=light;_s.fill();
  // 3. Shadow on left side (inner/underside)
  _s.beginPath();
  _s.moveTo(l1x,l1y);
  _s.quadraticCurveTo(lmx,lmy,l2x,l2y);
  _s.lineTo((l2x+x2)/2,(l2y+y2)/2);
  _s.quadraticCurveTo((lmx+mx)/2,(lmy+my)/2,(l1x+x1)/2,(l1y+y1)/2);
  _s.closePath();_s.fillStyle=dark;_s.fill();
  // 4. Outline for definition
  if(outline){limbPath();_s.strokeStyle=outline;_s.lineWidth=1;_s.stroke();}
}
// drawFist — clenched fist shape with knuckle definition
function drawFist(cx,cy,size,color,darkColor,outline){
  const w=size*1.3,h=size*1.1;
  // Main fist shape — slightly rectangular, rounded corners
  _s.fillStyle=color;
  _s.beginPath();
  _s.moveTo(cx-w/2+2,cy-h/2);
  _s.lineTo(cx+w/2-2,cy-h/2);
  _s.quadraticCurveTo(cx+w/2,cy-h/2,cx+w/2,cy-h/2+2);
  _s.lineTo(cx+w/2,cy+h/2-2);
  _s.quadraticCurveTo(cx+w/2,cy+h/2,cx+w/2-2,cy+h/2);
  _s.lineTo(cx-w/2+2,cy+h/2);
  _s.quadraticCurveTo(cx-w/2,cy+h/2,cx-w/2,cy+h/2-2);
  _s.lineTo(cx-w/2,cy-h/2+2);
  _s.quadraticCurveTo(cx-w/2,cy-h/2,cx-w/2+2,cy-h/2);
  _s.closePath();_s.fill();
  // Dark underside
  _s.fillStyle=darkColor;
  _s.fillRect(cx-w/2+1,cy,w-2,h/2-1);
  // Knuckle line (lighter ridge across the top)
  _s.strokeStyle=color.replace(/[0-9a-f]{2}$/i,'ff');
  _s.lineWidth=1.2;_s.beginPath();
  _s.moveTo(cx-w/2+2,cy-h/4);_s.lineTo(cx+w/2-2,cy-h/4);_s.stroke();
  // Knuckle bumps
  for(let i=-1;i<=1;i++){
    sc(cx+i*(w/4),cy-h/4,1.5,darkColor+'60');
  }
  // Thumb tuck
  _s.fillStyle=darkColor;
  _s.fillRect(cx-w/2-1,cy-2,3,h/2);
  // Outline
  if(outline){_s.strokeStyle=outline;_s.lineWidth=1.5;
    _s.beginPath();
    _s.moveTo(cx-w/2+2,cy-h/2);_s.lineTo(cx+w/2-2,cy-h/2);
    _s.quadraticCurveTo(cx+w/2,cy-h/2,cx+w/2,cy-h/2+2);
    _s.lineTo(cx+w/2,cy+h/2-2);
    _s.quadraticCurveTo(cx+w/2,cy+h/2,cx+w/2-2,cy+h/2);
    _s.lineTo(cx-w/2+2,cy+h/2);
    _s.quadraticCurveTo(cx-w/2,cy+h/2,cx-w/2,cy+h/2-2);
    _s.lineTo(cx-w/2,cy-h/2+2);
    _s.quadraticCurveTo(cx-w/2,cy-h/2,cx-w/2+2,cy-h/2);
    _s.closePath();_s.stroke();}
}
// drawBoot — angled boot/shoe with visible sole
function drawBoot(x,y,w,h,color,darkColor,soleColor,outline,angle){
  _s.save();_s.translate(x,y);_s.rotate(angle||0);
  // Boot upper
  _s.fillStyle=color;_s.beginPath();
  _s.moveTo(-w/2,0);_s.lineTo(w/2+2,0);
  _s.lineTo(w/2+4,-h*0.3); // toe extends forward
  _s.lineTo(w/2+2,-h*0.7);
  _s.lineTo(-w/2,-h);
  _s.lineTo(-w/2-1,-h*0.5);
  _s.closePath();_s.fill();
  // Dark shading on back half
  _s.fillStyle=darkColor;_s.beginPath();
  _s.moveTo(-w/2,0);_s.lineTo(0,0);_s.lineTo(0,-h);
  _s.lineTo(-w/2,-h);_s.lineTo(-w/2-1,-h*0.5);_s.closePath();_s.fill();
  // Sole (thicker, different color)
  _s.fillStyle=soleColor;
  _s.fillRect(-w/2-1,0,w+5,h*0.25);
  // Sole edge highlight
  _s.fillStyle=soleColor+'80';
  _s.fillRect(-w/2,h*0.25-1,w+4,1);
  // Outline
  if(outline){_s.strokeStyle=outline;_s.lineWidth=1.5;
    _s.beginPath();_s.moveTo(-w/2,-1);_s.lineTo(w/2+4,-h*0.3);
    _s.lineTo(w/2+2,-h*0.7);_s.lineTo(-w/2,-h);
    _s.lineTo(-w/2-1,-h*0.5);_s.lineTo(-w/2,-1);
    _s.lineTo(w/2+3,-1);_s.stroke();
  }
  _s.restore();
}
function gp(a,f,t){const p=t>1?f/(t-1):0;const o={hY:0,lean:0,lAA:0,rAA:0,lLS:0,rLS:0,lFL:0,rFL:0,rAE:0,lAE:0,rFA:0,lFA:0,rFist:0,lFist:0,hipRot:0,torsoTwist:0};
if(a==="idle"){o.hY=Math.sin(p*Math.PI*2)*3;o.lLS=Math.sin(p*Math.PI*2)*2;o.rLS=-Math.sin(p*Math.PI*2)*2;o.lAA=Math.sin(p*Math.PI*2)*0.15;o.rAA=-Math.sin(p*Math.PI*2)*0.15;}
else if(a==="walk"){const s=Math.sin(p*Math.PI*2);o.lLS=-s*18;o.rLS=s*18;o.lFL=Math.max(0,s)*12;o.rFL=Math.max(0,-s)*12;o.lAA=s*0.8;o.rAA=-s*0.8;o.lean=4+Math.abs(s)*2;o.hY=Math.abs(s)*3;}
else if(a==="attack_light"){
  // 3-phase: anticipation (0-0.2), strike (0.2-0.55), recovery (0.55-1)
  if(p<0.2){
    // ANTICIPATION — shoulder loads, fist chambers at chin
    const pp=p/0.2;
    o.rAA=-0.4*pp;       // arm pulls back
    o.rAE=-8*pp;         // fist retracts to chin
    o.lean=-4*pp;        // body coils slightly
    o.hY=pp*2;           // slight squat
    o.rLS=-3*pp;         // rear foot loads
    o.rFist=pp;          // fist clenches during windup
    o.torsoTwist=-3*pp;  // coil torso back
  }else if(p<0.55){
    // STRIKE — fist drives FORWARD, shoulder rotates in, body pushes
    const sp=(p-0.2)/0.35;
    o.rAE=sp*46;         // fist extends toward opponent
    o.rAA=0.15;          // arm straight/slightly down
    o.lean=-4+sp*16;     // body rotates into punch
    o.hY=2-sp*3;         // rises from squat
    o.rLS=-3+sp*10;      // rear foot pivots
    o.lAA=-0.3;          // guard arm stays up
    o.rFist=1;           // fist fully clenched during strike
    o.torsoTwist=-3+sp*10; // torso twists into punch
  }else{
    // RECOVERY — retract fist, body settles
    const rp=(p-0.55)/0.45;
    o.rAE=46-rp*40;
    o.lean=12-rp*10;
    o.hY=-1+rp;
    o.lAA=-0.3+rp*0.3;
    o.rLS=7-rp*7;
    o.rFist=1-rp;        // fist unclenches
    o.torsoTwist=7-rp*7; // torso returns
  }
}
else if(a==="attack_heavy"){
  // 3-phase: big windup (0-0.35), explosive strike (0.35-0.65), follow-through (0.65-1)
  if(p<0.35){
    // BIG WINDUP — fist behind head, body coils backward, deep squat
    const pp=p/0.35;
    o.rAA=-1.8*pp;       // arm pulls WAY back
    o.rAE=-12*pp;        // fist goes behind head
    o.lean=-14*pp;       // body coils away from target
    o.hY=4*pp;           // drops into squat
    o.rLS=-8*pp;         // rear foot loads weight
    o.lAA=-0.4*pp;       // lead arm guards
    o.lAE=6*pp;          // lead hand forward for guard
    o.rFist=pp;          // fist clenches
    o.torsoTwist=-8*pp;  // deep torso coil back
    o.hipRot=-4*pp;      // hips load
  }else if(p<0.65){
    // STRIKE — body UNCOILS, fist explodes forward, full hip rotation
    const sp=(p-0.35)/0.3;
    o.rAA=-1.8+sp*2.0;   // arm swings from behind to forward
    o.rAE=-12+sp*60;     // massive extension
    o.lean=-14+sp*32;    // full body rotation through
    o.hY=4-sp*7;         // rises explosively from squat
    o.rLS=-8+sp*18;      // rear foot pivots hard
    o.lLS=-sp*8;         // lead foot braces
    o.lAA=-0.4+sp*0.2;
    o.lAE=6-sp*4;
    o.rFist=1;           // full fist
    o.torsoTwist=-8+sp*22; // explosive torso rotation through
    o.hipRot=-4+sp*12;   // hips drive into punch
  }else{
    // FOLLOW-THROUGH — extended pose holds briefly, slow retract
    const rp=(p-0.65)/0.35;
    o.rAE=48-rp*38;
    o.rAA=0.2-rp*0.2;
    o.lean=18-rp*16;
    o.hY=-3+rp*3;
    o.rLS=10-rp*10;
    o.lLS=-8+rp*8;
    o.lAA=-0.2+rp*0.2;
    o.rFist=1-rp*0.8;    // slowly unclench
    o.torsoTwist=14-rp*14; // settle back
    o.hipRot=8-rp*8;     // hips return
  }
}
else if(a==="hurt"){o.lean=-12;o.hY=6;o.lAA=0.5;o.rAA=0.5;o.lLS=-4;o.rLS=4;}
else if(a==="jump"){o.lFL=16;o.rFL=18;o.hY=-6;o.lAA=-0.6;o.rAA=-0.6;o.lLS=-4;o.rLS=4;}
else if(a==="block"){o.lAA=-1.4;o.rAA=-1.0;o.lean=-4;o.hY=2;o.lLS=-4;o.rLS=4;}
else if(a==="dash"){o.lean=16;o.lLS=-20;o.rLS=10;o.lFL=6;o.hY=-3;o.lAA=0.6;o.rAA=-0.4;}
else if(a==="attack_ult"){if(p<0.25){o.rAA=-1.8;o.lean=-8;o.hY=3;o.lLS=-6;o.rFist=1;o.torsoTwist=-6;o.hipRot=-3;}else if(p<0.65){const ext=(p-0.25)/0.4;o.rAE=44;o.lean=12;o.lLS=-ext*8;o.rLS=ext*12;o.hY=-ext*4;o.rFist=1;o.torsoTwist=8;o.hipRot=ext*8;}else{o.rAA=-2.2;o.lean=14;o.hY=-5;o.rLS=8;o.lFL=6;o.rFist=0.5;o.hipRot=6;}}
else if(a==="attack_throw"){if(p<0.3){o.rAE=32;o.lAE=32;o.lean=6;}else{const tp=(p-0.3)/0.7;o.rAA=-Math.PI*tp;o.rAE=24;o.lean=8-tp*16;o.hY=tp*4;}}
else if(a==="kick_light"){
  // Quick chamber and snap — 3 phases
  if(p<0.2){
    // Chamber — knee rises, body braces
    const pp=p/0.2;
    o.rFL=pp*28; o.rLS=-pp*6; o.lean=-pp*6;
    o.hY=pp*2; o.lAA=-0.3; o.rAA=0.3;
    o.hipRot=-pp*3;
  }else if(p<0.5){
    // Snap — leg extends forward, hip drives
    const sp=(p-0.2)/0.3;
    o.rFL=28-sp*14; o.rLS=-6+sp*30; o.lean=-6+sp*14;
    o.hY=2-sp*3; o.lAA=-0.4; o.rAA=0.5;
    o.hipRot=-3+sp*10;
  }else{
    // Recovery — leg returns
    const rp=(p-0.5)/0.5;
    o.rFL=14-rp*14; o.rLS=24-rp*24; o.lean=8-rp*8;
    o.hY=-1+rp; o.hipRot=7-rp*7;
  }
}
else if(a==="kick_heavy"){
  // Bigger arc, more commitment — roundhouse style
  if(p<0.25){
    // Deep chamber — big windup
    const pp=p/0.25;
    o.rFL=pp*34; o.rLS=-pp*10; o.lean=-pp*10;
    o.hY=pp*4; o.lAA=-0.5; o.rAA=0.6;
    o.hipRot=-pp*6; o.torsoTwist=-pp*4;
  }else if(p<0.55){
    // Full extension — sweeping arc
    const sp=(p-0.25)/0.3;
    o.rFL=34-sp*18; o.rLS=-10+sp*42; o.lean=-10+sp*22;
    o.hY=4-sp*6; o.lAA=-0.6; o.rAA=0.7;
    o.hipRot=-6+sp*16; o.torsoTwist=-4+sp*10;
  }else{
    // Follow-through + recovery
    const rp=(p-0.55)/0.45;
    o.rFL=16-rp*16; o.rLS=32-rp*32; o.lean=12-rp*12;
    o.hY=-2+rp*2; o.hipRot=10-rp*10; o.torsoTwist=6-rp*6;
  }
}
else if(a==="ko"){
  // Collapsing backward — body tilts, arms go limp, head drops
  const col=Math.min(p,1);
  o.lean=-22-col*14;o.hY=8+col*12;o.lAA=0.7+col*0.5;o.rAA=0.6+col*0.4;
  o.lLS=-6-col*10;o.rLS=6+col*8;o.lFL=col*8;o.rFL=col*4;
}
else if(a==="knockdown"){
  // Flat on ground — splayed, motionless defeated
  o.lean=-30;o.hY=24;o.lAA=1.2;o.rAA=1.0;
  o.lLS=-16;o.rLS=16;o.lFL=0;o.rFL=0;
}
else if(a==="grabbed"){
  // Off-balance, pulled forward, arms dangling
  o.lean=14;o.hY=6;o.lAA=0.5;o.rAA=0.4;
  o.lLS=-4;o.rLS=8;o.lFL=Math.sin(p*Math.PI)*6;
}
else if(a==="thrown"){
  // Ragdoll tumble through the air
  const spin=p*Math.PI*1.5;
  o.lean=-18+Math.sin(spin)*20;o.hY=Math.cos(spin)*8;
  o.lAA=0.8+Math.sin(spin)*0.5;o.rAA=-0.6+Math.cos(spin)*0.4;
  o.lLS=-12+Math.sin(spin)*8;o.rLS=12-Math.sin(spin)*8;
  o.lFL=Math.max(0,Math.sin(spin))*14;o.rFL=Math.max(0,-Math.sin(spin))*14;
}
return o;}
function pixelFace(bx,hY,opts){const{eyeColor,eyeW,eyeH,browColor,browAngle,mouthW,mouthColor,mouthY,noseColor,skinDark,outline,expression}=opts;const o=outline||'#1a1020';sf(bx-8,hY-4,eyeW+3,eyeH+2,'#ffffff');sf(bx-7,hY-3,eyeW,eyeH,eyeColor);sf(bx-6,hY-2,2,2,o);sf(bx-7,hY-4,1,1,'#ffffff');sf(bx+3,hY-4,eyeW+3,eyeH+2,'#ffffff');sf(bx+4,hY-3,eyeW,eyeH,eyeColor);sf(bx+5,hY-2,2,2,o);sf(bx+4,hY-4,1,1,'#ffffff');sl(bx-9,hY-7+browAngle,bx-3,hY-8,2,browColor||o);sl(bx+2,hY-8,bx+8,hY-7-browAngle,2,browColor||o);sf(bx-1,hY+2,3,2,noseColor||skinDark||'#c0a090');const my=mouthY||7;if(expression==='smile'){sf(bx-2,hY+my,5,2,mouthColor||'#d09090');sf(bx-1,hY+my,3,1,'#e8a0a0');}else if(expression==='grimace'){sf(bx-3,hY+my,mouthW||7,3,mouthColor||o);sf(bx-2,hY+my+1,2,1,'#ffffff');sf(bx+1,hY+my+1,2,1,'#ffffff');}else if(expression==='serious'){sf(bx-2,hY+my,mouthW||5,2,mouthColor||'#a07060');}else if(expression!=='hidden'){sf(bx-2,hY+my,mouthW||5,2,mouthColor||'#c08080');}}

// AURORA — Ice Princess. Professional pixel-art with bezier contours,
// tapered limbs, flowing hair, 3-tone shading throughout.
function drawAurora(cx,gy,o){const L=o.lean||0,bx=cx+L;
const tw=o.torsoTwist||0,hr=o.hipRot||0;
const sk='#f2ddd0',skDk='#d4b8a8',skLt='#fff0e8',skMid='#e8d0c0';
const hair='#80d8ee',hairDk='#50a8cc',hairLt='#b0f0ff';
const top='#3a78b0',topDk='#224870',topLt='#5898d0',topMid='#4888c0';
const bot='#2858a0',bootC='#1a3860',bootDk='#0e2440',bootSole='#0a1830';
const out='#102838',acc='#60ccee',accLt='#90e0ff';
const twOff=tw*0.3;
const nY=gy-88,pY=gy-44;

// === FLOWING HAIR — BEHIND BODY (pixel strands) ===
// Long flowing hair built from staggered pixel rows
const hShift=(-L*0.8)|0;
for(let i=0;i<28;i++){
  const w=Math.max(4,16-i*0.4)|0;
  const xo=((i%3===0?1:i%3===1?-1:0)+(hShift*i*0.04))|0;
  const yy=gy-102+i*4;
  const c=i<5?hairLt:i<18?hair:hairDk;
  sf(bx-w/2+xo-4,yy,w,3,c);
  // shadow on left edge of strands
  if(i>2)sf(bx-w/2+xo-4,yy,2,3,hairDk);
}
// Hair ribbon — pixel block
sf(bx-7,gy-97,4,4,acc);sf(bx-6,gy-96,2,2,accLt);

// === CAPE/TRAIN — pixel sheer behind body ===
for(let i=0;i<12;i++){
  const w=(20+i*1.5)|0;
  const a=Math.max(6,28-i*2);
  sf(bx-w/2-2,gy-82+i*8,w,7,'rgba(96,204,238,0.'+((a<10?'0':'')+a)+')');
}

// === LEGS — pixel tapered columns ===
const lx=(bx-8+(o.lLS||0)+hr*0.3)|0, ly=(gy-(o.lFL||0))|0;
const rx=(bx+8+(o.rLS||0)+hr*0.3)|0, ry=(gy-(o.rFL||0))|0;
// Helper: draw a pixel leg from (x1,y1) to (x2,y2)
function pxLeg(x1,y1,x2,y2,wTop,wBot,light,mid,dark,oc){
  const steps=8;
  for(let i=0;i<steps;i++){
    const t=i/steps;
    const px=(x1+(x2-x1)*t)|0;
    const py=(y1+(y2-y1)*t)|0;
    const w=(wTop+(wBot-wTop)*t)|0;
    const segH=((y2-y1)/steps)|0||2;
    const c=t<0.3?light:t<0.7?mid:dark;
    sf(px-w/2,py,w,segH+1,c);
    // left-edge shadow
    sf(px-w/2,py,2,segH+1,dark);
    // outline left & right
    sf(px-w/2-1,py,1,segH+1,oc);
    sf(px+w/2,py,1,segH+1,oc);
  }
}
// Left thigh + calf
const lKneeX=((bx-5+lx)/2)|0, lKneeY=((gy-44+ly)/2)|0;
const rKneeX=((bx+5+rx)/2)|0, rKneeY=((gy-44+ry)/2)|0;
pxLeg(bx-5,gy-44,lKneeX,lKneeY,10,8,skLt,sk,skDk,out);
pxLeg(lKneeX,lKneeY,lx,ly,8,6,skLt,sk,skDk,out);
// Right thigh + calf
pxLeg(bx+5,gy-44,rKneeX,rKneeY,10,8,skLt,sk,skDk,out);
pxLeg(rKneeX,rKneeY,rx,ry,8,6,skLt,sk,skDk,out);

// === BOOTS — angular pixel blocks ===
function pxBoot(fx,fy){
  // Boot upper
  sf(fx-5,fy-14,10,8,bootC);
  sf(fx-5,fy-6,10,6,bootC);
  // Boot sole (extends forward)
  sf(fx-5,fy,12,3,bootSole);
  // Inner shadow
  sf(fx-5,fy-14,2,14,bootDk);
  // Highlight on right
  sf(fx+3,fy-12,2,6,top);
  // Outline
  sf(fx-6,fy-14,1,17,out);  // left
  sf(fx+5,fy-14,1,14,out);  // right upper
  sf(fx+7,fy,1,3,out);      // right sole
  sf(fx-5,fy-15,10,1,out);  // top
  sf(fx-5,fy+3,12,1,out);   // bottom
  // Accent trim
  sf(fx-5,fy-14,10,2,acc);
}
pxBoot(lx,ly);pxBoot(rx,ry);

// === TORSO — pixel hourglass built row by row ===
const tx=bx+twOff;
// Shoulders row by row — wide at shoulders, pinch at waist, flare at hips
const torsoRows=[
  // [yOff, halfW, color]  — relative to nY
  [0, 11, topMid],[2, 12, topMid],[4, 12, topMid],    // shoulders
  [6, 11, topMid],[8, 10, topMid],[10, 10, topMid],   // upper chest
  [12, 9, topMid],[14, 9, topMid],                      // bust area
  [16, 8, topMid],[18, 7, topMid],                      // narrowing
  [20, 6, topMid],[22, 6, topMid],                      // waist (narrowest)
  [24, 6, topMid],[26, 6, topMid],                      // waist
  [28, 7, topMid],[30, 8, topMid],                      // hips widening
  [32, 9, topMid],[34, 10, topMid],                     // hips
  [36, 11, topMid],[38, 12, topMid],                    // hip flare
  [40, 13, topMid],[42, 13, topMid]                     // bottom
];
for(let i=0;i<torsoRows.length;i++){
  const r=torsoRows[i];
  const hrOff=(r[0]/44*hr*0.3)|0;
  sf(tx-r[1]+hrOff, nY+r[0], r[1]*2, 2, r[2]);
}
// Shadow on left 3px of torso
for(let i=0;i<torsoRows.length;i++){
  const r=torsoRows[i];
  const hrOff=(r[0]/44*hr*0.3)|0;
  sf(tx-r[1]+hrOff, nY+r[0], 3, 2, topDk);
}
// Highlight on right 3px of torso
for(let i=0;i<torsoRows.length;i++){
  const r=torsoRows[i];
  const hrOff=(r[0]/44*hr*0.3)|0;
  sf(tx+r[1]-3+hrOff, nY+r[0], 3, 2, topLt);
}
// Outline left & right edges
for(let i=0;i<torsoRows.length;i++){
  const r=torsoRows[i];
  const hrOff=(r[0]/44*hr*0.3)|0;
  sf(tx-r[1]-1+hrOff, nY+r[0], 1, 2, out);
  sf(tx+r[1]+hrOff, nY+r[0], 1, 2, out);
}
// Top and bottom outline
sf(tx-11, nY-1, 22, 1, out);
sf(tx-13+(hr*0.3)|0, pY, 26, 1, out);

// Bust definition — pixel highlight blocks
sf(tx-7, nY+12, 5, 3, topLt+'55');
sf(tx+3, nY+12, 5, 3, topLt+'55');

// V-neckline (skin showing) — pixel triangle
sf(tx-1, nY+2, 2, 2, sk);
sf(tx-2, nY+4, 4, 2, sk);
sf(tx-3, nY+6, 6, 2, sk);
sf(tx-4, nY+8, 8, 2, sk);
sf(tx-5, nY+10, 10, 2, sk);
sf(tx-6, nY+12, 12, 4, sk);
// Neckline accent edges
sf(tx-1, nY+2, 1, 14, acc); // left V edge
sf(tx+1, nY+2, 1, 2, acc);  // right V starts
sf(tx+2, nY+4, 1, 2, acc);
sf(tx+3, nY+6, 1, 2, acc);
sf(tx+4, nY+8, 1, 2, acc);
sf(tx+5, nY+10, 1, 2, acc);
sf(tx-2, nY+4, 1, 2, acc);
sf(tx-3, nY+6, 1, 2, acc);
sf(tx-4, nY+8, 1, 2, acc);
sf(tx-5, nY+10, 1, 2, acc);

// Waist belt with gem
sf(tx-7, nY+27, 14, 3, acc);
sf(tx-1, nY+28, 2, 2, '#ffffff');
sf(tx-2, nY+27, 4, 1, accLt);

// Armor accent lines — pixel dithered
for(let i=0;i<6;i++){
  sf(tx-8+i, nY+6+i*3, 1, 2, acc+'50');
  sf(tx+8-i, nY+6+i*3, 1, 2, acc+'50');
}

// Split skirt flares — pixel blocks below hips
const skHr=(hr*0.3)|0;
// Left flare
sf(bx-16+skHr, pY, 6, 3, bot);sf(bx-18+skHr, pY+3, 6, 3, bot);
sf(bx-20+skHr, pY+6, 6, 3, bot);sf(bx-21+skHr, pY+9, 5, 3, bot);
sf(bx-16+skHr, pY, 2, 12, topDk); // shadow edge
// Right flare
sf(bx+10+skHr, pY, 6, 3, bot);sf(bx+12+skHr, pY+3, 6, 3, bot);
sf(bx+14+skHr, pY+6, 6, 3, bot);sf(bx+16+skHr, pY+9, 5, 3, bot);
sf(bx+18+skHr, pY, 2, 12, topLt); // highlight edge
// Skirt hem accent
sf(tx-14+skHr, pY, 28, 2, acc);

// === ARMS — pixel tapered columns ===
const sY=nY+4;
const lax=(bx-18-(o.lAE||0)+twOff)|0, lay=(sY+22+Math.sin(o.lAA||0)*16)|0;
const rax=(bx+18+(o.rAE||0)+twOff)|0, ray=(sY+22+Math.sin(o.rAA||0)*16)|0;
const lfax=(lax-4+(o.lFA||0))|0, lfay=(lay+14)|0;
const rfax=(rax+4+(o.rFA||0))|0, rfay=(ray+14)|0;

// Helper: draw pixel arm segment
function pxArm(x1,y1,x2,y2,wTop,wBot,light,mid,dark,oc){
  const steps=6;
  for(let i=0;i<steps;i++){
    const t=i/steps;
    const px=(x1+(x2-x1)*t)|0;
    const py=(y1+(y2-y1)*t)|0;
    const w=(wTop+(wBot-wTop)*t)|0;
    const segH=Math.max(2,((y2-y1)/steps)|0);
    const c=t<0.3?light:t<0.7?mid:dark;
    sf(px-w/2,py,w,segH+1,c);
    sf(px-w/2,py,2,segH+1,dark); // inner shadow
    sf(px-w/2-1,py,1,segH+1,oc);
    sf(px+w/2,py,1,segH+1,oc);
  }
}
// Left upper arm (sleeve)
pxArm(bx-11+twOff,sY,lax,lay,8,5,topLt,topMid,topDk,out);
// Left forearm (skin)
pxArm(lax,lay,lfax,lfay,5,4,skLt,skMid,skDk,out);
// Ice bracer — pixel block
sf(lax-3,lay-2,6,4,accLt);sf(lax-2,lay-1,4,2,'#ffffff');
// Left hand
if((o.lFist||0)>0.5){
  // Pixel fist
  sf(lfax-3,lfay,6,5,sk);
  sf(lfax-3,lfay,6,1,skLt);   // knuckle highlight
  sf(lfax-3,lfay+3,6,2,skDk); // underside shadow
  sf(lfax-4,lfay,1,5,out);sf(lfax+3,lfay,1,5,out); // outline
  sf(lfax-3,lfay-1,6,1,out);sf(lfax-3,lfay+5,6,1,out);
}else{
  // Pixel open hand
  sf(lfax-2,lfay,4,4,sk);
  sf(lfax-2,lfay,4,1,skLt);
  sf(lfax-3,lfay,1,4,out);sf(lfax+2,lfay,1,4,out);
}

// Right upper arm (sleeve)
pxArm(bx+11+twOff,sY,rax,ray,8,5,topLt,topMid,topDk,out);
// Right forearm (skin)
pxArm(rax,ray,rfax,rfay,5,4,skLt,skMid,skDk,out);
// Ice bracer — pixel block
sf(rax-2,ray-2,6,4,accLt);sf(rax-1,ray-1,4,2,'#ffffff');
// Right hand
if((o.rFist||0)>0.5){
  sf(rfax-3,rfay,6,5,sk);
  sf(rfax-3,rfay,6,1,skLt);
  sf(rfax-3,rfay+3,6,2,skDk);
  sf(rfax-4,rfay,1,5,out);sf(rfax+3,rfay,1,5,out);
  sf(rfax-3,rfay-1,6,1,out);sf(rfax-3,rfay+5,6,1,out);
}else{
  sf(rfax-2,rfay,4,4,sk);
  sf(rfax-2,rfay,4,1,skLt);
  sf(rfax-3,rfay,1,4,out);sf(rfax+2,rfay,1,4,out);
}

// === HEAD — pixel block construction ===
const hY=nY-26+(o.hY||0);

// Neck — pixel block
sf(bx-3+twOff,nY-7,6,9,skMid);
sf(bx-3+twOff,nY-7,3,9,skDk); // shadow half

// Head — built from pixel rows (rounded rectangle, not ellipse)
// Top rows (narrow — forehead curve)
sf(bx-14,hY-18,28,2,skMid);
sf(bx-18,hY-16,36,2,skMid);
sf(bx-20,hY-14,40,2,skMid);
// Main face block
sf(bx-22,hY-12,44,24,skMid);
// Chin taper
sf(bx-20,hY+12,40,2,skMid);
sf(bx-18,hY+14,36,2,skMid);
sf(bx-14,hY+16,28,2,skMid);
sf(bx-10,hY+18,20,2,skMid);
// Forehead highlight (right-top area)
sf(bx-4,hY-16,18,4,skLt);
sf(bx+2,hY-12,14,6,skLt+'80');
// Shadow on left side of face
sf(bx-22,hY-12,6,24,skDk);
sf(bx-20,hY+12,4,4,skDk);
// Jaw shadow
sf(bx-18,hY+12,36,2,skDk+'80');
// Head outline — deliberately placed 1px borders
sf(bx-15,hY-19,30,1,out+'40');  // top
sf(bx-23,hY-12,1,24,out+'40');  // left
sf(bx+22,hY-12,1,24,out+'40');  // right
sf(bx-11,hY+19,22,1,out+'40');  // chin bottom
// Stairstepped corners
sf(bx-21,hY-14,1,2,out+'40');sf(bx-19,hY-16,1,2,out+'40');
sf(bx+20,hY-14,1,2,out+'40');sf(bx+18,hY-16,1,2,out+'40');
sf(bx-21,hY+12,1,2,out+'40');sf(bx-19,hY+14,1,2,out+'40');
sf(bx+20,hY+12,1,2,out+'40');sf(bx+18,hY+14,1,2,out+'40');

// Ears — small pixel blocks
sf(bx-24,hY-2,3,8,skMid);sf(bx-24,hY-2,1,8,skDk);
sf(bx+21,hY-2,3,8,skMid);sf(bx+23,hY-2,1,8,skLt);
// Crystal earrings — pixel dots
sf(bx-25,hY+7,3,3,acc);sf(bx-24,hY+8,1,1,'#fff');
sf(bx-25,hY+11,3,3,accLt);sf(bx-24,hY+12,1,1,'#fff');
sf(bx+22,hY+7,3,3,acc);sf(bx+23,hY+8,1,1,'#fff');
sf(bx+22,hY+11,3,3,accLt);sf(bx+23,hY+12,1,1,'#fff');

// === HAIR ON HEAD — pixel rows with stagger ===
// Hair dome built row by row over the top of the head
sf(bx-8,hY-28,16,2,hairLt);
sf(bx-12,hY-26,24,2,hairLt);
sf(bx-16,hY-24,32,2,hair);
sf(bx-20,hY-22,40,2,hair);
sf(bx-22,hY-20,44,2,hair);
sf(bx-24,hY-18,48,4,hair);
sf(bx-24,hY-14,48,3,hair);
// Shadow on left side of hair
sf(bx-24,hY-22,8,11,hairDk);
sf(bx-20,hY-24,6,4,hairDk);
// Highlight on right side
sf(bx+12,hY-20,10,6,hairLt);
sf(bx+8,hY-26,8,4,hairLt);
// Side bangs — staggered pixel blocks
sf(bx-24,hY-10,6,4,hairDk);sf(bx-25,hY-6,5,4,hairDk);
sf(bx-24,hY-2,4,4,hairDk);sf(bx-23,hY+2,3,3,hair);
sf(bx+20,hY-8,5,4,hair);sf(bx+21,hY-4,4,4,hairLt);
sf(bx+20,hY,3,3,hair);
// Front bangs — overlapping pixel wisps
sf(bx-10,hY-18,6,3,hairLt);sf(bx-12,hY-15,5,3,hair);
sf(bx-14,hY-12,4,3,hair);sf(bx-15,hY-9,3,2,hairDk);
sf(bx+6,hY-19,6,3,hairLt);sf(bx+9,hY-16,5,3,hair);
sf(bx+12,hY-13,4,3,hair);
// Hair shine — small highlight pixels
sf(bx+4,hY-24,2,4,hairLt);sf(bx+6,hY-22,2,2,'#d0f8ff');
sf(bx-3,hY-26,2,3,hairLt);

// === ICE CROWN — pixel spikes ===
// Crown base band
sf(bx-16,hY-22,32,3,acc);
sf(bx-15,hY-21,30,1,accLt);
// Center spike (tallest)
sf(bx-2,hY-48,4,26,accLt);sf(bx-1,hY-46,2,22,'#c0f4ff');
// Left inner spike
sf(bx-7,hY-38,3,16,accLt);sf(bx-6,hY-36,1,12,'#c0f4ff');
// Right inner spike
sf(bx+5,hY-38,3,16,accLt);sf(bx+6,hY-36,1,12,'#c0f4ff');
// Left outer spike
sf(bx-13,hY-36,3,14,acc);sf(bx-12,hY-34,1,10,'#c0f4ff');
// Right outer spike
sf(bx+11,hY-36,3,14,acc);sf(bx+12,hY-34,1,10,'#c0f4ff');
// Gem at crown top
sf(bx-3,hY-50,6,4,'#ffffff');sf(bx-2,hY-49,4,2,'#c0f4ff');
// Side crown wisps
sf(bx-20,hY-14,2,6,acc+'80');sf(bx-21,hY-18,2,6,acc+'80');
sf(bx+19,hY-14,2,6,acc+'80');sf(bx+20,hY-18,2,6,acc+'80');

// === FACE — ANIME EYES (kept intact — these read well at pixel scale) ===
// --- LEFT EYE ---
se(bx-8,hY-1,8,6,'#ffffff');
se(bx-7,hY,6,5.5,'#40d0f0');
se(bx-7,hY+1,6,4.5,'#20a8d0');
se(bx-7,hY+2,5,3,'#1880a8');
sc(bx-6,hY+1,3,'#0c4060');
sc(bx-9,hY-2,2.5,'#ffffff');
sc(bx-4,hY+2,1.5,'#ffffff');
sc(bx-8,hY+3,0.8,'#c0f0ff');
_s.strokeStyle='#1a3858';_s.lineWidth=2;_s.beginPath();
_s.ellipse(bx-7,hY-2,8.5,4,0,Math.PI+0.2,2*Math.PI-0.2);_s.stroke();
_s.strokeStyle='#1a385840';_s.lineWidth=0.8;_s.beginPath();
_s.ellipse(bx-7,hY+2,7,3,0,0.2,Math.PI-0.2);_s.stroke();
// --- RIGHT EYE ---
se(bx+8,hY-1,8,6,'#ffffff');
se(bx+9,hY,6,5.5,'#40d0f0');
se(bx+9,hY+1,6,4.5,'#20a8d0');
se(bx+9,hY+2,5,3,'#1880a8');
sc(bx+10,hY+1,3,'#0c4060');
sc(bx+7,hY-2,2.5,'#ffffff');
sc(bx+12,hY+2,1.5,'#ffffff');
sc(bx+8,hY+3,0.8,'#c0f0ff');
_s.strokeStyle='#1a3858';_s.lineWidth=2;_s.beginPath();
_s.ellipse(bx+9,hY-2,8.5,4,0,Math.PI+0.2,2*Math.PI-0.2);_s.stroke();
_s.strokeStyle='#1a385840';_s.lineWidth=0.8;_s.beginPath();
_s.ellipse(bx+9,hY+2,7,3,0,0.2,Math.PI-0.2);_s.stroke();
// Eyelashes — pixel lines
sl(bx-14,hY-3,bx-18,hY-8,2,'#1a3858');
sl(bx-12,hY-4,bx-15,hY-8,1.2,'#1a385890');
sl(bx+15,hY-3,bx+19,hY-8,2,'#1a3858');
sl(bx+13,hY-4,bx+16,hY-8,1.2,'#1a385890');
// Eyebrows — pixel stairstepped arcs
sf(bx-14,hY-8,3,1,'#8a7060');sf(bx-11,hY-9,3,1,'#8a7060');
sf(bx-8,hY-10,3,1,'#8a7060');sf(bx-5,hY-10,3,1,'#8a7060');
sf(bx-2,hY-9,2,1,'#8a7060');
sf(bx+3,hY-9,2,1,'#8a7060');sf(bx+5,hY-10,3,1,'#8a7060');
sf(bx+8,hY-10,3,1,'#8a7060');sf(bx+11,hY-9,3,1,'#8a7060');
sf(bx+14,hY-8,2,1,'#8a7060');
// Nose — single pixel dot
sf(bx,hY+5,2,2,'#d8b8a0');
// Mouth — pixel curved smile
sf(bx-3,hY+9,2,1,'#cc8888');sf(bx-1,hY+10,4,1,'#cc8888');sf(bx+3,hY+9,2,1,'#cc8888');
sf(bx,hY+10,2,1,'#e8a0a0');
// Blush — pixel blocks
sf(bx-14,hY+4,6,3,'#ffaaaa25');sf(bx+8,hY+4,6,3,'#ffaaaa25');}

// CRIMSON — Flame Fighter. Professional pixel-art with bezier contours,
// tapered limbs, flame hair, 3-tone shading throughout.
function drawCrimson(cx,gy,o){const L=o.lean||0,bx=cx+L;
const tw=o.torsoTwist||0,hr=o.hipRot||0;
const sk='#f0d0b8',skDk='#d0a890',skLt='#ffe0d0',skMid='#e8c8b0';
const gi='#cc2244',giDk='#881430',giLt='#ee4466',giMid='#bb2040';
const wrap='#ff8866',wrapDk='#cc5533',band='#ff5566',bandDk='#cc3344',out='#3a0a14';

// === WAIST SASH TRAIL (behind everything) ===
_s.strokeStyle='rgba(255,56,96,0.25)';_s.lineWidth=5;_s.lineCap='round';_s.beginPath();
_s.moveTo(bx-5,gy-44);_s.quadraticCurveTo(bx-18-L*3,gy-18,bx-22-L*4,gy);_s.stroke();
_s.lineWidth=3;_s.strokeStyle='rgba(255,56,96,0.12)';_s.beginPath();
_s.moveTo(bx-22-L*4,gy);_s.quadraticCurveTo(bx-24-L*4,gy+10,bx-20-L*3,gy+16);_s.stroke();

// === LEGS (tapered, contoured with drawLimb) ===
const lx=bx-9+(o.lLS||0)+hr*0.3, ly=gy-(o.lFL||0);
const rx=bx+9+(o.rLS||0)+hr*0.3, ry=gy-(o.rFL||0);
// Upper legs (thighs)
const lKneeX=(bx-5+lx)/2, lKneeY=(gy-46+ly)/2;
const rKneeX=(bx+5+rx)/2, rKneeY=(gy-46+ry)/2;
drawLimb(bx-5,gy-46,lKneeX,lKneeY,11,9,giLt,giMid,giDk,out);
drawLimb(lKneeX,lKneeY,lx,ly,9,7,giLt,giMid,giDk,out);
drawLimb(bx+5,gy-46,rKneeX,rKneeY,11,9,giLt,giMid,giDk,out);
drawLimb(rKneeX,rKneeY,rx,ry,9,7,giLt,giMid,giDk,out);
// Knee wraps (cloth strips)
for(let i=0;i<3;i++){
  sl((bx-5+lx)/2-2,(gy-46+ly)/2-4+i*3,(bx-5+lx)/2+3,(gy-46+ly)/2-3+i*3,2,wrap);
  sl((bx+5+rx)/2-2,(gy-46+ry)/2-4+i*3,(bx+5+rx)/2+3,(gy-46+ry)/2-3+i*3,2,wrap);
}
// Boots using drawBoot
drawBoot(lx,ly,10,16,giDk,'#601020','#2a0810',out,0);
drawBoot(rx,ry,10,16,giDk,'#601020','#2a0810',out,0);

// === TORSO — BEZIER MASCULINE STRAIGHT with 3-tone shading ===
const nY=gy-80,pY=gy-46;
const twOff=tw*0.3;
// Main torso — straight masculine lines (no waist pinch)
_s.fillStyle=giMid;_s.beginPath();
_s.moveTo(bx-12+twOff,nY);                           // left shoulder
_s.lineTo(bx+12+twOff,nY);                           // right shoulder
_s.quadraticCurveTo(bx+13+twOff,nY+10,bx+11+twOff,nY+18); // right side straight
_s.lineTo(bx+9+twOff*0.5,nY+28);                     // right waist (no pinch — masculine)
_s.quadraticCurveTo(bx+10+hr*0.2,nY+36,bx+10+hr*0.3,pY);
_s.lineTo(bx-10+hr*0.3,pY);
_s.quadraticCurveTo(bx-10+hr*0.2,nY+36,bx-9+twOff*0.5,nY+28);
_s.lineTo(bx-11+twOff,nY+18);
_s.quadraticCurveTo(bx-13+twOff,nY+10,bx-12+twOff,nY);
_s.closePath();_s.fill();
// Highlight right side
_s.fillStyle=giLt+'50';_s.beginPath();
_s.moveTo(bx+twOff,nY);_s.lineTo(bx+12+twOff,nY);
_s.quadraticCurveTo(bx+13+twOff,nY+10,bx+11+twOff,nY+18);
_s.lineTo(bx+9+twOff*0.5,nY+28);
_s.quadraticCurveTo(bx+10+hr*0.2,nY+36,bx+10+hr*0.3,pY);
_s.lineTo(bx+hr*0.3,pY);_s.closePath();_s.fill();
// Shadow left side
_s.fillStyle=giDk+'50';_s.beginPath();
_s.moveTo(bx-12+twOff,nY);_s.lineTo(bx+twOff,nY);
_s.lineTo(bx+hr*0.3,pY);_s.lineTo(bx-10+hr*0.3,pY);
_s.quadraticCurveTo(bx-10+hr*0.2,nY+36,bx-9+twOff*0.5,nY+28);
_s.lineTo(bx-11+twOff,nY+18);
_s.quadraticCurveTo(bx-13+twOff,nY+10,bx-12+twOff,nY);_s.closePath();_s.fill();
// Torso outline
_s.strokeStyle=out;_s.lineWidth=1.5;_s.beginPath();
_s.moveTo(bx-12+twOff,nY);_s.lineTo(bx+12+twOff,nY);
_s.quadraticCurveTo(bx+13+twOff,nY+10,bx+11+twOff,nY+18);
_s.lineTo(bx+9+twOff*0.5,nY+28);
_s.quadraticCurveTo(bx+10+hr*0.2,nY+36,bx+10+hr*0.3,pY);
_s.lineTo(bx-10+hr*0.3,pY);
_s.quadraticCurveTo(bx-10+hr*0.2,nY+36,bx-9+twOff*0.5,nY+28);
_s.lineTo(bx-11+twOff,nY+18);
_s.quadraticCurveTo(bx-13+twOff,nY+10,bx-12+twOff,nY);_s.stroke();
// Exposed chest V (skin showing — muscular)
_s.fillStyle=sk;_s.beginPath();_s.moveTo(bx+twOff,nY+3);
_s.lineTo(bx-8+twOff,nY+22);_s.lineTo(bx+8+twOff,nY+22);_s.closePath();_s.fill();
sl(bx+twOff,nY+3,bx-8+twOff,nY+24,1.5,out+'50');
sl(bx+twOff,nY+3,bx+8+twOff,nY+24,1.5,out+'50');
// Pec definition
se(bx-4+twOff,nY+12,5,3,skLt);se(bx+4+twOff,nY+12,5,3,skLt);
// Cross scars on chest
sl(bx-6+twOff,nY+8,bx+4+twOff,nY+18,1.2,'#cc9080');
sl(bx-6+twOff,nY+14,bx-9+twOff,nY+10,1,'#ff886640');
sl(bx-9+twOff,nY+10,bx-7+twOff,nY+6,1,'#ff886640');
sl(bx-7+twOff,nY+6,bx-4+twOff,nY+8,1,'#ff886640');
// Ab line
for(let i=0;i<3;i++){sl(bx-3+twOff,nY+20+i*5,bx-3+twOff,nY+23+i*5,0.8,skDk+'50');
  sl(bx+3+twOff,nY+20+i*5,bx+3+twOff,nY+23+i*5,0.8,skDk+'50');}
sl(bx+twOff,nY+18,bx+twOff,pY-4,1,skDk+'40');
// Waist sash/belt
sf(bx-9+hr*0.3,pY-2,18,4,'#1a1a1a');sf(bx-9+hr*0.3,pY-2,18,1,out);
sf(bx-2+hr*0.3,pY-1,5,3,band);sc(bx+hr*0.3,pY,1.5,'#ffaa44');

// === ARMS (tapered, contoured with drawLimb) ===
const sY=nY+4;
const lax=bx-22-(o.lAE||0)+twOff, lay=sY+24+Math.sin(o.lAA||0)*14;
const rax=bx+22+(o.rAE||0)+twOff, ray=sY+24+Math.sin(o.rAA||0)*14;
// Forearm endpoints
const lfax=lax-4+(o.lFA||0), lfay=lay+16;
const rfax=rax+4+(o.rFA||0), rfay=ray+16;
// Left upper arm (skin — exposed)
drawLimb(bx-12+twOff,sY,lax,lay,9,6,skLt,skMid,skDk,out);
sl(bx-12+(lax-bx+12)*0.35+twOff,sY+(lay-sY)*0.35,bx-12+(lax-bx+12)*0.65+twOff,sY+(lay-sY)*0.65,1.5,skLt+'50');
// Left forearm wraps
sf(lax-2,lay-2,8,5,wrapDk);sf(lax-2,lay-2,8,1.5,'#444');
sl(lax,lay-4,lax,lay-7,1.5,'#666');sl(lax+3,lay-4,lax+3,lay-7,1.5,'#666');
drawLimb(lax,lay+3,lfax,lfay,7,5,wrap,wrapDk,'#993320',out);
sl(lfax-1,lfay-8,lfax-3,lfay-2,1.5,wrapDk);sl(lfax+1,lfay-6,lfax-1,lfay-2,1,wrap);
// Left hand
if((o.lFist||0)>0.5){drawFist(lfax,lfay+2,5,sk,skDk,out);}
else{sc(lfax,lfay+2,4,sk);sc(lfax,lfay+2,4,out+'18');}
// Right upper arm (skin — exposed)
drawLimb(bx+12+twOff,sY,rax,ray,9,6,skLt,skMid,skDk,out);
sl(bx+12+(rax-bx-12)*0.35+twOff,sY+(ray-sY)*0.35,bx+12+(rax-bx-12)*0.65+twOff,sY+(ray-sY)*0.65,1.5,skLt+'50');
// Right forearm wraps
sf(rax-4,ray-2,8,5,wrapDk);sf(rax-4,ray-2,8,1.5,'#444');
sl(rax,ray-4,rax,ray-7,1.5,'#666');sl(rax-3,ray-4,rax-3,ray-7,1.5,'#666');
drawLimb(rax,ray+3,rfax,rfay,7,5,wrap,wrapDk,'#993320',out);
sl(rfax+1,rfay-8,rfax+3,rfay-2,1.5,wrapDk);sl(rfax-1,rfay-6,rfax+1,rfay-2,1,wrap);
// Right hand
if((o.rFist||0)>0.5){drawFist(rfax,rfay+2,5,sk,skDk,out);}
else{sc(rfax,rfay+2,4,sk);sc(rfax,rfay+2,4,out+'18');}

// === HEAD — BIG, fierce anime male face ===
const hY=nY-22+(o.hY||0);
const sk1='#ffe8d8',sk3='#c8a080',sk4='#a08060';
// Neck (thicker than Aurora — masculine)
sf(bx-3+twOff,nY-5,6,7,sk);
_s.fillStyle=skDk+'40';_s.fillRect(bx-3+twOff,nY-5,3,7);
// Head — angular oval (taller than wide — masculine jaw)
se(bx,hY,18,20,sk);
// Jaw definition (darker on sides)
_s.fillStyle=sk3+'50';_s.beginPath();_s.ellipse(bx-8,hY+6,8,10,0,0,Math.PI*2);_s.fill();
_s.fillStyle=sk1+'30';_s.beginPath();_s.ellipse(bx+4,hY-4,10,12,0,0,Math.PI*2);_s.fill();
_s.strokeStyle=out+'20';_s.lineWidth=1;_s.beginPath();_s.ellipse(bx,hY,18,20,0,0,Math.PI*2);_s.stroke();
// Ear
se(bx-16,hY+2,3,5,sk);

// === HEADBAND (prominent, with flame emblem) ===
sf(bx-18,hY-5,36,6,band);sf(bx-18,hY-5,36,1.5,bandDk);
sc(bx+2,hY-2,3.5,bandDk);sc(bx+2,hY-2,2,'#ffaa44');sc(bx+2,hY-3,1,'#ffee88');
// Trailing tails (bezier)
_s.strokeStyle=band;_s.lineWidth=3.5;_s.lineCap='round';_s.beginPath();
_s.moveTo(bx-18,hY-3);_s.quadraticCurveTo(bx-24,hY+4,bx-28,hY+12);_s.stroke();
_s.strokeStyle=band+'80';_s.lineWidth=2.5;_s.beginPath();
_s.moveTo(bx-28,hY+12);_s.quadraticCurveTo(bx-32,hY+18,bx-35,hY+26);_s.stroke();

// === FLAME HAIR — MASSIVE bezier spikes (biggest silhouette element) ===
_s.save();
// Each spike as a bezier stroke for smooth flame shape
const spikes=[
  {x:-7, y:-12, tx:-24, ty:-42, w:6, c:'#ff6644'},
  {x:-4, y:-14, tx:-14, ty:-50, w:7, c:'#ff3040'},   // tallest
  {x:1,  y:-12, tx:-6,  ty:-42, w:5.5, c:'#ff5533'},
  {x:5,  y:-11, tx:2,   ty:-36, w:5, c:'#ff4444'},
  {x:8,  y:-9,  tx:7,   ty:-28, w:4, c:'#ff7744'},
  {x:11, y:-6,  tx:11,  ty:-20, w:3.5, c:'#ffaa44'},
  {x:14, y:-3,  tx:15,  ty:-14, w:2.5, c:'#ffcc66'}
];
for(const sp of spikes){
  _s.strokeStyle=sp.c;_s.lineWidth=sp.w;_s.lineCap='round';_s.beginPath();
  _s.moveTo(bx+sp.x,hY+sp.y);
  _s.quadraticCurveTo(bx+sp.x+(sp.tx-sp.x)*0.4,hY+sp.y+(sp.ty-sp.y)*0.5,bx+sp.tx,hY+sp.ty);
  _s.stroke();
}
// Fire glow at tips
_s.shadowColor='#ff440060';_s.shadowBlur=4;
sc(bx-14,hY-48,3,'#ff604440');sc(bx-24,hY-40,2.5,'#ff664440');
_s.shadowBlur=0;_s.shadowColor='transparent';
_s.restore();

// === FACE — fierce anime male eyes ===
// --- LEFT EYE (angular, fierce) ---
_s.fillStyle='#ffffff';_s.beginPath();
_s.moveTo(bx-12,hY-1);_s.lineTo(bx-4,hY-4);_s.lineTo(bx-2,hY-1);
_s.lineTo(bx-4,hY+2);_s.lineTo(bx-12,hY+1);_s.closePath();_s.fill();
se(bx-7,hY-1,4,4,'#e83048');
se(bx-7,hY,4,3,'#c82030');
sc(bx-6,hY,2.5,'#401018');
sc(bx-8,hY-2,2,'#ffffff');
_s.strokeStyle='#2a0810';_s.lineWidth=2.5;_s.beginPath();
_s.moveTo(bx-13,hY);_s.lineTo(bx-8,hY-4);_s.lineTo(bx-2,hY-1);_s.stroke();
// --- RIGHT EYE (mirror) ---
_s.fillStyle='#ffffff';_s.beginPath();
_s.moveTo(bx+12,hY-1);_s.lineTo(bx+4,hY-4);_s.lineTo(bx+2,hY-1);
_s.lineTo(bx+4,hY+2);_s.lineTo(bx+12,hY+1);_s.closePath();_s.fill();
se(bx+7,hY-1,4,4,'#e83048');
se(bx+7,hY,4,3,'#c82030');
sc(bx+6,hY,2.5,'#401018');
sc(bx+8,hY-2,2,'#ffffff');
_s.strokeStyle='#2a0810';_s.lineWidth=2.5;_s.beginPath();
_s.moveTo(bx+13,hY);_s.lineTo(bx+8,hY-4);_s.lineTo(bx+2,hY-1);_s.stroke();
// Eyebrows (THICK, angled DOWN = angry)
_s.strokeStyle='#3a1810';_s.lineWidth=2.5;_s.lineCap='round';
_s.beginPath();_s.moveTo(bx-13,hY-5);_s.lineTo(bx-4,hY-8);_s.stroke();
_s.beginPath();_s.moveTo(bx+4,hY-8);_s.lineTo(bx+13,hY-5);_s.stroke();
// Nose
sl(bx,hY+3,bx+1,hY+6,1.2,sk3);sc(bx+1,hY+6,0.8,sk4);
// Mouth (grimace with teeth)
sf(bx-4,hY+9,9,4,out);
sf(bx-3,hY+10,3,1.5,'#ffffff');sf(bx+1,hY+10,3,1.5,'#ffffff');
sl(bx-4,hY+9,bx+5,hY+9,1,out);
// Stubble
se(bx-4,hY+13,10,4,sk3+'30');
// Chin/jaw definition
sl(bx-10,hY+10,bx-14,hY+16,1,sk3+'40');
sl(bx+10,hY+10,bx+14,hY+16,1,sk3+'40');}

// JADE — Fast Striker. Precise. Relentless. Pixel-art with sf() blocks,
// lean athletic build, crop top, hakama pants, hand wraps, flowing hair.
function drawJade(cx,gy,o){
const L=o.lean||0, bx=cx+L;
const tw=o.torsoTwist||0, hr=o.hipRot||0;
const hY=gy-130+(o.hY||0);
const twOff=tw*0.3;
// Skin tones
const skLt='#c8a882',skMid='#a07858',skDk='#785838';
// Hair
const hairDk='#1a2030',hairMid='#283848',hairLt='#384858';
// Outfit - dark crop top
const topDk='#1a2818',topMid='#2a3828',topLt='#384838';
// Green accents
const grn='#2a6640',grnLt='#44aa66',grnBr='#66cc88';
// Gold accents
const gold='#aa8830',goldLt='#ccaa44',goldBr='#ddcc66';
// Wraps
const wrapLt='#e8dcc0',wrapDk='#d8c8a8';
// Boots
const bootDk='#1a2818',bootMid='#2a3828';
// Outline
const out='#0a1810';

// Key positions
const nY=gy-100; // neck/shoulder line
const wY=gy-82;  // waist
const hipY=gy-72; // hip line

// === HAIR BEHIND (flowing, drawn first) ===
// Main cascade behind body — stacked offset rows for organic pixel feel
const hbx=bx+8+twOff-L*0.3; // hair flows opposite to lean
for(let i=0;i<28;i++){
  const yy=hY+6+i*3;
  const drift=Math.sin(i*0.25-L*0.04)*3+i*0.6-L*0.4;
  const w=12-Math.abs(i-10)*0.3;
  if(w>2){
    sf(hbx+drift-w/2,yy,w,3,i<8?hairDk:i<18?hairMid:hairLt);
    if(i%3===0) sf(hbx+drift-w/2+1,yy,w-2,1,hairLt+'40');
  }
}
// Secondary strand behind left shoulder
for(let i=0;i<18;i++){
  const yy=hY+10+i*3;
  const drift=Math.sin(i*0.3)*2-i*0.3-L*0.3;
  const w=8-i*0.3;
  if(w>1) sf(bx-6+twOff+drift-w/2,yy,w,3,i<6?hairDk:hairMid);
}

// === LEGS (hakama-style wide pants, pixel blocks) ===
const lx=bx-10+(o.lLS||0)+hr*0.3, ly=gy-(o.lFL||0);
const rx=bx+10+(o.rLS||0)+hr*0.3, ry=gy-(o.rFL||0);

// Left leg — hakama (wide flowing pants)
const lMidX=(bx-6+lx)/2, lMidY=(hipY+ly)/2;
// Upper left leg — wide hakama fabric
for(let i=0;i<12;i++){
  const t=i/12;
  const px=bx-6+(lMidX-(bx-6))*t+hr*0.2;
  const py=hipY+(lMidY-hipY)*t;
  const w=16-i*0.5+Math.sin(i*0.4)*1.5;
  sf(px-w/2,py,w,3,i<4?topDk:i<8?topMid:topLt);
  if(i%3===0) sf(px-w/2,py,2,3,grn); // green seam accent
}
// Lower left leg
for(let i=0;i<10;i++){
  const t=i/10;
  const px=lMidX+(lx-lMidX)*t;
  const py=lMidY+(ly-lMidY)*t;
  const w=14-i*0.8;
  sf(px-w/2,py,w,3,i<3?topMid:topLt);
  if(i===0) sf(px-w/2,py,w,1,grn+'60');
}

// Right leg — hakama
const rMidX=(bx+6+rx)/2, rMidY=(hipY+ry)/2;
for(let i=0;i<12;i++){
  const t=i/12;
  const px=bx+6+(rMidX-(bx+6))*t+hr*0.2;
  const py=hipY+(rMidY-hipY)*t;
  const w=16-i*0.5+Math.sin(i*0.4)*1.5;
  sf(px-w/2,py,w,3,i<4?topDk:i<8?topMid:topLt);
  if(i%3===0) sf(px-w/2+w-2,py,2,3,grn);
}
for(let i=0;i<10;i++){
  const t=i/10;
  const px=rMidX+(rx-rMidX)*t;
  const py=rMidY+(ry-rMidY)*t;
  const w=14-i*0.8;
  sf(px-w/2,py,w,3,i<3?topMid:topLt);
  if(i===0) sf(px-w/2,py,w,1,grn+'60');
}

// === BOOTS (dark with green accent, angular pixel blocks) ===
// Left boot
sf(lx-8,ly-12,16,12,bootDk); // main boot body
sf(lx-8,ly-12,16,2,bootMid);  // top edge lighter
sf(lx-8,ly-12,2,12,out);      // left outline
sf(lx+6,ly-12,2,12,out);      // right outline
sf(lx-8,ly-2,2,2,out);        // toe outline
sf(lx-10,ly-2,20,4,bootDk);   // sole
sf(lx-10,ly+2,20,2,out);      // bottom
sf(lx-6,ly-10,12,2,grn);      // green accent stripe
sf(lx-10,ly-2,2,4,out);       // sole outline L
sf(lx+8,ly-2,2,4,out);        // sole outline R

// Right boot
sf(rx-8,ry-12,16,12,bootDk);
sf(rx-8,ry-12,16,2,bootMid);
sf(rx-8,ry-12,2,12,out);
sf(rx+6,ry-12,2,12,out);
sf(rx-8,ry-2,2,2,out);
sf(rx-10,ry-2,20,4,bootDk);
sf(rx-10,ry+2,20,2,out);
sf(rx-6,ry-10,12,2,grn);
sf(rx-10,ry-2,2,4,out);
sf(rx+8,ry-2,2,4,out);

// === TORSO — Crop top + exposed midriff + waist, all pixel rows ===
// Neck
sf(bx-4+twOff,nY-4,8,6,skMid);
sf(bx-4+twOff,nY-4,3,6,skDk+'60');
sf(bx+1+twOff,nY-4,3,6,skLt+'40');

// Shoulder line / collarbone area
sf(bx-16+twOff,nY,32,3,topDk);
sf(bx-16+twOff,nY,32,1,topLt+'40');

// Left shoulder pad accent
sf(bx-18+twOff,nY-2,8,6,topMid);
sf(bx-18+twOff,nY-2,8,2,grn);
sf(bx-18+twOff,nY-2,2,6,out);
sf(bx-18+twOff,nY+2,8,2,topDk);

// Crop top — row by row pixel construction
for(let i=0;i<14;i++){
  const yy=nY+3+i;
  const taper=i<4?0:i<8?(i-4)*0.3:(i-4)*0.3;
  const w=30-taper*2;
  const xx=bx-15+taper+twOff*(1-i/14);
  sf(xx,yy,w,1, i<5?topDk:i<10?topMid:topLt);
  // Right side highlight
  if(i>2&&i<12) sf(xx+w-3,yy,3,1,topLt+'30');
  // Left side shadow
  if(i>2&&i<12) sf(xx,yy,3,1,out+'18');
}
// Crop top bottom edge — green trim
sf(bx-14+twOff*0.5,nY+17,28,2,grn);
sf(bx-14+twOff*0.5,nY+17,28,1,grnLt+'60');

// Exposed midriff (skin between crop top and pants)
for(let i=0;i<10;i++){
  const yy=nY+19+i;
  const taper=i*0.2;
  const w=24-taper*2;
  const xx=bx-12+taper+twOff*(1-i/14)*0.5;
  sf(xx,yy,w,1,skMid);
  // Muscle definition — subtle shadow
  if(i>2&&i<8){
    sf(xx+w/2-1,yy,2,1,skDk+'30'); // center line
    sf(xx+2,yy,2,1,skDk+'20');     // left oblique shadow
    sf(xx+w-4,yy,2,1,skLt+'30');   // right highlight
  }
  // Left shadow, right highlight
  sf(xx,yy,2,1,skDk+'40');
  sf(xx+w-2,yy,2,1,skLt+'30');
}

// === GOLD BELT at waist ===
sf(bx-14+hr*0.3,wY,28,4,gold);
sf(bx-14+hr*0.3,wY,28,1,goldBr); // top highlight
sf(bx-14+hr*0.3,wY+3,28,1,out+'30'); // bottom shadow
// Belt buckle — center
sf(bx-3+hr*0.3,wY-1,6,6,goldLt);
sf(bx-2+hr*0.3,wY,4,4,goldBr);
sf(bx-3+hr*0.3,wY-1,6,1,goldBr);
sf(bx-3+hr*0.3,wY+4,6,1,out+'40');

// Green sash element hanging from belt
sf(bx+8+hr*0.3,wY+4,6,14,grn);
sf(bx+8+hr*0.3,wY+4,6,2,grnLt);
sf(bx+8+hr*0.3,wY+16,6,2,grnBr);
sf(bx+9+hr*0.3,wY+6,2,10,grnLt+'40');
// Gold trim on sash
sf(bx+8+hr*0.3,wY+4,1,14,goldLt+'60');
sf(bx+13+hr*0.3,wY+4,1,14,gold+'40');

// Waistband of hakama
sf(bx-16+hr*0.3,hipY-4,32,4,topDk);
sf(bx-16+hr*0.3,hipY-4,32,1,topMid);
sf(bx-16+hr*0.3,hipY-1,32,1,out+'30');

// === ARMS (pixel segment stacks, tapered) ===
const sY=nY+4;
const lAA=o.lAA||0, rAA=o.rAA||0;
const lAE=o.lAE||0, rAE=o.rAE||0;

// Arm endpoint calculations
const laElbX=bx-20-lAE*0.5+twOff, laElbY=sY+18+Math.sin(lAA)*12;
const raElbX=bx+20+rAE*0.5+twOff, raElbY=sY+18+Math.sin(rAA)*12;
const laHandX=laElbX-6-lAE*0.5+(o.lFA||0), laHandY=laElbY+18;
const raHandX=raElbX+6+rAE*0.5+(o.rFA||0), raHandY=raElbY+18;

// Left arm — upper (skin)
for(let i=0;i<8;i++){
  const t=i/8;
  const px=bx-16+twOff+(laElbX-(bx-16+twOff))*t;
  const py=sY+(laElbY-sY)*t;
  const w=10-i*0.4;
  sf(px-w/2,py,w,3,i<3?skLt:i<6?skMid:skDk);
  if(i===0) sf(px-w/2,py,w,1,skLt+'40');
}
// Left forearm (skin)
for(let i=0;i<7;i++){
  const t=i/7;
  const px=laElbX+(laHandX-laElbX)*t;
  const py=laElbY+(laHandY-laElbY)*t;
  const w=8-i*0.5;
  sf(px-w/2,py,w,3,i<2?skMid:i<5?skLt:skMid);
}
// Left wrist wrap
for(let i=0;i<3;i++){
  const px=laHandX-1;
  const py=laHandY-6+i*3;
  sf(px-4,py,8,2,wrapLt);
  sf(px-4,py,8,1,wrapDk);
}

// Right arm — upper (skin)
for(let i=0;i<8;i++){
  const t=i/8;
  const px=bx+16+twOff+(raElbX-(bx+16+twOff))*t;
  const py=sY+(raElbY-sY)*t;
  const w=10-i*0.4;
  sf(px-w/2,py,w,3,i<3?skLt:i<6?skMid:skDk);
  if(i===0) sf(px-w/2,py,w,1,skLt+'40');
}
// Right forearm (skin)
for(let i=0;i<7;i++){
  const t=i/7;
  const px=raElbX+(raHandX-raElbX)*t;
  const py=raElbY+(raHandY-raElbY)*t;
  const w=8-i*0.5;
  sf(px-w/2,py,w,3,i<2?skMid:i<5?skLt:skMid);
}
// Right wrist wrap
for(let i=0;i<3;i++){
  const px=raHandX+1;
  const py=raHandY-6+i*3;
  sf(px-4,py,8,2,wrapLt);
  sf(px-4,py,8,1,wrapDk);
}

// === HANDS (pixel fists or open hands) ===
// Left hand
if((o.lFist||0)>0.5){
  // Blocky fist
  sf(laHandX-5,laHandY,10,8,skMid);
  sf(laHandX-5,laHandY,10,2,skLt);
  sf(laHandX-5,laHandY+6,10,2,skDk);
  sf(laHandX-5,laHandY,2,8,skDk);
  sf(laHandX+3,laHandY,2,8,skLt+'60');
  // Knuckle highlights
  sf(laHandX-3,laHandY+2,2,2,skLt);
  sf(laHandX+1,laHandY+2,2,2,skLt);
  // Wrap on fist
  sf(laHandX-5,laHandY+3,10,2,wrapDk+'80');
}else{
  // Open hand — flat pixel shape
  sf(laHandX-4,laHandY,8,6,skMid);
  sf(laHandX-4,laHandY,8,2,skLt);
  sf(laHandX-4,laHandY+4,8,2,skDk+'60');
  // Fingers
  sf(laHandX-4,laHandY+6,2,4,skMid);
  sf(laHandX-1,laHandY+6,2,5,skMid);
  sf(laHandX+2,laHandY+6,2,4,skMid);
  // Thumb
  sf(laHandX-6,laHandY+1,3,4,skMid);
}

// Right hand
if((o.rFist||0)>0.5){
  sf(raHandX-5,raHandY,10,8,skMid);
  sf(raHandX-5,raHandY,10,2,skLt);
  sf(raHandX-5,raHandY+6,10,2,skDk);
  sf(raHandX-5,raHandY,2,8,skDk);
  sf(raHandX+3,raHandY,2,8,skLt+'60');
  sf(raHandX-3,raHandY+2,2,2,skLt);
  sf(raHandX+1,raHandY+2,2,2,skLt);
  sf(raHandX-5,raHandY+3,10,2,wrapDk+'80');
}else{
  sf(raHandX-4,raHandY,8,6,skMid);
  sf(raHandX-4,raHandY,8,2,skLt);
  sf(raHandX-4,raHandY+4,8,2,skDk+'60');
  sf(raHandX-4,raHandY+6,2,4,skMid);
  sf(raHandX-1,raHandY+6,2,5,skMid);
  sf(raHandX+2,raHandY+6,2,4,skMid);
  sf(raHandX+4,raHandY+1,3,4,skMid);
}

// === HEAD — pixel-art construction from stacked rows ===
// Head base — stacked pixel rows (wider in middle, narrow at top/chin)
sf(bx-8,hY-14,16,2,skMid);   // top of head (narrow)
sf(bx-10,hY-12,20,2,skMid);  // forehead upper
sf(bx-11,hY-10,22,2,skMid);  // forehead
sf(bx-12,hY-8,24,4,skMid);   // upper face (widest)
sf(bx-12,hY-4,24,4,skMid);   // mid face
sf(bx-11,hY,22,4,skMid);     // lower face
sf(bx-10,hY+4,20,3,skMid);   // jaw
sf(bx-8,hY+7,16,2,skMid);    // lower jaw
sf(bx-6,hY+9,12,2,skMid);    // chin

// Face shading — left shadow, right highlight
sf(bx-12,hY-8,4,16,skDk+'50');
sf(bx+7,hY-10,4,10,skLt+'40');
// Cheek shadow
sf(bx-10,hY+2,4,4,skDk+'30');
// Cheek highlight
sf(bx+6,hY,4,4,skLt+'30');

// Ears
sf(bx-14,hY-4,3,6,skMid);
sf(bx-14,hY-4,1,6,skDk);
sf(bx+11,hY-4,3,6,skMid);
sf(bx+13,hY-4,1,6,skLt+'60');

// === HAIR FRONT — over forehead and flowing over one shoulder ===
// Headband / tie element
sf(bx-12,hY-12,24,3,hairDk);
sf(bx-12,hY-12,24,1,hairMid);
sf(bx-12,hY-10,2,3,grn); // green tie knot left
sf(bx+10,hY-10,2,3,grn); // green tie knot right
// Tie tails hanging down
sf(bx+11,hY-8,2,8,grn);
sf(bx+12,hY-4,2,6,grnLt);

// Top hair — pixel rows over the head
sf(bx-10,hY-18,20,2,hairDk);  // very top
sf(bx-12,hY-16,24,2,hairDk);
sf(bx-13,hY-14,26,3,hairDk);  // main hair volume
sf(bx-12,hY-11,10,2,hairMid); // side fringe left
sf(bx+4,hY-11,8,2,hairDk);   // side fringe right
// Bangs — staggered pixel rows across forehead
sf(bx-11,hY-12,6,2,hairDk);
sf(bx-8,hY-11,4,2,hairMid);
sf(bx-4,hY-12,5,2,hairDk);
sf(bx+1,hY-11,4,2,hairMid);
sf(bx+5,hY-12,6,2,hairDk);
// Hair highlight streaks
sf(bx-6,hY-16,3,1,hairLt);
sf(bx+2,hY-17,4,1,hairLt);

// Hair flowing over left shoulder (front layer)
for(let i=0;i<12;i++){
  const yy=hY+4+i*3;
  const drift=-i*0.4-L*0.2;
  const w=8-i*0.4;
  if(w>1){
    sf(bx-14+drift,yy,w,3,i<4?hairDk:i<8?hairMid:hairLt);
    if(i%4===0) sf(bx-14+drift+1,yy,w-2,1,hairLt+'30');
  }
}

// === FACE DETAILS ===
// Eyes — pixel block construction
// Left eye white
sf(bx-9,hY-4,8,5,'#ffffff');
sf(bx-9,hY-5,6,1,'#ffffff');
// Left iris (dark brown)
sf(bx-7,hY-4,5,4,'#3a2818');
sf(bx-7,hY-3,5,3,'#4a3828');
// Left pupil
sf(bx-6,hY-3,3,3,'#0a0808');
// Left eye shine
sc(bx-7,hY-4,1,'#ffffff');
sc(bx-4,hY-2,0.8,'#ffffff');
// Left upper eyelid (thick, determined)
sf(bx-10,hY-6,9,2,out);
sf(bx-10,hY-5,2,1,out);
// Left lower eyelid
sf(bx-9,hY+1,7,1,out+'60');
// Left eyelashes
sl(bx-10,hY-5,bx-12,hY-8,1.5,out);
sl(bx-9,hY-6,bx-10,hY-8,1,out+'80');

// Right eye white
sf(bx+2,hY-4,8,5,'#ffffff');
sf(bx+4,hY-5,6,1,'#ffffff');
// Right iris
sf(bx+3,hY-4,5,4,'#3a2818');
sf(bx+3,hY-3,5,3,'#4a3828');
// Right pupil
sf(bx+4,hY-3,3,3,'#0a0808');
// Right eye shine
sc(bx+4,hY-4,1,'#ffffff');
sc(bx+7,hY-2,0.8,'#ffffff');
// Right upper eyelid
sf(bx+2,hY-6,9,2,out);
sf(bx+9,hY-5,2,1,out);
// Right lower eyelid
sf(bx+3,hY+1,7,1,out+'60');
// Right eyelashes
sl(bx+11,hY-5,bx+13,hY-8,1.5,out);
sl(bx+10,hY-6,bx+11,hY-8,1,out+'80');

// Eyebrows — strong, determined pixel blocks
sf(bx-10,hY-8,8,2,'#1a1410');
sf(bx-11,hY-7,2,1,'#1a1410');
sf(bx+3,hY-8,8,2,'#1a1410');
sf(bx+10,hY-7,2,1,'#1a1410');

// Nose — small pixel detail
sf(bx,hY+2,2,3,skDk);
sf(bx-1,hY+4,4,1,skDk+'60');
sc(bx+2,hY+3,0.8,skLt);

// Mouth — determined line
sf(bx-3,hY+6,7,1,'#8a5a40');
sf(bx-2,hY+7,5,1,'#a07060');
// Slight highlight on lower lip
sf(bx-1,hY+7,3,1,skLt+'40');

// === ACCESSORIES — green trim details, gold accents ===
// Crop top neckline green trim
sf(bx-12+twOff,nY+1,24,1,grnLt);

// Gold accent on left shoulder pad
sf(bx-17+twOff,nY,2,4,goldLt);
sf(bx-16+twOff,nY-2,6,1,gold);

// Outline pass — key edges for definition
// Head outline
sf(bx-13,hY-8,1,16,out+'40');
sf(bx+12,hY-8,1,16,out+'40');
sf(bx-7,hY+10,14,1,out+'30');
// Torso outline edges
sf(bx-16+twOff,nY,1,17,out+'30');
sf(bx+15+twOff,nY,1,17,out+'30');
}

// NOIR — Shadow Assassin. Professional pixel-art with bezier contours,
// tapered limbs, flowing cloak, 3-tone shading throughout.
function drawNoir(cx,gy,o){const L=o.lean||0,bx=cx+L;
const tw=o.torsoTwist||0,hr=o.hipRot||0;
const sk='#d8c8a8',skDk='#b8a888',skLt='#e8dcc8',skMid='#d0c0a0';
const cloak='#2a1840',dk='#180c28',cloakMid='#221438',acc='#6030a0',accLt='#8050cc';
const glow='#ffcc00',glowLt='#fff8cc',blade='#c0c8d8',bladeDk='#8090a0',out='#0c0618';

// === FLOWING CLOAK (behind everything — bezier curves) ===
_s.fillStyle=cloak+'d0';_s.beginPath();
_s.moveTo(bx-16,gy-74);
_s.quadraticCurveTo(bx-26-L*3,gy-22,bx-18-L*4,gy+8);
_s.lineTo(bx+18-L,gy+8);
_s.quadraticCurveTo(bx+20,gy-22,bx+16,gy-74);
_s.closePath();_s.fill();_s.strokeStyle=acc+'50';_s.lineWidth=1.5;_s.stroke();
// Cloak fold lines (bezier)
_s.strokeStyle=acc+'20';_s.lineWidth=1;_s.lineCap='round';
_s.beginPath();_s.moveTo(bx-10,gy-55);_s.quadraticCurveTo(bx-14-L*1.5,gy-35,bx-16-L*2,gy-12);_s.stroke();
_s.beginPath();_s.moveTo(bx+8,gy-55);_s.quadraticCurveTo(bx+7-L*0.5,gy-35,bx+6-L,gy-12);_s.stroke();
// Mystical rune circles on cloak
_s.strokeStyle=acc+'15';_s.lineWidth=0.8;_s.beginPath();_s.arc(bx-8,gy-35,4,0,Math.PI*2);_s.stroke();
_s.beginPath();_s.arc(bx+4,gy-25,3,0,Math.PI*2);_s.stroke();
// Cloak tattered edges (bezier wisps)
for(let i=0;i<4;i++){
  _s.strokeStyle=dk+'80';_s.lineWidth=1.5;_s.lineCap='round';
  _s.beginPath();_s.moveTo(bx-16-L*3-i*2,gy+2+i*2);
  _s.quadraticCurveTo(bx-18-L*3.5-i*2.5,gy+5+i*3,bx-20-L*4-i*3,gy+8+i*4);_s.stroke();
  _s.beginPath();_s.moveTo(bx+16-L+i*2,gy+2+i*2);
  _s.quadraticCurveTo(bx+18-L*0.5+i*2.5,gy+5+i*3,bx+20-L+i*3,gy+8+i*4);_s.stroke();
}

// === LEGS (tapered, contoured with drawLimb — sleek assassin) ===
const lx=bx-6+(o.lLS||0)+hr*0.3, ly=gy-(o.lFL||0);
const rx=bx+6+(o.rLS||0)+hr*0.3, ry=gy-(o.rFL||0);
// Upper legs
const lKneeX=(bx-3+lx)/2, lKneeY=(gy-38+ly)/2;
const rKneeX=(bx+3+rx)/2, rKneeY=(gy-38+ry)/2;
drawLimb(bx-3,gy-38,lKneeX,lKneeY,8,7,cloakMid,cloak,dk,out);
drawLimb(lKneeX,lKneeY,lx,ly,7,5,cloakMid,cloak,dk,out);
drawLimb(bx+3,gy-38,rKneeX,rKneeY,8,7,cloakMid,cloak,dk,out);
drawLimb(rKneeX,rKneeY,rx,ry,7,5,cloakMid,cloak,dk,out);
// Shin accent straps
sl(lx-2,ly-6,lx+2,ly-6,1.5,acc+'60');
sl(rx-2,ry-6,rx+2,ry-6,1.5,acc+'60');
// Boots using drawBoot (dark, stealthy)
drawBoot(lx,ly,8,14,dk,'#0a0414','#060210',out,0);
drawBoot(rx,ry,8,14,dk,'#0a0414','#060210',out,0);

// === TORSO — BEZIER MASCULINE SLEEK with 3-tone shading ===
const nY=gy-74,pY=gy-38;
const twOff=tw*0.3;
// Main torso — slim, straight (assassin build)
_s.fillStyle=cloakMid;_s.beginPath();
_s.moveTo(bx-9+twOff,nY);
_s.lineTo(bx+9+twOff,nY);
_s.quadraticCurveTo(bx+10+twOff,nY+8,bx+8+twOff,nY+16);
_s.lineTo(bx+7+twOff*0.5,nY+26);
_s.quadraticCurveTo(bx+8+hr*0.2,nY+32,bx+7+hr*0.3,pY);
_s.lineTo(bx-7+hr*0.3,pY);
_s.quadraticCurveTo(bx-8+hr*0.2,nY+32,bx-7+twOff*0.5,nY+26);
_s.lineTo(bx-8+twOff,nY+16);
_s.quadraticCurveTo(bx-10+twOff,nY+8,bx-9+twOff,nY);
_s.closePath();_s.fill();
// Highlight right
_s.fillStyle=accLt+'18';_s.beginPath();
_s.moveTo(bx+twOff,nY);_s.lineTo(bx+9+twOff,nY);
_s.quadraticCurveTo(bx+10+twOff,nY+8,bx+8+twOff,nY+16);
_s.lineTo(bx+7+twOff*0.5,nY+26);
_s.quadraticCurveTo(bx+8+hr*0.2,nY+32,bx+7+hr*0.3,pY);
_s.lineTo(bx+hr*0.3,pY);_s.closePath();_s.fill();
// Shadow left
_s.fillStyle=dk+'60';_s.beginPath();
_s.moveTo(bx-9+twOff,nY);_s.lineTo(bx+twOff,nY);
_s.lineTo(bx+hr*0.3,pY);_s.lineTo(bx-7+hr*0.3,pY);
_s.quadraticCurveTo(bx-8+hr*0.2,nY+32,bx-7+twOff*0.5,nY+26);
_s.lineTo(bx-8+twOff,nY+16);
_s.quadraticCurveTo(bx-10+twOff,nY+8,bx-9+twOff,nY);_s.closePath();_s.fill();
// Torso outline
_s.strokeStyle=out;_s.lineWidth=1.5;_s.beginPath();
_s.moveTo(bx-9+twOff,nY);_s.lineTo(bx+9+twOff,nY);
_s.quadraticCurveTo(bx+10+twOff,nY+8,bx+8+twOff,nY+16);
_s.lineTo(bx+7+twOff*0.5,nY+26);
_s.quadraticCurveTo(bx+8+hr*0.2,nY+32,bx+7+hr*0.3,pY);
_s.lineTo(bx-7+hr*0.3,pY);
_s.quadraticCurveTo(bx-8+hr*0.2,nY+32,bx-7+twOff*0.5,nY+26);
_s.lineTo(bx-8+twOff,nY+16);
_s.quadraticCurveTo(bx-10+twOff,nY+8,bx-9+twOff,nY);_s.stroke();
// Collar piece
sf(bx-6+twOff,nY,12,5,cloak);sf(bx-6+twOff,nY,12,1.5,acc);sf(bx-6+twOff,nY+4,12,1,acc+'40');
// Belt with glowing gem
sf(bx-8+hr*0.3,pY-3,16,4,acc);
_s.shadowColor=glow;_s.shadowBlur=5;sf(bx-2+hr*0.3,pY-2,4,3,glow);_s.shadowBlur=0;_s.shadowColor='transparent';
// Pouch accents
sf(bx-7+hr*0.3,pY-5,3,4,accLt+'80');sf(bx+5+hr*0.3,pY-5,3,4,'#44cc88'+'80');
// Cross straps on torso (bezier)
_s.strokeStyle=acc+'40';_s.lineWidth=1.5;_s.lineCap='round';
_s.beginPath();_s.moveTo(bx-6+twOff,nY+6);_s.quadraticCurveTo(bx+twOff*0.5,nY+18,bx+6+hr*0.3,pY-6);_s.stroke();
_s.beginPath();_s.moveTo(bx+6+twOff,nY+6);_s.quadraticCurveTo(bx+twOff*0.5,nY+18,bx-6+hr*0.3,pY-6);_s.stroke();
// Torso rune glow
sl(bx+twOff,nY+2,bx+twOff,nY+12,1,glow+'60');sc(bx+twOff,nY+13,2,glow+'80');

// === ARMS (tapered, contoured with drawLimb — sleek assassin) ===
const sY=nY+5;
const lax=bx-16-(o.lAE||0)+twOff, lay=sY+20+Math.sin(o.lAA||0)*14;
const rax=bx+16+(o.rAE||0)+twOff, ray=sY+20+Math.sin(o.rAA||0)*14;
// Forearm endpoints
const lfax=lax-3+(o.lFA||0), lfay=lay+12;
const rfax=rax+3+(o.rFA||0), rfay=ray+12;
// Left shoulder pad
se(bx-10+twOff,sY-2,5,5,accLt+'60');
// Left upper arm (cloak sleeve)
drawLimb(bx-8+twOff,sY,lax,lay,7,5,cloakMid,cloak,dk,out);
// Left forearm (purple wrappings with glow)
_s.shadowColor='#9060cc';_s.shadowBlur=3;
drawLimb(lax,lay,lfax,lfay,6,4,'#9060cc','#7848b0','#6040a0',out);
_s.shadowBlur=0;_s.shadowColor='transparent';
// Left hand
if((o.lFist||0)>0.5){drawFist(lfax,lfay+2,4,sk,skDk,out);}
else{sc(lfax,lfay+2,4,sk);sc(lfax,lfay+2,4,out+'18');}
// Left blade
sl(lfax,lfay+2,lfax-4,lfay+18,2.5,blade);sl(lfax-4,lfay+18,lfax-6,lfay+20,2,bladeDk);
sl(lfax-3,lfay+20,lfax-5,lfay+22,1.5,blade);
// Left wrist glow
sl(lfax-2,lfay+2,lfax+2,lfay+2,3,glow+'80');
_s.shadowColor=glow;_s.shadowBlur=3;sl(lfax-1,lfay+4,lfax-5,lfay+18,1,glow+'40');_s.shadowBlur=0;_s.shadowColor='transparent';
// Right upper arm (cloak sleeve)
drawLimb(bx+8+twOff,sY,rax,ray,7,5,cloakMid,cloak,dk,out);
// Right forearm (purple wrappings with glow)
_s.shadowColor='#9060cc';_s.shadowBlur=3;
drawLimb(rax,ray,rfax,rfay,6,4,'#9060cc','#7848b0','#6040a0',out);
_s.shadowBlur=0;_s.shadowColor='transparent';
// Right hand
if((o.rFist||0)>0.5){drawFist(rfax,rfay+2,4,sk,skDk,out);}
else{sc(rfax,rfay+2,4,sk);sc(rfax,rfay+2,4,out+'18');}
// Right blade
sl(rfax,rfay+2,rfax+4,rfay+18,2.5,blade);sl(rfax+4,rfay+18,rfax+5,rfay+21,2,bladeDk);
// Right wrist glow
sl(rfax-2,rfay+2,rfax+2,rfay+2,3,glow+'80');
_s.shadowColor=glow;_s.shadowBlur=3;sl(rfax+1,rfay+4,rfax+5,rfay+18,1,glow+'40');_s.shadowBlur=0;_s.shadowColor='transparent';

// === HEAD — BIG, dramatic hood, face wraps, piercing glowing eyes ===
const hY=nY-22+(o.hY||0);
// Neck (thin, partly wrapped)
sf(bx-2+twOff,nY-6,5,8,sk);sf(bx-3+twOff,nY-4,7,4,dk+'90');
// Head base
sc(bx,hY,17,sk);

// === FACE WRAPS — ninja-style, layered cloth ===
sf(bx-14,hY+2,28,12,dk+'e0');
sf(bx-13,hY+2,26,2,dk+'c0');sf(bx-14,hY+5,28,2,dk+'d0');
sf(bx-13,hY+8,26,2,dk+'b0');sf(bx-14,hY+11,28,2,dk+'c0');
sl(bx-14,hY+2,bx+14,hY+2,1.2,acc+'30');
sl(bx-14,hY+14,bx+14,hY+14,1,acc+'20');
sl(bx+4,hY+3,bx-2,hY+13,1,acc+'25');
// Trailing wrap tail (bezier)
_s.strokeStyle=dk+'90';_s.lineWidth=3;_s.lineCap='round';_s.beginPath();
_s.moveTo(bx-14,hY+7);_s.quadraticCurveTo(bx-22,hY+14,bx-26,hY+22);_s.stroke();
_s.lineWidth=2;_s.strokeStyle=dk+'50';_s.beginPath();
_s.moveTo(bx-26,hY+22);_s.quadraticCurveTo(bx-28,hY+28,bx-24,hY+32);_s.stroke();

// === MASSIVE HOOD (defining silhouette — bezier) ===
_s.fillStyle=cloak;_s.beginPath();_s.ellipse(bx,hY-4,26,20,0,Math.PI,0);_s.fill();
_s.fillStyle=dk+'80';_s.beginPath();_s.ellipse(bx,hY-8,20,10,0,Math.PI,0);_s.fill();
_s.strokeStyle=acc;_s.lineWidth=3.5;_s.beginPath();_s.ellipse(bx,hY-4,26,20,0,Math.PI,0);_s.stroke();
_s.strokeStyle=accLt+'40';_s.lineWidth=1;_s.beginPath();_s.ellipse(bx,hY-4,23,17,0,Math.PI+0.1,2*Math.PI-0.1);_s.stroke();

// Pointed ear/horn tips (bezier curves)
_s.strokeStyle=acc;_s.lineWidth=4;_s.lineCap='round';
_s.beginPath();_s.moveTo(bx-25,hY-4);_s.quadraticCurveTo(bx-30,hY-12,bx-32,hY-18);_s.stroke();
_s.strokeStyle=accLt+'60';_s.lineWidth=2;
_s.beginPath();_s.moveTo(bx-30,hY-14);_s.quadraticCurveTo(bx-33,hY-19,bx-34,hY-22);_s.stroke();
_s.strokeStyle=acc;_s.lineWidth=4;
_s.beginPath();_s.moveTo(bx+25,hY-4);_s.quadraticCurveTo(bx+30,hY-12,bx+32,hY-18);_s.stroke();
_s.strokeStyle=accLt+'60';_s.lineWidth=2;
_s.beginPath();_s.moveTo(bx+30,hY-14);_s.quadraticCurveTo(bx+33,hY-19,bx+34,hY-22);_s.stroke();

// Hood rune
sc(bx,hY-18,4,acc+'40');
_s.strokeStyle=acc+'50';_s.lineWidth=1;_s.beginPath();_s.arc(bx,hY-18,4,0,Math.PI*2);_s.stroke();
sl(bx-2,hY-18,bx+2,hY-18,0.8,acc+'40');sl(bx,hY-20,bx,hY-16,0.8,acc+'40');

// Shadow covering face between hood and wraps
se(bx,hY+1,16,6,cloak+'c0');

// === GLOWING EYES — ICONIC, piercing from darkness ===
_s.shadowColor=glow;_s.shadowBlur=14;
// --- LEFT EYE ---
se(bx-7,hY-2,8,4,dk+'a0');
se(bx-7,hY-2,7,3.5,glow);
se(bx-7,hY-2,5,2.5,'#ffe060');
se(bx-6,hY-2,3,1.5,'#ffffff');
sf(bx-7,hY-3,1.5,3,'#806020');
// --- RIGHT EYE ---
se(bx+7,hY-2,8,4,dk+'a0');
se(bx+7,hY-2,7,3.5,glow);
se(bx+7,hY-2,5,2.5,'#ffe060');
se(bx+8,hY-2,3,1.5,'#ffffff');
sf(bx+7,hY-3,1.5,3,'#806020');
// Extra glow flare
sl(bx-13,hY-2,bx-17,hY-3,1.5,glow+'60');
sl(bx+13,hY-2,bx+17,hY-3,1.5,glow+'60');
_s.shadowBlur=0;_s.shadowColor='transparent';
// Eyebrows (sharp V-shape, menacing)
sl(bx-12,hY-5,bx-4,hY-8,2.5,dk);
sl(bx+4,hY-8,bx+12,hY-5,2.5,dk);
}

// ============================================================
// SPRITE SHEET SUPPORT (Phase 3 prep)
// ============================================================
// When real PNG sprite sheets exist, load them with loadSpriteSheet().
// The engine checks spriteSheets[id] first — if frames exist for an
// animation, they're used directly. Otherwise falls back to procedural.
const spriteSheets = {};

// Load a sprite sheet PNG and slice it into animation frames.
// Returns a promise. Once loaded, regenerate the character's cache.
function loadSpriteSheet(sheetUrl, charId, layout) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      spriteSheets[charId] = {};
      for(const [anim, info] of Object.entries(layout)) {
        spriteSheets[charId][anim] = [];
        for(let col = 0; col < info.cols; col++) {
          const cv = document.createElement('canvas');
          cv.width = SPRITE_W; cv.height = SPRITE_H;
          const cx = cv.getContext('2d');
          cx.imageSmoothingEnabled = false;
          cx.drawImage(img,
            col * info.frameW, info.row * info.frameH, info.frameW, info.frameH,
            0, 0, SPRITE_W, SPRITE_H);
          spriteSheets[charId][anim].push(cv);
        }
      }
      resolve();
    };
    img.onerror = reject;
    img.src = sheetUrl;
  });
}

// ============================================================
// INDIVIDUAL FRAME LOADER
// ============================================================
// Drop individual PNGs into sprites/<charId>/ with naming:
//   <anim>_<frame>.png   e.g. idle_0.png, attack_light_2.png
//
// Call: loadSpriteFrames('jade')
// Auto-discovers which files exist. Missing frames fall back to procedural.
// Any anim with at least 1 loaded frame replaces the procedural version.

function loadSpriteFrames(charId) {
  if(!spriteSheets[charId]) spriteSheets[charId] = {};
  const basePath = `sprites/${charId}/`;
  const promises = [];

  for(const [anim, info] of Object.entries(SPRITE_ANIMS)) {
    const framePromises = [];
    for(let i = 0; i < info.frames; i++) {
      framePromises.push(new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const cv = document.createElement('canvas');
          cv.width = SPRITE_W; cv.height = SPRITE_H;
          const cx = cv.getContext('2d');
          cx.imageSmoothingEnabled = false;
          cx.drawImage(img, 0, 0, SPRITE_W, SPRITE_H);
          resolve({ index: i, canvas: cv });
        };
        img.onerror = () => resolve(null);
        img.src = `${basePath}${anim}_${i}.png`;
      }));
    }
    promises.push(
      Promise.all(framePromises).then(results => {
        const loaded = results.filter(r => r !== null);
        if(loaded.length > 0) {
          loaded.sort((a, b) => a.index - b.index);
          spriteSheets[charId][anim] = loaded.map(r => r.canvas);
          console.log(`[sprites] ${charId}/${anim}: ${loaded.length} frames loaded`);
        }
      })
    );
  }

  return Promise.all(promises).then(() => {
    const char = CHARACTERS.find(c => c.id === charId);
    if(char) generateSpritesForCharacter(char);
    console.log(`[sprites] ${charId} frames applied`);
  });
}

// GEN + DRAW + INIT
function generateSpritesForCharacter(c){
  const id=c.id;spriteCache[id]={};
  const fn=id==='aurora'?drawAurora:id==='crimson'?drawCrimson:id==='jade'?drawJade:id==='noir'?drawNoir:drawAurora;
  for(const[a,d]of Object.entries(SPRITE_ANIMS)){
    // Use real sprite sheet frames if available
    if(spriteSheets[id]&&spriteSheets[id][a]&&spriteSheets[id][a].length>0){
      spriteCache[id][a]=spriteSheets[id][a]; continue;
    }
    spriteCache[id][a]=[];
    for(let f=0;f<d.frames;f++){
      const cv=document.createElement('canvas');
      cv.width=SPRITE_W;cv.height=SPRITE_H;
      _s=cv.getContext('2d');_s.imageSmoothingEnabled=false;
      fn(SPRITE_W/2,SPRITE_H-14,gp(a,f,d.frames));
      spriteCache[id][a].push(cv);
    }
  }_s=null;
}
function drawFighterSprite(f){const id=f.character&&f.character.id;if(!id||!spriteCache[id])return false;const an=getSpriteAnim(f),am=spriteCache[id][an];if(!am||!am.length)return false;const fr=am[Math.min(getSpriteFrame(f,an),am.length-1)];if(!fr)return false;ctx.save();ctx.imageSmoothingEnabled=false;const dx=f.x-SPRITE_DRAW_W/2,dy=f.y-SPRITE_DRAW_H+22;if(f.facing<0){ctx.translate(f.x,0);ctx.scale(-1,1);ctx.translate(-f.x,0);}if(f.hurtFlash>0&&Math.floor(f.hurtFlash/2)%2===0){const t=document.createElement('canvas');t.width=fr.width;t.height=fr.height;const tc=t.getContext('2d');tc.drawImage(fr,0,0);tc.globalCompositeOperation='source-atop';tc.fillStyle='rgba(255,200,200,0.55)';tc.fillRect(0,0,t.width,t.height);ctx.drawImage(t,dx,dy,SPRITE_DRAW_W,SPRITE_DRAW_H);}else{ctx.drawImage(fr,dx,dy,SPRITE_DRAW_W,SPRITE_DRAW_H);}ctx.imageSmoothingEnabled=true;ctx.restore();return true;}
function drawCharacterAura(f){if(!f||!f.character)return;const g=f.character.glow||'#fff';const p=0.3+Math.abs(Math.sin(globalTime*0.06))*0.2;const gr=ctx.createRadialGradient(f.x,GROUND+4,0,f.x,GROUND+4,45);gr.addColorStop(0,g.slice(0,7)+(Math.round(p*60).toString(16).padStart(2,'0')));gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(f.x-45,GROUND-2,90,20);}
function initSpriteCache(){
  for(const c of CHARACTERS) generateSpritesForCharacter(c);
  // Auto-load individual frame PNGs from sprites/<charId>/ folders.
  // Any PNG found replaces the procedural frame for that animation.
  for(const c of CHARACTERS) loadSpriteFrames(c.id);
}
if(typeof window!=='undefined')window.addEventListener('load',()=>setTimeout(initSpriteCache,100));

// ============================================================
// SPRITES — detailed pixel-art with personality
// ============================================================
const SPRITE_W=112,SPRITE_H=180,SPRITE_SCALE=1.9;
const SPRITE_DRAW_W=Math.round(SPRITE_W*SPRITE_SCALE),SPRITE_DRAW_H=Math.round(SPRITE_H*SPRITE_SCALE);
const spriteCache={};
const SPRITE_ANIMS={idle:{frames:4,rate:12},walk:{frames:6,rate:5},attack_light:{frames:4,rate:4},attack_heavy:{frames:5,rate:6},hurt:{frames:2,rate:8},jump:{frames:2,rate:10},block:{frames:1,rate:1},dash:{frames:2,rate:4},attack_ult:{frames:6,rate:8},attack_throw:{frames:4,rate:6}};
function getSpriteAnim(f){if(f.state==='attack'){if(f.attackType==='ult')return'attack_ult';if(f.attackType==='throw')return'attack_throw';if(f.attackType==='heavy')return'attack_heavy';return'attack_light';}if(f.state==='hurt'||f.state==='stagger'||f.state==='wallsplat')return'hurt';if(f.state==='dash')return'dash';if(f.state==='ringout')return'hurt';if(f.blocking)return'block';if(!f.onGround)return'jump';if(Math.abs(f.vx)>1.5)return'walk';return'idle';}
function getSpriteFrame(f,a){const d=SPRITE_ANIMS[a]||SPRITE_ANIMS.idle;return Math.floor((f.stateTime||globalTime)/d.rate)%d.frames;}
let _s=null;
function sf(x,y,w,h,c){_s.fillStyle=c;_s.fillRect(x|0,y|0,w|0,h|0);}
function sc(cx,cy,r,c){_s.fillStyle=c;_s.beginPath();_s.arc(cx,cy,r,0,Math.PI*2);_s.fill();}
function se(cx,cy,rx,ry,c){_s.fillStyle=c;_s.beginPath();_s.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);_s.fill();}
function sl(x1,y1,x2,y2,w,c){_s.strokeStyle=c;_s.lineWidth=w;_s.lineCap='round';_s.beginPath();_s.moveTo(x1,y1);_s.lineTo(x2,y2);_s.stroke();}
function st(x1,y1,w1,x2,y2,w2,c,o){_s.beginPath();_s.moveTo(x1-w1/2,y1);_s.lineTo(x1+w1/2,y1);_s.lineTo(x2+w2/2,y2);_s.lineTo(x2-w2/2,y2);_s.closePath();_s.fillStyle=c;_s.fill();if(o){_s.strokeStyle=o;_s.lineWidth=1.2;_s.stroke();}}
function shadedLimb(x1,y1,x2,y2,w,l,d,o){const dx=x2-x1,dy=y2-y1,ln=Math.sqrt(dx*dx+dy*dy)||1,nx=-dy/ln,ny=dx/ln;_s.beginPath();_s.moveTo(x1,y1);_s.lineTo(x2,y2);_s.lineTo(x2+nx*w/2,y2+ny*w/2);_s.lineTo(x1+nx*w/2,y1+ny*w/2);_s.closePath();_s.fillStyle=l;_s.fill();_s.beginPath();_s.moveTo(x1,y1);_s.lineTo(x2,y2);_s.lineTo(x2-nx*w/2,y2-ny*w/2);_s.lineTo(x1-nx*w/2,y1-ny*w/2);_s.closePath();_s.fillStyle=d;_s.fill();if(o){_s.strokeStyle=o;_s.lineWidth=1;_s.beginPath();_s.moveTo(x1+nx*w/2,y1+ny*w/2);_s.lineTo(x2+nx*w/2,y2+ny*w/2);_s.lineTo(x2-nx*w/2,y2-ny*w/2);_s.lineTo(x1-nx*w/2,y1-ny*w/2);_s.closePath();_s.stroke();}}
function gp(a,f,t){const p=t>1?f/(t-1):0;const o={hY:0,lean:0,lAA:0,rAA:0,lLS:0,rLS:0,lFL:0,rFL:0,rAE:0,lAE:0};if(a==='idle'){o.hY=Math.sin(p*Math.PI*2)*2.5;}else if(a==='walk'){const s=Math.sin(p*Math.PI*2);o.lLS=-s*12;o.rLS=s*12;o.lFL=Math.max(0,s)*8;o.rFL=Math.max(0,-s)*8;o.lAA=s*0.6;o.rAA=-s*0.6;o.lean=3;}else if(a==='attack_light'){o.rAE=(p<0.5?p*2:2-p*2)*35;o.lean=5;}else if(a==='attack_heavy'){if(p<0.35){o.rAA=-1.4;o.lean=-6;}else{o.rAE=((p-0.35)/0.65)*42;o.lean=8;}}else if(a==='hurt'){o.lean=-8;o.hY=4;}else if(a==='jump'){o.lFL=12;o.rFL=14;o.hY=-5;}else if(a==='block'){o.lAA=-1.2;o.rAA=-0.8;o.lean=-3;}else if(a==='dash'){o.lean=12;o.lLS=-16;}else if(a==='attack_ult'){if(p<0.25){o.rAA=-1.7;o.lean=-7;}else if(p<0.65){o.rAE=40;o.lean=10;}else{o.rAA=-2;o.lean=11;o.hY=-4;}}else if(a==='attack_throw'){if(p<0.3){o.rAE=28;o.lAE=28;}else{o.rAA=-Math.PI*((p-0.3)/0.7);o.rAE=22;}}return o;}
function pixelFace(bx,hY,opts){const{eyeColor,eyeW,eyeH,browColor,browAngle,mouthW,mouthColor,mouthY,noseColor,skinDark,outline,expression}=opts;const o=outline||'#1a1020';sf(bx-8,hY-4,eyeW+3,eyeH+2,'#ffffff');sf(bx-7,hY-3,eyeW,eyeH,eyeColor);sf(bx-6,hY-2,2,2,o);sf(bx-7,hY-4,1,1,'#ffffff');sf(bx+3,hY-4,eyeW+3,eyeH+2,'#ffffff');sf(bx+4,hY-3,eyeW,eyeH,eyeColor);sf(bx+5,hY-2,2,2,o);sf(bx+4,hY-4,1,1,'#ffffff');sl(bx-9,hY-7+browAngle,bx-3,hY-8,2,browColor||o);sl(bx+2,hY-8,bx+8,hY-7-browAngle,2,browColor||o);sf(bx-1,hY+2,3,2,noseColor||skinDark||'#c0a090');const my=mouthY||7;if(expression==='smile'){sf(bx-2,hY+my,5,2,mouthColor||'#d09090');sf(bx-1,hY+my,3,1,'#e8a0a0');}else if(expression==='grimace'){sf(bx-3,hY+my,mouthW||7,3,mouthColor||o);sf(bx-2,hY+my+1,2,1,'#ffffff');sf(bx+1,hY+my+1,2,1,'#ffffff');}else if(expression==='serious'){sf(bx-2,hY+my,mouthW||5,2,mouthColor||'#a07060');}else if(expression!=='hidden'){sf(bx-2,hY+my,mouthW||5,2,mouthColor||'#c08080');}}

// AURORA — Ice Princess. CLEARLY FEMININE: hourglass body with visible curves,
// massive flowing hair, dress with split skirt, graceful proportions.
function drawAurora(cx,gy,o){const L=o.lean||0,bx=cx+L;
const sk='#f2ddd0',skDk='#d4b8a8',skLt='#fff0e8';
const hair='#80d8ee',hairDk='#50a8cc',hairLt='#b0f0ff';
const top='#3a78b0',topDk='#224870',topLt='#5898d0';
const bot='#2858a0',boot='#1a3860',out='#102838',acc='#60ccee',accLt='#90e0ff';

// === MASSIVE FLOWING HAIR (behind everything — this IS her silhouette) ===
// Hair is huge — extends far down her back, waves and flows
for(let i=0;i<35;i++){const sw=Math.sin(i*0.18+L*0.04)*6+Math.cos(i*0.3)*2;
const w=Math.max(2,10-i/4);
sf(bx-5+sw-L*0.4,gy-92+i*3,w,3,i%6===0?hairLt:i%3===0?hair:hairDk);}
// Hair ribbon
sc(bx-4,gy-88,3.5,acc);sc(bx-4,gy-88,2,accLt);

// === CAPE/TRAIN (behind body, flows with movement) ===
_s.fillStyle='rgba(96,204,238,0.12)';_s.beginPath();_s.moveTo(bx-10,gy-76);
_s.quadraticCurveTo(bx-22-L*3,gy-30,bx-14-L*4,gy+8);
_s.lineTo(bx+10,gy+8);_s.quadraticCurveTo(bx+12,gy-30,bx+10,gy-76);_s.closePath();_s.fill();

// === LEGS (slender, long — shows through split skirt) ===
const lx=bx-7+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+7+(o.rLS||0),ry=gy-(o.rFL||0);
shadedLimb(bx-4,gy-38,lx,ly,8,sk,skDk,out);  // visible skin (thigh-highs)
shadedLimb(bx+4,gy-38,rx,ry,8,sk,skDk,out);
// Thigh-high boots (tall, with heel)
sf(lx-4,ly-12,9,14,boot);sf(lx-4,ly-12,9,2,acc);sl(lx-3,ly,lx+5,ly,1.5,acc+'50');sf(lx+2,ly-4,3,6,boot);
sf(rx-4,ry-12,9,14,boot);sf(rx-4,ry-12,9,2,acc);sl(rx-3,ry,rx+5,ry,1.5,acc+'50');sf(rx+2,ry-4,3,6,boot);

// === TORSO — TRUE HOURGLASS with visible feminine curves ===
const nY=gy-80,pY=gy-38;
// Draw the body as a custom bezier shape — NOT a trapezoid
_s.fillStyle=top;_s.beginPath();
_s.moveTo(bx-9,nY);                    // left shoulder
_s.lineTo(bx+9,nY);                    // right shoulder
_s.quadraticCurveTo(bx+11,nY+10,bx+6,nY+18);  // right bust curve
_s.quadraticCurveTo(bx+4,nY+22,bx+5,nY+26);   // right waist pinch
_s.quadraticCurveTo(bx+8,nY+32,bx+12,pY);      // right hip flare
_s.lineTo(bx-12,pY);                   // bottom
_s.quadraticCurveTo(bx-8,nY+32,bx-5,nY+26);   // left hip flare
_s.quadraticCurveTo(bx-4,nY+22,bx-6,nY+18);   // left waist pinch
_s.quadraticCurveTo(bx-11,nY+10,bx-9,nY);      // left bust curve
_s.closePath();_s.fill();
_s.strokeStyle=out;_s.lineWidth=1.2;_s.stroke();
// Dark shading on left side
_s.fillStyle=topDk+'50';_s.beginPath();
_s.moveTo(bx-9,nY);_s.lineTo(bx,nY);_s.lineTo(bx,pY);_s.lineTo(bx-12,pY);
_s.quadraticCurveTo(bx-8,nY+32,bx-5,nY+26);
_s.quadraticCurveTo(bx-4,nY+22,bx-6,nY+18);
_s.quadraticCurveTo(bx-11,nY+10,bx-9,nY);_s.closePath();_s.fill();
// Bust definition
se(bx-4,nY+12,5,4,topLt+'40');se(bx+4,nY+12,5,4,topLt+'40');
// V-neckline
_s.fillStyle=sk;_s.beginPath();_s.moveTo(bx,nY+1);_s.lineTo(bx-5,nY+14);_s.lineTo(bx+5,nY+14);_s.closePath();_s.fill();
sl(bx,nY+1,bx-5,nY+14,1.3,acc);sl(bx,nY+1,bx+5,nY+14,1.3,acc);
// Waist belt (at the narrowest point)
sf(bx-5,nY+24,10,3,acc);se(bx,nY+25,2.5,2.5,'#fff');
// Split skirt flare below hips
_s.fillStyle=bot;_s.beginPath();_s.moveTo(bx-12,pY);_s.lineTo(bx-16,pY+10);
_s.lineTo(bx-4,pY+8);_s.lineTo(bx,pY+2);_s.closePath();_s.fill();
_s.beginPath();_s.moveTo(bx+12,pY);_s.lineTo(bx+16,pY+10);
_s.lineTo(bx+4,pY+8);_s.lineTo(bx,pY+2);_s.closePath();_s.fill();
sf(bx-12,pY,24,1.5,acc);

// === ARMS (slender, graceful) ===
const sY=nY+3;const lax=bx-16-(o.lAE||0),lay=sY+20+Math.sin(o.lAA||0)*14;
const rax=bx+16+(o.rAE||0),ray=sY+20+Math.sin(o.rAA||0)*14;
shadedLimb(bx-9,sY,lax,lay,6,top,topDk,out);
shadedLimb(lax,lay,lax-3,lay+12,5,sk,skDk,out);
// Ice crystal bracer
sf(lax-2,lay-1,5,3,accLt);sc(lax,lay,2,'#fff');
sc(lax-3,lay+14,3.5,sk);sc(lax-3,lay+14,3.5,out+'20');
shadedLimb(bx+9,sY,rax,ray,6,top,topDk,out);
shadedLimb(rax,ray,rax+3,ray+12,5,sk,skDk,out);
sf(rax-1,ray-1,5,3,accLt);sc(rax+1,ray,2,'#fff');
sc(rax+3,ray+14,3.5,sk);sc(rax+3,ray+14,3.5,out+'20');

// === HEAD — attractive feminine face, hand-drawn not generic ===
const hY=nY-22+(o.hY||0);
// Neck (slender)
sf(bx-2,nY-5,4,7,'#f5e0d0');
// Head — slightly oval (wider than tall for softer look)
se(bx,hY,19,17,'#f5e0d0');                       // warm natural skin
_s.strokeStyle=out+'18';_s.lineWidth=1;_s.beginPath();_s.ellipse(bx,hY,19,17,0,0,Math.PI*2);_s.stroke();
// Ears
se(bx-17,hY+2,3,5,'#f5e0d0');se(bx+17,hY+2,3,5,'#f5e0d0');
// Crystal earrings (dangling)
sc(bx-17,hY+7,2.5,acc);sc(bx-17,hY+7,1.2,'#fff');sc(bx-17,hY+10,1.5,accLt);
sc(bx+17,hY+7,2.5,acc);sc(bx+17,hY+7,1.2,'#fff');sc(bx+17,hY+10,1.5,accLt);

// === HAIR — massive voluminous bangs ===
se(bx+1,hY-14,19,10,hair);                       // main bang volume
se(bx-7,hY-15,10,7,hairDk);                      // left dark layer
se(bx+10,hY-12,8,6,hairLt);                      // right highlight
sf(bx-16,hY-6,9,7,hairDk);                       // left side bang
sf(bx+12,hY-4,8,6,hair);                         // right side bang
// Hair strand detail
sl(bx-8,hY-14,bx-12,hY-4,1,hairDk+'80');
sl(bx+6,hY-13,bx+10,hY-4,1,hairLt+'60');

// === ICE CROWN ===
sl(bx-9,hY-17,bx-12,hY-36,3.5,acc);
sl(bx-4,hY-18,bx-6,hY-31,3,accLt);
sl(bx,hY-19,bx,hY-40,4.5,'#c0f4ff');
sl(bx+4,hY-18,bx+6,hY-31,3,accLt);
sl(bx+9,hY-17,bx+12,hY-36,3.5,acc);
sc(bx,hY-40,4,'#ffffff');sc(bx,hY-40,2.5,'#c0f4ff');
sf(bx-12,hY-17,24,3,acc);                        // tiara band
sl(bx-15,hY-9,bx-17,hY-18,2,acc+'70');           // side crystal
sl(bx+15,hY-9,bx+17,hY-18,2,acc+'70');

// === FACE — hand-drawn attractive features ===
// Eye shadow (subtle ice-blue tint above eyes)
se(bx-7,hY-5,7,3,acc+'18');se(bx+7,hY-5,7,3,acc+'18');

// LEFT EYE — large, round, expressive
se(bx-7,hY-2,6,5,'#ffffff');                      // white sclera (ellipse)
se(bx-6,hY-1,4.5,4,'#28c8e8');                   // iris (teal-cyan, not neon)
sc(bx-5,hY,2.5,'#1068a0');                        // pupil (deep blue)
sc(bx-7,hY-3,1.5,'#ffffff');                      // catch light (upper left)
sc(bx-4,hY+1,0.8,'#ffffff');                      // secondary highlight
// Upper eyelid line
_s.strokeStyle='#2a4060';_s.lineWidth=1.5;_s.beginPath();
_s.ellipse(bx-7,hY-3,6.5,3,0,Math.PI+0.3,2*Math.PI-0.3);_s.stroke();
// Lower lash line (subtle)
_s.strokeStyle=out+'40';_s.lineWidth=0.8;_s.beginPath();
_s.ellipse(bx-7,hY+1,5,2.5,0,0.3,Math.PI-0.3);_s.stroke();

// RIGHT EYE — mirror
se(bx+7,hY-2,6,5,'#ffffff');
se(bx+8,hY-1,4.5,4,'#28c8e8');
sc(bx+9,hY,2.5,'#1068a0');
sc(bx+7,hY-3,1.5,'#ffffff');
sc(bx+10,hY+1,0.8,'#ffffff');
_s.strokeStyle='#2a4060';_s.lineWidth=1.5;_s.beginPath();
_s.ellipse(bx+7,hY-3,6.5,3,0,Math.PI+0.3,2*Math.PI-0.3);_s.stroke();
_s.strokeStyle=out+'40';_s.lineWidth=0.8;_s.beginPath();
_s.ellipse(bx+7,hY+1,5,2.5,0,0.3,Math.PI-0.3);_s.stroke();

// Eyelashes (elegant, extending outward)
sl(bx-12,hY-4,bx-15,hY-8,1.5,'#2a4060');        // outer lash left
sl(bx-10,hY-5,bx-12,hY-8,1,'#2a406080');         // second lash
sl(bx+12,hY-4,bx+15,hY-8,1.5,'#2a4060');
sl(bx+10,hY-5,bx+12,hY-8,1,'#2a406080');

// Eyebrows (thin, elegant arch)
_s.strokeStyle='#8a7060';_s.lineWidth=1.5;_s.lineCap='round';
_s.beginPath();_s.moveTo(bx-11,hY-7);_s.quadraticCurveTo(bx-7,hY-10,bx-3,hY-8);_s.stroke();
_s.beginPath();_s.moveTo(bx+3,hY-8);_s.quadraticCurveTo(bx+7,hY-10,bx+11,hY-7);_s.stroke();

// Nose (tiny, delicate — just a small shadow and highlight)
sc(bx,hY+3,1.2,'#dcc0b0');                       // nose shadow
sc(bx+1,hY+2,0.7,'#fff8f0');                     // nose highlight

// Mouth (soft lips — two-tone)
se(bx,hY+8,4,1.8,'#cc7878');                     // upper lip (darker)
se(bx,hY+9.5,3.5,1.5,'#e89898');                 // lower lip (lighter, glossy)
sc(bx+1,hY+9,0.7,'#ffbbbb');                     // lip highlight

// Blush (warm, visible)
se(bx-10,hY+4,4.5,3,'#ffaaaa20');se(bx+10,hY+4,4.5,3,'#ffaaaa20');

// Chin definition (very subtle shadow)
_s.strokeStyle='#e0c8b8';_s.lineWidth=0.8;_s.beginPath();
_s.ellipse(bx,hY+13,8,2,0,0.2,Math.PI-0.2);_s.stroke();}

// CRIMSON
function drawCrimson(cx,gy,o){const L=o.lean||0,bx=cx+L;const sk='#f0d0b8',skDk='#d0a890',skLt='#ffe0d0';const gi='#cc2244',giDk='#881430',giLt='#ee4466',giVLt='#ff6688';const wrap='#ff8866',wrapDk='#cc5533',band='#ff5566',bandDk='#cc3344',out='#3a0a14';
_s.strokeStyle='rgba(255,56,96,0.25)';_s.lineWidth=5;_s.lineCap='round';_s.beginPath();_s.moveTo(bx-5,gy-44);_s.quadraticCurveTo(bx-18-L*3,gy-18,bx-22-L*4,gy);_s.stroke();_s.lineWidth=3;_s.strokeStyle='rgba(255,56,96,0.12)';_s.beginPath();_s.moveTo(bx-22-L*4,gy);_s.quadraticCurveTo(bx-24-L*4,gy+10,bx-20-L*3,gy+16);_s.stroke();
const lx=bx-9+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+9+(o.rLS||0),ry=gy-(o.rFL||0);
shadedLimb(bx-4,gy-46,lx,ly,11,gi,giDk,out);shadedLimb(bx+4,gy-46,rx,ry,11,gi,giDk,out);sf(lx-3,ly-8,2,3,giLt);sf(rx+2,ry-6,2,4,giLt);
for(let i=0;i<3;i++){sl((bx-4+lx)/2-1,(gy-46+ly)/2-4+i*3,(bx-4+lx)/2+3,(gy-46+ly)/2-3+i*3,2,wrap);sl((bx+4+rx)/2-1,(gy-46+ry)/2-4+i*3,(bx+4+rx)/2+3,(gy-46+ry)/2-3+i*3,2,wrap);}
sf(lx-5,ly-3,12,6,giDk);sf(lx-5,ly-3,12,1.5,out);sf(rx-5,ry-3,12,6,giDk);sf(rx-5,ry-3,12,1.5,out);
const nY=gy-80,pY=gy-46;st(bx,pY,16,bx,nY,24,gi,out);sf(bx-12,nY,12,pY-nY,giDk+'50');sl(bx+9,nY+4,bx+8,pY-4,1.5,giVLt+'40');
_s.fillStyle=sk;_s.beginPath();_s.moveTo(bx,nY+3);_s.lineTo(bx-8,nY+22);_s.lineTo(bx+8,nY+22);_s.closePath();_s.fill();
sl(bx,nY+3,bx-8,nY+24,1.5,out+'50');sl(bx,nY+3,bx+8,nY+24,1.5,out+'50');
se(bx-4,nY+12,5,3,skLt);se(bx+4,nY+12,5,3,skLt);
for(let i=0;i<3;i++){sl(bx-3,nY+20+i*5,bx-3,nY+23+i*5,0.8,skDk+'50');sl(bx+3,nY+20+i*5,bx+3,nY+23+i*5,0.8,skDk+'50');}
sl(bx,nY+18,bx,pY-4,1,skDk+'40');sl(bx-6,nY+8,bx+4,nY+18,1.2,'#cc9080');
sl(bx-6,nY+14,bx-9,nY+10,1,'#ff886640');sl(bx-9,nY+10,bx-7,nY+6,1,'#ff886640');sl(bx-7,nY+6,bx-4,nY+8,1,'#ff886640');
sf(bx-9,pY-2,18,4,'#1a1a1a');sf(bx-9,pY-2,18,1,out);sf(bx-2,pY-1,5,3,band);sc(bx,pY,1.5,'#ffaa44');
const sY=nY+4;const lax=bx-22-(o.lAE||0),lay=sY+24+Math.sin(o.lAA||0)*14;const rax=bx+22+(o.rAE||0),ray=sY+24+Math.sin(o.rAA||0)*14;
shadedLimb(bx-12,sY,lax,lay,10,sk,skDk,out);sl(bx-12+(lax-bx+12)*0.35,sY+(lay-sY)*0.35,bx-12+(lax-bx+12)*0.65,sY+(lay-sY)*0.65,1.5,skLt+'50');
sf(lax-2,lay-2,8,5,wrapDk);sf(lax-2,lay-2,8,1.5,'#444');sl(lax,lay-4,lax,lay-7,1.5,'#666');sl(lax+3,lay-4,lax+3,lay-7,1.5,'#666');
shadedLimb(lax,lay+3,lax-4,lay+16,8,wrap,wrapDk,out);sl(lax-1,lay+4,lax-3,lay+14,1.5,wrapDk);sl(lax+1,lay+6,lax-1,lay+12,1,wrap);
sc(lax-4,lay+19,5,sk);sc(lax-4,lay+19,5,out+'20');
shadedLimb(bx+12,sY,rax,ray,10,sk,skDk,out);sl(bx+12+(rax-bx-12)*0.35,sY+(ray-sY)*0.35,bx+12+(rax-bx-12)*0.65,sY+(ray-sY)*0.65,1.5,skLt+'50');
sf(rax-4,ray-2,8,5,wrapDk);sf(rax-4,ray-2,8,1.5,'#444');sl(rax,ray-4,rax,ray-7,1.5,'#666');sl(rax-3,ray-4,rax-3,ray-7,1.5,'#666');
shadedLimb(rax,ray+3,rax+4,ray+16,8,wrap,wrapDk,out);sl(rax+1,ray+4,rax+3,ray+14,1.5,wrapDk);sl(rax-1,ray+6,rax+1,ray+12,1,wrap);
sc(rax+4,ray+19,5,sk);sc(rax+4,ray+19,5,out+'20');
const hY=nY-18+(o.hY||0);sf(bx-3,nY-5,7,7,sk);sc(bx,hY,15,sk);sc(bx,hY,15.5,out+'30');se(bx-12,hY+1,3,4,sk);
sf(bx-15,hY-4,30,5,band);sf(bx-15,hY-4,30,1,bandDk);sc(bx+2,hY-2,3,bandDk);sc(bx+2,hY-2,1.5,'#ffaa44');
sl(bx-15,hY-3,bx-23,hY+8,3,band);sl(bx-23,hY+8,bx-28,hY+16,2.5,band+'80');
sl(bx-6,hY-10,bx-22,hY-38,5.5,'#ff6644');sl(bx-3,hY-12,bx-12,hY-46,6,'#ff3040');sl(bx+1,hY-10,bx-5,hY-38,5,'#ff5533');sl(bx+5,hY-9,bx+2,hY-32,4.5,'#ff4444');sl(bx+8,hY-7,bx+7,hY-24,3.5,'#ff7744');sl(bx+11,hY-4,bx+11,hY-18,3,'#ffaa44');sl(bx+13,hY-2,bx+14,hY-12,2,'#ffcc66');
pixelFace(bx,hY,{eyeColor:'#ff3860',eyeW:3,eyeH:4,browColor:out,browAngle:3,mouthColor:out,mouthW:7,mouthY:8,noseColor:skDk,skinDark:skDk,outline:out,expression:'grimace'});sf(bx-2,hY+5,6,2,skDk+'30');}

// JADE — Armored Warrior QUEEN. CLEARLY FEMININE BUT MASSIVE:
// Wide hourglass with visible curves under armor, valkyrie-style
// helmet with wing details, huge shoulder pads, battle hammer visible.
function drawJade(cx,gy,o){const L=o.lean||0,bx=cx+L;
const sk='#d8c0a0',skDk='#b8a080';const ar='#2a6640',dk='#1a4430',lt='#44aa66';
const pl='#3a8855',plDk='#286838',met='#88cc88',metDk='#558855',gold='#ccaa44',goldDk='#997722',out='#0a2218';

// === LEGS — powerful, wide stance, armored ===
const lx=bx-14+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+14+(o.rLS||0),ry=gy-(o.rFL||0);
shadedLimb(bx-7,gy-50,lx,ly,15,ar,dk,out);shadedLimb(bx+7,gy-50,rx,ry,15,ar,dk,out);
// Segmented armor plates on each leg
for(let i=0;i<3;i++){sf(lx-7,ly-24+i*7,15,6,pl);sf(lx-7,ly-24+i*7,15,1.5,met);
sf(rx-7,ry-24+i*7,15,6,pl);sf(rx-7,ry-24+i*7,15,1.5,met);}
// Knee guards (gold)
se((bx-7+lx)/2,(gy-50+ly)/2,6,6,pl);sc((bx-7+lx)/2,(gy-50+ly)/2,4,gold);
se((bx+7+rx)/2,(gy-50+ry)/2,6,6,pl);sc((bx+7+rx)/2,(gy-50+ry)/2,4,gold);
// MASSIVE armored boots
sf(lx-8,ly-4,18,8,dk);sf(lx-8,ly-4,18,2,out);sl(lx-7,ly+2,lx+10,ly+2,2,met);sf(lx-2,ly-3,5,4,gold);
sf(rx-8,ry-4,18,8,dk);sf(rx-8,ry-4,18,2,out);sl(rx-7,ry+2,rx+10,ry+2,2,met);sf(rx-2,ry-3,5,4,gold);

// === TORSO — WIDE hourglass under heavy armor ===
const nY=gy-88,pY=gy-50;
// Draw feminine armored torso — wider than any other character
_s.fillStyle=ar;_s.beginPath();
_s.moveTo(bx-14,nY);_s.lineTo(bx+14,nY);          // wide shoulders
_s.quadraticCurveTo(bx+16,nY+12,bx+10,nY+20);     // right chest
_s.quadraticCurveTo(bx+7,nY+24,bx+8,nY+28);       // right waist
_s.quadraticCurveTo(bx+13,nY+34,bx+16,pY);         // right hip
_s.lineTo(bx-16,pY);                                // bottom
_s.quadraticCurveTo(bx-13,nY+34,bx-8,nY+28);      // left hip
_s.quadraticCurveTo(bx-7,nY+24,bx-10,nY+20);      // left waist
_s.quadraticCurveTo(bx-16,nY+12,bx-14,nY);         // left chest
_s.closePath();_s.fill();_s.strokeStyle=out;_s.lineWidth=1.5;_s.stroke();
sf(bx-14,nY,14,pY-nY,dk+'40');  // shadow
// Chest armor plate with feminine shaping
sf(bx-10,nY+5,20,20,pl);sf(bx-10,nY+5,20,3,gold);sf(bx-10,nY+22,20,2,gold);
// Armor bust definition (two curved panels)
_s.strokeStyle=met;_s.lineWidth=1;_s.beginPath();_s.arc(bx-4,nY+14,5,0.5,Math.PI-0.5);_s.stroke();
_s.beginPath();_s.arc(bx+4,nY+14,5,0.5,Math.PI-0.5);_s.stroke();
// Center gemstone
_s.fillStyle=lt;_s.beginPath();_s.moveTo(bx,nY+8);_s.lineTo(bx-6,nY+16);_s.lineTo(bx,nY+24);_s.lineTo(bx+6,nY+16);_s.closePath();_s.fill();
_s.strokeStyle=gold;_s.lineWidth=1.2;_s.stroke();sc(bx,nY+16,3,'#88ffaa');
// Gold belt
sf(bx-14,pY-3,28,5,gold);sf(bx-14,pY-3,28,1.5,goldDk);sc(bx,pY-1,3.5,met);sc(bx,pY-1,2,lt);
// Armored battle skirt (tassets)
_s.fillStyle=pl;_s.beginPath();_s.moveTo(bx-16,pY+1);_s.lineTo(bx+16,pY+1);
_s.lineTo(bx+20,pY+12);_s.lineTo(bx-20,pY+12);_s.closePath();_s.fill();
sf(bx-16,pY+1,32,2,gold);sf(bx-1,pY+3,3,7,met);
// MASSIVE shoulder armor with WING details
se(bx-20,nY+5,12,8,pl);se(bx-20,nY+5,12,2.5,gold);
sl(bx-20,nY-3,bx-24,nY-14,3.5,met);sc(bx-24,nY-14,2.5,gold);
sl(bx-22,nY-1,bx-28,nY-10,2,met+'80');  // wing accent
se(bx+20,nY+5,12,8,pl);se(bx+20,nY+5,12,2.5,gold);
sl(bx+20,nY-3,bx+24,nY-14,3.5,met);sc(bx+24,nY-14,2.5,gold);
sl(bx+22,nY-1,bx+28,nY-10,2,met+'80');

// === ARMS (powerful, armored gauntlets) ===
const sY=nY+6;const lax=bx-28-(o.lAE||0),lay=sY+26+Math.sin(o.lAA||0)*16;
const rax=bx+28+(o.rAE||0),ray=sY+26+Math.sin(o.rAA||0)*16;
shadedLimb(bx-20,sY,lax,lay,13,ar,dk,out);
sf(lax-6,lay-3,16,12,pl);sf(lax-6,lay-3,16,3,gold);sf(lax-6,lay+7,16,1.5,gold);
shadedLimb(lax,lay+9,lax-6,lay+22,11,sk,skDk,out);
sc(lax-6,lay+26,7,sk);sc(lax-6,lay+26,7,out+'20');
shadedLimb(bx+20,sY,rax,ray,13,ar,dk,out);
sf(rax-8,ray-3,16,12,pl);sf(rax-8,ray-3,16,3,gold);sf(rax-8,ray+7,16,1.5,gold);
shadedLimb(rax,ray+9,rax+6,ray+22,11,sk,skDk,out);
sc(rax+6,ray+26,7,sk);sc(rax+6,ray+26,7,out+'20');

// === HEAD — valkyrie helmet, clearly feminine face ===
const hY=nY-22+(o.hY||0);
sf(bx-4,nY-5,9,8,sk);sc(bx,hY,18,sk);
se(bx-16,hY+1,3,5,sk);se(bx+16,hY+1,3,5,sk);  // ears
// Helmet dome
se(bx,hY-5,20,15,pl);
_s.strokeStyle=out;_s.lineWidth=2;_s.beginPath();_s.ellipse(bx,hY-5,20,15,0,Math.PI,0);_s.stroke();
// Visor (gold with green insets)
sf(bx-20,hY-6,40,7,met);sf(bx-20,hY-6,40,2,gold);sf(bx-20,hY,40,1,gold);
// Helmet WINGS (valkyrie) — distinctive side wings
sl(bx-20,hY-8,bx-30,hY-20,3,gold);sl(bx-30,hY-20,bx-26,hY-16,2,met);
sl(bx-28,hY-18,bx-34,hY-26,2,gold+'80');
sl(bx+20,hY-8,bx+30,hY-20,3,gold);sl(bx+30,hY-20,bx+26,hY-16,2,met);
sl(bx+28,hY-18,bx+34,hY-26,2,gold+'80');
// Crest with plume
sf(bx-2,hY-24,5,18,met);
for(let i=0;i<6;i++){sl(bx,hY-24-i*2.5,bx-4-i*2,hY-26-i*2.5,2.5,i%2===0?lt:met);}
se(bx,hY-24,4,3,gold);
// Ponytail out back
for(let i=0;i<16;i++){sf(bx-4+Math.sin(i*0.3)*3-L*0.3,hY+14+i*2.3,6,2.5,i%2===0?lt:met);}
// Face — big eyes through visor, clearly feminine
pixelFace(bx,hY,{eyeColor:'#44ff88',eyeW:5,eyeH:5,browColor:out,browAngle:1,
  mouthColor:'#c09878',mouthW:6,mouthY:10,noseColor:skDk,skinDark:skDk,outline:out,expression:'serious'});
// Eyelashes visible through visor
sl(bx-10,hY-7,bx-12,hY-10,1.2,out+'50');sl(bx+9,hY-7,bx+11,hY-10,1.2,out+'50');
// Beauty mark
sc(bx+8,hY+5,1.2,out+'50');}

// NOIR
function drawNoir(cx,gy,o){const L=o.lean||0,bx=cx+L;const sk='#d8c8a8',skDk='#b8a888';const cloak='#2a1840',dk='#180c28',acc='#6030a0',accLt='#8050cc';const glow='#ffcc00',glowLt='#fff8cc',blade='#c0c8d8',bladeDk='#8090a0',out='#0c0618';
_s.fillStyle=cloak+'d0';_s.beginPath();_s.moveTo(bx-16,gy-74);_s.quadraticCurveTo(bx-26-L*3,gy-22,bx-18-L*4,gy+8);_s.lineTo(bx+18-L,gy+8);_s.quadraticCurveTo(bx+20,gy-22,bx+16,gy-74);_s.closePath();_s.fill();_s.strokeStyle=acc+'50';_s.lineWidth=1.5;_s.stroke();
sl(bx-10,gy-55,bx-16-L*2,gy-12,1,acc+'20');sl(bx+8,gy-55,bx+6-L,gy-12,1,acc+'20');
_s.strokeStyle=acc+'15';_s.lineWidth=0.8;_s.beginPath();_s.arc(bx-8,gy-35,4,0,Math.PI*2);_s.stroke();_s.beginPath();_s.arc(bx+4,gy-25,3,0,Math.PI*2);_s.stroke();
for(let i=0;i<4;i++){sl(bx-16-L*3-i*2,gy+2+i*2,bx-20-L*4-i*3,gy+8+i*4,1.5,dk+'80');sl(bx+16-L+i*2,gy+2+i*2,bx+20-L+i*3,gy+8+i*4,1.5,dk+'80');}
const lx=bx-6+(o.lLS||0),ly=gy-(o.lFL||0),rx=bx+6+(o.rLS||0),ry=gy-(o.rFL||0);
shadedLimb(bx-3,gy-38,lx,ly,8,cloak,dk,out);shadedLimb(bx+3,gy-38,rx,ry,8,cloak,dk,out);
sf(lx-4,ly-3,8,5,dk);sf(rx-4,ry-3,8,5,dk);sl(lx-2,ly-6,lx+2,ly-6,1.5,acc+'60');sl(rx-2,ry-6,rx+2,ry-6,1.5,acc+'60');
const nY=gy-74,pY=gy-38;st(bx,pY,13,bx,nY,17,cloak,out);sf(bx-8,nY,8,pY-nY,dk+'60');
sf(bx-6,nY,12,5,cloak);sf(bx-6,nY,12,1.5,acc);sf(bx-6,nY+4,12,1,acc+'40');
sf(bx-8,pY-3,16,4,acc);_s.shadowColor=glow;_s.shadowBlur=5;sf(bx-2,pY-2,4,3,glow);_s.shadowBlur=0;_s.shadowColor='transparent';
sf(bx-7,pY-5,3,4,accLt+'80');sf(bx+5,pY-5,3,4,'#44cc88'+'80');
sl(bx-6,nY+6,bx+6,pY-6,1.5,acc+'40');sl(bx+6,nY+6,bx-6,pY-6,1.5,acc+'40');
sl(bx,nY+2,bx,nY+12,1,glow+'60');sc(bx,nY+13,2,glow+'80');
const sY=nY+5;const lax=bx-16-(o.lAE||0),lay=sY+20+Math.sin(o.lAA||0)*14;const rax=bx+16+(o.rAE||0),ray=sY+20+Math.sin(o.rAA||0)*14;
sf(bx-10,sY-2,6,6,accLt+'60');shadedLimb(bx-8,sY,lax,lay,7,cloak,dk,out);
_s.shadowColor='#9060cc';_s.shadowBlur=3;shadedLimb(lax,lay,lax-3,lay+12,6,'#9060cc','#6040a0',out);_s.shadowBlur=0;_s.shadowColor='transparent';
sc(lax-3,lay+14,4,sk);sl(lax-3,lay+14,lax-7,lay+30,2.5,blade);sl(lax-7,lay+30,lax-9,lay+32,2,bladeDk);sl(lax-6,lay+32,lax-8,lay+34,1.5,blade);
sl(lax-5,lay+14,lax-1,lay+14,3,glow+'80');_s.shadowColor=glow;_s.shadowBlur=3;sl(lax-4,lay+16,lax-8,lay+30,1,glow+'40');_s.shadowBlur=0;_s.shadowColor='transparent';
shadedLimb(bx+8,sY,rax,ray,7,cloak,dk,out);_s.shadowColor='#9060cc';_s.shadowBlur=3;shadedLimb(rax,ray,rax+3,ray+12,6,'#9060cc','#6040a0',out);_s.shadowBlur=0;_s.shadowColor='transparent';
sc(rax+3,ray+14,4,sk);sl(rax+3,ray+14,rax+7,ray+30,2.5,blade);sl(rax+7,ray+30,rax+8,ray+33,2,bladeDk);
sl(rax+1,ray+14,rax+5,ray+14,3,glow+'80');_s.shadowColor=glow;_s.shadowBlur=3;sl(rax+4,ray+16,rax+8,ray+30,1,glow+'40');_s.shadowBlur=0;_s.shadowColor='transparent';
const hY=nY-18+(o.hY||0);sf(bx-3,nY-5,6,7,sk);sc(bx,hY,15,sk);
sf(bx-12,hY+1,24,10,dk+'d0');sl(bx-12,hY+1,bx+12,hY+1,1,acc+'40');sl(bx-12,hY+10,bx+12,hY+10,1,acc+'40');
sl(bx-12,hY+5,bx-18,hY+12,2,dk+'a0');sl(bx-18,hY+12,bx-22,hY+18,1.5,dk+'60');
_s.fillStyle=cloak;_s.beginPath();_s.ellipse(bx,hY-3,22,17,0,Math.PI,0);_s.fill();_s.strokeStyle=acc;_s.lineWidth=3;_s.beginPath();_s.ellipse(bx,hY-3,22,17,0,Math.PI,0);_s.stroke();
sl(bx-21,hY-3,bx-28,hY-16,3.5,acc);sl(bx+21,hY-3,bx+28,hY-16,3.5,acc);
sc(bx,hY-14,3,acc+'30');_s.strokeStyle=acc+'40';_s.lineWidth=0.8;_s.beginPath();_s.arc(bx,hY-14,3,0,Math.PI*2);_s.stroke();
se(bx,hY+4,12,8,cloak+'e0');
_s.shadowColor=glow;_s.shadowBlur=10;sf(bx-7,hY-4,6,4,glow);sf(bx+3,hY-4,6,4,glow);sf(bx-6,hY-3,4,2,glowLt);sf(bx+4,hY-3,4,2,glowLt);sf(bx-5,hY-2,2,1,'#ffffff');sf(bx+5,hY-2,2,1,'#ffffff');_s.shadowBlur=0;_s.shadowColor='transparent';
sl(bx-8,hY-7,bx-3,hY-6,2,dk);sl(bx+2,hY-6,bx+7,hY-7,2,dk);}

// GEN + DRAW + INIT
function generateSpritesForCharacter(c){const id=c.id;spriteCache[id]={};const fn=id==='aurora'?drawAurora:id==='crimson'?drawCrimson:id==='jade'?drawJade:id==='noir'?drawNoir:drawAurora;for(const[a,d]of Object.entries(SPRITE_ANIMS)){spriteCache[id][a]=[];for(let f=0;f<d.frames;f++){const cv=document.createElement('canvas');cv.width=SPRITE_W;cv.height=SPRITE_H;_s=cv.getContext('2d');_s.imageSmoothingEnabled=false;fn(SPRITE_W/2,SPRITE_H-14,gp(a,f,d.frames));spriteCache[id][a].push(cv);}}_s=null;}
function drawFighterSprite(f){const id=f.character&&f.character.id;if(!id||!spriteCache[id])return false;const an=getSpriteAnim(f),am=spriteCache[id][an];if(!am||!am.length)return false;const fr=am[Math.min(getSpriteFrame(f,an),am.length-1)];if(!fr)return false;ctx.save();ctx.imageSmoothingEnabled=false;const dx=f.x-SPRITE_DRAW_W/2,dy=f.y-SPRITE_DRAW_H+22;if(f.facing<0){ctx.translate(f.x,0);ctx.scale(-1,1);ctx.translate(-f.x,0);}if(f.hurtFlash>0&&Math.floor(f.hurtFlash/2)%2===0){const t=document.createElement('canvas');t.width=fr.width;t.height=fr.height;const tc=t.getContext('2d');tc.drawImage(fr,0,0);tc.globalCompositeOperation='source-atop';tc.fillStyle='rgba(255,200,200,0.55)';tc.fillRect(0,0,t.width,t.height);ctx.drawImage(t,dx,dy,SPRITE_DRAW_W,SPRITE_DRAW_H);}else{ctx.drawImage(fr,dx,dy,SPRITE_DRAW_W,SPRITE_DRAW_H);}ctx.imageSmoothingEnabled=true;ctx.restore();return true;}
function drawCharacterAura(f){if(!f||!f.character)return;const g=f.character.glow||'#fff';const p=0.3+Math.abs(Math.sin(globalTime*0.06))*0.2;const gr=ctx.createRadialGradient(f.x,GROUND+4,0,f.x,GROUND+4,45);gr.addColorStop(0,g.slice(0,7)+(Math.round(p*60).toString(16).padStart(2,'0')));gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(f.x-45,GROUND-2,90,20);}
function initSpriteCache(){for(const c of CHARACTERS)generateSpritesForCharacter(c);}
if(typeof window!=='undefined')window.addEventListener('load',()=>setTimeout(initSpriteCache,100));

// ============================================================
// AUDIO — SFX + procedural fight music
// Global namespace: Audio (returned from IIFE)
// ============================================================
const Audio = (() => {
  let ctx;
  let muted = false;
  let masterSfxGain = null;
  // Warm up SpeechSynthesis voice list — Chrome populates it asynchronously.
  let _voices = [];
  function _loadVoices() {
    try { _voices = (window.speechSynthesis && speechSynthesis.getVoices()) || []; } catch(e){}
  }
  if(typeof window !== 'undefined' && window.speechSynthesis) {
    _loadVoices();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', _loadVoices);
    // Fallback for older browsers
    if(speechSynthesis.onvoiceschanged !== undefined) {
      const prev = speechSynthesis.onvoiceschanged;
      speechSynthesis.onvoiceschanged = function(){ _loadVoices(); if(typeof prev === 'function') prev.apply(this, arguments); };
    }
  }
  function ensure() {
    if(!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterSfxGain = ctx.createGain();
      masterSfxGain.gain.value = 1.0;
      masterSfxGain.connect(ctx.destination);
    }
    if(ctx.state === 'suspended') ctx.resume();
  }
  function dest() { return masterSfxGain || ctx.destination; }
  function beep(freq, dur, type = 'square', vol = 0.1, slideTo = null) {
    if(muted) return;
    try {
      ensure();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      if(slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.value = vol;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(dest());
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch(e){}
  }
  function noise(dur, vol = 0.08, filterFreq = null) {
    if(muted) return;
    try {
      ensure();
      const bufferSize = ctx.sampleRate * dur;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      let node = src;
      if(filterFreq) {
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = filterFreq;
        node.connect(filt);
        node = filt;
      }
      node.connect(gain).connect(dest());
      src.start();
    } catch(e){}
  }

  // ===== MUSIC ENGINE =====
  // 4-bar (64-step) loop. Tracks: bass, drums, lead, pad. Per-stage patterns.
  // MIDI helpers: G2=43, A2=45, Bb2=46, C3=48, D3=50, F3=53, G3=55
  const PATTERNS = {
    // Twilight Tower — G minor pentatonic, catchy 90s arcade groove
    kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0,
            1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
            1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0,
            1,0,0,1, 0,0,1,0, 0,0,1,0, 0,1,1,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1,
            0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
            0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1,
            0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,1],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
            1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
            1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
            1,0,1,0, 1,0,1,0, 1,0,1,0, 1,1,1,1],
    bass:  [43,0,0,0, 43,0,50,0, 46,0,0,0, 50,0,46,0,
            43,0,0,0, 43,0,50,0, 53,0,0,0, 50,0,48,46,
            43,0,0,0, 43,0,50,0, 46,0,0,0, 50,0,46,0,
            41,0,0,0, 38,0,0,0, 43,0,0,0, 50,0,0,0],
    lead:  [55,0,0,0, 62,0,58,0, 55,0,0,55, 62,0,0,0,
            55,0,0,0, 62,0,58,0, 65,0,62,60, 58,0,55,0,
            55,0,0,0, 62,0,58,0, 55,0,0,55, 62,0,0,0,
            65,0,62,60, 58,0,55,0, 53,0,50,0, 55,0,0,0],
    pad:   [43,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            48,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            46,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            41,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  };
  const PATTERNS_INTENSE = {
    kick:  [1,0,0,1, 0,0,1,0, 0,1,1,0, 1,0,0,1,
            1,0,0,1, 0,0,1,0, 0,1,1,0, 1,0,1,0,
            1,0,0,1, 0,0,1,0, 0,1,1,0, 1,0,0,1,
            1,1,0,1, 0,0,1,0, 0,1,1,0, 1,1,1,1],
    snare: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,1,
            0,0,0,0, 1,0,1,0, 0,0,0,0, 1,0,1,1,
            0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,1,
            0,0,0,0, 1,1,0,1, 0,0,0,0, 1,1,1,1],
    hat:   [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
            1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
            1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
            1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bass:  [43,0,43,0, 50,0,50,0, 46,0,46,0, 50,0,50,46,
            43,0,43,0, 50,0,50,0, 53,0,53,0, 50,46,50,48,
            43,0,43,0, 50,0,50,0, 46,0,46,0, 50,0,50,46,
            41,0,38,0, 43,0,46,0, 50,0,53,0, 55,53,50,46],
    lead:  [55,0,58,0, 62,0,65,62, 58,0,55,58, 62,65,62,58,
            55,0,58,0, 62,0,65,62, 67,65,62,60, 58,0,55,0,
            55,0,58,0, 62,0,65,62, 58,0,55,58, 62,65,62,58,
            67,65,62,60, 58,0,55,0, 53,0,50,0, 55,58,62,65],
    pad:   [43,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            48,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            46,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            41,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  };
  const PATTERN_LEN = 64;

  // Dojo theme — A minor pentatonic, slower eastern feel
  const PATTERNS_DOJO = {
    kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
            1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0,
            1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
            1,0,1,0, 0,0,1,0, 1,0,0,0, 0,1,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
            0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
            0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0,
            0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,1],
    hat:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
            0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
            0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
            0,0,1,0, 0,0,1,0, 0,0,1,0, 1,0,1,0],
    bass:  [33,0,0,0, 0,0,0,33, 0,0,40,0, 0,0,0,0,
            33,0,0,0, 0,0,0,33, 0,0,40,0, 0,0,38,0,
            33,0,0,0, 0,0,0,33, 0,0,40,0, 0,0,0,0,
            38,0,0,0, 0,0,40,0, 33,0,0,0, 0,0,0,0],
    lead:  [57,0,0,60, 64,0,0,0, 67,0,64,60, 0,0,57,0,
            57,0,0,60, 64,0,67,0, 69,0,67,64, 60,0,57,0,
            64,0,67,0, 69,0,67,64, 60,0,57,0, 0,0,52,0,
            57,0,60,0, 64,0,67,0, 69,67,64,60, 57,0,0,0],
    pad:   [45,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            48,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            50,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            45,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  };
  const PATTERNS_DOJO_INTENSE = {
    ...PATTERNS_DOJO,
    kick:  [1,0,1,0, 0,0,1,0, 1,0,0,1, 0,0,1,0,
            1,0,1,0, 0,0,1,0, 1,0,0,1, 0,0,1,0,
            1,0,1,0, 0,0,1,0, 1,0,0,1, 0,0,1,0,
            1,0,1,1, 0,0,1,0, 1,0,1,1, 0,1,1,0],
    snare: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,0,
            0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,0,
            0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,1,
            0,0,0,0, 1,0,1,1, 0,0,0,0, 1,1,1,1],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
            1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
            1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
            1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
  };

  // Inferno theme — E phrygian, aggressive metal, fast
  const PATTERNS_INFERNO = {
    kick:  [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0,
            1,0,0,1, 0,0,1,0, 1,1,0,1, 0,0,1,0,
            1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0,
            1,0,1,0, 1,0,1,0, 1,1,0,1, 1,1,1,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0,
            0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1,
            0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0,
            0,0,0,0, 1,0,1,0, 0,0,0,0, 1,1,1,1],
    hat:   [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
            1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
            1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
            1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bass:  [28,28,28,28, 28,0,28,28, 28,28,28,28, 28,0,28,29,
            28,28,28,28, 28,0,28,28, 28,28,28,28, 31,0,28,29,
            28,28,28,28, 28,0,28,28, 28,28,28,28, 28,0,28,29,
            33,0,31,0, 29,0,28,0, 28,28,28,28, 28,28,28,28],
    lead:  [52,0,53,0, 55,0,57,55, 53,0,52,0, 50,52,53,0,
            52,0,53,0, 55,57,59,55, 60,0,57,55, 53,52,50,0,
            52,0,53,0, 55,0,57,55, 53,0,52,0, 50,52,53,0,
            60,57,55,53, 52,50,53,52, 55,57,60,57, 55,53,52,0],
    pad:   [40,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            41,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            43,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            38,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  };
  const PATTERNS_INFERNO_INTENSE = {
    ...PATTERNS_INFERNO,
    kick:  [1,0,1,1, 0,0,1,1, 1,0,1,1, 0,1,1,0,
            1,0,1,1, 0,0,1,1, 1,1,1,1, 0,1,1,0,
            1,0,1,1, 0,0,1,1, 1,0,1,1, 0,1,1,0,
            1,1,1,1, 1,0,1,1, 1,1,1,1, 1,1,1,1],
    snare: [0,0,0,0, 1,0,1,0, 0,0,0,0, 1,0,1,1,
            0,0,0,0, 1,0,1,0, 0,0,0,0, 1,1,0,1,
            0,0,0,0, 1,0,1,0, 0,0,0,0, 1,0,1,1,
            0,0,0,0, 1,1,1,0, 0,0,0,0, 1,1,1,1],
  };

  // Per-stage music selector — add new stages here
  const STAGE_PATTERNS = {
    twilight: { normal: PATTERNS,         intense: PATTERNS_INTENSE,         tempo: 132, tempoIntense: 150 },
    dojo:     { normal: PATTERNS_DOJO,    intense: PATTERNS_DOJO_INTENSE,    tempo: 108, tempoIntense: 124 },
    inferno:  { normal: PATTERNS_INFERNO, intense: PATTERNS_INFERNO_INTENSE, tempo: 148, tempoIntense: 168 },
  };
  let currentStageId = 'twilight';
  let music = {
    playing: false,
    step: 0,
    nextNoteTime: 0,
    intervalId: null,
    intense: false,
    musicGain: null,
  };
  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function pNote(freq, time, dur, type, vol, slide=null) {
    if(muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if(slide) osc.frequency.exponentialRampToValueAtTime(slide, time + dur);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain).connect(music.musicGain);
    osc.start(time);
    osc.stop(time + dur);
  }
  function pKick(time) {
    if(muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, time);
    o.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    g.gain.setValueAtTime(0.45, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    o.connect(g).connect(music.musicGain);
    o.start(time);
    o.stop(time + 0.2);
  }
  function pSnare(time) {
    if(muted) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/d.length, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 800;
    const g = ctx.createGain();
    g.gain.value = 0.28;
    src.connect(filt).connect(g).connect(music.musicGain);
    src.start(time);
  }
  function pHat(time) {
    if(muted) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/d.length, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.value = 0.08;
    src.connect(filt).connect(g).connect(music.musicGain);
    src.start(time);
  }
  function pPad(freq, time, dur) {
    if(muted) return;
    const f1 = ctx.createOscillator();
    const f2 = ctx.createOscillator();
    const f3 = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    f1.type = f2.type = f3.type = 'sawtooth';
    f1.frequency.setValueAtTime(freq, time);
    f2.frequency.setValueAtTime(freq * 1.005, time);
    f3.frequency.setValueAtTime(freq * 0.5, time);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(900, time);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.05, time + 0.15);
    g.gain.setValueAtTime(0.05, time + dur - 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    f1.connect(filt); f2.connect(filt); f3.connect(filt);
    filt.connect(g).connect(music.musicGain);
    f1.start(time); f1.stop(time + dur);
    f2.start(time); f2.stop(time + dur);
    f3.start(time); f3.stop(time + dur);
  }
  function scheduler() {
    if(!music.playing) return;
    const stage = STAGE_PATTERNS[currentStageId] || STAGE_PATTERNS.twilight;
    const tempo = music.intense ? stage.tempoIntense : stage.tempo;
    const stepDur = 60 / tempo / 4;
    while(music.nextNoteTime < ctx.currentTime + 0.12) {
      const s = music.step % PATTERN_LEN;
      const P = music.intense ? stage.intense : stage.normal;
      const t = music.nextNoteTime;
      if(P.kick[s])  pKick(t);
      if(P.snare[s]) pSnare(t);
      if(P.hat[s])   pHat(t);
      if(P.bass[s])  pNote(midiToFreq(P.bass[s]), t, stepDur * 1.8, 'sawtooth', 0.20);
      if(P.lead[s])  {
        pNote(midiToFreq(P.lead[s] + 12), t, stepDur * 2.0, 'triangle', 0.10);
        pNote(midiToFreq(P.lead[s] + 12) * 1.005, t, stepDur * 2.0, 'square', 0.04);
      }
      if(P.pad && P.pad[s]) {
        pPad(midiToFreq(P.pad[s] + 12), t, stepDur * 12);
      }
      music.nextNoteTime += stepDur;
      music.step++;
    }
  }
  return {
    setMute(m) {
      muted = m;
      if(music.musicGain) music.musicGain.gain.value = m ? 0 : 0.35;
      if(masterSfxGain) masterSfxGain.gain.value = m ? 0 : 1.0;
    },
    isMuted() { return muted; },
    musicStart(intense = false) {
      ensure();
      if(music.playing) { music.intense = intense; return; }
      music.musicGain = ctx.createGain();
      music.musicGain.gain.value = muted ? 0 : 0.35;
      music.musicGain.connect(ctx.destination);
      music.playing = true;
      music.step = 0;
      music.intense = intense;
      music.nextNoteTime = ctx.currentTime + 0.05;
      music.intervalId = setInterval(scheduler, 25);
    },
    musicStop() {
      music.playing = false;
      if(music.intervalId) { clearInterval(music.intervalId); music.intervalId = null; }
      if(music.musicGain) {
        try {
          music.musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
          setTimeout(() => { try { music.musicGain.disconnect(); } catch(e){} music.musicGain = null; }, 500);
        } catch(e){}
      }
    },
    musicSetIntense(intense) { music.intense = intense; },
    musicSetStage(stageId) { currentStageId = stageId || 'twilight'; },
    musicDuck(amount = 0.18, dur = 0.15) {
      if(!music.musicGain || muted) return;
      try {
        const now = ctx.currentTime;
        music.musicGain.gain.cancelScheduledValues(now);
        music.musicGain.gain.setValueAtTime(amount, now);
        music.musicGain.gain.linearRampToValueAtTime(0.35, now + dur);
      } catch(e){}
    },

    // SFX ---
    hit: () => {
      beep(70, 0.06, 'sine', 0.28, 32);
      beep(180, 0.04, 'square', 0.10, 90);
      noise(0.05, 0.20, 1500);
    },
    heavy: () => {
      beep(45, 0.18, 'sine', 0.32, 22);
      beep(120, 0.08, 'square', 0.14, 50);
      noise(0.16, 0.26, 1200);
    },
    ultHit: () => { beep(80, 0.1, 'sine', 0.3, 28); beep(280, 0.08, 'square', 0.12, 90); noise(0.1, 0.18, 1800); },
    ultFinisher: () => { beep(38, 0.45, 'sine', 0.35, 18); beep(160, 0.18, 'sawtooth', 0.16, 50); noise(0.32, 0.28, 800); },
    bounce: () => { beep(55, 0.4, 'sine', 0.32, 18); beep(110, 0.15, 'sine', 0.14, 38); noise(0.2, 0.18, 600); },
    block: () => { beep(900, 0.04, 'square', 0.06); noise(0.03, 0.08, 4000); },
    parry: () => { beep(1400, 0.08, 'triangle', 0.12); beep(2100, 0.08, 'triangle', 0.10); },
    whoosh: () => { noise(0.12, 0.06, 2500); },
    jump: () => { beep(420, 0.08, 'sine', 0.05, 280); },
    land: () => { noise(0.06, 0.08, 1000); },
    ultStart: () => {
      beep(200, 0.5, 'sawtooth', 0.16, 900);
      setTimeout(() => beep(700, 0.25, 'square', 0.10, 1400), 180);
      setTimeout(() => beep(1000, 0.15, 'triangle', 0.08, 2000), 360);
    },
    ko: () => {
      beep(440, 0.15, 'square', 0.14, 110);
      setTimeout(() => beep(330, 0.2, 'square', 0.14, 82), 150);
      setTimeout(() => beep(180, 0.5, 'sawtooth', 0.16, 50), 320);
    },
    // Voice announcer — energetic but clear. Pass opts.character for per-fighter voice,
    // or just let the text itself decide (e.g. "Aurora" / "Aurora Storm!" -> mature female).
    say: (text, opts = {}) => {
      if(muted) return;
      try {
        if(window.speechSynthesis) {
          if(!_voices.length) _loadVoices();
          // Chrome loads voices asynchronously. If the very first say() fires before
          // voices populate (common for P1's character pick), defer briefly so we
          // actually get to apply the right voice instead of a browser default.
          if(!_voices.length && !opts._retry) {
            const retry = () => Audio.say(text, Object.assign({}, opts, { _retry: true }));
            if(speechSynthesis.addEventListener) {
              speechSynthesis.addEventListener('voiceschanged', retry, { once: true });
            }
            // Hard timeout fallback so we still speak even if voiceschanged never fires.
            setTimeout(retry, 250);
            return;
          }
          if(opts.interrupt) speechSynthesis.cancel();
          // Normalize ALL-CAPS words (length>=2) to Title Case so voices don't
          // spell them out letter-by-letter (e.g. "AURORA" -> "Aurora").
          const spokenText = String(text || '').replace(/\b[A-Z]{2,}\b/g, w =>
            w.charAt(0) + w.slice(1).toLowerCase()
          );
          const u = new SpeechSynthesisUtterance(spokenText);
          const voices = _voices;
          const isAurora = opts.character === 'aurora' || /\baurora\b/i.test(text || '');
          let preferred = null;
          let defPitch = 1.25, defRate = 1.02;
          if(isAurora) {
            // Prefer voices that already *sound* mature, so we don't have to
            // lower pitch much (pitch shifting neural voices sounds unnatural).
            // Priority: mature Microsoft British > mature Apple > neural Google UK
            // > any en-GB female > any en-AU female > generic female fallback.
            preferred = voices.find(v => /(hazel|susan|catherine|libby|sonia)/i.test(v.name))
                     || voices.find(v => /(serena|moira|tessa|fiona|karen|kate|veena)/i.test(v.name))
                     || voices.find(v => /google uk english female/i.test(v.name))
                     || voices.find(v => /en-gb/i.test(v.lang) && /(female|woman)/i.test(v.name))
                     || voices.find(v => /en-gb/i.test(v.lang))
                     || voices.find(v => /en-au/i.test(v.lang) && /(female|woman)/i.test(v.name))
                     || voices.find(v => /^en/i.test(v.lang) && /(female|woman|zira|aria|samantha)/i.test(v.name));

            // Per-voice pitch/rate tuning. Neural/online voices distort when
            // pitch is shifted; basic voices (Zira, Microsoft David-class) need
            // a bigger shift to actually sound older.
            const name = (preferred && preferred.name) || '';
            const isNeuralGoogle = /^google\s/i.test(name);
            const isMatureMs     = /(hazel|susan|catherine|libby|sonia)/i.test(name);
            const isMatureApple  = /(serena|moira|tessa|fiona|karen|kate|veena)/i.test(name);
            if(isMatureMs || isMatureApple) {
              // Voice already sounds mature — barely touch it.
              defPitch = 0.98;
              defRate  = 0.95;
            } else if(isNeuralGoogle) {
              // Neural voice: small nudge keeps it natural.
              defPitch = 0.92;
              defRate  = 0.93;
            } else {
              // Basic en-US/fallback female (e.g. Zira): heavier shift for effect.
              defPitch = 0.82;
              defRate  = 0.92;
            }
          }
          if(!preferred) {
            preferred = voices.find(v => /(zira|aria|samantha|google us english)/i.test(v.name))
                     || voices.find(v => /en-us/i.test(v.lang) && /(female|woman)/i.test(v.name))
                     || voices.find(v => /en-us/i.test(v.lang))
                     || voices.find(v => /^en/i.test(v.lang))
                     || voices[0];
          }
          u.pitch = opts.pitch != null ? opts.pitch : defPitch;
          u.rate  = opts.rate  != null ? opts.rate  : defRate;
          u.volume= opts.volume!= null ? opts.volume: 1.0;
          if(preferred) u.voice = preferred;
          speechSynthesis.speak(u);
        } else {
          beep(720, 0.12, 'square', 0.14, 540);
          setTimeout(() => beep(900, 0.15, 'square', 0.14, 720), 100);
        }
      } catch(e){}
    },
    youWin: () => {
      beep(523, 0.13, 'square', 0.18);
      setTimeout(() => beep(659, 0.13, 'square', 0.18), 110);
      setTimeout(() => beep(784, 0.13, 'square', 0.18), 220);
      setTimeout(() => beep(1047, 0.45, 'square', 0.24), 330);
      setTimeout(() => beep(1319, 0.5, 'square', 0.20), 380);
      setTimeout(() => beep(1568, 0.5, 'sawtooth', 0.10, 1568), 380);
    },
    youLose: () => {
      beep(330, 0.25, 'sawtooth', 0.18, 220);
      setTimeout(() => beep(247, 0.30, 'sawtooth', 0.18, 165), 200);
      setTimeout(() => beep(165, 0.50, 'sawtooth', 0.20, 110), 420);
    },
    fallYell: () => {
      if(muted) return;
      try {
        ensure();
        const dur = 1.8;
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        const gain = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 800;
        filt.Q.value = 1.2;
        o1.type = 'sawtooth';
        o1.frequency.setValueAtTime(620, ctx.currentTime);
        o1.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + dur);
        o2.type = 'square';
        o2.frequency.setValueAtTime(310, ctx.currentTime);
        o2.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + dur);
        vibrato.type = 'sine';
        vibrato.frequency.value = 7;
        vibratoGain.gain.value = 25;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(o1.frequency);
        gain.gain.setValueAtTime(0.0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.22, ctx.currentTime + dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o1.connect(filt);
        o2.connect(filt);
        filt.connect(gain).connect(dest());
        o1.start(); o1.stop(ctx.currentTime + dur);
        o2.start(); o2.stop(ctx.currentTime + dur);
        vibrato.start(); vibrato.stop(ctx.currentTime + dur);
      } catch(e){}
    },
  };
})();

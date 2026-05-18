'use strict';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CW = 800, CH = 380;
const GROUND_Y = 300;
const PLAYER_X = 110;
const BASE_SPEED = 11;
const MAX_SPEED = 15;
const GRAVITY = 0.55;
const JUMP_VEL = -13;
const ACID_INTERVAL = 20000;
const ACID_DURATION = 5000;
const ZONE_DURATION = 30000;
const SETTINGS = { animeMode: false, overlayStyle: 'acid' };

// ─── GAME STATE ───────────────────────────────────────────────────────────────
const GS = {
  score: 0, distance: 0, speed: BASE_SPEED,
  alive: false, paused: false,
  lastTime: 0, dt: 0, elapsed: 0,
  zone: 0, zoneTimer: 0,
  acidTimer: 0, acidMode: false, acidCycleTimer: 0,
  hornBar: 0,
  activePower: null, powerTimer: 0,
  frameCount: 0,
  dosaBreak: false, dosaBreakDone: false,
  reset() {
    this.score = 0; this.distance = 0; this.speed = BASE_SPEED;
    this.alive = true; this.paused = false;
    this.lastTime = 0; this.elapsed = 0;
    this.zone = 0; this.zoneTimer = 0;
    this.acidTimer = 0; this.acidMode = false; this.acidCycleTimer = 0;
    this.hornBar = 0; this.activePower = null; this.powerTimer = 0;
    this.frameCount = 0;
    this.dosaBreak = false; this.dosaBreakDone = false;
  }
};

// ─── AUDIO MANAGER ────────────────────────────────────────────────────────────
const Audio = {
  ctx: null, master: null, compressor: null,
  reverb: null, reverbWet: null,
  currentZoneGain: null, seqTimeout: null,
  step: 0, nextNoteTime: 0, stepDur: 0,
  acidActive: false, acidLFO: null, acidDelay: null, acidDelayFeedback: null,
  rainL: null, rainR: null, rainGainL: null, rainGainR: null,

  NOTES: {
    C2:65.41,D2:73.42,E2:82.41,G2:98,A2:110,B2:123.47,
    C3:130.81,D3:146.83,Eb3:155.56,E3:164.81,F3:174.61,Fs3:185,G3:196,Ab3:207.65,A3:220,Bb3:233.08,B3:246.94,
    C4:261.63,Db4:277.18,D4:293.66,Eb4:311.13,E4:329.63,F4:349.23,Fs4:369.99,G4:392,Ab4:415.3,A4:440,Bb4:466.16,B4:493.88,
    C5:523.25,Db5:554.37,D5:587.33,Eb5:622.25,E5:659.25,F5:698.46,Fs5:739.99,G5:783.99,Ab5:830.61,A5:880,Bb5:932.33,B5:987.77,
    C6:1046.5
  },

  ZONES: [
    { bpm:90, wet:0.18,
      melody: { wave:'square', gain:0.45, dur:0.7,
        notes:['E4','G4','A4','B4',null,'A4','G4','E4','D4',null,'E4','G4','A4',null,'G4','E4'] },
      bass:   { wave:'square', gain:0.38, dur:0.85,
        notes:['C3',null,'C3',null,'G3',null,'G3',null,'C3',null,'C3',null,'A3',null,'G3',null] },
      arp:    { wave:'triangle', gain:0.22, dur:0.5,
        notes:['C4','E4','G4','B4','C5','B4','G4','E4','C4','E4','A4','G4','E4','C4','G3','C4'] },
      kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      hihat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0] },

    { bpm:130, wet:0.08,
      melody: { wave:'square', gain:0.55, dur:0.65,
        notes:['C5',null,'Eb5','F5','Fs5',null,'G5',null,'Bb4','G4',null,'F4','Eb4',null,'C5',null] },
      bass:   { wave:'sawtooth', gain:0.45, dur:0.6,
        notes:['C3','C3',null,'Eb3',null,'F3',null,'G3','Bb3',null,'G3','F3',null,'Eb3','C3',null] },
      arp:    { wave:'square', gain:0.2, dur:0.4,
        notes:[null,'G4',null,'Bb4',null,'G4',null,'Bb4',null,'G4',null,'Bb4',null,'G4',null,'Bb4'] },
      kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },

    { bpm:120, wet:0.12,
      melody: { wave:'triangle', gain:0.5, dur:0.65,
        notes:['G4','A4',null,'Bb4','A4','G4','Eb4',null,'F4',null,'G4','A4','C5',null,'Bb4','G4'] },
      bass:   { wave:'square', gain:0.55, dur:0.5,
        notes:['C3',null,'Eb3','F3','G3',null,'F3','Eb3','C3','D3','Eb3',null,'F3','G3',null,'Bb3'] },
      arp:    { wave:'triangle', gain:0.18, dur:0.45,
        notes:['C4','Eb4','G4','Bb4','C4','Eb4','G4','Bb4','C4','Eb4','G4','Bb4','C4','Eb4','G4','Bb4'] },
      kick:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],
      hihat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1] },

    { bpm:140, wet:0.06,
      melody: { wave:'sawtooth', gain:0.45, dur:0.75,
        notes:['C5','C5','Eb5','C5','G4','C5','Bb4','C5','C5','C5','Eb5','G5','F5','Eb5','D5','C5'] },
      bass:   { wave:'square', gain:0.6, dur:0.9,
        notes:['C2','G2','C2','G2','C2','G2','C2','G2','C2','G2','C2','G2','C2','G2','C2','G2'] },
      arp:    { wave:'triangle', gain:0.25, dur:0.5,
        notes:[null,'G4',null,'Bb4',null,'C5',null,'Bb4',null,'G4',null,'Eb4',null,'F4',null,'G4'] },
      kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },

    { bpm:85, wet:0.22,
      melody: { wave:'triangle', gain:0.5, dur:0.85,
        notes:['C4','Db4','Eb4','F4',null,'Eb4','Db4','C4','Ab3',null,'Bb3','C4','Db4',null,'C4','Ab3'] },
      bass:   { wave:'square', gain:0.32, dur:0.9,
        notes:['C3',null,'C3',null,'G3',null,'G3',null,'C3',null,'C3',null,'F3',null,'G3',null] },
      arp:    { wave:'triangle', gain:0.15, dur:0.8,
        notes:['C2',null,null,null,'G2',null,null,null,'C2',null,null,null,'G2',null,null,null] },
      kick:[1,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0],
      hihat:[1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0] }
  ],

  _init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.72;
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24; this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12; this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.master.connect(this.compressor); this.compressor.connect(this.ctx.destination);
    this.reverb = this._mkReverb(2.0, 2.0);
    this.reverbWet = this.ctx.createGain(); this.reverbWet.gain.value = 0.15;
    this.reverb.connect(this.reverbWet); this.reverbWet.connect(this.master);
    this._initRain();
  },

  _resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

  _mkReverb(dur, decay) {
    const len = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, decay);
    }
    const conv = this.ctx.createConvolver(); conv.buffer = buf; return conv;
  },

  _mkNoise(dur) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random()*2-1;
    return buf;
  },

  _note(freq, t, dur, wave, gainVal, wet) {
    if (!freq || !this.ctx) return;
    const hz = typeof freq === 'string' ? this.NOTES[freq] : freq;
    if (!hz) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave; osc.frequency.value = hz;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gainVal, t + 0.005);
    g.gain.setValueAtTime(gainVal, t + dur - 0.01);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g); g.connect(this.master);
    if (wet) { g.connect(this.reverb); }
    osc.start(t); osc.stop(t + dur + 0.02);
  },

  _kick(t) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);
    g.gain.setValueAtTime(0.8, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g); g.connect(this.master); osc.start(t); osc.stop(t + 0.14);
  },

  _hihat(t) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._mkNoise(0.04);
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.04);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t+0.05);
  },

  _snare(t) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._mkNoise(0.1);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.8;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.1);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t+0.12);
  },

  _schedStep(stepIdx, t) {
    const zone = this.ZONES[GS.zone];
    const sd = this.stepDur;
    // melody
    const mn = zone.melody.notes[stepIdx];
    if (mn) this._note(mn, t, sd * zone.melody.dur, zone.melody.wave, zone.melody.gain, true);
    // bass
    const bn = zone.bass.notes[stepIdx];
    if (bn) this._note(bn, t, sd * zone.bass.dur, zone.bass.wave, zone.bass.gain, false);
    // arp
    const an = zone.arp.notes[stepIdx];
    if (an) this._note(an, t, sd * zone.arp.dur, zone.arp.wave, zone.arp.gain, false);
    // perc
    if (zone.kick[stepIdx]) this._kick(t);
    if (zone.hihat[stepIdx]) this._hihat(t);
    if (stepIdx === 4 || stepIdx === 12) this._snare(t);
  },

  _seqLoop() {
    if (!this.ctx || !GS.alive) return;
    const zone = this.ZONES[GS.zone];
    this.stepDur = 60 / zone.bpm / 4;
    const look = 0.1;
    while (this.nextNoteTime < this.ctx.currentTime + look) {
      this._schedStep(this.step, this.nextNoteTime);
      this.step = (this.step + 1) % 16;
      this.nextNoteTime += this.stepDur;
    }
    this.seqTimeout = setTimeout(() => this.acidActive ? this._acidSeqLoop() : this._seqLoop(), 25);
  },

  _acidSeqLoop() {
    if (!this.ctx || !GS.alive) return;
    const zone = this.ZONES[GS.zone];
    const bpmMult = [0.7,1.4,1.8][Math.floor(Math.random()*3)];
    this.stepDur = 60 / (zone.bpm * bpmMult) / 4;
    const look = 0.1;
    while (this.nextNoteTime < this.ctx.currentTime + look) {
      // shuffle melody notes for acid chaos
      const shuffledStep = Math.floor(Math.random() * 16);
      this._schedStep(shuffledStep, this.nextNoteTime);
      this.step = (this.step + 1) % 16;
      this.nextNoteTime += this.stepDur;
    }
    this.seqTimeout = setTimeout(() => this.acidActive ? this._acidSeqLoop() : this._seqLoop(), 25);
  },

  startMusic() {
    if (!this.ctx) return;
    this._resume();
    const zone = this.ZONES[GS.zone];
    this.stepDur = 60 / zone.bpm / 4;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.reverbWet.gain.value = zone.wet;
    clearTimeout(this.seqTimeout);
    this._seqLoop();
  },

  stopMusic() { clearTimeout(this.seqTimeout); },

  changeZone(z) {
    if (!this.ctx) return;
    const zone = this.ZONES[z];
    this.stepDur = 60 / zone.bpm / 4;
    this.reverbWet.gain.linearRampToValueAtTime(zone.wet, this.ctx.currentTime + 2);
  },

  triggerAcid() {
    if (!this.ctx) return;
    this.acidActive = true;
    this.reverbWet.gain.linearRampToValueAtTime(0.9, this.ctx.currentTime + 0.4);
    // warp sound
    this.sfx('acidStart');
  },

  endAcid() {
    if (!this.ctx) return;
    this.acidActive = false;
    this.reverbWet.gain.linearRampToValueAtTime(this.ZONES[GS.zone].wet, this.ctx.currentTime + 0.5);
  },

  _initRain() {
    const buf = this._mkNoise(2);
    ['L','R'].forEach((side, i) => {
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f1 = this.ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1200; f1.Q.value = 0.9;
      const f2 = this.ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 4000;
      const pan = this.ctx.createStereoPanner(); pan.pan.value = i === 0 ? -0.3 : 0.3;
      const g = this.ctx.createGain(); g.gain.value = 0;
      src.connect(f1); f1.connect(f2); f2.connect(pan); pan.connect(g); g.connect(this.master);
      src.start();
      if (side === 'L') { this.rainL = src; this.rainGainL = g; }
      else               { this.rainR = src; this.rainGainR = g; }
    });
  },

  setRain(intensity) {
    if (!this.rainGainL || !this.ctx) return;
    const v = intensity * 0.35;
    const t = this.ctx.currentTime;
    this.rainGainL.gain.linearRampToValueAtTime(v, t + 1.5);
    this.rainGainR.gain.linearRampToValueAtTime(v * 0.9, t + 1.5);
  },

  horn(key) {
    if (!this.ctx) return;
    this._resume();
    const t = this.ctx.currentTime;
    const voices = {
      A: () => { this._note('C3', t, 0.32, 'square', 0.7, false); },
      S: () => { this._note('E3', t, 0.32, 'square', 0.65, false); this._note('E3', t, 0.3, 'sawtooth', 0.25, false); },
      D: () => { this._note('G3', t, 0.28, 'triangle', 0.6, false); },
      F: () => { this._note('A3', t, 0.42, 'square', 0.5, false); this._note('C4', t, 0.42, 'square', 0.4, false); this._note('E4', t, 0.42, 'triangle', 0.35, false); }
    };
    if (voices[key]) voices[key]();
  },

  sfx(name) {
    if (!this.ctx) return;
    this._resume();
    const t = this.ctx.currentTime;
    if (name === 'jump') {
      this._note('C5', t, 0.06, 'square', 0.5, false);
      this._note('E5', t+0.06, 0.05, 'square', 0.4, false);
    } else if (name === 'land') {
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type='sine'; o.frequency.setValueAtTime(80,t); o.frequency.exponentialRampToValueAtTime(20,t+0.05);
      g.gain.setValueAtTime(0.6,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.06);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t+0.07);
    } else if (name === 'brake') {
      const src = this.ctx.createBufferSource(); src.buffer = this._mkNoise(0.2);
      const f = this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.setValueAtTime(3000,t); f.frequency.linearRampToValueAtTime(800,t+0.2); f.Q.value=2;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.5,t); g.gain.linearRampToValueAtTime(0,t+0.2);
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t+0.22);
    } else if (name === 'hit') {
      ['G5','E5','C5','A4'].forEach((n,i) => this._note(n, t+i*0.08, 0.07, 'square', 0.55, false));
    } else if (name === 'power') {
      ['C5','E5','G5'].forEach((n,i) => this._note(n, t+i*0.09, 0.1, 'square', 0.55, false));
      setTimeout(() => { this._note('C5', t+0.28, 0.35, 'triangle', 0.4, true); this._note('G5', t+0.28, 0.35, 'triangle', 0.3, true); }, 10);
    } else if (name === 'zoneChange') {
      ['C5','E5','G5','E5','C6'].forEach((n,i) => this._note(n, t+i*0.1, 0.09, 'triangle', 0.45, true));
    } else if (name === 'acidStart') {
      const o1 = this.ctx.createOscillator(); const o2 = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o1.type='sawtooth'; o1.frequency.setValueAtTime(440,t); o1.frequency.exponentialRampToValueAtTime(880,t+0.3);
      o2.type='square'; o2.frequency.setValueAtTime(440,t); o2.frequency.exponentialRampToValueAtTime(220,t+0.3);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.6,t+0.05); g.gain.linearRampToValueAtTime(0,t+0.6);
      o1.connect(g); o2.connect(g); g.connect(this.reverb); g.connect(this.master);
      o1.start(t); o2.start(t); o1.stop(t+0.65); o2.stop(t+0.65);
    } else if (name === 'gameover') {
      ['G4','F4','Eb4','D4','C4'].forEach((n,i) => this._note(n, t+i*0.22+i*0.05, 0.2+i*0.05, 'square', 0.5-i*0.04, false));
    } else if (name === 'combo') {
      ['C5','E5','G5','C6'].forEach((n,i) => this._note(n, t+i*0.08, 0.08, i<3?'square':'triangle', 0.4+i*0.05, i===3));
    } else if (name === 'buzz') {
      const o1=this.ctx.createOscillator(); const o2=this.ctx.createOscillator(); const g=this.ctx.createGain();
      o1.type='square'; o1.frequency.value=150; o2.type='square'; o2.frequency.value=157;
      g.gain.setValueAtTime(0.3,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.12);
      const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=500;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
      o1.start(t); o2.start(t); o1.stop(t+0.14); o2.stop(t+0.14);
    }
  }
};

// ─── PARTICLE SYSTEM ──────────────────────────────────────────────────────────
const Particles = {
  list: [], rain: [],

  boom(x, y, color='#FFD700', n=14) {
    for (let i=0;i<n;i++) {
      const a = (Math.PI*2/n)*i + Math.random()*0.4;
      const sp = 1.5 + Math.random()*4.5;
      this.list.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-2,
        life:1, decay:0.025+Math.random()*0.02, size:3+Math.random()*5, color });
    }
  },

  sparkle(x, y) {
    for (let i=0;i<8;i++) {
      this.list.push({ x:x+Math.random()*50, y:y+Math.random()*30,
        vx:(Math.random()-0.5)*3, vy:-1-Math.random()*3,
        life:1, decay:0.04, size:2+Math.random()*3, color:'#FFD700' });
    }
  },

  addRain(zone) {
    const heavy = zone===1||zone===2;
    const n = heavy ? 4 : 2;
    for (let i=0;i<n;i++) {
      this.rain.push({ x:Math.random()*CW, y:-5, vy:7+Math.random()*5,
        len:8+Math.random()*10, alpha: heavy ? 0.5 : 0.3 });
    }
  },

  update(dt) {
    for (const p of this.list) {
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life-=p.decay;
    }
    this.list = this.list.filter(p=>p.life>0);
    for (const r of this.rain) r.y += r.vy;
    this.rain = this.rain.filter(r=>r.y<CH+20);
  },

  drawRain(ctx) {
    ctx.lineWidth=1;
    for (const r of this.rain) {
      ctx.strokeStyle=`rgba(180,210,255,${r.alpha})`;
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x-2, r.y+r.len); ctx.stroke();
    }
  },

  drawParticles(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha=p.life;
      ctx.fillStyle=p.color;
      ctx.fillRect(Math.round(p.x-p.size/2), Math.round(p.y-p.size/2), Math.round(p.size), Math.round(p.size));
    }
    ctx.globalAlpha=1;
  }
};

// ─── BACKGROUND SYSTEM ────────────────────────────────────────────────────────
const BG = {
  offsets: [0,0,0], // [far, mid, near]
  fireflies: [],
  birds: [],

  ZONES: [
    { name:'CUBBON PARK', sky0:'#f97316', sky1:'#84cc16', road:'#556655', stripe:'#aaccaa' },
    { name:'MG ROAD',     sky0:'#312e81', sky1:'#4c1d95', road:'#444466', stripe:'#8888cc' },
    { name:'KORAMANGALA', sky0:'#1e1b4b', sky1:'#0f172a', road:'#333344', stripe:'#6666aa' },
    { name:'ELECTRONIC CITY', sky0:'#0c0a1e', sky1:'#0a192f', road:'#223344', stripe:'#4488aa' },
    { name:'YELAHANKA',   sky0:'#9ca3af', sky1:'#6b7280', road:'#7a7a6a', stripe:'#bbbbaa' }
  ],

  ANIME_ZONES: [
    { name:'CUBBON PARK',     sky0:'#ffc8db', sky1:'#c8f0d8', road:'#c8dbb8', stripe:'#f0c0d4' },
    { name:'MG ROAD',         sky0:'#d4b8ff', sky1:'#b8a0ff', road:'#c0b8e8', stripe:'#dcd4f8' },
    { name:'KORAMANGALA',     sky0:'#c0b8f0', sky1:'#a8c0f8', road:'#b0bce8', stripe:'#ccd4f8' },
    { name:'ELECTRONIC CITY', sky0:'#a8dff0', sky1:'#b8f0e8', road:'#b8d0e4', stripe:'#b4e4f8' },
    { name:'YELAHANKA',       sky0:'#ffd4b8', sky1:'#fff0b4', road:'#e8d4b0', stripe:'#f8e8c4' },
  ],

  init() {
    for (let i=0;i<12;i++) this.fireflies.push({ x:Math.random()*CW, y:50+Math.random()*150, phase:Math.random()*Math.PI*2, vx:(Math.random()-0.5)*0.5 });
    for (let i=0;i<6;i++) this.birds.push({ x:Math.random()*CW, y:30+Math.random()*80, vx:0.8+Math.random()*0.6 });
  },

  update(dt) {
    const spd = GS.speed;
    this.offsets[0] = (this.offsets[0] - spd*0.18) % CW;
    this.offsets[1] = (this.offsets[1] - spd*0.45) % CW;
    this.offsets[2] = (this.offsets[2] - spd*0.82) % CW;
    // fireflies
    for (const f of this.fireflies) {
      f.phase += 0.04; f.x -= spd*0.3;
      if (f.x < -10) f.x = CW + Math.random()*100;
    }
    // birds
    for (const b of this.birds) {
      b.x += b.vx; if (b.x > CW+20) b.x = -20;
    }
  },

  draw(ctx) {
    const z = GS.zone;
    const zd = (SETTINGS.animeMode ? this.ANIME_ZONES : this.ZONES)[z];
    // sky
    const grd = ctx.createLinearGradient(0,0,0,GROUND_Y);
    grd.addColorStop(0, zd.sky0); grd.addColorStop(1, zd.sky1);
    ctx.fillStyle=grd; ctx.fillRect(0,0,CW,GROUND_Y);

    // zone-specific far layer
    const off0 = this.offsets[0]; const off1 = this.offsets[1]; const off2 = this.offsets[2];
    if (z===0) this._cubbonFar(ctx, off0);
    else if (z===1) this._mgFar(ctx, off0);
    else if (z===2) this._koraFar(ctx, off0);
    else if (z===3) this._ecFar(ctx, off0);
    else this._yelaFar(ctx, off0);

    // mid layer
    if (z===0) this._cubbonMid(ctx, off1);
    else if (z===1) this._mgMid(ctx, off1);
    else if (z===2) this._koraMid(ctx, off1);
    else if (z===3) this._ecMid(ctx, off1);
    else this._yelaMid(ctx, off1);

    // near layer
    if (z===0) this._cubbonNear(ctx, off2);
    else if (z===1) this._mgNear(ctx, off2);
    else if (z===2) this._koraNear(ctx, off2);
    else if (z===3) this._ecNear(ctx, off2);
    else this._yelaNear(ctx, off2);

    // fireflies in cubbon park
    if (z===0) {
      for (const f of this.fireflies) {
        const glow = (Math.sin(f.phase)+1)/2;
        ctx.globalAlpha = glow*0.8;
        ctx.fillStyle='#ffffaa';
        ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
      }
      ctx.globalAlpha=1;
    }

    // birds in yelahanka
    if (z===4) {
      ctx.fillStyle='#555';
      for (const b of this.birds) {
        ctx.beginPath(); ctx.arc(b.x, b.y, 2, Math.PI*0.1, Math.PI*0.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(b.x+5, b.y, 2, Math.PI*0.1, Math.PI*0.9); ctx.stroke();
      }
    }

    this._drawRoad(ctx, zd);
  },

  _tile(fn, ctx, offset, width) {
    for (let x = (offset%width)-width; x < CW+width; x += width) fn(ctx, x);
  },

  _tree(ctx, x, baseY, _h, col1, col2) {
    // baseY is ground level; tree grows upward
    ctx.fillStyle='#8B5E3C'; ctx.fillRect(x+6,baseY-22,6,22);
    ctx.fillStyle=col1; ctx.fillRect(x,baseY-50,18,20); ctx.fillRect(x+2,baseY-62,14,14); ctx.fillRect(x+4,baseY-72,10,12);
    ctx.fillStyle=col2; ctx.fillRect(x+1,baseY-52,16,18);
  },

  _building(ctx, x, y, w, h, wallColor, winColor, rows, cols) {
    ctx.fillStyle=wallColor; ctx.fillRect(x,y,w,h);
    ctx.fillStyle=winColor;
    const ww=Math.floor((w-8)/(cols+0.5)); const wh=10;
    const gh=Math.floor((h-10)/(rows+0.5));
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) ctx.fillRect(x+4+c*(ww+4),y+6+r*(wh+gh-wh),ww,wh);
  },

  // ── CUBBON PARK ────
  _cubbonFar(ctx, off) {
    this._tile((ctx,x) => {
      this._tree(ctx,x,GROUND_Y,90,'#2d6a27','#3a7a30');
      this._tree(ctx,x+30,GROUND_Y,75,'#3a7a30','#4e9e40');
    }, ctx, off, 60);
    // colonial building peek
    ctx.fillStyle='#c0392b'; ctx.fillRect(((off*1.1)%CW+CW)%CW, GROUND_Y-130, 60, 130);
    ctx.fillStyle='#e74c3c'; ctx.fillRect(((off*1.1)%CW+CW)%CW+5, GROUND_Y-140, 50, 20);
  },
  _cubbonMid(ctx, off) {
    // park benches & lamp posts
    this._tile((ctx,x) => {
      ctx.fillStyle='#8B5E3C'; ctx.fillRect(x+5,GROUND_Y-24,24,4); ctx.fillRect(x+8,GROUND_Y-24,4,8); ctx.fillRect(x+20,GROUND_Y-24,4,8);
      ctx.fillStyle='#888'; ctx.fillRect(x+45,GROUND_Y-55,3,55); // post
      ctx.fillStyle='#ffeb3b'; ctx.fillRect(x+43,GROUND_Y-60,7,6); // lamp
    }, ctx, off, 80);
  },
  _cubbonNear(ctx, off) {
    this._tile((ctx,x) => {
      ctx.fillStyle='#4e9e40'; ctx.fillRect(x,GROUND_Y-18,20,18);
      ctx.fillStyle='#ff6b6b'; ctx.fillRect(x+4,GROUND_Y-22,4,4); // flower
      ctx.fillRect(x+12,GROUND_Y-24,4,4);
    }, ctx, off, 40);
  },

  // ── MG ROAD ────
  _mgFar(ctx, off) {
    this._tile((ctx,x) => {
      this._building(ctx,x,GROUND_Y-180,55,180,'#3d3d5c','#6699ff',6,2);
      this._building(ctx,x+60,GROUND_Y-140,40,140,'#4a3728','#ffcc77',4,2);
    }, ctx, off, 120);
  },
  _mgMid(ctx, off) {
    // metro rail
    this._tile((ctx,x) => {
      ctx.fillStyle='#aaa'; ctx.fillRect(x,GROUND_Y-140,10,140); // pillar
      ctx.fillStyle='#ccc'; ctx.fillRect(x-10,GROUND_Y-155,130,10); // beam
    }, ctx, off, 120);
    // occasional metro train
    const trainX = ((off*0.6)%CW+CW)%CW;
    ctx.fillStyle='#1565c0'; ctx.fillRect(trainX,GROUND_Y-175,90,22);
    ctx.fillStyle='#42a5f5';
    for (let i=0;i<4;i++) ctx.fillRect(trainX+8+i*22,GROUND_Y-172,16,14);
  },
  _mgNear(ctx, off) {
    this._tile((ctx,x) => {
      // neon sign board
      ctx.fillStyle='#1a0a2a'; ctx.fillRect(x,GROUND_Y-80,55,28);
      ctx.strokeStyle='#ff00cc'; ctx.lineWidth=1.5;
      ctx.strokeRect(x+1,GROUND_Y-79,53,26);
      ctx.fillStyle='#ff88ff'; ctx.font='6px monospace';
      ctx.fillText(['GARUDA MALL','CAFÉ COFFEE','TITAN SHOW'][Math.abs(Math.floor(x/55))%3], x+4, GROUND_Y-61);
    }, ctx, off, 65);
  },

  // ── KORAMANGALA ────
  _koraFar(ctx, off) {
    this._tile((ctx,x) => {
      this._building(ctx,x,GROUND_Y-200,50,200,'#1a1a2e','#4488ff',8,2);
      this._building(ctx,x+55,GROUND_Y-160,45,160,'#16213e','#88ccff',6,2);
    }, ctx, off, 110);
  },
  _koraMid(ctx, off) {
    this._tile((ctx,x) => {
      // brewery sign
      ctx.fillStyle='#2d0a4e'; ctx.fillRect(x,GROUND_Y-100,70,35);
      ctx.strokeStyle='#ff00ff'; ctx.lineWidth=2; ctx.strokeRect(x+1,GROUND_Y-99,68,33);
      ctx.fillStyle='#ff88ff'; ctx.font='7px monospace';
      ctx.fillText(['TOIT','ARBOR','7BREWS','BIER CAFE'][Math.abs(Math.floor(x/70))%4], x+6, GROUND_Y-79);
      // little window with people
      ctx.fillStyle='#ffcc88'; ctx.fillRect(x+52,GROUND_Y-95,14,20);
      ctx.fillStyle='rgba(255,200,100,0.5)'; ctx.fillRect(x+52,GROUND_Y-95,14,20);
    }, ctx, off, 90);
  },
  _koraNear(ctx, off) {
    this._tile((ctx,x) => {
      // food delivery bike
      ctx.fillStyle='#ff6b00'; ctx.fillRect(x+2,GROUND_Y-22,12,12);
      ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(x+4,GROUND_Y-4,4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+14,GROUND_Y-4,4,0,Math.PI*2); ctx.fill();
    }, ctx, off, 70);
  },

  // ── ELECTRONIC CITY ────
  _ecFar(ctx, off) {
    this._tile((ctx,x) => {
      this._building(ctx,x,GROUND_Y-230,70,230,'#0a1628','#00aaff',9,3);
      ctx.fillStyle='#fff'; ctx.font='6px monospace';
      ctx.fillText(['INF0SYS','W1PR0','T-C-S','WIPFR0'][Math.abs(Math.floor(x/80))%4], x+4, GROUND_Y-235);
    }, ctx, off, 80);
  },
  _ecMid(ctx, off) {
    // flyover
    this._tile((ctx,x) => {
      ctx.fillStyle='#888'; ctx.fillRect(x,GROUND_Y-90,8,90);
      ctx.fillRect(x+50,GROUND_Y-90,8,90);
      ctx.fillStyle='#aaa'; ctx.fillRect(x-5,GROUND_Y-100,70,12);
    }, ctx, off, 58);
  },
  _ecNear(ctx, off) {
    this._tile((ctx,x) => {
      ctx.fillStyle='#1a3a5c'; ctx.fillRect(x,GROUND_Y-35,50,35);
      ctx.fillStyle='#0099ff'; ctx.font='6px monospace'; ctx.fillText('CAMPUS', x+4, GROUND_Y-18);
      ctx.fillStyle='#333'; ctx.fillRect(x+55,GROUND_Y-45,8,45);
    }, ctx, off, 75);
  },

  // ── YELAHANKA ────
  _yelaFar(ctx, off) {
    this._tile((ctx,x) => {
      // open fields
      ctx.fillStyle='#5a7a4a'; ctx.fillRect(x,GROUND_Y-60,60,60);
      ctx.fillStyle='#6a8a5a'; ctx.fillRect(x+5,GROUND_Y-50,8,50);
      // distant building
      this._building(ctx,x+30,GROUND_Y-90,25,90,'#777','#fff',3,1);
    }, ctx, off, 75);
  },
  _yelaMid(ctx, off) {
    this._tile((ctx,x) => {
      // kirana shop
      ctx.fillStyle='#a07850'; ctx.fillRect(x,GROUND_Y-55,45,55);
      ctx.fillStyle='#ff8800'; ctx.fillRect(x,GROUND_Y-68,45,15);
      ctx.fillStyle='#fff'; ctx.font='5px monospace'; ctx.fillText('KIRANA', x+4, GROUND_Y-57);
      ctx.fillStyle='#88ccff'; ctx.fillRect(x+8,GROUND_Y-45,12,16); // door
    }, ctx, off, 65);
  },
  _yelaNear(ctx, off) {
    this._tile((ctx,x) => {
      ctx.fillStyle='#7a8a5a'; ctx.fillRect(x,GROUND_Y-12,20,12);
      ctx.fillStyle='#5a7a4a'; ctx.fillRect(x+5,GROUND_Y-18,10,8);
    }, ctx, off, 35);
  },

  _drawRoad(ctx, zd) {
    ctx.fillStyle=zd.road; ctx.fillRect(0,GROUND_Y,CW,CH-GROUND_Y);
    ctx.fillStyle='#555'; ctx.fillRect(0,GROUND_Y,CW,5); // edge
    // lane dashes
    const dashOff = -(GS.distance % 50);
    ctx.fillStyle=zd.stripe;
    for (let x=dashOff; x<CW; x+=50) ctx.fillRect(x, GROUND_Y+28, 30, 4);
    // sidewalk
    ctx.fillStyle='#888'; ctx.fillRect(0,GROUND_Y+70,CW,8);
  }
};

// ─── BOLLYWOOD NPC SPRITES ─────────────────────────────────────────────────────
const NPC = {
  // Salman Khan style police — buff arms, aviators, hand raised
  drawPolice(ctx, x, y) {
    // boots
    ctx.fillStyle='#222'; ctx.fillRect(x+8,y+50,10,8); ctx.fillRect(x+22,y+50,10,8);
    // pants khaki
    ctx.fillStyle='#8B8B5A'; ctx.fillRect(x+7,y+28,26,24);
    // shirt khaki tight
    ctx.fillStyle='#9B9B6A'; ctx.fillRect(x+5,y+14,30,16);
    // BUFF ARMS
    ctx.fillStyle='#C8956C'; ctx.fillRect(x-4,y+14,12,18); // left arm
    ctx.fillRect(x+32,y+14,12,18); // right arm raised
    ctx.fillRect(x+32,y+8,10,10); // right forearm up (STOP gesture)
    // cap
    ctx.fillStyle='#556B2F'; ctx.fillRect(x+4,y+2,32,8);
    ctx.fillRect(x+2,y+8,36,5); // cap brim
    // face
    ctx.fillStyle='#C8956C'; ctx.fillRect(x+8,y+6,24,18);
    // aviator sunglasses
    ctx.fillStyle='#111'; ctx.fillRect(x+9,y+10,10,6); ctx.fillRect(x+21,y+10,10,6);
    ctx.fillStyle='#888'; ctx.fillRect(x+19,y+12,2,2); // bridge
    // mustache (very prominent Sallu style)
    ctx.fillStyle='#111'; ctx.fillRect(x+12,y+21,16,4); // thick moustache
    ctx.fillRect(x+10,y+21,4,3); // left curl
    ctx.fillRect(x+26,y+21,4,3); // right curl
    // badge
    ctx.fillStyle='#FFD700'; ctx.fillRect(x+11,y+16,6,4);
  },

  // Shah Rukh Khan pedestrian — arms wide open, dramatic
  drawPedestrian(ctx, x, y) {
    // shoes
    ctx.fillStyle='#222'; ctx.fillRect(x+4,y+52,10,6); ctx.fillRect(x+22,y+52,10,6);
    // pants
    ctx.fillStyle='#2c3e50'; ctx.fillRect(x+5,y+28,26,26);
    // shirt open/jacket
    ctx.fillStyle='#c0392b'; ctx.fillRect(x+4,y+12,28,18);
    ctx.fillStyle='#111'; ctx.fillRect(x+4,y+12,5,18); // left lapel
    ctx.fillRect(x+27,y+12,5,18); // right lapel
    // ARMS WIDE OPEN (SRK signature)
    ctx.fillStyle='#c0392b'; ctx.fillRect(x-12,y+14,14,5); // left arm
    ctx.fillRect(x+34,y+14,14,5); // right arm
    // face
    ctx.fillStyle='#C8956C'; ctx.fillRect(x+8,y+2,20,22);
    // hair
    ctx.fillStyle='#111'; ctx.fillRect(x+7,y+1,22,8);
    // dimple smile
    ctx.fillStyle='#A0714F'; ctx.fillRect(x+10,y+18,5,2); ctx.fillRect(x+21,y+18,5,2);
    ctx.fillRect(x+13,y+21,10,2);
    // eyebrows
    ctx.fillStyle='#111'; ctx.fillRect(x+9,y+8,6,2); ctx.fillRect(x+21,y+8,6,2);
  },

  // Rajinikanth drunkard — sunglasses tilted, cigarette, hip stance
  drawDrunkard(ctx, x, y) {
    // feet stumbling
    ctx.fillStyle='#222'; ctx.fillRect(x+3,y+53,12,6); ctx.fillRect(x+20,y+55,12,5);
    // lungi / dhoti
    ctx.fillStyle='#8B1A1A';
    ctx.fillRect(x+5,y+28,26,27);
    ctx.fillStyle='#CC2200'; // lungi pattern check
    for (let i=0;i<3;i++) ctx.fillRect(x+8+i*8,y+30,3,24);
    // shirt unbuttoned
    ctx.fillStyle='#F4A460'; ctx.fillRect(x+4,y+12,28,18);
    ctx.fillStyle='#C8956C'; ctx.fillRect(x+15,y+12,6,18); // chest showing
    // arms — one on hip, one with bottle
    ctx.fillStyle='#C8956C'; ctx.fillRect(x-2,y+14,8,16); // hip arm
    ctx.fillRect(x+32,y+12,8,20); // bottle arm
    // bottle
    ctx.fillStyle='#228B22'; ctx.fillRect(x+38,y+4,6,18);
    ctx.fillStyle='#aaa'; ctx.fillRect(x+39,y+3,4,4); // cap
    // face
    ctx.fillStyle='#8B5E3C'; ctx.fillRect(x+6,y+2,24,22);
    // tilted shades (classic Rajini)
    ctx.save(); ctx.translate(x+18,y+10); ctx.rotate(0.2);
    ctx.fillStyle='#111'; ctx.fillRect(-12,0,10,5); ctx.fillRect(2,0,10,5);
    ctx.restore();
    // HUGE MUSTACHE
    ctx.fillStyle='#111'; ctx.fillRect(x+8,y+18,20,5);
    ctx.fillRect(x+6,y+17,4,4); ctx.fillRect(x+26,y+17,4,4); // curled ends
    // cigarette behind ear
    ctx.fillStyle='#fff'; ctx.fillRect(x+28,y+6,6,2);
    ctx.fillStyle='#ff6600'; ctx.fillRect(x+28,y+5,2,3); // lit end
  },

  // Ranveer Singh IT professional — wild colorful outfit
  drawITPro(ctx, x, y) {
    // shoes
    ctx.fillStyle='#FFD700'; ctx.fillRect(x+3,y+52,12,7); ctx.fillRect(x+21,y+52,12,7);
    // pants bright
    ctx.fillStyle='#9b59b6'; ctx.fillRect(x+4,y+26,28,28);
    // jacket VERY colorful
    ctx.fillStyle='#e74c3c'; ctx.fillRect(x+2,y+8,32,20);
    ctx.fillStyle='#f1c40f'; ctx.fillRect(x+2,y+8,10,20); // left panel
    ctx.fillStyle='#2ecc71'; ctx.fillRect(x+24,y+8,10,20); // right panel
    // laptop bag
    ctx.fillStyle='#888'; ctx.fillRect(x-8,y+16,8,16);
    // arms
    ctx.fillStyle='#C8956C'; ctx.fillRect(x-6,y+10,10,16); ctx.fillRect(x+32,y+10,10,16);
    // face
    ctx.fillStyle='#C8956C'; ctx.fillRect(x+7,y,22,22);
    // crazy hair
    ctx.fillStyle='#FFD700'; ctx.fillRect(x+6,y-4,24,10);
    ctx.fillRect(x+4,y-2,4,8); ctx.fillRect(x+28,y-2,4,8); // side puffs
    // beard (Ranveer's thick beard)
    ctx.fillStyle='#111'; ctx.fillRect(x+7,y+14,22,8);
    // eyes
    ctx.fillStyle='#fff'; ctx.fillRect(x+9,y+4,6,5); ctx.fillRect(x+21,y+4,6,5);
    ctx.fillStyle='#111'; ctx.fillRect(x+11,y+5,3,3); ctx.fillRect(x+23,y+5,3,3);
  },

  // Deepika Padukone shopper — saree, shopping bags
  drawShopper(ctx, x, y) {
    // saree bottom
    ctx.fillStyle='#FF69B4'; ctx.fillRect(x+4,y+22,28,36);
    ctx.fillStyle='#FF1493'; // saree border pattern
    for (let i=0;i<4;i++) ctx.fillRect(x+4,y+22+i*9,28,3);
    // blouse
    ctx.fillStyle='#cc0044'; ctx.fillRect(x+6,y+10,24,14);
    // dupatta/pallu
    ctx.fillStyle='#FFB6C1'; ctx.fillRect(x+4,y+8,30,16);
    // arms with shopping bags
    ctx.fillStyle='#E8B99A'; ctx.fillRect(x-2,y+12,10,16); ctx.fillRect(x+28,y+12,10,16);
    // shopping bags
    ctx.fillStyle='#FFD700'; ctx.fillRect(x-8,y+22,10,14);
    ctx.fillStyle='#ff6600'; ctx.fillRect(x+34,y+22,10,14);
    ctx.fillStyle='#111'; ctx.fillRect(x-4,y+20,2,4); ctx.fillRect(x+36,y+20,2,4);
    // face
    ctx.fillStyle='#E8B99A'; ctx.fillRect(x+7,y,22,22);
    // long hair
    ctx.fillStyle='#111'; ctx.fillRect(x+6,y,24,10);
    ctx.fillRect(x+6,y+10,4,30); // left side flowing
    // bindi
    ctx.fillStyle='#ff0000'; ctx.beginPath(); ctx.arc(x+18,y+6,2,0,Math.PI*2); ctx.fill();
    // smile
    ctx.fillStyle='#cc6688'; ctx.fillRect(x+10,y+16,12,3);
  },

  // BBMP truck — Akshay Kumar style worker
  drawBBMP(ctx, x, y) {
    // the truck body
    ctx.fillStyle='#2d6a27'; ctx.fillRect(x,y+10,80,42);
    ctx.fillStyle='#1e5218'; ctx.fillRect(x,y+10,20,42); // cab
    ctx.fillStyle='#88DDAA'; ctx.fillRect(x+2,y+14,14,12); // windshield
    ctx.fillStyle='#111'; // wheels
    for (const wx of [x+8, x+60]) { ctx.beginPath(); ctx.arc(wx,y+52,10,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#888'; ctx.beginPath(); ctx.arc(wx,y+52,5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#111'; }
    // BBMP text
    ctx.fillStyle='#FFD700'; ctx.font='bold 8px monospace'; ctx.fillText('BBMP', x+26, y+35);
    // garbage pile in back
    ctx.fillStyle='#556B2F'; ctx.fillRect(x+22,y,60,12);
    ctx.fillStyle='#6B8E23'; ctx.fillRect(x+24,y-4,56,6);
    // worker Akshay type on running board
    ctx.fillStyle='#C8956C'; ctx.fillRect(x+16,y+18,8,22); // body
    ctx.beginPath(); ctx.arc(x+20,y+15,6,0,Math.PI*2); ctx.fill(); // head
    ctx.fillStyle='#ff9900'; ctx.fillRect(x+14,y+12,12,5); // bandana
    ctx.fillStyle='#111'; ctx.fillRect(x+16,y+18,4,10); ctx.fillRect(x+20,y+18,4,10); // pants
    // patriotic flag on truck
    ctx.fillStyle='#ff9933'; ctx.fillRect(x+78,y,4,5);
    ctx.fillStyle='#fff'; ctx.fillRect(x+78,y+5,4,5);
    ctx.fillStyle='#138808'; ctx.fillRect(x+78,y+10,4,5);
  },

  // IT shuttle bus — big grey bus with parody logo
  drawITBus(ctx, x, y) {
    ctx.fillStyle='#dde'; ctx.fillRect(x,y,110,50);
    ctx.fillStyle='#bbc'; ctx.fillRect(x,y,18,50); // front
    ctx.fillStyle='#aab'; ctx.fillRect(x+18,y,92,10); // roof stripe
    // windows
    ctx.fillStyle='#88aacc';
    for (let i=0;i<5;i++) ctx.fillRect(x+22+i*18,y+14,14,16);
    // company logo
    ctx.fillStyle='#0055aa'; ctx.fillRect(x+28,y+2,55,10);
    ctx.fillStyle='#fff'; ctx.font='6px monospace';
    const logos=['AMAZONIA','GOOGLEXITY','INFOSYS++','WIPFRO 2.0'];
    ctx.fillText(logos[Math.floor(x/10)%logos.length], x+30, y+10);
    // wheels
    ctx.fillStyle='#111';
    for (const wx of [x+14, x+85]) { ctx.beginPath(); ctx.arc(wx,y+52,10,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#888'; ctx.beginPath(); ctx.arc(wx,y+52,5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#111'; }
    // windshield
    ctx.fillStyle='#88aacc'; ctx.fillRect(x+2,y+8,13,20);
    // driver bored face
    ctx.fillStyle='#C8956C'; ctx.fillRect(x+4,y+10,10,12);
  },

  // FLOOD WALL
  drawFlood(ctx, x, y) {
    // base wave
    ctx.fillStyle='#1565c0';
    ctx.fillRect(x,0,65,CH);
    ctx.fillStyle='#1976d2'; ctx.fillRect(x+5,0,20,CH);
    // foam top
    ctx.fillStyle='rgba(255,255,255,0.7)';
    for (let wy=0; wy<CH; wy+=30) {
      ctx.beginPath(); ctx.arc(x+10,wy,8,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+30,wy+15,6,0,Math.PI*2); ctx.fill();
    }
  },

  // POTHOLE
  drawPothole(ctx, x, y) {
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.ellipse(x+20,y+10,20,10,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a1a1a'; ctx.beginPath(); ctx.ellipse(x+20,y+10,14,7,0,0,Math.PI*2); ctx.fill();
    // cracks
    ctx.strokeStyle='#333'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x+20,y+3); ctx.lineTo(x+8,y-5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+20,y+3); ctx.lineTo(x+32,y-3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+6,y+10); ctx.lineTo(x-2,y+14); ctx.stroke();
  },

  // GARBAGE PILE
  drawGarbage(ctx, x, y) {
    ctx.fillStyle='#4a3728'; ctx.fillRect(x+2,y+15,44,20);
    ctx.fillStyle='#556B2F'; ctx.fillRect(x+6,y+8,36,18);
    ctx.fillStyle='#8B4513'; ctx.fillRect(x+10,y+4,12,10);
    ctx.fillStyle='#228B22'; ctx.fillRect(x+22,y+2,10,12);
    // flies
    ctx.fillStyle='#111';
    for (let i=0;i<3;i++) {
      const fx=x+10+i*14, fy=y+2+(GS.frameCount*2+i*30)%12;
      ctx.fillRect(fx,fy,2,2); ctx.fillRect(fx+4,fy-2,2,2);
    }
  },

  // SLEEPING DOG
  drawDog(ctx, x, y) {
    // curled body
    ctx.fillStyle='#C8956C'; ctx.beginPath(); ctx.ellipse(x+22,y+16,22,12,0.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#B8825C'; ctx.beginPath(); ctx.ellipse(x+22,y+15,16,8,0.2,0,Math.PI*2); ctx.fill();
    // head
    ctx.fillStyle='#C8956C'; ctx.beginPath(); ctx.arc(x+38,y+8,9,0,Math.PI*2); ctx.fill();
    // ear
    ctx.fillStyle='#A0714F'; ctx.fillRect(x+43,y+2,7,8);
    // nose
    ctx.fillStyle='#111'; ctx.fillRect(x+44,y+9,5,3);
    // Zzz
    ctx.fillStyle='#aaa'; ctx.font='8px monospace'; ctx.fillText('Zzz',x+46,y);
  },

  // COW (sacred, flowers around neck)
  drawCow(ctx, x, y) {
    // body
    ctx.fillStyle='#f5f5f0'; ctx.fillRect(x+5,y+8,45,38);
    ctx.fillStyle='#888'; ctx.fillRect(x+20,y+14,8,8); // black patch
    ctx.fillRect(x+35,y+20,6,6);
    // legs
    ctx.fillStyle='#ddd'; ctx.fillRect(x+8,y+42,8,16); ctx.fillRect(x+20,y+42,8,16); ctx.fillRect(x+30,y+42,8,16); ctx.fillRect(x+42,y+42,8,16);
    // head
    ctx.fillStyle='#f5f5f0'; ctx.fillRect(x+2,y,26,22);
    // horns
    ctx.fillStyle='#e8c85a';
    ctx.fillRect(x+4,y-8,5,10); ctx.fillRect(x+18,y-8,5,10);
    // nose ring
    ctx.strokeStyle='#FFD700'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x+14,y+16,5,0,Math.PI*2); ctx.stroke();
    // eyes
    ctx.fillStyle='#111'; ctx.fillRect(x+5,y+6,5,4); ctx.fillRect(x+18,y+6,5,4);
    // flower garland
    const colors=['#ff6b6b','#ffd700','#ff69b4','#98fb98'];
    for (let i=0;i<8;i++) {
      ctx.fillStyle=colors[i%4]; ctx.beginPath(); ctx.arc(x+8+i*5,y+24,3,0,Math.PI*2); ctx.fill();
    }
    // tail
    ctx.fillStyle='#ddd'; ctx.fillRect(x+50,y+10,4,22);
    ctx.fillRect(x+48,y+30,8,6);
  },

  // TRAFFIC CONE — small orange hazard cone
  drawTrafficCone(ctx, x, y) {
    ctx.fillStyle='#FF6600';
    ctx.beginPath(); ctx.moveTo(x+9,y); ctx.lineTo(x+18,y+22); ctx.lineTo(x,y+22); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff'; ctx.fillRect(x+3,y+8,12,4);
    ctx.fillStyle='#333'; ctx.fillRect(x-2,y+22,22,4);
  },

  // SPEED BUMP — painted yellow hump across road
  drawSpeedBump(ctx, x, y) {
    ctx.fillStyle='#555';
    ctx.beginPath(); ctx.ellipse(x+31,y+12,30,8,0,Math.PI,0,true); ctx.fill();
    ctx.fillStyle='#FFD700';
    for (let i=0;i<4;i++) ctx.fillRect(x+8+i*13,y+6,8,6);
    ctx.fillStyle='#fff'; ctx.font='7px monospace'; ctx.fillText('SLOW',x+18,y+10);
  },

  // HAWKER CART — masala dosa street vendor blocking road
  drawHawker(ctx, x, y) {
    // cart body
    ctx.fillStyle='#8B4513'; ctx.fillRect(x+2,y+30,50,24);
    // tray / counter top
    ctx.fillStyle='#FFD700'; ctx.fillRect(x,y+24,54,8);
    // food items
    ctx.fillStyle='#D2691E'; ctx.fillRect(x+6,y+16,12,10);
    ctx.fillStyle='#ff2200'; ctx.fillRect(x+20,y+18,8,8);
    ctx.fillStyle='#90EE90'; ctx.fillRect(x+30,y+17,8,8);
    ctx.fillStyle='#ffe066'; ctx.fillRect(x+40,y+18,8,8);
    // wheels
    ctx.fillStyle='#111';
    ctx.beginPath(); ctx.arc(x+12,y+54,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#555'; ctx.beginPath(); ctx.arc(x+12,y+54,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(x+40,y+54,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#555'; ctx.beginPath(); ctx.arc(x+40,y+54,4,0,Math.PI*2); ctx.fill();
    // hawker person
    ctx.fillStyle='#C8956C'; ctx.fillRect(x+20,y+4,14,22);
    ctx.beginPath(); ctx.fillStyle='#C8956C'; ctx.arc(x+27,y+2,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.fillRect(x+18,y+8,18,10); // dhoti/apron
    ctx.fillStyle='#111'; ctx.fillRect(x+18,y+22,6,10); ctx.fillRect(x+26,y+22,6,10);
    // sign board
    ctx.fillStyle='#fffacd'; ctx.fillRect(x+2,y,22,12);
    ctx.fillStyle='#333'; ctx.font='5px monospace'; ctx.fillText('MASALA',x+3,y+8);
  },

  // MONKEY — mischievous monkey sitting on road
  drawMonkey(ctx, x, y) {
    // body
    ctx.fillStyle='#C8956C'; ctx.fillRect(x+10,y+14,18,16);
    // tail curling up
    ctx.strokeStyle='#A0714F'; ctx.lineWidth=4; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(x+28,y+20); ctx.quadraticCurveTo(x+40,y+8,x+36,y+28); ctx.stroke();
    ctx.lineWidth=1;
    // head
    ctx.fillStyle='#C8956C'; ctx.beginPath(); ctx.arc(x+18,y+9,9,0,Math.PI*2); ctx.fill();
    // face
    ctx.fillStyle='#E8B99A'; ctx.beginPath(); ctx.ellipse(x+18,y+11,6,5,0,0,Math.PI*2); ctx.fill();
    // eyes
    ctx.fillStyle='#111'; ctx.fillRect(x+13,y+7,3,3); ctx.fillRect(x+20,y+7,3,3);
    // ears
    ctx.fillStyle='#C8956C'; ctx.beginPath(); ctx.arc(x+9,y+9,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+27,y+9,4,0,Math.PI*2); ctx.fill();
    // banana in hand
    ctx.fillStyle='#FFD700';
    ctx.beginPath(); ctx.moveTo(x+2,y+18); ctx.quadraticCurveTo(x+6,y+10,x+10,y+18); ctx.stroke();
    ctx.fillStyle='#FFD700'; ctx.fillRect(x+2,y+16,8,4);
  }
};

// ─── PLAYER (AUTO RICKSHAW + RAJAPPA THE DRIVER) ──────────────────────────────
const Player = {
  x: PLAYER_X, y: GROUND_Y-42,
  vy: 0, width: 55, height: 42,
  grounded: true, jumping: false, braking: false,
  invincible: false, invTimer: 0,
  wheelRot: 0, bobFrame: 0, bobTimer: 0,
  exhaust: [],

  update(dt) {
    this.bobTimer += dt;
    if (this.bobTimer > 200) { this.bobFrame ^= 1; this.bobTimer = 0; }

    if (!this.grounded) {
      this.vy += GRAVITY * (dt / 16);
      this.y += this.vy * (dt / 16);
    }
    if (this.y >= GROUND_Y - this.height) {
      if (!this.grounded) Audio.sfx('land');
      this.y = GROUND_Y - this.height;
      this.vy = 0; this.grounded = true; this.jumping = false;
    }

    this.wheelRot += GS.speed * 0.12;
    if (GS.activePower) { this.invincible = true; }
    else { this.invincible = false; }

    // exhaust puffs
    if (GS.frameCount % 4 === 0) {
      this.exhaust.push({ x:this.x-4, y:this.y+30, life:1, vx:-1.2, vy:-0.4+Math.random()*0.8 });
    }
    for (const e of this.exhaust) {
      e.x+=e.vx; e.y+=e.vy; e.life-=0.05;
    }
    this.exhaust = this.exhaust.filter(e=>e.life>0);
  },

  jump() {
    if (this.grounded) {
      this.vy = JUMP_VEL; this.grounded = false; this.jumping = true;
      Audio.sfx('jump');
      Horn.addCharge(0.25);
    }
  },

  draw(ctx) {
    const x = Math.round(this.x);
    const bob = (this.grounded && this.bobFrame) ? 1 : 0;
    const y = Math.round(this.y) + bob;
    const lean = this.braking ? 2 : (this.jumping ? -1 : 0);

    // exhaust
    for (const e of this.exhaust) {
      ctx.globalAlpha = e.life * 0.5;
      ctx.fillStyle='#aaa';
      ctx.fillRect(Math.round(e.x),Math.round(e.y),4,4);
    }
    ctx.globalAlpha=1;

    // invincible glow
    if (this.invincible) {
      const powerColors = { turbo_boost:'#ff8800', ghost_mode:'#00ffff', monsoon_shield:'#4488ff', traffic_melt:'#ff4444' };
      ctx.strokeStyle = powerColors[GS.activePower] || '#fff';
      ctx.lineWidth = 3;
      ctx.strokeRect(x-3, y-3, 62, 50);
    }

    // ── BODY ──
    // main black frame
    ctx.fillStyle='#1A1A1A'; ctx.fillRect(x+2, y+8+lean, 51, 30);

    // yellow canopy
    ctx.fillStyle='#FFD700'; ctx.fillRect(x+5, y+lean, 42, 12);
    ctx.fillStyle='#FFC200'; ctx.fillRect(x+3, y+6+lean, 46, 8);
    ctx.fillStyle='#111'; ctx.fillRect(x+4, y+1+lean, 40, 3); // black stripe on roof

    // yellow side panels
    ctx.fillStyle='#FFD700'; ctx.fillRect(x+3, y+10+lean, 9, 22);
    ctx.fillStyle='#FFC200'; ctx.fillRect(x+43, y+10+lean, 9, 22);

    // windshield/opening (passenger side)
    ctx.fillStyle='#88DDAA'; ctx.fillRect(x+14, y+12+lean, 26, 14);
    // window bars
    ctx.fillStyle='#111'; ctx.fillRect(x+22, y+12+lean, 2, 14); ctx.fillRect(x+30, y+12+lean, 2, 14);

    // ── RAJAPPA THE DRIVER ──
    // body/torso
    ctx.fillStyle='#e67e22'; ctx.fillRect(x+36, y+9+lean, 12, 17); // shirt

    // LUNGI — checked pattern
    ctx.fillStyle='#8B1A1A'; ctx.fillRect(x+35, y+24+lean, 14, 12);
    ctx.fillStyle='#CC2200';
    ctx.fillRect(x+37,y+24+lean,3,12); ctx.fillRect(x+42,y+24+lean,3,12);
    ctx.fillRect(x+35,y+27+lean,14,3); ctx.fillRect(x+35,y+32+lean,14,3);

    // arm on steering
    ctx.fillStyle='#C8956C'; ctx.fillRect(x+34, y+14+lean, 8, 12);
    ctx.fillRect(x+28, y+20+lean, 8, 5); // forearm

    // head
    ctx.fillStyle='#8B5E3C'; ctx.beginPath(); ctx.arc(x+43, y+6+lean, 7, 0, Math.PI*2); ctx.fill();
    // hair (slightly ruffled)
    ctx.fillStyle='#111'; ctx.fillRect(x+36, y+1+lean, 14, 6);
    ctx.fillRect(x+37, y-1+lean, 4, 4); // tuft

    // INDIAN MUSTACHE — thick, curled at ends
    ctx.fillStyle='#111';
    ctx.fillRect(x+38, y+9+lean, 11, 4); // thick bar
    ctx.beginPath(); // left curl
    ctx.arc(x+38, y+11+lean, 3, Math.PI*0.5, Math.PI*1.8); ctx.fill();
    ctx.beginPath(); // right curl
    ctx.arc(x+49, y+11+lean, 3, -Math.PI*0.2, Math.PI*0.5); ctx.fill();

    // sly/cunning eyes
    ctx.fillStyle='#fff'; ctx.fillRect(x+38, y+4+lean, 5, 4); ctx.fillRect(x+45, y+4+lean, 5, 4);
    ctx.fillStyle='#111'; ctx.fillRect(x+40, y+5+lean, 2, 3); ctx.fillRect(x+47, y+5+lean, 2, 3);
    // cunning eyebrow raise on left
    ctx.fillStyle='#111'; ctx.fillRect(x+38, y+3+lean, 5, 2); ctx.fillRect(x+45, y+2+lean, 5, 2);
    // smirk
    ctx.fillStyle='#7a3f1a'; ctx.fillRect(x+40, y+13+lean, 6, 2); ctx.fillRect(x+45, y+14+lean, 3, 2);

    // meter box
    ctx.fillStyle='#333'; ctx.fillRect(x+28, y+13+lean, 7, 8);
    ctx.fillStyle='#00FF44'; ctx.fillRect(x+29, y+14+lean, 5, 4);

    // ── WHEELS ──
    this._wheel(ctx, x+10, y+40);
    this._wheel(ctx, x+40, y+40);

    // front headlight
    ctx.fillStyle='#FFFFF0'; ctx.fillRect(x+51, y+12+lean, 5, 6);
    // rear taillight
    ctx.fillStyle='#ff3300'; ctx.fillRect(x, y+12+lean, 3, 5);
  },

  _wheel(ctx, cx, cy) {
    ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#555'; ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#888'; ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(this.wheelRot)*3, cy+Math.sin(this.wheelRot)*3);
    ctx.lineTo(cx+Math.cos(this.wheelRot)*8, cy+Math.sin(this.wheelRot)*8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(this.wheelRot+Math.PI)*3, cy+Math.sin(this.wheelRot+Math.PI)*3);
    ctx.lineTo(cx+Math.cos(this.wheelRot+Math.PI)*8, cy+Math.sin(this.wheelRot+Math.PI)*8);
    ctx.stroke();
  }
};

// ─── OBSTACLE POOL ────────────────────────────────────────────────────────────
const Obstacles = {
  list: [],
  spawnTimer: 0,
  spawnInterval: 1800,
  lastAction: null,

  TYPES: {
    pothole:    { action:'jump',  w:42,  h:18, drawFn:'drawPothole',   yOff:0 },
    garbage:    { action:'jump',  w:48,  h:34, drawFn:'drawGarbage',   yOff:0 },
    dog:        { action:'jump',  w:48,  h:26, drawFn:'drawDog',       yOff:0 },
    pedestrian: { action:'brake', w:36,  h:58, drawFn:'drawPedestrian',yOff:-18 },
    police:     { action:'brake', w:40,  h:58, drawFn:'drawPolice',    yOff:-18 },
    drunkard:   { action:'brake', w:42,  h:58, drawFn:'drawDrunkard',  yOff:-18 },
    shopper:    { action:'brake', w:36,  h:58, drawFn:'drawShopper',   yOff:-18 },
    bbmp:       { action:'brake', w:82,  h:52, drawFn:'drawBBMP',      yOff:-12 },
    itpro:      { action:'brake', w:38,  h:58, drawFn:'drawITPro',     yOff:-18 },
    it_bus:       { action:'super', w:112, h:52, drawFn:'drawITBus',       yOff:-12 },
    flood:        { action:'super', w:66,  h:CH, drawFn:'drawFlood',       yOff:0, fullH:true },
    traffic_cone: { action:'jump',  w:18,  h:24, drawFn:'drawTrafficCone', yOff:0 },
    speed_bump:   { action:'jump',  w:62,  h:12, drawFn:'drawSpeedBump',   yOff:0 },
    hawker:       { action:'brake', w:54,  h:62, drawFn:'drawHawker',      yOff:-20 },
    monkey:       { action:'jump',  w:40,  h:32, drawFn:'drawMonkey',      yOff:0 },
  },

  ZONE_W: [
    { pothole:3, dog:3, garbage:2, police:2, drunkard:1, pedestrian:1, traffic_cone:3, monkey:2, it_bus:0 },
    { pothole:2, pedestrian:3, police:3, drunkard:1, shopper:2, traffic_cone:3, speed_bump:2, hawker:2, it_bus:1, flood:0.5 },
    { garbage:2, drunkard:3, dog:2, shopper:2, itpro:2, bbmp:1, hawker:3, monkey:2, speed_bump:2, it_bus:0.8 },
    { it_bus:4, bbmp:3, itpro:3, pothole:1, speed_bump:3, traffic_cone:2, flood:1 },
    { dog:3, pothole:2, drunkard:2, shopper:2, police:1, monkey:3, hawker:2, traffic_cone:1, it_bus:0.5 }
  ],

  _wRand(weights) {
    const keys=Object.keys(weights); let tot=0;
    for (const k of keys) tot+=weights[k];
    let r=Math.random()*tot;
    for (const k of keys) { r-=weights[k]; if (r<=0) return k; }
    return keys[0];
  },

  spawn() {
    let weights = {...this.ZONE_W[GS.zone]};
    if (GS.hornBar < 0.3) { delete weights.it_bus; delete weights.flood; }
    // don't stack same action type too close
    if (this.lastAction === 'jump') delete weights.pothole, delete weights.dog, delete weights.garbage;
    const type = this._wRand(weights);
    const def = this.TYPES[type];
    const gy = def.fullH ? 0 : GROUND_Y - def.h + (def.yOff||0);
    this.list.push({
      type, x: CW+20, y: gy,
      w: def.w, h: def.h,
      drawFn: def.drawFn, action: def.action,
      warnShown: false, alive: true, frameCount: 0
    });
    this.lastAction = def.action;
  },

  update(dt) {
    this.spawnTimer += dt;
    const interval = Math.max(1000, this.spawnInterval - (GS.speed - BASE_SPEED) * 120);
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this.spawn();
      if (Math.random() < 0.18) setTimeout(() => { if (GS.alive) this.spawn(); }, 1000);
    }
    for (const obs of this.list) {
      obs.x -= GS.speed * (GS.activePower==='turbo_boost' ? 1.8 : 1);
      obs.frameCount++;
      // warning for super obstacles
      if (!obs.warnShown && obs.action==='super' && obs.x < PLAYER_X + 380) {
        obs.warnShown = true;
        Particles.boom(obs.x, obs.y + 20, '#ff4444', 6);
      }
    }
    this.list = this.list.filter(o => o.x + o.w > -20);
  },

  checkCollisions() {
    if (Player.invincible) return;
    const px=Player.x+8, py=Player.y+6, pw=Player.width-16, ph=Player.height-10;
    for (const obs of this.list) {
      if (!obs.alive) continue;
      const hit = px < obs.x+obs.w && px+pw > obs.x && py < obs.y+obs.h && py+ph > obs.y;
      if (!hit) continue;
      if (obs.action==='jump') {
        if (!Player.jumping && Player.grounded) { Game.die(); return; }
      } else if (obs.action==='brake') {
        if (!Player.braking) { Game.die(); return; }
        else { obs.alive=false; Particles.boom(obs.x+obs.w/2, obs.y+obs.h/2, '#FFD700', 10); }
      } else if (obs.action==='super') {
        if (GS.activePower==='ghost_mode'||GS.activePower==='turbo_boost') { obs.alive=false; return; }
        if (obs.type==='flood'&&GS.activePower==='monsoon_shield') { obs.alive=false; return; }
        if (obs.type==='it_bus'&&GS.activePower==='traffic_melt') { obs.alive=false; return; }
        Game.die(); return;
      }
    }
  },

  clearAll() { this.list = []; },

  draw(ctx) {
    for (const obs of this.list) {
      if (!obs.alive) continue;
      NPC[obs.drawFn](ctx, obs.x, obs.y);
      // warning flash for super obstacles coming soon
      if (obs.warnShown && obs.x > PLAYER_X+60 && GS.frameCount%6 < 3) {
        ctx.strokeStyle='#ff4444'; ctx.lineWidth=2;
        ctx.strokeRect(obs.x-2, obs.y-2, obs.w+4, obs.h+4);
      }
      // action cue label above obstacle (show when within 600px, not super)
      if (obs.action !== 'super' && obs.x < CW && obs.x > PLAYER_X - 80) {
        const cx = obs.x + obs.w / 2;
        const cy = obs.y - 8;
        const blink = GS.frameCount % 40 < 28;
        ctx.save();
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        if (obs.action === 'jump') {
          ctx.fillStyle = blink ? '#00ffff' : '#007788';
          ctx.fillText('↑ JUMP', cx, cy);
        } else {
          ctx.fillStyle = blink ? '#ff8800' : '#884400';
          ctx.fillText('↓ BRAKE', cx, cy);
        }
        ctx.restore();
      }
    }
  }
};

// ─── POWER BAR SYSTEM ────────────────────────────────────────────────────────
// Bar fills from: jumps (+0.25), brakes (+0.12), ASDF presses (+0.07).
// When full (≥1.0), pressing A/S/D/F fires that key's superpower directly.
const Horn = {
  VALID: ['A','S','D','F'],
  KEY_POWER: { A:'monsoon_shield', S:'traffic_melt', D:'turbo_boost', F:'ghost_mode' },
  POWER_DUR: { monsoon_shield:5000, traffic_melt:0, turbo_boost:3000, ghost_mode:4000 },

  addCharge(amount) {
    GS.hornBar = Math.min(1, GS.hornBar + amount);
  },

  press(key) {
    if (!this.VALID.includes(key)) return;
    Audio.horn(key);
    const el = document.getElementById('note-'+key);
    if (el) { el.classList.add('pressed'); setTimeout(()=>el.classList.remove('pressed'), 90); }
    if (GS.hornBar >= 0.98 && !GS.activePower) {
      this._trigger(this.KEY_POWER[key]);
    } else {
      this.addCharge(0.07);
    }
  },

  _trigger(power) {
    Audio.sfx('combo');
    GS.activePower = power;
    GS.powerTimer = this.POWER_DUR[power] || 0;
    GS.hornBar = 0;
    if (power === 'traffic_melt') {
      Obstacles.clearAll();
      GS.activePower = null;
      Particles.boom(CW/2, CH/2, '#ff4444', 24);
    }
    const pi = document.getElementById('power-indicator');
    const names = { monsoon_shield:'MONSOON SHIELD', turbo_boost:'TURBO BOOST!', ghost_mode:'GHOST MODE', traffic_melt:'TRAFFIC MELT!' };
    if (power !== 'traffic_melt') {
      pi.textContent = names[power] || power;
      pi.classList.remove('hidden');
    }
    Audio.sfx('power');
    Particles.sparkle(Player.x+28, Player.y+10);
  },

  update(dt) {
    GS.hornBar = Math.max(0, GS.hornBar - 0.0003);
    if (GS.activePower && GS.powerTimer > 0) {
      GS.powerTimer -= dt;
      if (GS.powerTimer <= 0) {
        GS.activePower = null; GS.powerTimer = 0;
        document.getElementById('power-indicator').classList.add('hidden');
      }
    }
    document.getElementById('horn-bar-fill').style.width = (GS.hornBar * 100) + '%';
    document.getElementById('speed-value').textContent = GS.speed.toFixed(1);
    document.getElementById('score-value').textContent = GS.score;
  }
};

// ─── ACID SYSTEM ──────────────────────────────────────────────────────────────
const Acid = {
  intensity: 0,
  waveT: 0,
  frameOff: 0,
  offCtx: null, offCanvas: null,

  init() {
    this.offCanvas = document.createElement('canvas');
    this.offCanvas.width = CW; this.offCanvas.height = CH;
    this.offCtx = this.offCanvas.getContext('2d');
  },

  update(dt) {
    GS.acidCycleTimer += dt;
    this.waveT += dt * 0.003;

    if (!GS.acidMode && GS.acidCycleTimer >= ACID_INTERVAL - 2000) {
      if (!document.getElementById('acid-warning').classList.contains('visible-warn')) {
        const w = document.getElementById('acid-warning');
        w.textContent = SETTINGS.overlayStyle === 'vangogh' ? '🎨 VAN GOGH MODE 🎨' : '⚡ ACID TRIP ⚡';
        w.classList.remove('hidden');
        w.classList.add('visible-warn');
      }
    }

    if (!GS.acidMode && GS.acidCycleTimer >= ACID_INTERVAL) {
      GS.acidMode = true; GS.acidTimer = 0; GS.acidCycleTimer = 0;
      document.getElementById('acid-warning').classList.add('hidden');
      document.getElementById('acid-warning').classList.remove('visible-warn');
      document.body.classList.add(SETTINGS.overlayStyle === 'vangogh' ? 'van-gogh-mode' : 'acid-mode');
      Audio.triggerAcid();
    }

    if (GS.acidMode) {
      GS.acidTimer += dt;
      if (GS.acidTimer < 500) this.intensity = GS.acidTimer / 500;
      else if (GS.acidTimer < ACID_DURATION - 500) this.intensity = 1.0;
      else this.intensity = Math.max(0, (ACID_DURATION - GS.acidTimer) / 500);
      if (GS.acidTimer >= ACID_DURATION) {
        GS.acidMode = false; this.intensity = 0;
        document.body.classList.remove('acid-mode', 'van-gogh-mode');
        Audio.endAcid();
      }
    }
  },

  apply(ctx) {
    if (SETTINGS.overlayStyle === 'vangogh') this._applyVanGogh(ctx);
    else this._applyAcid(ctx);
  },

  _applyAcid(ctx) {
    if (!GS.acidMode || this.intensity < 0.05) return;
    if (GS.frameCount % 2 !== 0) return;

    this.offCtx.drawImage(ctx.canvas, 0, 0);
    const src = this.offCtx.getImageData(0, 0, CW, CH);
    const d = src.data;
    const amp = 7 * this.intensity;
    const out = ctx.createImageData(CW, CH);
    const od = out.data;

    for (let y=0; y<CH; y++) {
      for (let x=0; x<CW; x++) {
        const dx = Math.round(Math.sin(y*0.05+this.waveT)*amp);
        const dy = Math.round(Math.cos(x*0.04+this.waveT*0.8)*3*this.intensity);
        const sx = Math.max(0,Math.min(CW-1,x+dx));
        const sy = Math.max(0,Math.min(CH-1,y+dy));
        const si=(sy*CW+sx)*4, di=(y*CW+x)*4;
        od[di]=d[si]; od[di+1]=d[si+1]; od[di+2]=d[si+2]; od[di+3]=d[si+3];
        if (this.intensity > 0.6) {
          const hue=(x*0.4+y*0.2+this.waveT*80)%360;
          const [r,g,b]=hslRgb(hue,1,0.5);
          const blend=(this.intensity-0.6)*0.35;
          od[di]=od[di]*(1-blend)+r*blend;
          od[di+1]=od[di+1]*(1-blend)+g*blend;
          od[di+2]=od[di+2]*(1-blend)+b*blend;
        }
      }
    }
    ctx.putImageData(out, 0, 0);
  },

  _applyVanGogh(ctx) {
    if (!GS.acidMode || this.intensity < 0.05) return;
    if (GS.frameCount % 2 !== 0) return;

    this.offCtx.drawImage(ctx.canvas, 0, 0);
    const src = this.offCtx.getImageData(0, 0, CW, CH);
    const d = src.data;
    const out = ctx.createImageData(CW, CH);
    const od = out.data;
    const cx = CW / 2, cy = CH / 2;
    const swirl = 0.5 * this.intensity;
    const t = this.waveT;

    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const twist = swirl * Math.exp(-dist * 0.007);
        const na = angle + twist;
        const sx = Math.max(0, Math.min(CW - 1, Math.round(cx + dist * Math.cos(na))));
        const sy = Math.max(0, Math.min(CH - 1, Math.round(cy + dist * Math.sin(na))));
        // subtle brush stroke offset
        const bd = na + Math.PI * 0.35;
        const bl = 1.5 * this.intensity;
        const bx = Math.max(0, Math.min(CW - 1, Math.round(sx + Math.cos(bd) * bl)));
        const by2 = Math.max(0, Math.min(CH - 1, Math.round(sy + Math.sin(bd) * bl)));
        const si = (by2 * CW + bx) * 4;
        const di = (y * CW + x) * 4;
        od[di] = d[si]; od[di+1] = d[si+1]; od[di+2] = d[si+2]; od[di+3] = d[si+3];
        // Starry Night tint — light touch so gameplay stays readable
        if (this.intensity > 0.7) {
          const blend = (this.intensity - 0.7) * 0.2;
          const star = Math.sin(x * 0.09 + t * 3) * Math.cos(y * 0.07 + t * 1.4) > 0.65;
          if (star) {
            od[di]   = od[di]   * (1-blend) + 255 * blend;
            od[di+1] = od[di+1] * (1-blend) + 215 * blend;
            od[di+2] = od[di+2] * (1-blend) + 30  * blend;
          } else {
            od[di]   = od[di]   * (1-blend) + 15  * blend;
            od[di+1] = od[di+1] * (1-blend) + 55  * blend;
            od[di+2] = od[di+2] * (1-blend) + 145 * blend;
          }
        }
      }
    }
    ctx.putImageData(out, 0, 0);
  }
};

function hslRgb(h,s,l) {
  const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}
  else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
  return[(r+m)*255,(g+m)*255,(b+m)*255];
}

// ─── DOSA BREAK CUTSCENE ─────────────────────────────────────────────────────
const DosaBreak = {
  timer: 0,
  DURATION: 5000,
  biteFrame: 0, biteTimer: 0,
  steamParticles: [],

  start() {
    this.timer = 0; this.biteFrame = 0; this.biteTimer = 0; this.steamParticles = [];
    GS.dosaBreak = true; GS.paused = true;
    Obstacles.clearAll();
  },

  end() {
    GS.dosaBreak = false; GS.dosaBreakDone = true; GS.paused = false;
    GS.lastTime = performance.now();
  },

  update(dt) {
    this.timer += dt;
    this.biteTimer += dt;
    if (this.biteTimer > 400) { this.biteFrame = (this.biteFrame + 1) % 3; this.biteTimer = 0; }
    if (Math.random() < 0.15) {
      this.steamParticles.push({ x: 300 + Math.random()*60, y: 195, life: 1, vx: (Math.random()-0.5)*0.4, vy: -0.7 });
    }
    for (const p of this.steamParticles) { p.x+=p.vx; p.y+=p.vy; p.life-=0.018; }
    this.steamParticles = this.steamParticles.filter(p=>p.life>0);
    if (this.timer >= this.DURATION) this.end();
  },

  draw(ctx) {
    // dark curtain
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, CW, CH);

    // restaurant background panel
    ctx.fillStyle = '#1a3a1a'; ctx.fillRect(180, 60, 440, 260);
    ctx.fillStyle = '#2a5a2a'; ctx.fillRect(182, 62, 436, 256);
    // green wall tiles
    ctx.fillStyle = '#1f4a1f';
    for (let tx=182; tx<618; tx+=28) for (let ty=62; ty<200; ty+=18) { ctx.fillRect(tx,ty,26,16); }
    // counter top
    ctx.fillStyle = '#8B6914'; ctx.fillRect(200, 195, 400, 12);
    ctx.fillStyle = '#a07820'; ctx.fillRect(200, 192, 400, 6);
    // MTR-style sign on wall
    ctx.fillStyle = '#FFD700'; ctx.fillRect(320, 72, 160, 28);
    ctx.fillStyle = '#000'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillText('DARSHINI FAST FOOD', 400, 83);
    ctx.fillStyle = '#ff6600'; ctx.font = '7px monospace';
    ctx.fillText('EST. 1985 | PURE VEG', 400, 95);

    // ── BANANA LEAF PLATE ──
    ctx.fillStyle = '#2d6a1a'; ctx.beginPath(); ctx.ellipse(340, 215, 100, 30, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3a8a20'; ctx.beginPath(); ctx.ellipse(340, 213, 96, 27, 0, 0, Math.PI*2); ctx.fill();
    // leaf vein
    ctx.strokeStyle = '#2d6a1a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(245, 213); ctx.lineTo(435, 213); ctx.stroke();
    for (let vx=260; vx<430; vx+=16) { ctx.beginPath(); ctx.moveTo(vx,213); ctx.lineTo(vx+8,205); ctx.stroke(); }

    // DOSA — big crispy brown crepe rolled
    const dosaConsumed = this.biteFrame; // 0,1,2 = full, half, mostly eaten
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(280, 220); ctx.lineTo(290 + dosaConsumed*14, 200); ctx.lineTo(390 - dosaConsumed*10, 200);
    ctx.lineTo(380, 225); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.moveTo(283, 220); ctx.lineTo(292 + dosaConsumed*14, 204); ctx.lineTo(386 - dosaConsumed*10, 204);
    ctx.lineTo(376, 224); ctx.closePath(); ctx.fill();
    // dosa crispy edges
    ctx.fillStyle = '#6B3410';
    for (let i=0; i<5-dosaConsumed; i++) ctx.fillRect(285+i*18, 218, 4, 6);

    // IDLI × 2 — white dome shapes
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath(); ctx.ellipse(405, 210, 18, 10, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(435, 210, 18, 10, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e8e0d0'; // flat bottom
    ctx.fillRect(390, 212, 60, 8);

    // SAMBAR bowl
    ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.ellipse(460, 218, 16, 10, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c8400a'; ctx.beginPath(); ctx.ellipse(460, 215, 13, 7, 0, 0, Math.PI*2); ctx.fill();

    // CHUTNEY — green coconut
    ctx.fillStyle = '#556B2F'; ctx.beginPath(); ctx.ellipse(350, 228, 14, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#6B8E23'; ctx.beginPath(); ctx.ellipse(350, 226, 11, 5, 0, 0, Math.PI*2); ctx.fill();

    // steam
    for (const p of this.steamParticles) {
      ctx.globalAlpha = p.life * 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
    }
    ctx.globalAlpha = 1;

    // ── RAJAPPA EATING ──
    const ex = 490, ey = 140;
    const bobY = Math.sin(this.timer * 0.008) * 2;
    // body/torso
    ctx.fillStyle = '#8B1A1A'; ctx.fillRect(ex+2, ey+24+bobY, 28, 40); // lungi
    ctx.fillStyle = '#CC2200';
    ctx.fillRect(ex+4,ey+26+bobY,4,38); ctx.fillRect(ex+18,ey+26+bobY,4,38);
    ctx.fillRect(ex+2,ey+30+bobY,28,4); ctx.fillRect(ex+2,ey+44+bobY,28,4);
    ctx.fillStyle = '#F4A460'; ctx.fillRect(ex, ey+8+bobY, 32, 18); // shirt
    // arm raising to mouth (animated)
    const armAngle = this.biteFrame === 1 ? -0.6 : (this.biteFrame === 2 ? -1.1 : -0.3);
    ctx.save(); ctx.translate(ex+28, ey+14+bobY); ctx.rotate(armAngle);
    ctx.fillStyle = '#C8956C'; ctx.fillRect(-4, 0, 8, 20); // arm
    ctx.fillStyle = '#8B4513'; ctx.fillRect(-3, 18, 6, 6); // dosa piece in hand
    ctx.restore();
    // other arm resting
    ctx.fillStyle = '#C8956C'; ctx.fillRect(ex-6, ey+14+bobY, 8, 18);
    // head
    ctx.fillStyle = '#C8956C'; ctx.fillRect(ex+4, ey+bobY, 24, 22);
    // mustache
    ctx.fillStyle = '#111'; ctx.fillRect(ex+6, ey+12+bobY, 20, 5);
    ctx.beginPath(); ctx.arc(ex+6, ey+14+bobY, 4, Math.PI*0.4, Math.PI*1.8); ctx.fill();
    ctx.beginPath(); ctx.arc(ex+26, ey+14+bobY, 4, -Math.PI*0.2, Math.PI*0.6); ctx.fill();
    // mouth open/closed based on biteFrame
    ctx.fillStyle = this.biteFrame === 1 ? '#550000' : '#C8956C';
    ctx.fillRect(ex+10, ey+17+bobY, 12, this.biteFrame === 1 ? 4 : 2);
    // eyes closed in happiness (eating)
    ctx.fillStyle = '#111'; ctx.fillRect(ex+6, ey+7+bobY, 5, 2); ctx.fillRect(ex+21, ey+7+bobY, 5, 2);
    // hair
    ctx.fillStyle = '#111'; ctx.fillRect(ex+3, ey+bobY, 26, 6);
    // happy sweat / contentment dot
    ctx.fillStyle = '#88eeff'; ctx.beginPath(); ctx.arc(ex+30, ey+2+bobY, 3, 0, Math.PI*2); ctx.fill();

    // ── TITLE ──
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('DOSA BREAK!', CW/2, 45);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#aaffaa';
    ctx.fillText('Rajappa stops at his favourite darshini...', CW/2, 58);

    // speech bubble from Rajappa
    const bubbleX = ex - 130, bubbleY = ey - 20;
    ctx.fillStyle = '#fffdf0'; ctx.fillRect(bubbleX, bubbleY, 120, 34);
    ctx.fillStyle = '#333';    ctx.fillRect(bubbleX, bubbleY, 120, 34); // border
    ctx.fillStyle = '#fffdf0'; ctx.fillRect(bubbleX+2, bubbleY+2, 116, 30);
    ctx.fillStyle = '#000'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('"Eno drive madli?', bubbleX+60, bubbleY+13);
    ctx.fillText('Oota aadmele!"', bubbleX+60, bubbleY+26);
    // bubble tail
    ctx.fillStyle = '#fffdf0';
    ctx.beginPath(); ctx.moveTo(bubbleX+100,bubbleY+34); ctx.lineTo(bubbleX+115,bubbleY+44); ctx.lineTo(bubbleX+90,bubbleY+34); ctx.fill();

    // countdown bar
    const pct = Math.max(0, 1 - this.timer / this.DURATION);
    ctx.fillStyle = '#333'; ctx.fillRect(200, 300, 400, 8);
    ctx.fillStyle = '#FFD700'; ctx.fillRect(200, 300, 400*pct, 8);
    ctx.font = '7px monospace'; ctx.fillStyle = '#888'; ctx.textAlign = 'center';
    ctx.fillText('resuming in ' + Math.ceil((this.DURATION - this.timer) / 1000) + 's  |  any key to skip', CW/2, 325);

    ctx.textAlign = 'left';
  },

  skipOnKey() {
    if (GS.dosaBreak) this.end();
  }
};

// ─── GAME MASTER ──────────────────────────────────────────────────────────────
const Game = {
  canvas: null, ctx: null, animId: null,
  keysDown: new Set(),

  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    BG.init();
    Acid.init();
    this.bindInputs();
  },

  start() {
    GS.reset();
    Obstacles.list = []; Obstacles.spawnTimer = 0; Obstacles.lastAction = null;
    Particles.list = []; Particles.rain = [];
    Player.x=PLAYER_X; Player.y=GROUND_Y-42; Player.vy=0; Player.grounded=true;
    Player.jumping=false; Player.braking=false; Player.exhaust=[];
    BG.offsets = [0,0,0];
    document.getElementById('start-screen').style.display='none';
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('power-indicator').classList.add('hidden');
    document.getElementById('acid-warning').classList.add('hidden');
    SETTINGS.animeMode = document.getElementById('toggle-anime').checked;
    SETTINGS.overlayStyle = document.getElementById('toggle-overlay').checked ? 'vangogh' : 'acid';
    document.body.classList.remove('acid-mode', 'van-gogh-mode');
    document.body.classList.toggle('anime-mode', SETTINGS.animeMode);
    Audio._init();
    Audio.startMusic();
    Audio.setRain(0);
    GS.lastTime = performance.now();
    cancelAnimationFrame(this.animId);
    this.loop(performance.now());
  },

  loop(ts) {
    GS.dt = Math.min(ts - GS.lastTime, 33);
    GS.lastTime = ts;
    GS.elapsed += GS.dt;
    GS.frameCount++;

    // dosa break at 60s
    if (GS.alive && !GS.dosaBreakDone && !GS.dosaBreak && GS.elapsed >= 60000) {
      DosaBreak.start();
    }
    if (GS.dosaBreak) {
      DosaBreak.update(GS.dt);
      this.render();
      if (GS.alive) this.animId = requestAnimationFrame(ts => this.loop(ts));
      return;
    }

    if (!GS.paused && GS.alive) {
      GS.distance += GS.speed;
      GS.score = Math.floor(GS.distance / 8);
      GS.speed = Math.min(MAX_SPEED, BASE_SPEED + GS.distance / 9000);

      // zone cycling
      GS.zoneTimer += GS.dt;
      if (GS.zoneTimer >= ZONE_DURATION) {
        GS.zoneTimer = 0;
        const prev = GS.zone;
        GS.zone = (GS.zone + 1) % 5;
        this.showZoneBanner();
        Audio.changeZone(GS.zone);
        Audio.sfx('zoneChange');
        // rain in park / MG road zones
        Audio.setRain(GS.zone <= 1 ? 0.6 : 0.1);
        // reset lastTime so audio/DOM work in this frame doesn't inflate next dt
        GS.lastTime = performance.now();
      }

      BG.update(GS.dt);
      Acid.update(GS.dt);
      Player.update(GS.dt);
      Obstacles.update(GS.dt);
      Obstacles.checkCollisions();
      Horn.update(GS.dt);
      Particles.update(GS.dt);

      if (GS.zone <= 1) Particles.addRain(GS.zone);
    }

    this.render();

    if (GS.alive) this.animId = requestAnimationFrame(ts => this.loop(ts));
  },

  render() {
    const ctx = this.ctx;
    ctx.save();

    // screen shake during acid
    if (GS.acidMode && Acid.intensity > 0.3) {
      ctx.translate((Math.random()-0.5)*4*Acid.intensity, (Math.random()-0.5)*3*Acid.intensity);
    }

    BG.draw(ctx);
    Particles.drawRain(ctx);
    Obstacles.draw(ctx);
    Player.draw(ctx);
    Particles.drawParticles(ctx);
    Acid.apply(ctx);

    if (GS.dosaBreak) DosaBreak.draw(ctx);

    ctx.restore();
  },

  die() {
    if (!GS.alive) return;
    GS.alive = false;
    Audio.sfx('hit');
    Particles.boom(Player.x+28, Player.y+20, '#FFD700', 20);
    Particles.boom(Player.x+28, Player.y+20, '#ff4444', 12);
    setTimeout(() => {
      Audio.stopMusic();
      Audio.sfx('gameover');
      this.render();
      this.showGameOver();
    }, 350);
  },

  showGameOver() {
    const msgs = [
      'Traffic got you bro.', 'Even Rajappa has limits.', 'The city wins today.',
      'Try the horn combos next time!', 'Bangalore never sleeps... you just did.'
    ];
    document.getElementById('final-score').textContent = GS.score;
    document.getElementById('gameover-msg').textContent = msgs[GS.score%msgs.length];
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.body.classList.remove('acid-mode', 'van-gogh-mode');
  },

  showZoneBanner() {
    const banner = document.getElementById('zone-banner');
    banner.textContent = BG.ZONES[GS.zone].name;
    banner.classList.remove('hidden','fade-out');
    setTimeout(()=>banner.classList.add('fade-out'), 1600);
    setTimeout(()=>banner.classList.add('hidden'), 2700);
  },

  bindInputs() {
    document.addEventListener('keydown', e => {
      if (this.keysDown.has(e.code)) return;
      this.keysDown.add(e.code);
      if (GS.dosaBreak) { DosaBreak.skipOnKey(); return; }
      if (!GS.alive) return;

      if (e.code==='Space'||e.code==='ArrowUp') { e.preventDefault(); Player.jump(); }
      else if (e.code==='ArrowDown') { e.preventDefault(); Player.braking=true; Audio.sfx('brake'); Horn.addCharge(0.12); }
      else if (e.code==='KeyA') Horn.press('A');
      else if (e.code==='KeyS') Horn.press('S');
      else if (e.code==='KeyD') Horn.press('D');
      else if (e.code==='KeyF') Horn.press('F');
    });

    document.addEventListener('keyup', e => {
      this.keysDown.delete(e.code);
      if (e.code==='ArrowDown') Player.braking = false;
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && GS.lastTime) GS.lastTime = performance.now();
    });

    document.getElementById('toggle-anime').addEventListener('change', function() {
      SETTINGS.animeMode = this.checked;
      document.body.classList.toggle('anime-mode', this.checked);
    });
    document.getElementById('toggle-overlay').addEventListener('change', function() {
      SETTINGS.overlayStyle = this.checked ? 'vangogh' : 'acid';
      document.getElementById('opt-acid').classList.toggle('opt-active', !this.checked);
      document.getElementById('opt-vg').classList.toggle('opt-active', this.checked);
    });
    document.getElementById('start-btn').addEventListener('click', () => this.start());
    document.getElementById('retry-btn').addEventListener('click', () => this.start());

    // touch support — on-screen buttons
    const touchMap = { 'touch-jump': ()=>Player.jump(), 'touch-brake-down': ()=>{ Player.braking=true; Audio.sfx('brake'); }, 'touch-A': ()=>Horn.press('A'), 'touch-S': ()=>Horn.press('S'), 'touch-D': ()=>Horn.press('D'), 'touch-F': ()=>Horn.press('F') };
    for (const [id, fn] of Object.entries(touchMap)) {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('touchstart', e=>{ e.preventDefault(); if(GS.alive)fn(); }, {passive:false}); }
    }
  }
};

// ─── BOOT ─────────────────────────────────────────────────────────────────────
document.fonts.ready.then(() => Game.init());

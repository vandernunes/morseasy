/* audio.js — Sidetone oscillator, Farnsworth timing, playback
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const S = {cwpm:20, ewpm:8, tone:600, vol:0.30};

const Sig = {
  ctx:null, master:null, gate:null, osc:null,
  init(){
    if(this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if(!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain(); this.master.gain.value = S.vol;
    this.master.connect(this.ctx.destination);
    this.gate = this.ctx.createGain(); this.gate.gain.value = 0.0001;
    this.gate.connect(this.master);
    this.osc = this.ctx.createOscillator();
    this.osc.type = "sine"; this.osc.frequency.value = S.tone;
    this.osc.connect(this.gate); this.osc.start();
  },
  resume(){ this.init(); if(this.ctx && this.ctx.state !== "running") this.ctx.resume(); },
  now(){ return this.ctx ? this.ctx.currentTime : 0; },
  on(t, dur){
    const g = this.gate.gain, r = 0.005;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(1, t + r);
    g.setValueAtTime(1, Math.max(t + r, t + dur - r));
    g.exponentialRampToValueAtTime(0.0001, t + dur);
  },
  keyDown(){
    this.resume(); if(!this.ctx) return;
    const g = this.gate.gain, t = this.now();
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.exponentialRampToValueAtTime(1, t + 0.005);
  },
  keyUp(){
    if(!this.ctx) return;
    const g = this.gate.gain, t = this.now();
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.exponentialRampToValueAtTime(0.0001, t + 0.005);
  },
  silence(){
    if(!this.ctx) return;
    const g = this.gate.gain, t = this.now();
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
  }
};

function timing(cw, ew){
  const c = cw || S.cwpm;
  let s = ew || S.ewpm;
  if(s > c) s = c;
  const dit = 1.2 / c;
  let tc, tw;
  if(s < c){
    const ta = (60*c - 37.2*s) / (s*c);       // ARRL Farnsworth
    tc = 3*ta/19; tw = 7*ta/19;
  } else { tc = 3*dit; tw = 7*dit; }
  return {dit, dah:3*dit, gap:dit, tc, tw};
}
function tokenize(text){
  const out = [], t = String(text).toUpperCase();
  for(let i=0;i<t.length;i++){
    if(t[i] === "<"){
      const j = t.indexOf(">", i);
      if(j > i){ out.push(t.slice(i, j+1)); i = j; continue; }
    }
    out.push(t[i]);
  }
  return out;
}

let playToken = 0, lamps = [], lampRAF = null;
const lampEl = () => document.getElementById("lamp");
function lampLoop(){
  const t = Sig.now();
  let lit = false;
  for(const m of lamps){ if(t >= m[0] && t <= m[1]){ lit = true; break; } }
  lampEl().classList.toggle("on", lit);
  if(lamps.length && t < lamps[lamps.length-1][1] + 0.2) lampRAF = requestAnimationFrame(lampLoop);
  else { lamps = []; lampRAF = null; lampEl().classList.remove("on"); }
}
function play(text, opts){
  opts = opts || {};
  Sig.resume();
  if(!Sig.ctx) return {seconds:0};
  const my = ++playToken;
  Sig.silence();
  const T = timing(opts.cwpm, opts.ewpm);
  let t = Sig.now() + 0.18;
  const marks = [], chars = [];
  for(const tok of tokenize(text)){
    if(tok === " "){ t += T.tw - T.tc; chars.push({ch:" ", at:t}); continue; }
    const pat = MORSE[tok];
    if(!pat) continue;
    for(let i=0;i<pat.length;i++){
      const d = pat[i] === "." ? T.dit : T.dah;
      Sig.on(t, d); marks.push([t, t+d]); t += d + T.gap;
    }
    t = t - T.gap + T.tc;
    chars.push({ch:tok, at:t});
  }
  lamps = marks;
  if(!lampRAF) lampRAF = requestAnimationFrame(lampLoop);
  const t0 = Sig.now(), total = t - t0;
  if(opts.onChar) chars.forEach(c => setTimeout(() => { if(playToken === my) opts.onChar(c.ch); }, Math.max(0,(c.at - t0)*1000)));
  if(opts.onDone) setTimeout(() => { if(playToken === my) opts.onDone(); }, Math.max(0, total*1000 + 60));
  return {seconds:total};
}
function stopPlay(){ playToken++; Sig.silence(); lamps = []; lampEl().classList.remove("on"); }

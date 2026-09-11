/* drills.js — Listen-and-answer drills: ham words and callsigns
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const DRILL_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
function makeDrill(prefix, cfg){
  const el = id => document.getElementById(prefix+"-"+id);
  const D = {
    running:false, cur:"", buf:"", ok:0, no:0, streak:0, setKey:cfg.defaultSet,
    answer(){ return (cfg.answer ? cfg.answer(this.cur) : this.cur).toUpperCase(); },
    show(){
      el("ok").textContent = this.ok;
      el("no").textContent = this.no;
      el("acc").textContent = (this.ok+this.no) ? Math.round(100*this.ok/(this.ok+this.no))+"%" : "—";
      el("streak").textContent = this.streak;
    },
    pad(){ buildKeypad(el("keypad"), DRILL_KEYS, {enter:true}); },
    start(){
      this.running = true;
      el("start").textContent = "Restart";
      ["replay","reveal","stop"].forEach(i => el(i).disabled = false);
      this.next();
    },
    next(){
      if(!this.running) return;
      this.cur = cfg.pick(this.setKey);
      this.buf = "";
      el("readout").innerHTML = '<span class="pend">listening</span>';
      paintEntry(el("entry"), "", true);
      el("verdict").className = "verdict neutral";
      el("verdict").textContent = cfg.prompt;
      el("rt").textContent = "";
      this.play();
    },
    play(){ play(cfg.render ? cfg.render(this.cur) : this.cur, {ewpm:S.ewpm}); },
    key(k){
      if(!this.running) return;
      if(k === "BS"){ this.buf = this.buf.slice(0,-1); paintEntry(el("entry"), this.buf, true); return; }
      if(k === "OK"){ this.check(); return; }
      if(this.buf.length >= 12) return;
      this.buf += k;
      paintEntry(el("entry"), this.buf, true);
    },
    reveal(){
      el("readout").innerHTML = esc(this.answer());
      const m = MEANING[this.cur];
      el("verdict").className = "verdict neutral";
      el("verdict").textContent = m ? this.answer() + " — " + m : "Shown. Next one coming.";
      setTimeout(() => { if(this.running) this.next(); }, 2200);
    },
    check(){
      if(!this.running || !this.buf) return;
      const given = this.buf, want = this.answer();
      const hit = given.replace(/[^A-Z0-9]/g,"") === want.replace(/[^A-Z0-9]/g,"");
      const d = diffMarkup(want, given);
      el("readout").innerHTML = d.html;
      paintEntry(el("entry"), given, false);
      for(let i=0;i<want.length;i++) logChar(want[i], want[i] === given[i]);
      const v = el("verdict"), m = MEANING[this.cur];
      if(hit){
        this.ok++; this.streak++;
        v.className = "verdict ok";
        v.textContent = m ? "Correct — " + want + ": " + m : "Correct.";
      } else {
        this.no++; this.streak = 0;
        v.className = "verdict bad";
        v.textContent = "It was " + want + (m ? " — " + m : "") + ".";
      }
      this.show(); markToday(); save();
      setTimeout(() => { if(this.running) this.next(); }, hit ? 850 : 2100);
    },
    stop(){
      this.running = false; stopPlay();
      ["replay","reveal","stop"].forEach(i => el(i).disabled = true);
      el("start").textContent = "Start";
      el("verdict").className = "verdict neutral";
      el("verdict").textContent = "Stopped.";
      paintEntry(el("entry"), "", false);
    }
  };
  el("start").addEventListener("click", () => D.start());
  el("replay").addEventListener("click", () => D.play());
  el("reveal").addEventListener("click", () => D.reveal());
  el("stop").addEventListener("click", () => D.stop());
  el("keypad").addEventListener("click", e => {
    const b = e.target.closest("[data-k]"); if(!b) return;
    Sig.resume(); D.key(b.dataset.k);
  });
  D.pad(); D.show();
  return D;
}

const Words = makeDrill("w", {
  defaultSet:"core",
  prompt:"One word or code. Tap ✓ or press Enter when done.",
  pick(k){ return pick(WORDSETS[k].items); },
  answer(x){ return x.replace(/[<>]/g,""); }
});
function renderWordSets(){
  document.getElementById("w-sets").innerHTML = Object.keys(WORDSETS).map(k =>
    '<button class="btn sm '+(k===Words.setKey?"primary":"ghost")+'" data-set="'+k+'">'+esc(WORDSETS[k].label)+'</button>').join("");
  document.getElementById("w-table").innerHTML = WORDSETS[Words.setKey].items.map(i =>
    '<tr><td class="code">'+esc(i.replace(/[<>]/g,""))+'</td><td class="mean">'+esc(MEANING[i]||"—")+'</td></tr>').join("");
}
document.getElementById("w-sets").addEventListener("click", e => {
  const b = e.target.closest("[data-set]"); if(!b) return;
  Words.setKey = b.dataset.set; renderWordSets(); if(Words.running) Words.next();
});

const CALLSETS = {
  mine:{label:"Mine + US", gen(){ return (P.call && Math.random()<.25) ? P.call : usCall(); }},
  us:  {label:"US only", gen:usCall},
  dx:  {label:"DX", gen:dxCall},
  mix: {label:"Everything", gen(){ const r=Math.random(); return (P.call && r<.15)?P.call:(r<.65?usCall():dxCall()); }}
};
const Calls = makeDrill("c", {
  defaultSet:"mine",
  prompt:"Callsign, sent twice. Type it once, then ✓ or Enter.",
  pick(k){ return CALLSETS[k].gen(); },
  render(x){ return x + " " + x; }
});
function renderCallSets(){
  document.getElementById("c-sets").innerHTML = Object.keys(CALLSETS).map(k =>
    '<button class="btn sm '+(k===Calls.setKey?"primary":"ghost")+'" data-cset="'+k+'">'+esc(CALLSETS[k].label)+'</button>').join("");
}
document.getElementById("c-sets").addEventListener("click", e => {
  const b = e.target.closest("[data-cset]"); if(!b) return;
  Calls.setKey = b.dataset.cset; renderCallSets(); if(Calls.running) Calls.next();
});

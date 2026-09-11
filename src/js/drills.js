/* drills.js — one listen-and-answer drill, many sets.
   Part of Morse Easy. Loaded as a classic script; see docs/ARCHITECTURE.md.

   Words and Callsigns used to be separate tabs running the same engine with
   different data, which meant two tabs, two set pickers and two sets of
   controls to learn. They are one tab now with one picker: the sets carry a
   kind, and the only thing that differs is that a callsign is sent twice, the
   way a real station calls.

   Rounds of ten. Practice that runs until you get bored has no shape - bored
   and finished are not the same feeling, and nothing ever feels won.

   Vander Nunes - N5EDB */
"use strict";

const ROUND = 10;
const DRILL_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

const DRILL_SETS = {
  core:    {label:"First 20",   kind:"word", items:["CQ","DE","K","R","TU","73","QTH","QRZ","QSL","RST","UR","ES","OM","GM","GE","TNX","FB","HW","PSE","AGN"]},
  q:       {label:"Q-codes",    kind:"word", items:QCODES.map(q => q[0])},
  abbrev:  {label:"Shorthand",  kind:"word", items:ABBREV.map(a => a[0])},
  prosign: {label:"Prosigns",   kind:"word", items:["<AR>","<SK>","<BT>","<KN>","<AS>","<BK>","<SN>","<CL>","<HH>"]},
  numbers: {label:"Numbers",    kind:"word", items:["599","579","5NN","339","449","1","2","3","4","5","6","7","8","9","0","100","73","88","12","50"]},
  common:  {label:"Plain words",kind:"word", items:["THE","AND","YOU","THAT","WAS","FOR","ARE","WITH","HAVE","THIS","FROM","NOT","BUT","ALL","HERE","GOOD","TIME","WELL","BACK","VERY","MUCH","YEAR","WORK","BAND","RADIO","ANTENNA","POWER","WATTS","WEATHER","STATION"]},
  mycall:  {label:"My call",    kind:"call", gen(){ return (P.call && Math.random() < 0.35) ? P.call : usCall(); }},
  uscall:  {label:"US calls",   kind:"call", gen: usCall},
  dxcall:  {label:"DX calls",   kind:"call", gen: dxCall}
};

const Drill = {
  running:false, cur:"", buf:"", ok:0, no:0, streak:0, done:0,
  setKey:"core",

  set(){ return DRILL_SETS[this.setKey] || DRILL_SETS.core; },
  isCall(){ return this.set().kind === "call"; },
  answer(){ return String(this.cur).replace(/[<>]/g, "").toUpperCase(); },

  show(){
    document.getElementById("d-ok").textContent = this.ok;
    document.getElementById("d-no").textContent = this.no;
    document.getElementById("d-acc").textContent =
      (this.ok + this.no) ? Math.round(100 * this.ok / (this.ok + this.no)) + "%" : "—";
    document.getElementById("d-streak").textContent = this.streak;
  },

  start(){
    this.running = true;
    this.ok = 0; this.no = 0; this.streak = 0; this.done = 0;
    document.getElementById("d-start").textContent = "Restart";
    ["d-replay","d-reveal","d-stop"].forEach(i => document.getElementById(i).disabled = false);
    this.show();
    this.next();
  },

  next(){
    if(!this.running) return;
    if(this.done >= ROUND){ this.finish(); return; }
    const st = this.set();
    this.cur = st.kind === "call" ? st.gen() : pick(st.items);
    this.buf = "";
    document.getElementById("d-readout").innerHTML = '<span class="pend">listening</span>';
    document.getElementById("d-lab").textContent =
      st.kind === "call" ? "Listen — sent twice" : "Listen";
    document.getElementById("d-rt").textContent = (this.done + 1) + " of " + ROUND;
    paintEntry(document.getElementById("d-entry"), "", true);
    const v = document.getElementById("d-verdict");
    v.className = "verdict neutral";
    v.textContent = st.kind === "call"
      ? "Callsign, sent twice. Type it once, then ✓."
      : "One word or code. Type it, then ✓.";
    this.play();
  },

  play(){
    play(this.isCall() ? this.cur + " " + this.cur : this.cur, {ewpm:S.ewpm});
  },

  key(k){
    if(!this.running) return;
    if(k === "BS"){ this.buf = this.buf.slice(0,-1); paintEntry(document.getElementById("d-entry"), this.buf, true); return; }
    if(k === "OK"){ this.check(); return; }
    if(this.buf.length >= 12) return;
    this.buf += k;
    paintEntry(document.getElementById("d-entry"), this.buf, true);
  },

  reveal(){
    document.getElementById("d-readout").innerHTML = esc(this.answer());
    const m = MEANING[this.cur];
    const v = document.getElementById("d-verdict");
    v.className = "verdict neutral";
    v.textContent = m ? this.answer() + " — " + m : "Shown. Next one coming.";
    this.no++; this.streak = 0; this.done++; this.show();
    setTimeout(() => { if(this.running) this.next(); }, 2200);
  },

  check(){
    if(!this.running || !this.buf) return;
    const given = this.buf, want = this.answer();
    const hit = given.replace(/[^A-Z0-9]/g,"") === want.replace(/[^A-Z0-9]/g,"");
    const d = diffMarkup(want, given);
    document.getElementById("d-readout").innerHTML = d.html;
    paintEntry(document.getElementById("d-entry"), given, false);
    for(let i=0;i<want.length;i++) logChar(want[i], want[i] === given[i]);
    const v = document.getElementById("d-verdict"), m = MEANING[this.cur];
    if(hit){
      this.ok++; this.streak++;
      v.className = "verdict ok";
      v.textContent = m ? "Correct — " + want + ": " + m : "Correct.";
    } else {
      this.no++; this.streak = 0;
      v.className = "verdict bad";
      v.textContent = "It was " + want + (m ? " — " + m : "") + ".";
    }
    this.done++;
    this.show(); markToday(); save();
    setTimeout(() => { if(this.running) this.next(); }, hit ? 850 : 2100);
  },

  finish(){
    this.running = false;
    ["d-replay","d-reveal","d-stop"].forEach(i => document.getElementById(i).disabled = true);
    document.getElementById("d-start").textContent = "Play again";
    const bucket = this.isCall() ? "calls" : "words";
    P.bestRound = P.bestRound || {};
    const prev = P.bestRound[bucket] || 0;
    const best = this.ok > prev;
    if(best) P.bestRound[bucket] = this.ok;
    markToday(); save();
    document.getElementById("d-readout").innerHTML =
      '<span class="' + (this.ok >= 8 ? "ok" : "bad") + '">' + this.ok + " / " + ROUND + "</span>";
    document.getElementById("d-rt").textContent = "";
    const v = document.getElementById("d-verdict");
    v.className = "verdict " + (this.ok >= 8 ? "ok" : "neutral");
    v.textContent = best && this.ok > 0
      ? "Best round yet — " + this.ok + " of " + ROUND + "."
      : this.ok + " of " + ROUND + ". Best so far is " + Math.max(prev, this.ok) + ".";
    paintEntry(document.getElementById("d-entry"), "", false, "round over");
    if(typeof renderHome === "function") renderHome();
  },

  stop(){
    this.running = false;
    stopPlay();
    ["d-replay","d-reveal","d-stop"].forEach(i => document.getElementById(i).disabled = true);
    document.getElementById("d-start").textContent = this.done ? "Play again" : "Play · 10";
    const v = document.getElementById("d-verdict");
    v.className = "verdict neutral";
    v.textContent = this.done ? "Stopped after " + this.done + " of " + ROUND + "." : "Stopped.";
    paintEntry(document.getElementById("d-entry"), "", false);
  }
};

function renderDrillSets(){
  document.getElementById("d-sets").innerHTML = Object.keys(DRILL_SETS).map(k =>
    '<button class="btn sm ' + (k === Drill.setKey ? "primary" : "ghost") + '" data-dset="' + k + '">'
    + esc(DRILL_SETS[k].label) + '</button>').join("");
  const st = DRILL_SETS[Drill.setKey];
  document.getElementById("d-table").innerHTML = st.kind === "call"
    ? '<tr><td class="mean">Generated callsigns — real US formats (1x2, 2x1, 1x3, 2x2, 2x3) and DX prefixes.</td><td></td></tr>'
    : st.items.map(i => '<tr><td class="code">' + esc(i.replace(/[<>]/g,""))
        + '</td><td class="mean">' + esc(MEANING[i] || "—") + '</td></tr>').join("");
}

document.getElementById("d-sets").addEventListener("click", e => {
  const b = e.target.closest("[data-dset]");
  if(!b) return;
  Drill.setKey = b.dataset.dset;
  P.drillSet = Drill.setKey;
  save();
  renderDrillSets();
  if(Drill.running) Drill.next();
});
document.getElementById("d-start").addEventListener("click", () => { Sig.resume(); Drill.start(); });
document.getElementById("d-replay").addEventListener("click", () => Drill.play());
document.getElementById("d-reveal").addEventListener("click", () => Drill.reveal());
document.getElementById("d-stop").addEventListener("click", () => Drill.stop());
document.getElementById("d-keypad").addEventListener("click", e => {
  const b = e.target.closest("[data-k]");
  if(!b) return;
  Sig.resume();
  Drill.key(b.dataset.k);
});

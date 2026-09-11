/* learn.js — Koch lessons: meet, tell apart, copy groups
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const STEPS = [
  {n:1, t:"Meet the sound"},
  {n:2, t:"Tell them apart"},
  {n:3, t:"Copy groups"},
  {n:4, t:"Send it back"}
];
const PICK_TARGET = 12;   // correct answers needed in step 2
const ECHO_TARGET = 10;   // characters keyed correctly in step 4

const Koch = {
  stage:1, running:false,
  meetList:[], meetIdx:0,
  echoCur:"", echoRight:0, echoPending:false,
  pickCur:"", pickRight:0, pickTries:0, pickPending:false,
  groups:[], idx:0, right:0, total:0, cur:"", buf:"", repeating:false,

  chars(){ return KOCH.slice(0, P.lesson + 1); },
  newChars(){ return P.lesson === 1 ? KOCH.slice(0,2) : [KOCH[P.lesson]]; },
  maxStage(){ return (P.stageByLesson && P.stageByLesson[P.lesson]) || 1; },
  reach(st){
    P.stageByLesson = P.stageByLesson || {};
    if(st > (P.stageByLesson[P.lesson]||1)) P.stageByLesson[P.lesson] = st;
    save();
  },
  go(st){
    this.halt();
    this.stage = st;
    this.render();
  },
  halt(){
    this.running = false; this.repeating = false; this.pickPending = false;
    stopPlay();
  },

  /* ---------- render ---------- */
  render(){
    const cs = this.chars(), nw = this.newChars();
    const stage = this.stage;

    document.getElementById("st-meet").hidden  = stage !== 1;
    document.getElementById("st-pick").hidden  = stage !== 2;
    document.getElementById("st-group").hidden = stage !== 3;
    document.getElementById("st-echo").hidden  = stage !== 4;

    document.getElementById("k-kicker").textContent =
      "Lesson " + P.lesson + " · Step " + stage + " of " + STEPS.length;
    const titles = {
      1: P.lesson === 1 ? "Meet K and M" : "Meet " + nw.join(" and "),
      2: "Tell them apart",
      3: "Copy groups of five",
      4: "Send them back"
    };
    const subs = {
      1: "Nothing to answer yet. You just listen until the sound sticks.",
      2: "One character at a time, and it tells you the answer every time. " + PICK_TARGET + " correct moves you on.",
      3: P.groupsPerLesson + " groups of five. 90% unlocks the next character.",
      4: "Hear a character, key it back. " + ECHO_TARGET + " clean to finish. Optional, but it is how the sound gets into your hand."
    };
    document.getElementById("k-title").textContent = titles[stage];
    document.getElementById("k-sub").textContent = subs[stage];
    document.getElementById("k-chars").textContent = cs.join(" ");
    document.getElementById("k-start").textContent = this.running ? "Restart" : "Start";

    /* stepper */
    const mx = this.maxStage();
    const echoed = (P.echoDone || {})[P.lesson];
    document.getElementById("k-stepper").innerHTML = STEPS.map(st =>
      '<li><button data-step="'+st.n+'"'
      + (st.n > mx ? " disabled" : "")
      + (st.n < stage ? ' class="done"' : "")
      + ' aria-current="'+(st.n === stage)+'">'
      + '<span class="n">'+(st.n < mx || (st.n < stage) ? "✓" : st.n)+'</span>'
      + '<span class="t">'+st.t+'</span></button></li>').join("");

    /* hear strip */
    document.getElementById("k-hear").innerHTML = cs.map(c =>
      '<button class="hearbtn" data-hear="'+esc(c)+'">'
      + '<span class="h-ch">'+esc(c)+'</span>'
      + '<span class="h-pat">'+patSpaced(MORSE[c])+'</span></button>').join("");

    /* meters */
    document.getElementById("m-lesson").textContent = P.lesson;
    document.getElementById("m-count").textContent = cs.length;
    const best = P.bestByLesson[P.lesson];
    document.getElementById("m-best").textContent = best ? best + "%" : "—";
    document.getElementById("m-streak").textContent = dayStreak();

    document.getElementById("k-chips").innerHTML = cs.map(c => {
      const isNew = nw.indexOf(c) >= 0;
      const err = P.charErr[c]||0, ok = P.charOk[c]||0;
      const weak = (err+ok) > 6 && err/(err+ok) > 0.15;
      return '<span class="chip'+(isNew?" new":"")+(weak && !isNew?" weak":"")+'">'+esc(c)+'</span>';
    }).join("");
    document.getElementById("k-back").disabled = P.lesson <= 1;
    document.getElementById("k-fwd").disabled = P.lesson >= KOCH.length - 1;

    const weak = Object.keys(P.charErr)
      .map(c => ({c, e:P.charErr[c]||0, o:P.charOk[c]||0}))
      .filter(x => x.e + x.o >= 4 && x.e > 0)
      .sort((a,b) => (b.e/(b.e+b.o)) - (a.e/(a.e+a.o))).slice(0,12);
    document.getElementById("k-weak").innerHTML = weak.length
      ? weak.map(x => '<span class="chip weak">'+esc(x.c)+' <span class="chip-pct">'+Math.round(100*x.e/(x.e+x.o))+'%</span></span>').join("")
      : '<span class="hint">Nothing logged yet.</span>';

    buildKeypad(document.getElementById("k-keypad"), cs, {enter:false});
    buildKeypad(document.getElementById("pick-keypad"), cs, {enter:false});
  },

  start(){
    if(this.stage === 1) this.startMeet();
    else if(this.stage === 2) this.startPick();
    else if(this.stage === 3) this.startGroups();
    else this.startEcho();
  },

  /* ================= STEP 4 — SEND IT BACK ================= */
  /* Copying teaches your ears. This teaches your hand, on the same characters,
     while they are still fresh. It is optional: the next lesson already
     unlocked at step 3, because not everyone has the dexterity on day one and
     nobody should be blocked from learning more sounds by a touchscreen. */
  startEcho(){
    this.halt();
    this.running = true;
    this.echoRight = 0;
    document.getElementById("k-start").textContent = "Restart";
    ["echo-hear","echo-skip","echo-stop"].forEach(id => document.getElementById(id).disabled = false);
    this.renderEchoPads();
    this.askEcho();
  },
  renderEchoPads(){
    const pads = document.getElementById("echo-pads");
    const straight = (P.keyMode || "straight") === "straight";
    pads.className = straight ? "keywrap sticky" : "keywrap two sticky";
    pads.innerHTML = straight
      ? '<button class="keysurface" data-key="straight">' +
          '<span class="ks-mark" id="echo-mark">·</span>' +
          '<span class="ks-hint" id="echo-hint">hold to key</span></button>'
      : '<button class="keysurface" data-key="dit"><span class="ks-mark" id="echo-mark">·</span><span class="ks-hint">dit</span></button>' +
        '<button class="keysurface" data-key="dah"><span class="ks-mark is-dah">—</span><span class="ks-hint" id="echo-hint">dah</span></button>';
    document.getElementById("echo-keys").innerHTML = straight
      ? 'Short press is a <strong>dit</strong>, longer is a <strong>dah</strong> — the mark changes while you hold. Keyboard: <kbd>Space</kbd>.'
      : 'Left pad dit, right pad dah. Keyboard: <kbd>&larr;</kbd> and <kbd>&rarr;</kbd>.';
    bindKeySurface(pads);
    Keyer.claim({
      mode: straight ? "straight" : "paddle",
      onElement: () => {
        document.getElementById("echo-stream").textContent =
          Keyer.elems ? patSpaced(Keyer.elems) : "";
      },
      onChar: ch => this.echoAnswer(ch),
      onPreview: kind => keyPreview(
        document.getElementById("echo-mark"), document.getElementById("echo-hint"), kind)
    });
  },
  askEcho(){
    if(!this.running) return;
    const cs = this.chars(), nw = this.newChars();
    this.echoCur = (Math.random() < 0.5 && nw.length) ? pick(nw) : pick(cs);
    this.echoPending = true;
    Keyer.reset();
    document.getElementById("echo-stream").textContent = "";
    document.getElementById("echo-readout").innerHTML = '<span class="pend">listen, then key it</span>';
    document.getElementById("echo-rt").textContent = this.echoRight + " of " + ECHO_TARGET + " sent clean";
    const v = document.getElementById("echo-v");
    v.className = "verdict neutral";
    v.textContent = "Key what you just heard.";
    play(this.echoCur, {ewpm:S.ewpm});
  },
  echoAnswer(ch){
    if(!this.running || !this.echoPending) return;
    this.echoPending = false;
    const right = ch === this.echoCur;
    const ro = document.getElementById("echo-readout");
    const v = document.getElementById("echo-v");
    logChar(this.echoCur, right);
    if(right){
      this.echoRight++;
      ro.innerHTML = '<span class="ok">'+esc(ch)+'</span>';
      v.className = "verdict ok";
      v.textContent = ch + " — clean. " + sayPattern(MORSE[ch]) + ".";
      document.getElementById("echo-rt").textContent = this.echoRight + " of " + ECHO_TARGET + " sent clean";
      if(this.echoRight >= ECHO_TARGET){ setTimeout(() => this.echoDone(), 800); return; }
      setTimeout(() => this.askEcho(), 800);
    } else {
      ro.innerHTML = '<span class="bad">'+esc(ch)+'</span> <span class="ok">'+esc(this.echoCur)+'</span>';
      v.className = "verdict bad";
      v.textContent = "That decoded as " + (ch === "·" ? "nothing readable" : ch)
        + ". It was " + this.echoCur + " — " + sayPattern(MORSE[this.echoCur]) + ". Listen and try again.";
      save();
      setTimeout(() => {
        if(!this.running) return;
        play(this.echoCur, {ewpm:S.ewpm, onDone:() => {
          if(!this.running) return;
          Keyer.reset();
          document.getElementById("echo-stream").textContent = "";
          this.echoPending = true;
          document.getElementById("echo-v").textContent = "Key it again.";
          document.getElementById("echo-v").className = "verdict neutral";
        }});
      }, 900);
    }
  },
  echoDone(){
    this.running = false;
    this.echoPending = false;
    Keyer.release();
    markToday();
    P.echoDone = P.echoDone || {};
    P.echoDone[P.lesson] = true;
    save();
    ["echo-hear","echo-skip","echo-stop"].forEach(id => document.getElementById(id).disabled = true);
    document.getElementById("k-start").textContent = "Start";
    const v = document.getElementById("echo-v");
    v.className = "verdict ok";
    v.textContent = ECHO_TARGET + " sent clean. These characters are in your hand as well as your ear.";
    this.render();
  },

  /* ================= STEP 1 — MEET ================= */
  startMeet(){
    this.halt();
    this.running = true;
    this.meetList = this.newChars().slice();
    this.meetIdx = 0;
    document.getElementById("k-start").textContent = "Restart";
    document.getElementById("meet-again").disabled = false;
    document.getElementById("meet-next").disabled = false;
    this.showMeet(true);
  },
  showMeet(autoplay){
    const ch = this.meetList[this.meetIdx];
    document.getElementById("meet-ch").textContent = ch;
    document.getElementById("meet-pat").textContent = MORSE[ch].split("").map(c => c === "." ? "·" : "—").join(" ");
    document.getElementById("meet-say").textContent = sayPattern(MORSE[ch]);
    document.getElementById("meet-mn").textContent = MNEMONIC[ch] ? "say it: " + MNEMONIC[ch] : "";
    document.getElementById("meet-lab").textContent = "This is " + ch;
    document.getElementById("meet-rt").textContent = this.meetList.length > 1
      ? (this.meetIdx+1) + " of " + this.meetList.length : "";
    const v = document.getElementById("meet-v");
    v.className = "verdict neutral";
    v.textContent = "Listen to it three times. Say the rhythm out loud with it — that is what makes it stick.";
    document.getElementById("meet-next").textContent =
      this.meetIdx < this.meetList.length - 1 ? "Next character" : "I know these — tell them apart";
    if(autoplay) this.playMeet();
  },
  playMeet(){
    const ch = this.meetList[this.meetIdx];
    if(!ch){ this.startMeet(); return; }
    play(ch + " " + ch + " " + ch, {ewpm:S.ewpm});
  },
  meetNext(){
    if(this.meetIdx < this.meetList.length - 1){
      this.meetIdx++;
      this.showMeet(true);
    } else {
      this.reach(2);
      this.go(2);
      this.startPick();
    }
  },

  /* ================= STEP 2 — TELL APART ================= */
  startPick(){
    this.halt();
    this.running = true;
    this.pickRight = 0; this.pickTries = 0;
    document.getElementById("k-start").textContent = "Restart";
    document.getElementById("pick-replay").disabled = false;
    document.getElementById("pick-stop").disabled = false;
    this.askPick();
  },
  askPick(){
    if(!this.running) return;
    const cs = this.chars(), nw = this.newChars();
    this.pickCur = (Math.random() < 0.5 && nw.length) ? pick(nw) : pick(cs);
    this.pickPending = true;
    document.getElementById("pick-readout").innerHTML = '<span class="pend">listening</span>';
    document.getElementById("pick-rt").textContent = this.pickRight + " of " + PICK_TARGET + " correct";
    const v = document.getElementById("pick-v");
    v.className = "verdict neutral";
    v.textContent = "Tap or type the character you just heard.";
    play(this.pickCur, {ewpm:S.ewpm});
  },
  pickAnswer(ch){
    if(!this.running || !this.pickPending) return;
    if(this.chars().indexOf(ch) < 0) return;
    this.pickPending = false;
    const right = ch === this.pickCur;
    logChar(this.pickCur, right);
    const v = document.getElementById("pick-v");
    const ro = document.getElementById("pick-readout");
    if(right){
      this.pickRight++;
      ro.innerHTML = '<span class="ok">'+esc(ch)+'</span>';
      v.className = "verdict ok";
      v.textContent = ch + " — " + sayPattern(MORSE[ch]) + ". Correct.";
      document.getElementById("pick-rt").textContent = this.pickRight + " of " + PICK_TARGET + " correct";
      if(this.pickRight >= PICK_TARGET){ setTimeout(() => this.pickDone(), 700); return; }
      setTimeout(() => this.askPick(), 750);
    } else {
      ro.innerHTML = '<span class="bad">'+esc(ch)+'</span> <span class="ok">'+esc(this.pickCur)+'</span>';
      v.className = "verdict bad";
      v.textContent = "That was " + this.pickCur + " — " + sayPattern(MORSE[this.pickCur]) + ". Listen again.";
      save();
      setTimeout(() => {
        if(!this.running) return;
        play(this.pickCur, {ewpm:S.ewpm, onDone:() => {
          if(!this.running) return;
          setTimeout(() => this.askPick(), 600);
        }});
      }, 600);
    }
  },
  pickDone(){
    this.running = false;
    this.reach(3);
    markToday(); save();
    document.getElementById("pick-replay").disabled = true;
    document.getElementById("pick-stop").disabled = true;
    const v = document.getElementById("pick-v");
    v.className = "verdict ok";
    v.textContent = PICK_TARGET + " correct. You know these sounds — now copy them in groups.";
    document.getElementById("pick-readout").innerHTML = '<span class="ok">ready</span>';
    this.render();
    setTimeout(() => { this.go(3); }, 1200);
  },

  /* ================= STEP 3 — GROUPS ================= */
  makeGroups(n){
    const set = this.chars(), nw = this.newChars(), g = [];
    for(let i=0;i<n;i++){
      let str = "";
      for(let j=0;j<5;j++) str += pick(set);
      if(i % 2 === 0 && set.length > 2){
        const at = Math.floor(Math.random()*5);
        str = str.slice(0,at) + pick(nw) + str.slice(at+1);
      }
      g.push(str);
    }
    return g;
  },
  startGroups(){
    this.halt();
    this.running = true;
    this.groups = this.makeGroups(P.groupsPerLesson);
    this.idx = 0; this.right = 0; this.total = 0; this.buf = "";
    document.getElementById("k-start").textContent = "Restart";
    ["k-replay","k-slower","k-stop"].forEach(id => document.getElementById(id).disabled = false);
    document.getElementById("m-now").textContent = "—";
    this.send();
  },
  send(slow){
    if(!this.running) return;
    this.cur = this.groups[this.idx];
    this.buf = "";
    paintEntry(document.getElementById("k-entry"), "", true);
    document.getElementById("k-readout").innerHTML = '<span class="pend">listening</span>';
    document.getElementById("k-scopelab").textContent = "Group " + (this.idx+1) + " of " + this.groups.length;
    document.getElementById("k-rt").textContent = this.total ? Math.round(100*this.right/this.total) + "% so far" : "";
    const v = document.getElementById("k-verdict");
    v.className = "verdict neutral";
    v.textContent = "Five characters. Type or tap them.";
    play(this.cur, {ewpm: slow ? Math.max(4, S.ewpm-4) : S.ewpm});
  },
  key(k){
    if(!this.running) return;
    if(this.stage === 2){ this.pickAnswer(k); return; }
    if(this.stage !== 3) return;
    if(k === "BS"){ this.buf = this.buf.slice(0,-1); paintEntry(document.getElementById("k-entry"), this.buf, true); return; }
    if(this.buf.length >= 5) return;
    this.buf += k;
    paintEntry(document.getElementById("k-entry"), this.buf, true);
    if(this.buf.length === 5) setTimeout(() => this.check(), 120);
  },
  check(){
    if(!this.running || this.stage !== 3 || !this.buf) return;
    const given = this.buf;
    const d = diffMarkup(this.cur, given);
    document.getElementById("k-readout").innerHTML = d.html;
    paintEntry(document.getElementById("k-entry"), given, false);
    for(let i=0;i<this.cur.length;i++) logChar(this.cur[i], this.cur[i] === given[i]);
    const v = document.getElementById("k-verdict");
    if(d.right === 5){ v.className = "verdict ok"; v.textContent = "Clean — 5 of 5."; }
    else {
      v.className = d.right >= 3 ? "verdict neutral" : "verdict bad";
      v.textContent = d.right + " of 5. Missed: " + this.cur.split("").filter((c,i) => c !== given[i]).join(" ");
    }
    if(!this.repeating){ this.right += d.right; this.total += d.total; }
    document.getElementById("m-now").textContent = this.total ? Math.round(100*this.right/this.total)+"%" : "—";
    if(P.repeatMissed && d.right < 5 && !this.repeating){
      this.repeating = true;
      v.textContent += "  — once more.";
      setTimeout(() => { if(this.running) this.send(); }, 1400);
      return;
    }
    this.repeating = false;
    this.idx++;
    if(this.idx >= this.groups.length){ setTimeout(() => this.finish(), 900); return; }
    setTimeout(() => { if(this.running) this.send(); }, d.right === 5 ? 800 : 1500);
  },
  finish(){
    this.running = false;
    const pct = Math.round(100*this.right/this.total);
    if(pct > (P.bestByLesson[P.lesson]||0)) P.bestByLesson[P.lesson] = pct;
    markToday();
    ["k-replay","k-slower","k-stop"].forEach(id => document.getElementById(id).disabled = true);
    document.getElementById("k-scopelab").textContent = "Lesson complete";
    paintEntry(document.getElementById("k-entry"), "", false, "lesson complete");
    const v = document.getElementById("k-verdict");
    if(pct >= 90) this.reach(4);
    if(pct >= 90 && P.lesson < KOCH.length - 1){
      const passed = P.lesson;
      P.lesson++;
      P.stageByLesson = P.stageByLesson || {};
      if(!P.stageByLesson[passed] || P.stageByLesson[passed] < 4) P.stageByLesson[passed] = 4;
      this.stage = 1;
      v.className = "verdict ok";
      v.textContent = pct + "% — passed. Lesson " + P.lesson + " is ready: " + this.chars().slice(-1)[0] + " is the new character.";
      save(); this.render();
      document.getElementById("k-readout").innerHTML = '<span class="ok">'+esc(this.chars().slice(-1)[0])+'</span>';
      return;
    }
    if(pct >= 90){
      v.className = "verdict ok";
      v.textContent = pct + "% — that is the entire character set. Move on to Words, Callsigns and QSO.";
    } else {
      v.className = pct >= 75 ? "verdict neutral" : "verdict bad";
      v.textContent = pct + "% — 90% unlocks the next character. Run it again, you are close.";
    }
    save(); this.render();
  },
  play(){
    if(this.stage === 1) this.playMeet();
    else if(this.stage === 2 && this.running) play(this.pickCur, {ewpm:S.ewpm});
    else if(this.stage === 3 && this.running) play(this.cur, {ewpm:S.ewpm});
    else if(this.stage === 4 && this.running) play(this.echoCur, {ewpm:S.ewpm});
  },
  stop(){
    this.halt();
    Keyer.release();
    this.echoPending = false;
    ["echo-hear","echo-skip","echo-stop"].forEach(id => {
      const e = document.getElementById(id); if(e) e.disabled = true;
    });
    document.getElementById("k-start").textContent = "Start";
    ["k-replay","k-slower","k-stop","pick-replay","pick-stop"].forEach(id => document.getElementById(id).disabled = true);
    document.getElementById("k-scopelab").textContent = "Listen";
    document.getElementById("k-verdict").className = "verdict neutral";
    document.getElementById("k-verdict").textContent = "Stopped. Press Start when you are ready.";
    document.getElementById("pick-v").className = "verdict neutral";
    document.getElementById("pick-v").textContent = "Stopped. Press Start when you are ready.";
    paintEntry(document.getElementById("k-entry"), "", false);
  }
};

document.getElementById("k-start").addEventListener("click", () => { Sig.resume(); Koch.start(); });
document.getElementById("k-stepper").addEventListener("click", e => {
  const b = e.target.closest("[data-step]");
  if(!b || b.disabled) return;
  Koch.go(+b.dataset.step);
});
document.getElementById("k-hear").addEventListener("click", e => {
  const b = e.target.closest("[data-hear]");
  if(b) play(b.dataset.hear, {ewpm: Math.min(S.cwpm, Math.max(S.ewpm, 10))});
});
document.getElementById("meet-again").addEventListener("click", () => Koch.playMeet());
document.getElementById("meet-next").addEventListener("click", () => Koch.meetNext());
document.getElementById("pick-replay").addEventListener("click", () => { if(Koch.running) play(Koch.pickCur, {ewpm:S.ewpm}); });
document.getElementById("pick-stop").addEventListener("click", () => Koch.stop());
document.getElementById("pick-keypad").addEventListener("click", e => {
  const b = e.target.closest("[data-k]"); if(!b) return;
  Sig.resume(); Koch.pickAnswer(b.dataset.k);
});
document.getElementById("k-replay").addEventListener("click", () => { if(Koch.running) play(Koch.cur, {ewpm:S.ewpm}); });
document.getElementById("k-slower").addEventListener("click", () => { if(Koch.running) play(Koch.cur, {ewpm:Math.max(4,S.ewpm-4)}); });
document.getElementById("k-stop").addEventListener("click", () => Koch.stop());
document.getElementById("k-keypad").addEventListener("click", e => {
  const b = e.target.closest("[data-k]"); if(!b) return;
  Sig.resume(); Koch.key(b.dataset.k);
});
document.getElementById("k-back").addEventListener("click", () => { if(P.lesson>1){ P.lesson--; Koch.stage = Koch.maxStage(); save(); Koch.render(); } });
document.getElementById("k-fwd").addEventListener("click",  () => { if(P.lesson<KOCH.length-1){ P.lesson++; Koch.stage = 1; save(); Koch.render(); } });

document.getElementById("echo-hear").addEventListener("click", () => {
  if(Koch.running) play(Koch.echoCur, {ewpm:S.ewpm});
});
document.getElementById("echo-skip").addEventListener("click", () => {
  if(Koch.running){ Koch.echoPending = false; Koch.askEcho(); }
});
document.getElementById("echo-stop").addEventListener("click", () => Koch.stop());

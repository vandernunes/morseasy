/* keyer.js — turns presses into Morse elements, then into characters.
   Part of Morse Easy. Loaded as a classic script; send.js and learn.js use it.

   One engine, two consumers: the Sending tab and the "Send it back" lesson
   step. Whoever is active calls claim() with its own callbacks.

   Timing-based keying is genuinely hard for a beginner: the difference between
   a dit and a dah is a threshold you cannot see. So the surface shows which
   one you are currently holding, live, and flips from dit to dah the instant
   you cross it. Watching that happen a dozen times teaches the timing far
   faster than being told the ratio.

   Keying speed is deliberately separate from listening speed. People copy
   faster than they can send, and at 20 wpm a dit has to be released inside
   120 ms, which is not a reasonable first target on a touchscreen.

   Vander Nunes - N5EDB */
"use strict";

const Keyer = {
  mode: "straight",          // "straight" | "paddle"
  elems: "",
  downAt: 0,
  lastUp: 0,
  keying: false,
  flush: null,
  wordFlush: null,
  previewTimer: null,
  dits: [],
  dahs: [],

  /* paddle state */
  ditDown: false,
  dahDown: false,
  running: false,
  lastElem: null,

  /* consumer callbacks */
  onElement: null,
  onChar: null,
  onWord: null,
  onPreview: null,           // ("dit" | "dah" | null) while a press is held

  wpm(){ return clamp(num(P.keyWpm, 13), 5, 40); },
  unit(){ return 1200 / this.wpm(); },
  threshold(){ return this.unit() * 2; },   // press longer than this is a dah

  claim(handlers){
    this.release();
    this.onElement = handlers.onElement || null;
    this.onChar    = handlers.onChar || null;
    this.onWord    = handlers.onWord || null;
    this.onPreview = handlers.onPreview || null;
    this.mode      = handlers.mode || "straight";
    this.reset();
  },
  release(){
    this.stopTimers();
    this.onElement = this.onChar = this.onWord = this.onPreview = null;
    this.keying = this.ditDown = this.dahDown = this.running = false;
  },
  reset(){
    this.stopTimers();
    this.elems = ""; this.dits = []; this.dahs = [];
    this.lastUp = 0; this.lastElem = null;
  },
  stopTimers(){
    clearTimeout(this.flush);
    clearTimeout(this.wordFlush);
    clearTimeout(this.previewTimer);
  },

  /* ---------------- straight key ---------------- */
  down(){
    if(this.keying) return;
    this.keying = true;
    const now = performance.now();
    if(this.lastUp){
      const gap = now - this.lastUp;
      if(gap > this.unit() * 2.2) this.commitChar();
      if(gap > this.unit() * 5.5) this.commitWord();
    }
    this.downAt = now;
    this.stopTimers();
    Sig.keyDown();
    lampEl().classList.add("on");
    /* Show what the press currently counts as, and flip it the moment the
       press becomes long enough. This is the whole trick. */
    if(this.onPreview){
      this.onPreview("dit");
      this.previewTimer = setTimeout(() => {
        if(this.keying && this.onPreview) this.onPreview("dah");
      }, this.threshold());
    }
  },
  up(){
    if(!this.keying) return;
    this.keying = false;
    const dur = performance.now() - this.downAt;
    this.lastUp = performance.now();
    Sig.keyUp();
    lampEl().classList.remove("on");
    clearTimeout(this.previewTimer);
    if(this.onPreview) this.onPreview(null);
    if(dur < 15) return;                       // stray tap, not a press
    if(dur < this.threshold()){ this.elems += "."; this.dits.push(dur); }
    else { this.elems += "-"; this.dahs.push(dur); }
    if(this.onElement) this.onElement(this.elems);
    this.armFlush();
  },

  /* ---------------- iambic paddle ---------------- */
  padDown(which){
    if(which === "dit") this.ditDown = true; else this.dahDown = true;
    if(!this.running) this.tick();
  },
  padUp(which){
    if(which === "dit") this.ditDown = false; else this.dahDown = false;
  },
  tick(){
    const u = this.unit();
    let next = null;
    if(this.ditDown && this.dahDown) next = this.lastElem === "." ? "-" : ".";
    else if(this.ditDown) next = ".";
    else if(this.dahDown) next = "-";
    if(!next){
      this.running = false; this.lastElem = null;
      if(this.onPreview) this.onPreview(null);
      this.armFlush();
      return;
    }
    this.running = true;
    this.lastElem = next;
    const dur = next === "." ? u : u * 3;
    Sig.keyDown();
    lampEl().classList.add("on");
    if(this.onPreview) this.onPreview(next === "." ? "dit" : "dah");
    this.stopTimers();
    setTimeout(() => {
      Sig.keyUp();
      lampEl().classList.remove("on");
      this.elems += next;
      if(next === ".") this.dits.push(dur); else this.dahs.push(dur);
      if(this.onElement) this.onElement(this.elems);
      setTimeout(() => this.tick(), u);
    }, dur);
  },

  /* ---------------- assembly ---------------- */
  armFlush(){
    clearTimeout(this.flush);
    clearTimeout(this.wordFlush);
    this.flush     = setTimeout(() => this.commitChar(), this.unit() * 2.6);
    this.wordFlush = setTimeout(() => this.commitWord(), this.unit() * 6.5);
  },
  commitChar(){
    if(!this.elems) return;
    const ch = REV[this.elems] || "·";
    this.elems = "";
    if(this.onElement) this.onElement("");
    if(this.onChar) this.onChar(ch);
  },
  commitWord(){
    this.commitChar();
    if(this.onWord) this.onWord();
  },

  /* average dit length and the dah:dit ratio, for the fist meters */
  stats(){
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const d = avg(this.dits), h = avg(this.dahs);
    return {dit: d, dah: h, ratio: (d && h) ? h / d : 0, wpm: d ? 1200 / d : 0};
  }
};

/* Binds a keying surface. Any element with data-key="straight" acts as a
   straight key; data-key="dit" / "dah" act as paddle levers. Pointer events
   cover mouse, touch and stylus in one path. */
function bindKeySurface(root){
  if(!root || root.dataset.keyBound) return;
  root.dataset.keyBound = "1";

  const start = e => {
    const el = e.target.closest("[data-key]");
    if(!el) return;
    e.preventDefault();
    Sig.resume();
    el.classList.add("down");
    if(el.dataset.key === "straight") Keyer.down();
    else Keyer.padDown(el.dataset.key);
    if(navigator.vibrate) { try{ navigator.vibrate(8); }catch(err){} }
  };
  const end = e => {
    const el = e.target.closest("[data-key]");
    if(!el) return;
    e.preventDefault();
    el.classList.remove("down");
    if(el.dataset.key === "straight") Keyer.up();
    else Keyer.padUp(el.dataset.key);
  };
  /* iOS raises the selection magnifier and a Copy bubble on a long press,
     which is exactly what keying a dah is. -webkit-touch-callout in the CSS
     handles it on Safari; these stop any browser starting a selection or a
     context menu from the same gesture. */
  root.addEventListener("selectstart", e => e.preventDefault());
  root.addEventListener("dragstart", e => e.preventDefault());
  root.addEventListener("touchstart", e => { if(e.cancelable) e.preventDefault(); }, {passive:false});
  root.addEventListener("touchmove", e => { if(e.cancelable) e.preventDefault(); }, {passive:false});

  root.addEventListener("pointerdown", start);
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);
  root.addEventListener("pointerleave", end);
  root.addEventListener("contextmenu", e => e.preventDefault());
}

/* Paints the live "you are holding a dit / a dah" mark on a surface. */
function keyPreview(markEl, hintEl, kind){
  if(!markEl) return;
  markEl.classList.toggle("is-dah", kind === "dah");
  markEl.classList.toggle("is-live", !!kind);
  markEl.textContent = kind === "dah" ? "—" : "·";
  if(hintEl){
    hintEl.textContent = kind === "dah" ? "dah — let go"
      : kind === "dit" ? "dit — hold longer for a dah"
      : "hold to key";
  }
}

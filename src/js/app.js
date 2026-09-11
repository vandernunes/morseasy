/* app.js — Mode switching, global keys, boot
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

let currentMode = "learn";
function setMode(m){
  currentMode = m;
  stopPlay();
  if(Koch.running) Koch.stop();
  if(Words.running) Words.stop();
  if(Calls.running) Calls.stop();
  if(typeof endYourTurn === "function" && Q.awaiting) endYourTurn();
  document.querySelectorAll(".mbtn").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
  document.querySelectorAll(".pane").forEach(p => p.hidden = (p.id !== "pane-"+m));
  window.scrollTo(0,0);
}
document.querySelector(".modes").addEventListener("click", e => {
  const b = e.target.closest(".mbtn"); if(b) setMode(b.dataset.mode);
});

function activeDrill(){
  if(currentMode === "learn" && (Koch.running || Koch.stage === 1)) return Koch;
  if(currentMode === "words" && Words.running) return Words;
  if(currentMode === "calls" && Calls.running) return Calls;
  return null;
}
document.addEventListener("keydown", e => {
  if(document.querySelector("dialog[open]")) return;
  const tag = (e.target.tagName||"").toLowerCase();
  if(tag === "input" || tag === "textarea") return;

  /* Whichever key surface is live owns the keyboard: the Sending tab, or the
     Send it back step inside a lesson. */
  if(keyingActive()){
    if(e.key === "Escape"){
      e.preventDefault();
      if(currentMode === "learn" && Koch.running) Koch.stop();
      return;
    }
    const straight = (P.keyMode || "straight") === "straight";
    if(straight){
      if(e.key === " " || e.key === "Spacebar" || e.code === "Space" || e.key === "\\"){
        e.preventDefault();
        if(!held.has("s")){ held.add("s"); markKey(true); Keyer.down(); }
      }
    } else {
      if(e.key === "ArrowLeft" || e.key === "z" || e.key === "Z"){
        e.preventDefault(); if(!held.has("d")){ held.add("d"); Keyer.padDown("dit"); }
      }
      if(e.key === "ArrowRight" || e.key === "x" || e.key === "X"){
        e.preventDefault(); if(!held.has("h")){ held.add("h"); Keyer.padDown("dah"); }
      }
    }
    return;
  }

  const D = activeDrill();
  if(e.key === "Escape"){
    if(D){ e.preventDefault(); D.stop(); }
    return;
  }
  if(e.key === " "){
    e.preventDefault();
    if(D) D.play ? D.play() : play(D.cur, {ewpm:S.ewpm});
    return;
  }
  if(!D) return;
  if(e.key === "Enter"){ e.preventDefault(); D.check(); return; }
  if(e.key === "Backspace"){ e.preventDefault(); D.key("BS"); return; }
  const k = e.key.toUpperCase();
  if(k.length === 1 && /[A-Z0-9.,?/]/.test(k)){ e.preventDefault(); D.key(k); }
});

const held = new Set();

/* True when a key surface is on screen and ready to be keyed. */
function keyingActive(){
  if(currentMode === "send") return true;
  if(currentMode === "learn" && Koch.stage === 4) return true;
  if(currentMode === "qso" && Q.awaiting) return true;
  return false;
}
function markKey(down){
  document.querySelectorAll('.keysurface[data-key="straight"]')
    .forEach(el => el.classList.toggle("down", down));
}

document.addEventListener("keyup", e => {
  if(e.key === " " || e.key === "Spacebar" || e.code === "Space" || e.key === "\\"){
    if(held.delete("s")){ markKey(false); Keyer.up(); }
  }
  if(e.key === "ArrowLeft" || e.key === "z" || e.key === "Z"){ if(held.delete("d")) Keyer.padUp("dit"); }
  if(e.key === "ArrowRight" || e.key === "x" || e.key === "X"){ if(held.delete("h")) Keyer.padUp("dah"); }
});

function renderIdentity(){
  const me = P.call || "";
  document.getElementById("mycall").textContent = me || "MORSE";
  document.getElementById("mysub").textContent = me ? "code practice" : "easy";
  document.getElementById("foot-id").textContent = me
    ? me + " · " + [P.rig, P.qth].filter(Boolean).join(" · ")
    : "Free. No account, no tracking, nothing to install.";
  document.title = me ? me + " · Morse Easy" : "Morse Easy";
  renderScript(); renderQso();
  Send.showTarget();
}
function renderAll(){
  applyTheme();
  renderSpeeds(); renderIdentity();
  Koch.render(); renderWordSets(); renderCallSets();
  Q.work = !!P.qsoWork;
  renderQsoMode(); renderQsoPicker(); renderQso();
  Send.setKey = SEND_SETS[P.sendSet] ? P.sendSet : "common";
  Send.memory = !!P.sendMemory;
  Send.mode = P.keyMode || "straight";
  renderSendSets(); renderSend();
  Words.pad(); Calls.pad(); Words.show(); Calls.show();
  Send.paint();
}

loadLocal();
Koch.stage = Koch.maxStage();
Words.setKey = "core"; Calls.setKey = "mine";
renderAll();
paintEntry(document.getElementById("k-entry"), "", false);
paintEntry(document.getElementById("w-entry"), "", false);
paintEntry(document.getElementById("c-entry"), "", false);

const setTop = () => document.documentElement.style.setProperty("--top-h", document.getElementById("rigtop").offsetHeight + "px");
setTop();
window.addEventListener("resize", setTop);

if(!P.seenHelp) setTimeout(() => dlgHelp.showModal(), 400);

["pointerdown","keydown"].forEach(ev =>
  document.addEventListener(ev, function once(){ Sig.resume(); document.removeEventListener(ev, once); }, {once:true}));

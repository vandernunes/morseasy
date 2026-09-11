/* app.js — Mode switching, global keys, boot
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

let currentMode = "home";
function setMode(m){
  currentMode = m;
  stopEverything();
  if(Koch.running) Koch.stop();
  if(Drill.running) Drill.stop();
  if(typeof endYourTurn === "function" && Q.awaiting) endYourTurn();
  document.querySelectorAll(".mbtn").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
  document.querySelectorAll(".pane").forEach(p => p.hidden = (p.id !== "pane-"+m));
  if(m === "home" && typeof renderHome === "function") renderHome();
  window.scrollTo(0,0);
}
document.querySelector(".modes").addEventListener("click", e => {
  const b = e.target.closest(".mbtn"); if(b) setMode(b.dataset.mode);
});

function activeDrill(){
  if(currentMode === "learn" && (Koch.running || Koch.stage === 1)) return Koch;
  if(currentMode === "drills" && Drill.running) return Drill;
  return null;
}
document.addEventListener("keydown", e => {
  if(document.querySelector("dialog[open]")) return;
  const tag = (e.target.tagName||"").toLowerCase();
  if(tag === "input" || tag === "textarea") return;

  /* Whichever key surface is live owns the keyboard: the Sending tab, or the
     Send it back step inside a lesson. */
  if(keyingActive()){
    if(e.key === "Escape"){ e.preventDefault(); stopEverything(); return; }
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
  if(e.key === "Escape"){ e.preventDefault(); stopEverything(); return; }
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

/* ---------------------------------------------------------------------------
   One way to stop everything.

   Audio can be started from a dozen places - a lesson, a drill, a QSO line, a
   reference chart - and until now the only way out of a running lesson was to
   let it finish. Escape works everywhere, and a Stop button appears above the
   tab bar whenever something is actually running, so there is always a visible
   way out within thumb reach.
   --------------------------------------------------------------------------- */
function anythingRunning(){
  return isPlaying() ||
         (typeof Koch !== "undefined" && Koch.running) ||
         (typeof Drill !== "undefined" && Drill.running) ||
         (typeof Q !== "undefined" && Q.awaiting);
}
function stopEverything(){
  stopPlay();
  if(typeof Koch !== "undefined" && (Koch.running || Koch.stage === 4)) Koch.stop();
  if(typeof Drill !== "undefined" && Drill.running) Drill.stop();
  if(typeof Q !== "undefined" && Q.awaiting && typeof endYourTurn === "function") endYourTurn();
  if(typeof Keyer !== "undefined") Keyer.release();
  /* Releasing the keyer is right for a lesson or a QSO turn that was cut
     short, but the Sending tab's key must stay live - stopping the audio
     there should not also kill the thing you are pressing. */
  if(currentMode === "send" && typeof Send !== "undefined") Send.claim();
  syncStopBar();
}
function syncStopBar(){
  const bar = document.getElementById("stopbar");
  if(bar) bar.hidden = !anythingRunning();
}
document.getElementById("stopbtn").addEventListener("click", stopEverything);
setInterval(syncStopBar, 250);

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
  if(typeof renderHome === "function") renderHome();
  renderSpeeds(); renderIdentity();
  Koch.render();
  Drill.setKey = DRILL_SETS[P.drillSet] ? P.drillSet : "core";
  renderDrillSets();
  buildKeypad(document.getElementById("d-keypad"), DRILL_KEYS, {enter:true});
  Drill.show();
  Q.work = !!P.qsoWork;
  renderQsoMode(); renderQsoPicker(); renderQso();
  Send.setKey = SEND_SETS[P.sendSet] ? P.sendSet : "common";
  Send.memory = !!P.sendMemory;
  Send.mode = P.keyMode || "straight";
  renderSendSets(); renderSend();
  Send.paint();
}

loadLocal();
Koch.stage = Koch.maxStage();
renderAll();
paintEntry(document.getElementById("k-entry"), "", false);
paintEntry(document.getElementById("d-entry"), "", false);

const setTop = () => document.documentElement.style.setProperty("--top-h", document.getElementById("rigtop").offsetHeight + "px");
setTop();
window.addEventListener("resize", setTop);

if(!P.seenHelp) setTimeout(() => dlgHelp.showModal(), 400);

if(typeof checkTransferLink === "function") checkTransferLink();

["pointerdown","keydown"].forEach(ev =>
  document.addEventListener(ev, function once(){ Sig.resume(); document.removeEventListener(ev, once); }, {once:true}));

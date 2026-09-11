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

  /* sending mode owns the keyboard */
  if(currentMode === "send"){
    if(Send.mode === "straight"){
      if(e.key === " " || e.key === "\\"){
        e.preventDefault();
        if(!held.has("s")){ held.add("s"); document.querySelector('.pad[data-pad="key"]')?.classList.add("down"); Send.sDown(); }
      }
    } else {
      if(e.key === "ArrowLeft" || e.key === "z" || e.key === "Z"){ e.preventDefault(); if(!held.has("d")){ held.add("d"); Send.padDown("dit"); } }
      if(e.key === "ArrowRight" || e.key === "x" || e.key === "X"){ e.preventDefault(); if(!held.has("h")){ held.add("h"); Send.padDown("dah"); } }
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
document.addEventListener("keyup", e => {
  if(e.key === " " || e.key === "\\"){
    if(held.delete("s")){ document.querySelector('.pad[data-pad="key"]')?.classList.remove("down"); Send.sUp(); }
  }
  if(e.key === "ArrowLeft" || e.key === "z" || e.key === "Z"){ if(held.delete("d")) Send.padUp("dit"); }
  if(e.key === "ArrowRight" || e.key === "x" || e.key === "X"){ if(held.delete("h")) Send.padUp("dah"); }
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
  Send.target = sub(Send.raw);
  document.getElementById("s-target").textContent = Send.target;
}
function renderAll(){
  renderSpeeds(); renderIdentity();
  Koch.render(); renderWordSets(); renderCallSets();
  renderQsoPicker(); renderQso(); renderSend();
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

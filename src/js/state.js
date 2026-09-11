/* state.js — Settings, progress and persistence
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const KEY = "morseasy-v1";

/* Applied before anything renders. Reading the saved theme later means the
   page paints dark first and then flips, which is worse than either theme. */
(function noFlash(){
  try{
    const raw = localStorage.getItem(KEY);
    const t = raw && JSON.parse(raw).theme;
    if(t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  }catch(e){}
})();
const P = {
  call:"", name:"", qth:"", rig:"",
  lesson:1, stageByLesson:{}, bestByLesson:{}, charErr:{}, charOk:{}, sentOk:0,
  days:{}, seenHelp:false, theme:"system",
  groupsPerLesson:8, showPad:true, repeatMissed:true,
  updatedAt:0
};

function num(v,d){ const n = parseFloat(v); return isFinite(n) ? n : d; }
function clamp(n,a,b){ return Math.min(b, Math.max(a, n)); }
function loadLocal(){
  try{ const raw = localStorage.getItem(KEY); if(raw) Object.assign(P, JSON.parse(raw)); }catch(e){}
  // Storage is not a trusted source: it survives across versions and will later
  // be writable by progress import. Re-clean the free-text fields on every load.
  P.call = cleanField(P.call || "", 12);
  P.name = cleanField(P.name || "", 20);
  P.qth  = cleanField(P.qth  || "", 20);
  P.rig  = cleanField(P.rig  || "", 20);
  try{
    S.cwpm = clamp(num(localStorage.getItem(KEY+"-cwpm"), 20), 13, 35);
    S.ewpm = clamp(num(localStorage.getItem(KEY+"-ewpm"), 8), 4, 35);
    S.tone = clamp(num(localStorage.getItem(KEY+"-tone"), 600), 400, 1000);
    S.vol  = clamp(num(localStorage.getItem(KEY+"-vol"), 30), 0, 100) / 100;
  }catch(e){}
}
function save(){
  P.updatedAt = Date.now();
  try{ localStorage.setItem(KEY, JSON.stringify(P)); }catch(e){}
}
function saveSettings(){
  try{
    localStorage.setItem(KEY+"-cwpm", S.cwpm);
    localStorage.setItem(KEY+"-ewpm", S.ewpm);
    localStorage.setItem(KEY+"-tone", S.tone);
    localStorage.setItem(KEY+"-vol", Math.round(S.vol*100));
  }catch(e){}
}
function ymd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function markToday(){
  const k = ymd(new Date());
  P.days = P.days || {};
  P.days[k] = (P.days[k]||0) + 1;
}
function dayStreak(){
  const days = P.days || {};
  const d = new Date();
  let n = 0;
  if(!days[ymd(d)]) d.setDate(d.getDate()-1);
  while(days[ymd(d)]){ n++; d.setDate(d.getDate()-1); }
  return n;
}


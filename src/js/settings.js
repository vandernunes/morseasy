/* settings.js — Speed presets and the settings dialog
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const PRESETS = [
  {id:"crawl",  label:"Crawl",  c:18, e:5,  note:"first days"},
  {id:"slow",   label:"Slow",   c:20, e:8,  note:"learning"},
  {id:"steady", label:"Steady", c:20, e:11, note:"getting it"},
  {id:"normal", label:"Normal", c:20, e:15, note:"on the air"},
  {id:"fast",   label:"Fast",   c:25, e:20, note:"contest"},
];
function currentPreset(){
  const p = PRESETS.find(p => p.c === S.cwpm && p.e === S.ewpm);
  return p ? p.id : "custom";
}
function renderSpeeds(){
  const cur = currentPreset();
  document.getElementById("speedbar").innerHTML =
    '<span class="sp-lab">Speed</span>' +
    PRESETS.map(p => '<button class="spd" data-preset="'+p.id+'" aria-pressed="'+(cur===p.id)+'" title="'+p.c+' wpm characters, '+p.e+' wpm overall — '+p.note+'">'+p.label+'</button>').join("") +
    (cur === "custom" ? '<button class="spd" aria-pressed="true" data-preset="custom">'+S.cwpm+'/'+S.ewpm+'</button>' : "");
}
document.getElementById("speedbar").addEventListener("click", e => {
  const b = e.target.closest("[data-preset]");
  if(!b) return;
  if(b.dataset.preset === "custom"){ openSettings(); return; }
  const p = PRESETS.find(x => x.id === b.dataset.preset);
  if(!p) return;
  S.cwpm = p.c; S.ewpm = p.e;
  syncSettingInputs(); saveSettings(); renderSpeeds();
});

/* Three states, matching what the viewer actually has: follow the device,
   force light, force dark. "system" stamps nothing on <html> so the CSS
   prefers-color-scheme query decides; the other two stamp data-theme and win
   over it in both directions. */
const THEMES = [
  {id:"system", glyph:"\u25d0", label:"following your device"},
  {id:"light",  glyph:"\u2600", label:"light"},
  {id:"dark",   glyph:"\u263e", label:"dark"}
];
function applyTheme(){
  const t = THEMES.find(x => x.id === P.theme) || THEMES[0];
  if(t.id === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t.id;
  const btn = document.getElementById("themebtn");
  if(btn){
    btn.textContent = t.glyph;
    btn.title = "Theme: " + t.label + " — tap to change";
  }
  // keep the browser chrome (address bar, notch) in step with the page
  const dark = t.id === "dark" ||
    (t.id === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  let m = document.querySelector('meta[name="theme-color"]');
  if(!m){ m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
  m.content = dark ? "#0A0D0F" : "#F7F5F2";
}
function cycleTheme(){
  const i = THEMES.findIndex(x => x.id === P.theme);
  P.theme = THEMES[(i + 1) % THEMES.length].id;
  save(); applyTheme();
}
document.getElementById("themebtn").addEventListener("click", cycleTheme);
// while on "system", follow the device if it flips mid-session
window.matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => { if(P.theme === "system") applyTheme(); });

const dlgSet = document.getElementById("dlg-set");
const dlgHelp = document.getElementById("dlg-help");
function openSettings(){ syncSettingInputs(); renderOffline(); dlgSet.showModal(); }
document.getElementById("gearbtn").addEventListener("click", openSettings);
document.getElementById("brandbtn").addEventListener("click", openSettings);
document.getElementById("helpbtn").addEventListener("click", () => dlgHelp.showModal());
document.getElementById("set-close").addEventListener("click", () => dlgSet.close());
document.getElementById("f-call2").addEventListener("input", e => {
  P.call = cleanField(e.target.value, 12).trim();
  save(); renderIdentity();
});
document.getElementById("help-close").addEventListener("click", () => { dlgHelp.close(); P.seenHelp = true; save(); });
dlgHelp.addEventListener("close", () => { if(!P.seenHelp){ P.seenHelp = true; save(); } });

function syncSettingInputs(){
  document.getElementById("f-call").value = P.call || "";
  document.getElementById("f-name").value = P.name || "";
  document.getElementById("f-qth").value  = P.qth || "";
  document.getElementById("f-rig").value  = P.rig || "";
  const set = (id, v, fmt) => {
    document.getElementById(id).value = v;
    document.getElementById("v-"+id).textContent = fmt(v);
  };
  set("cwpm", S.cwpm, v => v+" wpm");
  set("ewpm", S.ewpm, v => v+" wpm");
  set("tone", S.tone, v => v+" Hz");
  set("vol", Math.round(S.vol*100), v => v+"%");
  const kw = document.getElementById("keywpm");
  kw.value = clamp(num(P.keyWpm, 13), 5, 30);
  document.getElementById("v-keywpm").textContent = kw.value + " wpm";
  document.getElementById("f-keymode").innerHTML = [["straight","Straight key"],["paddle","Iambic paddle"]]
    .map(([v,l]) => '<button data-km2="'+v+'" aria-pressed="'+((P.keyMode||"straight")===v)+'">'+l+'</button>').join("");
  document.getElementById("f-len").innerHTML = [5,8,12,20]
    .map(n => '<button data-len="'+n+'" aria-pressed="'+(P.groupsPerLesson===n)+'">'+n+'</button>').join("");
  document.getElementById("f-pad").innerHTML = [["on","Show"],["off","Hide"]]
    .map(([v,l]) => '<button data-pad="'+v+'" aria-pressed="'+((v==="on")===!!P.showPad)+'">'+l+'</button>').join("");
  document.getElementById("f-rep").innerHTML = [["on","Yes"],["off","No"]]
    .map(([v,l]) => '<button data-rep="'+v+'" aria-pressed="'+((v==="on")===!!P.repeatMissed)+'">'+l+'</button>').join("");
}
function bindRange(id, key, fmt){
  const el = document.getElementById(id), out = document.getElementById("v-"+id);
  el.addEventListener("input", () => {
    const v = parseFloat(el.value);
    S[key] = key === "vol" ? v/100 : v;
    out.textContent = fmt(v);
    if(key === "tone" && Sig.osc) Sig.osc.frequency.setTargetAtTime(v, Sig.now(), 0.01);
    if(key === "vol" && Sig.master) Sig.master.gain.setTargetAtTime(v/100, Sig.now(), 0.01);
    if(S.ewpm > S.cwpm){
      S.ewpm = S.cwpm;
      document.getElementById("ewpm").value = S.ewpm;
      document.getElementById("v-ewpm").textContent = S.ewpm+" wpm";
    }
    saveSettings(); renderSpeeds();
  });
}
bindRange("cwpm","cwpm", v => v+" wpm");
bindRange("ewpm","ewpm", v => v+" wpm");
bindRange("tone","tone", v => v+" Hz");
bindRange("vol","vol",  v => v+"%");
document.getElementById("keywpm").addEventListener("input", e => {
  P.keyWpm = clamp(num(e.target.value, 13), 5, 30);
  document.getElementById("v-keywpm").textContent = P.keyWpm + " wpm";
  save();
});

["f-call","f-name","f-qth","f-rig"].forEach(id => {
  document.getElementById(id).addEventListener("input", e => {
    const v = cleanField(e.target.value, id === "f-call" ? 12 : 20).trim();
    if(id === "f-call") P.call = v;
    if(id === "f-name") P.name = v;
    if(id === "f-qth")  P.qth = v;
    if(id === "f-rig")  P.rig = v;
    save(); renderIdentity();
  });
});
document.getElementById("f-keymode").addEventListener("click", e => {
  const b = e.target.closest("[data-km2]"); if(!b) return;
  P.keyMode = b.dataset.km2; save(); syncSettingInputs();
  if(typeof Send !== "undefined"){ Send.mode = P.keyMode; renderSend(); Send.clear(); }
  if(typeof Koch !== "undefined" && Koch.stage === 4 && Koch.running) Koch.renderEchoPads();
});
document.getElementById("f-len").addEventListener("click", e => {
  const b = e.target.closest("[data-len]"); if(!b) return;
  P.groupsPerLesson = +b.dataset.len; save(); syncSettingInputs(); Koch.render();
});
document.getElementById("f-pad").addEventListener("click", e => {
  const b = e.target.closest("[data-pad]"); if(!b) return;
  P.showPad = b.dataset.pad === "on"; save(); syncSettingInputs(); renderAll();
});
document.getElementById("f-rep").addEventListener("click", e => {
  const b = e.target.closest("[data-rep]"); if(!b) return;
  P.repeatMissed = b.dataset.rep === "on"; save(); syncSettingInputs();
});
document.getElementById("f-reset").addEventListener("click", () => {
  if(!confirm("Reset lesson progress and all statistics? Your callsign and speed settings are kept.")) return;
  P.lesson = 1; P.bestByLesson = {}; P.charErr = {}; P.charOk = {}; P.sentOk = 0; P.days = {};
  save(); renderAll(); dlgSet.close();
});

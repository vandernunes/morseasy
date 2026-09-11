/* ui.js — Shared render helpers: entry buffer, keypad, diff
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function patSpaced(p){ return p.split("").join(" "); }
function sayPattern(p){ return p.split("").map((c,i,a) => c === "." ? (i===a.length-1?"dit":"di") : "dah").join("-"); }
function sub(s){
  return String(s)
    .replace(/\{ME\}/g, P.call || "W1ABC")
    .replace(/\{NAME\}/g, P.name || "ALEX")
    .replace(/\{QTH\}/g, P.qth || "DENVER CO")
    .replace(/\{RIG\}/g, P.rig || "AN IC-7300");
}
function diffMarkup(target, given){
  const T = String(target).replace(/\s+/g,""), G = String(given).toUpperCase().replace(/\s+/g,"");
  let html = "", right = 0;
  const n = Math.max(T.length, G.length);
  for(let i=0;i<n;i++){
    const t = T[i], g = G[i];
    if(t && g && t === g){ html += '<span class="ok">'+esc(t)+'</span>'; right++; }
    else if(t){ html += '<span class="bad">'+esc(t)+'</span>'; }
    else { html += '<span class="bad">&middot;</span>'; }
  }
  return {html, right, total:T.length};
}
function logChar(ch, ok){
  if(!/[A-Z0-9.,?/]/.test(ch)) return;
  if(ok) P.charOk[ch] = (P.charOk[ch]||0)+1;
  else P.charErr[ch] = (P.charErr[ch]||0)+1;
}

/* buffer display shared by every listen-and-type drill */
function paintEntry(el, text, live, placeholder){
  if(!text){
    el.innerHTML = live
      ? '<span class="caret"></span>'
      : '<span class="ph">'+esc(placeholder || "your copy appears here")+'</span>';
  } else {
    el.innerHTML = esc(text) + (live ? '<span class="caret"></span>' : "");
  }
  el.classList.toggle("live", !!live);
}

/* on-screen keypad */
function buildKeypad(el, chars, opts){
  opts = opts || {};
  if(!P.showPad){ el.innerHTML = ""; el.hidden = true; return; }
  el.hidden = false;
  let html = chars.map(c => '<button class="key" data-k="'+esc(c)+'">'+esc(c)+'</button>').join("");
  html += '<button class="key util" data-k="BS">&#9003;</button>';
  if(opts.enter) html += '<button class="key go" data-k="OK">&#10003;</button>';
  el.innerHTML = html;
}

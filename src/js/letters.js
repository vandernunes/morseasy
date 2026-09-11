/* letters.js — Tap-to-hear character charts
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

function buildAlpha(el, list, withMnemonic){
  el.innerHTML = list.map(ch => {
    const p = MORSE[ch];
    return '<button class="acell" data-ch="'+esc(ch)+'">'
      + '<span class="a-ch">'+esc(ch)+'</span>'
      + '<span class="a-pat">'+patSpaced(p)+'</span>'
      + '<span class="a-mn">'+(withMnemonic && MNEMONIC[ch] ? esc(MNEMONIC[ch]) : sayPattern(p))+'</span></button>';
  }).join("");
}
buildAlpha(document.getElementById("a-letters"), L.split(""), true);
buildAlpha(document.getElementById("a-numbers"), DG.split(""), false);
buildAlpha(document.getElementById("a-punct"), [".",",","?","/","=","+","-",":","'","\"","(",")","@"], false);
document.addEventListener("click", e => {
  const c = e.target.closest(".acell");
  if(c) play(c.dataset.ch, {ewpm: Math.min(S.cwpm, Math.max(S.ewpm, 10))});
});

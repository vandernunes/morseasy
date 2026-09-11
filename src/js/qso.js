/* qso.js — Simulated contacts, played line by line
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const Q = {idx:0, cur:0, open:{}};
function renderQsoPicker(){
  document.getElementById("q-picker").innerHTML = QSOS.map((q,i) =>
    '<button class="btn sm '+(i===Q.idx?"primary":"ghost")+'" data-q="'+i+'">'+esc(q.label)+'</button>').join("");
}
function renderQso(){
  const q = QSOS[Q.idx], me = P.call || "N5EDB";
  document.getElementById("q-lines").innerHTML = q.lines.map((l,i) => {
    const mine = l.who === "{ME}";
    const hide = !mine && !Q.open[i];
    return '<button class="qline '+(mine?"mine":"theirs")+(i===Q.cur-1?" playing":"")+'" data-line="'+i+'">'
      + '<span class="q-who">'+esc(sub(l.who))+(mine?" — you":"")+(hide?'<span class="q-tap">tap to reveal</span>':"")+'</span>'
      + '<span class="q-txt'+(hide?" hidden":"")+'">'+esc(sub(l.t))+'</span>'
      + '<span class="q-en">'+esc(sub(l.en))+'</span></button>';
  }).join("");
  document.getElementById("q-mine").textContent = q.lines.filter(l => l.who === "{ME}").map(l => sub(l.t)).join("\n\n");
  document.getElementById("q-verdict").className = "verdict neutral";
  if(Q.cur === 0) document.getElementById("q-verdict").textContent = q.blurb;
  document.getElementById("q-play").textContent = Q.cur >= q.lines.length ? "Contact complete" : (Q.cur === 0 ? "Play first line" : "Play next line");
  document.getElementById("q-play").disabled = Q.cur >= q.lines.length;
  document.getElementById("q-rt").textContent = Q.cur + " / " + q.lines.length + " lines";
}
function qPlayLine(i){
  const q = QSOS[Q.idx], l = q.lines[i];
  if(!l) return;
  const ro = document.getElementById("q-readout");
  ro.innerHTML = '<span class="pend">receiving</span>';
  play(sub(l.t), {
    ewpm:S.ewpm,
    onDone(){
      ro.innerHTML = Q.open[i] ? esc(sub(l.t)) : '<span class="pend">line sent — tap it below to check</span>';
      document.getElementById("q-verdict").className = "verdict neutral";
      document.getElementById("q-verdict").textContent = sub(l.en);
    }
  });
}
document.getElementById("q-picker").addEventListener("click", e => {
  const b = e.target.closest("[data-q]"); if(!b) return;
  stopPlay(); Q.idx = +b.dataset.q; Q.cur = 0; Q.open = {};
  renderQsoPicker(); renderQso();
  document.getElementById("q-readout").innerHTML = '<span class="pend">standing by</span>';
});
document.getElementById("q-play").addEventListener("click", () => {
  const q = QSOS[Q.idx];
  if(Q.cur >= q.lines.length) return;
  const i = Q.cur; Q.cur++;
  if(q.lines[i].who === "{ME}") Q.open[i] = true;
  renderQso();
  document.getElementById("q-replay").disabled = false;
  qPlayLine(i);
  markToday();
});
document.getElementById("q-replay").addEventListener("click", () => { if(Q.cur>0) qPlayLine(Q.cur-1); });
document.getElementById("q-revealall").addEventListener("click", () => {
  const all = QSOS[Q.idx].lines.every((l,i) => Q.open[i]);
  QSOS[Q.idx].lines.forEach((l,i) => { Q.open[i] = !all; });
  document.getElementById("q-revealall").textContent = all ? "Reveal all" : "Hide all";
  renderQso();
});
document.getElementById("q-reset").addEventListener("click", () => {
  stopPlay(); Q.cur = 0; Q.open = {};
  document.getElementById("q-revealall").textContent = "Reveal all";
  document.getElementById("q-readout").innerHTML = '<span class="pend">standing by</span>';
  renderQso();
});
document.getElementById("q-lines").addEventListener("click", e => {
  const b = e.target.closest("[data-line]"); if(!b) return;
  const i = +b.dataset.line;
  Q.open[i] = !Q.open[i];
  renderQso();
});

/* qso.js — Simulated contacts, played line by line
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const Q = {idx:0, cur:0, open:{}, work:false, awaiting:false, need:"", sent:"", lastMine:null};

/* Two ways through a contact.

   Listen: every line is played and you copy it in your head.

   Work it: their side is played, and when it is your turn you KEY your reply.
   Nothing advances until you send it, which is exactly the pressure of a real
   contact - the other operator is waiting.

   The scripts are deliberately verbose because that is how people actually pad
   a QSO, but requiring a beginner to key 120 characters without a mistake
   would be punishing and would teach nothing extra. Each of your turns carries
   a `send` field: the part the contact would genuinely fail without - the
   callsigns, the report, the name, the QTH, the 73. That is what is checked. */
function renderQsoMode(){
  document.getElementById("q-mode").innerHTML =
    ['<button class="btn sm '+(!Q.work?"primary":"ghost")+'" data-qmode="listen">Listen</button>',
     '<button class="btn sm '+(Q.work?"primary":"ghost")+'" data-qmode="work">Work it &mdash; you key back</button>'
    ].join("");
}
document.getElementById("q-mode").addEventListener("click", e => {
  const b = e.target.closest("[data-qmode]");
  if(!b) return;
  Q.work = b.dataset.qmode === "work";
  P.qsoWork = Q.work; save();
  renderQsoMode(); resetQso();
});

function qsoNeedsYou(i){
  const l = QSOS[Q.idx].lines[i];
  return Q.work && l && l.who === "{ME}" && l.send;
}

function startYourTurn(i){
  const l = QSOS[Q.idx].lines[i];
  Q.awaiting = true;
  Q.need = sub(l.send).toUpperCase();
  Q.sent = "";
  Q.lastMine = i;
  document.getElementById("q-yourturn").hidden = false;
  document.getElementById("q-pads").hidden = false;
  document.getElementById("q-keys").hidden = false;
  document.getElementById("q-hearmine").hidden = false;
  document.getElementById("q-skip").hidden = false;
  document.getElementById("q-again").hidden = false;
  document.getElementById("q-send").textContent = Q.need;
  document.getElementById("q-need").textContent = "0 / " + Q.need.replace(/\s/g,"").length;
  document.getElementById("q-play").disabled = true;
  const v = document.getElementById("q-verdict");
  v.className = "verdict neutral";
  v.textContent = "He is waiting. Key your reply.";
  renderQsoKey();
  paintQsoFist();
}

function renderQsoKey(){
  const pads = document.getElementById("q-pads");
  const straight = (P.keyMode || "straight") === "straight";
  pads.className = straight ? "keywrap sticky" : "keywrap two sticky";
  pads.innerHTML = straight
    ? '<button class="keysurface" data-key="straight"><span class="ks-mark" id="q-mark">·</span><span class="ks-hint" id="q-hint">hold to key</span></button>'
    : '<button class="keysurface" data-key="dit"><span class="ks-mark" id="q-mark">·</span><span class="ks-hint">dit</span></button>' +
      '<button class="keysurface" data-key="dah"><span class="ks-mark is-dah">—</span><span class="ks-hint" id="q-hint">dah</span></button>';
  document.getElementById("q-keys").innerHTML = straight
    ? 'Short press is a <strong>dit</strong>, longer is a <strong>dah</strong>. Keyboard: <kbd>Space</kbd>.'
    : 'Left pad dit, right pad dah. Keyboard: <kbd>&larr;</kbd> and <kbd>&rarr;</kbd>.';
  bindKeySurface(pads);
  Keyer.claim({
    mode: straight ? "straight" : "paddle",
    onElement: () => paintQsoFist(),
    onChar: ch => { Q.sent += ch; paintQsoFist(); checkTurn(); },
    onWord: () => { if(Q.sent && !Q.sent.endsWith(" ")) Q.sent += " "; paintQsoFist(); checkTurn(); },
    onPreview: kind => keyPreview(
      document.getElementById("q-mark"), document.getElementById("q-hint"), kind)
  });
}

function paintQsoFist(){
  const want = Q.need, got = Q.sent;
  let html = "";
  for(let i=0;i<got.length;i++){
    const g = got[i];
    if(g === " "){ html += " "; continue; }
    html += '<span class="'+(g===want[i]?"ok":"bad")+'">'+esc(g)+'</span>';
  }
  document.getElementById("q-decoded").innerHTML = html || '<span class="pend">key it</span>';
  document.getElementById("q-stream").textContent = Keyer.elems ? patSpaced(Keyer.elems) : "";
  document.getElementById("q-need").textContent =
    got.replace(/\s/g,"").length + " / " + want.replace(/\s/g,"").length;
}

function clearTurn(msg, cls){
  Q.sent = "";
  Keyer.reset();
  const v = document.getElementById("q-verdict");
  v.className = "verdict " + (cls || "neutral");
  v.textContent = msg;
  paintQsoFist();
}

/* Forgiving on purpose: spacing is not judged, only the characters. Sending
   "73 ES TNX SK" as one run still counts. What does not count is getting a
   callsign or a report wrong, because on the air that is the whole contact.

   Checked after every character rather than at the end, so a slip is caught
   where it happened instead of after another fifteen characters of wasted
   effort. */
function checkTurn(){
  if(!Q.awaiting) return;
  const want = Q.need.replace(/\s/g, "");
  const got  = Q.sent.replace(/\s/g, "");
  const v = document.getElementById("q-verdict");

  /* Eight dits is HH, the real on-air "I made an error, here it comes again".
     Learning to send it is worth more than any undo button this app could
     invent, so the undo button IS the prosign. */
  if(Keyer.elems === "........" || got.endsWith("········")){
    clearTurn("Error sent. Start the line again.", "neutral");
    return;
  }

  if(got === want){
    Q.awaiting = false;
    Keyer.release();
    v.className = "verdict ok";
    v.textContent = "Sent. He copied you.";
    Q.open[Q.lastMine] = true;
    setTimeout(() => { endYourTurn(); advanceQso(); }, 1000);
    return;
  }
  if(want.startsWith(got)){
    v.className = "verdict neutral";
    v.textContent = got.length ? "Good so far — keep going." : "He is waiting. Key your reply.";
    return;
  }
  /* Diverged. Say what went wrong at the character it went wrong on, then
     reset the line - the same thing you would do on the air. */
  const at = [...got].findIndex((c, i) => c !== want[i]);
  const sentCh = got[at] === "\u00b7" ? "nothing readable" : got[at];
  /* Cleared immediately, not on a timer: a delayed wipe would swallow the
     first characters of the correction the operator has already started. */
  clearTurn(
    "Character " + (at + 1) + " came out as " + sentCh + ", it should be "
      + want[at] + ". Cleared — send the line again. Eight dits clears it any time.",
    "bad");
}

function endYourTurn(){
  Q.awaiting = false;
  Keyer.release();
  ["q-yourturn","q-pads","q-keys","q-hearmine","q-skip","q-again"].forEach(id => {
    const e = document.getElementById(id); if(e) e.hidden = true;
  });
  document.getElementById("q-play").disabled = false;
}

function advanceQso(){
  const q = QSOS[Q.idx];
  if(Q.cur >= q.lines.length){
    const v = document.getElementById("q-verdict");
    v.className = "verdict ok";
    v.textContent = "Contact complete. That is a real QSO, start to finish.";
    if(Q.work){ P.qsoDone = Math.min(4, (P.qsoDone || 0) + 1); }
    markToday(); save();
    return;
  }
  const i = Q.cur; Q.cur++;
  if(q.lines[i].who === "{ME}") Q.open[i] = true;
  renderQso();
  document.getElementById("q-replay").disabled = false;
  if(qsoNeedsYou(i)){ startYourTurn(i); return; }
  qPlayLine(i);
}

function resetQso(){
  stopPlay(); endYourTurn();
  Q.cur = 0; Q.open = {};
  document.getElementById("q-revealall").textContent = "Reveal all";
  document.getElementById("q-readout").innerHTML = '<span class="pend">standing by</span>';
  renderQso();
}
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
      /* Their over is finished, so if the next line is yours, it is your turn
         now - no button to press, the same as being on the air. */
      if(Q.work && qsoNeedsYou(Q.cur)){
        const next = Q.cur; Q.cur++;
        renderQso();
        setTimeout(() => startYourTurn(next), 500);
      } else if(Q.cur >= QSOS[Q.idx].lines.length){
        /* Their line was the last one - say the contact is finished rather
           than leaving it on the final translation. */
        setTimeout(() => {
          const vv = document.getElementById("q-verdict");
          vv.className = "verdict ok";
          vv.textContent = "Contact complete. That is a real QSO, start to finish.";
          if(Q.work){ P.qsoDone = Math.min(4, (P.qsoDone || 0) + 1); }
          markToday(); save();
        }, 700);
      }
    }
  });
}
document.getElementById("q-picker").addEventListener("click", e => {
  const b = e.target.closest("[data-q]"); if(!b) return;
  Q.idx = +b.dataset.q;
  renderQsoPicker(); resetQso();
});
document.getElementById("q-play").addEventListener("click", () => {
  if(Q.cur >= QSOS[Q.idx].lines.length) return;
  advanceQso();
  markToday();
});
document.getElementById("q-hearmine").addEventListener("click", () => play(Q.need, {ewpm:S.ewpm}));
document.getElementById("q-again").addEventListener("click", () =>
  clearTurn("Cleared. Send the line again.", "neutral"));
document.getElementById("q-skip").addEventListener("click", () => {
  const v = document.getElementById("q-verdict");
  v.className = "verdict neutral";
  v.textContent = "Skipped. He heard you anyway.";
  endYourTurn(); advanceQso();
});
document.getElementById("q-replay").addEventListener("click", () => { if(Q.cur>0) qPlayLine(Q.cur-1); });
document.getElementById("q-revealall").addEventListener("click", () => {
  const all = QSOS[Q.idx].lines.every((l,i) => Q.open[i]);
  QSOS[Q.idx].lines.forEach((l,i) => { Q.open[i] = !all; });
  document.getElementById("q-revealall").textContent = all ? "Reveal all" : "Hide all";
  renderQso();
});
document.getElementById("q-reset").addEventListener("click", resetQso);
document.getElementById("q-lines").addEventListener("click", e => {
  const b = e.target.closest("[data-line]"); if(!b) return;
  const i = +b.dataset.line;
  Q.open[i] = !Q.open[i];
  renderQso();
});

/* send.js — Straight key and iambic keyer with live decoder
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const Send = {
  target:"CQ CQ DE N5EDB", raw:"CQ CQ DE {ME}", text:"",
  pool:["CQ CQ DE {ME}","{ME}","DE {ME} K","TNX FER CALL","UR RST 599","NAME IS {NAME}","QTH {QTH}","73 ES CUL","QSL VIA LOTW","HW CPY?","AGN PSE","QRS PSE","GM OM","FB TNX","RIG IS {RIG}","ANT IS DIPOLE","W4JQP DE {ME} KN","CQ CQ CQ DE {ME} {ME} K","5NN TX","R TU 73"],
  mode:"straight",

  claim(){
    Keyer.claim({
      mode: this.mode,
      onElement: () => this.paint(),
      onChar: ch => { this.text += ch; this.paint(); },
      onWord: () => {
        if(this.text && !this.text.endsWith(" ")) this.text += " ";
        this.paint(); this.grade();
      },
      onPreview: kind => keyPreview(
        document.getElementById("s-mark"), document.getElementById("s-hint"), kind)
    });
  },
  paint(){
    const want = this.target.toUpperCase(), got = this.text;
    let html = "";
    for(let i=0;i<got.length;i++){
      const g = got[i];
      if(g === " "){ html += " "; continue; }
      html += '<span class="'+(g===want[i]?"ok":"bad")+'">'+esc(g)+'</span>';
    }
    if(Keyer.elems) html += '<span class="cur">'+esc(Keyer.elems)+'</span>';
    document.getElementById("s-decoded").innerHTML = html || '<span class="pend">nothing yet</span>';
    document.getElementById("s-stream").textContent = Keyer.elems ? patSpaced(Keyer.elems) : "";
    const st = Keyer.stats();
    document.getElementById("s-dit").textContent = st.dit ? Math.round(st.dit)+" ms" : "—";
    document.getElementById("s-wpm").textContent = st.wpm ? Math.round(st.wpm)+" wpm" : "—";
    const r = document.getElementById("s-ratio");
    r.textContent = st.ratio ? st.ratio.toFixed(1)+" : 1" : "—";
    r.className = "m-v" + (st.ratio ? (st.ratio > 2.6 && st.ratio < 3.5 ? " good" : " miss") : "");
  },
  grade(){
    const got = this.text.trim().replace(/\s+/g," "), want = this.target.toUpperCase().trim();
    const v = document.getElementById("s-verdict");
    if(!got) return;
    if(got === want){
      v.className = "verdict ok";
      v.textContent = "Sent clean. That is a fist another operator can read.";
      P.sentOk = (P.sentOk||0)+1;
      document.getElementById("s-ok").textContent = P.sentOk;
      markToday(); save();
    } else if(want.startsWith(got)){
      v.className = "verdict neutral"; v.textContent = "Good so far — keep going.";
    } else {
      v.className = "verdict bad"; v.textContent = "Decoded: " + got;
    }
  },
  clear(){
    this.text = ""; Keyer.reset();
    document.getElementById("s-verdict").className = "verdict neutral";
    document.getElementById("s-verdict").textContent = "Press and hold the key below.";
    keyPreview(document.getElementById("s-mark"), document.getElementById("s-hint"), null);
    this.paint();
  },
  newTarget(){
    this.raw = pick(this.pool);
    this.target = sub(this.raw);
    document.getElementById("s-target").textContent = this.target;
    this.clear();
  }
};

function renderSend(){
  document.getElementById("s-ok").textContent = P.sentOk || 0;
  document.getElementById("s-keymode").innerHTML = ["straight","paddle"].map(m =>
    '<button class="btn sm '+(m===Send.mode?"primary":"ghost")+'" data-km="'+m+'">'+(m==="straight"?"Straight key":"Iambic paddle")+'</button>').join("");
  const pads = document.getElementById("s-pads");
  if(Send.mode === "straight"){
    pads.className = "keywrap";
    pads.innerHTML =
      '<button class="keysurface" data-key="straight">' +
        '<span class="ks-mark" id="s-mark">·</span>' +
        '<span class="ks-hint" id="s-hint">hold to key</span>' +
      '</button>';
    document.getElementById("s-keys").innerHTML =
      'Press and hold anywhere on the key. A <strong>short press is a dit</strong>, a <strong>longer one is a dah</strong> — watch the mark change while you hold it. Pause to end a letter, pause longer to end a word. Keyboard: <kbd>Space</kbd>.';
  } else {
    pads.className = "keywrap two";
    pads.innerHTML =
      '<button class="keysurface" data-key="dit"><span class="ks-mark" id="s-mark">·</span><span class="ks-hint">dit</span></button>' +
      '<button class="keysurface" data-key="dah"><span class="ks-mark is-dah">—</span><span class="ks-hint" id="s-hint">dah</span></button>';
    document.getElementById("s-keys").innerHTML =
      'Tap the left pad for a dit, the right for a dah — the keyer times them for you. Hold both to squeeze (iambic). Keyboard: <kbd>&larr;</kbd>/<kbd>Z</kbd> and <kbd>&rarr;</kbd>/<kbd>X</kbd>.';
  }
  bindKeySurface(pads);
  Send.claim();
}
document.getElementById("s-keymode").addEventListener("click", e => {
  const b = e.target.closest("[data-km]"); if(!b) return;
  Send.mode = b.dataset.km; P.keyMode = b.dataset.km; save();
  renderSend(); Send.clear();
});
document.getElementById("s-next").addEventListener("click", () => Send.newTarget());
document.getElementById("s-clear").addEventListener("click", () => Send.clear());
document.getElementById("s-hear").addEventListener("click", () => play(Send.target, {ewpm:S.ewpm}));


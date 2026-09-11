/* send.js — Straight key and iambic keyer with live decoder
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const Send = {
  mode:"straight", downAt:0, lastUp:0, elems:"", text:"", flush:null, wordFlush:null,
  dits:[], dahs:[], keying:false,
  ditDown:false, dahDown:false, keyerRunning:false, lastElem:null,
  target:"CQ CQ DE N5EDB", raw:"CQ CQ DE {ME}",
  pool:["CQ CQ DE {ME}","{ME}","DE {ME} K","TNX FER CALL","UR RST 599","NAME IS {NAME}","QTH {QTH}","73 ES CUL","QSL VIA LOTW","HW CPY?","AGN PSE","QRS PSE","GM OM","FB TNX","RIG IS {RIG}","ANT IS DIPOLE","W4JQP DE {ME} KN","CQ CQ CQ DE {ME} {ME} K","5NN TX","R TU 73"],
  unit(){ return 1200 / S.cwpm; },

  sDown(){
    if(this.keying) return;
    this.keying = true;
    const now = performance.now();
    if(this.lastUp){
      const gap = now - this.lastUp;
      if(gap > this.unit()*2.2) this.commitChar();
      if(gap > this.unit()*5.5) this.commitWord();
    }
    this.downAt = now;
    clearTimeout(this.flush); clearTimeout(this.wordFlush);
    Sig.keyDown(); lampEl().classList.add("on");
  },
  sUp(){
    if(!this.keying) return;
    this.keying = false;
    const dur = performance.now() - this.downAt;
    this.lastUp = performance.now();
    Sig.keyUp(); lampEl().classList.remove("on");
    if(dur < 15) return;
    if(dur < this.unit()*2){ this.elems += "."; this.dits.push(dur); }
    else { this.elems += "-"; this.dahs.push(dur); }
    this.paint(); this.armFlush();
  },
  armFlush(){
    clearTimeout(this.flush); clearTimeout(this.wordFlush);
    this.flush = setTimeout(() => this.commitChar(), this.unit()*2.6);
    this.wordFlush = setTimeout(() => this.commitWord(), this.unit()*6.5);
  },
  padDown(w){ if(w === "dit") this.ditDown = true; else this.dahDown = true; if(!this.keyerRunning) this.keyerTick(); },
  padUp(w){ if(w === "dit") this.ditDown = false; else this.dahDown = false; },
  keyerTick(){
    const u = this.unit();
    let next = null;
    if(this.ditDown && this.dahDown) next = this.lastElem === "." ? "-" : ".";
    else if(this.ditDown) next = ".";
    else if(this.dahDown) next = "-";
    if(!next){ this.keyerRunning = false; this.lastElem = null; this.armFlush(); return; }
    this.keyerRunning = true; this.lastElem = next;
    const dur = next === "." ? u : u*3;
    Sig.keyDown(); lampEl().classList.add("on");
    document.querySelectorAll(".pad").forEach(p => p.classList.toggle("down", p.dataset.pad === (next==="."?"dit":"dah")));
    clearTimeout(this.flush); clearTimeout(this.wordFlush);
    setTimeout(() => {
      Sig.keyUp(); lampEl().classList.remove("on");
      document.querySelectorAll(".pad").forEach(p => p.classList.remove("down"));
      this.elems += next;
      if(next === ".") this.dits.push(dur); else this.dahs.push(dur);
      this.paint();
      setTimeout(() => this.keyerTick(), u);
    }, dur);
  },
  commitChar(){
    if(!this.elems) return;
    this.text += REV[this.elems] || "·";
    this.elems = "";
    this.paint();
  },
  commitWord(){
    this.commitChar();
    if(this.text && !this.text.endsWith(" ")) this.text += " ";
    this.paint(); this.grade();
  },
  paint(){
    const want = this.target.toUpperCase(), got = this.text;
    let html = "";
    for(let i=0;i<got.length;i++){
      const g = got[i];
      if(g === " "){ html += " "; continue; }
      html += '<span class="'+(g===want[i]?"ok":"bad")+'">'+esc(g)+'</span>';
    }
    if(this.elems) html += '<span class="cur">'+esc(this.elems)+'</span>';
    document.getElementById("s-decoded").innerHTML = html || '<span class="pend">nothing yet</span>';
    document.getElementById("s-stream").textContent = this.elems ? patSpaced(this.elems) : "";
    const aD = this.dits.length ? this.dits.reduce((a,b)=>a+b,0)/this.dits.length : 0;
    const aH = this.dahs.length ? this.dahs.reduce((a,b)=>a+b,0)/this.dahs.length : 0;
    document.getElementById("s-dit").textContent = aD ? Math.round(aD)+" ms" : "—";
    document.getElementById("s-wpm").textContent = aD ? Math.round(1200/aD)+" wpm" : "—";
    const ratio = (aD && aH) ? aH/aD : 0;
    const r = document.getElementById("s-ratio");
    r.textContent = ratio ? ratio.toFixed(1)+" : 1" : "—";
    r.className = "m-v" + (ratio ? (ratio > 2.6 && ratio < 3.5 ? " good" : " miss") : "");
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
    this.text = ""; this.elems = ""; this.dits = []; this.dahs = [];
    document.getElementById("s-verdict").className = "verdict neutral";
    document.getElementById("s-verdict").textContent = "Cleared. Send it again.";
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
    pads.className = "pads single";
    pads.innerHTML = '<button class="pad" data-pad="key">—<small>hold to key</small></button>';
    document.getElementById("s-keys").innerHTML =
      'Keyboard: hold <kbd>Space</kbd> or <kbd>\\</kbd>. Short press is a dit, long press is a dah. Pause about three units for a letter, seven for a word.';
  } else {
    pads.className = "pads";
    pads.innerHTML = '<button class="pad" data-pad="dit">·<small>dit</small></button><button class="pad" data-pad="dah">—<small>dah</small></button>';
    document.getElementById("s-keys").innerHTML =
      'Keyboard: <kbd>&larr;</kbd> or <kbd>Z</kbd> is dit, <kbd>&rarr;</kbd> or <kbd>X</kbd> is dah. Hold both to squeeze (iambic). Element length follows character speed.';
  }
}
document.getElementById("s-keymode").addEventListener("click", e => {
  const b = e.target.closest("[data-km]"); if(!b) return;
  Send.mode = b.dataset.km; Send.clear(); renderSend();
});
document.getElementById("s-next").addEventListener("click", () => Send.newTarget());
document.getElementById("s-clear").addEventListener("click", () => Send.clear());
document.getElementById("s-hear").addEventListener("click", () => play(Send.target, {ewpm:S.ewpm}));

(function padBind(){
  const pads = document.getElementById("s-pads");
  const start = e => {
    const p = e.target.closest(".pad"); if(!p) return;
    e.preventDefault(); Sig.resume();
    if(p.dataset.pad === "key"){ p.classList.add("down"); Send.sDown(); }
    else Send.padDown(p.dataset.pad);
  };
  const end = e => {
    const p = e.target.closest(".pad"); if(!p) return;
    e.preventDefault();
    if(p.dataset.pad === "key"){ p.classList.remove("down"); Send.sUp(); }
    else Send.padUp(p.dataset.pad);
  };
  pads.addEventListener("pointerdown", start);
  pads.addEventListener("pointerup", end);
  pads.addEventListener("pointercancel", end);
  pads.addEventListener("pointerleave", end);
  pads.addEventListener("contextmenu", e => e.preventDefault());
})();

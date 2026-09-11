/* send.js — Straight key and iambic keyer with live decoder
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

/* What you can be asked to send. Single-token sets grade the moment you finish
   a word; the phrases set is multi-word and grades at the end of each one. */
const SEND_SETS = {
  common:  {label:"First 20",  items:["CQ","DE","K","R","TU","73","QTH","QRZ","QSL","RST","UR","ES","OM","GM","GE","TNX","FB","HW","PSE","AGN"]},
  q:       {label:"Q-codes",   items:QCODES.map(q => q[0])},
  numbers: {label:"Numbers",   items:["599","5NN","579","73","88","1","2","3","4","5","6","7","8","9","0","100","25","50","10","13"]},
  prosign: {label:"Prosigns",  items:["<AR>","<SK>","<BT>","<KN>","<AS>","<BK>"]},
  call:    {label:"Callsigns", items:null},
  phrases: {label:"Phrases",   items:null}
};
const SEND_PHRASES = ["CQ CQ DE {ME}","DE {ME} K","TNX FER CALL","UR RST 599","NAME IS {NAME}",
  "QTH {QTH}","73 ES CUL","QSL VIA LOTW","HW CPY?","AGN PSE","QRS PSE","GM OM","FB TNX",
  "RIG IS {RIG}","ANT IS DIPOLE","W4JQP DE {ME} KN","5NN TX","R TU 73"];

const Send = {
  target:"CQ CQ DE N5EDB", raw:"CQ CQ DE {ME}", text:"",
  mode:"straight", setKey:"common", memory:false,
  ok:0, no:0, streak:0, hideTimer:null, hidden:false,

  claim(){
    Keyer.claim({
      mode: this.mode,
      onElement: () => this.paint(),
      onChar: ch => { this.text += ch; this.paint(); this.maybeGrade(); },
      onWord: () => {
        if(this.text && !this.text.endsWith(" ")) this.text += " ";
        this.paint(); this.grade();
      },
      onPreview: kind => keyPreview(
        document.getElementById("s-mark"), document.getElementById("s-hint"), kind)
    });
  },

  pickTarget(){
    if(this.setKey === "phrases") return sub(pick(SEND_PHRASES));
    if(this.setKey === "call") return (P.call && Math.random() < 0.4) ? P.call : usCall();
    return pick(SEND_SETS[this.setKey].items).replace(/[<>]/g, "");
  },
  newTarget(){
    clearTimeout(this.hideTimer);
    this.target = this.pickTarget();
    this.hidden = false;
    this.showTarget();
    this.clear();
    document.getElementById("s-peek").hidden = !this.memory;
    /* Memory mode: you get a couple of seconds to read it, then it is on you.
       Keying something you can still see is copying a picture; keying it from
       memory is what you will actually do on the air. */
    if(this.memory){
      this.hideTimer = setTimeout(() => {
        if(this.text) return;              // already started, leave it alone
        this.hidden = true; this.showTarget();
      }, 2200);
    }
  },
  showTarget(){
    const el = document.getElementById("s-target");
    if(this.hidden){
      el.innerHTML = '<span class="target-hidden">' +
        this.target.replace(/[^ ]/g, "?") + '</span>';
    } else {
      el.textContent = this.target;
    }
    document.getElementById("s-rt").textContent =
      (this.ok + this.no) ? Math.round(100 * this.ok / (this.ok + this.no)) + "% clean" : "";
  },
  peek(){
    this.hidden = false; this.showTarget();
    clearTimeout(this.hideTimer);
  },

  paint(){
    const want = this.target.toUpperCase(), got = this.text;
    let html = "";
    for(let i=0;i<got.length;i++){
      const g = got[i];
      if(g === " "){ html += " "; continue; }
      html += '<span class="'+(g===want[i]?"ok":"bad")+'">'+esc(g)+'</span>';
    }
    document.getElementById("s-decoded").innerHTML =
      html || '<span class="pend">key something</span>';
    document.getElementById("s-stream").textContent =
      Keyer.elems ? patSpaced(Keyer.elems) : "";
    const st = Keyer.stats();
    document.getElementById("s-dit").textContent = st.dit ? Math.round(st.dit)+" ms" : "—";
    document.getElementById("s-wpm").textContent = st.wpm ? Math.round(st.wpm)+" wpm" : "—";
    const r = document.getElementById("s-ratio");
    r.textContent = st.ratio ? st.ratio.toFixed(1)+" : 1" : "—";
    r.className = "m-v" + (st.ratio ? (st.ratio > 2.6 && st.ratio < 3.5 ? " good" : " miss") : "");
  },

  /* Single-token targets are finished as soon as you have keyed as many
     characters as the target has - no need to wait out a word gap. */
  maybeGrade(){
    if(this.setKey === "phrases") return;
    const want = this.target.toUpperCase().replace(/\s/g, "");
    const got = this.text.replace(/\s/g, "");
    if(got.length >= want.length) setTimeout(() => this.grade(), 120);
  },
  grade(){
    const want = this.target.toUpperCase().trim();
    const got = this.text.trim().replace(/\s+/g, " ");
    if(!got) return;
    const v = document.getElementById("s-verdict");
    const done = got.replace(/\s/g,"").length >= want.replace(/\s/g,"").length;
    if(!done){
      if(want.startsWith(got)){ v.className = "verdict neutral"; v.textContent = "Good so far — keep going."; }
      return;
    }
    if(got === want){
      this.ok++; this.streak++;
      P.sentOk = (P.sentOk||0) + 1;
      v.className = "verdict ok";
      const m = MEANING[this.target] || MEANING["<"+this.target+">"];
      v.textContent = "Clean — " + want + (m ? ": " + m : "") + ".";
      markToday();
    } else {
      this.no++; this.streak = 0;
      v.className = "verdict bad";
      v.textContent = "You sent " + got + ". It was " + want + ".";
      this.peek();
    }
    this.showMeters(); save();
    setTimeout(() => this.newTarget(), got === want ? 1100 : 2400);
  },
  showMeters(){
    const put = (id, v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
    put("s-ok", this.ok); put("s-no", this.no); put("s-streak", this.streak);
  },
  clear(){
    this.text = ""; Keyer.reset();
    document.getElementById("s-verdict").className = "verdict neutral";
    document.getElementById("s-verdict").textContent = this.memory
      ? "Read it, then key it from memory."
      : "Press and hold the key below.";
    keyPreview(document.getElementById("s-mark"), document.getElementById("s-hint"), null);
    this.paint();
  }
};

function renderSendSets(){
  document.getElementById("s-sets").innerHTML =
    Object.keys(SEND_SETS).map(k =>
      '<button class="btn sm '+(k===Send.setKey?"primary":"ghost")+'" data-sset="'+k+'">'+esc(SEND_SETS[k].label)+'</button>').join("") +
    '<button class="btn sm '+(Send.memory?"primary":"ghost")+'" data-mem="1" title="Hide the target after two seconds">From memory</button>';
}
document.getElementById("s-sets").addEventListener("click", e => {
  const set = e.target.closest("[data-sset]"), mem = e.target.closest("[data-mem]");
  if(set){ Send.setKey = set.dataset.sset; P.sendSet = Send.setKey; }
  else if(mem){ Send.memory = !Send.memory; P.sendMemory = Send.memory; }
  else return;
  save(); renderSendSets(); Send.newTarget();
});

function renderSend(){
  Send.showMeters();
  document.getElementById("s-keymode").innerHTML = ["straight","paddle"].map(m =>
    '<button class="btn sm '+(m===Send.mode?"primary":"ghost")+'" data-km="'+m+'">'+(m==="straight"?"Straight key":"Iambic paddle")+'</button>').join("");
  const pads = document.getElementById("s-pads");
  if(Send.mode === "straight"){
    pads.className = "keywrap sticky";
    pads.innerHTML =
      '<button class="keysurface" data-key="straight">' +
        '<span class="ks-mark" id="s-mark">·</span>' +
        '<span class="ks-hint" id="s-hint">hold to key</span>' +
      '</button>';
    document.getElementById("s-keys").innerHTML =
      'Press and hold anywhere on the key. A <strong>short press is a dit</strong>, a <strong>longer one is a dah</strong> — watch the mark change while you hold it. Pause to end a letter, pause longer to end a word. Keyboard: <kbd>Space</kbd>.';
  } else {
    pads.className = "keywrap two sticky";
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
document.getElementById("s-peek").addEventListener("click", () => Send.peek());
document.getElementById("s-clear").addEventListener("click", () => Send.clear());
document.getElementById("s-hear").addEventListener("click", () => play(Send.target, {ewpm:S.ewpm}));


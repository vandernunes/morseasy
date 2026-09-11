/* transfer.js — move your progress to another device.
   Part of Morse Easy. Loaded as a classic script; app.js must come after.

   There is no account and no server, so there is nothing to "log in" to on a
   second device. Instead your progress is packed into a code you carry across
   yourself: a link you send to yourself however you like, or a file you save.

   The link puts the code in the URL FRAGMENT (#p=...). Fragments are never
   sent to the server by any browser, so even though this travels as a URL,
   your practice history still never reaches Cloudflare or anyone else.

   An imported code is untrusted input - it can arrive from anywhere - so
   nothing from it is trusted. Every key is whitelisted, every number clamped,
   every string run through the same cleanField() the settings inputs use.

   Vander Nunes - N5EDB */
"use strict";

const TRANSFER_PREFIX_PLAIN = "A";
const TRANSFER_PREFIX_DEFLATE = "B";

function b64urlEncode(bytes){
  let bin = "";
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str){
  const pad = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "===".slice((pad.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function packProgress(){
  const json = JSON.stringify(P);
  const bytes = new TextEncoder().encode(json);
  if(typeof CompressionStream === "function"){
    try{
      const cs = new CompressionStream("deflate-raw");
      const buf = await new Response(
        new Blob([bytes]).stream().pipeThrough(cs)
      ).arrayBuffer();
      return TRANSFER_PREFIX_DEFLATE + b64urlEncode(new Uint8Array(buf));
    }catch(e){ /* fall through to plain */ }
  }
  return TRANSFER_PREFIX_PLAIN + b64urlEncode(bytes);
}

async function unpackProgress(code){
  const clean = String(code).trim().replace(/\s+/g, "");
  if(clean.length < 2) throw new Error("that code is too short to be a backup");
  const kind = clean[0];
  const body = clean.slice(1);
  if(!/^[A-Za-z0-9\-_]+$/.test(body)) throw new Error("that does not look like a Morse Easy code");
  let bytes = b64urlDecode(body);
  if(kind === TRANSFER_PREFIX_DEFLATE){
    if(typeof DecompressionStream !== "function")
      throw new Error("this browser cannot read a compressed code");
    const ds = new DecompressionStream("deflate-raw");
    const buf = await new Response(
      new Blob([bytes]).stream().pipeThrough(ds)
    ).arrayBuffer();
    bytes = new Uint8Array(buf);
  } else if(kind !== TRANSFER_PREFIX_PLAIN){
    throw new Error("unrecognised code format");
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/* Nothing from a code is trusted. Unknown keys are dropped, numbers are
   clamped, strings go through the same filter the settings inputs use. */
function sanitizeProgress(raw){
  if(!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("that code does not contain progress");

  const n = (v, lo, hi, dflt) => {
    const x = Number(v);
    return isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : dflt;
  };
  const countMap = (v, maxKeys, keyRe, lo, hi) => {
    const out = {};
    if(!v || typeof v !== "object" || Array.isArray(v)) return out;
    Object.keys(v).slice(0, maxKeys).forEach(k => {
      if(!keyRe.test(k)) return;
      const x = Number(v[k]);
      if(isFinite(x)) out[k] = Math.min(hi, Math.max(lo, Math.round(x)));
    });
    return out;
  };

  return {
    call: cleanField(raw.call || "", 12),
    name: cleanField(raw.name || "", 20),
    qth:  cleanField(raw.qth  || "", 20),
    rig:  cleanField(raw.rig  || "", 20),
    lesson: n(raw.lesson, 1, KOCH.length - 1, 1),
    stageByLesson: countMap(raw.stageByLesson, 64, /^\d{1,3}$/, 1, 4),
    bestByLesson:  countMap(raw.bestByLesson,  64, /^\d{1,3}$/, 0, 100),
    charErr: countMap(raw.charErr, 64, /^.{1,4}$/, 0, 99999),
    charOk:  countMap(raw.charOk,  64, /^.{1,4}$/, 0, 99999),
    bestRound: countMap(raw.bestRound, 8, /^[a-z]{1,12}$/, 0, 100),
    days: countMap(raw.days, 800, /^\d{4}-\d{2}-\d{2}$/, 0, 9999),
    sentOk: n(raw.sentOk, 0, 9999999, 0),
    qsoDone: n(raw.qsoDone, 0, 4, 0),
    keyWpm: n(raw.keyWpm, 5, 40, 13),
    groupsPerLesson: n(raw.groupsPerLesson, 5, 20, 8),
    keyMode: raw.keyMode === "paddle" ? "paddle" : "straight",
    sendSet: /^[a-z]{1,10}$/.test(raw.sendSet) ? raw.sendSet : "common",
    theme: ["light", "dark", "system"].indexOf(raw.theme) >= 0 ? raw.theme : "system",
    showPad: raw.showPad !== false,
    repeatMissed: raw.repeatMissed !== false,
    sendMemory: !!raw.sendMemory,
    qsoWork: !!raw.qsoWork,
    seenHelp: true,
    updatedAt: n(raw.updatedAt, 0, Date.now() + 86400000, Date.now())
  };
}

function describeProgress(p){
  const chars = p.lesson >= 2 ? p.lesson : 0;
  const days = Object.keys(p.days || {}).length;
  return chars + " of " + KOCH.length + " characters"
    + (p.call ? ", " + p.call : "")
    + ", " + (p.sentOk || 0) + " clean sends"
    + ", " + days + " day" + (days === 1 ? "" : "s") + " of practice";
}

async function applyProgress(raw){
  const clean = sanitizeProgress(raw);
  Object.assign(P, clean);
  save();
  loadLocal();
  Koch.stage = Koch.maxStage();
  renderAll();
}

/* ---------------------------------------------------------------- UI ---- */

function transferMsg(text, cls){
  const el = document.getElementById("xfer-msg");
  if(!el) return;
  el.textContent = text;
  el.className = "note-sm " + (cls || "");
}

async function copyTransferLink(){
  try{
    const code = await packProgress();
    const link = location.origin + "/#p=" + code;
    let ok = false;
    if(navigator.clipboard && window.isSecureContext){
      try{ await navigator.clipboard.writeText(link); ok = true; }catch(e){}
    }
    const box = document.getElementById("xfer-out");
    box.hidden = false;
    box.value = link;
    box.focus();
    box.select();
    transferMsg(ok
      ? "Link copied. Send it to yourself — message, email, AirDrop, anything — and open it on the other device."
      : "Copy the link below and open it on your other device.", "");
  }catch(e){
    transferMsg("Could not build the link: " + e.message, "bad");
  }
}

async function downloadBackup(){
  try{
    const code = await packProgress();
    const blob = new Blob([JSON.stringify({morseasy: 1, code}, null, 2)],
                          {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "morseasy-progress.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    transferMsg("Saved. Keep it somewhere safe — it restores everything.", "");
  }catch(e){
    transferMsg("Could not save the file: " + e.message, "bad");
  }
}

async function restoreFromText(text){
  let code = String(text || "").trim();
  const hash = code.indexOf("#p=");
  if(hash >= 0) code = code.slice(hash + 3);
  if(!code){ transferMsg("Paste a code or a link first.", "bad"); return; }
  try{
    const raw = await unpackProgress(code);
    const clean = sanitizeProgress(raw);
    if(!confirm("Restore this progress?\n\n" + describeProgress(clean)
                + "\n\nThis replaces what is on this device."))
      { transferMsg("Left alone.", ""); return; }
    await applyProgress(raw);
    transferMsg("Restored. " + describeProgress(clean), "good");
  }catch(e){
    transferMsg("That code could not be read: " + e.message, "bad");
  }
}

/* A link arriving with progress in the fragment. The fragment never reached
   the server; it only ever existed in this browser. */
async function checkTransferLink(){
  if(!location.hash.startsWith("#p=")) return;
  const code = location.hash.slice(3);
  history.replaceState(null, "", location.pathname + location.search);
  try{
    const raw = await unpackProgress(code);
    const clean = sanitizeProgress(raw);
    if(confirm("This link carries Morse Easy progress:\n\n" + describeProgress(clean)
               + "\n\nRestore it on this device? This replaces what is here now."))
      await applyProgress(raw);
  }catch(e){
    alert("That link did not contain readable progress.");
  }
}

document.getElementById("xfer-link").addEventListener("click", copyTransferLink);
document.getElementById("xfer-file").addEventListener("click", downloadBackup);
document.getElementById("xfer-restore").addEventListener("click", () =>
  restoreFromText(document.getElementById("xfer-in").value));
document.getElementById("xfer-load").addEventListener("change", e => {
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const parsed = JSON.parse(r.result);
      restoreFromText(parsed.code || r.result);
    }catch(err){ restoreFromText(r.result); }
  };
  r.readAsText(f);
  e.target.value = "";
});

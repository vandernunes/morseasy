/* offline.js — service worker registration, install prompt, update prompt.
   Part of Morse Easy. Loaded as a classic script; app.js must come after. */
"use strict";

/* Installing this app means it runs with no connection at all: the page, the
   fonts and the icons are the whole of it, and there is no API, no analytics
   and no backend to reach even when there is signal.

   On iOS it also fixes real data loss. Safari deletes script-writable storage
   after seven days without a visit, so a fortnight away from a browser tab
   costs you every lesson and your whole streak. Installed apps are exempt. */

let installPrompt = null;
let swReady = false;

function standalone(){
  return window.matchMedia("(display-mode: standalone)").matches ||
         window.navigator.standalone === true;
}
function isIos(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
         (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function renderOffline(){
  const el = document.getElementById("offline-state");
  if(!el) return;
  el.innerHTML = "";

  if(standalone()){
    el.textContent = swReady
      ? "Installed and ready. This works with no connection — nothing is fetched and nothing is sent."
      : "Installed. Caching the app for offline use…";
    return;
  }
  if(installPrompt){
    const b = document.createElement("button");
    b.className = "btn primary sm";
    b.textContent = "Install app";
    b.addEventListener("click", async () => {
      const p = installPrompt;
      installPrompt = null;
      b.disabled = true;
      try{ await p.prompt(); await p.userChoice; }catch(e){}
      renderOffline();
    });
    el.appendChild(b);
    const note = document.createElement("div");
    note.style.marginTop = "6px";
    note.textContent = "Adds it to your home screen and keeps it working with no signal.";
    el.appendChild(note);
    return;
  }
  if(isIos()){
    el.textContent = "In Safari, tap Share, then “Add to Home Screen”. "
      + "It then works with no signal — and Safari stops deleting your progress "
      + "after a week away.";
    return;
  }
  el.textContent = swReady
    ? "Already saved for offline use. Your browser’s menu can also install it as an app."
    : "Your browser can install this from its own menu.";
}

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  installPrompt = e;
  renderOffline();
});
window.addEventListener("appinstalled", () => { installPrompt = null; renderOffline(); });

function offerUpdate(worker){
  const bar = document.getElementById("sync");
  if(!bar) return;
  bar.innerHTML = "";
  const b = document.createElement("button");
  b.className = "btn sm";
  b.textContent = "New version — reload";
  /* Never swap the app out mid-lesson. The new worker waits until asked. */
  b.addEventListener("click", () => {
    worker.postMessage("skip-waiting");
    location.reload();
  });
  bar.appendChild(b);
}

/* isSecureContext is true for https and for localhost, which is what makes
   the worker testable locally without a certificate. */
if("serviceWorker" in navigator && window.isSecureContext){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(reg => {
      if(reg.active){ swReady = true; renderOffline(); markOfflineReady(); }
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        if(!w) return;
        w.addEventListener("statechange", () => {
          if(w.state === "installed"){
            if(navigator.serviceWorker.controller) offerUpdate(w);
            else { swReady = true; renderOffline(); markOfflineReady(); }
          }
        });
      });
    }).catch(() => {});
  });
}

function markOfflineReady(){
  const s = document.getElementById("sync");
  if(s && !s.querySelector("button")) s.textContent = "Saved on this device · works offline";
}

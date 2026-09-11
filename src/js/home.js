/* home.js — the one screen that answers "what do I do now".
   Part of Morse Easy. Loaded as a classic script; app.js must come after.

   Seven tabs with no ordering between them is a menu, not a path. Someone
   arriving for the first time has no way to know that Callsigns will be
   miserable until they know most of the alphabet, or that Sending can be
   started on day one. This screen says so, and its Continue button goes to
   exactly the place they left off.

   Nothing here is a lock. Every stage stays clickable, because a person who
   wants to look ahead should be allowed to, and because guessing what someone
   is ready for is not the same as telling them what usually works.

   Vander Nunes - N5EDB */
"use strict";

const TOTAL_CHARS = KOCH.length;

/* Each stage says when it usually starts making sense, not when it is allowed.
   `at` is the number of characters after which this stops being frustrating. */
const PATH = [
  {
    id: "learn", mode: "learn", at: 0,
    title: "Learn the alphabet",
    blurb: "Two new characters at a time, four steps each. This is the long one, and everything else is built on it.",
    progress: () => ({now: charsKnown(), of: TOTAL_CHARS, unit: "characters"})
  },
  {
    id: "words", mode: "words", at: 10,
    title: "Hear whole words",
    blurb: "CQ, 73, QTH and the rest, heard as one shape instead of spelled out letter by letter.",
    progress: () => ({now: bestOf("words"), of: 10, unit: "best round"})
  },
  {
    id: "calls", mode: "calls", at: 20,
    title: "Copy callsigns",
    blurb: "No word shape, no context, nothing to predict from. The hardest thing in CW and the one that decides whether you can work a pileup.",
    progress: () => ({now: bestOf("calls"), of: 10, unit: "best round"})
  },
  {
    id: "qso", mode: "qso", at: 26,
    title: "Work a contact",
    blurb: "Four real QSOs. Listen and copy, or key your own side back until 73.",
    progress: () => ({now: P.qsoDone || 0, of: 4, unit: "contacts"})
  },
  {
    id: "send", mode: "send", at: 0,
    title: "Send it yourself",
    blurb: "Tap out your own Morse with a live decoder reading your fist. Open from day one - sending is easier than copying.",
    progress: () => ({now: P.sentOk || 0, of: 100, unit: "clean sends"})
  }
];

function bestOf(key){ return (P.bestRound || {})[key] || 0; }
/* Characters you have actually passed, not characters currently on screen.
   The lesson counter only advances on a 90% copy, so P.lesson is exactly the
   number of characters behind you - and a new arrival sees 0 of 40, which
   makes finishing the first lesson feel like the thing it is. */
function charsKnown(){ return P.lesson >= 2 ? P.lesson : 0; }

/* Where Continue actually goes. The furthest thing they have started, not a
   fixed order, so it keeps meaning something after the alphabet is done. */
function nextAction(){
  const known = charsKnown();
  if(known < TOTAL_CHARS){
    const step = ["", "Meet the sound", "Tell them apart", "Copy groups", "Send it back"][Koch.stage] || "";
    return {
      mode: "learn",
      kicker: "Lesson " + P.lesson + " · step " + Koch.stage + " of 4",
      title: step,
      sub: "New: " + Koch.newChars().join(" and ") + ". About two minutes.",
      label: P.lesson === 1 && !P.bestByLesson[1] ? "Start lesson 1" : "Continue"
    };
  }
  return {
    mode: "qso", kicker: "All 40 characters learned",
    title: "Work a contact", sub: "Listen to one, or key your own side back until 73.",
    label: "Open QSO"
  };
}

function renderHome(){
  const a = nextAction();
  document.getElementById("home-kicker").textContent = a.kicker;
  document.getElementById("home-title").textContent = a.title;
  document.getElementById("home-sub").textContent = a.sub;
  const go = document.getElementById("home-go");
  go.textContent = a.label;
  go.dataset.goto = a.mode;

  const known = charsKnown();
  document.getElementById("home-chars").textContent = known + " / " + TOTAL_CHARS;
  document.getElementById("home-bar").style.width =
    Math.round(100 * known / TOTAL_CHARS) + "%";
  document.getElementById("home-streak").textContent = dayStreak();
  document.getElementById("home-sent").textContent = P.sentOk || 0;
  document.getElementById("home-qso").textContent = (P.qsoDone || 0) + " / 4";

  document.getElementById("home-path").innerHTML = PATH.map((st, i) => {
    const pr = st.progress();
    const done = pr.now >= pr.of;
    const ready = known >= st.at;
    const cls = done ? "done" : ready ? "ready" : "later";
    const pct = Math.min(100, Math.round(100 * pr.now / pr.of));
    return '<li class="path-step ' + cls + '">'
      + '<button data-goto="' + st.mode + '">'
      + '<span class="ps-n">' + (done ? "&#10003;" : (i + 1)) + '</span>'
      + '<span class="ps-body">'
      +   '<span class="ps-title">' + esc(st.title) + '</span>'
      +   '<span class="ps-blurb">' + esc(st.blurb) + '</span>'
      +   '<span class="ps-meta">'
      +     (ready ? pr.now + " / " + pr.of + " " + esc(pr.unit)
                   : "easier once you know " + st.at + " characters &mdash; you have " + known)
      +   '</span>'
      +   '<span class="bar"><i class="' + (done ? "good" : "") + '" data-pct="' + pct + '"></i></span>'
      + '</span></button></li>';
  }).join("");
  /* widths are set here rather than inline in the markup, because the CSP
     forbids inline styles and a stray style= attribute fails the build */
  document.querySelectorAll("#home-path .bar i").forEach(el => {
    el.style.width = el.dataset.pct + "%";
  });

  renderBadges();
  renderInstallCard();
}

const BADGES = [
  {id: "first",   icon: "K",   label: "First lesson",    hit: () => (P.bestByLesson || {})[1] >= 90},
  {id: "ten",     icon: "10",  label: "Ten characters",  hit: () => charsKnown() >= 10},
  {id: "half",    icon: "20",  label: "Halfway",         hit: () => charsKnown() >= 20},
  {id: "all",     icon: "40",  label: "Whole alphabet",  hit: () => charsKnown() >= TOTAL_CHARS},
  {id: "sent",    icon: "·—", label: "First clean send", hit: () => (P.sentOk || 0) >= 1},
  {id: "sent100", icon: "100", label: "100 clean sends", hit: () => (P.sentOk || 0) >= 100},
  {id: "qso",     icon: "73",  label: "First contact",   hit: () => (P.qsoDone || 0) >= 1},
  {id: "week",    icon: "7",   label: "Seven days running", hit: () => dayStreak() >= 7}
];

function renderBadges(){
  document.getElementById("home-badges").innerHTML = BADGES.map(b => {
    const got = b.hit();
    return '<span class="badge' + (got ? " got" : "") + '" title="' + esc(b.label) + '">'
      + '<span class="bg-icon">' + esc(b.icon) + '</span>'
      + '<span class="bg-label">' + esc(b.label) + '</span></span>';
  }).join("");
}

function renderInstallCard(){
  const el = document.getElementById("home-install");
  if(!el) return;
  if(typeof standalone === "function" && standalone()){
    el.innerHTML = "<strong>Installed.</strong> This works with no connection, "
      + "and your progress is safe from Safari clearing it after a week away.";
    return;
  }
  el.innerHTML = "<strong>Add it to your home screen</strong> and it works with "
    + "no signal at all &mdash; on a plane, in a basement, in a field. On iPhone: "
    + "tap Share, then Add to Home Screen. It also stops Safari deleting your "
    + "progress after seven days without a visit.";
  if(typeof renderOffline === "function") renderOffline();
}

/* every Continue / path button goes somewhere */
document.getElementById("pane-home").addEventListener("click", e => {
  const b = e.target.closest("[data-goto]");
  if(b) setMode(b.dataset.goto);
});

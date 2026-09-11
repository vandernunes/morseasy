/* reference.js — Reference tables and the first-contact script
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

document.getElementById("sh-pro").innerHTML = PROSIGNS.map(([k,s,m]) =>
  '<tr><td class="code">'+esc(k)+'</td><td class="pat">'+esc(s)+'</td><td class="mean">'+esc(m)+'</td></tr>').join("");
document.getElementById("sh-q").innerHTML = QCODES.map(([k,s,q]) =>
  '<tr><td class="code">'+esc(k)+'</td><td class="mean">'+esc(s)+'</td><td class="mean">'+esc(q)+'</td></tr>').join("");
document.getElementById("sh-ab").innerHTML = ABBREV.map(([k,v]) =>
  '<tr><td class="code">'+esc(k)+'</td><td class="mean">'+esc(v)+'</td></tr>').join("");
document.getElementById("sh-r").innerHTML = RST_R.map(([a,b]) => '<tr><td class="code">'+a+'</td><td class="mean">'+esc(b)+'</td></tr>').join("");
document.getElementById("sh-s").innerHTML = RST_S.map(([a,b]) => '<tr><td class="code">'+a+'</td><td class="mean">'+esc(b)+'</td></tr>').join("");
document.getElementById("sh-t").innerHTML = RST_T.map(([a,b]) => '<tr><td class="code">'+a+'</td><td class="mean">'+esc(b)+'</td></tr>').join("");

function renderScript(){
  document.getElementById("sh-script").textContent = sub([
    "THEM   CQ CQ CQ DE W4JQP W4JQP W4JQP K",
    "",
    "YOU    W4JQP DE {ME} {ME} K",
    "",
    "THEM   {ME} DE W4JQP = GE OM = UR RST 579 579 =",
    "       NAME IS JIM JIM = QTH ATLANTA GA =",
    "       HW? = {ME} DE W4JQP KN",
    "",
    "YOU    W4JQP DE {ME} = GE JIM ES TNX FER RPRT =",
    "       UR RST 599 599 = NAME HR IS {NAME} {NAME} =",
    "       QTH IS {QTH} {QTH} =",
    "       RIG IS {RIG} ES 50 W TO A DIPOLE =",
    "       HW? = W4JQP DE {ME} KN",
    "",
    "THEM   ... = TNX FER QSO = 73 ES CUAGN =",
    "       {ME} DE W4JQP SK",
    "",
    "YOU    W4JQP DE {ME} = TNX JIM = 73 ES CUAGN =",
    "       W4JQP DE {ME} SK",
    "",
    "If you copy nothing but the callsign, that is still a",
    "complete valid contact. Send RR TU 73 SK and log it."
  ].join("\n"));
}

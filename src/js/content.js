/* content.js — Q-codes, abbreviations, QSO scripts, callsigns
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const QCODES = [
  ["QRL","The frequency is in use","Is this frequency in use?"],
  ["QRM","I have interference from other stations","Are you being interfered with?"],
  ["QRN","I have static / atmospheric noise","Are you troubled by static?"],
  ["QRO","I will increase power","Shall I increase power?"],
  ["QRP","I will lower power / low power operation","Shall I decrease power?"],
  ["QRQ","I will send faster","Shall I send faster?"],
  ["QRS","I will send more slowly","Shall I send more slowly?"],
  ["QRT","I am closing down / stopping","Shall I stop sending?"],
  ["QRU","I have nothing for you","Have you anything for me?"],
  ["QRV","I am ready","Are you ready?"],
  ["QRX","Stand by, wait","When will you call again?"],
  ["QRZ","You are being called by ___","Who is calling me?"],
  ["QSB","Your signal is fading","Is my signal fading?"],
  ["QSL","I acknowledge / I confirm the contact","Can you acknowledge?"],
  ["QSO","A contact, a conversation","Can you contact ___ directly?"],
  ["QSP","I will relay","Will you relay to ___?"],
  ["QST","General call to all amateurs","—"],
  ["QSY","I am changing frequency","Shall I change frequency?"],
  ["QTH","My location is ___","What is your location?"],
  ["QTR","The exact time is ___","What is the exact time?"]
];
const PROSIGNS = [
  ["AR","di-dah-di-dah-dit","End of transmission, no specific reply expected. Written +"],
  ["SK","di-di-dih-dah-di-dah","End of contact. The last thing you send. Also written VA"],
  ["BT","dah-di-di-di-dah","Separator, a pause between thoughts. Written = or —"],
  ["KN","dah-di-dah-dah-dit","Over, to the named station only. Do not break in"],
  ["K","dah-di-dah","Over, anybody may answer"],
  ["BK","dah-di-di-di-dah-di-dah","Break — quick back-and-forth, no callsigns"],
  ["AS","di-dah-di-di-dit","Wait a moment"],
  ["HH","eight fast dits","I made an error. The last word again, correctly"],
  ["SN","di-di-di-dah-dit","Understood, verified"],
  ["CL","dah-di-dah-dit di-dah-di-dit","I am closing my station, going off the air"],
  ["CT","dah-di-dah-di-dah","Attention, start of message. Written KA"]
];
const ABBREV = [
  ["CQ","Calling any station"],["DE","From (this is)"],["K","Over, go ahead"],
  ["R","Roger, received"],["AGN","Again"],["ANT","Antenna"],["ABT","About"],
  ["BK","Break in"],["BN","Been"],["BTU","Back to you"],["C","Yes, correct"],
  ["CFM","Confirm"],["CPI","Copy"],["CU","See you"],["CUL","See you later"],
  ["CUAGN","See you again"],["DR","Dear (friendly form of address)"],
  ["DX","Distance, a foreign station"],["ES","And"],["FB","Fine business, excellent"],
  ["FER","For"],["GA","Good afternoon"],["GB","Good bye"],["GE","Good evening"],
  ["GM","Good morning"],["GN","Good night"],["GND","Ground"],["GUD","Good"],
  ["HI","Laughter, the CW smiley"],["HR","Here"],["HV","Have"],["HW","How (how do you copy?)"],
  ["LID","A poor operator"],["MNI","Many"],["NR","Number"],["NW","Now"],
  ["OB","Old boy"],["OM","Old man, any male operator"],["OP","Operator, my name"],
  ["PSE","Please"],["PWR","Power"],["RCVR","Receiver"],["RIG","Station equipment"],
  ["RPT","Repeat"],["RST","Signal report"],["SED","Said"],["SIG","Signal"],
  ["SKED","Scheduled contact"],["SRI","Sorry"],["TEMP","Temperature"],["TNX","Thanks"],
  ["TU","Thank you"],["UR","Your, you are"],["VY","Very"],["WID","With"],
  ["WKD","Worked"],["WL","Will, well"],["WPM","Words per minute"],["WUD","Would"],
  ["WX","Weather"],["XYL","Wife"],["YL","Young lady, any female operator"],
  ["73","Best regards"],["88","Love and kisses"],["5NN","599, a perfect report"]
];
const WORDSETS = {
  core:    {label:"First 20", items:["CQ","DE","K","R","TU","73","QTH","QRZ","QSL","RST","UR","ES","NAME","OM","GM","GE","TNX","FB","HW","PSE"]},
  q:       {label:"Q-codes", items:QCODES.map(q => q[0])},
  abbrev:  {label:"Abbreviations", items:ABBREV.map(a => a[0])},
  prosign: {label:"Prosigns", items:["<AR>","<SK>","<BT>","<KN>","<AS>","<BK>","<SN>","<CL>","<HH>"]},
  numbers: {label:"Numbers", items:["599","579","5NN","339","449","1","2","3","4","5","6","7","8","9","0","100","73","88","12","50"]},
  common:  {label:"Plain English", items:["THE","AND","YOU","THAT","WAS","FOR","ARE","WITH","HAVE","THIS","FROM","NOT","BUT","ALL","HERE","GOOD","TIME","WELL","BACK","VERY","MUCH","YEAR","WORK","BAND","RADIO","ANTENNA","POWER","WATTS","WEATHER","STATION"]}
};
const MEANING = {};
ABBREV.forEach(([k,v]) => { if(!MEANING[k]) MEANING[k] = v; });
QCODES.forEach(([k,s]) => { MEANING[k] = s; });
PROSIGNS.forEach(([k,,m]) => { MEANING["<"+k+">"] = m; });
Object.assign(MEANING,{
  "599":"Perfect report: readable, very strong, pure tone",
  "579":"Readable, fairly strong, pure tone",
  "339":"Readable with difficulty, weak, pure tone",
  "449":"Readable with practically no difficulty, fair, pure tone",
  "NAME":"Name"
});
const RST_R = [["1","Unreadable"],["2","Barely readable, occasional words"],["3","Readable with considerable difficulty"],["4","Readable with practically no difficulty"],["5","Perfectly readable"]];
const RST_S = [["1","Faint, barely perceptible"],["2","Very weak"],["3","Weak"],["4","Fair"],["5","Fairly good"],["6","Good"],["7","Moderately strong"],["8","Strong"],["9","Extremely strong"]];
const RST_T = [["1","Extremely rough hissing note"],["3","Rough, low-pitched"],["5","Musical, modulated note"],["7","Near DC note, smooth ripple"],["9","Pure DC note — what every modern rig sends"]];

/* callsign generation */
const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", DG = "0123456789";
const DXPFX = ["G","GM","GW","DL","F","I","EA","PA","ON","OK","SM","LA","OH","SP","YO","LZ","SV","9A","S5","OE","HB9","EI","CT","EU","UA","UR","RA","JA","JH","VK","ZL","BV","HL","VU","4X","ZS","PY","LU","CE","CX","HK","XE","VE","VA","VO","CO","YV","TI","OA","EA8","CN","SU","5B","TA","JY","A6","HZ","9K","E7","YU","Z3","9H","LY","YL","ES","ER","4L","UN","BY","HS","YB","DU","9V","9M","3B8","V5","5H","ZP"];
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function rl(){ return pick(L.split("")); }
function rd(){ return pick(DG.split("")); }
function usCall(){
  const r = Math.random();
  if(r < .18) return pick(["A","K","N","W"])+rd()+rl()+rl();
  if(r < .30) return pick(["A","K","N","W"])+rl()+rd()+rl();
  if(r < .62) return pick(["K","N","W"])+rd()+rl()+rl()+rl();
  if(r < .78) return pick(["A","K","N","W"])+rl()+rd()+rl()+rl();
  return pick(["A","K","N","W"])+rl()+rd()+rl()+rl()+rl();
}
function dxCall(){
  const p = pick(DXPFX), n = Math.random() < .5 ? 2 : 3;
  let s = p + rd();
  for(let i=0;i<n;i++) s += rl();
  return s;
}

/* QSO scripts use {ME} {NAME} {QTH} {RIG} */
const QSOS = [
  { id:"answer", label:"Answer a CQ",
    blurb:"The contact you will make first. Someone calls CQ, you come back, you exchange the basics, you say 73.",
    lines:[
      {who:"W4JQP", t:"CQ CQ CQ DE W4JQP W4JQP W4JQP K", en:"Calling anyone. This is W4JQP. Over to anyone."},
      {who:"{ME}", t:"W4JQP DE {ME} {ME} K", en:"Answer with his call once, yours twice. No more than that."},
      {who:"W4JQP", t:"{ME} DE W4JQP = GE OM ES TNX FER CALL = UR RST 579 579 = NAME IS JIM JIM = QTH IS ATLANTA GA ATLANTA GA = HW CPY? = {ME} DE W4JQP KN", en:"Good evening old man and thanks for the call. Your report is 579. My name is Jim. I am in Atlanta, Georgia. How do you copy? Back to you only."},
      {who:"{ME}", t:"W4JQP DE {ME} = GE JIM ES TNX FER RPRT = UR RST 599 599 = NAME HR IS {NAME} {NAME} = QTH IS {QTH} {QTH} = RIG IS {RIG} RUNNING 50 W ES ANT IS A DIPOLE = HW? = W4JQP DE {ME} KN", en:"Your turn, same shape and same order: greeting, report, name, location, rig, over."},
      {who:"W4JQP", t:"{ME} DE W4JQP = FB {NAME} ES SOLID CPY = RIG HR IS K3 ES 100 W TO A VERTICAL = WX IS RAIN ES 68 F = MUST QRT NW = TNX FER FB QSO ES HPE CUAGN = 73 ES GL = {ME} DE W4JQP SK", en:"Fine business, solid copy. K3 at 100 watts to a vertical. Weather rain, 68 F. He has to stop. Thanks, hope to see you again, 73 and good luck. End of contact."},
      {who:"{ME}", t:"W4JQP DE {ME} = TNX JIM FER NICE QSO = 73 ES CUAGN = W4JQP DE {ME} SK", en:"Thanks Jim for the nice contact, 73 and see you again. End of contact."}
    ]},
  { id:"cq", label:"Call CQ yourself",
    blurb:"You call, a station answers, you run the contact. Do this after ten answered CQs.",
    lines:[
      {who:"{ME}", t:"CQ CQ CQ DE {ME} {ME} {ME} K", en:"3x3 is the standard call. Then listen for at least ten seconds."},
      {who:"KD8RTQ", t:"{ME} DE KD8RTQ KD8RTQ K", en:"KD8RTQ is answering you."},
      {who:"{ME}", t:"KD8RTQ DE {ME} = GM ES TNX FER CALL = UR RST 559 559 = NAME IS {NAME} {NAME} = QTH {QTH} = HW? = KD8RTQ DE {ME} KN", en:"Report first, then name, then location. Send the important things twice."},
      {who:"KD8RTQ", t:"{ME} DE KD8RTQ = TNX {NAME} = UR RST 579 = OP IS MIKE = QTH DETROIT MI = RIG FT-991A 80 W ES DIPOLE UP 30 FT = WX SNOW HR HI = BTU = {ME} DE KD8RTQ KN", en:"Thanks. Your report 579, operator Mike, Detroit Michigan, FT-991A at 80 watts into a dipole 30 feet up, weather is snow (laughing). Back to you."},
      {who:"{ME}", t:"KD8RTQ DE {ME} = FB MIKE ES TNX FER INFO = SRI ABT SNOW HI = QSL VIA LOTW = TNX FER QSO = 73 ES CUL = KD8RTQ DE {ME} SK", en:"Fine business Mike. Confirming via Logbook of the World. Thanks, 73, see you later."}
    ]},
  { id:"pota", label:"POTA / short exchange",
    blurb:"Parks on the Air and contests. Five seconds a contact. This is where most CW happens now.",
    lines:[
      {who:"K4XYZ", t:"CQ POTA DE K4XYZ K4XYZ K", en:"K4XYZ is activating a park and wants callers."},
      {who:"{ME}", t:"{ME}", en:"Send your call once. Nothing else. No DE, no K."},
      {who:"K4XYZ", t:"{ME} 599 GA", en:"He copied you: report 599, he is in Georgia."},
      {who:"{ME}", t:"RR 599 TX TU", en:"Roger roger, my report 599, my state, thank you. Change TX to your own state."},
      {who:"K4XYZ", t:"TU QRZ DE K4XYZ", en:"Thanks, who is next? This is K4XYZ. The contact is done."},
      {who:"K4XYZ", t:"{ME} UR 5NN 5NN TX TX BK", en:"Contest style: 5NN is 599 in cut numbers. BK means quick turnaround."}
    ]},
  { id:"trouble", label:"When it goes wrong",
    blurb:"Missed his call, fading, interference, somebody sending too fast. These six phrases save every contact.",
    lines:[
      {who:"?", t:"{ME} DE W?4B?T KN", en:"You only got part of it. That is completely normal."},
      {who:"{ME}", t:"AGN? UR CALL AGN? KN", en:"Again? Your call again? Over."},
      {who:"W4BQT", t:"W4BQT W4BQT W4BQT KN", en:"He repeats it three times, slowly."},
      {who:"{ME}", t:"QRS PSE = UR QRQ FER ME = KN", en:"Please send more slowly, you are too fast for me. Never be embarrassed to send this."},
      {who:"W4BQT", t:"QRS OK = NAME IS BOB BOB = QTH FL FL = KN", en:"He slows down. Good operators always will."},
      {who:"{ME}", t:"QRM HR = PSE RPT QTH = KN", en:"There is interference here, please repeat your location."},
      {who:"{ME}", t:"QSB ES CPI ABT 60 PCT = 73 ES TNX = SK", en:"Signal is fading and I am copying about 60 percent. Wrapping up honestly beats faking it."}
    ]}
];

/* morse.js — Morse table, Koch order, mnemonics
   Part of Morse Easy. Loaded as a classic script; see js/README for load order. */
"use strict";

const MORSE = {
  A:".-",B:"-...",C:"-.-.",D:"-..",E:".",F:"..-.",G:"--.",H:"....",I:"..",
  J:".---",K:"-.-",L:".-..",M:"--",N:"-.",O:"---",P:".--.",Q:"--.-",R:".-.",
  S:"...",T:"-",U:"..-",V:"...-",W:".--",X:"-..-",Y:"-.--",Z:"--..",
  "0":"-----","1":".----","2":"..---","3":"...--","4":"....-",
  "5":".....","6":"-....","7":"--...","8":"---..","9":"----.",
  ".":".-.-.-",",":"--..--","?":"..--..","/":"-..-.","=":"-...-",
  "+":".-.-.","-":"-....-",":":"---...","'":".----.","\"":".-..-.",
  "(":"-.--.",")":"-.--.-","!":"-.-.--","@":".--.-.",
  "<AR>":".-.-.","<SK>":"...-.-","<BT>":"-...-","<KN>":"-.--.","<AS>":".-...",
  "<BK>":"-...-.-","<SN>":"...-.","<HH>":"........","<CL>":"-.-..-..","<CT>":"-.-.-"
};
const REV = {};
"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?/=".split("").forEach(c => { REV[MORSE[c]] = c; });

const MNEMONIC = {
  A:"a-BOUT",B:"BOO-hoo-hoo-hoo",C:"CO-ca CO-la",D:"DOG-did-it",E:"eh",
  F:"did-it-FLEA-bit",G:"GOOD-GRAV-y",H:"hip-hip-hip-hip",I:"i-bid",
  J:"jo-JAN-JIN-JOE",K:"KANG-a-ROO",L:"to-LEAP-to-leap",M:"MMM-MMM",
  N:"NAV-y",O:"OLD-OLD-OLD",P:"a-POOR-PUP-py",Q:"GOD-SAVE-the-QUEEN",
  R:"ro-TA-tion",S:"sik-a-see",T:"TALL",U:"u-ni-VERSE",V:"vic-to-ry-VEE",
  W:"the-WEST-WIND",X:"X-ray-the-BOX",Y:"YAN-kee-DOO-DLE",Z:"ZINC-ZINC-a-bar"
};

const KOCH = "KMRSUAPTLOWI.NJEF0Y,VG5/Q9ZH38B?427C1D6X".split("");

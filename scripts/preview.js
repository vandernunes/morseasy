/* preview.js — render the site at phone size and measure it.
 *
 * Optional dev tool. The app itself has no dependencies; this does, so it is
 * NOT part of the build or CI. Use it when you change layout:
 *
 *     npm i -D playwright && npx playwright install chromium
 *     python3 scripts/build.py
 *     python3 -m http.server 8899 --directory dist &
 *     node scripts/preview.js http://127.0.0.1:8899/ learn,words,calls,qso,send
 *
 * It writes m-<tab>.png per tab and prints the numbers that actually matter on
 * a phone: horizontal overflow, header height, where content starts, and any
 * tap target under 44px.
 *
 * Vander Nunes - N5EDB
 */
const { chromium, devices } = require('playwright');
(async () => {
  const url = process.argv[2] || 'https://morseasy.com/';
  const tabs = process.argv[3] ? process.argv[3].split(',') : ['learn'];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(() => {
    // skip the first-run dialog and look like a returning learner
    localStorage.setItem('morseasy-v1', JSON.stringify({
      call:'N5EDB', name:'VANDER', qth:'AUSTIN TX', rig:'IC-7300',
      lesson:5, stageByLesson:{1:3,2:3,3:3,4:3,5:2}, bestByLesson:{1:96,2:92,3:90,4:94},
      charErr:{K:3,M:8,R:2,S:5,U:9}, charOk:{K:80,M:60,R:70,S:55,U:40},
      days:{}, seenHelp:true, groupsPerLesson:8, showPad:true, repeatMissed:true, updatedAt:Date.now()
    }));
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await page.goto(url, { waitUntil:'networkidle' });
  await page.waitForTimeout(600);

  for (const t of tabs) {
    await page.click(`.mbtn[data-mode="${t}"]`).catch(()=>{});
    await page.waitForTimeout(450);
    const m = await page.evaluate(() => {
      const vv = window.innerHeight;
      const hdr = document.querySelector('.rig-top');
      const tabs = document.querySelector('.modes');
      const firstCard = document.querySelector('.pane:not([hidden]) > *');
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        headerH: hdr?.offsetHeight,
        tabsH: tabs?.offsetHeight,
        contentTop: firstCard ? Math.round(firstCard.getBoundingClientRect().top) : null,
        usable: vv,
        tooSmall: [...document.querySelectorAll('button, .key, .mbtn, .spd, a')]
          .filter(e => { const r = e.getBoundingClientRect();
                         return r.width > 0 && r.height > 0 && r.height < 44; })
          .map(e => `${(e.className||e.tagName).toString().split(' ')[0]}:${Math.round(e.getBoundingClientRect().height)}px`)
          .filter((v,i,a) => a.indexOf(v) === i).slice(0,10),
      };
    });
    console.log(`\n== ${t} == overflow:${m.overflow}px header:${m.headerH}px tabs:${m.tabsH}px contentTop:${m.contentTop}px of ${m.usable}px`);
    if (m.tooSmall.length) console.log('   UNDER 44px:', m.tooSmall.join(' '));
    await page.screenshot({ path:`m-${t}.png` });
  }
  if (errs.length) console.log('\nERRORS:', errs.join(' | '));
  await browser.close();
})();

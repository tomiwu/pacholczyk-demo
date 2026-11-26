import { chromium } from '/workspace/pacholczyk-demo/tools/node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';
const base = process.argv[2] || 'http://127.0.0.1:8765/e/';
const out = process.argv[3] || '/workspace/pacholczyk-demo/shots/e';
mkdirSync(out, { recursive: true });
const vps = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1280, height: 800 },
};
const b = await chromium.launch();
for (const [vn, vp] of Object.entries(vps)) for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor || 1,
    isMobile: !!vp.isMobile,
    hasTouch: !!vp.hasTouch,
    colorScheme: scheme,
  });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(base, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(700);
  await pg.screenshot({ path: `${out}/${vn}-${scheme}-land.png` });
  // scroll into the story start
  const y = await pg.evaluate(() => document.getElementById('story').offsetTop);
  await pg.evaluate(v => window.scrollTo(0, v), y);
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: `${out}/${vn}-${scheme}-story-000.png` });
  console.log(vn, scheme, 'errors', JSON.stringify(errs));
  await ctx.close();
}
await b.close();
console.log('done');

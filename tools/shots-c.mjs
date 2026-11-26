import { chromium } from '/workspace/pacholczyk-demo/tools/node_modules/playwright/index.mjs';
const base = process.argv[2] || 'http://127.0.0.1:8765/c/';
const out = process.argv[3] || '/workspace/pacholczyk-demo/shots/c';
import { mkdirSync } from 'fs';
mkdirSync(out, { recursive: true });
const vps = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1280, height: 800 },
};
const points = [0, 0.12, 0.25, 0.3, 0.4, 0.47, 0.5, 0.55, 0.68, 0.75, 0.8, 0.88, 1];
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
  await pg.waitForFunction(() => {
    const cv = document.getElementById('cv');
    return cv && cv.classList.contains('on');
  }, { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(800);
  const len = await pg.evaluate(() => {
    const s = document.getElementById('story');
    return s.offsetHeight - innerHeight;
  });
  for (const p of points) {
    await pg.evaluate(y => window.scrollTo(0, y), Math.round(p * len));
    await pg.waitForTimeout(1200);
    const name = `${vn}-${scheme}-story-${String(Math.round(p * 100)).padStart(3, '0')}.png`;
    await pg.screenshot({ path: `${out}/${name}` });
  }
  console.log(vn, scheme, 'errors:', JSON.stringify(errs));
  await ctx.close();
}
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const pg = await ctx.newPage();
await pg.goto(base, { waitUntil: 'networkidle' });
await pg.waitForTimeout(800);
await pg.screenshot({ path: `${out}/mobile-light-reduced-motion.png` });
await b.close();
console.log('done', out);

import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8765/';
const out = process.argv[3] || '/workspace/pacholczyk-demo/shots';
const vps = { mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, desktop: { width: 1280, height: 800 } };
const b = await chromium.launch();
for (const [vn, vp] of Object.entries(vps)) for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: vp.isMobile, hasTouch: vp.hasTouch, colorScheme: scheme });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(base, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);
  const len = await pg.evaluate(() => { const s = document.getElementById('story'); return s.offsetHeight - innerHeight; });
  for (const p of [0, 0.12, 0.3, 0.4, 0.47, 0.55, 0.68, 0.8, 0.88, 1]) {
    await pg.evaluate(y => window.scrollTo(0, y), Math.round(p * len));
    await pg.waitForTimeout(1100);
    await pg.screenshot({ path: `${out}/${vn}-${scheme}-story-${String(Math.round(p * 100)).padStart(3, '0')}.png` });
  }
  for (const id of ['o-nas', 'uslugi', 'pierwsze-kroki', 'zgloszenie', 'kontakt']) {
    await pg.evaluate(i => document.getElementById(i).scrollIntoView({ block: 'start' }), id);
    await pg.waitForTimeout(900);
    await pg.screenshot({ path: `${out}/${vn}-${scheme}-${id}.png` });
  }
  console.log(vn, scheme, 'errors:', JSON.stringify(errs));
  await ctx.close();
}
// reduced motion
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const pg = await ctx.newPage(); await pg.goto(base, { waitUntil: 'networkidle' }); await pg.waitForTimeout(800);
await pg.screenshot({ path: `${out}/mobile-light-reduced-motion.png`, fullPage: false });
await b.close();

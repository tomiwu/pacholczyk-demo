import { chromium } from '/workspace/pacholczyk-demo/tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';

const base = process.argv[2] || 'http://127.0.0.1:8765/d/';
const out = process.argv[3] || '/workspace/pacholczyk-demo/shots/d';
mkdirSync(out, { recursive: true });

function linreg(xs, ys) {
  const n = xs.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
  const den = n * sxx - sx * sx;
  const slope = den ? (n * sxy - sx * sy) / den : 0;
  const intercept = (sy - slope * sx) / n;
  let ssTot = 0, ssRes = 0;
  const mean = sy / n;
  let maxAbs = 0;
  for (let i = 0; i < n; i++) {
    const pred = slope * xs[i] + intercept;
    const res = ys[i] - pred;
    ssRes += res * res;
    ssTot += (ys[i] - mean) * (ys[i] - mean);
    if (Math.abs(res) > maxAbs) maxAbs = Math.abs(res);
  }
  const r2 = ssTot ? 1 - ssRes / ssTot : 1;
  return { slope, intercept, r2, maxAbs, n };
}

async function runViewport(browser, name, opts) {
  const ctx = await browser.newContext({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: opts.deviceScaleFactor || 1,
    isMobile: !!opts.isMobile,
    hasTouch: !!opts.hasTouch,
    colorScheme: 'light',
  });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const t0 = Date.now();
  await pg.goto(base, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__story && window.__story.loaded >= 1, { timeout: 20000 });
  const firstReady = Date.now() - t0;
  await pg.waitForFunction(() => window.__story && window.__story.ready(), { timeout: 60000 });
  const allReady = Date.now() - t0;
  const meta = await pg.evaluate(() => {
    const story = document.getElementById('story');
    const next = document.getElementById('o-nas');
    return {
      N: window.__story.N,
      storyTop: window.__story.storyTop,
      scrollLen: window.__story.scrollLen,
      storyHeight: story.offsetHeight,
      innerHeight,
      nextTop: next.offsetTop,
      loaded: window.__story.loaded,
    };
  });

  const steps = 60;
  const samples = [];
  for (let i = 0; i <= steps; i++) {
    const y = Math.round((i / steps) * meta.scrollLen);
    await pg.evaluate(v => window.scrollTo(0, v), y);
    await pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const s = await pg.evaluate(() => {
      const next = document.getElementById('o-nas');
      const r = next.getBoundingClientRect();
      return {
        scrollY: window.scrollY,
        p: window.__story.p,
        frame: window.__story.frame,
        nextTop: r.top,
        innerHeight,
        loaded: window.__story.loaded,
      };
    });
    samples.push(s);
  }

  // Exact position where the next section starts to enter the viewport
  const yEnd = meta.nextTop - meta.innerHeight;
  await pg.evaluate(v => window.scrollTo(0, v), Math.max(0, yEnd));
  await pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const atEnd = await pg.evaluate(() => {
    const next = document.getElementById('o-nas');
    return {
      scrollY: window.scrollY,
      p: window.__story.p,
      frame: window.__story.frame,
      nextTop: next.getBoundingClientRect().top,
      innerHeight,
    };
  });
  await pg.screenshot({ path: `${out}/${name}-light-story-end.png` });
  await pg.evaluate(() => window.scrollTo(0, 0));
  await pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await pg.screenshot({ path: `${out}/${name}-light-story-000.png` });

  // Fast scroll: jump through the story in ~45 rAF steps, count unique integer frames and raf gaps
  await pg.evaluate(() => window.__story.resetStats());
  const fast = await pg.evaluate(async ({ scrollLen }) => {
    const seen = new Set();
    const start = performance.now();
    const steps = 45;
    for (let i = 0; i <= steps; i++) {
      window.scrollTo(0, Math.round((i / steps) * scrollLen));
      await new Promise(r => requestAnimationFrame(r));
      seen.add(Math.round(window.__story.frame));
    }
    return {
      uniqueFrames: seen.size,
      draws: window.__story.draws,
      rafGaps: window.__story.rafGaps,
      ms: Math.round(performance.now() - start),
    };
  }, { scrollLen: meta.scrollLen });

  const xs = samples.map(s => s.p);
  const ys = samples.map(s => s.frame);
  const fit = linreg(xs, ys);
  const startFrame = samples[0].frame;
  const endFrame = samples[samples.length - 1].frame;
  const expectedSlope = meta.N - 1;
  const maxDevFromLinear = Math.max(...samples.map(s => Math.abs(s.frame - s.p * (meta.N - 1))));
  const result = {
    name,
    errs,
    firstReadyMs: firstReady,
    allReadyMs: allReady,
    meta,
    atEnd,
    fit: { ...fit, expectedSlope, maxDevFromLinear, startFrame, endFrame },
    fast,
    samples: samples.filter((_, i) => i % 10 === 0 || i === samples.length - 1),
  };
  await ctx.close();
  return result;
}

const browser = await chromium.launch();
const results = [];
results.push(await runViewport(browser, 'mobile', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
results.push(await runViewport(browser, 'desktop', { width: 1280, height: 800 }));
await browser.close();
writeFileSync(`${out}/linearity.json`, JSON.stringify(results, null, 2));
for (const r of results) {
  const f = r.fit;
  const e = r.atEnd;
  console.log('====', r.name, '====');
  console.log('errors', JSON.stringify(r.errs));
  console.log('ready first/all ms', r.firstReadyMs, r.allReadyMs, 'loaded', r.meta.loaded, '/', r.meta.N);
  console.log('scrollLen', r.meta.scrollLen, 'storyHeight', r.meta.storyHeight, 'innerHeight', r.meta.innerHeight);
  console.log('next.offsetTop', r.meta.nextTop, 'storyTop+height', r.meta.storyTop + r.meta.storyHeight);
  console.log('linearity R2', f.r2.toFixed(6), 'slope', f.slope.toFixed(4), 'expected', f.expectedSlope, 'intercept', f.intercept.toFixed(4), 'maxDev', f.maxDevFromLinear.toFixed(4), 'maxAbs residual', f.maxAbs.toFixed(4));
  console.log('start frame', f.startFrame, 'end sample frame', f.endFrame);
  console.log('at next-section start: scrollY', e.scrollY, 'p', e.p, 'frame', e.frame, 'nextTop', e.nextTop, 'innerHeight', e.innerHeight, 'nextTop-innerHeight', e.nextTop - e.innerHeight);
  console.log('fast scroll unique frames', r.fast.uniqueFrames, 'draws', r.fast.draws, 'rafGaps>20ms', r.fast.rafGaps, 'ms', r.fast.ms);
}

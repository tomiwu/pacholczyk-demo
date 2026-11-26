import { chromium, webkit, devices } from '/workspace/pacholczyk-demo/tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync, renameSync, readdirSync } from 'fs';

const base = process.argv[2] || 'http://127.0.0.1:8765/h/';
const out = process.argv[3] || '/workspace/pacholczyk-demo/shots/h';
mkdirSync(out, { recursive: true });

const HOOK = `(() => {
  if (window.__profHooked) return;
  window.__profHooked = true;
  const P = window.__prof = { draw:[], raf:[], longDraw:0, longRaf:0, canvas:{w:0,h:0}, t0: performance.now(), longtasks:[] };
  const proto = CanvasRenderingContext2D.prototype;
  const orig = proto.drawImage;
  proto.drawImage = function() {
    const t0 = performance.now();
    const r = orig.apply(this, arguments);
    const dt = performance.now() - t0;
    if (P.draw.length < 8000) P.draw.push(dt);
    if (dt > 8) P.longDraw++;
    P.canvas.w = this.canvas.width;
    P.canvas.h = this.canvas.height;
    return r;
  };
  let lastRafT = 0;
  const wrap = (cb) => function(ts) {
    const t = performance.now();
    const gap = lastRafT ? t - lastRafT : 0;
    lastRafT = t;
    const t0 = performance.now();
    const ret = cb.call(this, ts);
    const dt = performance.now() - t0;
    const st = window.__story;
    if (P.raf.length < 8000) P.raf.push({ t, gap, dt, frame: st ? st.shown : -1, index: st ? st.index : -1 });
    if (dt > 16) P.longRaf++;
    return ret;
  };
  const origRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => origRAF(wrap(cb));
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) P.longtasks.push({ t: e.startTime, dur: e.duration });
    });
    po.observe({ type: 'longtask', buffered: true });
  } catch (e) {}
})();`;

function stats(arr) {
  if (!arr.length) return { n: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  const a = [...arr].sort((x, y) => x - y);
  const q = (p) => a[Math.min(a.length - 1, Math.floor(p * (a.length - 1)))];
  return {
    n: a.length,
    avg: Math.round(a.reduce((s, v) => s + v, 0) / a.length * 100) / 100,
    p50: Math.round(q(0.5) * 100) / 100,
    p95: Math.round(q(0.95) * 100) / 100,
    p99: Math.round(q(0.99) * 100) / 100,
    max: Math.round(a[a.length - 1] * 100) / 100,
  };
}

async function swipe(pg, { y0, y1, ms = 180, steps = 12, typ = 'touch' }) {
  await pg.evaluate(async ({ y0, y1, ms, steps, typ }) => {
    const x = window.innerWidth / 2;
    const t0 = performance.now();
    const fire = (type, y, extra) => {
      const ev = new PointerEvent(type, {
        pointerId: 1, pointerType: typ, isPrimary: true,
        clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true,
        ...extra,
      });
      (document.elementFromPoint(x, y) || document).dispatchEvent(ev);
      document.dispatchEvent(ev);
    };
    fire('pointerdown', y0, { buttons: 1 });
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      const y = y0 + (y1 - y0) * u;
      const elapsed = (ms * u);
      const wait = t0 + elapsed - performance.now();
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      fire('pointermove', y, { buttons: 1 });
    }
    fire('pointerup', y1, { buttons: 0 });
  }, { y0, y1, ms, steps, typ });
}

async function waitAnim(pg, timeout = 4000) {
  await pg.waitForFunction(() => window.__story && !window.__story.animating && !window.__story.dragging, { timeout });
}

async function openPage(browser, { cpu, engine, recordVideo, name }) {
  const i13 = devices['iPhone 13'];
  const opts = engine === 'webkit'
    ? { ...i13, locale: 'pl-PL', colorScheme: 'light', recordVideo: recordVideo ? { dir: `${out}/video-${name}`, size: { width: 390, height: 844 } } : undefined }
    : {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        colorScheme: 'light',
        recordVideo: recordVideo ? { dir: `${out}/video-${name}`, size: { width: 390, height: 844 } } : undefined,
      };
  const ctx = await browser.newContext(opts);
  const pg = await ctx.newPage();
  let cdp = null;
  if (engine !== 'webkit') {
    try {
      cdp = await ctx.newCDPSession(pg);
      if (cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    } catch (e) {}
  }
  await pg.addInitScript(HOOK);
  await pg.goto(base, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__story, { timeout: 20000 });
  return { ctx, pg, cdp };
}

async function closeVideo(ctx, name) {
  const dir = `${out}/video-${name}`;
  await ctx.close();
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.webm'));
    if (files[0]) {
      const dest = `${out}/${name}.webm`;
      renameSync(`${dir}/${files[0]}`, dest);
      return dest;
    }
  } catch (e) {}
  return null;
}

const results = { tests: [], perf: [] };
let failed = 0;
function check(name, cond, extra) {
  const ok = !!cond;
  if (!ok) failed++;
  const rec = { name, ok, ...extra };
  results.tests.push(rec);
  console.log(ok ? 'PASS' : 'FAIL', name, extra ? JSON.stringify(extra) : '');
  return ok;
}

async function behaviorTests(browser, engine) {
  const tag = engine;
  const { ctx, pg } = await openPage(browser, { engine, name: `${tag}-beh` });
  const start = await pg.evaluate(() => {
    const land = document.getElementById('top');
    const bar = document.querySelector('.callbar');
    const cv = document.getElementById('cv');
    const btns = document.getElementById('land-btns');
    return {
      index: window.__story.index,
      locked: window.__story.locked,
      landOut: land.classList.contains('out'),
      landVisible: getComputedStyle(land).visibility,
      callbarOff: bar.classList.contains('off'),
      canvasOn: cv.classList.contains('on'),
      btnsInLand: !!btns,
      heroH: document.getElementById('hero').getBoundingClientRect().height,
      vh: window.innerHeight,
      usesVh: [...document.styleSheets].length, // dummy
    };
  });
  check(`${tag}: starts on landing`, start.index === 0 && start.locked && !start.landOut && start.callbarOff && !start.canvasOn, start);
  check(`${tag}: hero is ~viewport (svh)`, start.heroH >= start.vh * 0.9 && start.heroH <= start.vh + 2, { heroH: start.heroH, vh: start.vh });

  await pg.waitForFunction(() => window.__story.ready(), { timeout: 30000 });
  const ready = await pg.evaluate(() => ({ loaded: window.__story.loaded, bitmaps: window.__story.bitmaps, canvas: window.__story.canvas }));
  check(`${tag}: 4 scene stills ready`, ready.loaded >= 4, ready);

  // programmatic one scene at a time
  await pg.evaluate(() => window.__story.go(1));
  await waitAnim(pg);
  const s1 = await pg.evaluate(() => {
    const land = document.getElementById('top');
    const bar = document.querySelector('.callbar');
    const caps = [...document.querySelectorAll('.cap')].map(c => ({
      o: parseFloat(c.style.opacity || getComputedStyle(c).opacity),
      vis: c.style.visibility || getComputedStyle(c).visibility,
      t: c.innerText.slice(0, 60),
    }));
    return {
      index: window.__story.index, frame: window.__story.shown, target: window.__story.target,
      p: window.__story.p,
      landOut: land.classList.contains('out'), callbarOff: bar.classList.contains('off'),
      caps, canvas: window.__story.canvas,
    };
  });
  check(`${tag}: go(1) = church frame 10, text on, land out, callbar on`, s1.index === 1 && s1.frame === 10 && s1.caps[0].o > 0.95 && s1.caps[1].o < 0.05 && s1.landOut && !s1.callbarOff, s1);
  check(`${tag}: canvas is native size (not DPR 3)`, s1.canvas.w === 405 && s1.canvas.h === 720, s1.canvas);

  async function snapShot(i, file) {
    await pg.evaluate(i => window.__story.snap(i), i);
    const need = await pg.evaluate(i => window.__story.SCENES[i-1], i);
    await pg.waitForFunction(f => window.__story && window.__story.shown === f, need, { timeout: 20000 });
    await pg.screenshot({ path: file });
  }
  await snapShot(1, `${out}/${tag}-scene1.png`);
  await snapShot(2, `${out}/${tag}-scene2.png`);
  await snapShot(3, `${out}/${tag}-scene3.png`);
  const s3 = await pg.evaluate(() => ({
    index: window.__story.index, frame: window.__story.shown, p: window.__story.p,
    caps: [...document.querySelectorAll('.cap')].map(c => parseFloat(c.style.opacity || getComputedStyle(c).opacity)),
    text: document.querySelectorAll('.cap')[2].innerText.slice(0, 40),
  }));
  check(`${tag}: snap 3 = road frame 75, trzecia didaskalia on`, s3.index === 3 && s3.frame === 75 && s3.caps[2] > 0.95 && s3.caps[0] < 0.05 && s3.caps[1] < 0.05, s3);
  await snapShot(4, `${out}/${tag}-scene4.png`);
  const snaps = await pg.evaluate(() => ({
    index: window.__story.index, frame: window.__story.shown, p: window.__story.p,
    caps: [...document.querySelectorAll('.cap')].map(c => parseFloat(c.style.opacity || getComputedStyle(c).opacity)),
  }));
  check(`${tag}: snap 4 = heaven frame 112, last caption on`, snaps.index === 4 && snaps.frame === 112 && snaps.caps[3] > 0.95 && snaps.caps[0] < 0.05 && snaps.caps[1] < 0.05, snaps);

  await pg.evaluate(() => window.__story.snap(0));
  await pg.screenshot({ path: `${out}/${tag}-land.png` });

  // FAST fling up from landing: one scene only (not 2+)
  await swipe(pg, { y0: 700, y1: 80, ms: 90, steps: 8 });
  await waitAnim(pg);
  const fling1 = await pg.evaluate(() => ({ index: window.__story.index, frame: window.__story.shown, anim: window.__story.animating }));
  check(`${tag}: fast fling from landing = exactly scene 1`, fling1.index === 1, fling1);

  // Second fast fling: exactly scene 2, not 3 or 4
  await swipe(pg, { y0: 700, y1: 80, ms: 90, steps: 8 });
  await waitAnim(pg);
  const fling2 = await pg.evaluate(() => ({ index: window.__story.index, frame: window.__story.shown }));
  check(`${tag}: second fast fling = exactly scene 2`, fling2.index === 2, fling2);

  // Slow drag toward next, release before threshold: snap back
  await pg.evaluate(() => window.__story.snap(2));
  // 10% of 844 is ~84px, threshold is 16% ~135px. Drag 70px up and release slowly.
  const before = await pg.evaluate(() => window.__story.index);
  await swipe(pg, { y0: 500, y1: 440, ms: 500, steps: 16 });
  await waitAnim(pg);
  const back = await pg.evaluate(() => ({
    index: window.__story.index, frame: window.__story.shown,
    caps: [...document.querySelectorAll('.cap')].map(c => parseFloat(c.style.opacity || getComputedStyle(c).opacity)),
  }));
  check(`${tag}: short slow drag snaps back to scene 2`, back.index === 2 && before === 2 && back.frame === 55, back);

  // Slow drag past threshold: go to scene 3. 40% of vh ~ 340px, threshold 16% ~135px. Drag 250px slowly.
  await swipe(pg, { y0: 620, y1: 300, ms: 550, steps: 18 });
  await waitAnim(pg);
  const fwd = await pg.evaluate(() => ({ index: window.__story.index, frame: window.__story.shown }));
  check(`${tag}: long slow drag advances one scene to 3`, fwd.index === 3, fwd);

  // Confirm scrub mid-drag (don't wait for release mid... we need during drag)
  await pg.evaluate(() => window.__story.snap(2));
  const scrub = await pg.evaluate(async () => {
    const x = innerWidth / 2;
    const fire = (type, y, extra) => {
      const ev = new PointerEvent(type, { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true, ...extra });
      document.dispatchEvent(ev);
    };
    const capOp = () => [...document.querySelectorAll('.cap')].map(c => parseFloat(c.style.opacity || '0'));
    const a = window.__story.shown;
    const capA = capOp();
    fire('pointerdown', 600, { buttons: 1 });
    fire('pointermove', 420, { buttons: 1 });
    await new Promise(r => setTimeout(r, 40));
    const mid = { index: window.__story.index, frame: window.__story.shown, dragging: window.__story.dragging, caps: capOp(), p: window.__story.p };
    fire('pointerup', 420, { buttons: 0 });
    return { a, capA, mid };
  });
  await waitAnim(pg);
  const midCapsOn = (scrub.mid.caps || []).some(o => o > 0.05);
  // Frame 55 toward 75: mid is later in the film, so captions must still follow A (not be forced to 0).
  check(`${tag}: drag scrubs a different frame and text follows frame timing`, scrub.mid.dragging && scrub.mid.frame !== scrub.a && midCapsOn, scrub);

  // After scene 4, next fling leaves the story
  await pg.evaluate(() => window.__story.snap(4));
  await swipe(pg, { y0: 700, y1: 80, ms: 90, steps: 8 });
  await pg.waitForTimeout(700);
  const left = await pg.evaluate(() => ({
    index: window.__story.index,
    locked: window.__story.locked,
    y: window.scrollY,
    oNasTop: document.getElementById('o-nas').getBoundingClientRect().top,
  }));
  check(`${tag}: swipe after scene 4 leaves to the page`, left.index === 5 && left.locked === false && left.y > 100, left);

  await ctx.close();
}

async function perfTransition(browser, { cpu, name, recordVideo }) {
  const { ctx, pg } = await openPage(browser, { cpu, engine: 'chromium', recordVideo, name });
  await pg.waitForFunction(() => window.__story.ready(), { timeout: 30000 });
  // wait for the first range (0-55) so scene 1→2 has frames
  await pg.waitForFunction(() => window.__story.rangeReady(10, 55), { timeout: 30000 }).catch(() => {});
  await pg.evaluate(() => { window.__story.snap(1); window.__prof.draw = []; window.__prof.raf = []; window.__prof.longtasks = []; window.__story.resetStats(); });
  const t0 = Date.now();
  await pg.evaluate(() => window.__story.go(2));
  await waitAnim(pg);
  const wall = Date.now() - t0;
  const raw = await pg.evaluate(() => {
    const P = window.__prof;
    const mem = performance.memory ? performance.memory.usedJSHeapSize : 0;
    return {
      draw: P.draw, raf: P.raf, canvas: P.canvas, longtasks: P.longtasks || [],
      shown: window.__story.shown, index: window.__story.index,
      bitmaps: window.__story.bitmaps, loaded: window.__story.loaded,
      draws: window.__story.draws, mem, memEstMB: window.__story.memEstMB, format: window.__story.format,
    };
  });
  const gaps = raw.raf.map(r => r.gap).filter(g => g > 0);
  const dts = raw.raf.map(r => r.dt);
  const frames = raw.raf.map(r => r.frame).filter(f => f >= 0);
  const unique = new Set(frames.map(f => Math.round(f))).size;
  const summary = {
    name, cpu, wallMs: wall,
    canvas: raw.canvas,
    raf: stats(dts),
    rafGap: stats(gaps),
    drawImage: stats(raw.draw),
    dropped: {
      over20ms: gaps.filter(g => g > 20).length,
      over33ms: gaps.filter(g => g > 33).length,
      over50ms: gaps.filter(g => g > 50).length,
      totalRaf: raw.raf.length,
    },
    uniqueFramesShown: unique,
    expectedRange: 55 - 10 + 1,
    index: raw.index, shown: raw.shown,
    bitmaps: raw.bitmaps,
    jsHeapMB: Math.round(raw.mem / 1048576 * 10) / 10,
    bitmapEstMB: raw.memEstMB != null ? raw.memEstMB : Math.round(raw.bitmaps * 405 * 720 * 4 / 1048576 * 10) / 10,
    format: raw.format,
    longtasks: raw.longtasks.length
      ? { n: raw.longtasks.length, totalMs: Math.round(raw.longtasks.reduce((s, e) => s + e.dur, 0)), max: Math.round(Math.max(0, ...raw.longtasks.map(e => e.dur))) }
      : { n: 0, totalMs: 0, max: 0 },
  };
  if (recordVideo) summary.video = await closeVideo(ctx, name);
  else await ctx.close();
  results.perf.push(summary);
  console.log('PERF', name, JSON.stringify({
    wall: summary.wallMs, canvas: summary.canvas,
    rafP95: summary.raf.p95, gapP50: summary.rafGap.p50, gapP95: summary.rafGap.p95,
    drop33: summary.dropped.over33ms, drop50: summary.dropped.over50ms, totalRaf: summary.dropped.totalRaf,
    drawP95: summary.drawImage.p95, unique: summary.uniqueFramesShown,
    bitmaps: summary.bitmaps, estMB: summary.bitmapEstMB, longtasks: summary.longtasks,
  }));
  writeFileSync(`${out}/${name}.json`, JSON.stringify(summary, null, 2));
  return summary;
}

const chromiumBrowser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
try {
  await behaviorTests(chromiumBrowser, 'chromium');
  await perfTransition(chromiumBrowser, { cpu: 4, name: 'f-trans-cpu4', recordVideo: false });
  await perfTransition(chromiumBrowser, { cpu: 6, name: 'f-trans-cpu6', recordVideo: true });
  // also measure a long drag scrub under 6x
} finally {
  await chromiumBrowser.close();
}

const webkitBrowser = await webkit.launch();
try {
  await behaviorTests(webkitBrowser, 'webkit');
} catch (e) {
  failed++;
  results.tests.push({ name: 'webkit: suite', ok: false, error: String(e) });
  console.log('FAIL webkit suite', e);
} finally {
  await webkitBrowser.close();
}

writeFileSync(`${out}/summary.json`, JSON.stringify(results, null, 2));
console.log('\n====', failed, 'failed of', results.tests.length, '====');
process.exit(failed ? 1 : 0);

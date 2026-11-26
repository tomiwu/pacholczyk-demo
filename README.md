# Pacholczyk — scroll story demo

Demo only. All rights reserved.

This is a static demo of the first page for Zakład Usług Pogrzebowych Pacholczyk (Uniejów and Turek). It is not the production site. The production site is in a different repository.

**The images on this demo are for the demo only.** They include AI-made concept art and reference photos. For the real site, Tomasz will take new photos and we must replace these images.

Search engines must not index this demo (`noindex` and `robots.txt`).

Do not publish the production site or change DNS without Tomasz's own words.

## Versions

Each version has its own path. A new version gets the next letter. Do not overwrite an older version.

| Version | URL | What it is |
|---|---|---|
| Index | https://tomiwu.github.io/pacholczyk-demo/ | List of versions. The newest version is E. |
| A | https://tomiwu.github.io/pacholczyk-demo/a/ | The first video-frame story. 120 WebP frames per theme and orientation. This is the look Tomasz preferred. |
| B | https://tomiwu.github.io/pacholczyk-demo/b/ | The light layered story (4 scenes + 2 sprites). Smaller files. Tomasz said this look was worse. |
| C | https://tomiwu.github.io/pacholczyk-demo/c/ | Key frames from the same videos as A (32 frames) with a canvas crossfade and scroll easing. AVIF with a WebP fallback. |
| D | https://tomiwu.github.io/pacholczyk-demo/d/ | Same 120 video frames as A. The frame index is a linear function of scroll progress over the sticky range. The last frame is on screen when the next section starts. No easing. Frames are preloaded as ImageBitmaps. |
| E | https://tomiwu.github.io/pacholczyk-demo/e/ | Same scroll story as D, with a landing view: the company name, the towns Uniejów · Turek, and a muted photo of the Warta and the castle. The photo is a small AVIF (about 34 KB on a phone) with an inline blur placeholder. |
| F | https://tomiwu.github.io/pacholczyk-demo/f/ | Landing view from E, then four snap scenes (church, hearse, road, heaven). One swipe or wheel gesture moves exactly one scene. The finger can scrub frames; on release the player plays to the target at a constant speed. The canvas is the native frame size (CSS cover). Text shows only on a settled scene, on a panel. Assets use a cache-busting query. |

Each version page has a small switcher: A | B | C | D | E.

## Version C in short

- 32 key frames per theme (`light`, `dark`) and orientation (`d` = 1280×720, `m` = 405×720 portrait crop).
- The script draws two neighbour frames on a canvas and blends them with the fractional scroll position. A small lerp eases the motion.
- Frame 0 loads first (it is also the LCP poster). The other frames load later, in order of scroll proximity.
- With "reduce motion" on, or with JavaScript off, the page shows the same still images as version A.
- `c/tools/frames.py` builds the frames from `video/concept.mp4` and `video/concept-dark.mp4`.

## Shared files at the repository root

- `index.html`: the version list.
- `robots.txt`, `.nojekyll`, `.gitignore`.
- `a/`, `b/`, `c/`, `d/`, `e/`: the complete versions. Fonts stay inside each version, so an old version does not break.

## Version D in short

- Same look and same 120 WebP frames as version A.
- Cause of the lag and the ease-in / ease-out feel in A: the script moved the frame position with a lerp (`cur = cur + (target - cur) * 0.14`). The shown frame trailed the scroll, started late, and eased in at the end, so the last frames could arrive after the next section had started. Frames also loaded in a coarse-to-fine order as `<img>` elements, so a missing frame held the nearest loaded one.
- In D the frame index is `progress * 119`, where progress is `(scrollY - storyTop) / (storyHeight - viewportHeight)`. There is no easing.
- All frames preload as `ImageBitmap`s (fetch + `createImageBitmap`) while the poster is on screen. The canvas draws in `requestAnimationFrame` only when the index changes. The scroll listener is passive. Layout is measured on resize, not in the draw loop.

## Version E in short

- Same linear 120-frame story as version D.
- The first screen is a landing view. It shows the name **Pacholczyk**, the line "Zakład Usług Pogrzebowych", and the towns **Uniejów · Turek** under the name, with the 24h phone button.
- The background is a muted photo of the Warta and the castle in Uniejów (Annkes, CC BY 3.0). A cream or graphite scrim keeps the text and the button well above WCAG AA contrast.
- The photo is one small AVIF with a WebP fallback (about 34 KB AVIF on a phone, 38 KB on a wide screen) and a tiny inline blur placeholder, so the first paint does not wait for the story frames. The 120 frames start to load after the `load` event, when the browser is idle.
- This photo shows the river and the castle clearly. It does not show the collegiate church. A photo or a painting that has the church, the castle and the river in one view would need a new picture.

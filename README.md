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
| Index | https://tomiwu.github.io/pacholczyk-demo/ | List of versions. The newest version is C. |
| A | https://tomiwu.github.io/pacholczyk-demo/a/ | The first video-frame story. 120 WebP frames per theme and orientation. This is the look Tomasz preferred. |
| B | https://tomiwu.github.io/pacholczyk-demo/b/ | The light layered story (4 scenes + 2 sprites). Smaller files. Tomasz said this look was worse. |
| C | https://tomiwu.github.io/pacholczyk-demo/c/ | Key frames from the same videos as A (32 frames) with a canvas crossfade and scroll easing. AVIF with a WebP fallback. |

Each version page has a small switcher: A | B | C.

## Version C in short

- 32 key frames per theme (`light`, `dark`) and orientation (`d` = 1280×720, `m` = 405×720 portrait crop).
- The script draws two neighbour frames on a canvas and blends them with the fractional scroll position. A small lerp eases the motion.
- Frame 0 loads first (it is also the LCP poster). The other frames load later, in order of scroll proximity.
- With "reduce motion" on, or with JavaScript off, the page shows the same still images as version A.
- `c/tools/frames.py` builds the frames from `video/concept.mp4` and `video/concept-dark.mp4`.

## Shared files at the repository root

- `index.html`: the version list.
- `robots.txt`, `.nojekyll`, `.gitignore`.
- `a/`, `b/`, `c/`: the complete versions. Fonts stay inside each version (`a/a/`, `b/a/`, `c/a/`), so an old version does not break.

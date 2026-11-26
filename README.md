# Pacholczyk – scroll story demo

Demo only. All rights reserved.

This is a static demo of the first page for Zakład Usług Pogrzebowych Pacholczyk (Uniejów and Turek). It is not the production site. The production site is in a different repository.

## What it contains

- `index.html`: one page. Inlined CSS and a small vanilla JS. No libraries, no cookies, no analytics.
- `v/`: the layered scroll story. For each theme (`light`, `dark`) and orientation (`d` = 16:9 for wide screens, `m` = 9:16 for phones) there are 4 painted scenes (`s1`–`s4`). There are also 2 sprites with alpha (`hearse`, `bearers`) and 2 composite stills (`still2`, `still3`) for "reduce motion". All images are AVIF with a WebP fallback.
- `s/fresco-light.*`: the fresco image in the "O nas" section.
- `a/`: the fonts Fraunces and Nunito Sans (SIL Open Font Licence 1.1, see the OFL files). They are subset to Latin and Latin Extended, with a small weight range.
- `tools/layers.py`: encodes the layers and the stills. `tools/story.js`: the source of the story script. `tools/shots.mjs`: Playwright screenshots. `tools/bytes.mjs`: transfer-size measurement.

## How the story works

1. A sticky full-screen stage holds 4 scene layers and 2 sprites.
2. The scroll position sets `transform` and `opacity` only. The church zooms in, the camera "walks out" to the church exterior, and the bearers carry the coffin to the hearse. The hearse drives away, the camera pans to the road and the cemetery, and the hearse drives in again. At the end the view tilts up to the sky.
3. Only scene 1 loads before the first paint. It is the LCP image and is selected with `<picture>` by theme and orientation. Scenes 2–4 and the sprites load after the `load` event, when the browser is idle.
4. Captions fade in and out at fixed scroll ranges. The progress bar and the section reveals use CSS scroll-driven animations, with a JavaScript fallback.
5. With "reduce motion" on, or with JavaScript off, the page shows 4 still images.

## Rights

The illustrations are AI-made concept art, painted with the help of reference photos of the Uniejów collegiate church. They are not photos. The page does not use the source photo of the church.

The search engines must not index this demo (`noindex` and `robots.txt`).

This folder is demo **version E**. It stays as a record. Do not overwrite it. Version D uses the same 120 frames as A, with linear scroll mapping and preloaded ImageBitmaps. See the root README for all versions and for the note that the images are demo-only and must be replaced on the real site.

# Pacholczyk – scroll story demo

Demo only. All rights reserved.

This is a static demo of the first page for Zakład Usług Pogrzebowych Pacholczyk (Uniejów and Turek). It is not the production site. The production site is in a different repository.

## What it contains

- `index.html`: one page. Inlined CSS and a small vanilla JS file. No libraries, no cookies, no analytics.
- `f/<theme>/<d|m>/NNN.webp`: 120 scroll frames per theme. `d` is 1280×720 for wide screens. `m` is a 405×720 portrait crop that follows the action.
- `s/`: posters and still images (AVIF and WebP). The page shows the stills when "reduce motion" is on or when JavaScript is off.
- `a/`: fonts Fraunces and Nunito Sans (SIL Open Font Licence 1.1, see the OFL files), subset and pinned to a small weight range.
- `tools/frames.py`: makes the frames from the concept video. `tools/shots.mjs`: Playwright screenshots.

## How the story works

1. A sticky full-screen stage holds a canvas.
2. The scroll position selects a frame. The script blends two neighbour frames and eases the motion.
3. Frames load in a coarse-to-fine order, so the story works before all frames are loaded.
4. Captions fade in and out at fixed scroll ranges. The progress bar and the section reveals use CSS scroll-driven animations, with a JavaScript fallback.

## Rights

The illustrations and the video frames are AI-made concept art. They are not photos. The page does not use the source photo of the church.

The search engines must not index this demo (`noindex` and `robots.txt`).

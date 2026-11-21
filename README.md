# Vice Cover Lab — Cast Edition

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/aleep1990/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/aleep1990/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover Lab turns your own photos into bold multi-panel sunset cover art in the browser: a cast of seven — one big hero panel plus six panels, each with an editable slanted role tag (THE DRIVER, THE BOSS, THE MECHANIC…) — a striped retro-chrome title, a neon Pacifico subtitle, a tagline ribbon, a review strip with five stars and a Vol. 1 badge, a gold seal, a barcode, a Coming Soon line and an auto-generated billing block. Seven layouts, six gradient-map colour grades, face-aware framing (the browser's native FaceDetector, offline), drag/zoom cropping per panel, then export a PNG in 1080×1080, 1080×1350 or 1920×1080. Everything runs offline on your machine; photos are never uploaded.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — load the 7 sample cast photos (or upload up to 7 of your own), pick the Cast layout, type a title and tagline, drag to crop each panel, and hit Export PNG (or Export all three sizes).

## How it works

- `app/index.html` + `app/style.css` — the editor: cast photo slots, role-tag editors, layout and grade switchers, title-style chips, review/tagline/billing/seal controls, zoom slider, undo/redo, export.
- `app/src/cover.js` — the renderer: layout geometry for 7 layouts (Cast hero-and-six, four-panel, hero-and-three, full-bleed, nine-panel, tilted snapshot, vertical split), gradient-map grades via `getImageData` (Vice Sunset, Neon Night, Golden Hour, Noir, Palm Teal, Hot Pink), striped retro-chrome title fill, slanted role tags, review strip, gold seal, barcode, billing block, tagline ribbon, halftone title block, grain and vignette.
- `app/src/main.js` — editor state, face-aware framing via native `FaceDetector` with an upper-centre fallback anchor, drag/zoom cropping per panel, undo/redo history, PNG export, `?shot=` scenes.
- `app/src/shots.js` — fixed screenshot scenes (`?shot=editor`, `?shot=cover` with `&size=`, `&layout=`, `&grade=`, `&title=`, `&subtitle=`, `&tagline=`, `&quote=`, `&titleStyle=`).
- `app/fonts/` — Anton, Pacifico and Bebas Neue, SIL Open Font License (OFL texts beside them).
- `app/samples/` — seven sample photos made for this app with an image model: five fictional people, a red convertible at sunset, and a neon motel at sunset. No real people, no game artwork.

---

<sub>Entered on [make.fun](https://make.fun/?ref=aleep1990&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

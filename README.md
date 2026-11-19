# Vice Cover Lab

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/aleep1990/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/aleep1990/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover Lab turns your own photos into bold multi-panel sunset cover art in the browser: six layouts, six gradient-map colour grades, Anton display lettering with a sunset-gradient fill, a neon Pacifico subtitle, a halftone title block, a badge ribbon and a heat meter — then exports a PNG in 1080×1080, 1080×1350 or 1920×1080. Everything runs offline on your machine; photos are never uploaded.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — pick up to 4 photos (or load the samples), choose a layout and a grade, type a title and subtitle, drag to crop each panel, and hit Export PNG (or Export all three sizes).

## How it works

- `app/index.html` + `app/style.css` — the editor: photo slots, layout and grade switchers, caption editing, zoom slider, undo/redo, export.
- `app/src/cover.js` — the renderer: layout geometry for 6 layouts (four-panel, hero-and-three, full-bleed, nine-panel, tilted snapshot, vertical split), gradient-map grades via `getImageData` (Vice Sunset, Neon Night, Golden Hour, Noir, Palm Teal, Hot Pink), halftone title block, grain and vignette.
- `app/src/main.js` — editor state, drag/zoom cropping per panel, undo/redo history, PNG export, `?shot=` scenes.
- `app/src/shots.js` — fixed screenshot scenes (`?shot=editor`, `?shot=cover` with `&size=`, `&layout=`, `&grade=`, `&title=`, `&subtitle=`).
- `app/fonts/` — Anton, Pacifico and Bebas Neue, SIL Open Font License (OFL texts beside them).
- `app/samples/` — four sample photos: two kit samples plus two generated in-session (neon boulevard, palm pier). No real people, no game artwork.

---

<sub>Entered on [make.fun](https://make.fun/?ref=aleep1990&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

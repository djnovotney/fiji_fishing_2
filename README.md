# Fiji Pig Fishing — Phase 1

A self-contained, backend-free browser fishing game. Phase 1 uses simple canvas art to make the complete fishing loop playable before adding advanced graphics.

## Run locally

Because the game uses JavaScript modules, serve this folder over HTTP rather than opening `index.html` directly:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Controls

- Select **Start fishing**.
- Move the mouse through the aquarium to move the lure.
- When **BITE NOW!** appears over the reel, click it to hook the fish.
- During the fight, press the yellow reel handle and keep the mouse button held while circling clockwise. Around 200 RPM is the target; slow or overly fast reeling raises the chance of losing the fish.
- Press `D` to toggle the debug overlay.

## GitHub Pages

Publish the repository root as a static site. HTML, CSS, and module URLs are relative to `index.html`, so the game also works from a repository subdirectory such as `https://username.github.io/repository/`. No build step, backend, external library, or asset download is required.

## Smoke test

With the local HTTP server running, open <http://localhost:8000/tests/browser-smoke.html> to exercise and render the complete lure-to-catch-to-reset loop. If Node.js is available, `npm test` runs the same gameplay checks plus clockwise reel-input coverage.

## Structure

- `index.html` — page and accessible game controls
- `css/style.css` — layout and interface
- `js/game.js`, `js/fish.js`, `js/fishing.js`, `js/reel.js` — simulation and input mechanics
- `js/render.js` — canvas-only presentation
- `js/controls.js`, `js/ui.js`, `js/main.js` — browser input, interface, and the single animation loop
- `assets/` — reserved for later art and audio phases

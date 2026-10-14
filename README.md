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
- Select **Start fishing**, move the lure in front of a fish, and click to cast. Wait for the fish to approach and bite.
- When the small **Fish-On! (click here)** circle appears above the biting fish, click it to hook the fish. The prompt appears by the fish, not over the reel.
- During the fight, press the single yellow reel handle and keep the mouse button held while circling clockwise. Aim for **80 RPM**. Below **50 RPM** is too slow and above **120 RPM** is too fast; either can let the fish escape if sustained.
- The vertical pressure sensor beside the reel shows line tension while fighting.
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

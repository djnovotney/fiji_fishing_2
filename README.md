# Fiji Pig Fishing — Phase 1

A self-contained, backend-free browser fishing game. Phase 1 uses simple canvas art to make the complete fishing loop playable before adding advanced graphics.

## Run locally

Because the game uses JavaScript modules, serve this folder over HTTP rather than opening `index.html` directly:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Controls

- Select **Start fishing**, move the lure in front of a fish, and click to cast. The line settles at the selected spot; wait for the fish to approach and bite.
- When the small **Fish-On! (click here)** circle appears at the reel's left edge, click it to set the hook.
- During the fight, press the single yellow reel handle and keep the mouse button held while circling clockwise. Every 15° segment is measured, and the latest three segment speeds are averaged to update the pressure sensor. Keep the average in the green at **50–65 RPM**; below 50 or above 65 is red, and below **40 RPM** or above **75 RPM** lets the fish escape.
- Aquarium fish use `assets/fiji-trevally.glb`, a rigged, segmented blue trevally model with a skinned body/tail, fin and gill parts, PBR lighting materials, and a tail-swim animation. Fish size varies per fish and scales the model in-game. A lightweight canvas renderer reads the local GLB, so no 3D CDN or backend is required.
- The scoreboard totals catch weight; each fish weighs between **3 and 10 lb**.
- Press `D` to toggle the debug overlay.

## GitHub Pages

Publish the repository root as a static site. HTML, CSS, and module URLs are relative to `index.html`, so the game also works from a repository subdirectory such as `https://username.github.io/repository/`. No build step, backend, external library, or asset download is required.

## Smoke test

With the local HTTP server running, open <http://localhost:8000/tests/browser-smoke.html> to exercise and render the complete lure-to-catch-to-reset loop, load the GLB model, rolling three-segment RPM measurement, pressure zones, and escape limits. If Node.js is available, `npm test` runs the gameplay and reel-control checks.

To regenerate the procedural GLB on Windows, run `powershell -ExecutionPolicy Bypass -File .\tools\generate-fish-glb.ps1`.

## Structure

- `index.html` — page and accessible game controls
- `css/style.css` — layout and interface
- `js/game.js`, `js/fish.js`, `js/fishing.js`, `js/reel.js` — simulation and input mechanics
- `js/render.js` — canvas-only presentation
- `js/fish-model.js` — GLB loader, skeletal tail posing, and lit canvas projection
- `js/controls.js`, `js/ui.js`, `js/main.js` — browser input, interface, and the single animation loop
- `assets/fiji-trevally.glb` — rigged fish model used by the aquarium
- `tools/generate-fish-glb.ps1`, `tools/FishGlbGenerator.cs` — reproducible procedural GLB generator

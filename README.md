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
- During the fight, press the single yellow reel handle and keep the mouse button held while circling clockwise. The line reels only as the handle actually turns. Every 90° segment is measured, and the gauge smoothly follows the rolling average of the latest three segments. The gauge is divided into ¼ red (too low), ½ green (reel), and ¼ red (too fast); keep the reading in the green at **50–65 RPM**. The fish escapes after two complete revolutions below **40 RPM** or above **85 RPM**.
- The full control and gameplay instructions are shown below the fish tank.
- Aquarium fish use the supplied `assets/fiji-trevally.glb`, including its embedded blue-trevally UV texture. The source mesh has no bone skin or animation tracks, so the renderer adds a lightweight procedural tail rig and animates it as each fish swims. Fish size varies per fish and scales the model in-game. The local WebGL renderer reads the GLB directly, so no 3D CDN or backend is required.
- The scoreboard totals catch weight; each fish weighs between **3 and 10 lb**.
- Press `D` to toggle the debug overlay.

## GitHub Pages

Publish the repository root as a static site. HTML, CSS, and module URLs are relative to `index.html`, so the game also works from a repository subdirectory such as `https://username.github.io/repository/`. No build step, backend, external library, or asset download is required.

## Smoke test

With the local HTTP server running, open <http://localhost:8000/tests/browser-smoke.html> to exercise and render the complete lure-to-catch-to-reset loop, load the GLB model, rolling three-segment RPM measurement, gauge movement, pressure zones, and two-revolution escape rule. If Node.js is available, `npm test` runs the gameplay and reel-control checks.

## Structure

- `index.html` — page and accessible game controls
- `css/style.css` — layout and interface
- `js/game.js`, `js/fish.js`, `js/fishing.js`, `js/reel.js` — simulation and input mechanics
- `js/render.js` — canvas presentation and GLB loading
- `js/fish-model.js` — GLB texture/geometry loader, procedural tail rig, and WebGL renderer
- `js/controls.js`, `js/ui.js`, `js/main.js` — browser input, interface, and the single animation loop
- `assets/fiji-trevally.glb` — supplied, textured fish model used by the aquarium

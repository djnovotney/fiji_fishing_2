import { Game } from "./game.js";
import { attachControls } from "./controls.js";
import { GameRenderer } from "./render.js";
import { GameUI } from "./ui.js";

const canvas = document.querySelector("#game-canvas");
const game = new Game();
const renderer = new GameRenderer(canvas);
const ui = new GameUI(game);

attachControls(canvas, game);

let previousFrame = 0;
function frame(timestamp) {
  const dt = previousFrame ? (timestamp - previousFrame) / 1000 : 0;
  previousFrame = timestamp;
  game.update(dt);
  renderer.render(game);
  ui.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

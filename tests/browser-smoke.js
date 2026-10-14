import { Game } from "../js/game.js";
import { REEL, REEL_TARGET_RPM } from "../js/constants.js";
import { ReelController } from "../js/reel.js";
import { GameRenderer } from "../js/render.js";

const result = document.querySelector("#result");

try {
  const game = new Game();
  const renderer = new GameRenderer(document.querySelector("#test-canvas"));
  const reel = new ReelController();
  const handleX = REEL.x + Math.cos(reel.angle) * REEL.handleRadius;
  const handleY = REEL.y + Math.sin(reel.angle) * REEL.handleRadius;
  if (!reel.pointerDown(handleX, handleY)) throw new Error("Yellow handle could not be grabbed.");
  const clockwiseAngle = reel.angle + 0.2;
  reel.pointerMove(
    REEL.x + Math.cos(clockwiseAngle) * REEL.handleRadius,
    REEL.y + Math.sin(clockwiseAngle) * REEL.handleRadius,
  );
  if (reel.targetRPM <= 0) throw new Error("Clockwise handle movement did not generate RPM.");
  const reverseAngle = clockwiseAngle - 0.2;
  reel.pointerMove(
    REEL.x + Math.cos(reverseAngle) * REEL.handleRadius,
    REEL.y + Math.sin(reverseAngle) * REEL.handleRadius,
  );
  if (reel.targetRPM !== 0) throw new Error("Counterclockwise movement generated retrieval.");
  reel.pointerUp();
  game.start();
  game.start();
  const target = game.fish[0];
  target.x = 510;
  target.y = 330;
  target.vx = 0;
  target.vy = 0;
  for (const fish of game.fish.slice(1)) fish.recoveryUntil = 1000;
  for (let i = 0; i < 20; i += 1) game.update(0.05);
  if (game.state !== "IDLE") throw new Error("Fish detected a lure before a cast.");
  if (!game.castLure(500, 330)) throw new Error("Click did not cast the lure.");
  if (game.state !== "CASTING") throw new Error("Lure did not enter the casting state.");

  let elapsed = 0;
  while (game.state !== "BITE" && elapsed < 10) {
    game.update(0.05);
    elapsed += 0.05;
  }
  if (game.state !== "BITE") throw new Error("Fish did not bite.");
  if (!game.hookFish() || game.state !== "REELING") throw new Error("Bite did not hook the fish.");
  renderer.render(game);

  while (game.fishCaught === 0 && elapsed < 30) {
    game.reel.targetRPM = REEL_TARGET_RPM;
    game.reel.dragging = true;
    game.reel.lastInputAt = performance.now();
    game.update(0.05);
    elapsed += 0.05;
  }
  if (game.fishCaught !== 1 || game.score <= 0) throw new Error("Fish did not land and score.");
  renderer.render(game);

  while (game.state !== "IDLE" && elapsed < 35) {
    game.update(0.05);
    elapsed += 0.05;
  }
  if (game.state !== "IDLE" || game.targetFish !== null) throw new Error("Fishing attempt did not reset.");
  result.textContent = "PASS: click cast, wait for bite, hook, reel at 80 RPM, score, and reset.";
  document.body.dataset.result = "PASS";
} catch (error) {
  result.textContent = `FAIL: ${error.stack || error.message}`;
  document.body.dataset.result = "FAIL";
}

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
  const reelStartTime = 1000;
  const reelStartAngle = reel.angle;
  if (!reel.pointerDown(handleX, handleY, reelStartTime)) throw new Error("Yellow handle could not be grabbed.");
  const radiansPerSecond = REEL_TARGET_RPM * 2 * Math.PI / 60;
  for (let sample = 1; sample <= 30; sample += 1) {
    const angle = reelStartAngle + radiansPerSecond * sample / 100;
    reel.pointerMove(
      REEL.x + Math.cos(angle) * REEL.handleRadius,
      REEL.y + Math.sin(angle) * REEL.handleRadius,
      reelStartTime + sample * 10,
    );
  }
  if (reel.targetRPM < 75 || reel.targetRPM > 85) {
    throw new Error(`Clockwise movement should measure near 80 RPM (got ${reel.targetRPM.toFixed(1)}).`);
  }
  const clockwiseAngle = reelStartAngle + radiansPerSecond * 0.3;
  for (let sample = 1; sample <= 40; sample += 1) {
    const angle = clockwiseAngle - radiansPerSecond * sample / 100;
    reel.pointerMove(
      REEL.x + Math.cos(angle) * REEL.handleRadius,
      REEL.y + Math.sin(angle) * REEL.handleRadius,
      reelStartTime + 300 + sample * 10,
    );
  }
  if (reel.targetRPM !== 0) throw new Error("Sustained counterclockwise movement generated retrieval.");
  reel.pointerUp();
  game.start();
  game.start();
  const target = game.fish[0];
  target.x = 510;
  target.y = 330;
  target.vx = 0;
  target.vy = 0;
  for (const fish of game.fish.slice(1)) fish.recoveryUntil = 1000;
  if (!game.setLureTarget(500, 330)) throw new Error("Mouse movement could not position the lure.");
  for (let i = 0; i < 20; i += 1) game.update(0.05);
  if (Math.abs(game.lure.x - 500) >= 1) throw new Error("The lure did not follow the pointer before casting.");
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

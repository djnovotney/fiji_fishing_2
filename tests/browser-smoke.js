import { Game } from "../js/game.js";
import { REEL, REEL_TARGET_RPM, reelSpeedZone } from "../js/constants.js";
import { ReelController } from "../js/reel.js";
import { GameRenderer } from "../js/render.js";

const result = document.querySelector("#result");

function simulateRotation(reel, rpm, startTime, onStep = () => {}) {
  const stepsPerRotation = 64;
  const stepSeconds = 60 / (rpm * stepsPerRotation);
  let now = startTime;
  if (!reel.dragging) {
    reel.pointerDown(
      REEL.x + Math.cos(reel.angle) * REEL.handleRadius,
      REEL.y + Math.sin(reel.angle) * REEL.handleRadius,
      now,
    );
  }
  for (let step = 0; step < stepsPerRotation; step += 1) {
    const angle = reel.angle + 2 * Math.PI / stepsPerRotation;
    now += stepSeconds * 1000;
    reel.pointerMove(
      REEL.x + Math.cos(angle) * REEL.handleRadius,
      REEL.y + Math.sin(angle) * REEL.handleRadius,
      now,
    );
    onStep(stepSeconds);
  }
  return now;
}

try {
  const game = new Game();
  const renderer = new GameRenderer(document.querySelector("#test-canvas"));
  const reel = new ReelController();
  let reelTime = simulateRotation(reel, REEL_TARGET_RPM, 1000);
  const [idealRotation] = reel.consumeCompletedRotations();
  if (Math.abs(idealRotation.rpm - REEL_TARGET_RPM) > 0.1 || idealRotation.zone !== "IDEAL") {
    throw new Error("The pressure sensor did not measure the complete clockwise revolution accurately.");
  }
  if (reelSpeedZone(19) !== "TOO LOW" ||
    reelSpeedZone(REEL_TARGET_RPM) !== "IDEAL" ||
    reelSpeedZone(61) !== "TOO FAST") {
    throw new Error("Pressure sensor zones do not align with reel speed thresholds.");
  }
  for (const [speed, expectedZone] of [[10, "TOO LOW"], [70, "TOO FAST"]]) {
    const escapeGame = new Game();
    escapeGame.start();
    escapeGame.state = "REELING";
    escapeGame.targetFish = escapeGame.fish[0];
    escapeGame.lineLength = 8;
    reelTime = 1000;
    for (let turn = 0; turn < 3; turn += 1) {
      reelTime = simulateRotation(escapeGame.reel, speed, reelTime, (dt) => escapeGame.update(dt));
    }
    if (escapeGame.state !== "ESCAPED") {
      throw new Error(`Three ${expectedZone.toLowerCase()} turns did not make the fish escape.`);
    }
  }
  game.start();
  game.start();
  const target = game.fish[0];
  const targetWeightLb = target.weightLb;
  if (targetWeightLb < 3 || targetWeightLb > 10) throw new Error("Fish weight is outside 3–10 lb.");
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
  const lurePositionAtCast = { x: game.lure.x, y: game.lure.y };
  if (!game.castLure(500, 330)) throw new Error("Click did not cast the lure.");
  if (game.state !== "CASTING") throw new Error("Lure did not enter the casting state.");
  if (game.lure.x !== lurePositionAtCast.x || game.lure.y !== lurePositionAtCast.y) {
    throw new Error("Casting snapped the lure away from the selected location.");
  }

  let elapsed = 0;
  while (game.state !== "BITE" && elapsed < 10) {
    game.update(0.05);
    elapsed += 0.05;
  }
  if (game.state !== "BITE") throw new Error("Fish did not bite.");
  if (!game.hookFish() || game.state !== "REELING") throw new Error("Bite did not hook the fish.");
  renderer.render(game);

  reelTime = 1000;
  while (game.fishCaught === 0 && elapsed < 90) {
    reelTime = simulateRotation(game.reel, REEL_TARGET_RPM, reelTime, (dt) => game.update(dt));
    elapsed += 60 / REEL_TARGET_RPM;
  }
  if (game.fishCaught !== 1 || Math.abs(game.totalWeightLb - targetWeightLb) > 0.001) {
    throw new Error("Fish did not land and add its weight to the total.");
  }
  renderer.render(game);

  while (game.state !== "IDLE" && elapsed < 35) {
    game.update(0.05);
    elapsed += 0.05;
  }
  if (game.state !== "IDLE" || game.targetFish !== null) throw new Error("Fishing attempt did not reset.");
  result.textContent = "PASS: full-turn RPM, slow/fast escape, weighted catch, and reset.";
  document.body.dataset.result = "PASS";
} catch (error) {
  result.textContent = `FAIL: ${error.stack || error.message}`;
  document.body.dataset.result = "FAIL";
}

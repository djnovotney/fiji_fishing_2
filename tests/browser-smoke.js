import { Game } from "../js/game.js";
import {
  REEL,
  REEL_ESCAPE_MAX_RPM,
  REEL_ESCAPE_MIN_RPM,
  REEL_MAX_RPM,
  REEL_MIN_RPM,
  REEL_SAMPLE_ANGLE,
  REEL_TARGET_RPM,
  reelSpeedZone,
} from "../js/constants.js";
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
    if (onStep(stepSeconds)) break;
  }
  return now;
}

function simulateSegmentSpeeds(reel, speeds, startTime) {
  let now = startTime;
  reel.pointerDown(
    REEL.x + Math.cos(reel.angle) * REEL.handleRadius,
    REEL.y + Math.sin(reel.angle) * REEL.handleRadius,
    now,
  );
  for (const rpm of speeds) {
    now += 60_000 / (rpm * 24);
    const angle = reel.angle + REEL_SAMPLE_ANGLE;
    reel.pointerMove(
      REEL.x + Math.cos(angle) * REEL.handleRadius,
      REEL.y + Math.sin(angle) * REEL.handleRadius,
      now,
    );
  }
}

try {
  const game = new Game();
  const renderer = new GameRenderer(document.querySelector("#test-canvas"));
  await renderer.modelReady;
  if (!renderer.fishModel) throw new Error("The rigged fish GLB did not load into the game renderer.");
  if (renderer.fishModel.document.skins[0].joints.length < 2 ||
    renderer.fishModel.document.animations.length === 0 ||
    !renderer.fishModel.document.meshes.some((mesh) => mesh.name === "Forked caudal fin") ||
    !renderer.fishModel.document.meshes.some((mesh) => mesh.name === "Segmented gill plate")) {
    throw new Error("The fish GLB is missing its articulated rig, animation, or segmented mesh parts.");
  }
  const reel = new ReelController();
  let reelTime = simulateRotation(reel, REEL_TARGET_RPM, 1000);
  const readings = reel.consumeCompletedReadings();
  if (readings.length < 20 ||
    Math.abs(readings[readings.length - 1].rpm - REEL_TARGET_RPM) > 0.1 ||
    readings[readings.length - 1].zone !== "IDEAL") {
    throw new Error("The pressure sensor did not average and update from the three 15-degree samples.");
  }
  const mixedReel = new ReelController();
  simulateSegmentSpeeds(mixedReel, [45, 60, 66, 100, 35], 1000);
  const mixedReadings = mixedReel.consumeCompletedReadings();
  const filteredSecondReading = 57 + (((60 + 66 + 100) / 3) - 57) * 0.3;
  const filteredThirdReading = filteredSecondReading + (((66 + 100 + 35) / 3) - filteredSecondReading) * 0.3;
  if (mixedReadings.length !== 3 ||
    Math.abs(mixedReadings[0].rpm - 57) > 0.1 ||
    Math.abs(mixedReadings[1].averageRPM - (60 + 66 + 100) / 3) > 0.1 ||
    Math.abs(mixedReadings[1].rpm - filteredSecondReading) > 0.1 ||
    Math.abs(mixedReadings[2].averageRPM - (66 + 100 + 35) / 3) > 0.1 ||
    Math.abs(mixedReadings[2].rpm - filteredThirdReading) > 0.1) {
    throw new Error("The pressure sensor did not smooth each rolling three-segment average.");
  }
  if (reelSpeedZone(REEL_MIN_RPM - 1) !== "TOO LOW" ||
    reelSpeedZone(REEL_MIN_RPM) !== "IDEAL" ||
    reelSpeedZone(REEL_TARGET_RPM) !== "IDEAL" ||
    reelSpeedZone(REEL_MAX_RPM) !== "IDEAL" ||
    reelSpeedZone(REEL_MAX_RPM + 1) !== "TOO FAST") {
    throw new Error("Pressure sensor zones do not align with reel speed thresholds.");
  }
  for (const [speed, expectedEscape] of [
    [REEL_ESCAPE_MIN_RPM - 1, true],
    [REEL_ESCAPE_MIN_RPM, false],
    [REEL_ESCAPE_MAX_RPM, false],
    [REEL_ESCAPE_MAX_RPM + 1, true],
  ]) {
    const escapeGame = new Game();
    escapeGame.start();
    escapeGame.state = "REELING";
    escapeGame.targetFish = escapeGame.fish[0];
    escapeGame.lineLength = 8;
    reelTime = 1000;
    reelTime = simulateRotation(escapeGame.reel, speed, reelTime, (dt) => {
      escapeGame.update(dt);
      return escapeGame.state !== "REELING";
    });
    if ((escapeGame.state === "ESCAPED") !== expectedEscape) {
      throw new Error(`${speed} RPM escape behavior did not match its threshold.`);
    }
  }
  const hysteresisGame = new Game();
  hysteresisGame.start();
  hysteresisGame.state = "REELING";
  hysteresisGame.targetFish = hysteresisGame.fish[0];
  hysteresisGame.lineLength = 8;
  simulateSegmentSpeeds(hysteresisGame.reel, [39, 39, 39], 1000);
  hysteresisGame.update(0.01);
  if (hysteresisGame.state !== "REELING" || hysteresisGame.reel.escapeStreak !== 1) {
    throw new Error("One out-of-range reading should warn without losing the fish.");
  }
  simulateSegmentSpeeds(hysteresisGame.reel, [39], hysteresisGame.reel.lastInputAt);
  hysteresisGame.update(0.01);
  if (hysteresisGame.state !== "ESCAPED") {
    throw new Error("The fish should escape after the second consecutive out-of-range reading.");
  }
  game.start();
  game.start();
  const target = game.fish[0];
  game.fish[0].size = 0.8;
  game.fish[1].size = 1.3;
  const fishSizes = game.fish.map((fish) => fish.size);
  if (Math.max(...fishSizes) - Math.min(...fishSizes) < 0.2) {
    throw new Error("The fish school does not include visibly varying model scales.");
  }
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
  result.textContent = "PASS: rigged fish GLB, rolling 15-degree RPM, pressure zones, escape limits, weighted catch, and reset.";
  document.body.dataset.result = "PASS";
} catch (error) {
  result.textContent = `FAIL: ${error.stack || error.message}`;
  document.body.dataset.result = "FAIL";
}

import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../js/game.js";
import {
  REEL,
  REEL_MAX_RPM,
  REEL_MIN_RPM,
  REEL_TARGET_RPM,
  reelSpeedZone,
} from "../js/constants.js";
import { ReelController } from "../js/reel.js";

function reelForRotations(reel, rpm, count, onStep = () => {}) {
  const stepsPerRotation = 64;
  const rotationDurationMs = 60_000 / rpm;
  const stepDurationMs = rotationDurationMs / stepsPerRotation;
  let now = reel.lastInputAt || 1000;
  if (!reel.dragging) {
    const handleX = REEL.x + Math.cos(reel.angle) * REEL.handleRadius;
    const handleY = REEL.y + Math.sin(reel.angle) * REEL.handleRadius;
    assert.equal(reel.pointerDown(handleX, handleY, now), true);
  }
  for (let rotation = 0; rotation < count; rotation += 1) {
    for (let step = 0; step < stepsPerRotation; step += 1) {
      const angle = reel.angle + 2 * Math.PI / stepsPerRotation;
      now += stepDurationMs;
      reel.pointerMove(
        REEL.x + Math.cos(angle) * REEL.handleRadius,
        REEL.y + Math.sin(angle) * REEL.handleRadius,
        now,
      );
      onStep(stepDurationMs / 1000, now);
    }
  }
  return now;
}

test("the playable loop progresses from lure interest through a weighted catch and reset", () => {
  const game = new Game();
  game.start();

  const target = game.fish[0];
  const targetWeightLb = target.weightLb;
  assert.ok(targetWeightLb >= 3 && targetWeightLb <= 10);
  target.x = 510;
  target.y = 330;
  target.vx = 0;
  target.vy = 0;
  target.recoveryUntil = 0;
  for (const fish of game.fish.slice(1)) fish.recoveryUntil = 1000;

  assert.equal(game.setLureTarget(500, 330), true);
  for (let i = 0; i < 20; i += 1) game.update(0.05);
  assert.ok(Math.abs(game.lure.x - 500) < 1, "mouse movement positions the lure before casting");
  for (let i = 0; i < 20; i += 1) game.update(0.05);
  assert.equal(game.state, "IDLE", "fish must not detect a lure before the player casts");
  const lurePositionAtCast = { x: game.lure.x, y: game.lure.y };
  assert.equal(game.castLure(500, 330), true);
  assert.equal(game.state, "CASTING");
  assert.deepEqual(
    { x: game.lure.x, y: game.lure.y },
    lurePositionAtCast,
    "casting keeps the lure at its selected position instead of snapping back to the rod",
  );
  assert.equal(game.castLure(600, 330), false, "only one cast is allowed until the attempt resets");

  let elapsed = 0;
  while (game.state !== "BITE" && elapsed < 10) {
    game.update(0.05);
    elapsed += 0.05;
  }
  assert.equal(game.state, "BITE");
  assert.equal(game.hookFish(), true);
  assert.equal(game.state, "REELING");

  while (game.fishCaught === 0 && elapsed < 90) {
    reelForRotations(game.reel, REEL_TARGET_RPM, 1, (dt) => game.update(dt));
    elapsed += 60 / REEL_TARGET_RPM;
  }
  assert.equal(game.fishCaught, 1);
  assert.equal(game.totalWeightLb, targetWeightLb);
  assert.equal(game.state, "RESET");

  while (game.state !== "IDLE" && elapsed < 35) {
    game.update(0.05);
    elapsed += 0.05;
  }
  assert.equal(game.state, "IDLE");
  assert.equal(game.targetFish, null);
});

test("the reel target and slow/fast thresholds match the requested RPM values", () => {
  assert.equal(REEL_MIN_RPM, 20);
  assert.equal(REEL_TARGET_RPM, 40);
  assert.equal(REEL_MAX_RPM, 60);
  assert.equal(reelSpeedZone(19), "TOO LOW");
  assert.equal(reelSpeedZone(20), "IDEAL");
  assert.equal(reelSpeedZone(40), "IDEAL");
  assert.equal(reelSpeedZone(59), "IDEAL");
  assert.equal(reelSpeedZone(60), "IDEAL");
  assert.equal(reelSpeedZone(61), "TOO FAST");
});

test("reel input measures clockwise speed once per complete revolution", () => {
  const reel = new ReelController();
  reelForRotations(reel, REEL_TARGET_RPM, 1);
  const [rotation] = reel.consumeCompletedRotations();
  assert.ok(Math.abs(rotation.rpm - REEL_TARGET_RPM) < 0.1);
  assert.equal(rotation.zone, "IDEAL");
  assert.ok(reel.cumulativeRotation > 0);
  assert.equal(reel.pressureSensorRPM, rotation.rpm);

  reel.pointerUp();
  const time = reel.lastInputAt + 100;
  const handleX = REEL.x + Math.cos(reel.angle) * REEL.handleRadius;
  const handleY = REEL.y + Math.sin(reel.angle) * REEL.handleRadius;
  assert.equal(reel.pointerDown(handleX, handleY, time), true);
  const counterclockwiseAngle = reel.angle - 0.2;
  reel.pointerMove(
    REEL.x + Math.cos(counterclockwiseAngle) * REEL.handleRadius,
    REEL.y + Math.sin(counterclockwiseAngle) * REEL.handleRadius,
    time + 100,
  );
  assert.equal(reel.consumeCompletedRotations().length, 0);
  reel.pointerUp();
});

test("reel speed stays stable across uneven pointer samples and smooths between turns", () => {
  const reel = new ReelController();
  const start = reel.angle;
  const startTime = 1000;
  assert.equal(reel.pointerDown(
    REEL.x + Math.cos(start) * REEL.handleRadius,
    REEL.y + Math.sin(start) * REEL.handleRadius,
    startTime,
  ), true);

  const stepsPerRotation = 64;
  let now = startTime;
  for (let step = 0; step < stepsPerRotation; step += 1) {
    const angle = start + (step + 1) * 2 * Math.PI / stepsPerRotation;
    now += (step % 2 === 0 ? 0.5 : 1.5) * (60_000 / REEL_TARGET_RPM / stepsPerRotation);
    reel.pointerMove(
      REEL.x + Math.cos(angle) * REEL.handleRadius,
      REEL.y + Math.sin(angle) * REEL.handleRadius,
      now,
    );
  }
  const [firstRotation] = reel.consumeCompletedRotations();
  assert.ok(Math.abs(firstRotation.rpm - REEL_TARGET_RPM) < 0.1);

  const nextStart = now;
  for (let step = 0; step < stepsPerRotation; step += 1) {
    const angle = reel.angle + 2 * Math.PI / stepsPerRotation;
    now = nextStart + (step + 1) * (60_000 / 50 / stepsPerRotation);
    reel.pointerMove(
      REEL.x + Math.cos(angle) * REEL.handleRadius,
      REEL.y + Math.sin(angle) * REEL.handleRadius,
      now,
    );
  }
  const expectedSmoothedRPM = REEL_TARGET_RPM + (50 - REEL_TARGET_RPM) * 0.55;
  assert.ok(Math.abs(reel.pressureSensorRPM - expectedSmoothedRPM) < 0.1);
});

test("three consecutive too-slow or too-fast turns lose the fish, but an ideal turn clears the streak", () => {
  for (const [rpm, zone] of [[10, "TOO LOW"], [70, "TOO FAST"]]) {
    const game = new Game();
    game.start();
    game.state = "REELING";
    game.targetFish = game.fish[0];
    game.lineLength = 8;
    let now = 1000;
    for (let turn = 1; turn <= 3; turn += 1) {
      now = reelForRotations(game.reel, rpm, 1, (dt) => game.update(dt));
      assert.equal(game.reel.pressureSensorZone, zone);
      if (turn < 3) {
        assert.equal(game.state, "REELING");
        assert.equal(game.reel.badRotationStreak, turn);
      }
    }
    assert.equal(game.state, "ESCAPED");
  }

  const reel = new ReelController();
  reelForRotations(reel, 10, 2);
  assert.equal(reel.badRotationStreak, 2);
  reelForRotations(reel, REEL_TARGET_RPM, 1);
  assert.equal(reel.badRotationStreak, 0);
});

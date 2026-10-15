import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../js/game.js";
import {
  REEL,
  REEL_ESCAPE_MAX_RPM,
  REEL_ESCAPE_REVOLUTIONS,
  REEL_ESCAPE_MIN_RPM,
  REEL_MAX_RPM,
  REEL_MIN_RPM,
  REEL_SAMPLE_ANGLE,
  pressureGaugePosition,
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

function reelForSegmentSpeeds(reel, speeds, startTime = 1000) {
  let now = startTime;
  const segmentsPerRevolution = (Math.PI * 2) / REEL_SAMPLE_ANGLE;
  if (!reel.dragging) {
    const handleX = REEL.x + Math.cos(reel.angle) * REEL.handleRadius;
    const handleY = REEL.y + Math.sin(reel.angle) * REEL.handleRadius;
    assert.equal(reel.pointerDown(handleX, handleY, now), true);
  }
  for (const rpm of speeds) {
    now += 60_000 / (rpm * segmentsPerRevolution);
    const angle = reel.angle + REEL_SAMPLE_ANGLE;
    reel.pointerMove(
      REEL.x + Math.cos(angle) * REEL.handleRadius,
      REEL.y + Math.sin(angle) * REEL.handleRadius,
      now,
    );
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

test("the reel target, warning zones, and escape limits match the requested RPM values", () => {
  assert.equal(REEL_MIN_RPM, 50);
  assert.equal(REEL_TARGET_RPM, 57.5);
  assert.equal(REEL_MAX_RPM, 65);
  assert.equal(REEL_ESCAPE_MIN_RPM, 40);
  assert.equal(REEL_ESCAPE_MAX_RPM, 85);
  assert.equal(REEL_ESCAPE_REVOLUTIONS, 2);
  assert.equal(REEL_SAMPLE_ANGLE, Math.PI / 2);
  assert.equal(pressureGaugePosition(0), 0);
  assert.equal(pressureGaugePosition(50), 0.25);
  assert.equal(pressureGaugePosition(57.5), 0.5);
  assert.equal(pressureGaugePosition(65), 0.75);
  assert.equal(pressureGaugePosition(90), 1);
  assert.equal(reelSpeedZone(49.9), "TOO LOW");
  assert.equal(reelSpeedZone(50), "IDEAL");
  assert.equal(reelSpeedZone(REEL_TARGET_RPM), "IDEAL");
  assert.equal(reelSpeedZone(65), "IDEAL");
  assert.equal(reelSpeedZone(65.1), "TOO FAST");
});

test("reel input updates the gauge from a rolling average of three 90-degree segments", () => {
  const reel = new ReelController();
  reelForSegmentSpeeds(reel, [45, 60]);
  assert.equal(reel.consumeCompletedReadings().length, 0, "the average waits for three 90-degree segments");
  reelForSegmentSpeeds(reel, [66], reel.lastInputAt);
  const [reading] = reel.consumeCompletedReadings();
  assert.ok(Math.abs(reading.rpm - 57) < 0.1);
  assert.equal(reading.zone, "IDEAL");
  assert.equal(reading.escaped, false);
  assert.ok(Math.abs(reel.pressureSensorRPM - 57) < 0.1);
  assert.ok(reel.cumulativeRotation > 0);

  reelForSegmentSpeeds(reel, [100, 35], reel.lastInputAt);
  const nextReadings = reel.consumeCompletedReadings();
  assert.equal(nextReadings.length, 2, "the sensor refreshes after each additional 90-degree segment");
  const nextAverage = (60 + 66 + 100) / 3;
  assert.ok(Math.abs(nextReadings[0].averageRPM - nextAverage) < 0.1);
  assert.ok(Math.abs(nextReadings[0].rpm - nextAverage) < 0.1);
  assert.equal(nextReadings[0].escaped, false);
  const finalAverage = (66 + 100 + 35) / 3;
  assert.ok(Math.abs(nextReadings[1].averageRPM - finalAverage) < 0.1);
  assert.ok(Math.abs(nextReadings[1].rpm - finalAverage) < 0.1);
  assert.equal(nextReadings[1].escaped, false);
  assert.equal(nextReadings[1].zone, "IDEAL");

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
  assert.equal(reel.consumeCompletedReadings().length, 0);
  reel.pointerUp();
});

test("line retrieval follows actual handle rotation and stops when the player stops turning", () => {
  const game = new Game();
  game.start();
  game.state = "REELING";
  game.targetFish = game.fish[0];
  game.lineLength = 8;
  reelForRotations(game.reel, REEL_TARGET_RPM, 1, (dt) => game.update(dt));
  assert.ok(Math.abs(game.lineLength - (8 - 0.27)) < 0.01);

  game.reel.pointerUp();
  const lineLengthAtStop = game.lineLength;
  game.update(1);
  assert.equal(game.lineLength, lineLengthAtStop, "the line must not reel from a stale RPM reading");
});

test("reel speed averages uneven pointer samples and refreshes the gauge on each sample", () => {
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
  const [firstReading] = reel.consumeCompletedReadings();
  assert.ok(Math.abs(firstReading.rpm - REEL_TARGET_RPM) < 0.1);

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
  assert.ok(Math.abs(reel.pressureSensorRPM - 50) < 0.1);
});

test("the fish escapes after two consecutive out-of-range revolutions", () => {
  for (const [rpm, expectedEscape] of [[39, true], [40, false], [85, false], [86, true]]) {
    const game = new Game();
    game.start();
    game.state = "REELING";
    game.targetFish = game.fish[0];
    game.lineLength = 8;
    reelForSegmentSpeeds(game.reel, Array(4).fill(rpm), 1000);
    game.update(0.01);
    assert.equal(game.state, "REELING", "one bad revolution only warns the player");
    assert.equal(game.reel.escapeRevolutionStreak, 1);
    reelForSegmentSpeeds(game.reel, Array(4).fill(rpm), game.reel.lastInputAt);
    game.update(0.01);
    assert.equal(game.state === "ESCAPED", expectedEscape, `${rpm} RPM escape behavior`);
  }

  const game = new Game();
  game.start();
  game.state = "REELING";
  game.targetFish = game.fish[0];
  game.lineLength = 8;
  reelForSegmentSpeeds(game.reel, Array(4).fill(39), 1000);
  game.update(0.01);
  assert.equal(game.reel.escapeRevolutionStreak, 1);
  reelForSegmentSpeeds(game.reel, Array(4).fill(60), game.reel.lastInputAt);
  game.update(0.01);
  assert.equal(game.reel.escapeRevolutionStreak, 0, "a good revolution clears the escape streak");

  const reel = new ReelController();
  assert.equal(reel.pressureSensorRPM, 57.5, "the gauge starts in the center of the green zone");
  reelForSegmentSpeeds(reel, Array(8).fill(39));
  const lowReadings = reel.consumeCompletedReadings();
  assert.ok(lowReadings.some((reading) => reading.escapeRevolutionStreak === 1));
  assert.ok(lowReadings.some((reading) => reading.escaped));
});

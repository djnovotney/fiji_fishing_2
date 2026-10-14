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

  while (game.fishCaught === 0 && elapsed < 30) {
    game.reel.targetRPM = REEL_TARGET_RPM;
    game.reel.dragging = true;
    game.reel.lastInputAt = performance.now();
    game.update(0.05);
    elapsed += 0.05;
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
  assert.equal(REEL_MIN_RPM, 40);
  assert.equal(REEL_TARGET_RPM, 60);
  assert.equal(REEL_MAX_RPM, 80);
  assert.equal(reelSpeedZone(39), "TOO LOW");
  assert.equal(reelSpeedZone(40), "TOO LOW");
  assert.equal(reelSpeedZone(60), "IDEAL");
  assert.equal(reelSpeedZone(79), "IDEAL");
  assert.equal(reelSpeedZone(80), "TOO FAST");
});

test("reel input measures clockwise movement and does not retrieve on counterclockwise movement", () => {
  const reel = new ReelController();
  const start = reel.angle;
  const startX = REEL.x + Math.cos(start) * REEL.handleRadius;
  const startY = REEL.y + Math.sin(start) * REEL.handleRadius;
  const startTime = 1000;
  assert.equal(reel.pointerDown(startX, startY, startTime), true);

  const radiansPerSecond = REEL_TARGET_RPM * 2 * Math.PI / 60;
  for (let sample = 1; sample <= 30; sample += 1) {
    const angle = start + radiansPerSecond * sample / 100;
    reel.pointerMove(
      REEL.x + Math.cos(angle) * REEL.handleRadius,
      REEL.y + Math.sin(angle) * REEL.handleRadius,
      startTime + sample * 10,
    );
  }
  assert.ok(reel.targetRPM >= 55 && reel.targetRPM <= 65, "clockwise rotation should measure approximately 60 RPM");
  assert.ok(reel.cumulativeRotation > 0);

  const clockwise = start + radiansPerSecond * 0.3;
  for (let sample = 1; sample <= 40; sample += 1) {
    const angle = clockwise - radiansPerSecond * sample / 100;
    reel.pointerMove(
      REEL.x + Math.cos(angle) * REEL.handleRadius,
      REEL.y + Math.sin(angle) * REEL.handleRadius,
      startTime + 300 + sample * 10,
    );
  }
  assert.equal(reel.targetRPM, 0);
  reel.pointerUp();
});

test("reel RPM responds quickly to rotation and settles quickly when rotation stops", () => {
  const reel = new ReelController();
  const start = reel.angle;
  const startX = REEL.x + Math.cos(start) * REEL.handleRadius;
  const startY = REEL.y + Math.sin(start) * REEL.handleRadius;
  const startTime = 1000;
  assert.equal(reel.pointerDown(startX, startY, startTime), true);

  const radiansPerSecond = REEL_TARGET_RPM * 2 * Math.PI / 60;
  for (let sample = 1; sample <= 30; sample += 1) {
    const angle = start + radiansPerSecond * sample / 100;
    reel.pointerMove(
      REEL.x + Math.cos(angle) * REEL.handleRadius,
      REEL.y + Math.sin(angle) * REEL.handleRadius,
      startTime + sample * 10,
    );
  }
  for (let frame = 1; frame <= 6; frame += 1) reel.update(0.016, 1300 + frame * 16);
  assert.ok(reel.rpm > 50, "the displayed/gameplay RPM should catch up to the measured 60 RPM within 100 ms");

  reel.pointerUp();
  for (let frame = 1; frame <= 3; frame += 1) reel.update(0.016, 1400 + frame * 16);
  assert.ok(reel.rpm < 10, "the displayed/gameplay RPM should drop promptly when rotation stops");
});

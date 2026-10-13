import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../js/game.js";
import { REEL } from "../js/constants.js";
import { ReelController } from "../js/reel.js";

test("the playable loop progresses from lure interest through a scored catch and reset", () => {
  const game = new Game();
  game.start();
  game.setLureTarget(500, 330);

  const target = game.fish[0];
  target.x = 510;
  target.y = 330;
  target.vx = 0;
  target.vy = 0;
  target.recoveryUntil = 0;
  for (const fish of game.fish.slice(1)) fish.recoveryUntil = 1000;

  let elapsed = 0;
  while (game.state !== "BITE" && elapsed < 10) {
    game.update(0.05);
    elapsed += 0.05;
  }
  assert.equal(game.state, "BITE");
  assert.equal(game.hookFish(), true);
  assert.equal(game.state, "REELING");

  while (game.fishCaught === 0 && elapsed < 30) {
    game.reel.targetRPM = 200;
    game.reel.dragging = true;
    game.reel.lastInputAt = performance.now();
    game.update(0.05);
    elapsed += 0.05;
  }
  assert.equal(game.fishCaught, 1);
  assert.ok(game.score > 0);
  assert.equal(game.state, "RESET");

  while (game.state !== "IDLE" && elapsed < 35) {
    game.update(0.05);
    elapsed += 0.05;
  }
  assert.equal(game.state, "IDLE");
  assert.equal(game.targetFish, null);
});

test("reel input measures clockwise movement and does not retrieve on counterclockwise movement", () => {
  const reel = new ReelController();
  const start = reel.angle;
  const startX = REEL.x + Math.cos(start) * REEL.handleRadius;
  const startY = REEL.y + Math.sin(start) * REEL.handleRadius;
  assert.equal(reel.pointerDown(startX, startY), true);

  const clockwise = start + 0.2;
  reel.pointerMove(
    REEL.x + Math.cos(clockwise) * REEL.handleRadius,
    REEL.y + Math.sin(clockwise) * REEL.handleRadius,
  );
  assert.ok(reel.targetRPM > 0);
  assert.ok(reel.cumulativeRotation > 0);

  const counterclockwise = clockwise - 0.2;
  reel.pointerMove(
    REEL.x + Math.cos(counterclockwise) * REEL.handleRadius,
    REEL.y + Math.sin(counterclockwise) * REEL.handleRadius,
  );
  assert.equal(reel.targetRPM, 0);
  reel.pointerUp();
});

import {
  LINE,
  ROD_TIP,
  TANK,
} from "./constants.js";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function setState(game, state) {
  game.state = state;
  game.stateTimer = 0;
}

function finishAttempt(game, caught) {
  if (game.targetFish) {
    game.targetFish.recoveryUntil = game.elapsed + 2.5;
    if (caught) {
      game.targetFish.active = false;
      game.targetFish.respawnAt = game.elapsed + 3.5;
    }
  }
  game.targetFish = null;
  game.landedFish = null;
  game.hasCast = false;
  game.lure.x = ROD_TIP.x + 18;
  game.lure.y = TANK.waterTop + 8;
  game.lure.targetX = game.lure.x;
  game.lure.targetY = game.lure.y;
  game.lineLength = lineLengthForLure(game.lure);
  game.tension = 0;
  game.fishDepth = 0;
  game.reel.reset();
  setState(game, caught ? "RESET" : "ESCAPED");
}

export function hookFish(game) {
  if (game.state !== "BITE" || !game.targetFish) return false;
  const fish = game.targetFish;
  game.lineLength = lengthForFishY(fish.y);
  game.fishDepth = depthForFishY(fish.y);
  game.tension = 52;
  game.landedFish = null;
  setState(game, "REELING");
  return true;
}

export function updateFishing(game, dt) {
  game.stateTimer += dt;

  if (game.state === "CASTING") {
    if (game.stateTimer > 0.75) setState(game, "IDLE");
  } else if (game.state === "IDLE") {
    if (!game.hasCast) return;
    let closest = null;
    let closestDistance = Infinity;
    for (const fish of game.fish) {
      if (!fish.active || game.elapsed < fish.recoveryUntil) continue;
      const distance = Math.hypot(fish.x - game.lure.x, fish.y - game.lure.y);
      if (distance < closestDistance) {
        closest = fish;
        closestDistance = distance;
      }
    }
    if (closest && closestDistance < 142) {
      game.targetFish = closest;
      closest.targetX = game.lure.x;
      closest.targetY = game.lure.y;
      setState(game, "FISH_INTERESTED");
    }
  } else if (game.state === "FISH_INTERESTED") {
    const fish = game.targetFish;
    if (!fish || !fish.active) {
      finishAttempt(game, false);
      return;
    }
    fish.targetX = game.lure.x;
    fish.targetY = game.lure.y;
    const distance = Math.hypot(fish.x - game.lure.x, fish.y - game.lure.y);
    if (distance < 27 && game.stateTimer > 0.8) {
      setState(game, "BITE");
    } else if (game.stateTimer > 12 || distance > 270) {
      finishAttempt(game, false);
    }
  } else if (game.state === "BITE") {
    if (game.stateTimer > 7) finishAttempt(game, false);
  } else if (game.state === "REELING") {
    const fish = game.targetFish;
    if (!fish) {
      finishAttempt(game, false);
      return;
    }

    const reelRotation = game.reel.consumeReelingRotation();
    game.lineLength = Math.max(
      LINE.minimumLengthMeters,
      game.lineLength - reelRotation / (Math.PI * 2) * LINE.metersPerRevolution,
    );
    game.fishDepth = Math.max(
      0,
      (game.lineLength - LINE.minimumLengthMeters) / LINE.maxDepthMeters * LINE.maxDepthMeters,
    );
    const progress = clamp((game.lineLength - LINE.minimumLengthMeters) / LINE.maxDepthMeters, 0, 1);
    fish.x += (game.lure.x - fish.x) * Math.min(1, dt * 1.5);
    fish.y = TANK.waterTop + 22 + progress * (TANK.sandTop - TANK.waterTop - 48);

    for (const reading of game.reel.consumeCompletedReadings()) {
      if (reading.escaped) {
        finishAttempt(game, false);
        return;
      }
      if (reading.zone === "TOO LOW") {
        game.tension = clamp(game.tension - 2, 0, 100);
      } else if (reading.zone === "TOO FAST") {
        game.tension = clamp(game.tension + 2, 0, 100);
      } else {
        game.tension += (52 - game.tension) * 0.05;
      }
    }

    if (game.lineLength <= LINE.minimumLengthMeters + 0.02) {
      game.landedFish = fish;
      game.landingStart = { x: fish.x, y: fish.y };
      setState(game, "LANDED");
    }
  } else if (game.state === "LANDED") {
    const fish = game.landedFish;
    if (!fish) {
      finishAttempt(game, false);
      return;
    }
    const progress = clamp(game.stateTimer / 1.35, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    fish.x = game.landingStart.x + (287 - game.landingStart.x) * eased;
    fish.y = game.landingStart.y + (103 - game.landingStart.y) * eased;
    if (progress >= 1) {
      game.totalWeightLb += fish.weightLb;
      game.fishCaught += 1;
      finishAttempt(game, true);
    }
  } else if (game.state === "ESCAPED" && game.stateTimer > 1.2) {
    setState(game, "RESET");
  } else if (game.state === "RESET" && game.stateTimer > 0.85) {
    setState(game, "IDLE");
  }
}

export function depthForFishY(y) {
  return clamp((y - TANK.waterTop) / (TANK.sandTop - TANK.waterTop) * LINE.maxDepthMeters, 0, LINE.maxDepthMeters);
}

export function lengthForFishY(y) {
  return LINE.minimumLengthMeters + depthForFishY(y);
}

export function lineLengthForLure(lure) {
  return Math.hypot(lure.x - ROD_TIP.x, lure.y - ROD_TIP.y) / 52;
}

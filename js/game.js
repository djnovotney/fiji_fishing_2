import { ROD_TIP, TANK } from "./constants.js";
import { createFishSchool, updateFish } from "./fish.js";
import { hookFish, lineLengthForLure, updateFishing } from "./fishing.js";
import { ReelController } from "./reel.js";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export class Game {
  constructor() {
    this.started = false;
    this.debugEnabled = false;
    this.state = "IDLE";
    this.stateTimer = 0;
    this.elapsed = 0;
    this.totalWeightLb = 0;
    this.fishCaught = 0;
    this.fish = createFishSchool();
    this.targetFish = null;
    this.landedFish = null;
    this.landingStart = null;
    this.lure = {
      x: ROD_TIP.x + 18,
      y: TANK.waterTop + 8,
      targetX: ROD_TIP.x + 18,
      targetY: TANK.waterTop + 8,
    };
    this.hasCast = false;
    this.lineLength = lineLengthForLure(this.lure);
    this.fishDepth = 0;
    this.tension = 0;
    this.dangerTime = 0;
    this.reel = new ReelController();
  }

  start() {
    if (this.started) return;
    this.started = true;
  }

  castLure(x, y) {
    if (!this.started || this.state !== "IDLE" || this.hasCast) return false;
    this.setLureTarget(x, y);
    this.lineLength = lineLengthForLure(this.lure);
    this.hasCast = true;
    this.state = "CASTING";
    this.stateTimer = 0;
    return true;
  }

  setLureTarget(x, y) {
    if (!this.started || this.state !== "IDLE" || this.hasCast) return false;
    this.lure.targetX = clamp(x, TANK.left + 18, TANK.right - 18);
    this.lure.targetY = clamp(y, TANK.waterTop + 24, TANK.sandTop - 20);
    return true;
  }

  hookFish() {
    return hookFish(this);
  }

  update(dt) {
    if (!this.started) return;
    dt = Math.min(dt, 0.05);
    this.elapsed += dt;
    this.reel.update(dt);
    const attractionState = this.state === "FISH_INTERESTED" || this.state === "BITE";
    const attractedFish = attractionState && this.targetFish ? this.targetFish : null;
    if (attractedFish) {
      attractedFish.targetX = this.lure.x;
      attractedFish.targetY = this.lure.y;
    }
    updateFish(this.fish, dt, this.elapsed, attractedFish);

    if (this.state === "REELING" && this.targetFish) {
      this.targetFish.x += (this.lure.x - this.targetFish.x) * Math.min(1, dt * 1.5);
    }
    this.lure.x += (this.lure.targetX - this.lure.x) * Math.min(1, dt * 6);
    this.lure.y += (this.lure.targetY - this.lure.y) * Math.min(1, dt * 6);
    updateFishing(this, dt);
    if (this.state !== "REELING" && this.state !== "LANDED") {
      this.lineLength = lineLengthForLure(this.lure);
    }
  }
}

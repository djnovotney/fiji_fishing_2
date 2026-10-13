import { REEL } from "./constants.js";

const TAU = Math.PI * 2;
const MAX_RPM = 420;

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= TAU;
  while (angle < -Math.PI) angle += TAU;
  return angle;
}

export class ReelController {
  constructor() {
    this.angle = -Math.PI / 2;
    this.rpm = 0;
    this.angularVelocity = 0;
    this.cumulativeRotation = 0;
    this.dragging = false;
    this.previousPointerAngle = 0;
    this.lastInputAt = 0;
    this.targetRPM = 0;
  }

  pointerDown(x, y) {
    if (this.dragging) return false;
    const handleX = REEL.x + Math.cos(this.angle) * REEL.handleRadius;
    const handleY = REEL.y + Math.sin(this.angle) * REEL.handleRadius;
    if (Math.hypot(x - handleX, y - handleY) > 33) return false;
    this.dragging = true;
    this.previousPointerAngle = Math.atan2(y - REEL.y, x - REEL.x);
    this.lastInputAt = performance.now();
    this.targetRPM = 0;
    return true;
  }

  pointerMove(x, y) {
    if (!this.dragging) return;
    const now = performance.now();
    const pointerAngle = Math.atan2(y - REEL.y, x - REEL.x);
    const delta = normalizeAngle(pointerAngle - this.previousPointerAngle);
    const seconds = Math.max(0.008, (now - this.lastInputAt) / 1000);
    this.angle += delta;
    this.angularVelocity = delta / seconds;
    this.targetRPM = Math.min(MAX_RPM, Math.max(0, this.angularVelocity * 60 / TAU));
    if (delta > 0) this.cumulativeRotation += delta;
    this.previousPointerAngle = pointerAngle;
    this.lastInputAt = now;
  }

  pointerUp() {
    this.dragging = false;
    this.targetRPM = 0;
    this.angularVelocity = 0;
  }

  update(dt) {
    if (!this.dragging || performance.now() - this.lastInputAt > 150) {
      this.targetRPM = 0;
      this.angularVelocity = 0;
    }
    const blend = 1 - Math.exp(-dt * 7);
    this.rpm += (this.targetRPM - this.rpm) * blend;
    if (this.rpm < 0.5) this.rpm = 0;
  }

  reset() {
    this.pointerUp();
    this.rpm = 0;
    this.angularVelocity = 0;
    this.cumulativeRotation = 0;
    this.angle = -Math.PI / 2;
  }
}

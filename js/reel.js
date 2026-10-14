import { REEL } from "./constants.js";

const TAU = Math.PI * 2;
const MAX_RPM = 240;
const INPUT_TIMEOUT_MS = 50;
const RPM_RESPONSE_RATE = 70;
const PRESSURE_SENSOR_RESPONSE_RATE = RPM_RESPONSE_RATE / 2;

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= TAU;
  while (angle < -Math.PI) angle += TAU;
  return angle;
}

export class ReelController {
  constructor() {
    this.angle = -Math.PI / 2;
    this.rpm = 0;
    this.pressureSensorRPM = 0;
    this.angularVelocity = 0;
    this.cumulativeRotation = 0;
    this.dragging = false;
    this.previousPointerAngle = 0;
    this.lastInputAt = 0;
    this.targetRPM = 0;
  }

  pointerDown(x, y, now = performance.now()) {
    if (this.dragging) return false;
    const handleX = REEL.x + Math.cos(this.angle) * REEL.handleRadius;
    const handleY = REEL.y + Math.sin(this.angle) * REEL.handleRadius;
    if (Math.hypot(x - handleX, y - handleY) > 33) return false;
    this.dragging = true;
    this.previousPointerAngle = Math.atan2(y - REEL.y, x - REEL.x);
    this.lastInputAt = now;
    this.targetRPM = 0;
    return true;
  }

  pointerMove(x, y, now = performance.now()) {
    if (!this.dragging) return;
    const pointerAngle = Math.atan2(y - REEL.y, x - REEL.x);
    const delta = normalizeAngle(pointerAngle - this.previousPointerAngle);
    this.angle += delta;
    const elapsed = Math.max(1, now - this.lastInputAt);
    this.angularVelocity = delta > 0 ? delta / (elapsed / 1000) : 0;
    this.targetRPM = Math.min(MAX_RPM, this.angularVelocity * 60 / TAU);
    if (delta > 0) this.cumulativeRotation += delta;
    this.previousPointerAngle = pointerAngle;
    this.lastInputAt = now;
  }

  pointerUp() {
    this.dragging = false;
    this.targetRPM = 0;
    this.angularVelocity = 0;
  }

  update(dt, now = performance.now()) {
    if (!this.dragging || now - this.lastInputAt > INPUT_TIMEOUT_MS) {
      this.targetRPM = 0;
      this.angularVelocity = 0;
    }
    const blend = 1 - Math.exp(-dt * RPM_RESPONSE_RATE);
    this.rpm += (this.targetRPM - this.rpm) * blend;
    const sensorBlend = 1 - Math.exp(-dt * PRESSURE_SENSOR_RESPONSE_RATE);
    this.pressureSensorRPM += (this.targetRPM - this.pressureSensorRPM) * sensorBlend;
    if (this.rpm < 0.5) this.rpm = 0;
    if (this.pressureSensorRPM < 0.5) this.pressureSensorRPM = 0;
  }

  reset() {
    this.pointerUp();
    this.rpm = 0;
    this.pressureSensorRPM = 0;
    this.angularVelocity = 0;
    this.cumulativeRotation = 0;
    this.angle = -Math.PI / 2;
  }
}

import { REEL, reelSpeedZone } from "./constants.js";

const TAU = Math.PI * 2;
const MAX_RPM = 120;
const SENSOR_ROTATION_BLEND = 0.55;

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
    this.rotationProgress = 0;
    this.rotationStartedAt = null;
    this.completedRotations = [];
    this.hasSensorReading = false;
    this.pressureSensorZone = "TOO LOW";
    this.badRotationZone = null;
    this.badRotationStreak = 0;
  }

  pointerDown(x, y, now = performance.now()) {
    if (this.dragging) return false;
    const handleX = REEL.x + Math.cos(this.angle) * REEL.handleRadius;
    const handleY = REEL.y + Math.sin(this.angle) * REEL.handleRadius;
    if (Math.hypot(x - handleX, y - handleY) > 33) return false;
    this.dragging = true;
    this.previousPointerAngle = Math.atan2(y - REEL.y, x - REEL.x);
    this.lastInputAt = now;
    this.rpm = 0;
    this.angularVelocity = 0;
    this.rotationProgress = 0;
    this.rotationStartedAt = null;
    return true;
  }

  pointerMove(x, y, now = performance.now()) {
    if (!this.dragging) return;
    const pointerAngle = Math.atan2(y - REEL.y, x - REEL.x);
    const delta = normalizeAngle(pointerAngle - this.previousPointerAngle);
    const moveStartedAt = this.lastInputAt;
    this.angle += delta;

    if (delta > 0) {
      if (this.rotationStartedAt === null) this.rotationStartedAt = moveStartedAt;
      let remainingDuration = Math.max(0, now - moveStartedAt);
      let remainingDelta = delta;
      let segmentStartedAt = moveStartedAt;

      while (this.rotationProgress + remainingDelta >= TAU - 1e-9) {
        const deltaToComplete = Math.min(TAU - this.rotationProgress, remainingDelta);
        const durationToComplete = remainingDuration * (deltaToComplete / remainingDelta);
        const completionTime = segmentStartedAt + durationToComplete;
        const rotationDuration = completionTime - this.rotationStartedAt;
        const rotationRPM = rotationDuration > 0
          ? Math.min(MAX_RPM, 60_000 / rotationDuration)
          : MAX_RPM;
        this.recordRotation(rotationRPM);

        remainingDelta = Math.max(0, remainingDelta - deltaToComplete);
        remainingDuration -= durationToComplete;
        segmentStartedAt = completionTime;
        this.rotationProgress = 0;
        this.rotationStartedAt = completionTime;
      }

      this.rotationProgress += remainingDelta;
      this.cumulativeRotation += delta;
    }

    this.previousPointerAngle = pointerAngle;
    this.lastInputAt = now;
  }

  recordRotation(rpm) {
    this.rpm = rpm;
    this.pressureSensorRPM = !this.hasSensorReading
      ? rpm
      : this.pressureSensorRPM + (rpm - this.pressureSensorRPM) * SENSOR_ROTATION_BLEND;
    this.hasSensorReading = true;
    this.angularVelocity = rpm * TAU / 60;
    const zone = reelSpeedZone(rpm);
    if (zone === "IDEAL") {
      this.badRotationZone = null;
      this.badRotationStreak = 0;
    } else if (zone === this.badRotationZone) {
      this.badRotationStreak += 1;
    } else {
      this.badRotationZone = zone;
      this.badRotationStreak = 1;
    }
    this.pressureSensorZone = zone;
    this.completedRotations.push({
      rpm,
      zone,
      badRotationStreak: this.badRotationStreak,
    });
  }

  consumeCompletedRotations() {
    return this.completedRotations.splice(0);
  }

  pointerUp() {
    this.dragging = false;
    this.rpm = 0;
    this.angularVelocity = 0;
    this.rotationProgress = 0;
    this.rotationStartedAt = null;
  }

  reset() {
    this.pointerUp();
    this.pressureSensorRPM = 0;
    this.cumulativeRotation = 0;
    this.completedRotations = [];
    this.hasSensorReading = false;
    this.pressureSensorZone = "TOO LOW";
    this.badRotationZone = null;
    this.badRotationStreak = 0;
    this.angle = -Math.PI / 2;
  }
}

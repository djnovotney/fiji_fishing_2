import {
  REEL,
  REEL_ESCAPE_MAX_RPM,
  REEL_ESCAPE_MIN_RPM,
  REEL_SAMPLE_ANGLE,
  REEL_SAMPLE_COUNT,
  reelSpeedZone,
} from "./constants.js";

const TAU = Math.PI * 2;
const RPM_THRESHOLD_EPSILON = 1e-6;

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= TAU;
  while (angle < -Math.PI) angle += TAU;
  return angle;
}

export class ReelController {
  constructor() {
    this.angle = -Math.PI / 2;
    this.rpm = 0;
    this.segmentRPM = 0;
    this.pressureSensorRPM = 0;
    this.angularVelocity = 0;
    this.cumulativeRotation = 0;
    this.dragging = false;
    this.previousPointerAngle = 0;
    this.lastInputAt = 0;
    this.segmentProgress = 0;
    this.segmentStartedAt = null;
    this.segmentRPMSamples = [];
    this.completedReadings = [];
    this.pressureSensorZone = "TOO LOW";
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
    this.segmentRPM = 0;
    this.angularVelocity = 0;
    this.segmentProgress = 0;
    this.segmentStartedAt = now;
    this.segmentRPMSamples = [];
    return true;
  }

  pointerMove(x, y, now = performance.now()) {
    if (!this.dragging) return;
    const pointerAngle = Math.atan2(y - REEL.y, x - REEL.x);
    const delta = normalizeAngle(pointerAngle - this.previousPointerAngle);
    const moveStartedAt = this.lastInputAt;
    this.angle += delta;

    if (delta > 0) {
      let remainingDuration = Math.max(0, now - moveStartedAt);
      let remainingDelta = delta;
      let segmentStartedAt = moveStartedAt;

      while (this.segmentProgress + remainingDelta >= REEL_SAMPLE_ANGLE - 1e-9) {
        const deltaToComplete = Math.min(REEL_SAMPLE_ANGLE - this.segmentProgress, remainingDelta);
        const durationToComplete = remainingDuration * (deltaToComplete / remainingDelta);
        const completionTime = segmentStartedAt + durationToComplete;
        const segmentDuration = completionTime - this.segmentStartedAt;
        const segmentRPM = segmentDuration > 0
          ? Math.min(REEL_ESCAPE_MAX_RPM * 2, 60_000 / (segmentDuration * TAU / REEL_SAMPLE_ANGLE))
          : REEL_ESCAPE_MAX_RPM * 2;
        this.recordSegmentSpeed(segmentRPM);

        remainingDelta = Math.max(0, remainingDelta - deltaToComplete);
        remainingDuration -= durationToComplete;
        segmentStartedAt = completionTime;
        this.segmentProgress = 0;
        this.segmentStartedAt = completionTime;
      }

      this.segmentProgress += remainingDelta;
      this.cumulativeRotation += delta;
    }

    this.previousPointerAngle = pointerAngle;
    this.lastInputAt = now;
  }

  recordSegmentSpeed(rpm) {
    this.segmentRPM = rpm;
    this.segmentRPMSamples.push(rpm);
    if (this.segmentRPMSamples.length > REEL_SAMPLE_COUNT) {
      this.segmentRPMSamples.shift();
    }

    if (this.segmentRPMSamples.length < REEL_SAMPLE_COUNT) return;
    const averageRPM = this.segmentRPMSamples.reduce((sum, sample) => sum + sample, 0) /
      REEL_SAMPLE_COUNT;
    this.rpm = averageRPM;
    this.pressureSensorRPM = averageRPM;
    this.angularVelocity = averageRPM * TAU / 60;
    const zone = reelSpeedZone(averageRPM);
    this.pressureSensorZone = zone;
    this.completedReadings.push({
      rpm: averageRPM,
      zone,
      escaped: averageRPM < REEL_ESCAPE_MIN_RPM - RPM_THRESHOLD_EPSILON ||
        averageRPM > REEL_ESCAPE_MAX_RPM + RPM_THRESHOLD_EPSILON,
    });
  }

  consumeCompletedReadings() {
    return this.completedReadings.splice(0);
  }

  pointerUp() {
    this.dragging = false;
    this.rpm = 0;
    this.segmentRPM = 0;
    this.angularVelocity = 0;
    this.segmentProgress = 0;
    this.segmentStartedAt = null;
    this.segmentRPMSamples = [];
  }

  reset() {
    this.pointerUp();
    this.pressureSensorRPM = 0;
    this.cumulativeRotation = 0;
    this.completedReadings = [];
    this.pressureSensorZone = "TOO LOW";
    this.angle = -Math.PI / 2;
  }
}

export const WORLD = Object.freeze({ width: 1000, height: 640 });

export const TANK = Object.freeze({
  left: 78,
  right: 922,
  top: 137,
  bottom: 541,
  waterTop: 151,
  sandTop: 505,
});

export const PLATFORM_HEIGHT = 126;
export const ROD_TIP = Object.freeze({ x: 300, y: 48 });
export const BUCKET = Object.freeze({ x: 287, y: 110 });
export const REEL = Object.freeze({ x: 835, y: 489, handleRadius: 59, outerRadius: 77 });

export const LINE = Object.freeze({
  maxDepthMeters: 10,
  minimumLengthMeters: 1.35,
  metersPerRevolution: 0.27,
});

export const GAME_DURATION_SECONDS = 4 * 60;
export const REEL_MIN_RPM = 50;
export const REEL_TARGET_RPM = 57.5;
export const REEL_MAX_RPM = 65;
export const REEL_ESCAPE_MIN_RPM = 40;
export const REEL_ESCAPE_MAX_RPM = 110;
export const REEL_ESCAPE_REVOLUTIONS = 2;
export const REEL_SENSOR_MAX_RPM = 110;
export const REEL_SAMPLE_ANGLE = Math.PI / 2;
export const REEL_SAMPLE_COUNT = 2;
const RPM_THRESHOLD_EPSILON = 1e-6;

export function pressureGaugePosition(rpm) {
  if (rpm <= REEL_MIN_RPM) {
    return 0.25 * Math.max(0, rpm / REEL_MIN_RPM);
  }
  if (rpm <= REEL_MAX_RPM) {
    return 0.25 + 0.5 * (rpm - REEL_MIN_RPM) / (REEL_MAX_RPM - REEL_MIN_RPM);
  }
  return 0.75 + 0.25 * Math.min(
    1,
    (rpm - REEL_MAX_RPM) / (REEL_SENSOR_MAX_RPM - REEL_MAX_RPM),
  );
}

export function reelSpeedZone(rpm) {
  if (rpm < REEL_MIN_RPM - RPM_THRESHOLD_EPSILON) return "TOO LOW";
  if (rpm > REEL_MAX_RPM + RPM_THRESHOLD_EPSILON) return "TOO FAST";
  return "IDEAL";
}

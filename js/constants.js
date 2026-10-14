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

export const REEL_MIN_RPM = 20;
export const REEL_TARGET_RPM = 40;
export const REEL_MAX_RPM = 60;
export const REEL_SENSOR_MAX_RPM = 80;

export function reelSpeedZone(rpm) {
  if (rpm < REEL_MIN_RPM) return "TOO LOW";
  if (rpm > REEL_MAX_RPM) return "TOO FAST";
  return "IDEAL";
}

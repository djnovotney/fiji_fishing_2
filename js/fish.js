import { TANK } from "./constants.js";

const COLORS = ["#ff8b5b", "#ffd45e", "#70d7d2", "#c493fa", "#ff9ac1", "#92df7f", "#f6a64c"];

export function createFish(id, x, y, size = 1) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 27 + Math.random() * 32;
  return {
    id,
    x,
    y,
    size,
    weightLb: 3 + Math.random() * 7,
    color: COLORS[id % COLORS.length],
    speed,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed * 0.38,
    direction: Math.cos(angle) < 0 ? -1 : 1,
    phase: Math.random() * Math.PI * 2,
    turnIn: 0.7 + Math.random() * 2.8,
    active: true,
    recoveryUntil: 0,
    respawnAt: 0,
  };
}

export function createFishSchool(count = 8) {
  return Array.from({ length: count }, (_, index) => {
    const x = TANK.left + 100 + Math.random() * (TANK.right - TANK.left - 200);
    const y = TANK.waterTop + 70 + Math.random() * (TANK.sandTop - TANK.waterTop - 100);
    return createFish(index + 1, x, y, 0.78 + Math.random() * 0.55);
  });
}

export function updateFish(fishList, dt, elapsed, attractedFish) {
  for (const fish of fishList) {
    if (!fish.active) {
      if (elapsed >= fish.respawnAt) {
        fish.x = TANK.left + 100 + Math.random() * (TANK.right - TANK.left - 200);
        fish.y = TANK.waterTop + 70 + Math.random() * (TANK.sandTop - TANK.waterTop - 100);
        fish.active = true;
        fish.recoveryUntil = elapsed + 2;
      }
      continue;
    }

    fish.phase += dt * (1.2 + fish.speed / 70);
    if (fish === attractedFish) {
      const dx = attractedFish.targetX - fish.x;
      const dy = attractedFish.targetY - fish.y;
      const distance = Math.hypot(dx, dy) || 1;
      const urgency = Math.min(1, distance / 100);
      const desiredSpeed = fish.speed * (0.7 + urgency * 0.8);
      fish.vx += (dx / distance * desiredSpeed - fish.vx) * Math.min(1, dt * 2.2);
      fish.vy += (dy / distance * desiredSpeed - fish.vy) * Math.min(1, dt * 2.2);
    } else {
      fish.turnIn -= dt;
      if (fish.turnIn <= 0) {
        fish.turnIn = 1.1 + Math.random() * 3.2;
        fish.vx += (Math.random() - 0.5) * 44;
        fish.vy += (Math.random() - 0.5) * 24;
      }
      fish.vy += Math.sin(fish.phase) * 8 * dt;
      const speed = Math.hypot(fish.vx, fish.vy) || 1;
      const limit = fish.speed * 1.5;
      if (speed > limit) {
        fish.vx *= limit / speed;
        fish.vy *= limit / speed;
      }
    }

    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;

    const margin = 22 * fish.size;
    if (fish.x < TANK.left + margin || fish.x > TANK.right - margin) {
      fish.vx *= -1;
      fish.x = Math.max(TANK.left + margin, Math.min(TANK.right - margin, fish.x));
    }
    if (fish.y < TANK.waterTop + 32 || fish.y > TANK.sandTop - 25) {
      fish.vy *= -1;
      fish.y = Math.max(TANK.waterTop + 32, Math.min(TANK.sandTop - 25, fish.y));
    }
    if (Math.abs(fish.vx) > 2) fish.direction = fish.vx < 0 ? -1 : 1;
  }
}

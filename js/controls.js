import { REEL, TANK } from "./constants.js";

function pointerPosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
}

export function attachControls(canvas, game) {
  canvas.addEventListener("pointermove", (event) => {
    const point = pointerPosition(canvas, event);
    if (game.state === "REELING" && game.reel.dragging) {
      game.reel.pointerMove(point.x, point.y);
    } else if (game.started && point.x >= TANK.left && point.x <= TANK.right &&
      point.y >= TANK.waterTop && point.y <= TANK.sandTop) {
      game.setLureTarget(point.x, point.y);
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!game.started || game.state !== "REELING") return;
    const point = pointerPosition(canvas, event);
    if (game.reel.pointerDown(point.x, point.y)) {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("pointerup", () => game.reel.pointerUp());
  canvas.addEventListener("pointercancel", () => game.reel.pointerUp());
  canvas.addEventListener("lostpointercapture", () => game.reel.pointerUp());
  canvas.addEventListener("pointerleave", (event) => {
    if (event.buttons === 0) return;
    if (game.state !== "REELING") game.reel.pointerUp();
  });
}

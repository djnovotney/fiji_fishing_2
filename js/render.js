import {
  BUCKET,
  PLATFORM_HEIGHT,
  REEL,
  REEL_MAX_RPM,
  REEL_MIN_RPM,
  REEL_SENSOR_MAX_RPM,
  REEL_TARGET_RPM,
  ROD_TIP,
  TANK,
  WORLD,
  reelSpeedZone,
} from "./constants.js";

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawBackground(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  sky.addColorStop(0, "#79d3c1");
  sky.addColorStop(0.2, "#bce8d7");
  sky.addColorStop(0.201, "#17748a");
  sky.addColorStop(1, "#082f4a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.ellipse(115 + i * 135, 58 + Math.sin(i * 2) * 12, 54, 8, -0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatformAndPig(ctx) {
  ctx.fillStyle = "#704222";
  ctx.fillRect(55, PLATFORM_HEIGHT - 6, 460, 17);
  ctx.fillStyle = "#bd8247";
  ctx.fillRect(55, PLATFORM_HEIGHT - 10, 460, 9);
  ctx.strokeStyle = "rgba(70,37,15,0.4)";
  ctx.lineWidth = 2;
  for (let x = 70; x < 510; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, PLATFORM_HEIGHT - 8);
    ctx.lineTo(x + 14, PLATFORM_HEIGHT - 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#72462f";
  roundedRect(ctx, 100, 86, 74, 36, 8);
  ctx.fill();
  ctx.fillStyle = "#ad7650";
  roundedRect(ctx, 105, 82, 64, 9, 4);
  ctx.fill();
  ctx.fillRect(109, 118, 8, 10);
  ctx.fillRect(157, 118, 8, 10);

  ctx.fillStyle = "#a84358";
  ctx.fillRect(115, 49, 16, 26);
  ctx.fillStyle = "#f59ba0";
  ctx.fillRect(111, 45, 20, 25);
  ctx.fillRect(145, 45, 20, 25);
  ctx.fillStyle = "#d86f7e";
  ctx.fillRect(115, 49, 12, 17);
  ctx.fillRect(149, 49, 12, 17);
  ctx.fillStyle = "#e77f8c";
  ctx.fillRect(111, 61, 56, 36);
  ctx.fillStyle = "#f7a2a4";
  ctx.fillRect(117, 55, 45, 32);
  ctx.fillRect(161, 67, 15, 21);
  ctx.fillStyle = "#ffd0c5";
  ctx.fillRect(166, 72, 10, 12);
  ctx.fillStyle = "#5c3748";
  ctx.fillRect(147, 63, 5, 7);
  ctx.fillRect(159, 63, 5, 7);
  ctx.fillStyle = "#b95068";
  ctx.fillRect(169, 75, 3, 4);
  ctx.fillRect(169, 80, 3, 4);
  ctx.fillStyle = "#d86f7e";
  ctx.fillRect(124, 87, 35, 14);

  ctx.strokeStyle = "#27343c";
  ctx.lineWidth = 8;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(158, 91);
  ctx.lineTo(191, 79);
  ctx.lineTo(235, 65);
  ctx.lineTo(271, 54);
  ctx.lineTo(ROD_TIP.x, ROD_TIP.y);
  ctx.stroke();
  ctx.strokeStyle = "#92734c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(158, 91);
  ctx.lineTo(191, 79);
  ctx.lineTo(235, 65);
  ctx.lineTo(271, 54);
  ctx.lineTo(ROD_TIP.x, ROD_TIP.y);
  ctx.stroke();
  ctx.strokeStyle = "#d4c39a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(158, 91);
  ctx.lineTo(191, 79);
  ctx.lineTo(235, 65);
  ctx.lineTo(271, 54);
  ctx.lineTo(ROD_TIP.x, ROD_TIP.y);
  ctx.stroke();
  for (const guide of [{ x: 193, y: 78 }, { x: 239, y: 64 }, { x: 273, y: 53 }, ROD_TIP]) {
    ctx.strokeStyle = "#dce8e4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guide.x, guide.y);
    ctx.lineTo(guide.x + 1, guide.y + 10);
    ctx.stroke();
  }
  ctx.fillStyle = "#48525a";
  ctx.fillRect(158, 88, 17, 7);
  ctx.fillStyle = "#f1b639";
  ctx.fillRect(155, 88, 5, 8);

  ctx.fillStyle = "#e4f2e7";
  ctx.font = "bold 13px Trebuchet MS";
  ctx.fillText("FIJI PIG", 100, 23);
}

function drawBucket(ctx, game) {
  const metal = ctx.createLinearGradient(BUCKET.x - 29, 0, BUCKET.x + 29, 0);
  metal.addColorStop(0, "#65747a");
  metal.addColorStop(0.18, "#d2dcda");
  metal.addColorStop(0.45, "#74848a");
  metal.addColorStop(0.72, "#e4e9e5");
  metal.addColorStop(1, "#77858b");
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.moveTo(BUCKET.x - 28, BUCKET.y - 7);
  ctx.lineTo(BUCKET.x + 28, BUCKET.y - 7);
  ctx.lineTo(BUCKET.x + 21, BUCKET.y + 25);
  ctx.lineTo(BUCKET.x - 21, BUCKET.y + 25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#dce4e3";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(BUCKET.x, BUCKET.y - 7, 28, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#8b999d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(BUCKET.x, BUCKET.y + 2, 24, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(BUCKET.x - 17, BUCKET.y - 1);
  ctx.lineTo(BUCKET.x - 13, BUCKET.y + 18);
  ctx.moveTo(BUCKET.x + 17, BUCKET.y - 1);
  ctx.lineTo(BUCKET.x + 13, BUCKET.y + 18);
  ctx.stroke();
  if (game.state === "LANDED" && game.stateTimer > 1.1) {
    ctx.fillStyle = "#ffb2a2";
    ctx.fillRect(BUCKET.x - 12, BUCKET.y - 12, 24, 8);
  }
}

function drawAquarium(ctx, game) {
  ctx.save();
  ctx.shadowColor = "rgba(4, 16, 25, 0.45)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "rgba(26, 114, 137, 0.52)";
  roundedRect(ctx, TANK.left, TANK.top, TANK.right - TANK.left, TANK.bottom - TANK.top, 16);
  ctx.fill();
  ctx.restore();

  const water = ctx.createLinearGradient(0, TANK.waterTop, 0, TANK.sandTop);
  water.addColorStop(0, "rgba(60, 195, 205, 0.68)");
  water.addColorStop(0.38, "rgba(19, 130, 166, 0.78)");
  water.addColorStop(1, "rgba(8, 52, 93, 0.9)");
  ctx.fillStyle = water;
  roundedRect(ctx, TANK.left + 8, TANK.waterTop, TANK.right - TANK.left - 16, TANK.bottom - TANK.waterTop - 9, 9);
  ctx.fill();

  ctx.fillStyle = "rgba(190, 248, 241, 0.58)";
  ctx.fillRect(TANK.left + 10, TANK.waterTop, TANK.right - TANK.left - 20, 4);
  ctx.strokeStyle = "rgba(212, 252, 243, 0.25)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const x = TANK.left + 38 + i * 112 + Math.sin(game.elapsed * 0.7 + i) * 8;
    ctx.beginPath();
    ctx.ellipse(x, TANK.waterTop + 13 + (i % 3) * 3, 28 + (i % 2) * 12, 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#c7a36b";
  ctx.fillRect(TANK.left + 8, TANK.sandTop, TANK.right - TANK.left - 16, TANK.bottom - TANK.sandTop - 9);
  ctx.fillStyle = "rgba(255, 225, 164, 0.46)";
  for (let i = 0; i < 100; i += 1) {
    const x = TANK.left + 18 + ((i * 83) % (TANK.right - TANK.left - 40));
    const y = TANK.sandTop + 7 + ((i * 17) % 24);
    ctx.fillRect(x, y, 2, 2);
  }

  drawPlants(ctx);
  drawDecorations(ctx);
  for (const fish of game.fish) {
    if (fish.active || fish === game.landedFish) drawFish(ctx, fish);
  }
  drawBubbles(ctx, game.elapsed);

  ctx.strokeStyle = "rgba(218, 251, 255, 0.78)";
  ctx.lineWidth = 8;
  roundedRect(ctx, TANK.left, TANK.top, TANK.right - TANK.left, TANK.bottom - TANK.top, 16);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(TANK.left + 18, TANK.top + 17);
  ctx.lineTo(TANK.left + 18, TANK.bottom - 24);
  ctx.stroke();
}

function drawPlants(ctx) {
  const plants = [
    { x: 119, count: 5, color: "#55be83" },
    { x: 372, count: 4, color: "#77d28a" },
    { x: 723, count: 5, color: "#4bbf91" },
    { x: 871, count: 4, color: "#77ce79" },
  ];
  for (const plant of plants) {
    for (let blade = 0; blade < plant.count; blade += 1) {
      const sway = Math.sin(blade * 2 + plant.x) * 12;
      ctx.strokeStyle = plant.color;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(plant.x + blade * 5, TANK.sandTop + 7);
      ctx.quadraticCurveTo(plant.x - 16 + sway, 420, plant.x - 17 + sway * 1.5, 337 + blade * 9);
      ctx.stroke();
    }
  }
}

function drawDecorations(ctx) {
  const rocks = [
    [220, 496, 48, 21], [251, 495, 37, 25], [562, 495, 59, 25],
    [605, 496, 40, 18], [790, 497, 51, 22],
  ];
  for (const [x, y, rx, ry] of rocks) {
    ctx.fillStyle = "#687982";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.1, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(214, 244, 230, 0.28)";
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.23, y - ry * 0.43, rx * 0.4, ry * 0.25, -0.2, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 5; i += 1) {
    const x = 300 + i * 13;
    ctx.strokeStyle = i % 2 ? "#ee7d91" : "#ffb16d";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, TANK.sandTop + 2);
    ctx.lineTo(x - 5, TANK.sandTop - 25);
    ctx.lineTo(x + 2, TANK.sandTop - 39);
    ctx.moveTo(x - 3, TANK.sandTop - 17);
    ctx.lineTo(x - 13, TANK.sandTop - 31);
    ctx.stroke();
  }
}

function drawFish(ctx, fish) {
  const size = fish.size;
  ctx.save();
  ctx.translate(fish.x, fish.y + Math.sin(fish.phase) * 2.5);
  ctx.scale(fish.direction * size, size);
  ctx.fillStyle = fish.color;
  ctx.beginPath();
  ctx.moveTo(-19, 0);
  ctx.lineTo(-38, -15 + Math.sin(fish.phase * 2) * 3);
  ctx.lineTo(-34, 0);
  ctx.lineTo(-38, 15 + Math.sin(fish.phase * 2) * 3);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 0, 25, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.beginPath();
  ctx.moveTo(-4, -12);
  ctx.lineTo(8, -27);
  ctx.lineTo(17, -10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(-4, 5);
  ctx.lineTo(10, 18);
  ctx.lineTo(15, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(16, 50, 72, 0.28)";
  ctx.beginPath();
  ctx.ellipse(5, 2, 8, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(15, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#142d3b";
  ctx.beginPath();
  ctx.arc(16, -4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBubbles(ctx, elapsed) {
  for (let i = 0; i < 19; i += 1) {
    const x = TANK.left + 34 + ((i * 137) % (TANK.right - TANK.left - 70));
    const travel = (elapsed * (13 + (i % 4) * 5) + i * 49) % (TANK.sandTop - TANK.waterTop);
    const y = TANK.sandTop - travel;
    ctx.strokeStyle = "rgba(222, 251, 255, 0.42)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + Math.sin(elapsed + i) * 4, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawLineAndLure(ctx, game) {
  const fighting = game.state === "REELING" || game.state === "LANDED";
  const fish = fighting ? game.targetFish || game.landedFish : null;
  const lure = fish ? { x: fish.x, y: fish.y } : game.lure;
  const tensionFactor = fighting ? game.tension / 100 : 0;
  const bend = fighting ? 20 + tensionFactor * 40 : 4;

  ctx.strokeStyle = "#263b46";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ROD_TIP.x, ROD_TIP.y);
  ctx.quadraticCurveTo((ROD_TIP.x + lure.x) / 2 + bend, (ROD_TIP.y + lure.y) / 2, lure.x, lure.y);
  ctx.stroke();
  if (!fish) {
    ctx.strokeStyle = "rgba(224, 244, 243, 0.95)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lure.x, lure.y);
    ctx.lineTo(lure.x + 2, lure.y + 17);
    ctx.stroke();
    ctx.fillStyle = "#f8bb42";
    ctx.beginPath();
    ctx.ellipse(lure.x, lure.y, 9, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(lure.x - 2, lure.y - 1, 3, 1.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#dcecf0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lure.x + 2, lure.y + 20, 5, -Math.PI / 2, Math.PI * 0.8);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#f6d969";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lure.x, lure.y + 5);
    ctx.lineTo(lure.x, lure.y + 18);
    ctx.stroke();
    ctx.fillStyle = "#fff5bd";
    ctx.beginPath();
    ctx.arc(lure.x, lure.y + 20, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPressureMeter(ctx, game) {
  const x = 933;
  const y = 418;
  const width = 18;
  const height = 132;

  ctx.fillStyle = "rgba(3, 29, 44, 0.9)";
  roundedRect(ctx, 923, y - 26, 75, height + 52, 9);
  ctx.fill();

  const lowHeight = height * REEL_MIN_RPM / REEL_SENSOR_MAX_RPM;
  const idealHeight = height * (REEL_MAX_RPM - REEL_MIN_RPM) / REEL_SENSOR_MAX_RPM;
  const fastHeight = height - lowHeight - idealHeight;
  ctx.fillStyle = "#ed765d";
  ctx.fillRect(x, y + height - lowHeight, width, lowHeight);
  ctx.fillStyle = "#64d995";
  ctx.fillRect(x, y + fastHeight, width, idealHeight);
  ctx.fillStyle = "#ed765d";
  ctx.fillRect(x, y, width, fastHeight);

  const meterProgress = Math.max(0, Math.min(1, game.reel.rpm / REEL_SENSOR_MAX_RPM));
  const markerY = y + height * (1 - meterProgress);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(x - 4, markerY);
  ctx.lineTo(x - 11, markerY - 6);
  ctx.lineTo(x - 11, markerY + 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f4ffff";
  ctx.textAlign = "center";
  ctx.font = "bold 9px Trebuchet MS";
  ctx.fillText("TOO FAST", 974, y + 11);
  ctx.fillText("IDEAL", 974, y + fastHeight + idealHeight * 0.5 + 3);
  ctx.fillText("TOO LOW", 974, y + height - 5);

  ctx.fillStyle = "#d9e9eb";
  ctx.font = "bold 9px Trebuchet MS";
  ctx.fillText(`REEL ${Math.round(game.reel.rpm)} RPM`, 960, y - 12);
}

function drawReel(ctx, game) {
  const { x, y, outerRadius } = REEL;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#122d39";
  ctx.beginPath();
  ctx.arc(x, y, outerRadius + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#283a44";
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9db0b4";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, outerRadius - 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#697a81";
  ctx.beginPath();
  ctx.arc(x, y, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#273d48";
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c4d1cc";
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 56, y + Math.sin(angle) * 56);
    ctx.lineTo(x + Math.cos(angle) * 67, y + Math.sin(angle) * 67);
    ctx.stroke();
  }
  ctx.fillStyle = "#a7b7b7";
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();

  const handleX = x + Math.cos(game.reel.angle) * REEL.handleRadius;
  const handleY = y + Math.sin(game.reel.angle) * REEL.handleRadius;
  ctx.strokeStyle = "#8d9b9e";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(handleX, handleY);
  ctx.stroke();
  ctx.strokeStyle = "#d2dcda";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(handleX, handleY);
  ctx.stroke();

  ctx.fillStyle = "#f4bd37";
  ctx.beginPath();
  ctx.arc(handleX, handleY, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff09a";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#f3ffff";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(game.reel.rpm)} RPM`, x, y + outerRadius + 31);
  if (game.state === "REELING") {
    const speedZone = reelSpeedZone(game.reel.rpm);
    const speedLabel = speedZone === "IDEAL" ? `GOOD · ${REEL_TARGET_RPM} IDEAL` : speedZone;
    ctx.fillStyle = speedZone === "IDEAL"
      ? "#8ff0ad"
      : "#ffd08b";
    ctx.font = "bold 10px Trebuchet MS";
    ctx.fillText(speedLabel, x, y + outerRadius + 45);
  }
  ctx.textAlign = "left";
  if (game.state === "REELING" && !game.reel.dragging) {
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.font = "bold 11px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("GRAB HANDLE", x, y - outerRadius - 12);
    ctx.textAlign = "left";
  }
}

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
  }

  render(game) {
    const ctx = this.context;
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    drawBackground(ctx);
    drawPlatformAndPig(ctx);
    drawBucket(ctx, game);
    drawAquarium(ctx, game);
    drawLineAndLure(ctx, game);
    if (game.state === "REELING") drawPressureMeter(ctx, game);
    drawReel(ctx, game);
  }
}

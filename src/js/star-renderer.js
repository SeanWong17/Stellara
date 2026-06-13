import { clamp, pseudoRandom, temperatureColor, withAlpha, lighten, darken, formatNumber } from "./utils.js";

let canvas, ctx;
let flashAlpha = 0;

export function initStarCanvas(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

export function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
}

export function drawStar(point, trackType) {
  if (!point || !ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const ratio = width / Math.max(1, canvas.getBoundingClientRect().width);
  const cx = width / 2;
  const cy = height / 2;
  const radiusSolar = Math.pow(10, point.log_R);
  const temp = Math.pow(10, point.log_Teff);
  const lum = Math.pow(10, point.log_L);

  ctx.clearRect(0, 0, width, height);
  drawStarscape(width, height, point.age_yr);

  const isEndState = point.eep >= 360;
  if (isEndState && trackType === "low-mass") {
    drawWhiteDwarf(cx, cy, ratio, temp);
  } else if (isEndState && trackType === "high-mass") {
    drawCoreCollapse(cx, cy, ratio, point, width, height);
  } else {
    drawNormalStar(cx, cy, width, height, ratio, radiusSolar, temp, lum, point);
  }

  drawScale(width, height, radiusSolar, ratio);
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
    ctx.fillRect(0, 0, width, height);
    flashAlpha -= 0.02;
  }
}

export function triggerFlash() {
  flashAlpha = 0.3;
}

function drawNormalStar(cx, cy, width, height, ratio, radiusSolar, temp, lum, point) {
  const visualRadius = clamp(30 * ratio + Math.log10(radiusSolar + 1) * 78 * ratio, 22 * ratio, Math.min(width, height) * 0.37);
  const glow = clamp(visualRadius * (1.2 + Math.log10(lum + 1) * 0.22), visualRadius * 1.3, Math.min(width, height) * 0.7);
  const color = temperatureColor(temp);

  const outer = ctx.createRadialGradient(cx, cy, visualRadius * 0.2, cx, cy, glow);
  outer.addColorStop(0, withAlpha(color, 0.55));
  outer.addColorStop(0.42, withAlpha(color, 0.16));
  outer.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(cx, cy, glow, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(cx - visualRadius * 0.32, cy - visualRadius * 0.34, 0, cx, cy, visualRadius);
  body.addColorStop(0, "#fffaf0");
  body.addColorStop(0.24, lighten(color, 0.35));
  body.addColorStop(0.76, color);
  body.addColorStop(1, darken(color, 0.38));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, visualRadius, 0, Math.PI * 2);
  ctx.fill();

  drawSurfaceBands(cx, cy, visualRadius, color, point);
}

function drawWhiteDwarf(cx, cy, ratio, temp) {
  const r = 18 * ratio;
  const color = temperatureColor(Math.max(temp, 12000));
  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 3);
  glow.addColorStop(0, withAlpha(color, 0.4));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 3, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.5, lighten(color, 0.6));
  body.addColorStop(1, color);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoreCollapse(cx, cy, ratio, point, width, height) {
  const phase = (point.eep % 20) / 20;

  // Expanding supernova shell
  for (let i = 0; i < 3; i++) {
    const p = (phase + i * 0.33) % 1;
    const shellR = 20 * ratio + p * 60 * ratio;
    const shellAlpha = 0.4 * (1 - p);
    const hue = 30 + i * 20;
    ctx.strokeStyle = `hsla(${hue},80%,55%,${shellAlpha})`;
    ctx.lineWidth = (3 - i) * ratio;
    ctx.beginPath();
    ctx.arc(cx, cy, shellR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Dense remnant core
  const coreR = 6 * ratio;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  core.addColorStop(0, "rgba(220,220,255,0.95)");
  core.addColorStop(0.6, "rgba(140,140,220,0.6)");
  core.addColorStop(1, "rgba(60,60,120,0.2)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Label hint
  ctx.fillStyle = "rgba(244,241,232,0.5)";
  ctx.font = `${11 * ratio}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("→ Core collapse / SN", cx, height - 18 * ratio);
}

function drawStarscape(width, height, seed) {
  ctx.fillStyle = "#0e1110";
  ctx.fillRect(0, 0, width, height);
  const count = Math.round((width * height) / 18000);
  for (let i = 0; i < count; i++) {
    const x = pseudoRandom(seed + i * 17) * width;
    const y = pseudoRandom(seed + i * 31) * height;
    const alpha = 0.22 + pseudoRandom(seed + i * 53) * 0.55;
    ctx.fillStyle = `rgba(244,241,232,${alpha})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
}

function drawSurfaceBands(cx, cy, radius, color, point) {
  const bandCount = point.stage === "main_sequence" ? 4 : 8;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.99, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < bandCount; i++) {
    const y = cy - radius + (i + 0.5) * (radius * 2 / bandCount);
    const w = Math.sqrt(Math.max(0, radius * radius - (y - cy) * (y - cy))) * 2;
    ctx.strokeStyle = withAlpha(i % 2 ? lighten(color, 0.18) : darken(color, 0.18), 0.18);
    ctx.lineWidth = radius * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, y);
    ctx.bezierCurveTo(cx - w * 0.2, y - radius * 0.05, cx + w * 0.2, y + radius * 0.05, cx + w / 2, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScale(width, height, radiusSolar, ratio) {
  ctx.fillStyle = "rgba(244,241,232,0.78)";
  ctx.font = `${13 * ratio}px Inter, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(`${formatNumber(radiusSolar, 2)} R☉`, 18 * ratio, height - 24 * ratio);
}

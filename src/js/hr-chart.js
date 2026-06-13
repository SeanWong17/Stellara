import { state, activeTrack, currentPoint, t } from "./state.js";
import { clamp, temperatureColor, formatTemperatureTick, formatNumber } from "./utils.js";
import { COLORS } from "./state.js";

let container, staticCanvas, dynamicCanvas, tooltipEl;
let staticCtx, dynamicCtx;
let width = 0, height = 0;
const margin = { top: 48, right: 28, bottom: 62, left: 68 };
let pointers = new Map();
let pinchStartDist = 0;
let pinchStartTransform = null;

export function initHRChart(containerEl) {
  container = containerEl;
  container.style.position = "relative";

  staticCanvas = document.createElement("canvas");
  dynamicCanvas = document.createElement("canvas");
  tooltipEl = document.createElement("div");

  for (const c of [staticCanvas, dynamicCanvas]) {
    c.style.position = "absolute";
    c.style.inset = "0";
    c.style.width = "100%";
    c.style.height = "100%";
    container.appendChild(c);
  }
  dynamicCanvas.style.pointerEvents = "none";

  tooltipEl.className = "hr-tooltip hidden";
  container.appendChild(tooltipEl);

  staticCtx = staticCanvas.getContext("2d");
  dynamicCtx = dynamicCanvas.getContext("2d");

  resize();
  window.addEventListener("resize", () => { resize(); drawStatic(); });
  bindTouch();
}

export function resize() {
  const rect = container.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.floor(rect.width * dpr);
  height = Math.floor(rect.height * dpr);
  for (const c of [staticCanvas, dynamicCanvas]) {
    c.width = width;
    c.height = height;
  }
}

function xScale(logTeff) {
  const { xMin, xMax } = state.axisRange;
  const vt = state.viewTransform;
  const innerW = width - margin.left - margin.right;
  const raw = margin.left + (xMax - logTeff) / (xMax - xMin) * innerW;
  return (raw - width / 2) * vt.scaleX + width / 2 + vt.offsetX;
}

function yScale(logL) {
  const { yMin, yMax } = state.axisRange;
  const vt = state.viewTransform;
  const innerH = height - margin.top - margin.bottom;
  const raw = margin.top + (yMax - logL) / (yMax - yMin) * innerH;
  return (raw - height / 2) * vt.scaleY + height / 2 + vt.offsetY;
}

export function drawStatic() {
  if (!state.axisRange || !width) return;
  const ctx = staticCtx;
  const dpr = width / container.getBoundingClientRect().width;
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  drawSpectralBands(ctx, dpr);
  drawGrid(ctx, dpr);
  drawAxes(ctx, dpr);
  drawTracks(ctx, dpr);
  drawReferencePoints(ctx, dpr);
  drawEndStateMarkers(ctx, dpr);

  ctx.restore();
}

export function drawDynamic() {
  if (!state.axisRange || !width) return;
  const ctx = dynamicCtx;
  const dpr = width / container.getBoundingClientRect().width;
  ctx.clearRect(0, 0, width, height);

  const track = activeTrack();
  const point = currentPoint(track);
  if (!point) return;

  const activeIdx = state.tracks.findIndex((t) => t.slug === track.slug);
  const color = COLORS[Math.max(0, activeIdx) % COLORS.length];
  const cx = xScale(point.log_Teff);
  const cy = yScale(point.log_L);

  ctx.beginPath();
  ctx.arc(cx, cy, 7 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#111412";
  ctx.lineWidth = 2.5 * dpr;
  ctx.stroke();
}

function drawSpectralBands(ctx, dpr) {
  const classes = [
    { label: "O", hot: 5.0, cool: Math.log10(30000), color: "rgba(112,167,255,0.22)" },
    { label: "B", hot: Math.log10(30000), cool: Math.log10(10000), color: "rgba(148,178,255,0.18)" },
    { label: "A", hot: Math.log10(10000), cool: Math.log10(7500), color: "rgba(210,220,255,0.16)" },
    { label: "F", hot: Math.log10(7500), cool: Math.log10(6000), color: "rgba(245,241,210,0.17)" },
    { label: "G", hot: Math.log10(6000), cool: Math.log10(5200), color: "rgba(245,184,75,0.18)" },
    { label: "K", hot: Math.log10(5200), cool: Math.log10(3700), color: "rgba(232,126,84,0.18)" },
    { label: "M", hot: Math.log10(3700), cool: 3.3, color: "rgba(227,108,100,0.18)" }
  ];
  const bandY = 16 * dpr;
  const bandH = 22 * dpr;

  ctx.font = `${12 * dpr}px Inter, sans-serif`;
  ctx.textAlign = "end";
  ctx.fillStyle = "rgba(244,241,232,0.72)";
  ctx.fillText(t("spectralClass"), margin.left - 8 * dpr, bandY + 15 * dpr);

  for (const item of classes) {
    const x1 = clamp(xScale(item.hot), margin.left, width - margin.right);
    const x2 = clamp(xScale(item.cool), margin.left, width - margin.right);
    const rx = Math.min(x1, x2);
    const rw = Math.abs(x2 - x1);
    if (rw < 4) continue;
    ctx.fillStyle = item.color;
    ctx.fillRect(rx, bandY, rw, bandH);
    ctx.strokeStyle = "rgba(244,241,232,0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, bandY, rw, bandH);
    ctx.fillStyle = "rgba(244,241,232,0.72)";
    ctx.font = `bold ${12 * dpr}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(item.label, rx + rw / 2, bandY + 15 * dpr);
  }
}

function drawGrid(ctx, dpr) {
  const { xMin, xMax, yMin, yMax } = state.axisRange;
  const tempTicks = [50000, 30000, 10000, 7500, 6000, 5000, 4000, 3000]
    .map((temp) => ({ temp, log: Math.log10(temp) }))
    .filter((tick) => tick.log >= xMin && tick.log <= xMax);

  ctx.strokeStyle = "rgba(244,241,232,0.11)";
  ctx.lineWidth = 1;
  for (const tick of tempTicks) {
    const x = xScale(tick.log);
    ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, height - margin.bottom); ctx.stroke();
  }

  const yTicks = [];
  for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v++) yTicks.push(v);
  for (const tick of yTicks) {
    const y = yScale(tick);
    ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(width - margin.right, y); ctx.stroke();
  }
}

function drawAxes(ctx, dpr) {
  const { xMin, xMax, yMin, yMax } = state.axisRange;
  ctx.strokeStyle = "#5a6259";
  ctx.lineWidth = 1.2 * dpr;
  ctx.beginPath();
  ctx.moveTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.stroke();

  ctx.fillStyle = "rgba(167,170,164,1)";
  ctx.font = `${12 * dpr}px Inter, sans-serif`;
  const tempTicks = [50000, 30000, 10000, 7500, 6000, 5000, 4000, 3000]
    .filter((temp) => Math.log10(temp) >= xMin && Math.log10(temp) <= xMax);
  ctx.textAlign = "center";
  for (const temp of tempTicks) {
    ctx.fillText(formatTemperatureTick(temp), xScale(Math.log10(temp)), height - 31 * dpr);
  }
  ctx.textAlign = "end";
  for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v++) {
    ctx.fillText(v.toFixed(0), margin.left - 10 * dpr, yScale(v) + 4 * dpr);
  }

  ctx.fillStyle = "#f4f1e8";
  ctx.font = `bold ${13 * dpr}px Inter, sans-serif`;
  ctx.textAlign = "center";
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  ctx.fillText(t("xAxis"), margin.left + innerW / 2, height - 10 * dpr);
  ctx.save();
  ctx.translate(18 * dpr, margin.top + innerH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(t("yAxis"), 0, 0);
  ctx.restore();
}

function drawTracks(ctx, dpr) {
  const active = activeTrack();
  const showAll = state.overlayAll;
  state.tracks.forEach((track, index) => {
    if (!showAll && track.slug !== active.slug) return;
    const isActive = track.slug === active.slug;
    ctx.beginPath();
    track.points.forEach((p, i) => {
      const px = xScale(p.log_Teff);
      const py = yScale(p.log_L);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = COLORS[index % COLORS.length];
    ctx.lineWidth = (isActive ? 2.6 : 1.45) * dpr;
    ctx.globalAlpha = isActive ? 1 : 0.22;
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (track.track_type === "high-mass") {
      const last = track.points[track.points.length - 1];
      const lx = xScale(last.log_Teff);
      const ly = yScale(last.log_L);
      const targetLogL = -2;
      const ty = yScale(targetLogL);
      ctx.save();
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.globalAlpha = isActive ? 0.6 : 0.15;
      ctx.strokeStyle = COLORS[index % COLORS.length];
      ctx.lineWidth = (isActive ? 2 : 1.2) * dpr;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 15 * dpr, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  });
}

function drawReferencePoints(ctx, dpr) {
  const sunLogT = Math.log10(5772);
  const sunLogL = 0;
  const sx = xScale(sunLogT);
  const sy = yScale(sunLogL);
  ctx.beginPath();
  ctx.arc(sx, sy, 4.5 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = "#f4f1e8";
  ctx.fill();
  ctx.strokeStyle = "#111412";
  ctx.lineWidth = 2 * dpr;
  ctx.stroke();
  ctx.fillStyle = "rgba(244,241,232,0.76)";
  ctx.font = `bold ${12 * dpr}px Inter, sans-serif`;
  ctx.textAlign = "start";
  ctx.fillText(t("sun"), sx + 10 * dpr, sy + 4 * dpr);
}

function drawEndStateMarkers(ctx, dpr) {
  const active = activeTrack();
  const showAll = state.overlayAll;
  state.tracks.forEach((track, index) => {
    if (!showAll && track.slug !== active.slug) return;
    const last = track.points[track.points.length - 1];
    const px = xScale(last.log_Teff);
    const py = yScale(last.log_L);
    const color = COLORS[index % COLORS.length];
    ctx.fillStyle = color;
    ctx.strokeStyle = "#111412";
    ctx.lineWidth = 1.5 * dpr;
    if (track.track_type === "low-mass") {
      const s = 5 * dpr;
      ctx.beginPath();
      ctx.moveTo(px, py - s); ctx.lineTo(px + s, py);
      ctx.lineTo(px, py + s); ctx.lineTo(px - s, py);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else {
      const s = 6 * dpr;
      const spikes = 6;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const r = i % 2 === 0 ? s : s * 0.45;
        const method = i === 0 ? "moveTo" : "lineTo";
        ctx[method](px + Math.cos(angle) * r, py + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  });
}

function bindTouch() {
  staticCanvas.addEventListener("pointerdown", onPointerDown);
  staticCanvas.addEventListener("pointermove", onPointerMove);
  staticCanvas.addEventListener("pointerup", onPointerUp);
  staticCanvas.addEventListener("pointercancel", onPointerUp);
}

function onPointerDown(e) {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const pts = [...pointers.values()];
    pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    pinchStartTransform = { ...state.viewTransform };
  }
}

function onPointerMove(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2 && pinchStartTransform) {
    const pts = [...pointers.values()];
    const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const scale = clamp(dist / pinchStartDist, 0.5, 4);
    state.viewTransform.scaleX = pinchStartTransform.scaleX * scale;
    state.viewTransform.scaleY = pinchStartTransform.scaleY * scale;
    drawStatic();
    drawDynamic();
  }
}

function onPointerUp(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStartTransform = null;
  if (pointers.size === 0 && !pinchStartTransform) {
    showTooltipAt(e.clientX, e.clientY);
  }
}

function showTooltipAt(clientX, clientY) {
  const rect = container.getBoundingClientRect();
  const dpr = width / rect.width;
  const px = (clientX - rect.left) * dpr;
  const py = (clientY - rect.top) * dpr;
  let best = null, bestDist = 20 * dpr;

  for (const track of state.tracks) {
    if (!state.overlayAll && track.slug !== state.activeSlug) continue;
    for (const p of track.points) {
      const dx = xScale(p.log_Teff) - px;
      const dy = yScale(p.log_L) - py;
      const d = Math.hypot(dx, dy);
      if (d < bestDist) { bestDist = d; best = p; }
    }
  }

  if (best) {
    const temp = Math.pow(10, best.log_Teff);
    const lum = Math.pow(10, best.log_L);
    tooltipEl.innerHTML = `<strong>${formatNumber(temp, 0, state.lang)} K</strong><br>` +
      `L = ${formatNumber(lum, 2, state.lang)} L☉<br>` +
      `Age: ${formatNumber(best.age_yr / 1e6, 1, state.lang)} Myr`;
    tooltipEl.style.left = `${clientX - rect.left + 12}px`;
    tooltipEl.style.top = `${clientY - rect.top - 10}px`;
    tooltipEl.classList.remove("hidden");
    clearTimeout(tooltipEl._timer);
    tooltipEl._timer = setTimeout(() => tooltipEl.classList.add("hidden"), 3000);
  } else {
    tooltipEl.classList.add("hidden");
  }
}



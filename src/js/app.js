const state = {
  lang: localStorage.getItem("stellar-lang") || "zh",
  manifest: null,
  tracks: [],
  activeSlug: null,
  progress: 0,
  playing: false,
  raf: null,
  lastFrame: 0,
  chart: null
};

const el = {};
const colors = ["#f5b84b", "#77c7b8", "#e36c64", "#a6a1ff", "#8fd16f", "#f08bc3", "#70a7ff"];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  applyLanguage();
  bindEvents();
  resizeCanvas();
  window.addEventListener("resize", () => {
    resizeCanvas();
    drawStar();
    drawChart();
  });

  try {
    state.manifest = await fetchJson("data/tracks_manifest.json");
    state.tracks = await Promise.all(
      state.manifest.tracks.map((item) => fetchJson(`data/tracks/${item.slug}.json`))
    );
    state.activeSlug = state.tracks.find((track) => Math.abs(track.initial_mass - 1) < 0.01)?.slug || state.tracks[0].slug;
    buildMassButtons();
    setLoading(false);
    render();
  } catch (error) {
    console.error(error);
    el.loading.textContent = t("loadError");
  }
}

function cacheElements() {
  Object.assign(el, {
    loading: document.getElementById("loading"),
    langToggle: document.getElementById("langToggle"),
    starTitle: document.getElementById("starTitle"),
    stagePill: document.getElementById("stagePill"),
    stageName: document.getElementById("stageName"),
    stageDescription: document.getElementById("stageDescription"),
    starCanvas: document.getElementById("starCanvas"),
    timeSlider: document.getElementById("timeSlider"),
    ageLabel: document.getElementById("ageLabel"),
    playButton: document.getElementById("playButton"),
    overlayToggle: document.getElementById("overlayToggle"),
    massGrid: document.getElementById("massGrid"),
    hrChart: document.getElementById("hrChart"),
    metricAge: document.getElementById("metricAge"),
    metricTemp: document.getElementById("metricTemp"),
    metricLum: document.getElementById("metricLum"),
    metricRadius: document.getElementById("metricRadius"),
    metricLogG: document.getElementById("metricLogG"),
    metricMass: document.getElementById("metricMass")
  });
}

function bindEvents() {
  el.langToggle.addEventListener("click", () => {
    state.lang = state.lang === "zh" ? "en" : "zh";
    localStorage.setItem("stellar-lang", state.lang);
    applyLanguage();
    render();
  });

  el.timeSlider.addEventListener("input", () => {
    state.progress = Number(el.timeSlider.value) / 1000;
    render();
  });

  el.playButton.addEventListener("click", () => {
    state.playing = !state.playing;
    state.lastFrame = performance.now();
    updatePlayButton();
    if (state.playing) tick(state.lastFrame);
  });

  el.overlayToggle.addEventListener("change", drawChart);
}

function applyLanguage() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  el.langToggle.textContent = state.lang === "zh" ? "EN" : "中";
  el.loading.textContent = t("loading");
  updatePlayButton();
}

function t(key) {
  return key.split(".").reduce((obj, part) => obj?.[part], window.STELLAR_I18N[state.lang]) || key;
}

function setLoading(show) {
  el.loading.classList.toggle("hidden", !show);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

function buildMassButtons() {
  el.massGrid.innerHTML = "";
  state.tracks.forEach((track, index) => {
    const button = document.createElement("button");
    button.className = "mass-button";
    button.type = "button";
    button.dataset.slug = track.slug;
    button.style.setProperty("--mass-color", colors[index % colors.length]);
    button.textContent = `${formatMass(track.initial_mass)} M☉`;
    button.addEventListener("click", () => {
      state.activeSlug = track.slug;
      state.progress = Math.min(state.progress, 0.995);
      render();
    });
    el.massGrid.appendChild(button);
  });
}

function activeTrack() {
  return state.tracks.find((track) => track.slug === state.activeSlug) || state.tracks[0];
}

function currentPoint(track = activeTrack()) {
  const points = track.points;
  if (!points.length) return null;
  const exact = state.progress * (points.length - 1);
  const left = Math.floor(exact);
  const right = Math.min(points.length - 1, left + 1);
  const mix = exact - left;
  return interpolatePoint(points[left], points[right], mix);
}

function interpolatePoint(a, b, mix) {
  const out = { stage: mix < 0.5 ? a.stage : b.stage, mist_phase: mix < 0.5 ? a.mist_phase : b.mist_phase };
  for (const key of ["eep", "age_yr", "mass", "log_L", "log_Teff", "log_R", "log_g", "center_h1", "center_he4"]) {
    out[key] = a[key] + (b[key] - a[key]) * mix;
  }
  return out;
}

function render() {
  if (!state.tracks.length) return;
  const track = activeTrack();
  const point = currentPoint(track);
  const stage = window.STELLAR_I18N[state.lang].stages[point.stage] || window.STELLAR_I18N[state.lang].stages.main_sequence;

  el.timeSlider.value = Math.round(state.progress * 1000);
  el.starTitle.textContent = `${formatMass(track.initial_mass)} M☉`;
  el.stagePill.textContent = stage.name;
  el.stageName.textContent = stage.name;
  el.stageDescription.textContent = stage.description;
  el.ageLabel.textContent = formatAge(point.age_yr);
  el.metricAge.textContent = formatAge(point.age_yr);
  el.metricTemp.textContent = `${formatNumber(Math.pow(10, point.log_Teff), 0)} K`;
  el.metricLum.textContent = `${formatNumber(Math.pow(10, point.log_L), 2)} L☉`;
  el.metricRadius.textContent = `${formatNumber(Math.pow(10, point.log_R), 2)} R☉`;
  el.metricLogG.textContent = point.log_g.toFixed(2);
  el.metricMass.textContent = `${formatNumber(point.mass, 2)} M☉`;

  document.querySelectorAll(".mass-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.slug === state.activeSlug);
  });

  drawStar();
  drawChart();
}

function updatePlayButton() {
  if (!el.playButton) return;
  el.playButton.textContent = state.playing ? "Ⅱ" : "▶";
  el.playButton.setAttribute("aria-label", state.playing ? t("pause") : t("play"));
}

function tick(now) {
  if (!state.playing) return;
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  state.progress += dt * 0.055;
  if (state.progress >= 1) state.progress = 0;
  render();
  state.raf = requestAnimationFrame(tick);
}

function resizeCanvas() {
  const rect = el.starCanvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  el.starCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
  el.starCanvas.height = Math.max(1, Math.floor(rect.height * ratio));
}

function drawStar() {
  const point = currentPoint();
  if (!point) return;
  const canvas = el.starCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const ratio = width / Math.max(1, canvas.getBoundingClientRect().width);
  const cx = width / 2;
  const cy = height / 2;
  const radiusSolar = Math.pow(10, point.log_R);
  const temp = Math.pow(10, point.log_Teff);
  const lum = Math.pow(10, point.log_L);
  const visualRadius = clamp(30 * ratio + Math.log10(radiusSolar + 1) * 78 * ratio, 22 * ratio, Math.min(width, height) * 0.37);
  const glow = clamp(visualRadius * (1.2 + Math.log10(lum + 1) * 0.22), visualRadius * 1.3, Math.min(width, height) * 0.7);
  const color = temperatureColor(temp);

  ctx.clearRect(0, 0, width, height);
  drawStarscape(ctx, width, height, point.age_yr);

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

  drawSurfaceBands(ctx, cx, cy, visualRadius, color, point);
  drawScale(ctx, width, height, radiusSolar, ratio);
}

function drawStarscape(ctx, width, height, seed) {
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

function drawSurfaceBands(ctx, cx, cy, radius, color, point) {
  const bandCount = point.stage === "main_sequence" ? 4 : 8;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.99, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < bandCount; i++) {
    const y = cy - radius + (i + 0.5) * (radius * 2 / bandCount);
    const width = Math.sqrt(Math.max(0, radius * radius - (y - cy) * (y - cy))) * 2;
    ctx.strokeStyle = withAlpha(i % 2 ? lighten(color, 0.18) : darken(color, 0.18), 0.18);
    ctx.lineWidth = radius * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx - width / 2, y);
    ctx.bezierCurveTo(cx - width * 0.2, y - radius * 0.05, cx + width * 0.2, y + radius * 0.05, cx + width / 2, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScale(ctx, width, height, radiusSolar, ratio) {
  ctx.fillStyle = "rgba(244,241,232,0.78)";
  ctx.font = `${13 * ratio}px Inter, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(`${formatNumber(radiusSolar, 2)} R☉`, 18 * ratio, height - 24 * ratio);
}

function drawChart() {
  const svg = el.hrChart;
  if (!state.tracks.length || !svg.clientWidth) return;
  const width = svg.clientWidth;
  const height = svg.clientHeight;
  const margin = { top: 24, right: 24, bottom: 56, left: 58 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const allPoints = state.tracks.flatMap((track) => track.points);
  const xMin = Math.min(...allPoints.map((p) => p.log_Teff)) - 0.04;
  const xMax = Math.max(...allPoints.map((p) => p.log_Teff)) + 0.04;
  const yMin = Math.min(...allPoints.map((p) => p.log_L)) - 0.2;
  const yMax = Math.max(...allPoints.map((p) => p.log_L)) + 0.2;
  const x = (v) => margin.left + (xMax - v) / (xMax - xMin) * innerW;
  const y = (v) => margin.top + (yMax - v) / (yMax - yMin) * innerH;
  const showAll = el.overlayToggle.checked;
  const active = activeTrack();
  const point = currentPoint(active);

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = "";
  appendChartDefs(svg);
  drawChartRegions(svg, x, y, margin, innerW, innerH, width, height);

  const xTicks = ticks(xMin, xMax, 6);
  const yTicks = ticks(yMin, yMax, 7);
  for (const tick of xTicks) {
    appendLine(svg, x(tick), margin.top, x(tick), height - margin.bottom, "grid-line");
    appendText(svg, x(tick), height - 30, tick.toFixed(2), "axis text", "middle");
  }
  for (const tick of yTicks) {
    appendLine(svg, margin.left, y(tick), width - margin.right, y(tick), "grid-line");
    appendText(svg, margin.left - 10, y(tick) + 4, tick.toFixed(1), "axis text", "end");
  }

  appendLine(svg, margin.left, height - margin.bottom, width - margin.right, height - margin.bottom, "axis");
  appendLine(svg, margin.left, margin.top, margin.left, height - margin.bottom, "axis");
  appendText(svg, margin.left + innerW / 2, height - 10, t("xAxis"), "axis-label", "middle");
  const yLabel = appendText(svg, 18, margin.top + innerH / 2, t("yAxis"), "axis-label", "middle");
  yLabel.setAttribute("transform", `rotate(-90 18 ${margin.top + innerH / 2})`);

  state.tracks.forEach((track, index) => {
    if (!showAll && track.slug !== active.slug) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", track.points.map((p, i) => `${i ? "L" : "M"}${x(p.log_Teff).toFixed(1)},${y(p.log_L).toFixed(1)}`).join(" "));
    path.setAttribute("class", `track-line${track.slug === active.slug ? " active" : ""}`);
    path.setAttribute("stroke", colors[index % colors.length]);
    svg.appendChild(path);
  });

  const activeIndex = state.tracks.findIndex((track) => track.slug === active.slug);
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("class", "current-point");
  circle.setAttribute("cx", x(point.log_Teff));
  circle.setAttribute("cy", y(point.log_L));
  circle.setAttribute("r", 7);
  circle.setAttribute("fill", colors[Math.max(0, activeIndex) % colors.length]);
  svg.appendChild(circle);
}

function appendChartDefs(svg) {
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  gradient.setAttribute("id", "mainSequenceGradient");
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("y1", "0%");
  gradient.setAttribute("x2", "100%");
  gradient.setAttribute("y2", "100%");
  [
    ["0%", "rgba(112,167,255,0.05)"],
    ["45%", "rgba(245,184,75,0.22)"],
    ["100%", "rgba(227,108,100,0.07)"]
  ].forEach(([offset, color]) => {
    const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", color);
    gradient.appendChild(stop);
  });
  defs.appendChild(gradient);
  svg.appendChild(defs);
}

function drawChartRegions(svg, x, y, margin, innerW, innerH, width, height) {
  const mainSequence = [
    [4.65, 5.2],
    [4.38, 3.25],
    [4.02, 1.25],
    [3.78, 0.2],
    [3.55, -1.05],
    [3.43, -1.85],
    [3.49, -2.25],
    [3.66, -1.35],
    [3.9, -0.05],
    [4.2, 1.65],
    [4.53, 3.7],
    [4.8, 5.55]
  ];
  const msPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  msPath.setAttribute("class", "chart-region main-sequence-region");
  msPath.setAttribute("d", mainSequence.map(([tx, ly], i) => `${i ? "L" : "M"}${x(tx).toFixed(1)},${y(ly).toFixed(1)}`).join(" ") + "Z");
  svg.appendChild(msPath);
  appendText(svg, x(3.86), y(0.55), t("mainSequenceBand"), "region-label", "middle");

  const wdX1 = x(5.05);
  const wdX2 = x(4.18);
  const wdY1 = y(-0.6);
  const wdY2 = y(-4.2);
  appendRect(svg, Math.min(wdX1, wdX2), Math.min(wdY1, wdY2), Math.abs(wdX2 - wdX1), Math.abs(wdY2 - wdY1), "chart-region white-dwarf-region", 12);
  appendText(svg, x(4.55), y(-2.35), t("whiteDwarfRegion"), "region-label", "middle");

  const compactW = Math.min(230, Math.max(150, innerW * 0.36));
  const compactH = 88;
  const compactX = margin.left + innerW - compactW - 10;
  const compactY = margin.top + 12;
  appendRect(svg, compactX, compactY, compactW, compactH, "chart-region compact-region", 10);
  appendText(svg, compactX + compactW / 2, compactY + 24, t("neutronStarRegion"), "region-label", "middle");
  appendText(svg, compactX + compactW / 2, compactY + 45, t("blackHoleRegion"), "region-label", "middle");
  appendWrappedText(svg, compactX + 12, compactY + 65, t("compactObjectHint"), compactW - 24, "region-note");
}

function appendLine(svg, x1, y1, x2, y2, className) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("class", className);
  svg.appendChild(line);
}

function appendRect(svg, x, y, width, height, className, radius = 0) {
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", Math.max(0, width));
  rect.setAttribute("height", Math.max(0, height));
  rect.setAttribute("rx", radius);
  rect.setAttribute("class", className);
  svg.appendChild(rect);
  return rect;
}

function appendText(svg, x, y, text, className, anchor) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
  node.setAttribute("x", x);
  node.setAttribute("y", y);
  node.setAttribute("class", className);
  node.setAttribute("text-anchor", anchor);
  node.textContent = text;
  svg.appendChild(node);
  return node;
}

function appendWrappedText(svg, x, y, text, maxWidth, className) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
  node.setAttribute("x", x);
  node.setAttribute("y", y);
  node.setAttribute("class", className);
  const limit = Math.max(12, Math.floor(maxWidth / 6));
  const chunks = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf(" ", limit);
    if (cut < limit * 0.45) cut = limit;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  chunks.slice(0, 2).forEach((line, index) => {
    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspan.setAttribute("x", x);
    tspan.setAttribute("dy", index === 0 ? 0 : 13);
    tspan.textContent = line;
    node.appendChild(tspan);
  });
  svg.appendChild(node);
  return node;
}

function ticks(min, max, count) {
  const step = (max - min) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

function formatAge(years) {
  const units = state.lang === "zh"
    ? [["Gyr", 1e9], ["Myr", 1e6], ["kyr", 1e3]]
    : [["Gyr", 1e9], ["Myr", 1e6], ["kyr", 1e3]];
  for (const [unit, scale] of units) {
    if (years >= scale) return `${formatNumber(years / scale, years / scale >= 10 ? 1 : 2)} ${unit}`;
  }
  return `${formatNumber(years, 0)} yr`;
}

function formatNumber(value, decimals = 1) {
  return new Intl.NumberFormat(state.lang === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0
  }).format(value);
}

function formatMass(value) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function temperatureColor(kelvin) {
  const t = clamp(kelvin / 100, 10, 400);
  let r;
  let g;
  let b;
  if (t <= 66) {
    r = 255;
    g = 99.47 * Math.log(t) - 161.12;
    b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  } else {
    r = 329.7 * Math.pow(t - 60, -0.133);
    g = 288.12 * Math.pow(t - 60, -0.0755);
    b = 255;
  }
  return `rgb(${clamp(r, 0, 255)}, ${clamp(g, 0, 255)}, ${clamp(b, 0, 255)})`;
}

function withAlpha(rgb, alpha) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).map(Number);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lighten(rgb, amount) {
  return shiftColor(rgb, amount);
}

function darken(rgb, amount) {
  return shiftColor(rgb, -amount);
}

function shiftColor(rgb, amount) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).map(Number);
  const shift = (v) => clamp(v + (amount >= 0 ? (255 - v) * amount : v * amount), 0, 255);
  return `rgb(${shift(r)}, ${shift(g)}, ${shift(b)})`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pseudoRandom(seed) {
  const x = Math.sin(seed * 0.000001 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

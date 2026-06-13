import { state, activeTrack, currentPoint, computeAxisRange, t, COLORS } from "./state.js";
import { formatAge, formatNumber, formatMass, deserializeTrack } from "./utils.js";
import { initStarCanvas, resizeCanvas, drawStar, triggerFlash } from "./star-renderer.js";
import { initHRChart, resize as resizeHR, drawStatic, drawDynamic } from "./hr-chart.js";
import { togglePlayback, setTickCallback } from "./animation.js";

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  applyLanguage();
  bindEvents();
  initStarCanvas(el.starCanvas);
  initHRChart(el.hrChartContainer);
  setTickCallback(render);

  try {
    const manifest = await fetchJson(`data/tracks/${state.metallicity}/manifest.json`);
    state.manifest = manifest;
    state.tracks = await Promise.all(
      manifest.tracks.map((item) =>
        fetchJson(`data/tracks/${state.metallicity}/${item.slug}.json`).then(deserializeTrack)
      )
    );
    state.activeSlug = state.tracks.find((t) => Math.abs(t.initial_mass - 1) < 0.01)?.slug || state.tracks[0].slug;
    computeAxisRange(state.tracks);
    buildMassButtons();
    state.overlayAll = el.overlayToggle.checked;
    drawStatic();
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
    realTimeToggle: document.getElementById("realTimeToggle"),
    massGrid: document.getElementById("massGrid"),
    hrChartContainer: document.getElementById("hrChartContainer"),
    metricAge: document.getElementById("metricAge"),
    metricTemp: document.getElementById("metricTemp"),
    metricLum: document.getElementById("metricLum"),
    metricRadius: document.getElementById("metricRadius"),
    metricLogG: document.getElementById("metricLogG"),
    metricMass: document.getElementById("metricMass"),
    fehSelect: document.getElementById("fehSelect")
  });
}

function bindEvents() {
  el.langToggle.addEventListener("click", () => {
    state.lang = state.lang === "zh" ? "en" : "zh";
    localStorage.setItem("stellar-lang", state.lang);
    applyLanguage();
    drawStatic();
    render();
  });

  el.timeSlider.addEventListener("input", () => {
    state.progress = Number(el.timeSlider.value) / 1000;
    render();
  });

  el.playButton.addEventListener("click", () => {
    togglePlayback();
    updatePlayButton();
  });

  el.overlayToggle.addEventListener("change", () => {
    state.overlayAll = el.overlayToggle.checked;
    drawStatic();
    drawDynamic();
  });

  el.realTimeToggle.addEventListener("change", () => {
    state.realTimeMode = el.realTimeToggle.checked;
  });

  el.fehSelect.addEventListener("change", async () => {
    state.metallicity = el.fehSelect.value;
    setLoading(true);
    try {
      const manifest = await fetchJson(`data/tracks/${state.metallicity}/manifest.json`);
      state.manifest = manifest;
      state.tracks = await Promise.all(
        manifest.tracks.map((item) =>
          fetchJson(`data/tracks/${state.metallicity}/${item.slug}.json`).then(deserializeTrack)
        )
      );
      state.activeSlug = state.tracks.find((t) => Math.abs(t.initial_mass - 1) < 0.01)?.slug || state.tracks[0].slug;
      state.progress = 0;
      computeAxisRange(state.tracks);
      buildMassButtons();
      drawStatic();
      render();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    resizeHR();
    drawStatic();
    render();
  });
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

function render() {
  if (!state.tracks.length) return;
  const track = activeTrack();
  const point = currentPoint(track);
  if (!point) return;

  const stageData = window.STELLAR_I18N[state.lang].stages[point.stage] || window.STELLAR_I18N[state.lang].stages.main_sequence;

  if (state.prevStage && point.stage !== state.prevStage) {
    state.stageJustChanged = true;
    el.stagePill.classList.remove("stage-pill--flash");
    void el.stagePill.offsetWidth;
    el.stagePill.classList.add("stage-pill--flash");
    triggerFlash();
  }
  state.prevStage = point.stage;

  el.timeSlider.value = Math.round(state.progress * 1000);
  el.starTitle.textContent = `${formatMass(track.initial_mass)} M☉`;
  el.stagePill.textContent = stageData.name;
  el.stageName.textContent = stageData.name;
  el.stageDescription.textContent = stageData.description;
  el.ageLabel.textContent = formatAge(point.age_yr, state.lang);
  el.metricAge.textContent = formatAge(point.age_yr, state.lang);
  el.metricTemp.textContent = `${formatNumber(Math.pow(10, point.log_Teff), 0, state.lang)} K`;
  el.metricLum.textContent = `${formatNumber(Math.pow(10, point.log_L), 2, state.lang)} L☉`;
  el.metricRadius.textContent = `${formatNumber(Math.pow(10, point.log_R), 2, state.lang)} R☉`;
  el.metricLogG.textContent = point.log_g.toFixed(2);
  el.metricMass.textContent = `${formatNumber(point.mass, 2, state.lang)} M☉`;

  document.querySelectorAll(".mass-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.slug === state.activeSlug);
  });

  drawStar(point, track.track_type);
  drawDynamic();
  updatePlayButton();
}

function buildMassButtons() {
  el.massGrid.innerHTML = "";
  state.tracks.forEach((track, index) => {
    const button = document.createElement("button");
    button.className = "mass-button";
    button.type = "button";
    button.dataset.slug = track.slug;
    button.textContent = `${formatMass(track.initial_mass)} M☉`;
    button.addEventListener("click", () => {
      state.activeSlug = track.slug;
      state.progress = Math.min(state.progress, 0.995);
      drawStatic();
      render();
    });
    el.massGrid.appendChild(button);
  });
}

function updatePlayButton() {
  if (!el.playButton) return;
  el.playButton.textContent = state.playing ? "Ⅱ" : "▶";
  el.playButton.setAttribute("aria-label", state.playing ? t("pause") : t("play"));
}

function setLoading(show) {
  el.loading.classList.toggle("hidden", !show);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

import { state, activeTrack, currentPoint, computeAxisRange, t, COLORS } from "./state.js";
import { formatAge, formatNumber, formatMass, deserializeTrack } from "./utils.js";
import { initStarCanvas, resizeCanvas, drawStar } from "./star-renderer.js";
import { initHRChart, resize as resizeHR, drawStatic, drawDynamic, resetView } from "./hr-chart.js";
import { togglePlayback, stopPlayback, setTickCallback } from "./animation.js";

const el = {};
let massButtons = [];
let loadController = null;
let loadingStatus = "loading";
let resizeFrame = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  applyLanguage();
  bindEvents();
  initStarCanvas(el.starCanvas);
  initHRChart(el.hrChartContainer);
  setTickCallback(render);
  state.overlayAll = el.overlayToggle.checked;
  await loadTracks(state.metallicity);
}

function cacheElements() {
  Object.assign(el, {
    loading: document.getElementById("loading"),
    langToggle: document.getElementById("langToggle"),
    starTitle: document.getElementById("starTitle"),
    stagePill: document.getElementById("stagePill"),
    stageName: document.getElementById("stageName"),
    stageDescription: document.getElementById("stageDescription"),
    starStage: document.getElementById("starStage"),
    starCanvas: document.getElementById("starCanvas"),
    timeSlider: document.getElementById("timeSlider"),
    ageLabel: document.getElementById("ageLabel"),
    playButton: document.getElementById("playButton"),
    overlayToggle: document.getElementById("overlayToggle"),
    realTimeToggle: document.getElementById("realTimeToggle"),
    massGrid: document.getElementById("massGrid"),
    hrChartContainer: document.getElementById("hrChartContainer"),
    resetViewButton: document.getElementById("resetViewButton"),
    metricAge: document.getElementById("metricAge"),
    metricTemp: document.getElementById("metricTemp"),
    metricLum: document.getElementById("metricLum"),
    metricRadius: document.getElementById("metricRadius"),
    metricLogG: document.getElementById("metricLogG"),
    metricMass: document.getElementById("metricMass"),
    fehSelect: document.getElementById("fehSelect"),
    dashboard: document.getElementById("dashboard")
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
    render();
  });

  el.fehSelect.addEventListener("change", () => {
    loadTracks(el.fehSelect.value, { resetProgress: true });
  });

  el.resetViewButton.addEventListener("click", resetView);
  window.addEventListener("resize", scheduleResize, { passive: true });
  const resizeObserver = new ResizeObserver(scheduleResize);
  resizeObserver.observe(el.hrChartContainer);
  resizeObserver.observe(el.starCanvas);
}

function scheduleResize() {
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null;
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
  el.langToggle.title = state.lang === "zh" ? "Switch to English" : "切换到中文";
  el.resetViewButton.title = t("resetView");
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
  updateLoadingMessage();
  updatePlayButton();
}

function render() {
  if (!state.tracks.length) return;
  const track = activeTrack();
  const point = currentPoint(track);
  if (!point) return;

  const stageData = window.STELLAR_I18N[state.lang].stages[point.stage] || window.STELLAR_I18N[state.lang].stages.main_sequence;

  if (state.prevStage && point.stage !== state.prevStage) {
    el.stagePill.classList.remove("stage-pill--flash");
    el.starStage.classList.remove("star-stage--flash");
    void el.stagePill.offsetWidth;
    el.stagePill.classList.add("stage-pill--flash");
    el.starStage.classList.add("star-stage--flash");
  }
  state.prevStage = point.stage;

  el.timeSlider.value = Math.round(state.progress * 1000);
  el.starTitle.textContent = `${formatMass(track.initial_mass)} M☉`;
  el.stagePill.textContent = stageData.name;
  el.stageName.textContent = stageData.name;
  el.stageDescription.textContent = stageData.description;
  el.ageLabel.textContent = formatAge(point.age_yr, state.lang);
  el.timeSlider.setAttribute("aria-valuetext", `${stageData.name}, ${el.ageLabel.textContent}`);
  el.metricAge.textContent = formatAge(point.age_yr, state.lang);
  el.metricTemp.textContent = `${formatNumber(Math.pow(10, point.log_Teff), 0, state.lang)} K`;
  el.metricLum.textContent = `${formatNumber(Math.pow(10, point.log_L), 2, state.lang)} L☉`;
  el.metricRadius.textContent = `${formatNumber(Math.pow(10, point.log_R), 2, state.lang)} R☉`;
  el.metricLogG.textContent = point.log_g.toFixed(2);
  el.metricMass.textContent = `${formatNumber(point.mass, 2, state.lang)} M☉`;

  massButtons.forEach((button) => {
    const active = button.dataset.slug === state.activeSlug;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  drawStar(point, {
    trackType: track.track_type,
    isTerminal: state.progress >= 0.9995,
    lang: state.lang,
    collapseLabel: t("coreCollapseHint")
  });
  drawDynamic();
  updatePlayButton();
}

function buildMassButtons() {
  el.massGrid.innerHTML = "";
  massButtons = [];
  state.tracks.forEach((track, index) => {
    const button = document.createElement("button");
    button.className = "mass-button";
    button.type = "button";
    button.dataset.slug = track.slug;
    button.style.setProperty("--track-color", COLORS[index % COLORS.length]);
    const swatch = document.createElement("span");
    swatch.className = "mass-swatch";
    swatch.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = `${formatMass(track.initial_mass)} M☉`;
    button.append(swatch, label);
    button.addEventListener("click", () => {
      state.activeSlug = track.slug;
      state.prevStage = null;
      drawStatic();
      render();
    });
    el.massGrid.appendChild(button);
    massButtons.push(button);
  });
}

function updatePlayButton() {
  if (!el.playButton) return;
  el.playButton.textContent = state.playing ? "Ⅱ" : "▶";
  el.playButton.setAttribute("aria-label", state.playing ? t("pause") : t("play"));
}

async function loadTracks(metallicity, { resetProgress = false } = {}) {
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  stopPlayback();
  updatePlayButton();
  setLoading("loading");
  setInteractiveDisabled(true);

  try {
    const baseUrl = `data/tracks/${metallicity}`;
    const manifest = await fetchJson(`${baseUrl}/manifest.json`, controller.signal);
    if (!Array.isArray(manifest.tracks) || manifest.tracks.length === 0) {
      throw new Error(`${baseUrl}/manifest.json: no tracks`);
    }
    const tracks = await Promise.all(
      manifest.tracks.map((item) =>
        fetchJson(`${baseUrl}/${item.slug}.json`, controller.signal).then(deserializeTrack)
      )
    );
    if (controller.signal.aborted) return;

    state.metallicity = metallicity;
    state.manifest = manifest;
    state.tracks = tracks;
    state.activeSlug = tracks.find((track) => Math.abs(track.initial_mass - 1) < 0.01)?.slug || tracks[0].slug;
    if (resetProgress) state.progress = 0;
    state.prevStage = null;
    computeAxisRange(tracks);
    buildMassButtons();
    resetView();
    render();
    setLoading("hidden");
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    el.fehSelect.value = state.metallicity;
    setLoading("error");
  } finally {
    if (loadController === controller) {
      loadController = null;
      setInteractiveDisabled(false);
    }
  }
}

function setInteractiveDisabled(disabled) {
  el.playButton.disabled = disabled;
  el.timeSlider.disabled = disabled;
  massButtons.forEach((button) => { button.disabled = disabled; });
  el.dashboard?.setAttribute("aria-busy", String(disabled));
}

function setLoading(status) {
  loadingStatus = status;
  el.loading.classList.toggle("hidden", status === "hidden");
  el.loading.classList.toggle("loading--error", status === "error");
  updateLoadingMessage();
}

function updateLoadingMessage() {
  if (!el.loading) return;
  el.loading.textContent = t(loadingStatus === "error" ? "loadError" : "loading");
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

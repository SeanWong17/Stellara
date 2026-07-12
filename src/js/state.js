import { clamp, interpolatePoint, interpolateByAge } from "./utils.js";

export const COLORS = ["#f5b84b", "#77c7b8", "#e36c64", "#a6a1ff", "#8fd16f", "#f08bc3", "#70a7ff"];
const storedLanguage = localStorage.getItem("stellar-lang");

export const state = {
  lang: storedLanguage === "en" ? "en" : "zh",
  manifest: null,
  tracks: [],
  activeSlug: null,
  progress: 0,
  playing: false,
  lastFrame: 0,
  raf: null,
  realTimeMode: false,
  metallicity: "feh_p000",
  overlayAll: true,
  prevStage: null,
  axisRange: null,
  viewTransform: { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 }
};

export function activeTrack() {
  return state.tracks.find((t) => t.slug === state.activeSlug) || state.tracks[0];
}

export function currentPoint(track = activeTrack()) {
  const points = track?.points;
  if (!points?.length) return null;
  if (state.realTimeMode) {
    const minAge = track.minAge || points[0].age_yr;
    const maxAge = track.maxAge || points[points.length - 1].age_yr;
    const targetAge = minAge + state.progress * (maxAge - minAge);
    return interpolateByAge(points, targetAge);
  }
  const exact = state.progress * (points.length - 1);
  const left = Math.floor(exact);
  const right = Math.min(points.length - 1, left + 1);
  const mix = exact - left;
  return interpolatePoint(points[left], points[right], mix);
}

export function computeAxisRange(tracks) {
  const allPoints = tracks.flatMap((t) => t.points);
  if (allPoints.length === 0) throw new Error("Cannot compute an axis range without track points");
  state.axisRange = {
    xMin: Math.min(3.42, Math.min(...allPoints.map((p) => p.log_Teff)) - 0.03),
    xMax: Math.max(4.78, Math.max(...allPoints.map((p) => p.log_Teff)) + 0.03),
    yMin: Math.min(-4.2, Math.min(...allPoints.map((p) => p.log_L)) - 0.2),
    yMax: Math.max(6.2, Math.max(...allPoints.map((p) => p.log_L)) + 0.2)
  };
}

export function t(key) {
  return key.split(".").reduce((obj, part) => obj?.[part], window.STELLAR_I18N[state.lang]) || key;
}

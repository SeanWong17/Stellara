export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pseudoRandom(seed) {
  const x = Math.sin(seed * 0.000001 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function temperatureColor(kelvin) {
  const t = clamp(kelvin / 100, 10, 400);
  let r, g, b;
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

export function withAlpha(rgb, alpha) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).map(Number);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lighten(rgb, amount) {
  return shiftColor(rgb, amount);
}

export function darken(rgb, amount) {
  return shiftColor(rgb, -amount);
}

function shiftColor(rgb, amount) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).map(Number);
  const shift = (v) => clamp(v + (amount >= 0 ? (255 - v) * amount : v * amount), 0, 255);
  return `rgb(${shift(r)}, ${shift(g)}, ${shift(b)})`;
}

export function interpolatePoint(a, b, mix) {
  const out = { stage: mix < 0.5 ? a.stage : b.stage, mist_phase: mix < 0.5 ? a.mist_phase : b.mist_phase };
  for (const key of ["eep", "age_yr", "mass", "log_L", "log_Teff", "log_R", "log_g", "center_h1", "center_he4"]) {
    out[key] = a[key] + (b[key] - a[key]) * mix;
  }
  return out;
}

export function interpolateByAge(points, targetAge) {
  let lo = 0, hi = points.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].age_yr <= targetAge) lo = mid; else hi = mid;
  }
  const span = points[hi].age_yr - points[lo].age_yr;
  const mix = span > 0 ? (targetAge - points[lo].age_yr) / span : 0;
  return interpolatePoint(points[lo], points[hi], clamp(mix, 0, 1));
}

export function formatAge(years, lang) {
  const units = [["Gyr", 1e9], ["Myr", 1e6], ["kyr", 1e3]];
  for (const [unit, scale] of units) {
    if (years >= scale) return `${formatNumber(years / scale, years / scale >= 10 ? 1 : 2, lang)} ${unit}`;
  }
  return `${formatNumber(years, 0, lang)} yr`;
}

export function formatNumber(value, decimals = 1, lang = "zh") {
  return new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0
  }).format(value);
}

export function formatMass(value) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

export function formatTemperatureTick(temp) {
  if (temp >= 10000) return `${Math.round(temp / 1000)}k`;
  return String(temp);
}

export function deserializeTrack(raw) {
  if (raw.points) return raw;
  const { columns, data, ...meta } = raw;
  const points = data.map((row) => {
    const point = {};
    for (let i = 0; i < columns.length; i++) point[columns[i]] = row[i];
    return point;
  });
  const track = { ...meta, points };
  track.minAge = points[0].age_yr;
  track.maxAge = points[points.length - 1].age_yr;
  return track;
}

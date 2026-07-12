import { state, activeTrack } from "./state.js";

let onTick = null;

export function setTickCallback(fn) {
  onTick = fn;
}

export function startPlayback() {
  if (!activeTrack()) return;
  if (state.progress >= 1) state.progress = 0;
  state.playing = true;
  state.lastFrame = performance.now();
  tick(state.lastFrame);
}

export function stopPlayback() {
  state.playing = false;
  if (state.raf) {
    cancelAnimationFrame(state.raf);
    state.raf = null;
  }
}

export function togglePlayback() {
  if (state.playing) stopPlayback();
  else startPlayback();
}

function tick(now) {
  if (!state.playing) return;
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;

  if (state.realTimeMode) {
    const track = activeTrack();
    if (track) {
      const maxAge = track.maxAge || track.points[track.points.length - 1].age_yr;
      const minAge = track.minAge || track.points[0].age_yr;
      const range = maxAge - minAge;
      const currentAge = minAge + state.progress * range;
      const newAge = currentAge + dt * range * 0.055;
      if (newAge >= maxAge) {
        state.progress = 1;
        state.playing = false;
      } else {
        state.progress = (newAge - minAge) / range;
      }
    }
  } else {
    state.progress += dt * 0.055;
    if (state.progress >= 1) {
      state.progress = 1;
      state.playing = false;
    }
  }

  if (onTick) onTick();
  if (!state.playing) return;
  state.raf = requestAnimationFrame(tick);
}

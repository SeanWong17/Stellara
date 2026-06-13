<div align="center">
  <h1>Stellara</h1>
  <h3>Interactive Stellar Evolution Visualizer · From Main Sequence to Final Fate</h3>

  <p>
    <a href="README.md">中文</a> | English
  </p>

<p>
  <b>From the first spark of hydrogen fusion to the fading glow of a white dwarf or the fury of a supernova.</b><br>
  Billions of years of stellar destiny, unfolding on the HR diagram.
</p>

<h3>
  <a href="https://seanwong17.github.io/Stellara/">Live Demo</a>
</h3>

<p>
    <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/MIST-v2.5-orange?style=flat-square" alt="MIST">
    <img src="https://img.shields.io/badge/Vanilla_JS-ES_Modules-yellow?style=flat-square&logo=javascript" alt="JS">
    <img src="https://img.shields.io/badge/Canvas_2D-HR_Diagram-green?style=flat-square" alt="Canvas">
</p>
</div>

---

## Overview

**Stellara** is a browser-based interactive visualization of stellar evolution. Built on MIST v2.5 (MESA Isochrones and Stellar Tracks) precomputed data, it renders the complete life cycle of stars across different initial masses and metallicities on the Hertzsprung-Russell diagram.

Unlike static textbook illustrations, Stellara lets you:
- Watch a solar-mass star spend 90% of its life on the main sequence
- Compare the vastly different fates of a 0.5 M☉ red dwarf and a 40 M☉ blue giant
- See how metallicity shapes a star's temperature, luminosity, and lifespan

## Features

### HR Diagram
- **Dual-layer Canvas 2D** — static layer for axes/tracks, dynamic layer for the moving point
- **Spectral classification bands** — O / B / A / F / G / K / M types
- **End-state markers** — diamonds (white dwarf), starbursts (core collapse), dashed collapse line
- **Touch interaction** — tap for tooltip, pinch-to-zoom

### Stellar Lifecycle
- **Animated playback** — from pre-main-sequence to white dwarf or core collapse
- **Physical time mode** — slider maps to real stellar age, revealing time-scale contrasts
- **Stage detection** — PMS, main sequence, subgiant/RGB, helium burning, TP-AGB, Wolf-Rayet, etc.
- **Transition feedback** — UI pulse + canvas flash on phase change

### Star Visualization
- **Real-time rendering** — color, radius, and glow respond to temperature and luminosity
- **Surface texture** — convection bands evolve with stellar phase
- **End-state rendering** — white dwarf (compact blue-white) / supernova shell expansion

### Data & Science
- **Three metallicities** — [Fe/H] = 0.00, −1.00, +0.25
- **Seven mass tracks** — 0.5, 1, 2, 5, 10, 20, 40 M☉
- **Wolf-Rayet identification** — triggered when mass loss exceeds 40% at high temperature

### Technical
- **Zero build dependencies** — vanilla ES Modules, no bundler
- **Bilingual** — Chinese / English toggle
- **Responsive** — desktop and mobile
- **Columnar JSON** — ~50% smaller than row-based format

## Quick Start

```bash
git clone https://github.com/SeanWong17/Stellara.git
cd Stellara
python3 -m http.server 8000
```

Open http://localhost:8000

## Data Regeneration

```bash
python3 scripts/build_mist_subset.py --feh 0.00 --download
python3 scripts/build_mist_subset.py --feh "-1.00" --download
python3 scripts/build_mist_subset.py --feh "+0.25" --download
```

Supports all MIST metallicities ([Fe/H] from −4.00 to +0.50).

## Scientific Scope

| Included | Not Included |
|---|---|
| Single-star PMS through terminal stages | Binary interactions |
| Low-mass → white dwarf cooling | Magnetic fields |
| High-mass → carbon burning (model endpoint) | Actual supernova light curves |
| Wolf-Rayet phase identification | Arbitrary rotation |
| Schematic collapse line on HR diagram | Live MESA computation |

## References

- Choi, J. et al. (2016). *MESA Isochrones and Stellar Tracks (MIST). I.* ApJ, 823, 102
- Paxton, B. et al. (2011). *Modules for Experiments in Stellar Astrophysics (MESA).* ApJS, 192, 3
- Dotter, A. (2016). *MESA Isochrones and Stellar Tracks (MIST). 0.* ApJS, 222, 8

## License

Code is released under the [MIT License](LICENSE). MIST data usage must follow the MIST project's citation requirements.

---

<div align="center">
  <sub>Designed with ❤️ by Sean Wong</sub>
</div>

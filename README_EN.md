# Stellar Evolution Paths

A static public-facing web visualization of how single-star evolutionary paths change with initial mass, powered by precomputed MIST v2.5 tracks.

## Features

- Lifecycle player with play, pause, and age scrubbing.
- Synchronized HR diagram with hotter temperatures on the left.
- Seven built-in solar-metallicity tracks: `0.5, 1, 2, 5, 10, 20, 40 M☉`.
- Canvas star rendering driven by track temperature, radius, and luminosity.
- Chinese and English UI.
- No build step, suitable for GitHub Pages or Cloudflare Pages.

## Run Locally

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Opening `index.html` directly is not recommended because browsers usually block `fetch()` access to local JSON files.

## Data

The current subset comes from MIST v2.5 EEP tracks:

- `[Fe/H]=0.00`
- `[a/Fe]=0.00`
- `v/vcrit=0.00`
- Official site: <https://mist.science/>

Regenerate the subset:

```bash
python3 scripts/build_mist_subset.py --download --output data
```

Or use a local official archive:

```bash
python3 scripts/build_mist_subset.py \
  --archive /path/to/MIST_v2.5_feh_p000_afe_p0_vvcrit0.0_EEPS.txz \
  --output data
```

See [docs/data-notes.md](docs/data-notes.md).

## Scientific Scope

This is an explanatory visualization, not a live stellar-structure solver. The first version does not model binaries, magnetic fields, arbitrary metallicity controls, rotation controls, or live MESA runs.

## License

Code is MIT licensed. MIST data remains subject to the MIST project's citation and usage expectations; cite the MIST papers and official site when publishing or reusing the data.

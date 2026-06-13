# Data Notes

## Source

Precomputed tracks from the official MIST v2.5 EEP track archives:

- Dataset: MIST v2.5 EEP tracks
- Official site: <https://mist.science/>
- Extraction script: [scripts/build_mist_subset.py](../scripts/build_mist_subset.py)

### Included metallicities

| [Fe/H] | Archive | Internal directory |
|---|---|---|
| 0.00 (solar) | `MIST_v2.5_feh_p000_afe_p0_vvcrit0.0_EEPS.txz` | `feh_p000_afe_p0_vvcrit0.0/` |
| −1.00 | `MIST_v2.5_feh_m100_afe_p0_vvcrit0.0_EEPS.txz` | `feh_m100_afe_p0_vvcrit0.0/` |
| +0.25 | `MIST_v2.5_feh_p025_afe_p0_vvcrit0.0_EEPS.txz` | `feh_p025_afe_p0_vvcrit0.0/` |

All use `[a/Fe]=0.00` and `v/vcrit=0.00` (no rotation).

## Data Format

Track files use **columnar JSON** for compact delivery:

```json
{
  "initial_mass": 1.0,
  "track_type": "low-mass",
  "columns": ["eep", "age_yr", "mass", "log_L", "log_Teff", "log_R", "log_g", "center_h1", "center_he4", "mist_phase", "stage"],
  "data": [[1, 182593, 0.999, ...], ...]
}
```

The frontend deserializes this back to row objects at load time.

## Stage Labels

Stages are derived from MIST primary EEP marker positions:

**Low-mass tracks** (≤5 M☉):
- Pre-main sequence → Main sequence → Subgiant/Red giant → RGB tip → Core He burning → TP-AGB → Post-AGB → White dwarf

**High-mass tracks** (≥10 M☉):
- Pre-main sequence → Main sequence → Post-main sequence → Red supergiant → Core He burning → Carbon burning

**Wolf-Rayet detection** (high-mass only):
- Triggered when current mass < 60% of initial mass AND log_Teff > 4.0
- Represents stars whose strong stellar winds have stripped the hydrogen envelope

## Masses

Each metallicity dataset includes:

```
0.5, 1, 2, 5, 10, 20, 40 M☉
```

Tracks are downsampled to ~360 points while preserving primary EEP markers.

## Limitations

- Single-star models only (no binaries, mergers, or mass transfer)
- High-mass tracks terminate at carbon burning — the iron-core collapse and supernova are not modeled
- The "collapse line" shown on the HR diagram is a schematic extrapolation, not computed data
- Wolf-Rayet identification uses a simplified mass-loss + temperature criterion, not detailed spectral classification
- No rotation effects (v/vcrit = 0)

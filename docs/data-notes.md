# Data Notes

## Source

The bundled tracks are a compact subset of the official MIST v2.5 EEP track archive:

- Dataset: MIST v2.5 EEP tracks
- Composition: `[Fe/H]=0.00`, `[a/Fe]=0.00`
- Rotation: `v/vcrit=0.00`
- Official site: <https://mist.science/>
- Archive used by default: `MIST_v2.5_feh_p000_afe_p0_vvcrit0.0_EEPS.txz`

The extraction script is [scripts/build_mist_subset.py](../scripts/build_mist_subset.py).

## Included Masses

The current browser dataset includes representative initial masses:

```text
0.5, 1, 2, 5, 10, 20, 40 M_sun
```

Each track is downsampled for browser delivery while preserving the primary EEP markers. The generated files keep these fields:

- `age_yr`
- `mass`
- `log_L`
- `log_Teff`
- `log_R`
- `log_g`
- `center_h1`
- `center_he4`
- `mist_phase`
- `stage`

## Stage Labels

The app labels stages from the MIST primary EEP sequence described in the MIST paper:

- PMS
- ZAMS
- IAMS
- TAMS
- RGBTip
- ZACHeB
- TACHeB
- TP-AGB / post-AGB / WDCS for low-mass tracks
- carbon burning for high-mass tracks

The raw `mist_phase` value is preserved in the JSON, but the public-facing copy uses the EEP-derived `stage` field so the interface does not over-interpret internal numeric phase codes.

## Limitations

This is a single-star model visualization. It does not include binary mass transfer, mergers, magnetic fields, arbitrary abundance patterns, or live MESA calculations. High-mass endpoint copy should be read as "near pre-collapse model evolution", not a simulated supernova.

#!/usr/bin/env python3
"""Build compact browser-ready subsets from MIST v2.5 EEP tracks.

Supports multiple metallicities and outputs columnar JSON for smaller file size.
The script uses only Python's standard library.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import tarfile
import urllib.request
from pathlib import Path


BASE_URL = "https://mist.science/data/tarballs_v2.5/eeps/"
DEFAULT_MASSES = [0.5, 1, 2, 5, 10, 20, 40]
KEEP_COLUMNS = [
    "star_age",
    "star_mass",
    "log_L",
    "log_Teff",
    "log_R",
    "log_g",
    "center_h1",
    "center_he4",
    "phase",
]

FEH_CONFIGS = {
    "0.00": {"slug": "feh_p000", "url_part": "feh_p000", "dir_part": "feh_p000_afe_p0_vvcrit0.0"},
    "-1.00": {"slug": "feh_m100", "url_part": "feh_m100", "dir_part": "feh_m100_afe_p0_vvcrit0.0"},
    "+0.25": {"slug": "feh_p025", "url_part": "feh_p025", "dir_part": "feh_p025_afe_p0_vvcrit0.0"},
    "+0.50": {"slug": "feh_p050", "url_part": "feh_p050", "dir_part": "feh_p050_afe_p0_vvcrit0.0"},
}


def feh_to_config(feh_str: str) -> dict:
    normalized = feh_str.lstrip("+")
    if normalized.startswith("-"):
        key = normalized
    else:
        key = f"+{normalized}" if not normalized.startswith("0") else normalized
    for k, v in FEH_CONFIGS.items():
        if k == feh_str or k.lstrip("+") == normalized or k == key:
            return v
    sign = "m" if float(feh_str) < 0 else "p"
    val = f"{abs(float(feh_str)):.2f}".replace(".", "")
    slug = f"feh_{sign}{val}"
    return {"slug": slug, "url_part": slug, "dir_part": f"{slug}_afe_p0_vvcrit0.0"}


def archive_url(config: dict) -> str:
    return f"{BASE_URL}MIST_v2.5_{config['url_part']}_afe_p0_vvcrit0.0_EEPS.txz"


def mass_to_file(mass: float, config: dict) -> str:
    return f"{config['dir_part']}/eeps/{int(round(mass * 100)):05d}M.track.eep"


def download_archive(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {url} -> {path}")
    with urllib.request.urlopen(url) as response, path.open("wb") as fh:
        total = int(response.headers.get("Content-Length") or 0)
        seen = 0
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            fh.write(chunk)
            seen += len(chunk)
            if total:
                pct = seen / total * 100
                print(f"\r{pct:5.1f}%", end="", flush=True)
    if total:
        print()


def parse_metadata(lines: list[str]) -> tuple[float, int, int, str, list[int], list[str], int]:
    initial_mass = None
    n_pts = None
    n_eep = None
    track_type = "unknown"
    primary_eeps: list[int] = []
    columns: list[str] = []
    data_start = -1

    for i, raw in enumerate(lines):
        line = raw.strip()
        if line.startswith("#") and "initial_mass" in line and "N_pts" in line:
            values = lines[i + 1].replace("#", "").split()
            initial_mass = float(values[0])
            n_pts = int(values[1])
            n_eep = int(values[2])
            track_type = values[-1]
        elif line.startswith("# EEPs:"):
            primary_eeps = [int(x) for x in re.findall(r"\d+", line)]
        elif line.startswith("#") and "star_age" in line and "log_Teff" in line:
            columns = line[1:].split()
            data_start = i + 1
            break

    if initial_mass is None or n_pts is None or n_eep is None or not primary_eeps or not columns:
        raise ValueError("Could not parse MIST metadata/header")

    return initial_mass, n_pts, n_eep, track_type, primary_eeps, columns, data_start


def stage_for_eep(eep: int, primary_eeps: list[int], track_type: str, mass: float = 0, initial_mass: float = 0, log_teff: float = 0) -> str:
    low_mass_labels = [
        "pms", "main_sequence", "main_sequence", "subgiant_red_giant",
        "red_giant_tip", "core_helium_burning", "core_helium_burning",
        "tp_agb", "post_agb", "white_dwarf",
    ]
    high_mass_labels = [
        "pms", "main_sequence", "main_sequence", "post_main_sequence",
        "red_supergiant", "core_helium_burning", "core_helium_burning",
        "carbon_burning",
    ]
    labels = high_mass_labels if track_type == "high-mass" else low_mass_labels
    segment = 0
    for idx, marker in enumerate(primary_eeps):
        if eep >= marker:
            segment = idx
    base_stage = labels[min(segment, len(labels) - 1)]

    if track_type == "high-mass" and base_stage in ("core_helium_burning", "carbon_burning"):
        if initial_mass > 0 and mass < initial_mass * 0.6 and log_teff > 4.0:
            return "wolf_rayet"

    return base_stage


def parse_track(text: str, target_points: int) -> dict:
    lines = text.splitlines()
    initial_mass, n_pts, n_eep, track_type, primary_eeps, columns, data_start = parse_metadata(lines)
    col_index = {name: columns.index(name) for name in KEEP_COLUMNS if name in columns}
    missing = sorted(set(KEEP_COLUMNS) - set(col_index))
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    raw_points = []
    for raw in lines[data_start:]:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        parts = raw.split()
        if len(parts) < len(columns):
            continue
        eep = len(raw_points) + 1
        cur_mass = finite_float(parts[col_index["star_mass"]])
        cur_log_teff = finite_float(parts[col_index["log_Teff"]])
        point = [
            eep,
            finite_float(parts[col_index["star_age"]]),
            cur_mass,
            finite_float(parts[col_index["log_L"]]),
            cur_log_teff,
            finite_float(parts[col_index["log_R"]]),
            finite_float(parts[col_index["log_g"]]),
            finite_float(parts[col_index["center_h1"]]),
            finite_float(parts[col_index["center_he4"]]),
            int(float(parts[col_index["phase"]])),
            stage_for_eep(eep, primary_eeps, track_type, cur_mass, initial_mass, cur_log_teff),
        ]
        raw_points.append(point)

    if len(raw_points) != n_pts:
        print(f"Warning: expected {n_pts} points, parsed {len(raw_points)}")

    keep_indices = downsample_indices(len(raw_points), target_points)
    marker_indices = {max(0, min(len(raw_points) - 1, eep - 1)) for eep in primary_eeps}
    keep_indices = sorted(set(keep_indices) | marker_indices)
    points = [raw_points[i] for i in keep_indices]

    return {
        "initial_mass": round(initial_mass, 4),
        "track_type": track_type,
        "n_eep": n_eep,
        "primary_eeps": primary_eeps,
        "columns": ["eep", "age_yr", "mass", "log_L", "log_Teff", "log_R", "log_g", "center_h1", "center_he4", "mist_phase", "stage"],
        "data": points,
    }


def finite_float(value: str) -> float:
    out = float(value)
    if not math.isfinite(out):
        raise ValueError(f"Non-finite value: {value}")
    return round(out, 6)


def downsample_indices(length: int, target_points: int) -> list[int]:
    if length <= target_points:
        return list(range(length))
    if target_points < 2:
        return [0, length - 1]
    return sorted({round(i * (length - 1) / (target_points - 1)) for i in range(target_points)})


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--feh", default="0.00", help="Metallicity [Fe/H] value, e.g. 0.00, -1.00, +0.30")
    parser.add_argument("--archive", type=Path, default=None, help="Path to local .txz archive (auto-determined if omitted)")
    parser.add_argument("--download", action="store_true", help="Download archive if missing")
    parser.add_argument("--output", type=Path, default=Path("data"))
    parser.add_argument("--points", type=int, default=360)
    parser.add_argument("--masses", nargs="*", type=float, default=DEFAULT_MASSES)
    args = parser.parse_args()

    config = feh_to_config(args.feh)
    url = archive_url(config)
    archive_path = args.archive or Path(f"/tmp/MIST_v2.5_{config['url_part']}_afe_p0_vvcrit0.0_EEPS.txz")

    if not archive_path.exists():
        if not args.download:
            raise SystemExit(f"Archive not found: {archive_path}. Pass --download to fetch it.")
        download_archive(url, archive_path)

    tracks = []
    out_dir = args.output / "tracks" / config["slug"]
    with tarfile.open(archive_path, mode="r:xz") as tar:
        members = {member.name: member for member in tar.getmembers()}
        for mass in args.masses:
            member_name = mass_to_file(mass, config)
            member = members.get(member_name)
            if member is None:
                raise SystemExit(f"Track not found in archive: {member_name}")
            extracted = tar.extractfile(member)
            if extracted is None:
                raise SystemExit(f"Could not read track: {member_name}")
            track = parse_track(extracted.read().decode("utf-8"), args.points)
            slug = f"{int(round(mass * 100)):05d}M"
            track["slug"] = slug
            track["source_file"] = member_name
            write_json(out_dir / f"{slug}.json", track)
            tracks.append({
                "slug": slug,
                "initial_mass": track["initial_mass"],
                "track_type": track["track_type"],
                "points": len(track["data"]),
                "source_file": member_name,
            })

    manifest = {
        "schema_version": 2,
        "dataset": "MIST v2.5 EEP tracks",
        "metallicity": f"[Fe/H]={args.feh}",
        "rotation": "v/vcrit=0.00",
        "source_url": url,
        "generated_from": str(archive_path),
        "tracks": tracks,
    }
    write_json(out_dir / "manifest.json", manifest)
    print(f"Wrote {len(tracks)} tracks to {out_dir}")


if __name__ == "__main__":
    main()

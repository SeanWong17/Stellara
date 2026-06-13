#!/usr/bin/env python3
"""Build a compact browser-ready subset from MIST v2.5 EEP tracks.

The script uses only Python's standard library. It can either read a local
MIST .txz archive or download the default solar-metallicity, non-rotating EEP
archive from the official MIST site.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import tarfile
import urllib.request
from pathlib import Path


DEFAULT_URL = (
    "https://mist.science/data/tarballs_v2.5/eeps/"
    "MIST_v2.5_feh_p000_afe_p0_vvcrit0.0_EEPS.txz"
)
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


def mass_to_file(mass: float) -> str:
    return f"feh_p000_afe_p0_vvcrit0.0/eeps/{int(round(mass * 100)):05d}M.track.eep"


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


def stage_for_eep(eep: int, primary_eeps: list[int], track_type: str) -> str:
    low_mass_labels = [
        "pms",
        "main_sequence",
        "main_sequence",
        "subgiant_red_giant",
        "red_giant_tip",
        "core_helium_burning",
        "core_helium_burning",
        "tp_agb",
        "post_agb",
        "white_dwarf",
    ]
    high_mass_labels = [
        "pms",
        "main_sequence",
        "main_sequence",
        "post_main_sequence",
        "red_supergiant",
        "core_helium_burning",
        "core_helium_burning",
        "carbon_burning",
    ]
    labels = high_mass_labels if track_type == "high-mass" else low_mass_labels

    segment = 0
    for idx, marker in enumerate(primary_eeps):
        if eep >= marker:
            segment = idx
    return labels[min(segment, len(labels) - 1)]


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
        point = {
            "eep": eep,
            "age_yr": finite_float(parts[col_index["star_age"]]),
            "mass": finite_float(parts[col_index["star_mass"]]),
            "log_L": finite_float(parts[col_index["log_L"]]),
            "log_Teff": finite_float(parts[col_index["log_Teff"]]),
            "log_R": finite_float(parts[col_index["log_R"]]),
            "log_g": finite_float(parts[col_index["log_g"]]),
            "center_h1": finite_float(parts[col_index["center_h1"]]),
            "center_he4": finite_float(parts[col_index["center_he4"]]),
            "mist_phase": int(float(parts[col_index["phase"]])),
            "stage": stage_for_eep(eep, primary_eeps, track_type),
        }
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
        "points": points,
    }


def finite_float(value: str) -> float:
    out = float(value)
    if not math.isfinite(out):
        raise ValueError(f"Non-finite value: {value}")
    return out


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
    parser.add_argument("--archive", type=Path, default=Path("/tmp/MIST_v2.5_feh_p000_afe_p0_vvcrit0.0_EEPS.txz"))
    parser.add_argument("--download", action="store_true", help="Download the default archive if --archive is missing")
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--output", type=Path, default=Path("data"))
    parser.add_argument("--points", type=int, default=360)
    parser.add_argument("--masses", nargs="*", type=float, default=DEFAULT_MASSES)
    args = parser.parse_args()

    if not args.archive.exists():
        if not args.download:
            raise SystemExit(f"Archive not found: {args.archive}. Pass --download to fetch it.")
        download_archive(args.url, args.archive)

    tracks = []
    with tarfile.open(args.archive, mode="r:xz") as tar:
        members = {member.name: member for member in tar.getmembers()}
        for mass in args.masses:
            member_name = mass_to_file(mass)
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
            write_json(args.output / "tracks" / f"{slug}.json", track)
            tracks.append(
                {
                    "slug": slug,
                    "initial_mass": track["initial_mass"],
                    "track_type": track["track_type"],
                    "points": len(track["points"]),
                    "source_file": member_name,
                }
            )

    manifest = {
        "schema_version": 1,
        "dataset": "MIST v2.5 EEP tracks",
        "metallicity": "[Fe/H]=0.00, [a/Fe]=0.00",
        "rotation": "v/vcrit=0.00",
        "source_url": args.url,
        "generated_from": str(args.archive),
        "tracks": tracks,
    }
    write_json(args.output / "tracks_manifest.json", manifest)
    print(f"Wrote {len(tracks)} tracks to {args.output}")


if __name__ == "__main__":
    main()

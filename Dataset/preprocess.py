#!/usr/bin/env python3
"""
OECD Better Life Index ↦ tidy CSV for the D3 map.

Default behaviour
-----------------
• Keeps only 2006–2023 (complete enough years).
• Leaves genuine gaps as NaN so the map shows them in grey.
  ↳ pass --interpolate to fill those gaps.

Usage examples
--------------
$ python preprocess.py                       # strict, no interpolation
$ python preprocess.py --interpolate         # fill gaps
$ python preprocess.py --year-min 2010 --year-max 2022 --all
"""

from __future__ import annotations
import argparse, sys
from pathlib import Path

import numpy as np
import pandas as pd

# Indicators where a *higher* raw value is *worse* (reverse-coded)
NEGATIVE_MEASURES = {
    # Safety
    "Homicides",
    "Not feeling safe at night",
    # Health
    "Deaths from suicide, alcohol, drugs",
    # Income / jobs
    "Long-term unemployment rate",
    "Youth not in employment, education or training",
    "Labour market insecurity",
    "Gender wage gap",
    # Work–life balance
    "Long hours in paid work",
    # Housing
    "Households living in overcrowded conditions",
    # Environment
    "Exposure to extreme temperature",
    "Road deaths",
    # Social connections
    "Feeling lonely",
    "Lack of social support",
    # Subjective well-being
    "Life satisfaction score less than 5",
    "Negative affect balance",
    "Feelings of physical pain",
    "Satisfaction with personal relationships score less than 5",
    # Knowledge & skills
    "Students with low skills in reading, mathematics and science",
    "Adults with low numeracy skills",
    # Civic engagement
    "Not having a say in government",
}

# Same 38 countries that script.js colours
TARGET_COUNTRIES = {
    "Australia",
    "Austria",
    "Belgium",
    "Canada",
    "Chile",
    "Colombia",
    "Costa Rica",
    "Czechia",
    "Denmark",
    "Estonia",
    "Finland",
    "France",
    "Germany",
    "Greece",
    "Hungary",
    "Iceland",
    "Ireland",
    "Israel",
    "Italy",
    "Japan",
    "Korea",
    "Latvia",
    "Lithuania",
    "Luxembourg",
    "Mexico",
    "Netherlands",
    "New Zealand",
    "Norway",
    "Poland",
    "Portugal",
    "Slovak Republic",
    "Slovenia",
    "Spain",
    "Sweden",
    "Switzerland",
    "Türkiye",
    "United Kingdom",
    "United States",
}


# ──────────────────────────────────────────────────────────────────────────────
def _normalise(group: pd.DataFrame) -> pd.Series:
    v = group["OBS_VALUE"].astype(float)
    lo, hi = v.min(), v.max()
    if np.isclose(lo, hi):
        return pd.Series(0.5, index=group.index, dtype=float)
    scaled = (v - lo) / (hi - lo)
    if group["Measure"].iat[0] in NEGATIVE_MEASURES:
        scaled = 1 - scaled
    return scaled


def _interpolate(df: pd.DataFrame, years: list[int]) -> pd.DataFrame:
    """
    Linear interpolation *inside* the observed window.
    No extrapolation past first / last real point.
    """
    full_grid = (
        df[["Reference area", "Domain"]]
        .drop_duplicates()
        .assign(dummy=1)
        .merge(pd.DataFrame({"TIME_PERIOD": years, "dummy": 1}), on="dummy")
        .drop(columns="dummy")
    )
    merged = full_grid.merge(df, how="left")
    merged["mean_normalized_measure"] = merged.groupby(["Reference area", "Domain"])[
        "mean_normalized_measure"
    ].transform(lambda g: g.interpolate("linear", limit_direction="both"))
    return merged


def build(
    raw: pd.DataFrame,
    *,
    years: list[int],
    keep_all: bool,
    interpolate: bool,
) -> pd.DataFrame:

    cols = ["Reference area", "Domain", "TIME_PERIOD", "Measure", "OBS_VALUE"]
    df = raw[cols].dropna(subset=["OBS_VALUE"]).copy()

    # 1 Normalise
    df["norm"] = (
        df.groupby(["Measure", "TIME_PERIOD"], group_keys=False)
        .apply(_normalise)
        .astype(float)
    )

    # 2 Aggregate to domain score
    tidy = (
        df.groupby(["Reference area", "Domain", "TIME_PERIOD"], as_index=False)
        .agg(mean_normalized_measure=("norm", "mean"))
        .round(4)
    )

    # 3 Filter countries & years
    if not keep_all:
        tidy = tidy.query("`Reference area` in @TARGET_COUNTRIES")
    tidy = tidy.query("@years[0] <= TIME_PERIOD <= @years[-1]")

    # 4 Optional interpolation
    if interpolate:
        tidy = _interpolate(tidy, years)

    # 5 Sort for deterministic output
    return tidy.sort_values(["Reference area", "Domain", "TIME_PERIOD"])


# ──────────────────────────────────────────────────────────────────────────────
def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("-i", "--input", default="Better_Life_Unfiltered.csv", type=Path)
    ap.add_argument("-o", "--output", default="Better_Life_Preprocessed.csv", type=Path)
    ap.add_argument("--all", action="store_true", help="keep all countries")
    ap.add_argument("--interpolate", action="store_true", help="fill year gaps")
    ap.add_argument("--year-min", type=int, default=2006)
    ap.add_argument("--year-max", type=int, default=2023)
    args = ap.parse_args(argv)

    if not args.input.exists():
        sys.exit(f"✘ input file '{args.input}' not found")

    raw = pd.read_csv(args.input, low_memory=False)
    years = list(range(args.year_min, args.year_max + 1))

    tidy = build(
        raw,
        years=years,
        keep_all=args.all,
        interpolate=args.interpolate,
    )
    tidy.to_csv(args.output, index=False)
    print(f"✓ {len(tidy):,} rows → {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()

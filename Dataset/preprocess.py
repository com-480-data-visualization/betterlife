#!/usr/bin/env python3
"""
Prepare the OECD Better Life Index data for the D3 map (script.js).

Input : Better_Life_Unfiltered.csv   ← raw OECD.Stat export
Output: Better_Life_Preprocessed.csv ← consumed by script.js
"""

from __future__ import annotations
import argparse
import sys
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
    "Czech Republic",
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


def _normalise(group: pd.DataFrame) -> pd.Series:
    """Normalise *one indicator in one year* across countries."""
    vals = group["OBS_VALUE"].astype(float)
    lo, hi = vals.min(), vals.max()
    if np.isclose(lo, hi):
        return pd.Series(0.5, index=group.index, dtype=float)  # constant → neutral
    scaled = (vals - lo) / (hi - lo)
    if group["Measure"].iloc[0] in NEGATIVE_MEASURES:
        scaled = 1 - scaled
    return scaled


def preprocess(df: pd.DataFrame, keep_all: bool = False) -> pd.DataFrame:
    cols = ["Reference area", "Domain", "TIME_PERIOD", "Measure", "OBS_VALUE"]
    df = df[cols].dropna(subset=["OBS_VALUE"]).copy()

    # Normalise each (Measure, Year) slice
    df["norm"] = (
        df.groupby(["Measure", "TIME_PERIOD"], group_keys=False)
        .apply(_normalise)
        .astype(float)
    )

    # Average across indicators inside each domain
    out = (
        df.groupby(["Reference area", "Domain", "TIME_PERIOD"], as_index=False)
        .agg(mean_normalized_measure=("norm", "mean"))
        .round(4)
    )

    if not keep_all:
        out = out.loc[out["Reference area"].isin(TARGET_COUNTRIES)]

    return out.sort_values(["Reference area", "Domain", "TIME_PERIOD"])


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "-i",
        "--input",
        default="Better_Life_Unfiltered.csv",
        type=Path,
        help="raw OECD CSV",
    )
    ap.add_argument(
        "-o",
        "--output",
        default="Better_Life_Preprocessed.csv",
        type=Path,
        help="destination CSV for the front-end",
    )
    ap.add_argument(
        "--all", action="store_true", help="keep every country, not just the BLI set"
    )
    args = ap.parse_args(argv)

    if not args.input.exists():
        sys.exit(f"✘ Input file '{args.input}' not found")

    raw = pd.read_csv(args.input, low_memory=False)
    tidy = preprocess(raw, keep_all=args.all)
    tidy.to_csv(args.output, index=False)
    print(f"✓ Wrote {len(tidy):,} rows → {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()

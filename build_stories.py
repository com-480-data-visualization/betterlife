import pandas as pd, numpy as np, json, statistics as stats

# 1. Load pre-processed OECD Better Life data
df = pd.read_csv("Better_Life_Preprocessed.csv")

# ── tidy column names ────────────────────────────────────────────────────────
df = df.rename(
    columns={
        "Reference area": "Country",
        "TIME_PERIOD": "Year",
        "mean_normalized_measure": "Z",  # already 0-1 normalised z-score
    }
)

# 2. Rank within each domain-&-year (1 = best, ties = min rank) --------------
df["Rank"] = df.groupby(["Domain", "Year"])["Z"].rank(ascending=False, method="min")


# ── helper functions ─────────────────────────────────────────────────────────
def rank(country, domain, year):
    row = df.loc[
        (df["Country"] == country) & (df["Domain"] == domain) & (df["Year"] == year)
    ]
    return None if row.empty else float(row["Rank"].iloc[0])


def z(country, domain, year):
    row = df.loc[
        (df["Country"] == country) & (df["Domain"] == domain) & (df["Year"] == year)
    ]
    return None if row.empty else float(row["Z"].iloc[0])


def z_delta(country, domain, y0, y1):
    z0, z1 = z(country, domain, y0), z(country, domain, y1)
    return None if z0 is None or z1 is None else z1 - z0


# ─────────────────────────────────────────────────────────────────────────────

# STORY 1 ─ Nordic consistency ----------------------------------------------
nordics = ["Denmark", "Sweden", "Norway", "Finland", "Iceland"]
story1 = {}
for c in nordics:
    comp_rank = df.query("Country == @c").groupby("Year")["Rank"].mean()
    story1[c] = {
        "avg_rank_2006": round(comp_rank.get(2006), 2),
        "avg_rank_2023": round(comp_rank.get(2023), 2),
        "worst_rank_2023": int(
            df.query("Country == @c and Year == 2023")["Rank"].max()
        ),
        "worst_domain_2023": (
            df.query("Country == @c and Year == 2023")
            .sort_values("Rank", ascending=False)
            .iloc[0]["Domain"]
        ),
    }


# STORY 2 ─ Income vs Work-Life vs Safety (2022) -----------------------------
def gap_block(country):
    return {
        "Income_rank": rank(country, "Income and wealth", 2022),
        "Income_z": round(z(country, "Income and wealth", 2022), 4),
        "Work_life_rank": rank(country, "Work-life balance", 2022),
        "Work_life_z": round(z(country, "Work-life balance", 2022), 4),
        "Safety_rank": rank(country, "Safety", 2022),
        "Safety_z": round(z(country, "Safety", 2022), 4),
    }


story2 = {
    "description": "Income vs Work-Life vs Safety (2022 snapshot)",
    "year": 2022,
    "United States": gap_block("United States"),
    "Ireland": gap_block("Ireland"),
}

# STORY 3 ─ Biggest multi-domain climbers: Lithuania & Korea -----------------
# --- Calculate Lithuania values ---
lithuania_safety_delta = z_delta("Lithuania", "Safety", 2006, 2023)
lithuania_swb_delta = z_delta("Lithuania", "Subjective well-being", 2006, 2023)
lithuania_income_delta = z_delta("Lithuania", "Income and wealth", 2006, 2023)
lithuania_skills_delta = z_delta(
    "Lithuania", "Knowledge and skills", 2006, 2023
)  # <-- This might be None

# --- Calculate Korea values ---
korea_safety_delta = z_delta("Korea", "Safety", 2006, 2023)
korea_swb_delta = z_delta("Korea", "Subjective well-being", 2006, 2023)
korea_env_delta = z_delta("Korea", "Environmental quality", 2006, 2023)
korea_skills_delta = z_delta(
    "Korea", "Knowledge and skills", 2006, 2023
)  # <-- This might be None

story3 = {
    "Lithuania": {
        "Safety_rank_2006": rank("Lithuania", "Safety", 2006),
        "Safety_rank_2023": rank("Lithuania", "Safety", 2023),
        "Safety_z_change": (
            round(lithuania_safety_delta, 3)
            if lithuania_safety_delta is not None
            else None
        ),
        "SWB_rank_2006": rank("Lithuania", "Subjective well-being", 2006),
        "SWB_rank_2023": rank("Lithuania", "Subjective well-being", 2023),
        "SWB_z_change": (
            round(lithuania_swb_delta, 3) if lithuania_swb_delta is not None else None
        ),
        "Income_rank_2006": rank("Lithuania", "Income and wealth", 2006),
        "Income_rank_2023": rank("Lithuania", "Income and wealth", 2023),
        "Income_z_change": (
            round(lithuania_income_delta, 3)
            if lithuania_income_delta is not None
            else None
        ),
        "Skills_rank_2006": rank("Lithuania", "Knowledge and skills", 2006),
        "Skills_rank_2023": rank("Lithuania", "Knowledge and skills", 2023),
        # Apply the fix here:
        "Skills_z_change": (
            round(lithuania_skills_delta, 3)
            if lithuania_skills_delta is not None
            else None
        ),
    },
    "Korea": {
        "Safety_rank_2006": rank("Korea", "Safety", 2006),
        "Safety_rank_2023": rank("Korea", "Safety", 2023),
        "Safety_z_change": (
            round(korea_safety_delta, 3) if korea_safety_delta is not None else None
        ),
        "SWB_rank_2006": rank("Korea", "Subjective well-being", 2006),
        "SWB_rank_2023": rank("Korea", "Subjective well-being", 2023),
        "SWB_z_change": (
            round(korea_swb_delta, 3) if korea_swb_delta is not None else None
        ),
        "Env_rank_2006": rank("Korea", "Environmental quality", 2006),
        "Env_rank_2023": rank("Korea", "Environmental quality", 2023),
        "Env_z_change": (
            round(korea_env_delta, 3) if korea_env_delta is not None else None
        ),
        "Skills_rank_2006": rank("Korea", "Knowledge and skills", 2006),
        "Skills_rank_2023": rank("Korea", "Knowledge and skills", 2023),
        # Apply the fix here:
        "Skills_z_change": (
            round(korea_skills_delta, 3) if korea_skills_delta is not None else None
        ),
    },
}

# STORY 4 ─ COVID happiness dip ---------------------------------------------
swb = df[df["Domain"] == "Subjective well-being"]

avg_swb_by_year = swb.groupby("Year")["Z"].mean().loc[2018:2023].round(3).to_dict()

swb19 = swb[swb["Year"] == 2019].set_index("Country")["Z"]
swb23 = swb[swb["Year"] == 2023].set_index("Country")["Z"]
common = swb19.index.intersection(swb23.index)
share_below = float((swb23.loc[common] < swb19.loc[common]).mean())

story4 = {
    "avg_swb_by_year": avg_swb_by_year,
    "countries_trailing_2019_share": round(share_below, 3),  # e.g. 0.838 = 83.8 %
}

# STORY 5 ─ Environment ↔︎ Happiness link ------------------------------------
env = df[df["Domain"] == "Environmental quality"][["Country", "Year", "Z"]].rename(
    columns={"Z": "Env"}
)
swb2 = swb[["Country", "Year", "Z"]].rename(columns={"Z": "SWB"})
merged = pd.merge(env, swb2, on=["Country", "Year"])

pearson_r = merged["Env"].corr(merged["SWB"])
slope = np.cov(merged["Env"], merged["SWB"], bias=True)[0, 1] / merged["Env"].var()
country_avg = merged.groupby("Country")[["Env", "SWB"]].mean()
pearson_r_country = country_avg["Env"].corr(country_avg["SWB"])

# biggest dual gainer 2006 → 2023 (Env ↑ and SWB ↑)
best = None
for c in merged["Country"].unique():
    env0 = env.query("Country == @c and Year == 2006")["Env"]
    env1 = env.query("Country == @c and Year == 2023")["Env"]
    swb0 = swb2.query("Country == @c and Year == 2006")["SWB"]
    swb1 = swb2.query("Country == @c and Year == 2023")["SWB"]
    if env0.empty or env1.empty or swb0.empty or swb1.empty:
        continue
    env_delta = env1.iloc[0] - env0.iloc[0]
    swb_delta = swb1.iloc[0] - swb0.iloc[0]
    if env_delta > 0 and swb_delta > 0:
        if not best or env_delta + swb_delta > best[1] + best[2]:
            best = (c, env_delta, swb_delta)

story5 = {
    "regression_slope": round(slope, 3),
    "pearson_r": round(pearson_r, 3),
    "pearson_r_by_country_avg": round(pearson_r_country, 3),
    "best_dual_gainer": {
        "country": best[0],
        "env_delta": round(best[1], 3),
        "swb_delta": round(best[2], 3),
    },
}

# Assemble and spit out as JSON ---------------------------------------------
stories = {
    "story1": story1,
    "story2": story2,
    "story3": story3,
    "story4": story4,
    "story5": story5,
}

print(json.dumps(stories, indent=2))

import pandas as pd
import numpy as np

# Load the CSV file
df = pd.read_csv("Better_Life_Unfiltered.csv")

# Keep necessary columns and drop rows with missing required values
df = df[['REF_AREA', 'Reference area', 'MEASURE', 'Measure', 'DOMAIN', 'Domain', 'TIME_PERIOD', 'OBS_VALUE']]
df = df.dropna(subset=['OBS_VALUE', 'TIME_PERIOD'])

# Convert data types
df['OBS_VALUE'] = pd.to_numeric(df['OBS_VALUE'], errors='coerce')
df['TIME_PERIOD'] = pd.to_numeric(df['TIME_PERIOD'], errors='coerce')
df = df.dropna(subset=['OBS_VALUE', 'TIME_PERIOD'])

# Normalize values for each MEASURE per year across countries
def normalize_group(group):
    values = group['OBS_VALUE']
    if values.max() != values.min():
        group['normalized'] = (values - values.min()) / (values.max() - values.min())
    else:
        group['normalized'] = 0
    return group

df = df.groupby(['MEASURE', 'TIME_PERIOD'], group_keys=False).apply(normalize_group)

# Compute mean normalized value per Reference area, Domain, and Year
mean_df = (
    df.groupby(['REF_AREA', 'Reference area', 'DOMAIN', 'Domain', 'TIME_PERIOD'])['normalized']
    .mean()
    .reset_index(name='mean_normalized_measure')
)

# Create a full grid of all years (2004–2024) per REF_AREA + DOMAIN combo
full_years = pd.DataFrame({'TIME_PERIOD': list(range(2004, 2025))})
all_combinations = (
    mean_df[['REF_AREA', 'Reference area', 'DOMAIN', 'Domain']]
    .drop_duplicates()
    .merge(full_years, how='cross')
)

# Merge and interpolate missing values
full_data = all_combinations.merge(mean_df, on=['REF_AREA', 'Reference area', 'DOMAIN', 'Domain', 'TIME_PERIOD'], how='left')

# Interpolate per REF_AREA + DOMAIN group
full_data['mean_normalized_measure'] = (
    full_data
    .groupby(['REF_AREA', 'DOMAIN'])['mean_normalized_measure']
    .transform(lambda group: group.interpolate(method='linear', limit_direction='both'))
)

# Save to CSV
full_data.to_csv("Better_Life_Preprocessed.csv", index=False)

print("Output saved to Better_Life_Preprocessed.csv")
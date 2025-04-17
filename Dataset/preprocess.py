import pandas as pd
from sklearn.preprocessing import MinMaxScaler

# Load the CSV file
df = pd.read_csv("Better_Life_Unfiltered.csv")

# Keep only necessary columns and drop rows with missing required values
df = df[['REF_AREA', 'Reference area', 'MEASURE', 'Measure', 'DOMAIN', 'Domain', 'OBS_VALUE']]
df = df.dropna(subset=['OBS_VALUE'])

# Convert observation values to numeric
df['OBS_VALUE'] = pd.to_numeric(df['OBS_VALUE'], errors='coerce')
df = df.dropna(subset=['OBS_VALUE'])

# Normalize values for each MEASURE across countries
df['normalized'] = df.groupby('MEASURE')['OBS_VALUE'].transform(
    lambda x: (x - x.min()) / (x.max() - x.min()) if x.max() != x.min() else 0
)

# Compute mean normalized value per Reference area and Domain
result = df.groupby(['REF_AREA', 'Reference area', 'DOMAIN', 'Domain'])['normalized'].mean().reset_index()

# Rename column for clarity
result = result.rename(columns={'normalized': 'mean_normalized_measure'})

# Save to CSV
result.to_csv("Better_Life_Preprocessed.csv", index=False)

print("Output saved to Normalized_Country_Domain_Scores.csv")
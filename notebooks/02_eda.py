"""
Notebook 02: Exploratory Data Analysis
=======================================
Analyzes the satellite data in data/ahmedabad/
"""
import json
import pandas as pd
import numpy as np

# Load all datasets
datasets = {}
for name, fname in [("LST", "lst_timeseries.json"), ("NDVI", "ndvi_timeseries.json"),
                     ("NO2", "no2_timeseries.json"), ("Soil Moisture", "soil_moisture.json")]:
    with open(f"../data/ahmedabad/{fname}") as f:
        datasets[name] = pd.DataFrame(json.load(f))

# Basic statistics
for name, df in datasets.items():
    print(f"\n=== {name} ===")
    print(f"Shape: {df.shape}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"Unique dates: {df['date'].nunique()}")
    print(f"Spatial points: {len(df.groupby(['lat', 'lng']))}")
    print(f"Value stats:")
    print(df['value'].describe())

# Seasonal analysis for LST
lst = datasets["LST"].copy()
lst['month'] = pd.to_datetime(lst['date']).dt.month
monthly = lst.groupby('month')['value'].agg(['mean', 'std', 'min', 'max'])
print("\n=== LST Monthly Averages ===")
print(monthly)

# Correlation between parameters at common dates
print("\n=== Cross-Parameter Analysis ===")
for name, df in datasets.items():
    mean_by_date = df.groupby('date')['value'].mean()
    print(f"{name}: {len(mean_by_date)} date points, range [{mean_by_date.min():.4f}, {mean_by_date.max():.4f}]")

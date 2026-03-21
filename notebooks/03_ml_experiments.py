"""
Notebook 03: ML Experiments
============================
Tests the 3 ML models on Ahmedabad satellite data.
"""
import json
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from statsmodels.tsa.arima.model import ARIMA

# Load LST data
with open("../data/ahmedabad/lst_timeseries.json") as f:
    lst_data = json.load(f)
df = pd.DataFrame(lst_data)

print("=== EXPERIMENT 1: Isolation Forest (Anomaly Detection) ===")
for contamination in [0.05, 0.08, 0.10]:
    model = IsolationForest(contamination=contamination, random_state=42, n_estimators=100)
    predictions = model.fit_predict(df[['value']].values)
    n_anomalies = (predictions == -1).sum()
    print(f"  contamination={contamination}: {n_anomalies}/{len(df)} anomalies ({n_anomalies/len(df)*100:.1f}%)")

print("\n=== EXPERIMENT 2: ARIMA (Trend Prediction) ===")
# Aggregate by date
ts = df.groupby('date')['value'].mean()
ts.index = pd.to_datetime(ts.index)
ts = ts.sort_index()

for order in [(1,1,0), (2,1,1), (5,1,0)]:
    try:
        model = ARIMA(ts, order=order)
        fitted = model.fit()
        forecast = fitted.forecast(steps=30)
        direction = "UP" if forecast.iloc[-1] > ts.iloc[-1] else "DOWN"
        print(f"  ARIMA{order}: AIC={fitted.aic:.1f}, Forecast direction={direction}, "
              f"Last historical={ts.iloc[-1]:.1f}, 30-day forecast={forecast.iloc[-1]:.1f}")
    except Exception as e:
        print(f"  ARIMA{order}: FAILED - {e}")

print("\n=== EXPERIMENT 3: DBSCAN (Hotspot Clustering) ===")
# Filter to top 25% temperatures
threshold = df['value'].quantile(0.75)
hot = df[df['value'] >= threshold]
coords = hot[['lat', 'lng']].values

for eps in [0.01, 0.02, 0.03]:
    for min_samples in [2, 3, 5]:
        clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(coords)
        n_clusters = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)
        n_noise = (clustering.labels_ == -1).sum()
        print(f"  eps={eps}, min_samples={min_samples}: {n_clusters} clusters, {n_noise} noise points")

print("\n=== DONE ===")

"""
Notebook 04: Model Evaluation & Accuracy Metrics
==================================================
Runs all 5 ML models on real Ahmedabad satellite data and computes
proper accuracy/performance metrics for each.

Models evaluated:
  1. Isolation Forest - Anomaly Detection
  2. ARIMA - Time-Series Forecasting (with train/test split)
  3. DBSCAN - Hotspot Clustering
  4. LSTM - Neural Network Forecasting (with train/test split)
  5. NDVI-LST Regression - Green Gap Analysis

Run: python notebooks/04_model_evaluation.py
"""

import json
import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from sklearn.metrics import (
    silhouette_score, calinski_harabasz_score,
    mean_squared_error, mean_absolute_error, r2_score
)
from sklearn.linear_model import LinearRegression
from statsmodels.tsa.arima.model import ARIMA
from scipy import stats

# -- CONFIG ------------------------------------------
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'ahmedabad')
OUT_DIR = os.path.join(os.path.dirname(__file__), 'outputs')
os.makedirs(OUT_DIR, exist_ok=True)

def load(name):
    with open(os.path.join(DATA_DIR, name)) as f:
        return pd.DataFrame(json.load(f))

# -- LOAD DATA ----------------------------------------
print("=" * 70)
print("  SatIntel - Model Evaluation on Ahmedabad Satellite Data")
print("=" * 70)

lst = load('lst_timeseries.json')
ndvi = load('ndvi_timeseries.json')
no2 = load('no2_timeseries.json')
soil = load('soil_moisture.json')

for name, df in [('LST', lst), ('NDVI', ndvi), ('NO2', no2), ('Soil Moisture', soil)]:
    print(f"  {name}: {len(df)} records, {df.date.nunique()} dates, range [{df.value.min():.2f}, {df.value.max():.2f}]")

print()

# ======================================================
# 1. ISOLATION FOREST - Anomaly Detection
# ======================================================
print("=" * 70)
print("  1. ISOLATION FOREST - Anomaly Detection")
print("=" * 70)

# Aggregate to daily means
lst_daily = lst.groupby('date')['value'].mean().reset_index()
lst_daily['date'] = pd.to_datetime(lst_daily['date'])
lst_daily = lst_daily.sort_values('date').reset_index(drop=True)

results_if = []
for contamination in [0.05, 0.08, 0.10, 0.12]:
    model = IsolationForest(
        contamination=contamination, n_estimators=100, random_state=42
    )
    X = lst_daily[['value']].values
    preds = model.fit_predict(X)
    scores = model.decision_function(X)

    n_anom = (preds == -1).sum()
    anom_values = lst_daily.loc[preds == -1, 'value']

    # Metrics
    mean_score_normal = scores[preds == 1].mean()
    mean_score_anomaly = scores[preds == -1].mean()
    separation = mean_score_normal - mean_score_anomaly  # higher = better

    # Check if anomalies are actually extreme values
    overall_mean = lst_daily['value'].mean()
    overall_std = lst_daily['value'].std()
    anom_z_scores = ((anom_values - overall_mean) / overall_std).abs()
    pct_extreme = (anom_z_scores > 1.5).sum() / len(anom_z_scores) * 100 if len(anom_z_scores) > 0 else 0

    results_if.append({
        'contamination': contamination,
        'anomalies': n_anom,
        'total': len(lst_daily),
        'pct': n_anom / len(lst_daily) * 100,
        'separation': separation,
        'pct_extreme': pct_extreme,
        'mean_anom_value': anom_values.mean(),
        'mean_normal_value': lst_daily.loc[preds == 1, 'value'].mean(),
    })

    print(f"\n  contamination={contamination}:")
    print(f"    Anomalies detected: {n_anom}/{len(lst_daily)} ({n_anom/len(lst_daily)*100:.1f}%)")
    print(f"    Score separation (normal - anomaly): {separation:.4f}")
    print(f"    Anomalies that are truly extreme (|z|>1.5): {pct_extreme:.0f}%")
    print(f"    Mean anomaly temp: {anom_values.mean():.1f}C vs normal: {lst_daily.loc[preds==1,'value'].mean():.1f}C")

# Best model
best = max(results_if, key=lambda x: x['pct_extreme'])
print(f"\n  >>> Best contamination: {best['contamination']} ({best['pct_extreme']:.0f}% of flagged anomalies are truly extreme)")

# Plot
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
model_best = IsolationForest(contamination=best['contamination'], n_estimators=100, random_state=42)
preds_best = model_best.fit_predict(lst_daily[['value']].values)

ax = axes[0]
ax.scatter(lst_daily.loc[preds_best == 1, 'date'], lst_daily.loc[preds_best == 1, 'value'],
           s=10, c='#3B82F6', alpha=0.6, label='Normal')
ax.scatter(lst_daily.loc[preds_best == -1, 'date'], lst_daily.loc[preds_best == -1, 'value'],
           s=40, c='#EF4444', marker='x', label='Anomaly', zorder=5)
ax.set_title(f'Isolation Forest (contamination={best["contamination"]})', fontsize=11, fontweight='bold')
ax.set_xlabel('Date'); ax.set_ylabel('LST (C)')
ax.legend(); ax.grid(alpha=0.2)

ax = axes[1]
conts = [r['contamination'] for r in results_if]
extremes = [r['pct_extreme'] for r in results_if]
ax.bar(range(len(conts)), extremes, color='#3B82F6', alpha=0.8)
ax.set_xticks(range(len(conts))); ax.set_xticklabels(conts)
ax.set_xlabel('Contamination Rate'); ax.set_ylabel('% Truly Extreme (|z|>1.5)')
ax.set_title('Anomaly Quality by Contamination', fontsize=11, fontweight='bold')
ax.grid(alpha=0.2, axis='y')

plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, '01_isolation_forest.png'), dpi=150, bbox_inches='tight')
plt.close()
print(f"  [Saved: outputs/01_isolation_forest.png]")


# ======================================================
# 2. ARIMA - Time-Series Forecasting
# ======================================================
print("\n" + "=" * 70)
print("  2. ARIMA - Time-Series Forecasting (Train/Test Split)")
print("=" * 70)

ts = lst_daily.set_index('date')['value']

# 80/20 train-test split
split = int(len(ts) * 0.8)
train, test = ts.iloc[:split], ts.iloc[split:]
print(f"  Train: {len(train)} points, Test: {len(test)} points")

arima_results = []
for order in [(1,1,0), (2,1,1), (3,1,1), (5,1,0)]:
    try:
        model = ARIMA(train, order=order)
        fitted = model.fit()
        forecast = fitted.forecast(steps=len(test))
        forecast.index = test.index

        rmse = np.sqrt(mean_squared_error(test, forecast))
        mae = mean_absolute_error(test, forecast)
        mape = np.mean(np.abs((test - forecast) / test)) * 100
        r2 = r2_score(test, forecast)

        arima_results.append({
            'order': order, 'aic': fitted.aic, 'bic': fitted.bic,
            'rmse': rmse, 'mae': mae, 'mape': mape, 'r2': r2,
            'forecast': forecast
        })

        print(f"\n  ARIMA{order}:")
        print(f"    AIC: {fitted.aic:.1f}  |  BIC: {fitted.bic:.1f}")
        print(f"    RMSE: {rmse:.2f}C  |  MAE: {mae:.2f}C  |  MAPE: {mape:.1f}%")
        print(f"    R2: {r2:.4f}")
    except Exception as e:
        print(f"\n  ARIMA{order}: FAILED - {e}")

if arima_results:
    best_arima = min(arima_results, key=lambda x: x['rmse'])
    print(f"\n  >>> Best model: ARIMA{best_arima['order']} - RMSE={best_arima['rmse']:.2f}C, R2={best_arima['r2']:.4f}")

    # Plot
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    ax = axes[0]
    ax.plot(train.index, train.values, color='#3B82F6', linewidth=1, label='Train')
    ax.plot(test.index, test.values, color='#22D3EE', linewidth=1.5, label='Actual (Test)')
    ax.plot(best_arima['forecast'].index, best_arima['forecast'].values,
            color='#F59E0B', linewidth=1.5, linestyle='--', label=f'Forecast ARIMA{best_arima["order"]}')
    ax.set_title(f'ARIMA{best_arima["order"]} - Forecast vs Actual', fontsize=11, fontweight='bold')
    ax.set_xlabel('Date'); ax.set_ylabel('LST (C)')
    ax.legend(fontsize=9); ax.grid(alpha=0.2)

    ax = axes[1]
    models = [f'ARIMA{r["order"]}' for r in arima_results]
    rmses = [r['rmse'] for r in arima_results]
    colors = ['#10B981' if r == best_arima else '#3B82F6' for r in arima_results]
    ax.barh(range(len(models)), rmses, color=colors, alpha=0.8)
    ax.set_yticks(range(len(models))); ax.set_yticklabels(models)
    ax.set_xlabel('RMSE (C)'); ax.set_title('Model Comparison', fontsize=11, fontweight='bold')
    for i, v in enumerate(rmses):
        ax.text(v + 0.1, i, f'{v:.2f}', va='center', fontsize=9)
    ax.grid(alpha=0.2, axis='x')

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, '02_arima_forecast.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  [Saved: outputs/02_arima_forecast.png]")


# ======================================================
# 3. DBSCAN - Hotspot Clustering
# ======================================================
print("\n" + "=" * 70)
print("  3. DBSCAN - Hotspot Clustering")
print("=" * 70)

# Use spatial data - top 25% hottest
threshold = lst['value'].quantile(0.75)
hot = lst[lst['value'] >= threshold].copy()
coords = hot[['lat', 'lng']].values
print(f"  Hot points (top 25%): {len(hot)} of {len(lst)} (threshold={threshold:.1f}C)")

dbscan_results = []
for eps in [0.01, 0.015, 0.02, 0.03]:
    for min_s in [2, 3, 5]:
        cl = DBSCAN(eps=eps, min_samples=min_s).fit(coords)
        labels = cl.labels_
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = (labels == -1).sum()

        row = {'eps': eps, 'min_samples': min_s, 'n_clusters': n_clusters, 'noise': n_noise}

        if n_clusters >= 2 and n_clusters < len(hot) - 1:
            mask = labels != -1
            if mask.sum() > n_clusters:
                sil = silhouette_score(coords[mask], labels[mask])
                ch = calinski_harabasz_score(coords[mask], labels[mask])
                row['silhouette'] = sil
                row['calinski_harabasz'] = ch

        dbscan_results.append(row)

print(f"\n  {'eps':<6} {'min_s':<6} {'clusters':<10} {'noise':<8} {'silhouette':<12} {'CH index':<10}")
print("  " + "-" * 60)
for r in dbscan_results:
    sil = f"{r.get('silhouette', 0):.3f}" if 'silhouette' in r else "N/A"
    ch = f"{r.get('calinski_harabasz', 0):.1f}" if 'calinski_harabasz' in r else "N/A"
    print(f"  {r['eps']:<6} {r['min_samples']:<6} {r['n_clusters']:<10} {r['noise']:<8} {sil:<12} {ch:<10}")

# Best by silhouette
valid = [r for r in dbscan_results if 'silhouette' in r and r['n_clusters'] >= 2]
if valid:
    best_db = max(valid, key=lambda x: x['silhouette'])
    print(f"\n  >>> Best: eps={best_db['eps']}, min_samples={best_db['min_samples']}")
    print(f"      Silhouette: {best_db['silhouette']:.3f} (1.0=perfect, >0.5=good, >0.25=fair)")
    print(f"      Calinski-Harabasz: {best_db['calinski_harabasz']:.1f} (higher=better)")
    print(f"      Clusters: {best_db['n_clusters']}, Noise: {best_db['noise']}")

    # Plot best clustering
    cl_best = DBSCAN(eps=best_db['eps'], min_samples=best_db['min_samples']).fit(coords)
    fig, ax = plt.subplots(figsize=(8, 7))
    scatter = ax.scatter(hot['lng'], hot['lat'], c=cl_best.labels_, cmap='tab10',
                         s=15, alpha=0.7, edgecolors='none')
    noise_mask = cl_best.labels_ == -1
    ax.scatter(hot.loc[noise_mask, 'lng'], hot.loc[noise_mask, 'lat'],
               s=5, c='gray', alpha=0.3, label='Noise')
    ax.set_title(f'DBSCAN Hotspots (eps={best_db["eps"]}, sil={best_db["silhouette"]:.3f})',
                 fontsize=11, fontweight='bold')
    ax.set_xlabel('Longitude'); ax.set_ylabel('Latitude')
    ax.legend(); ax.grid(alpha=0.2)
    plt.colorbar(scatter, label='Cluster ID')
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, '03_dbscan_hotspots.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  [Saved: outputs/03_dbscan_hotspots.png]")


# ======================================================
# 4. LSTM - Neural Network Forecasting
# ======================================================
print("\n" + "=" * 70)
print("  4. LSTM - Neural Network Forecasting (Train/Test Split)")
print("=" * 70)

try:
    import torch
    import torch.nn as nn

    class LSTMModel(nn.Module):
        def __init__(self, input_size=1, hidden_size=32, num_layers=2):
            super().__init__()
            self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
            self.fc = nn.Linear(hidden_size, 1)

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.fc(out[:, -1, :])

    # Prepare data
    values = lst_daily['value'].values.astype(np.float32)
    v_min, v_max = values.min(), values.max()
    scaled = (values - v_min) / (v_max - v_min + 1e-8)

    lookback = 12
    X, y = [], []
    for i in range(len(scaled) - lookback):
        X.append(scaled[i:i + lookback])
        y.append(scaled[i + lookback])
    X = torch.FloatTensor(np.array(X)).unsqueeze(-1)
    y = torch.FloatTensor(np.array(y)).unsqueeze(-1)

    # Train/test split
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    print(f"  Train: {len(X_train)} sequences, Test: {len(X_test)} sequences")
    print(f"  Architecture: LSTM(input=1, hidden=32, layers=2) -> Linear(1)")

    # Train
    model = LSTMModel()
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    losses = []
    for epoch in range(100):
        model.train()
        pred = model(X_train)
        loss = criterion(pred, y_train)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        losses.append(loss.item())
        if (epoch + 1) % 25 == 0:
            print(f"    Epoch {epoch+1}/100 - Loss: {loss.item():.6f}")

    # Evaluate
    model.eval()
    with torch.no_grad():
        pred_test = model(X_test).numpy().flatten()

    # Denormalize
    actual = y_test.numpy().flatten() * (v_max - v_min) + v_min
    predicted = pred_test * (v_max - v_min) + v_min

    rmse = np.sqrt(mean_squared_error(actual, predicted))
    mae = mean_absolute_error(actual, predicted)
    mape = np.mean(np.abs((actual - predicted) / actual)) * 100
    r2 = r2_score(actual, predicted)

    print(f"\n  Test Metrics:")
    print(f"    RMSE: {rmse:.2f}C")
    print(f"    MAE:  {mae:.2f}C")
    print(f"    MAPE: {mape:.1f}%")
    print(f"    R2:   {r2:.4f}")

    # Plot
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    ax = axes[0]
    ax.plot(actual, color='#22D3EE', linewidth=1.5, label='Actual')
    ax.plot(predicted, color='#F59E0B', linewidth=1.5, linestyle='--', label='LSTM Predicted')
    ax.set_title(f'LSTM Forecast - RMSE={rmse:.2f}C, R2={r2:.3f}', fontsize=11, fontweight='bold')
    ax.set_xlabel('Test Step'); ax.set_ylabel('LST (C)')
    ax.legend(); ax.grid(alpha=0.2)

    ax = axes[1]
    ax.plot(losses, color='#3B82F6', linewidth=1)
    ax.set_title('Training Loss', fontsize=11, fontweight='bold')
    ax.set_xlabel('Epoch'); ax.set_ylabel('MSE Loss')
    ax.grid(alpha=0.2)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, '04_lstm_forecast.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  [Saved: outputs/04_lstm_forecast.png]")

except ImportError:
    print("  [SKIPPED - PyTorch not installed]")
except Exception as e:
    print(f"  [ERROR - {e}]")


# ======================================================
# 5. NDVI-LST REGRESSION - Green Gap Analysis
# ======================================================
print("\n" + "=" * 70)
print("  5. NDVI-LST LINEAR REGRESSION - Green Gap Analysis")
print("=" * 70)

# Match NDVI and LST by location
lst_sp = lst.copy()
ndvi_sp = ndvi.copy()
lst_sp['loc'] = lst_sp['lat'].round(2).astype(str) + ',' + lst_sp['lng'].round(2).astype(str)
ndvi_sp['loc'] = ndvi_sp['lat'].round(2).astype(str) + ',' + ndvi_sp['lng'].round(2).astype(str)

lst_mean = lst_sp.groupby('loc')['value'].mean().reset_index().rename(columns={'value': 'lst'})
ndvi_mean = ndvi_sp.groupby('loc')['value'].mean().reset_index().rename(columns={'value': 'ndvi'})

merged = lst_mean.merge(ndvi_mean, on='loc')

# Remove outliers (z-score filter)
z_lst = np.abs(stats.zscore(merged['lst']))
z_ndvi = np.abs(stats.zscore(merged['ndvi']))
merged_clean = merged[(z_lst < 3) & (z_ndvi < 3)]

print(f"  Matched locations: {len(merged)} -> {len(merged_clean)} after outlier removal")

if len(merged_clean) >= 5:
    X_reg = merged_clean[['ndvi']].values
    y_reg = merged_clean['lst'].values

    # Fit regression
    reg = LinearRegression().fit(X_reg, y_reg)
    y_pred = reg.predict(X_reg)

    r2_reg = r2_score(y_reg, y_pred)
    rmse_reg = np.sqrt(mean_squared_error(y_reg, y_pred))
    beta0 = reg.intercept_
    beta1 = reg.coef_[0]
    corr = np.corrcoef(merged_clean['ndvi'], merged_clean['lst'])[0, 1]

    print(f"\n  Model: LST = {beta0:.2f} + ({beta1:.2f}) x NDVI")
    print(f"  beta0 (intercept): {beta0:.2f}C")
    print(f"  beta1 (slope): {beta1:.2f}C per unit NDVI")
    print(f"  Interpretation: Every +0.1 NDVI -> {abs(beta1)*0.1:.2f}C cooling")
    print(f"  R2: {r2_reg:.4f} ({r2_reg*100:.1f}% variance explained)")
    print(f"  RMSE: {rmse_reg:.2f}C")
    print(f"  Pearson correlation: {corr:.4f}")
    print(f"  Sample size: {len(merged_clean)}")

    # Plot
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(merged_clean['ndvi'], merged_clean['lst'], s=40, c='#3B82F6', alpha=0.7, edgecolors='white', linewidth=0.5)
    x_line = np.linspace(merged_clean['ndvi'].min(), merged_clean['ndvi'].max(), 100)
    ax.plot(x_line, beta0 + beta1 * x_line, color='#EF4444', linewidth=2,
            label=f'LST = {beta0:.1f} + ({beta1:.1f})xNDVI\nR2={r2_reg:.3f}')
    ax.set_title('NDVI-LST Regression - Ahmedabad', fontsize=12, fontweight='bold')
    ax.set_xlabel('NDVI (Vegetation Index)'); ax.set_ylabel('LST (C)')
    ax.legend(fontsize=10); ax.grid(alpha=0.2)
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, '05_ndvi_lst_regression.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  [Saved: outputs/05_ndvi_lst_regression.png]")
else:
    print("  [Not enough matched data]")


# ======================================================
# SUMMARY TABLE
# ======================================================
print("\n" + "=" * 70)
print("  SUMMARY - All Model Metrics")
print("=" * 70)
print(f"  {'Model':<22} {'Metric':<20} {'Value':<30}")
print(f"  {'-'*22} {'-'*20} {'-'*30}")
print(f"  {'Isolation Forest':<22} {'Extreme detection':<20} {best['pct_extreme']:.0f}% truly extreme (|z|>1.5)")
print(f"  {'':<22} {'Contamination':<20} {best['contamination']}")

if arima_results:
    ba = best_arima
    print(f"  {'ARIMA'+str(ba['order']):<22} {'RMSE':<20} {ba['rmse']:.2f} C")
    print(f"  {'':<22} {'MAE':<20} {ba['mae']:.2f} C")
    print(f"  {'':<22} {'MAPE':<20} {ba['mape']:.1f}%")
    print(f"  {'':<22} {'R2':<20} {ba['r2']:.4f}")

if valid:
    print(f"  {'DBSCAN':<22} {'Silhouette':<20} {best_db['silhouette']:.3f} (>0.5=good)")
    print(f"  {'':<22} {'Calinski-Harabasz':<20} {best_db['calinski_harabasz']:.1f}")
    print(f"  {'':<22} {'Clusters found':<20} {best_db['n_clusters']}")

try:
    print(f"  {'LSTM':<22} {'RMSE':<20} {rmse:.2f} C")
    print(f"  {'':<22} {'MAE':<20} {mae:.2f} C")
    print(f"  {'':<22} {'MAPE':<20} {mape:.1f}%")
    print(f"  {'':<22} {'R2':<20} {r2:.4f}")
except:
    pass

try:
    print(f"  {'NDVI-LST Regression':<22} {'R2':<20} {r2_reg:.4f}")
    print(f"  {'':<22} {'RMSE':<20} {rmse_reg:.2f} C")
    print(f"  {'':<22} {'Cooling per +0.1':<20} {abs(beta1)*0.1:.2f} C")
except:
    pass

print(f"\n  All plots saved to: notebooks/outputs/")
print(f"\n{'=' * 70}")
print("  DONE")
print("=" * 70)

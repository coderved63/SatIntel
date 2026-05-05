"""
ML analytics service: anomaly detection, trend prediction, hotspot clustering,
and city summaries. All outputs are explicit about time window and evidence basis.
"""
from __future__ import annotations

import logging
import math
from collections import defaultdict

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.ensemble import IsolationForest

from app.services import evidence_service, satellite_service

logger = logging.getLogger(__name__)

_ml_cache: dict = {}
_file_cache_loaded: set = set()
_summary_cache: dict = {}


def _median_step_days(dates: list[str]) -> int:
    if len(dates) < 2:
        return 1
    ts = pd.to_datetime(pd.Series(dates), errors="coerce").dropna().sort_values()
    if len(ts) < 2:
        return 1
    deltas = ts.diff().dropna().dt.days
    if deltas.empty:
        return 1
    # Satellite composites are often 8-16 day cadence; preserve that cadence in forecasts.
    return max(1, int(round(float(deltas.median()))))


def _train_lstm_forecast(values: np.ndarray, steps: int) -> tuple[list[float], str] | None:
    """
    Lightweight LSTM forecaster using PyTorch when available.
    Returns (forecast_values, model_name) or None if unavailable/fails.
    """
    try:
        import torch
        import torch.nn as nn
    except Exception:
        return None

    if len(values) < 24 or steps <= 0:
        return None

    class _LSTMRegressor(nn.Module):
        def __init__(self, hidden_size: int = 24):
            super().__init__()
            self.lstm = nn.LSTM(input_size=1, hidden_size=hidden_size, num_layers=2, batch_first=True, dropout=0.1)
            self.head = nn.Linear(hidden_size, 1)

        def forward(self, tensor_x):
            out, _ = self.lstm(tensor_x)
            return self.head(out[:, -1, :])

    seq_len = min(14, max(8, len(values) // 10))
    min_v = float(values.min())
    max_v = float(values.max())
    scale = (max_v - min_v) or 1.0
    normalized = (values - min_v) / scale

    xs, ys = [], []
    for idx in range(len(normalized) - seq_len):
        xs.append(normalized[idx : idx + seq_len])
        ys.append(normalized[idx + seq_len])
    if len(xs) < 10:
        return None

    x_t = torch.FloatTensor(np.array(xs)).unsqueeze(-1)
    y_t = torch.FloatTensor(np.array(ys)).unsqueeze(-1)
    model = _LSTMRegressor()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    loss_fn = nn.MSELoss()

    model.train()
    for _ in range(80):
        prediction = model(x_t)
        loss = loss_fn(prediction, y_t)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    model.eval()
    window = normalized[-seq_len:].copy()
    forecast_values: list[float] = []
    with torch.no_grad():
        for _ in range(steps):
            in_t = torch.FloatTensor(window.reshape(1, seq_len, 1))
            next_norm = float(model(in_t).item())
            next_norm = float(np.clip(next_norm, 0.0, 1.0))
            next_val = next_norm * scale + min_v
            forecast_values.append(next_val)
            window = np.append(window[1:], next_norm)

    return forecast_values, "lstm_pytorch"


def _arima_forecast(values: np.ndarray, steps: int) -> tuple[list[float], str]:
    from statsmodels.tsa.arima.model import ARIMA

    if steps <= 0:
        return [], "arima_2_1_1"
    try:
        fitted = ARIMA(values, order=(2, 1, 1)).fit()
        forecast = fitted.forecast(steps=steps)
        return [float(v) for v in forecast], "arima_2_1_1"
    except Exception:
        # Stable fallback if ARIMA fit is singular/noisy for a narrow window.
        lookback = min(6, len(values) - 1)
        slope = 0.0 if lookback <= 0 else float((values[-1] - values[-1 - lookback]) / lookback)
        return [float(values[-1] + slope * step) for step in range(1, steps + 1)], "windowed_linear_direction"


def _year(date_value: str) -> int:
    try:
        return int(str(date_value)[:4])
    except Exception:
        return 0


def _describe_parameter(parameter: str) -> str:
    return {
        "LST": "land surface temperature",
        "NDVI": "vegetation health",
        "NO2": "nitrogen dioxide pollution",
        "SO2": "sulfur dioxide pollution",
        "CO": "carbon monoxide pollution",
        "O3": "ozone concentration",
        "AEROSOL": "aerosol loading",
        "SOIL_MOISTURE": "surface soil moisture",
    }.get(parameter, parameter)


def _cache_key(fn_name: str, parameter: str, city: str, date_range: dict | None = None) -> str:
    resolved = evidence_service.resolve_date_range(date_range)
    return f"{fn_name}:{city.lower()}:{parameter}:{resolved['start_date']}:{resolved['end_date']}"


def _get_cached(fn_name: str, parameter: str, city: str, date_range: dict | None = None):
    key = _cache_key(fn_name, parameter, city, date_range)
    result = _ml_cache.get(key)
    if result:
        return result
    try:
        from app.services import cache_service

        redis_result = cache_service.get(f"ml:{key}")
        if redis_result:
            _ml_cache[key] = redis_result
            return redis_result
    except Exception:
        pass
    city_key = city.lower()
    if city_key not in _file_cache_loaded and date_range is None:
        _load_file_cache(city_key)
    return _ml_cache.get(key)


def _set_cached(fn_name: str, parameter: str, city: str, result, date_range: dict | None = None):
    key = _cache_key(fn_name, parameter, city, date_range)
    _ml_cache[key] = result
    try:
        from app.services import cache_service

        cache_service.set(f"ml:{key}", result, ttl=86400)
    except Exception:
        pass
    return result


def _load_file_cache(city: str):
    import json
    from app.services.satellite_service import DATA_BASE

    cache_file = DATA_BASE / city / "ml_results_cache.json"
    if cache_file.exists():
        try:
            with open(cache_file) as file_handle:
                results = json.load(file_handle)
            for parameter, data in results.items():
                if "anomalies" in data:
                    _ml_cache[_cache_key("anomalies", parameter, city)] = data["anomalies"]
                if "trends" in data:
                    _ml_cache[_cache_key("trends", parameter, city)] = data["trends"]
                if "hotspots" in data:
                    _ml_cache[_cache_key("hotspots", parameter, city)] = data["hotspots"]
            logger.info(f"Loaded pre-computed ML results for {city} ({len(results)} params)")
        except Exception as exc:
            logger.warning(f"Failed to load ML cache for {city}: {exc}")
    _file_cache_loaded.add(city)


def _load_parameter_data(parameter: str, city: str = "ahmedabad", date_range: dict | None = None) -> list[dict]:
    return evidence_service.filter_by_date_range(satellite_service._load_data(parameter, city), date_range)


def detect_anomalies(parameter: str, city: str = "Ahmedabad", contamination: float = 0.08, date_range: dict | None = None) -> dict:
    cached = _get_cached("anomalies", parameter, city, date_range)
    if cached:
        return cached

    data = _load_parameter_data(parameter, city, date_range)
    analysis_window = evidence_service.resolve_date_range(date_range, default_window="analytics")
    if not data or len(data) < 10:
        return _set_cached("anomalies", parameter, city, {
            **evidence_service.standard_evidence_block(
                city=city,
                parameters=[parameter],
                date_range=analysis_window,
                methodology="Isolation Forest on city-wide date-aggregated means",
                interpretation="No anomaly result could be established because the selected analysis window does not contain enough timestamps.",
                limitations="Sparse coverage in the selected window can suppress anomaly detection.",
                spatial_basis="City-wide temporal signal derived from spatial averages at each timestamp.",
                confidence="Low confidence due to insufficient data within the selected time window.",
                default_window="analytics",
            ),
            "parameter": parameter,
            "anomalies": [],
            "total_points": len(data),
            "anomaly_count": 0,
            "dates_analyzed": 0,
            "baseline_mean": None,
            "baseline_std": None,
            "baseline_period": analysis_window,
            "anomaly_scope": "citywide_temporal",
        }, date_range)

    date_values = defaultdict(list)
    date_points = defaultdict(list)
    for item in data:
        date_values[item["date"]].append(item["value"])
        date_points[item["date"]].append((item["lat"], item["lng"]))

    dates = sorted(date_values.keys())
    means = np.array([np.mean(date_values[date]) for date in dates]).reshape(-1, 1)
    if len(means) < 5:
        return _set_cached("anomalies", parameter, city, {
            "parameter": parameter,
            "city": city,
            "anomalies": [],
            "total_points": len(data),
            "anomaly_count": 0,
            "dates_analyzed": len(dates),
            "analysis_window": analysis_window,
        }, date_range)

    model = IsolationForest(contamination=contamination, random_state=42, n_estimators=100)
    predictions = model.fit_predict(means)
    scores = model.decision_function(means)

    baseline_mean = float(np.mean(means))
    baseline_std = float(np.std(means)) if np.std(means) > 0 else 1.0

    descriptions = {
        "LST": {
            "up": "Citywide surface temperature moved materially above its usual historical range.",
            "down": "Citywide surface temperature fell materially below its usual historical range.",
        },
        "NDVI": {
            "up": "Citywide vegetation signal rose above its usual historical range.",
            "down": "Citywide vegetation signal dropped below its usual historical range.",
        },
        "NO2": {
            "up": "Citywide nitrogen dioxide concentrations spiked above baseline conditions.",
            "down": "Citywide nitrogen dioxide concentrations fell below normal levels.",
        },
        "SOIL_MOISTURE": {
            "up": "Citywide soil moisture rose above normal levels, consistent with wetter conditions.",
            "down": "Citywide soil moisture fell below normal levels, consistent with drying conditions.",
        },
    }

    anomaly_list = []
    for index, date in enumerate(dates):
        if predictions[index] != -1:
            continue
        mean_value = float(means[index][0])
        deviation = round(abs(mean_value - baseline_mean) / baseline_std, 2)
        direction = "above" if mean_value > baseline_mean else "below"
        severity = "critical" if scores[index] < -0.3 else ("high" if scores[index] < -0.15 else "moderate")
        values = np.array(date_values[date])
        points = date_points[date]
        extreme_idx = int(np.argmax(np.abs(values - baseline_mean)))
        anomaly = evidence_service.enrich_coordinate(city, {
            "date": date,
            "lat": round(float(points[extreme_idx][0]), 4),
            "lng": round(float(points[extreme_idx][1]), 4),
            "value": round(mean_value, 4),
            "severity": severity,
            "anomaly_score": round(float(scores[index]), 4),
            "deviation": deviation,
            "direction": direction,
            "description": descriptions.get(parameter, descriptions["LST"])["up" if direction == "above" else "down"],
            "parameter": parameter,
        })
        anomaly_list.append(anomaly)

    severity_order = {"critical": 0, "high": 1, "moderate": 2}
    anomaly_list.sort(key=lambda item: (severity_order.get(item["severity"], 3), item["anomaly_score"]))

    methodology = "Isolation Forest on city-wide date-aggregated means"
    interpretation = (
        f"Each anomaly marks a date where city-level {_describe_parameter(parameter)} departed materially from the normal range "
        f"within the selected analysis window. This is a temporal citywide anomaly, not a full local event map."
    )
    limitations = (
        "Anomalies are based on date-aggregated city means. They highlight unusual dates, but not every affected micro-location "
        "within the city."
    )
    result = {
        **evidence_service.standard_evidence_block(
            city=city,
            parameters=[parameter],
            date_range=analysis_window,
            methodology=methodology,
            interpretation=interpretation,
            limitations=limitations,
            spatial_basis="City-wide temporal signal derived from harmonized grid-cell values aggregated by date.",
            confidence="Moderate confidence for screening; date-level averaging reduces spatial noise but also smooths local spikes.",
            default_window="analytics",
        ),
        "parameter": parameter,
        "anomalies": anomaly_list,
        "total_points": len(data),
        "dates_analyzed": len(dates),
        "date_range": {"start": dates[0], "end": dates[-1]} if dates else {"start": None, "end": None},
        "anomaly_count": len(anomaly_list),
        "contamination": contamination,
        "baseline_mean": round(baseline_mean, 4),
        "baseline_std": round(baseline_std, 4),
        "baseline_period": analysis_window,
        "anomaly_scope": "citywide_temporal",
    }
    return _set_cached("anomalies", parameter, city, result, date_range)


def predict_trend(parameter: str, city: str = "Ahmedabad", forecast_days: int = 30, date_range: dict | None = None) -> dict:
    cached = _get_cached("trends", parameter, city, date_range)
    if cached:
        return cached

    data = _load_parameter_data(parameter, city, date_range)
    analysis_window = evidence_service.resolve_date_range(date_range, default_window="analytics")
    if not data:
        return _set_cached("trends", parameter, city, {
            **evidence_service.standard_evidence_block(
                city=city,
                parameters=[parameter],
                date_range=analysis_window,
                methodology="Direction-of-change estimate on date-aggregated city means",
                interpretation="Trend prediction could not run because no observations were available inside the selected time window.",
                limitations="Trend direction requires historical observations in the selected time range.",
                spatial_basis="City-wide temporal signal derived from date-aggregated harmonized grid values.",
                confidence="Low confidence because no valid historical series was available.",
                default_window="analytics",
            ),
            "parameter": parameter,
            "historical": {},
            "forecast": {},
            "trend_direction": "unknown",
            "date_range": {"start": None, "end": None},
            "historical_points": 0,
            "forecast_days": forecast_days,
        }, date_range)

    date_values = defaultdict(list)
    for item in data:
        date_values[item["date"]].append(item["value"])
    timeseries = {date: round(sum(values) / len(values), 4) for date, values in sorted(date_values.items())}
    time_keys = list(timeseries.keys())
    coverage = {"start": time_keys[0], "end": time_keys[-1]} if time_keys else {"start": None, "end": None}
    if len(timeseries) < 10:
        return _set_cached("trends", parameter, city, {
            **evidence_service.standard_evidence_block(
                city=city,
                parameters=[parameter],
                date_range=analysis_window,
                methodology="Insufficient history for directional trend estimate",
                interpretation="The selected analysis window does not contain enough timestamps to support a meaningful trend estimate.",
                limitations="Trend estimates are directional and require a minimum history window.",
                spatial_basis="City-wide temporal signal derived from date-aggregated harmonized grid values.",
                confidence="Low confidence because the selected window contains too few timestamps for forecasting.",
                default_window="analytics",
            ),
            "parameter": parameter,
            "historical": timeseries,
            "forecast": {},
            "trend_direction": "insufficient_data",
            "date_range": coverage,
            "historical_points": len(timeseries),
            "forecast_days": forecast_days,
            "model": "directional_trend",
        }, date_range)

    values = list(timeseries.values())
    dates = list(timeseries.keys())
    value_arr = np.array(values, dtype=float)
    step_days = _median_step_days(dates)
    # Preserve satellite cadence (e.g. 8-day composites) instead of pretending daily points.
    forecast_steps = max(1, int(math.ceil(forecast_days / step_days)))
    lstm_result = _train_lstm_forecast(value_arr, forecast_steps)
    if lstm_result:
        forecast_values, model_name = lstm_result
    else:
        forecast_values, model_name = _arima_forecast(value_arr, forecast_steps)

    trend_delta = forecast_values[-1] - values[-1] if forecast_values else 0.0
    trend_direction = "increasing" if trend_delta > 0 else "decreasing"
    last_date = pd.to_datetime(dates[-1])
    forecast = {}
    for idx, predicted_value in enumerate(forecast_values, start=1):
        next_date = last_date + pd.Timedelta(days=idx * step_days)
        forecast[str(next_date.date())] = round(float(predicted_value), 4)

    result = {
        **evidence_service.standard_evidence_block(
            city=city,
            parameters=[parameter],
            date_range=analysis_window,
            methodology=(
                "Sequence forecast on date-aggregated city means using PyTorch LSTM when available; "
                "ARIMA fallback otherwise. Forecast cadence follows median observation spacing."
            ),
            interpretation=(
                f"The trend view summarizes how city-level {_describe_parameter(parameter)} evolved during the selected window and "
                f"projects the next {forecast_days} days using the same temporal cadence as observed satellite composites."
            ),
            limitations="Forecast values are screening outputs from a compact sequence model; they should be interpreted as directional planning guidance, not guaranteed daily measurements.",
            spatial_basis="City-wide temporal signal derived from date-aggregated harmonized grid values.",
            confidence="Moderate confidence for direction-of-change interpretation; low-to-moderate confidence for point-value forecasting.",
            default_window="analytics",
        ),
        "parameter": parameter,
        "historical": timeseries,
        "forecast": forecast,
        "trend_direction": trend_direction,
        "model": model_name,
        "forecast_days": forecast_days,
        "forecast_step_days": step_days,
        "date_range": coverage,
        "historical_points": len(timeseries),
    }
    return _set_cached("trends", parameter, city, result, date_range)


def find_hotspots(parameter: str, city: str = "Ahmedabad", eps: float = 0.02, min_samples: int = 2, date_range: dict | None = None) -> dict:
    cached = _get_cached("hotspots", parameter, city, date_range)
    if cached:
        return cached

    analysis_window = evidence_service.resolve_date_range(date_range, default_window="analytics")
    data = _load_parameter_data(parameter, city, analysis_window)
    if not data:
        return _set_cached("hotspots", parameter, city, {
            **evidence_service.standard_evidence_block(
                city=city,
                parameters=[parameter],
                date_range=analysis_window,
                methodology="DBSCAN on recent grid-cell averages above an extreme-value threshold",
                interpretation="No hotspot result could be produced because the selected time window contains no observations.",
                limitations="Hotspot clustering depends on a sufficient number of valid grid cells inside the selected date window.",
                spatial_basis="Recent average of harmonized grid-cell values inside the selected analysis window.",
                confidence="Low confidence because no valid hotspot surface was available.",
                default_window="analytics",
            ),
            "parameter": parameter,
            "hotspots": [],
            "total_points": 0,
            "hot_points": 0,
            "cluster_count": 0,
        }, date_range)

    recent_year = max((_year(item.get("date", "")) for item in data), default=0)
    recent_window = [item for item in data if _year(item.get("date", "")) >= max(2020, recent_year - 1)]
    if not recent_window:
        recent_window = data

    coord_values = defaultdict(list)
    coord_months = defaultdict(set)
    for item in recent_window:
        key = (round(float(item["lat"]), 4), round(float(item["lng"]), 4))
        coord_values[key].append(float(item["value"]))
        coord_months[key].add(str(item.get("date", ""))[:7])

    aggregated_points = []
    for (lat, lng), values in coord_values.items():
        aggregated_points.append({
            "lat": lat,
            "lng": lng,
            "value": float(np.mean(values)),
            "min_value": float(np.min(values)),
            "max_value": float(np.max(values)),
            "temporal_samples": len(values),
            "months_covered": len(coord_months[(lat, lng)]),
        })

    df = pd.DataFrame(aggregated_points)
    if df.empty:
        return _set_cached("hotspots", parameter, city, {
            "parameter": parameter,
            "city": city,
            "hotspots": [],
            "total_points": 0,
            "hot_points": 0,
            "cluster_count": 0,
            "analysis_window": analysis_window,
        }, date_range)

    if parameter == "NDVI":
        threshold = df["value"].quantile(0.20)
        hot_df = df[df["value"] <= threshold].copy()
    else:
        threshold = df["value"].quantile(0.80)
        hot_df = df[df["value"] >= threshold].copy()

    if len(hot_df) < min_samples:
        return _set_cached("hotspots", parameter, city, {
            **evidence_service.standard_evidence_block(
                city=city,
                parameters=[parameter],
                date_range=analysis_window,
                methodology="DBSCAN on recent grid-cell averages above an extreme-value threshold",
                interpretation="No stable hotspot cluster met the minimum density threshold in the recent spatial surface.",
                limitations="A small number of extreme cells can indicate local stress even when no cluster survives DBSCAN density filtering.",
                spatial_basis="Recent average of harmonized grid-cell values in the selected time window.",
                confidence="Moderate confidence that extreme values are sparse rather than strongly clustered.",
                default_window="analytics",
            ),
            "parameter": parameter,
            "city": city,
            "hotspots": [],
            "total_points": len(df),
            "hot_points": len(hot_df),
            "cluster_count": 0,
            "threshold": round(float(threshold), 4),
            "date_basis": {"start_year": max(2020, recent_year - 1) if recent_year else 0, "end_year": recent_year},
        }, date_range)

    coords = hot_df[["lat", "lng"]].values
    clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(coords)
    hot_df["cluster"] = clustering.labels_

    hotspots = []
    for label in sorted(set(clustering.labels_)):
        if label == -1:
            continue
        cluster_points = hot_df[hot_df["cluster"] == label]
        hotspot = evidence_service.enrich_coordinate(city, {
            "cluster_id": int(label),
            "center_lat": round(float(cluster_points["lat"].mean()), 4),
            "center_lng": round(float(cluster_points["lng"].mean()), 4),
            "avg_value": round(float(cluster_points["value"].mean()), 4),
            "min_value": round(float(cluster_points["min_value"].min()), 4),
            "max_value": round(float(cluster_points["max_value"].max()), 4),
            "num_points": int(len(cluster_points)),
            "months_covered": int(cluster_points["months_covered"].max()),
            "severity": "critical" if len(cluster_points) >= 8 else ("high" if len(cluster_points) >= 4 else "moderate"),
            "parameter": parameter,
            "radius_km": round(eps * 111, 1),
        }, lat_key="center_lat", lng_key="center_lng")
        hotspots.append(hotspot)

    result = {
        **evidence_service.standard_evidence_block(
            city=city,
            parameters=[parameter],
            date_range=analysis_window,
            methodology="DBSCAN on recent grid-cell averages above an extreme-value threshold",
            interpretation=(
                f"Hotspot clustering groups nearby grid cells with persistently extreme {_describe_parameter(parameter)} values. "
                "A single cluster means stress is spatially concentrated, not that only one bad spot exists."
            ),
            limitations="Clusters are built from averaged grid cells, so they summarize concentrated stress rather than every individual raw scene.",
            spatial_basis="Recent average of harmonized grid-cell values in the selected time window.",
            confidence="Moderate confidence for operational targeting; cluster strength improves with more months covered.",
            default_window="analytics",
        ),
        "parameter": parameter,
        "city": city,
        "hotspots": hotspots,
        "total_points": len(df),
        "hot_points": len(hot_df),
        "cluster_count": len(hotspots),
        "threshold": round(float(threshold), 4),
        "date_basis": {"start_year": max(2020, recent_year - 1) if recent_year else 0, "end_year": recent_year},
    }
    return _set_cached("hotspots", parameter, city, result, date_range)


def get_city_summary(city: str = "Ahmedabad", date_range: dict | None = None) -> dict:
    resolved = evidence_service.resolve_date_range(date_range, default_window="dashboard")
    cache_key = f"{city.lower()}:{resolved['start_date']}:{resolved['end_date']}"
    if cache_key in _summary_cache:
        return _summary_cache[cache_key]

    try:
        from app.services import cache_service

        redis_result = cache_service.get(f"summary:{cache_key}")
        if redis_result:
            _summary_cache[cache_key] = redis_result
            return redis_result
    except Exception:
        pass

    parameters = ["LST", "NDVI", "NO2", "SOIL_MOISTURE"]
    summary = {
        **evidence_service.build_analysis_context(city, parameters, resolved, default_window="dashboard"),
        "city": city,
        "parameters": {},
        "methodology": "Shared dashboard summary using window-filtered statistics, anomaly screening, and hotspot clustering.",
        "interpretation": "Summary cards represent city-level screening metrics for the active analysis window.",
        "limitations": "Summary metrics compress spatial and temporal variability; detailed pages should be used before operational decisions.",
        "spatial_basis": "Harmonized grid-cell data aggregated to city-level metrics for the selected window.",
    }

    for parameter_id in parameters:
        try:
            stats = satellite_service.get_statistics(parameter_id, city, resolved)
            anomaly_result = detect_anomalies(parameter_id, city, date_range=resolved)
            hotspot_result = find_hotspots(parameter_id, city, date_range=resolved)
            summary["parameters"][parameter_id] = {
                "statistics": stats,
                "anomaly_count": anomaly_result.get("anomaly_count", 0),
                "hotspot_count": hotspot_result.get("cluster_count", 0),
                "top_anomalies": anomaly_result.get("anomalies", [])[:3],
                "top_hotspots": hotspot_result.get("hotspots", [])[:3],
                "analysis_window": stats.get("analysis_window", resolved),
                "data_coverage": stats.get("data_coverage", {}),
                "metric_represents": (
                    f"City-level {_describe_parameter(parameter_id)} summary computed from observations inside the active analysis window."
                ),
            }
        except Exception as exc:
            logger.error(f"Error computing summary for {parameter_id}: {exc}")
            summary["parameters"][parameter_id] = {"error": str(exc)}

    _summary_cache[cache_key] = summary
    try:
        from app.services import cache_service

        cache_service.set(f"summary:{cache_key}", summary, ttl=86400)
    except Exception:
        pass
    return summary

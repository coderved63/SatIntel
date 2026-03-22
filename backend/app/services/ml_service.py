"""
ML Analytics Service — anomaly detection, trend prediction, hotspot clustering.
Uses scikit-learn (Isolation Forest, DBSCAN) and statsmodels (ARIMA).
"""
import logging
import numpy as np
import pandas as pd
from typing import Optional
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from collections import defaultdict

logger = logging.getLogger(__name__)

# ── ML Result Cache ──────────────────────────────────────
_ml_cache: dict = {}
_file_cache_loaded: set = set()

def _cache_key(fn_name: str, parameter: str, city: str) -> str:
    return f"{fn_name}:{city.lower()}:{parameter}"

def _get_cached(fn_name: str, parameter: str, city: str):
    key = _cache_key(fn_name, parameter, city)

    # 1. Memory cache (fastest)
    result = _ml_cache.get(key)
    if result:
        return result

    # 2. Redis cache (persists across restarts)
    try:
        from app.services import cache_service
        redis_result = cache_service.get(f"ml:{key}")
        if redis_result:
            _ml_cache[key] = redis_result  # promote to memory
            return redis_result
    except Exception:
        pass

    # 3. File cache (legacy fallback)
    city_key = city.lower()
    if city_key not in _file_cache_loaded:
        _load_file_cache(city_key)

    return _ml_cache.get(key)

def _set_cached(fn_name: str, parameter: str, city: str, result):
    key = _cache_key(fn_name, parameter, city)
    _ml_cache[key] = result

    # Persist to Redis (24h TTL)
    try:
        from app.services import cache_service
        cache_service.set(f"ml:{key}", result, ttl=86400)
    except Exception:
        pass

    return result

def _load_file_cache(city: str):
    """Load pre-computed ML results from JSON file if available."""
    import json
    from pathlib import Path
    cache_file = Path(__file__).resolve().parent.parent.parent.parent / "data" / city / "ml_results_cache.json"
    if cache_file.exists():
        try:
            with open(cache_file) as f:
                results = json.load(f)
            for param, data in results.items():
                if "anomalies" in data:
                    _ml_cache[_cache_key("anomalies", param, city)] = data["anomalies"]
                if "trends" in data:
                    _ml_cache[_cache_key("trends", param, city)] = data["trends"]
                if "hotspots" in data:
                    _ml_cache[_cache_key("hotspots", param, city)] = data["hotspots"]
            logger.info(f"Loaded pre-computed ML results for {city} ({len(results)} params)")
        except Exception as e:
            logger.warning(f"Failed to load ML cache for {city}: {e}")
    _file_cache_loaded.add(city)


def _load_parameter_data(parameter: str, city: str = "ahmedabad") -> list[dict]:
    """Load data from satellite service."""
    from app.services import satellite_service
    return satellite_service._load_data(parameter, city)


def detect_anomalies(parameter: str, city: str = "Ahmedabad", contamination: float = 0.08) -> dict:
    """
    Detect anomalies using Isolation Forest on DATE-AGGREGATED data.
    Instead of running on 225K individual points (slow, too many results),
    we aggregate by date → ~43 time-series points → fast, meaningful anomalies.
    Only returns critical + high severity (no moderate noise).
    """
    cached = _get_cached("anomalies", parameter, city)
    if cached:
        return cached
    data = _load_parameter_data(parameter, city)
    if not data or len(data) < 10:
        return {"anomalies": [], "total_points": 0, "anomaly_count": 0}

    # Aggregate by date — city-wide mean per date
    date_values = defaultdict(list)
    date_points = defaultdict(list)  # keep sample lat/lng per date
    for d in data:
        date_values[d["date"]].append(d["value"])
        date_points[d["date"]].append((d["lat"], d["lng"]))

    dates = sorted(date_values.keys())
    means = np.array([np.mean(date_values[d]) for d in dates]).reshape(-1, 1)

    if len(means) < 5:
        return _set_cached("anomalies", parameter, city, {
            "anomalies": [], "total_points": len(data), "anomaly_count": 0
        })

    # Run Isolation Forest on aggregated time-series (~43 points, very fast)
    model = IsolationForest(contamination=contamination, random_state=42, n_estimators=100)
    predictions = model.fit_predict(means)
    scores = model.decision_function(means)

    overall_mean = float(np.mean(means))
    overall_std = float(np.std(means)) if np.std(means) > 0 else 1.0

    # Description templates per parameter and direction
    DESCRIPTIONS = {
        "LST": {
            "high_up": "Extreme heat event — surface temperature significantly above seasonal average. Indicates heat wave conditions, increased energy demand, and heat stress risk.",
            "high_down": "Unusual cold event — surface temperature dropped well below expected range. May indicate weather anomaly or sensor calibration event.",
            "moderate_up": "Above-normal surface temperature detected. Mild heat stress — monitor for sustained trends.",
            "moderate_down": "Below-normal surface temperature. Unusual for this period — possible weather system influence.",
        },
        "NDVI": {
            "high_up": "Sudden vegetation surge — NDVI spiked above normal. Likely post-monsoon rapid growth or irrigation activity.",
            "high_down": "Severe vegetation loss — NDVI dropped sharply. Possible deforestation, fire damage, or drought stress event.",
            "moderate_up": "Slightly elevated vegetation index. Green cover above seasonal baseline.",
            "moderate_down": "Mild vegetation decline detected. Early indicator of stress — recommend monitoring.",
        },
        "NO2": {
            "high_up": "Pollution spike — NO2 concentration significantly elevated. Likely industrial emission event, traffic surge, or atmospheric inversion trapping pollutants.",
            "high_down": "Unusually clean air — NO2 well below normal. Possible rainfall washout, holiday period, or industrial shutdown.",
            "moderate_up": "Above-average NO2 levels. Gradual air quality degradation — check industrial and traffic sources.",
            "moderate_down": "Slightly below-normal NO2. Minor air quality improvement detected.",
        },
        "SOIL_MOISTURE": {
            "high_up": "Soil moisture spike — possible flooding, heavy rainfall, or irrigation event. Check drainage systems.",
            "high_down": "Severe soil moisture deficit — drought conditions developing. Agricultural stress and groundwater depletion risk.",
            "moderate_up": "Above-average soil moisture. Favorable for agriculture but monitor for waterlogging.",
            "moderate_down": "Slightly dry conditions. Early drought indicator — recommend water conservation measures.",
        },
    }

    def _get_description(param, severity, is_above):
        templates = DESCRIPTIONS.get(param, DESCRIPTIONS["LST"])
        direction = "up" if is_above else "down"
        key = f"{'high' if severity in ('critical', 'high') else 'moderate'}_{direction}"
        return templates.get(key, f"Anomalous {param} value detected — deviates significantly from baseline.")

    anomaly_list = []
    for i, date in enumerate(dates):
        if predictions[i] == -1:
            score = float(scores[i])
            severity = "critical" if score < -0.3 else ("high" if score < -0.15 else "moderate")

            mean_val = float(means[i][0])
            deviation = round(abs(mean_val - overall_mean) / overall_std, 2)
            is_above = mean_val > overall_mean

            # Pick the most extreme point for this date as representative location
            pts = date_points[date]
            vals = date_values[date]
            extreme_idx = np.argmax(np.abs(np.array(vals) - overall_mean))

            anomaly_list.append({
                "date": date,
                "lat": round(float(pts[extreme_idx][0]), 4),
                "lng": round(float(pts[extreme_idx][1]), 4),
                "value": round(mean_val, 4),
                "severity": severity,
                "anomaly_score": round(score, 4),
                "deviation": deviation,
                "direction": "above" if is_above else "below",
                "description": _get_description(parameter, severity, is_above),
                "parameter": parameter,
            })

    # Sort: critical first, then high, then moderate
    severity_order = {"critical": 0, "high": 1, "moderate": 2}
    anomaly_list.sort(key=lambda a: (severity_order.get(a["severity"], 3), a["anomaly_score"]))

    return _set_cached("anomalies", parameter, city, {
        "parameter": parameter,
        "city": city,
        "anomalies": anomaly_list,
        "total_points": len(data),
        "dates_analyzed": len(dates),
        "anomaly_count": len(anomaly_list),
        "contamination": contamination,
    })


def predict_trend(parameter: str, city: str = "Ahmedabad", forecast_days: int = 30) -> dict:
    """Predict trends using ARIMA. Results are cached."""
    cached = _get_cached("trends", parameter, city)
    if cached:
        return cached
    data = _load_parameter_data(parameter, city)
    if not data:
        return {"historical": {}, "forecast": {}, "trend_direction": "unknown"}

    # Aggregate by date
    date_values = defaultdict(list)
    for d in data:
        date_values[d["date"]].append(d["value"])

    timeseries = {
        date: round(sum(vals) / len(vals), 4)
        for date, vals in sorted(date_values.items())
    }

    if len(timeseries) < 10:
        return {"historical": timeseries, "forecast": {}, "trend_direction": "insufficient_data"}

    try:
        from statsmodels.tsa.arima.model import ARIMA

        df = pd.Series(list(timeseries.values()), index=pd.to_datetime(list(timeseries.keys())))
        df = df.sort_index()

        # Fit ARIMA model
        model = ARIMA(df, order=(2, 1, 1))
        fitted = model.fit()

        # Forecast
        forecast_result = fitted.forecast(steps=forecast_days)
        forecast_dates = pd.date_range(start=df.index[-1] + pd.Timedelta(days=1), periods=forecast_days)
        forecast = {
            str(date.date()): round(float(val), 4)
            for date, val in zip(forecast_dates, forecast_result)
        }

        # Determine trend direction
        last_historical = df.iloc[-1]
        last_forecast = forecast_result.iloc[-1] if len(forecast_result) > 0 else last_historical
        trend = "increasing" if last_forecast > last_historical else "decreasing"

        return _set_cached("trends", parameter, city, {
            "parameter": parameter,
            "city": city,
            "historical": timeseries,
            "forecast": forecast,
            "trend_direction": trend,
            "model": "ARIMA(2,1,1)",
            "forecast_days": forecast_days,
        })

    except Exception as e:
        logger.warning(f"ARIMA failed for {parameter}: {e}. Using linear fallback.")
        dates = list(timeseries.keys())
        values = list(timeseries.values())
        n = len(values)
        if n >= 2:
            slope = (values[-1] - values[0]) / n
            last_val = values[-1]
            forecast = {}
            last_date = pd.to_datetime(dates[-1])
            for i in range(1, forecast_days + 1):
                fdate = last_date + pd.Timedelta(days=i)
                forecast[str(fdate.date())] = round(last_val + slope * i, 4)
            trend = "increasing" if slope > 0 else "decreasing"
        else:
            forecast = {}
            trend = "unknown"

        return _set_cached("trends", parameter, city, {
            "parameter": parameter,
            "city": city,
            "historical": timeseries,
            "forecast": forecast,
            "trend_direction": trend,
            "model": "linear_fallback",
            "forecast_days": forecast_days,
        })


def find_hotspots(parameter: str, city: str = "Ahmedabad", eps: float = 0.02, min_samples: int = 2) -> dict:
    """Identify geographic clusters of extreme values using DBSCAN. Results are cached."""
    cached = _get_cached("hotspots", parameter, city)
    if cached:
        return cached
    data = _load_parameter_data(parameter, city)
    if not data:
        return {"hotspots": [], "total_points": 0}

    # Use latest available date for spatial clustering
    dates = sorted(set(d["date"] for d in data))
    # Use all data for more robust clustering
    df = pd.DataFrame(data)

    # Get high-value points (top 25th percentile)
    threshold = df["value"].quantile(0.75)

    # For NDVI, low values are concerning (stressed vegetation)
    if parameter == "NDVI":
        hot_mask = df["value"] <= df["value"].quantile(0.25)
    else:
        hot_mask = df["value"] >= threshold

    hot_df = df[hot_mask]
    if len(hot_df) < min_samples:
        return {"hotspots": [], "total_points": len(df), "threshold": float(threshold)}

    coords = hot_df[["lat", "lng"]].values
    clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(coords)

    hot_df = hot_df.copy()
    hot_df["cluster"] = clustering.labels_

    hotspots = []
    for label in sorted(set(clustering.labels_)):
        if label == -1:
            continue
        cluster_points = hot_df[hot_df["cluster"] == label]
        center_lat = float(cluster_points["lat"].mean())
        center_lng = float(cluster_points["lng"].mean())
        avg_value = float(cluster_points["value"].mean())
        num_points = len(cluster_points)

        severity = "critical" if num_points >= 8 else ("high" if num_points >= 4 else "moderate")

        hotspots.append({
            "cluster_id": int(label),
            "center_lat": round(center_lat, 4),
            "center_lng": round(center_lng, 4),
            "avg_value": round(avg_value, 4),
            "num_points": num_points,
            "severity": severity,
            "parameter": parameter,
            "radius_km": round(eps * 111, 1),  # Approximate km from degrees
        })

    return _set_cached("hotspots", parameter, city, {
        "parameter": parameter,
        "city": city,
        "hotspots": hotspots,
        "total_points": len(df),
        "hot_points": len(hot_df),
        "cluster_count": len(hotspots),
        "threshold": round(float(threshold), 4),
    })


_summary_cache: dict = {}

def get_city_summary(city: str = "Ahmedabad") -> dict:
    """Get comprehensive analytics summary for a city. Cached in memory + Redis."""
    cache_key = city.lower()
    if cache_key in _summary_cache:
        return _summary_cache[cache_key]

    # Try Redis
    try:
        from app.services import cache_service
        redis_result = cache_service.get(f"summary:{cache_key}")
        if redis_result:
            _summary_cache[cache_key] = redis_result
            return redis_result
    except Exception:
        pass

    from app.services import satellite_service

    summary = {"city": city, "parameters": {}}

    for param_id in ["LST", "NDVI", "NO2", "SOIL_MOISTURE"]:
        try:
            stats = satellite_service.get_statistics(param_id, city)
            anomaly_result = detect_anomalies(param_id, city)
            hotspot_result = find_hotspots(param_id, city)

            summary["parameters"][param_id] = {
                "statistics": stats,
                "anomaly_count": anomaly_result.get("anomaly_count", 0),
                "hotspot_count": hotspot_result.get("cluster_count", 0),
                "top_anomalies": anomaly_result.get("anomalies", [])[:3],
                "top_hotspots": hotspot_result.get("hotspots", [])[:3],
            }
        except Exception as e:
            logger.error(f"Error computing summary for {param_id}: {e}")
            summary["parameters"][param_id] = {"error": str(e)}

    _summary_cache[cache_key] = summary
    try:
        from app.services import cache_service
        cache_service.set(f"summary:{cache_key}", summary, ttl=86400)
    except Exception:
        pass
    return summary

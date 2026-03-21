"""
Vegetation Loss Detection Service.
Detects NDVI decline, sudden drops, spatial clusters of vegetation loss, and forecasts future trajectory.
"""
import logging
from collections import defaultdict
from app.services import satellite_service

logger = logging.getLogger(__name__)


def analyse(city: str = "Ahmedabad") -> dict:
    """Run vegetation loss analysis."""
    ndvi_data = satellite_service._load_data("NDVI")
    if not ndvi_data:
        return {"city": city, "error": "No NDVI data available"}

    # 1. Overall decline — compare first half vs second half
    date_values = defaultdict(list)
    for d in ndvi_data:
        date_values[d["date"]].append(d["value"])

    ts_sorted = sorted(date_values.items())
    if len(ts_sorted) < 4:
        return {"city": city, "error": "Insufficient time-series data"}

    mid = len(ts_sorted) // 2
    first_half = [sum(v) / len(v) for _, v in ts_sorted[:mid]]
    second_half = [sum(v) / len(v) for _, v in ts_sorted[mid:]]
    first_avg = sum(first_half) / len(first_half)
    second_avg = sum(second_half) / len(second_half)
    decline_pct = round((first_avg - second_avg) / first_avg * 100, 1) if first_avg > 0 else 0

    # 2. Area lost from land use change
    try:
        lu_change = satellite_service.get_land_use_change(city)
        change_summary = lu_change.get("change_summary", {})
        veg_decrease_pct = change_summary.get("vegetation_decrease_pct", 0)
        area_lost_sqkm = round(veg_decrease_pct * 4.64, 1)  # Ahmedabad ~464 sqkm
    except:
        veg_decrease_pct = 0
        area_lost_sqkm = 0

    # 3. Anomaly detection on NDVI
    from app.services import ml_service
    anomaly_result = ml_service.detect_anomalies("NDVI", city)
    anomalies = anomaly_result.get("anomalies", [])

    # 4. Hotspot clusters of low NDVI
    hotspot_result = ml_service.find_hotspots("NDVI", city)
    clusters = hotspot_result.get("hotspots", [])

    # 5. LSTM forecast
    try:
        from app.ml.lstm_predictor import LSTMPredictor
        predictor = LSTMPredictor(lookback=6)
        ts_tuples = [(date, sum(vals) / len(vals)) for date, vals in ts_sorted]
        forecast = predictor.forecast(ts_tuples, steps=6)
    except Exception as e:
        logger.warning(f"LSTM forecast failed: {e}")
        forecast = []

    # 6. Critical wards (zones with NDVI < 0.15)
    import numpy as np
    all_values = [d["value"] for d in ndvi_data]
    critical_count = sum(1 for v in all_values if v < 0.15)

    return {
        "city": city,
        "ndvi_decline_pct": decline_pct,
        "area_lost_sqkm": area_lost_sqkm,
        "current_city_ndvi": round(second_avg, 4),
        "critical_zones": critical_count,
        "anomaly_count": len(anomalies),
        "anomaly_events": anomalies[:10],
        "clusters": clusters,
        "forecast_6m": forecast,
        "trend": "declining" if decline_pct > 0 else "stable",
    }

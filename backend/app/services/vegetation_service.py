"""
Vegetation loss analysis with explicit date-window evidence metadata.
"""
from __future__ import annotations

from collections import defaultdict

from app.services import evidence_service, ml_service, satellite_service


def analyse(city: str = "Ahmedabad", date_range: dict | None = None) -> dict:
    resolved = evidence_service.resolve_date_range(date_range, default_window="analytics")
    ndvi_data = evidence_service.filter_by_date_range(satellite_service._load_data("NDVI", city), resolved)
    if not ndvi_data:
        return {"city": city, "error": "No NDVI data available", "analysis_window": resolved}

    date_values = defaultdict(list)
    for item in ndvi_data:
        date_values[item["date"]].append(item["value"])
    sorted_series = sorted(date_values.items())
    if len(sorted_series) < 4:
        return {"city": city, "error": "Insufficient time-series data", "analysis_window": resolved}

    midpoint = len(sorted_series) // 2
    first_half = [sum(values) / len(values) for _, values in sorted_series[:midpoint]]
    second_half = [sum(values) / len(values) for _, values in sorted_series[midpoint:]]
    first_avg = sum(first_half) / len(first_half)
    second_avg = sum(second_half) / len(second_half)
    decline_pct = round((first_avg - second_avg) / first_avg * 100, 1) if first_avg > 0 else 0

    try:
        land_use_change = satellite_service.get_land_use_change(city)
        change_summary = land_use_change.get("change_summary", {})
        veg_decrease_pct = change_summary.get("vegetation_decrease_pct", 0)
        area_lost_sqkm = round(veg_decrease_pct * 4.64, 1)
    except Exception:
        area_lost_sqkm = 0

    anomaly_result = ml_service.detect_anomalies("NDVI", city, date_range=resolved)
    hotspot_result = ml_service.find_hotspots("NDVI", city, date_range=resolved)

    all_values = [item["value"] for item in ndvi_data]
    critical_count = sum(1 for value in all_values if value < 0.15)
    return {
        **evidence_service.standard_evidence_block(
            city=city,
            parameters=["NDVI"],
            date_range=resolved,
            methodology="Windowed NDVI trend split, anomaly screening, hotspot clustering, and land-use change cross-reference.",
            interpretation="Vegetation decline is assessed by comparing earlier and later portions of the selected NDVI time window.",
            limitations="Decline percentages are summary indicators and should be cross-checked against local greening projects and seasonal context.",
            spatial_basis="Harmonized NDVI grid and annual land-use overlays.",
            confidence="Moderate confidence for identifying sustained vegetation stress rather than single-scene noise.",
            default_window="analytics",
        ),
        "city": city,
        "ndvi_decline_pct": decline_pct,
        "area_lost_sqkm": area_lost_sqkm,
        "current_city_ndvi": round(second_avg, 4),
        "critical_zones": critical_count,
        "anomaly_count": len(anomaly_result.get("anomalies", [])),
        "anomaly_events": anomaly_result.get("anomalies", [])[:10],
        "clusters": hotspot_result.get("hotspots", []),
        "trend": "declining" if decline_pct > 0 else "stable",
    }

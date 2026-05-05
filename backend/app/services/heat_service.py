"""
Urban Heat Island analysis with explicit evidence metadata.
"""
from __future__ import annotations

from collections import defaultdict

import numpy as np

from app.services import evidence_service, ml_service, satellite_service

ZONE_MAPPING = {
    "City Core": {"lat_range": (23.00, 23.06), "lng_range": (72.53, 72.62)},
    "Industrial East": {"lat_range": (22.95, 23.00), "lng_range": (72.60, 72.70)},
    "Western Suburbs": {"lat_range": (23.00, 23.06), "lng_range": (72.45, 72.53)},
    "North": {"lat_range": (23.06, 23.12), "lng_range": (72.50, 72.65)},
    "South": {"lat_range": (22.95, 23.00), "lng_range": (72.50, 72.60)},
}


def _get_zone(lat, lng):
    for name, bounds in ZONE_MAPPING.items():
        if bounds["lat_range"][0] <= lat <= bounds["lat_range"][1] and bounds["lng_range"][0] <= lng <= bounds["lng_range"][1]:
            return name
    return "Periphery"


def analyse(city: str = "Ahmedabad", date_range: dict | None = None) -> dict:
    resolved = evidence_service.resolve_date_range(date_range, default_window="analytics")
    lst_data = evidence_service.filter_by_date_range(satellite_service._load_data("LST", city), resolved)
    if not lst_data:
        return {"city": city, "error": "No LST data available", "analysis_window": resolved}

    zone_temps = defaultdict(list)
    all_temps = []
    for item in lst_data:
        zone = _get_zone(item["lat"], item["lng"])
        zone_temps[zone].append(item["value"])
        all_temps.append(item["value"])

    core_temps = zone_temps.get("City Core", []) + zone_temps.get("Industrial East", [])
    fringe_temps = zone_temps.get("Western Suburbs", []) + zone_temps.get("Periphery", [])
    core_avg = np.mean(core_temps) if core_temps else 0
    fringe_avg = np.mean(fringe_temps) if fringe_temps else 0

    zone_rankings = []
    for zone_name, temps in zone_temps.items():
        zone_rankings.append({
            "zone": zone_name,
            "avg_temp": round(float(np.mean(temps)), 1),
            "max_temp": round(float(np.max(temps)), 1),
            "min_temp": round(float(np.min(temps)), 1),
            "readings": len(temps),
        })
    zone_rankings.sort(key=lambda zone: zone["avg_temp"], reverse=True)

    anomaly_result = ml_service.detect_anomalies("LST", city, date_range=resolved)
    hotspot_result = ml_service.find_hotspots("LST", city, date_range=resolved)

    return {
        **evidence_service.standard_evidence_block(
            city=city,
            parameters=["LST"],
            date_range=resolved,
            methodology="Zone-based UHI comparison using filtered LST observations plus anomaly and hotspot screening.",
            interpretation="Urban Heat Island intensity compares core and fringe temperature behavior inside the selected analysis window.",
            limitations="Administrative zones are approximate and serve as operational screening areas rather than precise ward boundaries.",
            spatial_basis="Harmonized LST grid grouped into indicative urban zones.",
            confidence="Moderate confidence for urban heat prioritization; validate micro-climate interventions on the ground.",
            default_window="analytics",
        ),
        "city": city,
        "uhi_intensity_celsius": round(float(core_avg - fringe_avg), 2),
        "peak_temp": round(float(np.max(all_temps)), 1),
        "city_avg_temp": round(float(np.mean(all_temps)), 1),
        "urban_avg": round(float(core_avg), 1),
        "fringe_avg": round(float(fringe_avg), 1),
        "zone_rankings": zone_rankings,
        "anomaly_count": anomaly_result.get("anomaly_count", 0),
        "anomaly_events": anomaly_result.get("anomalies", [])[:10],
        "hotspot_clusters": hotspot_result.get("hotspots", []),
        "hotspot_count": hotspot_result.get("cluster_count", 0),
    }

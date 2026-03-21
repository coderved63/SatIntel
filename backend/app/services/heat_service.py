"""
Urban Heat Island Analysis Service.
Calculates UHI intensity, identifies heat clusters, and ranks zones by temperature.
"""
import logging
import numpy as np
from collections import defaultdict
from app.services import satellite_service

logger = logging.getLogger(__name__)

# Approximate Ahmedabad zones
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


def analyse(city: str = "Ahmedabad") -> dict:
    """Run Urban Heat Island analysis."""
    lst_data = satellite_service._load_data("LST")
    if not lst_data:
        return {"city": city, "error": "No LST data available"}

    # Group by zone
    zone_temps = defaultdict(list)
    all_temps = []
    for d in lst_data:
        zone = _get_zone(d["lat"], d["lng"])
        zone_temps[zone].append(d["value"])
        all_temps.append(d["value"])

    # UHI intensity: urban core avg - periphery avg
    core_temps = zone_temps.get("City Core", []) + zone_temps.get("Industrial East", [])
    fringe_temps = zone_temps.get("Western Suburbs", []) + zone_temps.get("Periphery", [])

    core_avg = np.mean(core_temps) if core_temps else 0
    fringe_avg = np.mean(fringe_temps) if fringe_temps else 0
    uhi_intensity = round(float(core_avg - fringe_avg), 2)

    # Zone rankings
    zone_rankings = []
    for zone_name, temps in zone_temps.items():
        zone_rankings.append({
            "zone": zone_name,
            "avg_temp": round(float(np.mean(temps)), 1),
            "max_temp": round(float(np.max(temps)), 1),
            "min_temp": round(float(np.min(temps)), 1),
            "readings": len(temps),
        })
    zone_rankings.sort(key=lambda z: z["avg_temp"], reverse=True)

    # Anomalies and hotspots
    from app.services import ml_service
    anomaly_result = ml_service.detect_anomalies("LST", city)
    hotspot_result = ml_service.find_hotspots("LST", city)

    # Peak temperature
    peak_temp = round(float(np.max(all_temps)), 1)
    city_avg = round(float(np.mean(all_temps)), 1)

    return {
        "city": city,
        "uhi_intensity_celsius": uhi_intensity,
        "peak_temp": peak_temp,
        "city_avg_temp": city_avg,
        "urban_avg": round(float(core_avg), 1),
        "fringe_avg": round(float(fringe_avg), 1),
        "zone_rankings": zone_rankings,
        "anomaly_count": anomaly_result.get("anomaly_count", 0),
        "anomaly_events": anomaly_result.get("anomalies", [])[:10],
        "hotspot_clusters": hotspot_result.get("hotspots", []),
        "hotspot_count": hotspot_result.get("cluster_count", 0),
    }

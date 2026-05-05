"""
Farmland misuse screening with window-aware NDVI evidence.
"""
from __future__ import annotations

from collections import defaultdict

import numpy as np

from app.services import evidence_service, satellite_service


def analyse(city: str = "Ahmedabad", date_range: dict | None = None) -> dict:
    resolved = evidence_service.resolve_date_range(date_range, default_window="analytics")
    ndvi_data = evidence_service.filter_by_date_range(satellite_service._load_data("NDVI", city), resolved)
    if not ndvi_data:
        return {"city": city, "error": "No NDVI data available", "analysis_window": resolved}

    location_ts = defaultdict(list)
    for item in ndvi_data:
        key = (round(item["lat"], 4), round(item["lng"], 4))
        location_ts[key].append((item["date"], item["value"]))

    zones = []
    suspicious = []
    for (lat, lng), timeseries in location_ts.items():
        sorted_ts = sorted(timeseries, key=lambda row: row[0])
        values = [value for _, value in sorted_ts]
        mean_ndvi = np.mean(values)
        std_ndvi = np.std(values)
        crop_score = min(std_ndvi / 0.15, 1.0) * 45 + min(mean_ndvi / 0.25, 1.0) * 35 + 10
        zone = evidence_service.enrich_coordinate(city, {
            "lat": lat,
            "lng": lng,
            "mean_ndvi": round(float(mean_ndvi), 4),
            "std_ndvi": round(float(std_ndvi), 4),
            "crop_activity_score": round(float(crop_score), 1),
            "classification": "active_farmland" if crop_score > 50 else ("idle_land" if crop_score > 25 else "barren_or_converted"),
        })
        zones.append(zone)
        if mean_ndvi > 0.12 and crop_score < 30:
            zone["flag"] = "potential_misuse"
            suspicious.append(zone)

    cluster_count = 0
    if len(suspicious) >= 3:
        from sklearn.cluster import DBSCAN

        coords = np.array([[zone["lat"], zone["lng"]] for zone in suspicious])
        clustering = DBSCAN(eps=0.02, min_samples=2).fit(coords)
        cluster_count = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)

    return {
        **evidence_service.standard_evidence_block(
            city=city,
            parameters=["NDVI"],
            date_range=resolved,
            methodology="Windowed NDVI activity scoring per grid cell using seasonal variability and mean greenness heuristics.",
            interpretation="Suspicious farmland zones are places where greenness and seasonality no longer resemble active cultivation.",
            limitations="This is a screening layer and should not be treated as a legal land-use decision without local verification.",
            spatial_basis="Harmonized NDVI grid cells assessed individually for crop-like temporal behavior.",
            confidence="Moderate confidence for screening idle or converted agricultural behavior.",
            default_window="analytics",
        ),
        "city": city,
        "total_zones_analyzed": len(zones),
        "total_suspicious_zones": len(suspicious),
        "total_suspicious_area_sqkm": round(len(suspicious) * 1.0, 1),
        "zones": sorted(zones, key=lambda zone: zone["crop_activity_score"]),
        "suspicious_zones": suspicious[:20],
        "cluster_count": cluster_count,
        "classifications": {
            "active_farmland": sum(1 for zone in zones if zone["classification"] == "active_farmland"),
            "idle_land": sum(1 for zone in zones if zone["classification"] == "idle_land"),
            "barren_or_converted": sum(1 for zone in zones if zone["classification"] == "barren_or_converted"),
        },
    }

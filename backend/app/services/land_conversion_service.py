"""
Land conversion analysis with explicit evidence context.
"""
from __future__ import annotations

from app.services import evidence_service, satellite_service

CLASS_NAMES = {0: "water", 1: "urban", 2: "sparse_vegetation", 3: "dense_vegetation"}


def analyse(city: str = "Ahmedabad", date_range: dict | None = None) -> dict:
    try:
        land_use_change = satellite_service.get_land_use_change(city)
    except Exception:
        return {"city": city, "error": "No land use data available"}

    data_2020 = land_use_change.get("data_2020", [])
    data_2024 = land_use_change.get("data_2024", [])
    change_summary = land_use_change.get("change_summary", {})
    if not data_2020 or not data_2024:
        return {"city": city, "error": "Incomplete land use data", "analysis_window": land_use_change.get("analysis_window")}

    grid_2020 = {(round(item["lat"], 3), round(item["lng"], 3)): item.get("value", item.get("class_id", -1)) for item in data_2020}
    conversions = {}
    changed_cells = []
    for item in data_2024:
        key = (round(item["lat"], 3), round(item["lng"], 3))
        old_class = grid_2020.get(key)
        new_class = item.get("value", item.get("class_id", -1))
        if old_class is None or old_class == new_class:
            continue
        old_name = CLASS_NAMES.get(int(old_class), "unknown")
        new_name = CLASS_NAMES.get(int(new_class), "unknown")
        conversion_key = f"{old_name}_to_{new_name}"
        conversions[conversion_key] = conversions.get(conversion_key, 0) + 1
        changed_cells.append(evidence_service.enrich_coordinate(city, {
            "lat": item["lat"],
            "lng": item["lng"],
            "from": old_name,
            "to": new_name,
            "from_class": int(old_class),
            "to_class": int(new_class),
        }))

    rapid = [cell for cell in changed_cells if "vegetation" in cell["from"] and cell["to"] == "urban"]
    cluster_count = 0
    if changed_cells:
        from sklearn.cluster import DBSCAN
        import numpy as np

        coords = np.array([[cell["lat"], cell["lng"]] for cell in changed_cells])
        clustering = DBSCAN(eps=0.02, min_samples=2).fit(coords)
        cluster_count = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)

    return {
        **evidence_service.standard_evidence_block(
            city=city,
            parameters=["LAND_USE"],
            date_range=land_use_change.get("analysis_window"),
            methodology="Direct comparison of annual land-use classification grids between 2020 and 2024.",
            interpretation="Changed cells indicate land-cover transitions across the annual comparison period rather than daily events.",
            limitations="Annual composite comparisons are useful for structural land conversion but not for short-duration land-cover changes.",
            spatial_basis="Annual land-use classification grid comparison.",
            confidence="Moderate confidence for structural conversion trends over the multi-year comparison window.",
            default_window="time_machine",
        ),
        "city": city,
        "year_from": 2020,
        "year_to": 2024,
        "total_cells_changed": len(changed_cells),
        "total_area_sqkm": round(len(changed_cells) * 1.0, 1),
        "conversion_breakdown": conversions,
        "rapid_conversions": len(rapid),
        "rapid_conversion_cells": rapid[:20],
        "cluster_count": cluster_count,
        "change_summary": change_summary,
    }

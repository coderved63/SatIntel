"""
Land Conversion Detection Service.
Analyzes land use change between 2020 and 2024, identifies conversion patterns.
"""
import json
import logging
from pathlib import Path
from app.services import satellite_service

logger = logging.getLogger(__name__)

CLASS_NAMES = {0: "water", 1: "urban", 2: "sparse_vegetation", 3: "dense_vegetation"}


def analyse(city: str = "Ahmedabad") -> dict:
    """Detect and classify land use conversions."""
    try:
        lu_change = satellite_service.get_land_use_change(city)
    except:
        return {"city": city, "error": "No land use data available"}

    data_2020 = lu_change.get("data_2020", [])
    data_2024 = lu_change.get("data_2024", [])
    change_summary = lu_change.get("change_summary", {})

    if not data_2020 or not data_2024:
        return {"city": city, "error": "Incomplete land use data"}

    # Build grid lookup for 2020
    grid_2020 = {}
    for d in data_2020:
        key = (round(d["lat"], 3), round(d["lng"], 3))
        grid_2020[key] = d.get("value", d.get("class_id", -1))

    # Compare each 2024 cell to its 2020 value
    conversions = {}
    changed_cells = []
    for d in data_2024:
        key = (round(d["lat"], 3), round(d["lng"], 3))
        old_class = grid_2020.get(key)
        new_class = d.get("value", d.get("class_id", -1))

        if old_class is not None and old_class != new_class:
            old_name = CLASS_NAMES.get(int(old_class), "unknown")
            new_name = CLASS_NAMES.get(int(new_class), "unknown")
            conv_key = f"{old_name}_to_{new_name}"
            conversions[conv_key] = conversions.get(conv_key, 0) + 1
            changed_cells.append({
                "lat": d["lat"], "lng": d["lng"],
                "from": old_name, "to": new_name,
                "from_class": int(old_class), "to_class": int(new_class),
            })

    # Flag rapid/suspicious conversions (vegetation to urban)
    rapid = [c for c in changed_cells if "vegetation" in c["from"] and c["to"] == "urban"]

    # Cluster the changed cells
    from app.services import ml_service
    if changed_cells:
        from sklearn.cluster import DBSCAN
        import numpy as np
        coords = np.array([[c["lat"], c["lng"]] for c in changed_cells])
        clustering = DBSCAN(eps=0.02, min_samples=2).fit(coords)
        n_clusters = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)
    else:
        n_clusters = 0

    total_area = round(len(changed_cells) * 1.0, 1)

    return {
        "city": city,
        "year_from": 2020,
        "year_to": 2024,
        "total_cells_changed": len(changed_cells),
        "total_area_sqkm": total_area,
        "conversion_breakdown": conversions,
        "rapid_conversions": len(rapid),
        "rapid_conversion_cells": rapid[:20],
        "cluster_count": n_clusters,
        "change_summary": change_summary,
    }

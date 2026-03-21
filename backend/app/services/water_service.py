"""
Water Body Encroachment Detection Service.
"""
import logging
from app.services import satellite_service

logger = logging.getLogger(__name__)


def analyse(city: str = "Ahmedabad") -> dict:
    try:
        lu_change = satellite_service.get_land_use_change(city)
    except:
        return {"city": city, "error": "No land use data available"}

    data_2020 = lu_change.get("data_2020", [])
    data_2024 = lu_change.get("data_2024", [])

    if not data_2020 or not data_2024:
        return {"city": city, "error": "Incomplete land use data"}

    water_2020 = {}
    for d in data_2020:
        if d.get("value") == 0 or d.get("class_label") == "water":
            key = (round(d["lat"], 3), round(d["lng"], 3))
            water_2020[key] = d

    encroached = []
    preserved = []
    grid_2024 = {}
    for d in data_2024:
        key = (round(d["lat"], 3), round(d["lng"], 3))
        grid_2024[key] = d

    for key, water_cell in water_2020.items():
        cell_2024 = grid_2024.get(key)
        if cell_2024:
            new_class = cell_2024.get("value", cell_2024.get("class_id", 0))
            if new_class != 0:
                class_names = {0: "water", 1: "urban", 2: "sparse_vegetation", 3: "dense_vegetation"}
                encroached.append({
                    "lat": water_cell["lat"],
                    "lng": water_cell["lng"],
                    "converted_to": class_names.get(int(new_class), "unknown"),
                })
            else:
                preserved.append({"lat": water_cell["lat"], "lng": water_cell["lng"]})

    by_type = {}
    for e in encroached:
        t = e["converted_to"]
        by_type[t] = by_type.get(t, 0) + 1

    return {
        "city": city,
        "water_cells_2020": len(water_2020),
        "water_cells_preserved": len(preserved),
        "cells_encroached": len(encroached),
        "area_lost_sqkm": round(len(encroached) * 1.0, 1),
        "encroachment_details": encroached[:20],
        "encroachment_by_type": by_type,
    }

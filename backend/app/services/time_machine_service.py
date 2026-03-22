"""
Environmental Time Machine — computes per-cell yearly averages for side-by-side comparison.
Uses harmonized satellite data (961 cells per city) for rich heatmap visualization.
"""
import logging
import numpy as np
from collections import defaultdict
from app.services import satellite_service

logger = logging.getLogger(__name__)

PARAM_META = {
    "LST": {"label": "Surface Temperature", "unit": "C", "scale": "temperature"},
    "NDVI": {"label": "Vegetation (NDVI)", "unit": "0-1", "scale": "vegetation"},
    "NO2": {"label": "NO2 Pollution", "unit": "mol/m2", "scale": "pollution"},
    "SO2": {"label": "SO2 Pollution", "unit": "mol/m2", "scale": "pollution"},
    "CO": {"label": "Carbon Monoxide", "unit": "mol/m2", "scale": "pollution"},
    "SOIL_MOISTURE": {"label": "Soil Moisture", "unit": "m3/m3", "scale": "moisture"},
    "LAND_USE": {"label": "Land Use Change", "unit": "class", "scale": "landuse"},
}


def _timeseries_to_yearly_grids(data, year_a="2023", year_b="2024"):
    """Split harmonized time-series into per-cell yearly averages."""
    cells_a = defaultdict(list)
    cells_b = defaultdict(list)

    for point in data:
        key = (round(point["lat"], 4), round(point["lng"], 4))
        date = str(point.get("date", ""))
        val = point.get("value")
        if val is None:
            continue
        if date.startswith(year_a):
            cells_a[key].append(float(val))
        elif date.startswith(year_b):
            cells_b[key].append(float(val))

    grid_a = [
        {"lat": k[0], "lng": k[1], "value": round(float(np.mean(v)), 4)}
        for k, v in cells_a.items() if v
    ]
    grid_b = [
        {"lat": k[0], "lng": k[1], "value": round(float(np.mean(v)), 4)}
        for k, v in cells_b.items() if v
    ]
    return grid_a, grid_b


def get_comparison(param: str, city: str = "ahmedabad") -> dict:
    """Get year-over-year comparison grids using harmonized satellite data."""
    meta = PARAM_META.get(param, {"label": param, "unit": "", "scale": "default"})

    if param == "LAND_USE":
        try:
            lu_change = satellite_service.get_land_use_change(city)
            raw_a = lu_change.get("data_2020", [])
            raw_b = lu_change.get("data_2024", [])
        except:
            raw_a, raw_b = [], []

        class_map = {"water": 0, "sparse_vegetation": 1, "dense_vegetation": 2, "urban": 3, "urban_barren": 3}

        def encode(points):
            return [
                {"lat": p["lat"], "lng": p["lng"],
                 "value": class_map.get(p.get("class_label", ""), 2),
                 "class_label": p.get("class_label", "")}
                for p in points
            ]

        return {
            "param": param, "meta": meta, "city": city,
            "year_a": "2020", "year_b": "2024",
            "grid_a": encode(raw_a), "grid_b": encode(raw_b),
        }

    # Use harmonized data from satellite_service (961 cells per date after IDW)
    try:
        data = satellite_service._load_data(param, city)
    except:
        data = []

    if not data:
        return {"error": f"No data for {param}/{city}", "param": param, "meta": meta, "city": city,
                "grid_a": [], "grid_b": []}

    grid_a, grid_b = _timeseries_to_yearly_grids(data, "2023", "2024")

    # If one year is empty, try raw data as fallback
    if not grid_a and not grid_b:
        try:
            raw_data = satellite_service._load_raw(param, city)
            grid_a, grid_b = _timeseries_to_yearly_grids(raw_data, "2023", "2024")
        except:
            pass

    a_vals = [p["value"] for p in grid_a]
    b_vals = [p["value"] for p in grid_b]
    avg_change = round(float(np.mean(b_vals)) - float(np.mean(a_vals)), 4) if a_vals and b_vals else 0

    logger.info(f"Time Machine {param}/{city}: A={len(grid_a)} pts, B={len(grid_b)} pts, change={avg_change}")

    return {
        "param": param, "meta": meta, "city": city,
        "year_a": "2023", "year_b": "2024",
        "grid_a": grid_a, "grid_b": grid_b,
        "avg_change": avg_change,
        "change_direction": "increased" if avg_change > 0 else "decreased",
    }


def get_params():
    return [
        {"id": "LST", "label": "Surface Temperature"},
        {"id": "NDVI", "label": "Vegetation (NDVI)"},
        {"id": "NO2", "label": "NO2 Pollution"},
        {"id": "SOIL_MOISTURE", "label": "Soil Moisture"},
        {"id": "LAND_USE", "label": "Land Use Change"},
    ]

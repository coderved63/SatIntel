"""
Environmental Time Machine — computes per-cell yearly averages for side-by-side comparison.
Returns two grids (year_a vs year_b) for any parameter.
"""
import json
import logging
import numpy as np
from pathlib import Path
from collections import defaultdict

logger = logging.getLogger(__name__)

DATA_BASE = Path(__file__).resolve().parent.parent.parent.parent / "data"

PARAM_META = {
    "LST": {"label": "Surface Temperature", "unit": "C", "scale": "temperature"},
    "NDVI": {"label": "Vegetation (NDVI)", "unit": "0-1", "scale": "vegetation"},
    "NO2": {"label": "NO2 Pollution", "unit": "mol/m2", "scale": "pollution"},
    "SO2": {"label": "SO2 Pollution", "unit": "mol/m2", "scale": "pollution"},
    "CO": {"label": "Carbon Monoxide", "unit": "mol/m2", "scale": "pollution"},
    "SOIL_MOISTURE": {"label": "Soil Moisture", "unit": "m3/m3", "scale": "moisture"},
    "LAND_USE": {"label": "Land Use Change", "unit": "class", "scale": "landuse"},
}

FILENAME_MAP = {
    "LST": "lst_timeseries.json",
    "NDVI": "ndvi_timeseries.json",
    "NO2": "no2_timeseries.json",
    "SO2": "so2_timeseries.json",
    "CO": "co_timeseries.json",
    "SOIL_MOISTURE": "soil_moisture.json",
}


def _load_json(city: str, filename: str):
    path = DATA_BASE / city.lower() / filename
    if not path.exists():
        return []
    with open(path) as f:
        return json.load(f)


def _timeseries_to_yearly_grids(data, year_a="2023", year_b="2024"):
    cells_a = defaultdict(list)
    cells_b = defaultdict(list)

    for point in data:
        key = (round(point["lat"], 3), round(point["lng"], 3))
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
    meta = PARAM_META.get(param, {"label": param, "unit": "", "scale": "default"})

    if param == "LAND_USE":
        raw_a = _load_json(city, "land_use_2020.json")
        raw_b = _load_json(city, "land_use_2024.json")
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

    filename = FILENAME_MAP.get(param)
    if not filename:
        return {"error": f"Unknown parameter: {param}"}

    raw = _load_json(city, filename)
    if not raw:
        return {"error": f"No data for {param}/{city}"}

    grid_a, grid_b = _timeseries_to_yearly_grids(raw, "2023", "2024")

    a_vals = [p["value"] for p in grid_a]
    b_vals = [p["value"] for p in grid_b]
    avg_change = round(float(np.mean(b_vals)) - float(np.mean(a_vals)), 4) if a_vals and b_vals else 0

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

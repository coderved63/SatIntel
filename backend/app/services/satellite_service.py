"""
Satellite Data Service — loads pre-fetched data from JSON files.
Falls back to file-based data for hackathon demo. Can be swapped to GEE live queries.
"""
import json
import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Path to pre-fetched data
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "ahmedabad"

# Ahmedabad constants
AHMEDABAD_CENTER = [23.0225, 72.5714]
AHMEDABAD_BBOX = {"min_lat": 22.95, "max_lat": 23.10, "min_lng": 72.45, "max_lng": 72.70}

# Parameter metadata
PARAMETERS = {
    "LST": {
        "id": "LST",
        "name": "Land Surface Temperature",
        "unit": "°C",
        "source": "MODIS Terra (MOD11A2)",
        "resolution": "1km",
        "frequency": "8-day composite",
        "file": "lst_timeseries.json",
        "color": "#EF4444",
        "description": "Surface temperature from MODIS thermal infrared bands",
    },
    "NDVI": {
        "id": "NDVI",
        "name": "Vegetation Index (NDVI)",
        "unit": "index",
        "source": "MODIS (MOD13A2)",
        "resolution": "1km",
        "frequency": "16-day composite",
        "file": "ndvi_timeseries.json",
        "color": "#10B981",
        "description": "Normalized Difference Vegetation Index — green cover health",
    },
    "NO2": {
        "id": "NO2",
        "name": "Nitrogen Dioxide (NO₂)",
        "unit": "mol/m²",
        "source": "Sentinel-5P TROPOMI",
        "resolution": "7km",
        "frequency": "Daily",
        "file": "no2_timeseries.json",
        "color": "#8B5CF6",
        "description": "Tropospheric NO₂ column density — air pollution indicator",
    },
    "SOIL_MOISTURE": {
        "id": "SOIL_MOISTURE",
        "name": "Soil Moisture",
        "unit": "m³/m³",
        "source": "NASA SMAP (SPL3SMP_E)",
        "resolution": "9km",
        "frequency": "Daily",
        "file": "soil_moisture.json",
        "color": "#3B82F6",
        "description": "Surface soil moisture from L-band radiometer",
    },
    "LAND_USE": {
        "id": "LAND_USE",
        "name": "Land Use Classification",
        "unit": "class",
        "source": "Landsat 8/9 (USGS/NASA)",
        "resolution": "30m (aggregated to 1km)",
        "frequency": "Annual composite",
        "file": "land_use_2024.json",
        "color": "#6B7280",
        "description": "NDVI-based land classification: water, urban, sparse vegetation, dense vegetation",
    },
}

# Cache loaded data in memory
_data_cache: dict = {}


def _load_data(parameter: str) -> list[dict]:
    """Load pre-fetched JSON data for a parameter.

    Currently serves pre-fetched data directly. When real GEE data is fetched
    (with different native resolutions per mission), call
    geo_helpers.harmonize_timeseries() here to resample everything to the
    common 1 km grid before caching. See utils/geo_helpers.py for the
    IDW interpolation implementation — ready to plug in.
    """
    if parameter in _data_cache:
        return _data_cache[parameter]

    meta = PARAMETERS.get(parameter)
    if not meta:
        raise ValueError(f"Unknown parameter: {parameter}")

    filepath = DATA_DIR / meta["file"]
    if not filepath.exists():
        logger.warning(f"Data file not found: {filepath}")
        return []

    with open(filepath, "r") as f:
        data = json.load(f)

    # TODO: When using real GEE data with different resolutions, uncomment:
    # from app.utils.geo_helpers import harmonize_timeseries
    # data = harmonize_timeseries(data, city="Ahmedabad", parameter=parameter)

    _data_cache[parameter] = data
    logger.info(f"Loaded {len(data)} points for {parameter} from {filepath}")
    return data


def get_available_parameters() -> list[dict]:
    """Return list of available satellite parameters."""
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "unit": p["unit"],
            "source": p["source"],
            "resolution": p["resolution"],
            "frequency": p["frequency"],
            "color": p["color"],
            "description": p["description"],
        }
        for p in PARAMETERS.values()
    ]


def fetch_satellite_data(city: str, parameters: list[str], date_range: dict) -> dict:
    """Fetch satellite data for given parameters. Uses pre-fetched files."""
    result = {}
    for param in parameters:
        data = _load_data(param)
        # Filter by date range if provided
        start = date_range.get("start_date", "2023-01-01")
        end = date_range.get("end_date", "2024-12-31")
        filtered = [d for d in data if start <= d.get("date", "") <= end]
        result[param] = {
            "data": filtered,
            "count": len(filtered),
            "metadata": PARAMETERS.get(param, {}),
        }
    return {"city": city, "parameters": result}


def get_timeseries(parameter: str, city: str = "Ahmedabad") -> dict:
    """Get time-series data for a single parameter."""
    data = _load_data(parameter)
    # Aggregate by date (average across spatial points)
    from collections import defaultdict

    date_values = defaultdict(list)
    for d in data:
        date_values[d["date"]].append(d["value"])

    timeseries = [
        {"date": date, "value": round(sum(vals) / len(vals), 4)}
        for date, vals in sorted(date_values.items())
    ]

    return {
        "parameter": parameter,
        "city": city,
        "timeseries": timeseries,
        "metadata": PARAMETERS.get(parameter, {}),
    }


def get_heatmap_data(parameter: str, city: str = "Ahmedabad") -> dict:
    """Get spatial data formatted for heatmap rendering."""
    data = _load_data(parameter)
    if not data:
        return {"points": [], "parameter": parameter, "min_value": 0, "max_value": 0}

    # Use latest date's data for heatmap
    dates = sorted(set(d["date"] for d in data))
    latest_date = dates[-1] if dates else None

    if latest_date:
        spatial = [d for d in data if d["date"] == latest_date]
    else:
        spatial = data[:50]

    values = [d["value"] for d in spatial]
    min_val = min(values) if values else 0
    max_val = max(values) if values else 0
    val_range = max_val - min_val if max_val != min_val else 1

    # Format: [[lat, lng, intensity(0-1)], ...]
    points = [
        [d["lat"], d["lng"], round((d["value"] - min_val) / val_range, 4)]
        for d in spatial
    ]

    return {
        "points": points,
        "parameter": parameter,
        "city": city,
        "date": latest_date,
        "min_value": round(min_val, 4),
        "max_value": round(max_val, 4),
        "raw_points": [
            {"lat": d["lat"], "lng": d["lng"], "value": round(d["value"], 4)}
            for d in spatial
        ],
    }


def get_all_layers(city: str = "Ahmedabad") -> list[dict]:
    """Get all available map layers with their data."""
    layers = []
    for param_id, meta in PARAMETERS.items():
        heatmap = get_heatmap_data(param_id, city)
        layers.append(
            {
                "id": param_id.lower(),
                "label": meta["name"],
                "type": "heatmap",
                "color": meta["color"],
                "enabled": param_id in ("LST", "NDVI"),
                "data": heatmap,
            }
        )
    return layers


def get_spatial_data(parameter: str, date: Optional[str] = None) -> list[dict]:
    """Get spatial data points for a parameter, optionally filtered by date."""
    data = _load_data(parameter)
    if date:
        return [d for d in data if d["date"] == date]
    # Return latest date
    dates = sorted(set(d["date"] for d in data))
    if dates:
        latest = dates[-1]
        return [d for d in data if d["date"] == latest]
    return data


def get_statistics(parameter: str) -> dict:
    """Compute basic statistics for a parameter."""
    data = _load_data(parameter)
    if not data:
        return {}

    values = [d["value"] for d in data]
    import numpy as np

    arr = np.array(values)
    return {
        "parameter": parameter,
        "count": len(values),
        "mean": round(float(np.mean(arr)), 4),
        "std": round(float(np.std(arr)), 4),
        "min": round(float(np.min(arr)), 4),
        "max": round(float(np.max(arr)), 4),
        "median": round(float(np.median(arr)), 4),
        "unit": PARAMETERS[parameter]["unit"],
    }


def get_land_use_change(city: str = "Ahmedabad") -> dict:
    """Compare land use between 2020 and 2024 to show urban sprawl."""
    file_2020 = DATA_DIR / "land_use_2020.json"
    file_2024 = DATA_DIR / "land_use_2024.json"

    data_2020 = []
    data_2024 = []

    if file_2020.exists():
        with open(file_2020) as f:
            data_2020 = json.load(f)
    if file_2024.exists():
        with open(file_2024) as f:
            data_2024 = json.load(f)

    # Compute change statistics
    urban_2020 = sum(1 for d in data_2020 if d.get("value") == 1)
    urban_2024 = sum(1 for d in data_2024 if d.get("value") == 1)
    veg_2020 = sum(1 for d in data_2020 if d.get("value") in (2, 3))
    veg_2024 = sum(1 for d in data_2024 if d.get("value") in (2, 3))
    water_2020 = sum(1 for d in data_2020 if d.get("value") == 0)
    water_2024 = sum(1 for d in data_2024 if d.get("value") == 0)
    total = max(len(data_2020), 1)

    return {
        "city": city,
        "year_from": 2020,
        "year_to": 2024,
        "data_2020": data_2020,
        "data_2024": data_2024,
        "change_summary": {
            "urban_2020_pct": round(urban_2020 / total * 100, 1),
            "urban_2024_pct": round(urban_2024 / total * 100, 1),
            "urban_increase_pct": round((urban_2024 - urban_2020) / total * 100, 1),
            "vegetation_2020_pct": round(veg_2020 / total * 100, 1),
            "vegetation_2024_pct": round(veg_2024 / total * 100, 1),
            "vegetation_decrease_pct": round((veg_2020 - veg_2024) / total * 100, 1),
            "water_2020_pct": round(water_2020 / total * 100, 1),
            "water_2024_pct": round(water_2024 / total * 100, 1),
        },
    }

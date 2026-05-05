"""
Satellite data access and derived summaries.
Loads prefetched JSON files, harmonizes them to a common grid, and exposes
window-aware summaries used throughout the application.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DATA_BASE = Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parent.parent.parent.parent / "data"))


def _get_data_dir(city: str = "ahmedabad") -> Path:
    return DATA_BASE / city.lower()


AHMEDABAD_CENTER = [23.0225, 72.5714]
AHMEDABAD_BBOX = {"min_lat": 22.95, "max_lat": 23.10, "min_lng": 72.45, "max_lng": 72.70}

PARAMETERS = {
    "LST": {
        "id": "LST",
        "name": "Land Surface Temperature",
        "unit": "deg C",
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
        "description": "Normalized Difference Vegetation Index - green cover health",
    },
    "NO2": {
        "id": "NO2",
        "name": "Nitrogen Dioxide (NO2)",
        "unit": "mol/m^2",
        "source": "Sentinel-5P TROPOMI",
        "resolution": "7km",
        "frequency": "Daily",
        "file": "no2_timeseries.json",
        "color": "#8B5CF6",
        "description": "Tropospheric NO2 column density - air pollution indicator",
    },
    "SOIL_MOISTURE": {
        "id": "SOIL_MOISTURE",
        "name": "Soil Moisture",
        "unit": "m3/m3",
        "source": "NASA SMAP (SPL3SMP_E)",
        "resolution": "9km",
        "frequency": "Daily",
        "file": "soil_moisture.json",
        "color": "#3B82F6",
        "description": "Surface soil moisture from L-band radiometer",
    },
    "SO2": {
        "id": "SO2",
        "name": "Sulfur Dioxide (SO2)",
        "unit": "mol/m^2",
        "source": "Sentinel-5P TROPOMI",
        "resolution": "7km",
        "frequency": "Monthly composite",
        "file": "so2_timeseries.json",
        "color": "#F59E0B",
        "description": "SO2 column density - industrial emission indicator",
    },
    "CO": {
        "id": "CO",
        "name": "Carbon Monoxide (CO)",
        "unit": "mol/m^2",
        "source": "Sentinel-5P TROPOMI",
        "resolution": "7km",
        "frequency": "Monthly composite",
        "file": "co_timeseries.json",
        "color": "#DC2626",
        "description": "CO column density - combustion/traffic pollution indicator",
    },
    "O3": {
        "id": "O3",
        "name": "Ozone (O3)",
        "unit": "mol/m^2",
        "source": "Sentinel-5P TROPOMI",
        "resolution": "7km",
        "frequency": "Monthly composite",
        "file": "o3_timeseries.json",
        "color": "#2563EB",
        "description": "Total ozone column density - UV protection and smog indicator",
    },
    "AEROSOL": {
        "id": "AEROSOL",
        "name": "Aerosol Index (UV AI)",
        "unit": "index",
        "source": "Sentinel-5P TROPOMI",
        "resolution": "7km",
        "frequency": "Monthly composite",
        "file": "aerosol_timeseries.json",
        "color": "#92400E",
        "description": "UV Aerosol Index - PM2.5/dust/haze proxy",
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

_raw_cache: dict = {}
_data_cache: dict = {}


def _load_raw(parameter: str, city: str = "ahmedabad") -> list[dict]:
    from app.utils.city_generator import ensure_city_data

    ensure_city_data(city)
    cache_key = f"{city.lower()}:{parameter}"
    if cache_key in _raw_cache:
        return _raw_cache[cache_key]

    meta = PARAMETERS.get(parameter)
    if not meta:
        raise ValueError(f"Unknown parameter: {parameter}")

    filepath = _get_data_dir(city) / meta["file"]
    if not filepath.exists():
        logger.warning(f"Data file not found: {filepath}")
        return []

    with open(filepath, "r") as file_handle:
        data = json.load(file_handle)

    _raw_cache[cache_key] = data
    return data


def _load_data(parameter: str, city: str = "ahmedabad") -> list[dict]:
    cache_key = f"{city.lower()}:{parameter}:harmonized"
    if cache_key in _data_cache:
        return _data_cache[cache_key]

    if parameter == "LAND_USE":
        raw_data = _load_raw(parameter, city)
        _data_cache[cache_key] = raw_data
        return raw_data

    harmonized_file = _get_data_dir(city) / f"{parameter.lower()}_harmonized.json"
    if harmonized_file.exists():
        with open(harmonized_file, "r") as file_handle:
            harmonized = json.load(file_handle)
        _data_cache[cache_key] = harmonized
        logger.info(f"Loaded pre-harmonized {parameter}/{city}: {len(harmonized)} points")
        return harmonized

    raw_data = _load_raw(parameter, city)
    if not raw_data:
        return []

    from app.utils.geo_helpers import harmonize_timeseries

    harmonized = harmonize_timeseries(raw_data, city=city, parameter=parameter)
    if harmonized:
        _data_cache[cache_key] = harmonized
        logger.info(f"Harmonized {parameter}/{city}: {len(raw_data)} raw -> {len(harmonized)} grid points")
    else:
        _data_cache[cache_key] = raw_data
        logger.warning(f"Harmonization empty for {parameter}/{city}, using raw data")
    return _data_cache[cache_key]


def get_available_parameters() -> list[dict]:
    return [
        {
            "id": parameter["id"],
            "name": parameter["name"],
            "unit": parameter["unit"],
            "source": parameter["source"],
            "resolution": parameter["resolution"],
            "frequency": parameter["frequency"],
            "color": parameter["color"],
            "description": parameter["description"],
        }
        for parameter in PARAMETERS.values()
    ]


def fetch_satellite_data(city: str, parameters: list[str], date_range: dict) -> dict:
    from app.services import evidence_service

    resolved = evidence_service.resolve_date_range(date_range, default_window="research")
    result = {}
    for parameter in parameters:
        filtered = evidence_service.filter_by_date_range(_load_data(parameter, city), resolved)
        result[parameter] = {
            "data": filtered,
            "count": len(filtered),
            "metadata": PARAMETERS.get(parameter, {}),
            "analysis_window": resolved,
            "data_coverage": evidence_service.summarize_coverage(filtered),
        }
    return {"city": city, "parameters": result, "analysis_window": resolved}


def get_timeseries(parameter: str, city: str = "ahmedabad", date_range: dict | None = None) -> dict:
    from app.services import evidence_service
    from collections import defaultdict

    resolved = evidence_service.resolve_date_range(date_range, default_window="dashboard")
    data = evidence_service.filter_by_date_range(_load_data(parameter, city), resolved)
    date_values = defaultdict(list)
    for item in data:
        date_values[item["date"]].append(item["value"])

    timeseries = [
        {"date": date, "value": round(sum(values) / len(values), 4)}
        for date, values in sorted(date_values.items())
    ]

    return {
        "parameter": parameter,
        "city": city,
        "timeseries": timeseries,
        "metadata": PARAMETERS.get(parameter, {}),
        "analysis_window": resolved,
        "data_coverage": evidence_service.summarize_coverage(data),
    }


def get_heatmap_data(parameter: str, city: str = "ahmedabad", date_range: dict | None = None) -> dict:
    from app.services import evidence_service

    resolved = evidence_service.resolve_date_range(date_range, default_window="dashboard")
    data = evidence_service.filter_by_date_range(_load_data(parameter, city), resolved)
    if not data:
        return {
            "points": [],
            "parameter": parameter,
            "min_value": 0,
            "max_value": 0,
            "analysis_window": resolved,
            "data_coverage": evidence_service.summarize_coverage(data),
        }

    dates = sorted(set(item["date"] for item in data))
    latest_date = dates[-1] if dates else None
    spatial = [item for item in data if item["date"] == latest_date] if latest_date else data[:50]
    values = [item["value"] for item in spatial]
    min_val = min(values) if values else 0
    max_val = max(values) if values else 0
    value_range = max_val - min_val if max_val != min_val else 1

    points = [
        [item["lat"], item["lng"], round((item["value"] - min_val) / value_range, 4)]
        for item in spatial
    ]

    return {
        "points": points,
        "parameter": parameter,
        "city": city,
        "date": latest_date,
        "min_value": round(min_val, 4),
        "max_value": round(max_val, 4),
        "raw_points": [
            {"lat": item["lat"], "lng": item["lng"], "value": round(item["value"], 4)}
            for item in spatial
        ],
        "analysis_window": resolved,
        "data_coverage": evidence_service.summarize_coverage(data),
    }


def get_all_layers(city: str = "ahmedabad", date_range: dict | None = None) -> list[dict]:
    layers = []
    for parameter_id, meta in PARAMETERS.items():
        heatmap = get_heatmap_data(parameter_id, city, date_range=date_range)
        layers.append({
            "id": parameter_id.lower(),
            "label": meta["name"],
            "type": "heatmap",
            "color": meta["color"],
            "enabled": parameter_id in ("LST", "NDVI"),
            "data": heatmap,
        })
    return layers


def get_spatial_data(parameter: str, date: Optional[str] = None, city: str = "ahmedabad", date_range: dict | None = None) -> list[dict]:
    from app.services import evidence_service

    data = evidence_service.filter_by_date_range(_load_data(parameter, city), date_range)
    if date:
        return [item for item in data if item["date"] == date]
    dates = sorted(set(item["date"] for item in data))
    if dates:
        latest = dates[-1]
        return [item for item in data if item["date"] == latest]
    return data


def get_statistics(parameter: str, city: str = "ahmedabad", date_range: dict | None = None) -> dict:
    from app.services import evidence_service
    import numpy as np

    resolved = evidence_service.resolve_date_range(date_range, default_window="dashboard")
    data = evidence_service.filter_by_date_range(_load_data(parameter, city), resolved)
    if not data:
        return {}

    values = np.array([item["value"] for item in data])
    return {
        "parameter": parameter,
        "count": len(values),
        "mean": round(float(np.mean(values)), 4),
        "std": round(float(np.std(values)), 4),
        "min": round(float(np.min(values)), 4),
        "max": round(float(np.max(values)), 4),
        "median": round(float(np.median(values)), 4),
        "unit": PARAMETERS[parameter]["unit"],
        "analysis_window": resolved,
        "data_coverage": evidence_service.summarize_coverage(data),
    }


def get_land_use_change(city: str = "ahmedabad") -> dict:
    data_dir = _get_data_dir(city)
    file_2020 = data_dir / "land_use_2020.json"
    file_2024 = data_dir / "land_use_2024.json"

    data_2020 = []
    data_2024 = []

    if file_2020.exists():
        with open(file_2020) as file_handle:
            data_2020 = json.load(file_handle)
    if file_2024.exists():
        with open(file_2024) as file_handle:
            data_2024 = json.load(file_handle)

    urban_2020 = sum(1 for item in data_2020 if item.get("value") == 1)
    urban_2024 = sum(1 for item in data_2024 if item.get("value") == 1)
    vegetation_2020 = sum(1 for item in data_2020 if item.get("value") in (2, 3))
    vegetation_2024 = sum(1 for item in data_2024 if item.get("value") in (2, 3))
    water_2020 = sum(1 for item in data_2020 if item.get("value") == 0)
    water_2024 = sum(1 for item in data_2024 if item.get("value") == 0)
    total = max(len(data_2020), 1)

    return {
        "city": city,
        "year_from": 2020,
        "year_to": 2024,
        "data_2020": data_2020,
        "data_2024": data_2024,
        "analysis_window": {"start_date": "2020-01-01", "end_date": "2024-12-31"},
        "change_summary": {
            "urban_2020_pct": round(urban_2020 / total * 100, 1),
            "urban_2024_pct": round(urban_2024 / total * 100, 1),
            "urban_increase_pct": round((urban_2024 - urban_2020) / total * 100, 1),
            "vegetation_2020_pct": round(vegetation_2020 / total * 100, 1),
            "vegetation_2024_pct": round(vegetation_2024 / total * 100, 1),
            "vegetation_decrease_pct": round((vegetation_2020 - vegetation_2024) / total * 100, 1),
            "water_2020_pct": round(water_2020 / total * 100, 1),
            "water_2024_pct": round(water_2024 / total * 100, 1),
        },
    }

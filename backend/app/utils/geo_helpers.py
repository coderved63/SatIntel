"""
Geospatial Harmonization Utilities.

All satellite datasets have different native resolutions:
  - MODIS LST:        1 km
  - MODIS NDVI:       1 km
  - Sentinel-5P NO₂:  ~7 km
  - SMAP Soil Moisture: ~9 km

Harmonization resamples ALL datasets to a common 1 km grid over the target city,
so they can be overlaid on the same map and compared pixel-to-pixel.

Method: Inverse Distance Weighting (IDW) interpolation onto a fixed lat/lng grid.
"""
import numpy as np
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ── Ahmedabad Grid Definition ─────────────────────────────────
# Bounding box: 22.95°N–23.10°N, 72.45°E–72.70°E
# At ~23°N latitude:
#   1° lat ≈ 111.32 km → 0.009° ≈ 1 km
#   1° lng ≈ 102.47 km → 0.00976° ≈ 1 km
# We use 0.01° spacing ≈ 1.1 km grid cells

GRID_CONFIG = {
    "Ahmedabad": {
        "min_lat": 22.95,
        "max_lat": 23.10,
        "min_lng": 72.45,
        "max_lng": 72.70,
        "step_deg": 0.01,       # ~1.1 km at this latitude
        "step_km": 1.1,
        "center": [23.0225, 72.5714],
    }
}


def get_grid(city: str = "Ahmedabad") -> tuple[np.ndarray, np.ndarray]:
    """
    Generate the harmonized lat/lng grid for a city.
    Returns (lats_1d, lngs_1d) arrays.
    """
    cfg = GRID_CONFIG.get(city, GRID_CONFIG["Ahmedabad"])
    lats = np.arange(cfg["min_lat"], cfg["max_lat"] + cfg["step_deg"] / 2, cfg["step_deg"])
    lngs = np.arange(cfg["min_lng"], cfg["max_lng"] + cfg["step_deg"] / 2, cfg["step_deg"])
    return np.round(lats, 4), np.round(lngs, 4)


def get_grid_points(city: str = "Ahmedabad") -> list[tuple[float, float]]:
    """Return all (lat, lng) grid points as a flat list."""
    lats, lngs = get_grid(city)
    return [(float(lat), float(lng)) for lat in lats for lng in lngs]


def get_grid_info(city: str = "Ahmedabad") -> dict:
    """Return metadata about the harmonized grid."""
    cfg = GRID_CONFIG.get(city, GRID_CONFIG["Ahmedabad"])
    lats, lngs = get_grid(city)
    return {
        "city": city,
        "bbox": {
            "min_lat": cfg["min_lat"],
            "max_lat": cfg["max_lat"],
            "min_lng": cfg["min_lng"],
            "max_lng": cfg["max_lng"],
        },
        "resolution_deg": cfg["step_deg"],
        "resolution_km": cfg["step_km"],
        "grid_rows": len(lats),
        "grid_cols": len(lngs),
        "total_cells": len(lats) * len(lngs),
        "center": cfg["center"],
    }


def harmonize_to_grid(
    data_points: list[dict],
    city: str = "Ahmedabad",
    value_key: str = "value",
    method: str = "idw",
    power: float = 2.0,
    max_radius_deg: float = 0.05,
) -> list[dict]:
    """
    Harmonize irregular satellite data points onto the common 1 km grid.

    This is the core harmonization function. It takes raw satellite observations
    (which may be on different grids depending on the mission) and interpolates
    them onto our fixed 1 km grid using Inverse Distance Weighting.

    Args:
        data_points: list of {"lat": float, "lng": float, "value": float, ...}
        city: city name for grid lookup
        value_key: which field holds the measurement value
        method: interpolation method ("idw" or "nearest")
        power: IDW power parameter (higher = more local)
        max_radius_deg: maximum search radius in degrees (~5.5 km at 0.05°)

    Returns:
        list of {"lat": float, "lng": float, "value": float} on the common grid
    """
    if not data_points:
        return []

    # Extract source coordinates and values
    src_lats = np.array([d["lat"] for d in data_points])
    src_lngs = np.array([d["lng"] for d in data_points])
    src_vals = np.array([d[value_key] for d in data_points])

    # Get target grid
    grid_lats, grid_lngs = get_grid(city)

    result = []
    for glat in grid_lats:
        for glng in grid_lngs:
            # Compute distances from this grid point to all source points
            dlat = src_lats - glat
            dlng = src_lngs - glng
            dists = np.sqrt(dlat**2 + dlng**2)

            # Filter to points within search radius
            mask = dists <= max_radius_deg
            if not np.any(mask):
                continue  # No data near this grid cell — skip (data gap)

            nearby_dists = dists[mask]
            nearby_vals = src_vals[mask]

            if method == "nearest":
                # Nearest neighbor
                idx = np.argmin(nearby_dists)
                value = float(nearby_vals[idx])
            else:
                # Inverse Distance Weighting
                # Handle exact matches (distance = 0)
                exact = nearby_dists < 1e-10
                if np.any(exact):
                    value = float(np.mean(nearby_vals[exact]))
                else:
                    weights = 1.0 / (nearby_dists ** power)
                    value = float(np.sum(weights * nearby_vals) / np.sum(weights))

            result.append({
                "lat": float(glat),
                "lng": float(glng),
                "value": round(value, 6),
            })

    logger.info(
        f"Harmonized {len(data_points)} source points -> {len(result)} grid cells "
        f"({city}, {method}, {GRID_CONFIG.get(city, GRID_CONFIG['Ahmedabad'])['step_km']} km)"
    )
    return result


def harmonize_timeseries(
    data_points: list[dict],
    city: str = "Ahmedabad",
    parameter: str = "",
) -> list[dict]:
    """
    Harmonize a full time-series dataset (multiple dates) onto the common grid.

    Groups data by date, harmonizes each date's spatial data independently,
    then recombines into a single time-series list.

    Args:
        data_points: list of {"date": str, "lat": float, "lng": float, "value": float, "parameter": str}
        city: city name
        parameter: parameter name (passed through to output)

    Returns:
        Harmonized list with same structure, but all points on the common grid.
    """
    if not data_points:
        return []

    # Group by date
    by_date = {}
    for d in data_points:
        date = d.get("date", "unknown")
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(d)

    # Harmonize each date
    result = []
    for date, points in sorted(by_date.items()):
        harmonized = harmonize_to_grid(points, city=city)
        for h in harmonized:
            result.append({
                "date": date,
                "lat": h["lat"],
                "lng": h["lng"],
                "value": h["value"],
                "parameter": parameter or data_points[0].get("parameter", ""),
            })

    logger.info(
        f"Harmonized time-series: {len(data_points)} raw -> {len(result)} grid points "
        f"across {len(by_date)} dates"
    )
    return result


def compute_grid_statistics(harmonized_data: list[dict]) -> dict:
    """Compute spatial statistics on harmonized grid data."""
    if not harmonized_data:
        return {}

    values = np.array([d["value"] for d in harmonized_data])
    return {
        "count": len(values),
        "mean": round(float(np.mean(values)), 4),
        "std": round(float(np.std(values)), 4),
        "min": round(float(np.min(values)), 4),
        "max": round(float(np.max(values)), 4),
        "median": round(float(np.median(values)), 4),
        "p25": round(float(np.percentile(values, 25)), 4),
        "p75": round(float(np.percentile(values, 75)), 4),
    }

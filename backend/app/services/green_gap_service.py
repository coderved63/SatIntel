"""
Green Infrastructure Gap Analysis Service.
Identifies optimal tree plantation sites using NDVI-LST regression.
"""
import json
import logging
import numpy as np
from pathlib import Path
from app.ml.ndvi_lst_regression import NDVILSTRegression
from app.services import satellite_service

logger = logging.getLogger(__name__)

SPECIES_MAP = {
    "critical": "Peepal (Ficus religiosa), Banyan (Ficus benghalensis), Neem (Azadirachta indica)",
    "high": "Gulmohar (Delonix regia), Rain Tree (Samanea saman), Arjun (Terminalia arjuna)",
    "moderate": "Jamun (Syzygium cumini), Amla (Phyllanthus emblica), Teak (Tectona grandis)",
}

TARGET_NDVI = 0.35
MIN_NDVI_THRESHOLD = 0.15


def _get_species(priority_score: float) -> str:
    if priority_score >= 70:
        return SPECIES_MAP["critical"]
    if priority_score >= 40:
        return SPECIES_MAP["high"]
    return SPECIES_MAP["moderate"]


def analyse(city: str = "ahmedabad") -> dict:
    """Run green infrastructure gap analysis for a city."""
    # Load spatial data — use latest date from time-series
    ndvi_data = satellite_service._load_data("NDVI", city)
    lst_data = satellite_service._load_data("LST", city)

    if not ndvi_data or not lst_data:
        return {"city": city, "error": "No NDVI or LST data available"}

    # Get latest date for spatial snapshot
    ndvi_dates = sorted(set(d["date"] for d in ndvi_data))
    lst_dates = sorted(set(d["date"] for d in lst_data))
    ndvi_latest = ndvi_dates[-1] if ndvi_dates else None
    lst_latest = lst_dates[-1] if lst_dates else None

    ndvi_spatial = [d for d in ndvi_data if d["date"] == ndvi_latest]
    lst_spatial = [d for d in lst_data if d["date"] == lst_latest]

    # Build coordinate maps (round to 0.01 for matching)
    ndvi_map = {}
    for d in ndvi_spatial:
        key = (round(d["lat"], 2), round(d["lng"], 2))
        ndvi_map[key] = d["value"]

    lst_map = {}
    for d in lst_spatial:
        key = (round(d["lat"], 2), round(d["lng"], 2))
        lst_map[key] = d["value"]

    # Load land use
    try:
        lu_change = satellite_service.get_land_use_change(city)
        land_data = lu_change.get("data_2024", [])
    except:
        land_data = []

    land_map = {}
    for d in land_data:
        key = (round(d["lat"], 2), round(d["lng"], 2))
        land_map[key] = d.get("class_label", "unknown")

    # Build matched pairs for regression
    matched_pairs = []
    for coord, ndvi_val in ndvi_map.items():
        lst_val = lst_map.get(coord)
        if lst_val is not None:
            matched_pairs.append((ndvi_val, lst_val))

    # Fit regression
    regression = NDVILSTRegression()
    regression_stats = regression.fit(matched_pairs)

    # City statistics
    all_lst = list(lst_map.values())
    all_ndvi = list(ndvi_map.values())
    mean_lst = float(np.mean(all_lst)) if all_lst else 30.0
    mean_ndvi = float(np.mean(all_ndvi)) if all_ndvi else 0.2

    # Score candidate cells
    all_candidates = []

    # Use all coords from ndvi_map (harmonized grid)
    for coord in ndvi_map:
        ndvi_val = ndvi_map.get(coord, 0.0)
        lst_val = lst_map.get(coord, mean_lst)
        land_class = land_map.get(coord, "urban")

        # Skip water and dense vegetation
        if land_class in ("water", "dense_vegetation"):
            continue

        # Only cells with low vegetation AND above-average heat
        if ndvi_val >= MIN_NDVI_THRESHOLD and lst_val <= mean_lst:
            continue

        # Priority score (0-100)
        heat_score = min(max((lst_val - mean_lst) / 5.0, 0), 1.0) * 50
        veg_gap = min(max((MIN_NDVI_THRESHOLD - ndvi_val) / MIN_NDVI_THRESHOLD, 0), 1.0) * 30
        area_score = 20 if land_class in ("urban", "urban_barren") else 10
        priority = round(heat_score + veg_gap + area_score, 1)

        cooling = regression.project_cooling(ndvi_val, TARGET_NDVI)

        severity = "critical" if priority >= 70 else ("high" if priority >= 40 else "moderate")

        all_candidates.append({
            "lat": coord[0],
            "lng": coord[1],
            "current_ndvi": round(ndvi_val, 4),
            "current_lst": round(lst_val, 1),
            "land_class": land_class,
            "priority_score": priority,
            "projected_cooling": cooling,
            "projected_new_lst": round(lst_val - cooling, 1),
            "recommended_species": _get_species(priority),
            "severity": severity,
        })

    # Sort by priority
    all_candidates.sort(key=lambda c: c["priority_score"], reverse=True)
    top_50 = all_candidates[:50]

    # Summary
    if top_50:
        avg_cooling = round(sum(c["projected_cooling"] for c in top_50) / len(top_50), 2)
        max_cooling = round(max(c["projected_cooling"] for c in top_50), 2)
        critical_count = sum(1 for c in top_50 if c["severity"] == "critical")
    else:
        avg_cooling = 0.0
        max_cooling = 0.0
        critical_count = 0

    return {
        "city": city,
        "regression": regression_stats,
        "city_mean_lst": round(mean_lst, 1),
        "city_mean_ndvi": round(mean_ndvi, 4),
        "total_candidate_cells": len(all_candidates),
        "critical_sites": critical_count,
        "avg_projected_cooling": avg_cooling,
        "max_projected_cooling": max_cooling,
        "top_50_sites": top_50,
        "all_candidates": all_candidates[:200],
    }

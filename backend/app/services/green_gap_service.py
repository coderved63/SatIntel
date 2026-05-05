"""
Green infrastructure gap analysis with explicit evidence metadata.
"""
from __future__ import annotations

import logging

import numpy as np

from app.ml.ndvi_lst_regression import NDVILSTRegression
from app.services import evidence_service, satellite_service

logger = logging.getLogger(__name__)

SPECIES_MAP = {
    "critical": "Peepal (Ficus religiosa), Banyan (Ficus benghalensis), Neem (Azadirachta indica)",
    "high": "Gulmohar (Delonix regia), Rain Tree (Samanea saman), Arjun (Terminalia arjuna)",
    "moderate": "Jamun (Syzygium cumini), Amla (Phyllanthus emblica), Teak (Tectona grandis)",
}
TARGET_NDVI = 0.45
MIN_NDVI_THRESHOLD = 0.15
WARM_SEASON_MONTHS = {3, 4, 5, 6}


def _get_species(priority_score: float) -> str:
    if priority_score >= 70:
        return SPECIES_MAP["critical"]
    if priority_score >= 40:
        return SPECIES_MAP["high"]
    return SPECIES_MAP["moderate"]


def _coord_key(lat: float, lng: float) -> tuple[float, float]:
    return (round(float(lat), 2), round(float(lng), 2))


def _year(date_value: str) -> int:
    try:
        return int(str(date_value)[:4])
    except Exception:
        return 0


def _month(date_value: str) -> int:
    try:
        return int(str(date_value)[5:7])
    except Exception:
        return 0


def _latest_year(*datasets: list[dict]) -> int:
    years = []
    for dataset in datasets:
        years.extend(_year(item.get("date", "")) for item in dataset)
    return max(years) if years else 0


def _aggregate_spatial(data: list[dict], min_year: int = 0, months: set[int] | None = None) -> dict:
    grouped = {}
    for item in data:
        year = _year(item.get("date", ""))
        month = _month(item.get("date", ""))
        if min_year and year < min_year:
            continue
        if months and month not in months:
            continue
        key = _coord_key(item["lat"], item["lng"])
        current = grouped.setdefault(key, {"sum": 0.0, "count": 0})
        current["sum"] += float(item["value"])
        current["count"] += 1
    return {key: current["sum"] / current["count"] for key, current in grouped.items() if current["count"] > 0}


def _nearest_land_class(coord: tuple[float, float], land_points: list[dict]) -> str:
    if not land_points:
        return "unknown"
    lat, lng = coord
    best = None
    best_dist = float("inf")
    for point in land_points:
        dist = (lat - float(point["lat"])) ** 2 + (lng - float(point["lng"])) ** 2
        if dist < best_dist:
            best_dist = dist
            best = point
    if best is None or best_dist > 0.06 ** 2:
        return "unknown"
    return best.get("class_label", "unknown")


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def analyse(city: str = "ahmedabad", date_range: dict | None = None) -> dict:
    resolved = evidence_service.resolve_date_range(date_range, default_window="green_gap")
    ndvi_data = evidence_service.filter_by_date_range(satellite_service._load_data("NDVI", city), resolved)
    lst_data = evidence_service.filter_by_date_range(satellite_service._load_data("LST", city), resolved)
    if not ndvi_data or not lst_data:
        return {"city": city, "error": "No NDVI or LST data available", "analysis_window": resolved}

    latest_year = _latest_year(ndvi_data, lst_data)
    min_year = max(2020, latest_year - 2) if latest_year else 0
    ndvi_map = _aggregate_spatial(ndvi_data, min_year, WARM_SEASON_MONTHS)
    lst_map = _aggregate_spatial(lst_data, min_year, WARM_SEASON_MONTHS)
    if len(ndvi_map) < 25 or len(lst_map) < 25:
        ndvi_map = _aggregate_spatial(ndvi_data)
        lst_map = _aggregate_spatial(lst_data)

    try:
        land_data = satellite_service.get_land_use_change(city).get("data_2024", [])
    except Exception:
        land_data = []

    matched_pairs = [(ndvi_value, lst_map[coord]) for coord, ndvi_value in ndvi_map.items() if coord in lst_map]
    regression = NDVILSTRegression()
    regression_stats = regression.fit(matched_pairs)

    all_lst = list(lst_map.values())
    all_ndvi = list(ndvi_map.values())
    mean_lst = float(np.mean(all_lst)) if all_lst else 30.0
    std_lst = float(np.std(all_lst)) if len(all_lst) > 1 else 1.0
    mean_ndvi = float(np.mean(all_ndvi)) if all_ndvi else 0.2

    candidates = []
    for coord in ndvi_map:
        ndvi_value = ndvi_map.get(coord, 0.0)
        lst_value = lst_map.get(coord, mean_lst)
        land_class = _nearest_land_class(coord, land_data)
        if land_class in ("water", "dense_vegetation"):
            continue
        ndvi_gap = TARGET_NDVI - ndvi_value
        if ndvi_gap <= 0.01:
            continue
        cooling = regression.project_cooling(ndvi_value, TARGET_NDVI)
        if cooling <= 0.05:
            continue
        heat_excess = lst_value - mean_lst
        if heat_excess < 0.25 and ndvi_value >= MIN_NDVI_THRESHOLD:
            continue
        heat_score = _clamp(heat_excess / max(std_lst * 1.5, 1.0), 0, 1) * 40
        veg_score = _clamp(ndvi_gap / TARGET_NDVI, 0, 1) * 30
        cooling_score = _clamp(cooling / 2.0, 0, 1) * 15
        area_score = 15 if land_class in ("urban", "urban_barren", "unknown") else 10
        priority = round(_clamp(heat_score + veg_score + cooling_score + area_score, 0, 100), 1)
        severity = "critical" if priority >= 70 else ("high" if priority >= 45 else "moderate")
        candidate = evidence_service.enrich_coordinate(city, {
            "lat": coord[0],
            "lng": coord[1],
            "current_ndvi": round(ndvi_value, 4),
            "current_lst": round(lst_value, 1),
            "land_class": land_class,
            "target_ndvi": TARGET_NDVI,
            "ndvi_gap": round(ndvi_gap, 4),
            "heat_excess_celsius": round(heat_excess, 2),
            "priority_score": priority,
            "projected_cooling": cooling,
            "projected_new_lst": round(lst_value - cooling, 1),
            "recommended_species": _get_species(priority),
            "severity": severity,
        })
        candidates.append(candidate)

    candidates.sort(key=lambda item: item["priority_score"], reverse=True)
    top_50 = candidates[:50]
    avg_cooling = round(sum(item["projected_cooling"] for item in top_50) / len(top_50), 2) if top_50 else 0.0
    max_cooling = round(max((item["projected_cooling"] for item in top_50), default=0.0), 2)
    critical_count = sum(1 for item in top_50 if item["severity"] == "critical")

    return {
        **evidence_service.standard_evidence_block(
            city=city,
            parameters=["NDVI", "LST"],
            date_range=resolved,
            methodology="Warm-season spatial averaging plus NDVI-LST regression to estimate cooling benefit from greening uplift.",
            interpretation="Candidate sites are places where low vegetation and elevated surface heat suggest high potential cooling benefit from planting.",
            limitations="Cooling values are modeled projections from the NDVI-LST relationship and should be treated as planning estimates rather than guaranteed outcomes.",
            spatial_basis="Recent warm-season harmonized NDVI and LST grid-cell surfaces.",
            confidence="Moderate confidence for prioritizing candidate zones; projected cooling should be field-validated before budgeting.",
            default_window="green_gap",
        ),
        "city": city,
        "regression": regression_stats,
        "city_mean_lst": round(mean_lst, 1),
        "city_mean_ndvi": round(mean_ndvi, 4),
        "target_ndvi": TARGET_NDVI,
        "analysis_period": f"{min_year}-{latest_year} warm season (Mar-Jun)" if latest_year else "all available observations",
        "total_candidate_cells": len(candidates),
        "critical_sites": critical_count,
        "avg_projected_cooling": avg_cooling,
        "max_projected_cooling": max_cooling,
        "top_50_sites": top_50,
        "all_candidates": candidates[:200],
        "candidate_screening_rules": [
            "Exclude water and dense vegetation cells.",
            "Require a real NDVI gap to the target greening state.",
            "Filter out negligible modeled cooling impacts.",
            "Prioritize cells with both heat excess and vegetation deficit.",
        ],
    }

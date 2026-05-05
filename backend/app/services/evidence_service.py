"""
Shared evidence and temporal-context helpers.
Keeps analytical responses explicit about date windows, coverage, freshness, and
human-readable coordinate labels.
"""
from __future__ import annotations

from datetime import datetime
from math import sqrt
from typing import Iterable

from app.services import satellite_service


DEFAULT_WINDOWS = {
    "dashboard": ("2024-01-01", "2026-03-22"),
    "analytics": ("2023-01-01", "2026-03-22"),
    "action_plan": ("2023-01-01", "2026-03-22"),
    "green_gap": ("2023-01-01", "2026-03-22"),
    "research": ("2020-01-01", "2026-03-22"),
    "time_machine": ("2023-01-01", "2026-03-22"),
}


def _safe_date(value: str | None, fallback: str) -> str:
    if not value:
        return fallback
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        return fallback


def resolve_date_range(date_range: dict | None = None, default_window: str = "analytics") -> dict:
    default_start, default_end = DEFAULT_WINDOWS.get(default_window, DEFAULT_WINDOWS["analytics"])
    date_range = date_range or {}
    start_date = _safe_date(date_range.get("start_date"), default_start)
    end_date = _safe_date(date_range.get("end_date"), default_end)
    if start_date > end_date:
        start_date, end_date = end_date, start_date
    return {
        "start_date": start_date,
        "end_date": end_date,
        "display_window_label": f"{start_date} to {end_date}",
    }


def filter_by_date_range(data: list[dict], date_range: dict | None = None) -> list[dict]:
    if not data:
        return []
    resolved = resolve_date_range(date_range)
    start_date = resolved["start_date"]
    end_date = resolved["end_date"]
    return [item for item in data if start_date <= str(item.get("date", "")) <= end_date]


def summarize_coverage(data: list[dict]) -> dict:
    if not data:
        return {
            "start_date": None,
            "end_date": None,
            "sample_count": 0,
            "timestamp_count": 0,
            "latest_observation_date": None,
        }

    dates = sorted({str(item.get("date", "")) for item in data if item.get("date")})
    return {
        "start_date": dates[0] if dates else None,
        "end_date": dates[-1] if dates else None,
        "sample_count": len(data),
        "timestamp_count": len(dates),
        "latest_observation_date": dates[-1] if dates else None,
    }


def get_city_area_label(city: str, lat: float, lng: float) -> str:
    from app.utils.cities import get_city

    cfg = get_city(city)
    notable_areas = cfg.get("notable_areas", [])
    center = cfg.get("center", [lat, lng])
    if not notable_areas:
        return f"Near {cfg.get('name', city.title())} urban area"

    lat_offset = lat - center[0]
    lng_offset = lng - center[1]
    east = lng_offset >= 0
    north = lat_offset >= 0

    if east and north:
        preferred = notable_areas[:2]
    elif east:
        preferred = notable_areas[1:3] or notable_areas[:1]
    elif north:
        preferred = notable_areas[2:4] or notable_areas[:1]
    else:
        preferred = notable_areas[3:5] or notable_areas[:1]
    return preferred[0] if preferred else f"Near {cfg.get('name', city.title())} urban area"


def enrich_coordinate(city: str, item: dict, lat_key: str = "lat", lng_key: str = "lng") -> dict:
    lat = item.get(lat_key)
    lng = item.get(lng_key)
    if lat is None or lng is None:
        return item
    enriched = dict(item)
    enriched["area_label"] = get_city_area_label(city, float(lat), float(lng))
    return enriched


def build_parameter_coverage(city: str, parameters: Iterable[str], date_range: dict | None = None) -> dict:
    coverage = {}
    resolved = resolve_date_range(date_range)
    for parameter in parameters:
        filtered = filter_by_date_range(satellite_service._load_data(parameter, city), resolved)
        meta = satellite_service.PARAMETERS.get(parameter, {})
        coverage[parameter] = {
            **summarize_coverage(filtered),
            "parameter": parameter,
            "name": meta.get("name", parameter),
            "unit": meta.get("unit", ""),
            "source": meta.get("source", ""),
            "resolution": meta.get("resolution", ""),
            "frequency": meta.get("frequency", ""),
        }
    return coverage


def build_parameter_availability(city: str, parameters: Iterable[str]) -> dict:
    availability = {}
    for parameter in parameters:
        data = satellite_service._load_data(parameter, city)
        meta = satellite_service.PARAMETERS.get(parameter, {})
        availability[parameter] = {
            **summarize_coverage(data),
            "parameter": parameter,
            "name": meta.get("name", parameter),
            "unit": meta.get("unit", ""),
            "source": meta.get("source", ""),
            "resolution": meta.get("resolution", ""),
            "frequency": meta.get("frequency", ""),
        }
    return availability


def build_analysis_context(
    city: str,
    parameters: Iterable[str],
    date_range: dict | None = None,
    default_window: str = "analytics",
) -> dict:
    from app.services import cache_service

    resolved = resolve_date_range(date_range, default_window=default_window)
    coverage_summary = build_parameter_coverage(city, parameters, resolved)
    availability_summary = build_parameter_availability(city, parameters)
    data_freshness = {
        "last_synced": cache_service.get_last_synced() or "2026-03-22T02:00:00",
        "latest_available_by_parameter": {
            parameter: coverage.get("latest_observation_date")
            for parameter, coverage in availability_summary.items()
        },
        "available_coverage_by_parameter": availability_summary,
    }
    return {
        "city": city,
        "analysis_window": {
            "start_date": resolved["start_date"],
            "end_date": resolved["end_date"],
        },
        "display_window_label": resolved["display_window_label"],
        "coverage_summary": coverage_summary,
        "data_freshness": data_freshness,
    }


def standard_evidence_block(
    *,
    city: str,
    parameters: Iterable[str],
    date_range: dict | None,
    methodology: str,
    interpretation: str,
    limitations: str,
    spatial_basis: str,
    confidence: str | None = None,
    default_window: str = "analytics",
) -> dict:
    context = build_analysis_context(city, parameters, date_range, default_window=default_window)
    return {
        **context,
        "methodology": methodology,
        "interpretation": interpretation,
        "limitations": limitations,
        "spatial_basis": spatial_basis,
        "confidence": confidence or "Operational screening evidence; validate with field observations for enforcement decisions.",
        "data_coverage": context["coverage_summary"],
    }

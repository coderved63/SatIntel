"""
Environmental Time Machine comparisons with explicit comparison-window metadata.
"""
from __future__ import annotations

from collections import defaultdict

import numpy as np

from app.services import evidence_service, satellite_service

PARAM_META = {
    "LST": {"label": "Surface Temperature", "unit": "°C", "scale": "temperature"},
    "NDVI": {"label": "Vegetation (NDVI)", "unit": "0-1", "scale": "vegetation"},
    "NO2": {"label": "NO2 Pollution", "unit": "mol/m²", "scale": "pollution"},
    "SO2": {"label": "SO2 Pollution", "unit": "mol/m²", "scale": "pollution"},
    "CO": {"label": "Carbon Monoxide", "unit": "mol/m²", "scale": "pollution"},
    "SOIL_MOISTURE": {"label": "Soil Moisture", "unit": "m³/m³", "scale": "moisture"},
    "LAND_USE": {"label": "Land Use Change", "unit": "class", "scale": "landuse"},
}


def _timeseries_to_yearly_grids(data, year_a="2023", year_b="2024"):
    cells_a = defaultdict(list)
    cells_b = defaultdict(list)
    for point in data:
        key = (round(point["lat"], 4), round(point["lng"], 4))
        date = str(point.get("date", ""))
        value = point.get("value")
        if value is None:
            continue
        if date.startswith(year_a):
            cells_a[key].append(float(value))
        elif date.startswith(year_b):
            cells_b[key].append(float(value))
    grid_a = [{"lat": key[0], "lng": key[1], "value": round(float(np.mean(values)), 4)} for key, values in cells_a.items() if values]
    grid_b = [{"lat": key[0], "lng": key[1], "value": round(float(np.mean(values)), 4)} for key, values in cells_b.items() if values]
    return grid_a, grid_b


def get_comparison(param: str, city: str = "ahmedabad", date_range: dict | None = None) -> dict:
    meta = PARAM_META.get(param, {"label": param, "unit": "", "scale": "default"})
    if param == "LAND_USE":
        land_use_change = satellite_service.get_land_use_change(city)
        class_map = {"water": 0, "sparse_vegetation": 1, "dense_vegetation": 2, "urban": 3, "urban_barren": 3}

        def encode(points):
            return [{"lat": point["lat"], "lng": point["lng"], "value": class_map.get(point.get("class_label", ""), 2), "class_label": point.get("class_label", "")} for point in points]

        return {
            **evidence_service.standard_evidence_block(
                city=city,
                parameters=["LAND_USE"],
                date_range=land_use_change.get("analysis_window"),
                methodology="Direct comparison of annual land-use composites.",
                interpretation="The time machine compares annual land-use classes, not day-specific satellite scenes.",
                limitations="Annual composites smooth intra-year changes and emphasize structural land-cover change.",
                spatial_basis="Annual land-use classification grids.",
                confidence="Moderate confidence for long-horizon land-cover change.",
                default_window="time_machine",
            ),
            "param": param,
            "meta": meta,
            "city": city,
            "year_a": "2020",
            "year_b": "2024",
            "grid_a": encode(land_use_change.get("data_2020", [])),
            "grid_b": encode(land_use_change.get("data_2024", [])),
            "comparison_basis": "Annual composites",
        }

    resolved = evidence_service.resolve_date_range(date_range, default_window="time_machine")
    data = evidence_service.filter_by_date_range(satellite_service._load_data(param, city), resolved)
    if not data:
        return {"error": f"No data for {param}/{city}", "param": param, "meta": meta, "city": city, "grid_a": [], "grid_b": [], "analysis_window": resolved}

    grid_a, grid_b = _timeseries_to_yearly_grids(data, "2023", "2024")
    if not grid_a and not grid_b:
        grid_a, grid_b = _timeseries_to_yearly_grids(evidence_service.filter_by_date_range(satellite_service._load_raw(param, city), resolved), "2023", "2024")

    a_vals = [point["value"] for point in grid_a]
    b_vals = [point["value"] for point in grid_b]
    avg_change = round(float(np.mean(b_vals)) - float(np.mean(a_vals)), 4) if a_vals and b_vals else 0
    map_a = {(round(point["lat"], 4), round(point["lng"], 4)): point["value"] for point in grid_a}
    cell_changes = []
    for point in grid_b:
        key = (round(point["lat"], 4), round(point["lng"], 4))
        value_a = map_a.get(key)
        if value_a is None:
            continue
        cell_changes.append({
            "lat": key[0],
            "lng": key[1],
            "value_2023": round(value_a, 4),
            "value_2024": round(point["value"], 4),
            "change": round(point["value"] - value_a, 4),
        })
    cell_changes.sort(key=lambda cell: cell["change"])
    invert = param in ("NDVI", "SOIL_MOISTURE")
    top_worsened = cell_changes[:5] if invert else cell_changes[-5:][::-1]
    top_improved = cell_changes[-5:][::-1] if invert else cell_changes[:5]

    zones = {
        "City Core": {"lat": (23.00, 23.06), "lng": (72.53, 72.62)},
        "Industrial East": {"lat": (22.90, 23.00), "lng": (72.60, 72.70)},
        "Western Suburbs": {"lat": (23.00, 23.06), "lng": (72.40, 72.53)},
        "North": {"lat": (23.06, 23.20), "lng": (72.40, 72.70)},
        "South": {"lat": (22.90, 23.00), "lng": (72.40, 72.60)},
    }
    zone_changes = []
    for zone_name, bounds in zones.items():
        zone_cells = [cell for cell in cell_changes if bounds["lat"][0] <= cell["lat"] <= bounds["lat"][1] and bounds["lng"][0] <= cell["lng"] <= bounds["lng"][1]]
        if zone_cells:
            zone_changes.append({"zone": zone_name, "avg_change": round(float(np.mean([cell["change"] for cell in zone_cells])), 4), "cells": len(zone_cells)})
    zone_changes.sort(key=lambda zone: zone["avg_change"], reverse=not invert)
    worst_zone = zone_changes[0] if zone_changes else None
    best_zone = zone_changes[-1] if zone_changes else None

    insight_units = {
        "LST": {"worse": "Urban Heat Island intensifying", "better": "Cooling effect detected - possible greening", "unit": "°C"},
        "NDVI": {"worse": "Vegetation loss detected", "better": "Green cover recovery observed", "unit": "NDVI"},
        "NO2": {"worse": "Air pollution increasing", "better": "Air quality improving", "unit": "mol/m²"},
        "SO2": {"worse": "Industrial sulfur emissions rising", "better": "Sulfur pollution easing", "unit": "mol/m²"},
        "CO": {"worse": "Carbon monoxide rising", "better": "Carbon monoxide easing", "unit": "mol/m²"},
        "SOIL_MOISTURE": {"worse": "Soil drying increasing", "better": "Soil moisture improving", "unit": "m³/m³"},
    }
    insight = insight_units.get(param, {"worse": "Conditions changed", "better": "Conditions changed", "unit": ""})
    summary_parts = []
    if worst_zone:
        summary_parts.append(f"{worst_zone['zone']} changed by {abs(worst_zone['avg_change']):.3f} {insight['unit']}")
    if best_zone and best_zone != worst_zone:
        summary_parts.append(f"{best_zone['zone']} shifted by {abs(best_zone['avg_change']):.3f} {insight['unit']}")

    return {
        **evidence_service.standard_evidence_block(
            city=city,
            parameters=[param],
            date_range=resolved,
            methodology="Year-over-year comparison of per-cell yearly averages derived from harmonized observations.",
            interpretation="The time machine compares yearly average spatial surfaces rather than exact same-day snapshots.",
            limitations="Yearly averages smooth short-term spikes; use research mode for tighter time slicing.",
            spatial_basis="Per-cell yearly averages on the harmonized grid.",
            confidence="Moderate confidence for structural year-over-year comparison.",
            default_window="time_machine",
        ),
        "param": param,
        "meta": meta,
        "city": city,
        "year_a": "2023",
        "year_b": "2024",
        "grid_a": grid_a,
        "grid_b": grid_b,
        "avg_change": avg_change,
        "change_direction": "increased" if avg_change > 0 else "decreased",
        "top_worsened": top_worsened,
        "top_improved": top_improved,
        "zone_changes": zone_changes,
        "interpretation_detail": {
            "summary": ". ".join(summary_parts) if summary_parts else f"{meta['label']} changed by {avg_change} overall",
            "insight": insight["worse"] if (not invert and avg_change > 0) or (invert and avg_change < 0) else insight["better"],
            "severity": "critical" if a_vals and abs(avg_change) > np.std(a_vals) * 1.5 else ("warning" if a_vals and abs(avg_change) > np.std(a_vals) * 0.5 else "normal"),
        },
        "total_cells_compared": len(cell_changes),
        "comparison_basis": "Yearly averages within the selected global analysis window",
    }


def get_params():
    return [
        {"id": "LST", "label": "Surface Temperature"},
        {"id": "NDVI", "label": "Vegetation (NDVI)"},
        {"id": "NO2", "label": "NO2 Pollution"},
        {"id": "SOIL_MOISTURE", "label": "Soil Moisture"},
        {"id": "LAND_USE", "label": "Land Use Change"},
    ]

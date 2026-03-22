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

    # ── Change Analysis: per-cell diff ──────────────────────
    map_a = {(round(p["lat"], 4), round(p["lng"], 4)): p["value"] for p in grid_a}
    cell_changes = []
    for p in grid_b:
        key = (round(p["lat"], 4), round(p["lng"], 4))
        val_a = map_a.get(key)
        if val_a is not None:
            diff = round(p["value"] - val_a, 4)
            cell_changes.append({"lat": key[0], "lng": key[1], "value_2023": round(val_a, 4), "value_2024": round(p["value"], 4), "change": diff})

    cell_changes.sort(key=lambda c: c["change"])

    # For LST/NO2/SO2/CO — increase = worse. For NDVI/SOIL_MOISTURE — decrease = worse.
    invert = param in ("NDVI", "SOIL_MOISTURE")
    if invert:
        top_worsened = cell_changes[:5]  # most decreased = worst for NDVI
        top_improved = cell_changes[-5:][::-1]  # most increased = best
    else:
        top_worsened = cell_changes[-5:][::-1]  # most increased = worst for LST
        top_improved = cell_changes[:5]  # most decreased = best

    # ── Zone-level breakdown ────────────────────────────────
    ZONES = {
        "City Core": {"lat": (23.00, 23.06), "lng": (72.53, 72.62)},
        "Industrial East": {"lat": (22.90, 23.00), "lng": (72.60, 72.70)},
        "Western Suburbs": {"lat": (23.00, 23.06), "lng": (72.40, 72.53)},
        "North": {"lat": (23.06, 23.20), "lng": (72.40, 72.70)},
        "South": {"lat": (22.90, 23.00), "lng": (72.40, 72.60)},
    }
    zone_changes = []
    for zone_name, bounds in ZONES.items():
        zone_cells = [c for c in cell_changes
                      if bounds["lat"][0] <= c["lat"] <= bounds["lat"][1]
                      and bounds["lng"][0] <= c["lng"] <= bounds["lng"][1]]
        if zone_cells:
            zone_avg = round(float(np.mean([c["change"] for c in zone_cells])), 4)
            zone_changes.append({"zone": zone_name, "avg_change": zone_avg, "cells": len(zone_cells)})
    zone_changes.sort(key=lambda z: z["avg_change"], reverse=not invert)

    # ── Auto-generate interpretation ────────────────────────
    INSIGHTS = {
        "LST": {"worse": "Urban Heat Island intensifying", "better": "Cooling effect detected — possible greening", "unit": "°C"},
        "NDVI": {"worse": "Vegetation loss / deforestation detected", "better": "Green cover recovery observed", "unit": "NDVI"},
        "NO2": {"worse": "Air pollution increasing — industrial/traffic sources", "better": "Air quality improving", "unit": "mol/m²"},
        "SO2": {"worse": "Industrial SO₂ emissions rising", "better": "SO₂ levels declining", "unit": "mol/m²"},
        "CO": {"worse": "Carbon monoxide rising — combustion sources", "better": "CO levels declining", "unit": "mol/m²"},
        "SOIL_MOISTURE": {"worse": "Soil drying — drought stress increasing", "better": "Soil moisture improving", "unit": "m³/m³"},
    }
    insight = INSIGHTS.get(param, {"worse": "Conditions changed", "better": "Conditions changed", "unit": ""})

    worst_zone = zone_changes[0] if zone_changes else None
    best_zone = zone_changes[-1] if zone_changes else None

    summary_parts = []
    if worst_zone:
        direction = "heated" if param == "LST" else ("lost" if param == "NDVI" else "increased")
        summary_parts.append(f"{worst_zone['zone']} {direction} by {abs(worst_zone['avg_change']):.3f} {insight['unit']}")
    if best_zone and best_zone != worst_zone:
        direction = "cooled" if param == "LST" else ("recovered" if param == "NDVI" else "decreased")
        summary_parts.append(f"{best_zone['zone']} {direction} by {abs(best_zone['avg_change']):.3f} {insight['unit']}")

    interpretation = {
        "summary": ". ".join(summary_parts) if summary_parts else f"{meta['label']} changed by {avg_change} overall",
        "insight": insight["worse"] if (not invert and avg_change > 0) or (invert and avg_change < 0) else insight["better"],
        "severity": "critical" if abs(avg_change) > np.std(a_vals) * 1.5 else ("warning" if abs(avg_change) > np.std(a_vals) * 0.5 else "normal"),
    }

    logger.info(f"Time Machine {param}/{city}: A={len(grid_a)} pts, B={len(grid_b)} pts, change={avg_change}")

    return {
        "param": param, "meta": meta, "city": city,
        "year_a": "2023", "year_b": "2024",
        "grid_a": grid_a, "grid_b": grid_b,
        "avg_change": avg_change,
        "change_direction": "increased" if avg_change > 0 else "decreased",
        "top_worsened": top_worsened,
        "top_improved": top_improved,
        "zone_changes": zone_changes,
        "interpretation": interpretation,
        "total_cells_compared": len(cell_changes),
    }


def get_params():
    return [
        {"id": "LST", "label": "Surface Temperature"},
        {"id": "NDVI", "label": "Vegetation (NDVI)"},
        {"id": "NO2", "label": "NO2 Pollution"},
        {"id": "SOIL_MOISTURE", "label": "Soil Moisture"},
        {"id": "LAND_USE", "label": "Land Use Change"},
    ]

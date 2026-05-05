"""
Environmental health ranking score with explicit methodology and windowed inputs.
"""
from __future__ import annotations

import logging

from app.services import evidence_service, satellite_service

logger = logging.getLogger(__name__)

PARAM_CONFIG = {
    "LST": {
        "weight": 0.30,
        "ideal": 30.0,
        "tolerable": 35.0,
        "danger": 42.0,
        "direction": "lower_better",
        "label": "Surface heat stress",
    },
    "NDVI": {
        "weight": 0.25,
        "ideal": 0.45,
        "tolerable": 0.30,
        "danger": 0.15,
        "direction": "higher_better",
        "label": "Vegetation health",
    },
    "NO2": {
        "weight": 0.25,
        "ideal": 0.00004,
        "tolerable": 0.00007,
        "danger": 0.00012,
        "direction": "lower_better",
        "label": "Nitrogen dioxide load",
    },
    "SOIL_MOISTURE": {
        "weight": 0.20,
        "ideal": 0.24,
        "tolerable": 0.16,
        "danger": 0.08,
        "direction": "higher_better",
        "label": "Surface moisture resilience",
    },
}


def _score_value(value: float, config: dict) -> float:
    if config["direction"] == "lower_better":
        if value <= config["ideal"]:
            return 100.0
        if value >= config["danger"]:
            return 0.0
        if value <= config["tolerable"]:
            return 100 - ((value - config["ideal"]) / (config["tolerable"] - config["ideal"])) * 35
        return max(0.0, 65 - ((value - config["tolerable"]) / (config["danger"] - config["tolerable"])) * 65)

    if value >= config["ideal"]:
        return 100.0
    if value <= config["danger"]:
        return 0.0
    if value >= config["tolerable"]:
        return 65 + ((value - config["tolerable"]) / (config["ideal"] - config["tolerable"])) * 35
    return max(0.0, ((value - config["danger"]) / (config["tolerable"] - config["danger"])) * 65)


def _grade(score: float) -> dict:
    if score >= 80:
        return {"grade": "A", "label": "Strong environmental condition", "color": "#10B981"}
    if score >= 65:
        return {"grade": "B", "label": "Generally stable", "color": "#3B82F6"}
    if score >= 50:
        return {"grade": "C", "label": "Mixed condition", "color": "#F59E0B"}
    if score >= 35:
        return {"grade": "D", "label": "Stress emerging", "color": "#F97316"}
    return {"grade": "F", "label": "High intervention need", "color": "#EF4444"}


def calculate(city: str = "ahmedabad", date_range: dict | None = None) -> dict:
    resolved = evidence_service.resolve_date_range(date_range, default_window="dashboard")
    parameter_details = []

    for parameter, config in PARAM_CONFIG.items():
        try:
            stats = satellite_service.get_statistics(parameter, city, resolved)
            mean_value = stats.get("mean", 0.0)
            score = round(_score_value(mean_value, config), 1)
            grade = _grade(score)
            parameter_details.append({
                "parameter": parameter,
                "name": satellite_service.PARAMETERS.get(parameter, {}).get("name", parameter),
                "metric_label": config["label"],
                "mean_value": round(mean_value, 4),
                "unit": stats.get("unit", ""),
                "score": score,
                "weight": config["weight"],
                "weighted_score": round(score * config["weight"], 1),
                "grade": grade["grade"],
                "label": grade["label"],
                "color": grade["color"],
                "how_calculated": (
                    f"Mean {parameter} inside the active analysis window is scored against ideal ({config['ideal']}) "
                    f"and danger ({config['danger']}) reference thresholds."
                ),
                "data_coverage": stats.get("data_coverage", {}),
            })
        except Exception as exc:
            logger.warning(f"Could not score {parameter} for {city}: {exc}")
            parameter_details.append({
                "parameter": parameter,
                "name": parameter,
                "metric_label": config["label"],
                "mean_value": None,
                "unit": "",
                "score": 50.0,
                "weight": config["weight"],
                "weighted_score": round(50.0 * config["weight"], 1),
                "grade": "C",
                "label": "No data",
                "color": "#94A3B8",
                "how_calculated": "No valid observations were available, so a neutral fallback was used.",
                "data_coverage": {},
            })

    overall_score = round(sum(item["weighted_score"] for item in parameter_details), 1)
    overall_grade = _grade(overall_score)
    return {
        **evidence_service.standard_evidence_block(
            city=city,
            parameters=list(PARAM_CONFIG.keys()),
            date_range=resolved,
            methodology="Weighted composite of windowed LST, NDVI, NO2, and soil-moisture means against explicit reference thresholds.",
            interpretation="Higher scores indicate stronger environmental conditions within the selected analysis window.",
            limitations="This ranking is a screening composite, not a full sustainability index; it compresses multiple hazards into one score.",
            spatial_basis="City-level averages derived from harmonized parameter surfaces.",
            confidence="Moderate confidence for cross-city comparison inside the same time window and metric definition.",
            default_window="dashboard",
        ),
        "city": city,
        "overall_score": overall_score,
        "overall_grade": overall_grade["grade"],
        "overall_label": overall_grade["label"],
        "overall_color": overall_grade["color"],
        "parameter_scores": parameter_details,
        "interpretation_summary": (
            f"{city.title()} scores {overall_score}/100 for the active window. "
            f"The score is the weighted sum of heat, vegetation, NO2, and soil-moisture condition scores."
        ),
        "score_formula": "0.30*LST + 0.25*NDVI + 0.25*NO2 + 0.20*SOIL_MOISTURE after each metric is normalized to 0-100.",
    }

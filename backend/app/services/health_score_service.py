"""
Environmental Health Score — single 0-100 score per city.
Weighted composite of all environmental parameters.

Score interpretation:
  80-100: Excellent (green)
  60-79:  Good (blue)
  40-59:  Moderate (amber)
  20-39:  Poor (orange)
  0-19:   Critical (red)
"""
import logging
import numpy as np
from app.services import satellite_service

logger = logging.getLogger(__name__)

# Ideal ranges for each parameter (used for scoring)
PARAM_CONFIG = {
    "LST": {
        "weight": 0.25,
        "ideal_min": 20, "ideal_max": 35,  # comfortable range
        "danger_min": 10, "danger_max": 50,  # extreme range
        "invert": True,  # lower is better (within range)
    },
    "NDVI": {
        "weight": 0.25,
        "ideal_min": 0.3, "ideal_max": 0.8,  # healthy vegetation
        "danger_min": 0.0, "danger_max": 0.15,
        "invert": False,  # higher is better
    },
    "NO2": {
        "weight": 0.25,
        "ideal_min": 0.0, "ideal_max": 0.00005,  # low pollution
        "danger_min": 0.0, "danger_max": 0.00015,
        "invert": True,  # lower is better
    },
    "SOIL_MOISTURE": {
        "weight": 0.25,
        "ideal_min": 0.15, "ideal_max": 0.35,  # healthy range
        "danger_min": 0.05, "danger_max": 0.45,
        "invert": False,  # within range is better
    },
}


def _score_parameter(mean_value: float, config: dict) -> float:
    """Score a single parameter 0-100. Higher is better."""
    if config.get("invert"):
        # For LST and NO2 — lower values are better
        if mean_value <= config["ideal_max"]:
            return 100.0
        elif mean_value >= config["danger_max"]:
            return 0.0
        else:
            # Linear interpolation between ideal_max and danger_max
            range_size = config["danger_max"] - config["ideal_max"]
            excess = mean_value - config["ideal_max"]
            return max(0, 100 - (excess / range_size) * 100)
    else:
        # For NDVI and Soil Moisture — higher values are better
        if mean_value >= config["ideal_min"]:
            return min(100, (mean_value / config["ideal_max"]) * 100)
        elif mean_value <= config["danger_max"]:
            return max(0, (mean_value / config["ideal_min"]) * 100)
        else:
            return 50.0


def _get_grade(score: float) -> dict:
    """Get letter grade and color for a score."""
    if score >= 80:
        return {"grade": "A", "label": "Excellent", "color": "#10B981"}
    elif score >= 60:
        return {"grade": "B", "label": "Good", "color": "#3B82F6"}
    elif score >= 40:
        return {"grade": "C", "label": "Moderate", "color": "#F59E0B"}
    elif score >= 20:
        return {"grade": "D", "label": "Poor", "color": "#F97316"}
    else:
        return {"grade": "F", "label": "Critical", "color": "#EF4444"}


def calculate(city: str = "ahmedabad") -> dict:
    """Calculate Environmental Health Score for a city."""
    param_scores = {}
    param_details = []

    for param_id, config in PARAM_CONFIG.items():
        try:
            stats = satellite_service.get_statistics(param_id, city)
            mean_val = stats.get("mean", 0)
            score = round(_score_parameter(mean_val, config), 1)
            param_scores[param_id] = score

            grade_info = _get_grade(score)
            param_details.append({
                "parameter": param_id,
                "name": satellite_service.PARAMETERS.get(param_id, {}).get("name", param_id),
                "mean_value": round(mean_val, 4),
                "unit": stats.get("unit", ""),
                "score": score,
                "weight": config["weight"],
                "weighted_score": round(score * config["weight"], 1),
                "grade": grade_info["grade"],
                "label": grade_info["label"],
                "color": grade_info["color"],
            })
        except Exception as e:
            logger.warning(f"Could not score {param_id} for {city}: {e}")
            param_scores[param_id] = 50.0  # neutral fallback
            param_details.append({
                "parameter": param_id, "score": 50.0, "grade": "C",
                "label": "No data", "color": "#94A3B8", "weight": config["weight"],
                "weighted_score": 50.0 * config["weight"],
            })

    # Weighted composite score
    total_score = round(sum(d["weighted_score"] for d in param_details), 1)
    overall_grade = _get_grade(total_score)

    return {
        "city": city,
        "overall_score": total_score,
        "overall_grade": overall_grade["grade"],
        "overall_label": overall_grade["label"],
        "overall_color": overall_grade["color"],
        "parameter_scores": param_details,
        "interpretation": (
            f"{city.title()} scores {total_score}/100 — rated '{overall_grade['label']}'. "
            f"{'Immediate intervention recommended.' if total_score < 40 else 'Monitoring recommended.' if total_score < 60 else 'Environment is in acceptable condition.'}"
        ),
    }

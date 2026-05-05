"""
Environmental alert system.

Alerts are threshold-based screening outputs. Each alert includes the date,
value, threshold, and data window that triggered it so the frontend can show
why the warning exists.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime

from app.services import evidence_service, satellite_service

logger = logging.getLogger(__name__)


THRESHOLDS = {
    "LST": {
        "warning": 40.0,
        "critical": 45.0,
        "unit": "deg C",
        "basis": "daily maximum",
        "message_warning": "Heat stress warning - surface temperature exceeded 40 deg C",
        "message_critical": "Extreme heat warning - surface temperature exceeded 45 deg C",
    },
    "NDVI": {
        "warning": 0.15,
        "critical": 0.10,
        "unit": "index",
        "basis": "daily minimum",
        "inverted": True,
        "message_warning": "Vegetation stress warning - NDVI fell below 0.15",
        "message_critical": "Severe vegetation stress warning - NDVI fell below 0.10",
    },
    "NO2": {
        "warning": 0.0001,
        "critical": 0.00015,
        "unit": "mol/m^2",
        "basis": "daily maximum",
        "message_warning": "NO2 pollution warning - column density exceeded screening threshold",
        "message_critical": "High NO2 warning - column density exceeded critical screening threshold",
    },
    "SOIL_MOISTURE": {
        "warning": 0.10,
        "critical": 0.06,
        "unit": "m3/m3",
        "basis": "daily minimum",
        "inverted": True,
        "message_warning": "Low soil moisture warning - drought stress developing",
        "message_critical": "Severe soil moisture warning - drought stress screening threshold crossed",
    },
    "SO2": {
        "warning": 0.00005,
        "critical": 0.0001,
        "unit": "mol/m^2",
        "basis": "daily maximum",
        "message_warning": "SO2 warning - industrial emission screening threshold crossed",
        "message_critical": "High SO2 warning - critical screening threshold crossed",
    },
    "CO": {
        "warning": 0.03,
        "critical": 0.04,
        "unit": "mol/m^2",
        "basis": "daily maximum",
        "message_warning": "Elevated CO warning",
        "message_critical": "High CO warning - possible fire or heavy traffic event",
    },
}


def _daily_trigger(parameter: str, city: str, inverted: bool, date_range: dict | None) -> dict | None:
    resolved = evidence_service.resolve_date_range(date_range, default_window="dashboard")
    data = evidence_service.filter_by_date_range(satellite_service._load_data(parameter, city), resolved)
    if not data:
        return None

    date_values = defaultdict(list)
    date_points = defaultdict(list)
    for item in data:
        date_values[item["date"]].append(item["value"])
        date_points[item["date"]].append(item)

    daily_extremes = []
    for date, values in date_values.items():
        daily_extremes.append({
            "date": date,
            "value": min(values) if inverted else max(values),
            "mean": sum(values) / len(values),
            "sample_count": len(values),
        })

    trigger = min(daily_extremes, key=lambda item: item["value"]) if inverted else max(daily_extremes, key=lambda item: item["value"])
    points = date_points[trigger["date"]]
    trigger_point = min(points, key=lambda item: item["value"]) if inverted else max(points, key=lambda item: item["value"])

    return {
        **trigger,
        "lat": trigger_point.get("lat"),
        "lng": trigger_point.get("lng"),
        "analysis_window": resolved,
        "data_coverage": evidence_service.summarize_coverage(data),
    }


def _build_alert(parameter: str, level: str, config: dict, stats: dict, trigger: dict, threshold: float) -> dict:
    trigger_date = trigger.get("date")
    trigger_value = trigger.get("value")
    return {
        "parameter": parameter,
        "level": level,
        "message": config["message_critical"] if level == "critical" else config["message_warning"],
        "current_value": round(stats.get("mean", 0), 6),
        "trigger_value": round(trigger_value, 6),
        "trigger_date": trigger_date,
        "threshold": threshold,
        "max_value": round(stats.get("max", 0), 6),
        "min_value": round(stats.get("min", 0), 6),
        "unit": config["unit"],
        "basis": config["basis"],
        "sample_count": trigger.get("sample_count"),
        "location": {"lat": trigger.get("lat"), "lng": trigger.get("lng")},
        "analysis_window": trigger.get("analysis_window"),
        "data_coverage": trigger.get("data_coverage"),
        "justification": (
            f"{parameter} crossed the {threshold} {config['unit']} {level} screening threshold "
            f"on {trigger_date} using {config['basis']}."
        ),
        "timestamp": datetime.utcnow().isoformat(),
        "color": "#EF4444" if level == "critical" else "#F59E0B",
    }


def check_alerts(city: str = "ahmedabad", date_range: dict | None = None) -> dict:
    """Check parameters against thresholds and return date-backed warnings."""
    alerts = []
    summary = {"critical": 0, "warning": 0, "normal": 0}

    for parameter, config in THRESHOLDS.items():
        try:
            stats = satellite_service.get_statistics(parameter, city, date_range=date_range)
            if not stats:
                continue

            inverted = config.get("inverted", False)
            trigger = _daily_trigger(parameter, city, inverted, date_range)
            if not trigger:
                continue

            value = trigger["value"]
            if inverted:
                is_critical = value <= config["critical"]
                is_warning = value <= config["warning"] and not is_critical
            else:
                is_critical = value >= config["critical"]
                is_warning = value >= config["warning"] and not is_critical

            if is_critical:
                alerts.append(_build_alert(parameter, "critical", config, stats, trigger, config["critical"]))
                summary["critical"] += 1
            elif is_warning:
                alerts.append(_build_alert(parameter, "warning", config, stats, trigger, config["warning"]))
                summary["warning"] += 1
            else:
                summary["normal"] += 1
        except Exception as exc:
            logger.warning(f"Alert check failed for {parameter}/{city}: {exc}")

    alerts.sort(key=lambda alert: (0 if alert["level"] == "critical" else 1, alert["parameter"]))
    return {
        "city": city,
        "alerts": alerts,
        "total_alerts": len(alerts),
        "summary": summary,
        "status": "critical" if summary["critical"] > 0 else ("warning" if summary["warning"] > 0 else "normal"),
        "checked_at": datetime.utcnow().isoformat(),
    }

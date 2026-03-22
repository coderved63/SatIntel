"""
Environmental Alert System — threshold-based monitoring.
Generates alerts when satellite parameters exceed safe limits.
"""
import logging
from datetime import datetime
from app.services import satellite_service

logger = logging.getLogger(__name__)

# Alert thresholds per parameter
THRESHOLDS = {
    "LST": {
        "warning": 40.0,    # °C
        "critical": 45.0,
        "unit": "°C",
        "message_warning": "Heat stress warning — surface temperature exceeds 40°C",
        "message_critical": "EXTREME HEAT — surface temperature exceeds 45°C, heat wave conditions",
    },
    "NDVI": {
        "warning": 0.15,    # below this = warning (inverted)
        "critical": 0.10,
        "unit": "index",
        "inverted": True,   # alert when BELOW threshold
        "message_warning": "Vegetation stress — NDVI below 0.15 indicates sparse/dying vegetation",
        "message_critical": "CRITICAL vegetation loss — NDVI below 0.10, near-barren conditions",
    },
    "NO2": {
        "warning": 0.0001,  # mol/m²
        "critical": 0.00015,
        "unit": "mol/m²",
        "message_warning": "Elevated NO₂ pollution — above safe threshold",
        "message_critical": "HAZARDOUS NO₂ levels — immediate air quality concern",
    },
    "SOIL_MOISTURE": {
        "warning": 0.10,    # below this = drought warning (inverted)
        "critical": 0.06,
        "unit": "m³/m³",
        "inverted": True,
        "message_warning": "Low soil moisture — drought stress developing",
        "message_critical": "SEVERE drought — soil moisture critically low",
    },
    "SO2": {
        "warning": 0.00005,
        "critical": 0.0001,
        "unit": "mol/m²",
        "message_warning": "Elevated SO₂ — industrial emission concern",
        "message_critical": "HIGH SO₂ levels — check industrial emission sources",
    },
    "CO": {
        "warning": 0.03,
        "critical": 0.04,
        "unit": "mol/m²",
        "message_warning": "Elevated CO levels",
        "message_critical": "HIGH CO — possible fire or heavy traffic event",
    },
}


def check_alerts(city: str = "ahmedabad") -> dict:
    """Check all parameters against thresholds and generate alerts."""
    alerts = []
    summary = {"critical": 0, "warning": 0, "normal": 0}

    for param_id, config in THRESHOLDS.items():
        try:
            stats = satellite_service.get_statistics(param_id, city)
            if not stats:
                continue

            mean_val = stats.get("mean", 0)
            max_val = stats.get("max", 0)
            inverted = config.get("inverted", False)

            # Check critical threshold
            if inverted:
                is_critical = mean_val <= config["critical"]
                is_warning = mean_val <= config["warning"] and not is_critical
            else:
                is_critical = max_val >= config["critical"]
                is_warning = max_val >= config["warning"] and not is_critical

            if is_critical:
                alerts.append({
                    "parameter": param_id,
                    "level": "critical",
                    "message": config["message_critical"],
                    "current_value": round(mean_val, 6),
                    "threshold": config["critical"],
                    "max_value": round(max_val, 6),
                    "unit": config["unit"],
                    "timestamp": datetime.utcnow().isoformat(),
                    "color": "#EF4444",
                })
                summary["critical"] += 1
            elif is_warning:
                alerts.append({
                    "parameter": param_id,
                    "level": "warning",
                    "message": config["message_warning"],
                    "current_value": round(mean_val, 6),
                    "threshold": config["warning"],
                    "max_value": round(max_val, 6),
                    "unit": config["unit"],
                    "timestamp": datetime.utcnow().isoformat(),
                    "color": "#F59E0B",
                })
                summary["warning"] += 1
            else:
                summary["normal"] += 1

        except Exception as e:
            logger.warning(f"Alert check failed for {param_id}/{city}: {e}")

    # Sort: critical first, then warning
    alerts.sort(key=lambda a: 0 if a["level"] == "critical" else 1)

    return {
        "city": city,
        "alerts": alerts,
        "total_alerts": len(alerts),
        "summary": summary,
        "status": "critical" if summary["critical"] > 0 else ("warning" if summary["warning"] > 0 else "normal"),
        "checked_at": datetime.utcnow().isoformat(),
    }

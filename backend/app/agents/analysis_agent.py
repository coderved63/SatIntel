"""
Analysis Agent — runs ML models on harmonized satellite data.
Part of the multi-agent pipeline: Data → Analysis → Action Plan.
"""
import logging
from app.services import ml_service

logger = logging.getLogger(__name__)


async def run(satellite_data: dict, city: str = "Ahmedabad") -> dict:
    """Run ML analytics on harmonized satellite data."""
    logger.info(f"[AnalysisAgent] Running ML analytics for {city}")

    results = {}
    for param, param_data in satellite_data.items():
        if "error" in param_data:
            results[param] = {"error": param_data["error"]}
            continue

        try:
            anomalies = ml_service.detect_anomalies(param, city)
            trend = ml_service.predict_trend(param, city)
            hotspots = ml_service.find_hotspots(param, city)

            results[param] = {
                "anomalies": anomalies,
                "trend": trend,
                "hotspots": hotspots,
                "statistics": param_data.get("statistics", {}),
            }
            logger.info(
                f"[AnalysisAgent] {param}: {anomalies.get('anomaly_count', 0)} anomalies, "
                f"{hotspots.get('cluster_count', 0)} hotspots, trend: {trend.get('trend_direction', 'N/A')}"
            )
        except Exception as e:
            logger.error(f"[AnalysisAgent] Error analyzing {param}: {e}")
            results[param] = {"error": str(e)}

    return results

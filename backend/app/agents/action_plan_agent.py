"""
Action Plan Agent — generates city-specific environmental recommendations using LLM.
Part of the multi-agent pipeline: Data → Analysis → Action Plan.
"""
import logging
from app.services import action_plan_service

logger = logging.getLogger(__name__)


async def run(city: str, analysis: dict) -> dict:
    """Generate Environment Action Plan from analysis results."""
    logger.info(f"[ActionPlanAgent] Generating action plan for {city}")

    # Restructure analysis data for the action plan service
    plan_analysis = {}
    for param, param_data in analysis.items():
        if "error" in param_data:
            continue

        anomaly_data = param_data.get("anomalies", {})
        hotspot_data = param_data.get("hotspots", {})

        plan_analysis[param] = {
            "statistics": param_data.get("statistics", {}),
            "anomalies": anomaly_data.get("anomalies", [])[:5],
            "anomaly_count": anomaly_data.get("anomaly_count", 0),
            "hotspots": hotspot_data.get("hotspots", [])[:5],
            "hotspot_count": hotspot_data.get("cluster_count", 0),
        }

    # Prefer the Gemini-backed generator while preserving the same frontend schema.
    plan = await action_plan_service.generate_action_plan_from_analysis(
        city,
        list(plan_analysis.keys()) or ["LST", "NDVI", "NO2", "SOIL_MOISTURE"],
        {"start_date": "2023-01-01", "end_date": "2024-12-31"},
        plan_analysis,
    )
    plan["source_pipeline"] = "agent_pipeline"

    logger.info(f"[ActionPlanAgent] Generated plan with {len(plan.get('findings', []))} findings, "
                f"{len(plan.get('recommendations', []))} recommendations")

    return plan

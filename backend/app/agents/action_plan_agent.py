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

    # Use the action plan service's template generator
    plan = action_plan_service._generate_template_plan(city, plan_analysis)
    plan["source"] = "agent_pipeline"

    logger.info(f"[ActionPlanAgent] Generated plan with {len(plan.get('findings', []))} findings, "
                f"{len(plan.get('recommendations', []))} recommendations")

    return plan

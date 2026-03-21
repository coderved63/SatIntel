"""
Multi-Agent Orchestrator — coordinates data collection, analysis, and action plan generation.
Pipeline: Data Agent → Analysis Agent → Action Plan Agent

This is the innovation differentiator — demonstrates multi-agent architecture
applied to satellite environmental intelligence.
"""
import logging
import time
from app.agents import data_agent, analysis_agent, action_plan_agent

logger = logging.getLogger(__name__)


async def run_analysis(
    city: str = "Ahmedabad",
    parameters: list[str] = None,
    date_range: dict = None,
) -> dict:
    """Run the full multi-agent analysis pipeline.

    Pipeline:
    1. Data Agent — fetches + harmonizes satellite data from GEE/files
    2. Analysis Agent — runs ML models (anomaly, trend, clustering)
    3. Action Plan Agent — generates city-specific recommendations

    Returns combined results from all agents.
    """
    if parameters is None:
        parameters = ["LST", "NDVI", "NO2", "SOIL_MOISTURE"]
    if date_range is None:
        date_range = {"start_date": "2023-01-01", "end_date": "2024-12-31"}

    start_time = time.time()
    pipeline_log = []

    # Step 1: Data Agent
    logger.info(f"[Orchestrator] Step 1/3: Data Agent — fetching satellite data for {city}")
    pipeline_log.append({"step": 1, "agent": "DataAgent", "status": "running", "message": "Fetching satellite data..."})

    satellite_data = await data_agent.run(city, parameters, date_range)
    data_time = time.time() - start_time
    pipeline_log[-1]["status"] = "complete"
    pipeline_log[-1]["duration_s"] = round(data_time, 2)
    logger.info(f"[Orchestrator] Data Agent complete in {data_time:.1f}s")

    # Step 2: Analysis Agent
    logger.info(f"[Orchestrator] Step 2/3: Analysis Agent — running ML models")
    pipeline_log.append({"step": 2, "agent": "AnalysisAgent", "status": "running", "message": "Running ML analytics..."})

    analysis = await analysis_agent.run(satellite_data, city)
    analysis_time = time.time() - start_time - data_time
    pipeline_log[-1]["status"] = "complete"
    pipeline_log[-1]["duration_s"] = round(analysis_time, 2)
    logger.info(f"[Orchestrator] Analysis Agent complete in {analysis_time:.1f}s")

    # Step 3: Action Plan Agent
    logger.info(f"[Orchestrator] Step 3/3: Action Plan Agent — generating recommendations")
    pipeline_log.append({"step": 3, "agent": "ActionPlanAgent", "status": "running", "message": "Generating action plan..."})

    action_plan = await action_plan_agent.run(city, analysis)
    plan_time = time.time() - start_time - data_time - analysis_time
    pipeline_log[-1]["status"] = "complete"
    pipeline_log[-1]["duration_s"] = round(plan_time, 2)
    logger.info(f"[Orchestrator] Action Plan Agent complete in {plan_time:.1f}s")

    total_time = time.time() - start_time
    logger.info(f"[Orchestrator] Full pipeline complete in {total_time:.1f}s")

    return {
        "city": city,
        "parameters": parameters,
        "date_range": date_range,
        "satellite_data": {
            param: {
                "count": pdata.get("count", 0),
                "statistics": pdata.get("statistics", {}),
                "heatmap": pdata.get("heatmap", {}),
            }
            for param, pdata in satellite_data.items()
        },
        "analysis": {
            param: {
                "anomaly_count": adata.get("anomalies", {}).get("anomaly_count", 0),
                "hotspot_count": adata.get("hotspots", {}).get("cluster_count", 0),
                "trend_direction": adata.get("trend", {}).get("trend_direction", "unknown"),
                "top_anomalies": adata.get("anomalies", {}).get("anomalies", [])[:3],
                "top_hotspots": adata.get("hotspots", {}).get("hotspots", [])[:3],
            }
            for param, adata in analysis.items()
            if "error" not in adata
        },
        "action_plan": action_plan,
        "pipeline": {
            "total_duration_s": round(total_time, 2),
            "steps": pipeline_log,
        },
    }

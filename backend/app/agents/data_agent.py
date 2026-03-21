"""
Data Agent — fetches and harmonizes satellite data from multiple sources.
Part of the multi-agent pipeline: Data → Analysis → Action Plan.
"""
import logging
from app.services import satellite_service

logger = logging.getLogger(__name__)


async def run(city: str, parameters: list[str], date_range: dict) -> dict:
    """Fetch and harmonize satellite data for the given city and parameters."""
    logger.info(f"[DataAgent] Fetching data for {city}: {parameters}")

    results = {}
    for param in parameters:
        try:
            data = satellite_service._load_data(param)
            start = date_range.get("start_date", "2023-01-01")
            end = date_range.get("end_date", "2024-12-31")
            filtered = [d for d in data if start <= d.get("date", "") <= end]

            stats = satellite_service.get_statistics(param)
            timeseries = satellite_service.get_timeseries(param, city)
            heatmap = satellite_service.get_heatmap_data(param, city)

            results[param] = {
                "raw_data": filtered,
                "count": len(filtered),
                "statistics": stats,
                "timeseries": timeseries.get("timeseries", []),
                "heatmap": heatmap,
                "metadata": satellite_service.PARAMETERS.get(param, {}),
            }
            logger.info(f"[DataAgent] {param}: {len(filtered)} points loaded")
        except Exception as e:
            logger.error(f"[DataAgent] Error fetching {param}: {e}")
            results[param] = {"error": str(e)}

    return results

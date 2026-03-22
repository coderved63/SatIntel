from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user
from app.models.schemas import SatelliteDataRequest
from app.services import satellite_service

router = APIRouter()

@router.get("/parameters")
async def get_parameters():
    return satellite_service.get_available_parameters()

@router.post("/fetch")
async def fetch_data(req: SatelliteDataRequest, user: dict = Depends(get_current_user)):
    data = satellite_service.fetch_satellite_data(req.city, req.parameters, req.date_range.dict())
    return data

@router.get("/timeseries/{parameter}")
async def get_timeseries(parameter: str, city: str = "Ahmedabad"):
    return satellite_service.get_timeseries(parameter, city)


@router.get("/grid")
async def get_grid_info(city: str = "Ahmedabad"):
    """Returns the harmonized grid configuration for a city."""
    from app.utils.geo_helpers import get_grid_info
    return get_grid_info(city)


@router.get("/query")
async def spatial_query(
    parameter: str = "LST",
    city: str = "Ahmedabad",
    lat: float = 23.0225,
    lng: float = 72.5714,
    radius_km: float = 5.0,
    start_date: str = "2023-01-01",
    end_date: str = "2024-12-31",
):
    """
    Spatial query: get all observations within radius_km of a point.
    Uses PostGIS ST_DWithin if database is configured, otherwise falls back to JSON filter.
    """
    from app.services import db_service

    # Try PostGIS spatial query first
    db_results = await db_service.query_timeseries(
        city=city, parameter=parameter,
        start_date=start_date, end_date=end_date,
        lat=lat, lng=lng, radius_km=radius_km,
    )
    if db_results:
        return {
            "source": "postgis",
            "query": f"ST_DWithin(geom, POINT({lng} {lat}), {radius_km}km)",
            "city": city,
            "parameter": parameter,
            "count": len(db_results),
            "data": db_results,
        }

    # Fallback: filter JSON data by distance
    import math
    data = satellite_service._load_data(parameter, city)
    filtered = []
    for d in data:
        dlat = d["lat"] - lat
        dlng = d["lng"] - lng
        dist_km = math.sqrt(dlat**2 + dlng**2) * 111  # approximate
        if dist_km <= radius_km:
            if start_date <= d.get("date", "") <= end_date:
                filtered.append(d)

    return {
        "source": "json_fallback",
        "query": f"distance({lat}, {lng}) <= {radius_km}km",
        "city": city,
        "parameter": parameter,
        "count": len(filtered),
        "data": filtered,
    }


@router.get("/research")
async def research_query(
    lat: float = 23.0225,
    lng: float = 72.5714,
    radius_km: float = 10.0,
    start_date: str = "2023-01-01",
    end_date: str = "2024-12-31",
    parameters: str = "LST,NDVI,NO2,SO2,CO,O3,AEROSOL,SOIL_MOISTURE",
):
    """
    Research Mode: fast spatial-temporal query using local JSON data.
    Auto-detects nearest city, searches within radius, auto-expands if empty.
    """
    import math
    from collections import defaultdict
    from app.utils.cities import CITIES, get_city

    param_list = [p.strip() for p in parameters.split(",")]

    # Find nearest city by distance to clicked coordinate
    nearest_city = None
    min_dist = float('inf')
    for city_key, cfg in CITIES.items():
        center = cfg["center"]
        dist = math.sqrt((center[0] - lat)**2 + (center[1] - lng)**2) * 111
        if dist < min_dist:
            min_dist = dist
            nearest_city = city_key

    # Also find all cities within a generous range (the click might be between cities)
    nearby_cities = []
    for city_key, cfg in CITIES.items():
        center = cfg["center"]
        dist = math.sqrt((center[0] - lat)**2 + (center[1] - lng)**2) * 111
        if dist < radius_km + 50:  # include cities whose data might overlap
            nearby_cities.append(city_key)

    if not nearby_cities and nearest_city:
        nearby_cities = [nearest_city]

    results = {}

    for param in param_list:
        all_points = []

        # Collect data from nearby cities
        for city_key in nearby_cities:
            try:
                city_data = satellite_service._load_raw(param, city_key)
                for d in city_data:
                    if start_date <= d.get("date", "") <= end_date:
                        dlat = d["lat"] - lat
                        dlng = d["lng"] - lng
                        dist = math.sqrt(dlat**2 + dlng**2) * 111
                        if dist <= radius_km:
                            all_points.append({**d, "_dist_km": round(dist, 2)})
            except Exception:
                continue

        # Auto-expand: if no results, use nearest city's data with closest points
        if not all_points and nearest_city:
            try:
                city_data = satellite_service._load_raw(param, nearest_city)
                dated = [d for d in city_data if start_date <= d.get("date", "") <= end_date]
                # Add distance to each point
                for d in dated:
                    dlat = d["lat"] - lat
                    dlng = d["lng"] - lng
                    d["_dist_km"] = round(math.sqrt(dlat**2 + dlng**2) * 111, 2)
                # Take closest points (up to 500)
                dated.sort(key=lambda x: x["_dist_km"])
                all_points = dated[:500]
            except Exception:
                pass

        # Aggregate into timeseries
        date_values = defaultdict(list)
        for d in all_points:
            date_values[d["date"]].append(d["value"])

        timeseries = [
            {"date": date, "value": round(sum(vals) / len(vals), 6), "count": len(vals)}
            for date, vals in sorted(date_values.items())
        ]

        # Compute stats
        all_vals = [d["value"] for d in all_points]
        stats = {}
        if all_vals:
            stats = {
                "mean": round(sum(all_vals) / len(all_vals), 6),
                "min": round(min(all_vals), 6),
                "max": round(max(all_vals), 6),
            }

        results[param] = {
            "total_points": len(all_points),
            "timeseries": timeseries,
            "statistics": stats,
            "raw_data": all_points[:300],
        }

    return {
        "lat": lat,
        "lng": lng,
        "radius_km": radius_km,
        "nearest_city": nearest_city,
        "nearby_cities": nearby_cities,
        "date_range": {"start": start_date, "end": end_date},
        "parameters": results,
    }


@router.get("/cities")
async def get_cities():
    """List all supported cities."""
    from app.utils.cities import get_city_list
    return get_city_list()


@router.get("/last-synced")
async def get_last_synced():
    """Get last data sync timestamp + cache stats."""
    from app.services import cache_service
    return {
        "last_synced": cache_service.get_last_synced() or "2026-03-22T02:00:00",
        "cache": cache_service.info(),
    }


@router.get("/cache-info")
async def get_cache_info():
    """Get Redis/memory cache statistics."""
    from app.services import cache_service
    return cache_service.info()


@router.get("/health-score")
async def get_health_score(city: str = "ahmedabad"):
    from app.services import health_score_service
    return health_score_service.calculate(city)


@router.get("/alerts")
async def get_alerts(city: str = "ahmedabad"):
    from app.services import alert_service
    return alert_service.check_alerts(city)

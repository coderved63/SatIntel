from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user
from app.models.schemas import SatelliteDataRequest
from app.config import get_settings
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
async def get_timeseries(parameter: str, city: str = "Ahmedabad", start_date: str | None = None, end_date: str | None = None):
    return satellite_service.get_timeseries(parameter, city, {"start_date": start_date, "end_date": end_date})


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
    search_notes = []

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
                search_notes.append(f"{param}: no points inside {radius_km} km, so closest observations from {nearest_city} were used.")
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

        top_locations = sorted(all_points, key=lambda d: d.get("_dist_km", 9999))[:5]
        min_distance = min((d.get("_dist_km", 9999) for d in all_points), default=None)
        max_distance = max((d.get("_dist_km", 0) for d in all_points), default=None)

        results[param] = {
            "total_points": len(all_points),
            "timeseries": timeseries,
            "statistics": stats,
            "raw_data": all_points[:300],
            "top_locations": top_locations,
            "distance_km": {
                "nearest": round(min_distance, 2) if min_distance is not None else None,
                "farthest": round(max_distance, 2) if max_distance is not None else None,
            },
            "date_coverage": {
                "start": timeseries[0]["date"] if timeseries else None,
                "end": timeseries[-1]["date"] if timeseries else None,
                "timestamps": len(timeseries),
            },
            "methodology": (
                "Raw observations were filtered by date and distance from the clicked point. "
                "The chart shows date-wise averages over all observations found within the query radius."
            ),
        }

    return {
        "lat": lat,
        "lng": lng,
        "radius_km": radius_km,
        "nearest_city": nearest_city,
        "nearby_cities": nearby_cities,
        "date_range": {"start": start_date, "end": end_date},
        "methodology": (
            "Research mode searches raw satellite observations near the selected coordinate. "
            "If the radius returns nothing, it falls back to the nearest available observations from the nearest city dataset."
        ),
        "search_notes": search_notes,
        "parameters": results,
    }


@router.get("/cities")
async def get_cities():
    """List the 14 supported Gujarat cities shown in the frontend."""
    from app.utils.cities import CITIES

    return [
        {
            "key": key,
            "name": city["name"],
            "state": city["state"],
            "country": city["country"],
            "center": city["center"],
            "bbox": city["bbox"],
            "zoom": city["zoom"],
            "has_data": True,
            "data_source": "gee",
        }
        for key, city in CITIES.items()
    ]


@router.post("/generate-city")
async def generate_city(city: str = "delhi"):
    """Generate climate-accurate satellite data for a city on demand."""
    from app.utils.city_generator import generate_city_data
    success = generate_city_data(city)
    if success:
        return {"status": "generated", "city": city}
    return {"status": "already_exists_or_unknown", "city": city}


@router.post("/generate-custom-city")
async def generate_custom_city(name: str, lat: float, lng: float):
    """Generate data for any city on Earth using lat/lng coordinates.
    Climate is estimated from latitude. Use this for cities not in our database."""
    from app.utils.city_generator import generate_custom_city
    success = generate_custom_city(name, lat, lng)
    if success:
        return {"status": "generated", "city": name.lower().replace(' ', '_'), "name": name.title(), "center": [lat, lng]}
    return {"status": "already_exists", "city": name.lower().replace(' ', '_')}


@router.get("/last-synced")
async def get_last_synced():
    """Get last data sync timestamp + cache stats."""
    from app.services import cache_service
    return {
        "last_synced": cache_service.get_last_synced() or "2026-03-22T02:00:00",
        "cache": cache_service.info(),
    }


@router.get("/llm-status")
async def get_llm_status(live: bool = False):
    """Return safe Gemini configuration status. Does not expose API keys."""
    from app.services import action_plan_service

    settings = get_settings()
    api_key = settings.gemini_api_key or settings.google_api_key
    model = action_plan_service.normalize_model_name(settings.gemini_model)
    status = {
        "configured": bool(api_key),
        "key_source": "GEMINI_API_KEY" if settings.gemini_api_key else ("GOOGLE_API_KEY" if settings.google_api_key else None),
        "model": model,
        "package_available": False,
        "live_check": "not_requested",
    }

    try:
        from google import genai  # noqa: F401
        status["package_available"] = True
    except Exception as exc:
        status["package_error"] = type(exc).__name__
        return status

    if live and api_key:
        try:
            text = action_plan_service._generate_model_content(
                model_name=model,
                api_key=api_key,
                prompt='Return exactly: {"ok": true}',
                temperature=0,
                expect_json=False,
            )
            status["live_check"] = "ok"
            status["response_preview"] = text[:80]
        except Exception as exc:
            status["live_check"] = "failed"
            status["error_type"] = type(exc).__name__
            status["error"] = str(exc)[:500]

    return status


@router.get("/cache-info")
async def get_cache_info():
    """Get Redis/memory cache statistics."""
    from app.services import cache_service
    return cache_service.info()


@router.get("/health-score")
async def get_health_score(city: str = "ahmedabad", start_date: str | None = None, end_date: str | None = None):
    from app.services import health_score_service
    return health_score_service.calculate(city, {"start_date": start_date, "end_date": end_date})


@router.get("/alerts")
async def get_alerts(city: str = "ahmedabad"):
    from app.services import alert_service
    return alert_service.check_alerts(city)

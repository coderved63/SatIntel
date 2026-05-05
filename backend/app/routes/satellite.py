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

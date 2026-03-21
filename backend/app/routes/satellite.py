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


@router.get("/cities")
async def get_cities():
    """List all supported cities."""
    from app.utils.cities import get_city_list
    return get_city_list()

"""
Specialized Analysis Routes — 4 domain-specific endpoints.
These provide deeper analysis than the generic /analytics/ endpoints.
"""
from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user

router = APIRouter()


@router.get("/vegetation")
async def vegetation_analysis(city: str = "Ahmedabad", user: dict = Depends(get_current_user)):
    from app.services import vegetation_service
    return vegetation_service.analyse(city)


@router.get("/land-conversion")
async def land_conversion_analysis(city: str = "Ahmedabad", user: dict = Depends(get_current_user)):
    from app.services import land_conversion_service
    return land_conversion_service.analyse(city)


@router.get("/farmland")
async def farmland_analysis(city: str = "Ahmedabad", user: dict = Depends(get_current_user)):
    from app.services import farmland_service
    return farmland_service.analyse(city)


@router.get("/heat")
async def heat_analysis(city: str = "Ahmedabad", user: dict = Depends(get_current_user)):
    from app.services import heat_service
    return heat_service.analyse(city)


@router.get("/full-report")
async def full_analysis(city: str = "Ahmedabad", user: dict = Depends(get_current_user)):
    """Run all 4 analyses and return combined result."""
    from app.services import vegetation_service, land_conversion_service, farmland_service, heat_service

    return {
        "city": city,
        "vegetation": vegetation_service.analyse(city),
        "land_conversion": land_conversion_service.analyse(city),
        "farmland": farmland_service.analyse(city),
        "heat": heat_service.analyse(city),
    }

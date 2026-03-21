from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user
from app.services import satellite_service

router = APIRouter()

@router.get("/heatmap/{parameter}")
async def get_heatmap(parameter: str, city: str = "Ahmedabad"):
    return satellite_service.get_heatmap_data(parameter, city)

@router.get("/layers")
async def get_layers(city: str = "Ahmedabad"):
    return satellite_service.get_all_layers(city)

@router.get("/land-use-change")
async def get_land_use_change(city: str = "Ahmedabad"):
    return satellite_service.get_land_use_change(city)

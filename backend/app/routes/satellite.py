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

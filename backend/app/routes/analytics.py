from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user
from app.models.schemas import AnalyticsRequest
from app.services import ml_service

router = APIRouter()

@router.post("/anomalies")
async def detect_anomalies(req: AnalyticsRequest, user: dict = Depends(get_current_user)):
    return ml_service.detect_anomalies(req.parameter, req.city)

@router.post("/trends")
async def predict_trends(req: AnalyticsRequest, user: dict = Depends(get_current_user)):
    return ml_service.predict_trend(req.parameter, req.city)

@router.post("/hotspots")
async def find_hotspots(req: AnalyticsRequest, user: dict = Depends(get_current_user)):
    return ml_service.find_hotspots(req.parameter, req.city)

@router.get("/summary/{city}")
async def get_summary(city: str = "Ahmedabad", user: dict = Depends(get_current_user)):
    return ml_service.get_city_summary(city)

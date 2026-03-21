"""Green Infrastructure Gap Analysis route."""
from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user

router = APIRouter()


@router.get("/analyse")
async def analyse_green_gap(city: str = "ahmedabad", user: dict = Depends(get_current_user)):
    from app.services import green_gap_service
    return green_gap_service.analyse(city)

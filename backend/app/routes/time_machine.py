"""Environmental Time Machine — side-by-side year comparison."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/compare")
async def compare(param: str = "LST", city: str = "ahmedabad"):
    from app.services import time_machine_service
    return time_machine_service.get_comparison(param, city)


@router.get("/params")
async def list_params():
    from app.services import time_machine_service
    return time_machine_service.get_params()

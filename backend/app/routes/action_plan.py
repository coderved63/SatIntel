from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user
from app.models.schemas import ActionPlanRequest
from app.services import action_plan_service

router = APIRouter()

@router.post("/generate")
async def generate_plan(req: ActionPlanRequest, user: dict = Depends(get_current_user)):
    plan = await action_plan_service.generate_action_plan(req.city, req.parameters, req.date_range.dict())
    return plan

@router.get("/history")
async def get_plan_history(user: dict = Depends(get_current_user)):
    return []

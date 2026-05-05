from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.middleware.auth_middleware import get_current_user
from app.services import copilot_service

router = APIRouter()


class CopilotRequest(BaseModel):
    city: str = "ahmedabad"
    page: str = "dashboard"
    question: str
    parameter: str | None = None
    date_range: dict | None = None


@router.post("/chat")
async def chat(req: CopilotRequest, user: dict = Depends(get_current_user)):
    return await copilot_service.chat(req.city, req.page, req.question, req.parameter, req.date_range)

from fastapi import APIRouter, HTTPException
from app.models.schemas import SignupRequest, LoginRequest, AuthResponse
from app.services import auth_service

router = APIRouter()

@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    try:
        result = await auth_service.signup(req.name, req.email, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    try:
        result = await auth_service.login(req.email, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

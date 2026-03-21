from fastapi import APIRouter, Depends, UploadFile, File
from app.middleware.auth_middleware import get_current_user

router = APIRouter()

@router.post("/upload")
async def upload_data(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    return {"filename": file.filename, "status": "uploaded"}

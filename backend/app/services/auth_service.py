"""
Auth Service — JWT authentication with PostgreSQL or in-memory fallback.
"""
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from app.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    pwd_bytes = plain.encode('utf-8')[:72]
    hashed_bytes = hashed.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=settings.jwt_expiry_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


async def signup(name: str, email: str, password: str) -> dict:
    from app.services import db_service

    existing = await db_service.get_user_by_email(email)
    if existing:
        raise ValueError("Email already registered")

    hashed = hash_password(password)
    user = await db_service.create_user(name=name, email=email, hashed_password=hashed)

    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }


async def login(email: str, password: str) -> dict:
    from app.services import db_service

    user = await db_service.get_user_by_email(email)
    if not user or not verify_password(password, user["hashed_password"]):
        raise ValueError("Invalid email or password")

    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }


async def get_user_by_email(email: str):
    from app.services import db_service
    return await db_service.get_user_by_email(email)

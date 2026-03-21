from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory user store (swap to MongoDB/PostgreSQL)
users_db: dict = {}

def hash_password(password: str) -> str:
    return pwd_context.hash(password[:72])

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain[:72], hashed)

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=settings.jwt_expiry_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])

def signup(name: str, email: str, password: str) -> dict:
    if email in users_db:
        raise ValueError("Email already registered")
    import uuid
    user_id = str(uuid.uuid4())
    users_db[email] = {
        "id": user_id,
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
    }
    token = create_token(user_id, email)
    return {
        "token": token,
        "user": {"id": user_id, "name": name, "email": email},
    }

def login(email: str, password: str) -> dict:
    user = users_db.get(email)
    if not user or not verify_password(password, user["password_hash"]):
        raise ValueError("Invalid email or password")
    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }

def get_user_by_email(email: str) -> dict | None:
    return users_db.get(email)

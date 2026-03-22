from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "satellite_intel"
    jwt_secret: str = "hackathon-aetrix-2026-satellite-intel-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24
    database_url: str = ""  # e.g. "postgresql+asyncpg://user:pass@localhost:5432/satellite_intel"
    gee_service_account_email: str = ""
    gee_key_file: str = "gee_service_account.json"
    redis_url: str = ""
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

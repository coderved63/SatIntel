"""
Database Models -- PostgreSQL + PostGIS.

Setup Instructions (Person 2):
1. Install PostgreSQL: https://www.postgresql.org/download/
2. Install PostGIS extension: CREATE EXTENSION postgis;
3. Create database: CREATE DATABASE satellite_intel;
4. Set DATABASE_URL in backend/.env
5. Run: python -c "from app.models.db_models import create_tables; import asyncio; asyncio.run(create_tables())"

If PostgreSQL is not available, the app falls back to in-memory/JSON storage.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Integer, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from geoalchemy2 import Geometry

from app.config import get_settings


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class SatelliteObservation(Base):
    """
    Core table: one row per (date, location, parameter) observation.
    PostGIS geometry column enables spatial queries like:
      ST_DWithin(geom, ST_MakePoint(lng, lat)::geography, 5000)  -- within 5km
    """
    __tablename__ = "satellite_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    city = Column(String(100), nullable=False, index=True)
    parameter = Column(String(50), nullable=False, index=True)  # LST, NDVI, NO2, SOIL_MOISTURE, LAND_USE
    date = Column(String(20), nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(50))
    source = Column(String(100))  # MODIS, Sentinel-5P, SMAP, Landsat
    geom = Column(Geometry(geometry_type='POINT', srid=4326))

    __table_args__ = (
        Index('idx_city_param_date', 'city', 'parameter', 'date'),
        Index('idx_spatial', 'geom', postgresql_using='gist'),
    )


class ActionPlanRecord(Base):
    __tablename__ = "action_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    city = Column(String(100), nullable=False)
    plan_json = Column(Text, nullable=False)  # Full JSON of the generated plan
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True))  # User ID


# -- Engine + Session ----------------------------------------------------------
_engine = None
_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        db_url = settings.database_url
        if db_url and "postgresql" in db_url:
            _engine = create_async_engine(db_url, echo=False)
        else:
            return None
    return _engine


def get_session_factory():
    global _session_factory
    engine = get_engine()
    if engine and _session_factory is None:
        _session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return _session_factory


async def create_tables():
    """Create all tables. Run once at startup."""
    engine = get_engine()
    if engine:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created.")
    else:
        print("No database configured -- using fallback storage.")

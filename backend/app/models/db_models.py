"""
Database Models — PostgreSQL + PostGIS.

Setup Instructions (Person 2):
1. Install PostgreSQL: https://www.postgresql.org/download/
2. Install PostGIS extension: CREATE EXTENSION postgis;
3. Create database: CREATE DATABASE satellite_intel;
4. Set DATABASE_URL in backend/.env
5. pip install asyncpg sqlalchemy geoalchemy2
6. Run the app — tables auto-create on startup

If PostgreSQL/GeoAlchemy2 is not available, the app falls back to in-memory/JSON storage.
"""
import uuid
from datetime import datetime

try:
    from sqlalchemy import Column, String, Float, DateTime, Integer, Text, Index
    from sqlalchemy.dialects.postgresql import UUID
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker, DeclarativeBase
    _HAS_SQLALCHEMY = True
except ImportError:
    _HAS_SQLALCHEMY = False

try:
    from geoalchemy2 import Geometry
    _HAS_POSTGIS = True
except ImportError:
    _HAS_POSTGIS = False

from app.config import get_settings

# ── Models (only defined if SQLAlchemy is available) ──────────

if _HAS_SQLALCHEMY:
    class Base(DeclarativeBase):
        pass

    class User(Base):
        __tablename__ = "users"
        id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        name = Column(String(100), nullable=False)
        email = Column(String(255), unique=True, nullable=False, index=True)
        hashed_password = Column(String(255), nullable=False)
        created_at = Column(DateTime, default=datetime.utcnow)

    if _HAS_POSTGIS:
        class SatelliteObservation(Base):
            __tablename__ = "satellite_observations"
            id = Column(Integer, primary_key=True, autoincrement=True)
            city = Column(String(100), nullable=False, index=True)
            parameter = Column(String(50), nullable=False, index=True)
            date = Column(String(20), nullable=False, index=True)
            lat = Column(Float, nullable=False)
            lng = Column(Float, nullable=False)
            value = Column(Float, nullable=False)
            unit = Column(String(50))
            source = Column(String(100))
            geom = Column(Geometry(geometry_type='POINT', srid=4326))
            __table_args__ = (
                Index('idx_city_param_date', 'city', 'parameter', 'date'),
                Index('idx_spatial', 'geom', postgresql_using='gist'),
            )
    else:
        class SatelliteObservation(Base):
            __tablename__ = "satellite_observations"
            id = Column(Integer, primary_key=True, autoincrement=True)
            city = Column(String(100), nullable=False, index=True)
            parameter = Column(String(50), nullable=False, index=True)
            date = Column(String(20), nullable=False, index=True)
            lat = Column(Float, nullable=False)
            lng = Column(Float, nullable=False)
            value = Column(Float, nullable=False)
            unit = Column(String(50))
            source = Column(String(100))
            __table_args__ = (
                Index('idx_city_param_date', 'city', 'parameter', 'date'),
            )

    class ActionPlanRecord(Base):
        __tablename__ = "action_plans"
        id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        city = Column(String(100), nullable=False)
        plan_json = Column(Text, nullable=False)
        created_at = Column(DateTime, default=datetime.utcnow)
        created_by = Column(UUID(as_uuid=True))

else:
    # Stubs when SQLAlchemy not installed
    Base = None
    User = None
    SatelliteObservation = None
    ActionPlanRecord = None


# ── Engine + Session ──────────────────────────────────────────
_engine = None
_session_factory = None


def get_engine():
    global _engine
    if not _HAS_SQLALCHEMY:
        return None
    if _engine is None:
        settings = get_settings()
        db_url = settings.database_url
        if db_url and "postgresql" in db_url:
            # asyncpg doesn't understand sslmode/channel_binding URL params
            # Strip them and pass ssl=True via connect_args instead
            import ssl as ssl_mod
            clean_url = db_url.split("?")[0]  # remove query params
            needs_ssl = "neon.tech" in db_url or "supabase" in db_url or "sslmode=require" in db_url

            connect_args = {}
            if needs_ssl:
                ssl_ctx = ssl_mod.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl_mod.CERT_NONE
                connect_args["ssl"] = ssl_ctx

            _engine = create_async_engine(
                clean_url, echo=False, connect_args=connect_args,
                pool_recycle=300,    # recycle connections after 5 min (Neon drops idle)
                pool_pre_ping=True,  # test connection before use
                pool_size=3,
                max_overflow=2,
            )
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
    if engine and Base is not None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created.")
    else:
        print("No database configured — using fallback storage.")

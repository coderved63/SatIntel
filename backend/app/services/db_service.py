"""
Database Service -- PostgreSQL + PostGIS queries with in-memory fallback.

If PostgreSQL is configured (DATABASE_URL in .env), uses real spatial queries.
Otherwise falls back to in-memory dict for users and JSON files for data.
This lets the demo work regardless of database setup.
"""
import uuid
import json
import logging
from typing import Optional
from app.models.db_models import get_session_factory, SatelliteObservation, User, ActionPlanRecord

logger = logging.getLogger(__name__)

# -- In-Memory Fallback --------------------------------------------------------
_users_mem: dict = {}  # email -> user dict
_plans_mem: list = []


def _has_db() -> bool:
    """Check if PostgreSQL is available."""
    return get_session_factory() is not None


# -- User CRUD -----------------------------------------------------------------

async def create_user(name: str, email: str, hashed_password: str) -> dict:
    if _has_db():
        async with get_session_factory()() as session:
            user = User(name=name, email=email, hashed_password=hashed_password)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return {"id": str(user.id), "name": user.name, "email": user.email, "hashed_password": user.hashed_password}
    else:
        user_id = str(uuid.uuid4())
        user = {"id": user_id, "name": name, "email": email, "hashed_password": hashed_password}
        _users_mem[email] = user
        return user


async def get_user_by_email(email: str) -> Optional[dict]:
    if _has_db():
        from sqlalchemy import select
        async with get_session_factory()() as session:
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if user:
                return {"id": str(user.id), "name": user.name, "email": user.email, "hashed_password": user.hashed_password}
            return None
    else:
        return _users_mem.get(email)


async def get_user_by_id(user_id: str) -> Optional[dict]:
    if _has_db():
        from sqlalchemy import select
        async with get_session_factory()() as session:
            result = await session.execute(select(User).where(User.id == uuid.UUID(user_id)))
            user = result.scalar_one_or_none()
            if user:
                return {"id": str(user.id), "name": user.name, "email": user.email}
            return None
    else:
        for u in _users_mem.values():
            if u["id"] == user_id:
                return {"id": u["id"], "name": u["name"], "email": u["email"]}
        return None


# -- Satellite Data CRUD -------------------------------------------------------

async def store_observations(data_points: list[dict], city: str, parameter: str, source: str = ""):
    """Bulk insert satellite observations into PostGIS."""
    if not _has_db():
        logger.info(f"No DB -- skipping store for {len(data_points)} {parameter} points")
        return

    async with get_session_factory()() as session:
        observations = []
        for d in data_points:
            obs = SatelliteObservation(
                city=city,
                parameter=parameter,
                date=d.get("date", ""),
                lat=d["lat"],
                lng=d["lng"],
                value=d["value"],
                unit=d.get("unit", ""),
                source=source,
                geom=f"SRID=4326;POINT({d['lng']} {d['lat']})",
            )
            observations.append(obs)
        session.add_all(observations)
        await session.commit()
        logger.info(f"Stored {len(observations)} {parameter} observations for {city}")


async def query_timeseries(city: str, parameter: str, start_date: str = "", end_date: str = "",
                           lat: float = None, lng: float = None, radius_km: float = 5.0) -> list[dict]:
    """
    Query time-series data with optional spatial filter.
    Uses PostGIS ST_DWithin for spatial queries if lat/lng provided.
    """
    if not _has_db():
        return []

    from sqlalchemy import select, and_, text

    async with get_session_factory()() as session:
        conditions = [SatelliteObservation.parameter == parameter]
        if city:
            conditions.append(SatelliteObservation.city == city)
        query = select(SatelliteObservation).where(and_(*conditions))

        if start_date:
            query = query.where(SatelliteObservation.date >= start_date)
        if end_date:
            query = query.where(SatelliteObservation.date <= end_date)

        # Spatial filter -- points within radius_km of given lat/lng
        if lat is not None and lng is not None:
            query = query.where(
                text(f"ST_DWithin(geom::geography, ST_MakePoint({lng}, {lat})::geography, {radius_km * 1000})")
            )

        query = query.order_by(SatelliteObservation.date)
        result = await session.execute(query)
        rows = result.scalars().all()

        return [
            {"date": r.date, "lat": r.lat, "lng": r.lng, "value": r.value, "parameter": r.parameter}
            for r in rows
        ]


async def query_spatial(city: str, parameter: str, date: str) -> list[dict]:
    """Get all spatial data for a given parameter and date."""
    if not _has_db():
        return []

    from sqlalchemy import select, and_
    async with get_session_factory()() as session:
        result = await session.execute(
            select(SatelliteObservation).where(
                and_(
                    SatelliteObservation.city == city,
                    SatelliteObservation.parameter == parameter,
                    SatelliteObservation.date == date,
                )
            )
        )
        rows = result.scalars().all()
        return [{"lat": r.lat, "lng": r.lng, "value": r.value} for r in rows]


# -- Action Plan CRUD ----------------------------------------------------------

async def store_action_plan(city: str, plan_json: str, user_id: str = None) -> str:
    if _has_db():
        async with get_session_factory()() as session:
            record = ActionPlanRecord(
                city=city,
                plan_json=plan_json,
                created_by=uuid.UUID(user_id) if user_id else None,
            )
            session.add(record)
            await session.commit()
            return str(record.id)
    else:
        plan_id = str(uuid.uuid4())
        _plans_mem.append({"id": plan_id, "city": city, "plan": json.loads(plan_json)})
        return plan_id


async def get_action_plans(city: str = None) -> list[dict]:
    if _has_db():
        from sqlalchemy import select
        async with get_session_factory()() as session:
            query = select(ActionPlanRecord).order_by(ActionPlanRecord.created_at.desc())
            if city:
                query = query.where(ActionPlanRecord.city == city)
            result = await session.execute(query)
            rows = result.scalars().all()
            return [{"id": str(r.id), "city": r.city, "plan": json.loads(r.plan_json), "created_at": r.created_at.isoformat()} for r in rows]
    else:
        return _plans_mem

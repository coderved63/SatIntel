"""
Load all GEE satellite data from JSON files into PostgreSQL + PostGIS.
This enables spatial-temporal queries for the Research Mode.

Usage:
    cd Satellite
    python scripts/load_data_to_db.py
"""
import sys
import os
import json
import asyncio
import ssl

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.utils.cities import get_gujarat_cities

# Parameter → source mapping
PARAM_FILES = {
    "LST": ("lst_timeseries.json", "MODIS Terra MOD11A2", "°C"),
    "NDVI": ("ndvi_timeseries.json", "MODIS Terra MOD13A2", "index"),
    "NO2": ("no2_timeseries.json", "Sentinel-5P TROPOMI", "mol/m²"),
    "SO2": ("so2_timeseries.json", "Sentinel-5P TROPOMI", "mol/m²"),
    "CO": ("co_timeseries.json", "Sentinel-5P TROPOMI", "mol/m²"),
    "O3": ("o3_timeseries.json", "Sentinel-5P TROPOMI", "mol/m²"),
    "AEROSOL": ("aerosol_timeseries.json", "Sentinel-5P TROPOMI", "index"),
    "SOIL_MOISTURE": ("soil_moisture.json", "NASA SMAP SPL3SMP_E", "m³/m³"),
}

DATA_ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')


async def load_all():
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text

    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://neondb_owner:npg_lHVxzjPM3Uv0@ep-rough-leaf-ama9gg4t-pooler.c-5.us-east-1.aws.neon.tech/neondb"
    )

    clean_url = db_url.split("?")[0]
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    engine = create_async_engine(clean_url, echo=False, connect_args={"ssl": ssl_ctx})
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Ensure PostGIS extension and table exist
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS satellite_observations (
                id SERIAL PRIMARY KEY,
                city VARCHAR(100) NOT NULL,
                parameter VARCHAR(50) NOT NULL,
                date VARCHAR(20) NOT NULL,
                lat FLOAT NOT NULL,
                lng FLOAT NOT NULL,
                value FLOAT NOT NULL,
                unit VARCHAR(50),
                source VARCHAR(100),
                geom GEOMETRY(POINT, 4326)
            )
        """))
        # Create indexes
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_city_param_date ON satellite_observations (city, parameter, date)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_spatial ON satellite_observations USING GIST (geom)"
        ))
    print("Table and indexes ready.\n")

    cities = get_gujarat_cities()
    total_inserted = 0

    for city_key in cities:
        city_dir = os.path.join(DATA_ROOT, city_key)
        if not os.path.exists(city_dir):
            print(f"  SKIP {city_key} — no data folder")
            continue

        print(f"{'='*50}")
        print(f"  {city_key.upper()}")
        print(f"{'='*50}")

        for param, (filename, source, unit) in PARAM_FILES.items():
            filepath = os.path.join(city_dir, filename)
            if not os.path.exists(filepath):
                print(f"  [{param}] SKIP — file not found")
                continue

            with open(filepath) as f:
                data = json.load(f)

            if not data:
                print(f"  [{param}] SKIP — empty")
                continue

            # Clear old data and reload with fresh data
            async with Session() as session:
                result = await session.execute(
                    text("SELECT COUNT(*) FROM satellite_observations WHERE city = :city AND parameter = :param"),
                    {"city": city_key, "param": param}
                )
                old_count = result.scalar()
                if old_count and old_count > 0:
                    await session.execute(
                        text("DELETE FROM satellite_observations WHERE city = :city AND parameter = :param"),
                        {"city": city_key, "param": param}
                    )
                    await session.commit()
                    print(f"  [{param}] Cleared {old_count} old rows, reloading...")

            # Bulk insert
            async with Session() as session:
                batch_size = 200
                for i in range(0, len(data), batch_size):
                    batch = data[i:i+batch_size]
                    values_parts = []
                    params = {}
                    for j, d in enumerate(batch):
                        key = f"_{i+j}"
                        values_parts.append(
                            f"(:city{key}, :param{key}, :date{key}, :lat{key}, :lng{key}, "
                            f":value{key}, :unit{key}, :source{key}, "
                            f"ST_SetSRID(ST_MakePoint(:lng{key}, :lat{key}), 4326))"
                        )
                        params[f"city{key}"] = city_key
                        params[f"param{key}"] = param
                        params[f"date{key}"] = d.get("date", "")
                        params[f"lat{key}"] = d["lat"]
                        params[f"lng{key}"] = d["lng"]
                        params[f"value{key}"] = d["value"]
                        params[f"unit{key}"] = unit
                        params[f"source{key}"] = source

                    sql = f"""
                        INSERT INTO satellite_observations
                        (city, parameter, date, lat, lng, value, unit, source, geom)
                        VALUES {', '.join(values_parts)}
                    """
                    await session.execute(text(sql), params)

                await session.commit()
                total_inserted += len(data)
                print(f"  [{param}] Inserted {len(data)} rows")

    print(f"\n{'='*50}")
    print(f"DONE — {total_inserted} total rows inserted across {len(cities)} cities")

    # Verify
    async with Session() as session:
        result = await session.execute(text("SELECT COUNT(*) FROM satellite_observations"))
        total = result.scalar()
        print(f"Total rows in database: {total}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(load_all())

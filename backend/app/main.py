from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, users, satellite, analytics, maps, action_plan, data, health, analysis, green_gap, time_machine

app = FastAPI(
    title="Satellite Environmental Intelligence Platform",
    description="AETRIX 2026 — PS-4: Satellite data analytics for smart cities",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(satellite.router, prefix="/api/v1/satellite", tags=["Satellite"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(maps.router, prefix="/api/v1/maps", tags=["Maps"])
app.include_router(action_plan.router, prefix="/api/v1/action-plan", tags=["Action Plan"])
app.include_router(data.router, prefix="/api/v1/data", tags=["Data"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Specialized Analysis"])
app.include_router(green_gap.router, prefix="/api/v1/green-gap", tags=["Green Gap Analysis"])
app.include_router(time_machine.router, prefix="/api/v1/time-machine", tags=["Time Machine"])

@app.on_event("startup")
async def startup():
    # Create PostGIS tables if database is configured
    try:
        from app.models.db_models import create_tables, get_engine
        engine = get_engine()
        if engine:
            await create_tables()
            print("PostgreSQL + PostGIS connected, tables ready")
        else:
            print("No DATABASE_URL configured — using in-memory fallback")
    except Exception as e:
        print(f"Database setup skipped: {e} — using in-memory fallback")

    print("Satellite Environmental Intelligence Platform started")

    # ── Warm up ALL caches in background thread ──────────────
    import threading
    threading.Thread(target=_warmup_caches, daemon=True).start()


def _warmup_caches():
    """Pre-load all data + run ML models for all 14 cities at startup."""
    import time
    start = time.time()

    try:
        from app.utils.cities import CITIES
        from app.services import satellite_service, ml_service

        params = ["LST", "NDVI", "NO2", "SO2", "CO", "O3", "AEROSOL", "SOIL_MOISTURE"]
        ml_params = ["LST", "NDVI", "NO2", "SOIL_MOISTURE"]
        city_keys = list(CITIES.keys())

        print(f"[WARMUP] Pre-loading data for {len(city_keys)} cities...")

        for i, city_key in enumerate(city_keys):
            # Load + harmonize all parameters (populates _raw_cache and _data_cache)
            for param in params:
                try:
                    satellite_service._load_data(param, city_key)
                except Exception:
                    pass

            # Pre-compute heatmap data
            for param in params:
                try:
                    satellite_service.get_heatmap_data(param, city_key)
                except Exception:
                    pass

            # Pre-compute timeseries
            for param in params:
                try:
                    satellite_service.get_timeseries(param, city_key)
                except Exception:
                    pass

            # Run ML models (populates _ml_cache)
            for param in ml_params:
                try:
                    ml_service.detect_anomalies(param, city_key)
                except Exception:
                    pass
                try:
                    ml_service.find_hotspots(param, city_key)
                except Exception:
                    pass

            # Pre-compute city summary (uses cached ML results)
            try:
                ml_service.get_city_summary(city_key)
            except Exception:
                pass

            print(f"[WARMUP] {city_key} done ({i+1}/{len(city_keys)})")

        # Record sync timestamp
        try:
            from app.services import cache_service
            cache_service.set_last_synced()
        except Exception:
            pass

        elapsed = round(time.time() - start, 1)
        print(f"[WARMUP] All {len(city_keys)} cities cached in {elapsed}s — ready for instant responses")

    except Exception as e:
        print(f"[WARMUP] Cache warmup error: {e}")

@app.on_event("shutdown")
async def shutdown():
    print("Shutting down...")

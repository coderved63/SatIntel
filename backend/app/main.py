from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, users, satellite, analytics, maps, action_plan, data, health, analysis, green_gap

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

@app.on_event("shutdown")
async def shutdown():
    print("Shutting down...")

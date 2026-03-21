from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, users, satellite, analytics, maps, action_plan, data, health

app = FastAPI(
    title="Satellite Environmental Intelligence Platform",
    description="AETRIX 2026 — PS-4: Satellite data analytics for smart cities",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
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

@app.on_event("startup")
async def startup():
    print("Satellite Environmental Intelligence Platform starting...")

@app.on_event("shutdown")
async def shutdown():
    print("Shutting down...")

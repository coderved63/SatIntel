from pydantic import BaseModel, Field
from typing import Optional, List


# Auth
class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(...)
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str

class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# Satellite
class LocationQuery(BaseModel):
    lat: float = 23.0225
    lng: float = 72.5714
    radius_km: float = 15.0

class DateRange(BaseModel):
    start_date: str = "2023-01-01"
    end_date: str = "2024-12-31"

class SatelliteDataRequest(BaseModel):
    city: str = "Ahmedabad"
    parameters: List[str] = ["LST", "NDVI", "NO2", "SOIL_MOISTURE"]
    date_range: DateRange = DateRange()
    location: LocationQuery = LocationQuery()

class DataPoint(BaseModel):
    date: str
    lat: float
    lng: float
    value: float
    parameter: str

class SpatialDataPoint(BaseModel):
    lat: float
    lng: float
    value: float
    parameter: str


# Analytics
class AnalyticsRequest(BaseModel):
    parameter: str = "LST"
    city: str = "Ahmedabad"
    date_range: DateRange = DateRange()

class AnomalyResult(BaseModel):
    date: str
    lat: float
    lng: float
    value: float
    severity: str
    parameter: str

class TrendResult(BaseModel):
    historical: dict
    forecast: dict
    trend_direction: str
    parameter: str

class HotspotResult(BaseModel):
    cluster_id: int
    center_lat: float
    center_lng: float
    num_points: int
    severity: str
    parameter: str


# Action Plan
class ActionPlanRequest(BaseModel):
    city: str = "Ahmedabad"
    parameters: List[str] = ["LST", "NDVI", "NO2", "SOIL_MOISTURE"]
    date_range: DateRange = DateRange()

class Finding(BaseModel):
    title: str
    description: str
    severity: str
    parameter: str
    evidence: str

class Recommendation(BaseModel):
    title: str
    description: str
    priority: str
    timeline: str
    location: Optional[str] = None

class ActionPlan(BaseModel):
    city: str
    generated_at: str
    summary: str
    findings: List[Finding]
    recommendations: List[Recommendation]
    priority_actions: List[str]


# Map
class HeatmapData(BaseModel):
    points: List[List[float]]  # [[lat, lng, intensity], ...]
    parameter: str
    min_value: float
    max_value: float

class MapLayer(BaseModel):
    id: str
    label: str
    type: str  # "heatmap" | "markers" | "circles"
    data: dict
    color: str
    enabled: bool = True

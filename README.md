# SatIntel — Satellite Environmental Intelligence Platform

> Turning Earth observation data into actionable environmental policy for smart cities.

**AETRIX 2026 | PS-4** — 36-hour hackathon at PDEU, Gandhinagar

---

## What It Does

SatIntel ingests real satellite data from **4 NASA/ESA missions**, harmonizes it to a **1 km common grid**, runs **4 ML models** (Isolation Forest, LSTM, DBSCAN, ARIMA), and generates a **municipal-grade Environment Action Plan** — a professional report that a city commissioner can act on immediately.

### Live Demo
- **Frontend:** [satintel.vercel.app](https://satintel.vercel.app)
- **Backend API:** [satellite-9q48.onrender.com](https://satellite-9q48.onrender.com/api/v1/health)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                    │
│  Landing │ Dashboard │ Analytics │ Action Plan │ Green Gap    │
│          │  + Map    │  + ML     │  + Report   │ + Planting   │
│                      │                                        │
│  ┌────────────── API Layer (Axios + JWT) ──────────────┐     │
└──┼─────────────────────────────────────────────────────┼─────┘
   │                    REST API (JSON)                   │
┌──┼─────────────────────────────────────────────────────┼─────┐
│  │                BACKEND (FastAPI + Python)            │     │
│  │                                                      │     │
│  │  Routes: /auth /satellite /analytics /maps           │     │
│  │          /action-plan /analysis /green-gap            │     │
│  │                                                      │     │
│  │  Services:                                           │     │
│  │    satellite_service ─── Loads & harmonizes data     │     │
│  │    ml_service ───────── Anomaly + Trend + Hotspot    │     │
│  │    vegetation_service ─ NDVI decline analysis        │     │
│  │    heat_service ─────── UHI intensity + zone ranks   │     │
│  │    land_conversion ──── 2020 vs 2024 urban sprawl    │     │
│  │    farmland_service ─── Crop activity scoring        │     │
│  │    green_gap_service ── NDVI-LST regression planting │     │
│  │    action_plan_service  Municipal-grade reports       │     │
│  │                                                      │     │
│  │  ML Models:                                          │     │
│  │    Isolation Forest │ LSTM │ DBSCAN │ ARIMA          │     │
│  │    NDVI-LST Regression (Green Gap)                   │     │
│  │                                                      │     │
│  │  Multi-Agent Pipeline:                               │     │
│  │    Data Agent → Analysis Agent → Action Plan Agent   │     │
│  │                                                      │     │
│  │  Data Harmonization:                                 │     │
│  │    IDW interpolation → 0.01° (~1.1 km) common grid   │     │
│  │    961 aligned cells per city per parameter           │     │
└──┼─────────────────────────────────────────────────────┼─────┘
   │                                                      │
┌──┼────────────────────────┐  ┌──────────────────────────┼────┐
│  DATA LAYER               │  │  DATABASE                 │    │
│                            │  │                           │    │
│  /data/[14 cities]/        │  │  PostgreSQL + PostGIS     │    │
│    lst_timeseries.json     │  │  (Neon Cloud)             │    │
│    ndvi_timeseries.json    │  │                           │    │
│    no2_timeseries.json     │  │  Spatial queries:         │    │
│    so2_timeseries.json     │  │  ST_DWithin, ST_MakePoint │    │
│    co_timeseries.json      │  │                           │    │
│    o3_timeseries.json      │  │  Tables:                  │    │
│    aerosol_timeseries.json │  │  users, observations,     │    │
│    soil_moisture.json      │  │  action_plans             │    │
│    land_use_2020.json      │  │                           │    │
│    land_use_2024.json      │  │  Fallback: in-memory      │    │
└────────────────────────────┘  └───────────────────────────────┘
              │
┌─────────────┴──────────────────────────────────────────────────┐
│                    SATELLITE DATA SOURCES                        │
│                                                                  │
│  MODIS Terra (NASA)    │ Sentinel-5P (ESA)  │ SMAP (NASA/JPL)   │
│  LST: 1km, 8-day      │ NO₂: ~7km, daily   │ Soil: 9km, daily  │
│  NDVI: 1km, 16-day    │ SO₂, CO, O₃, AOD   │                   │
│                        │                     │ Landsat 8/9 (USGS)│
│  All via Google Earth Engine Python API      │ Land use: 30m     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Gujarat cities supported | **14** (Ahmedabad, Surat, Vadodara, Rajkot, Bhavnagar, Jamnagar, Gandhinagar, Junagadh, Anand, Morbi, Mehsana, Bharuch, Navsari, Vapi) |
| Environmental parameters | **9** (LST, NDVI, NO₂, SO₂, CO, O₃, Aerosol, Soil Moisture, Land Use) |
| Satellite missions | **4** (MODIS, Sentinel-5P, SMAP, Landsat) |
| ML models | **5** (Isolation Forest, LSTM, DBSCAN, ARIMA, NDVI-LST Regression) |
| Specialized analyses | **5** (Vegetation, Land Conversion, Farmland, Heat Island, Green Gap) |
| AI agents | **3** (Data, Analysis, Action Plan) |
| Temporal coverage | **2 years** (Jan 2023 – Dec 2024) |
| Spatial resolution | **1 km** harmonized grid (IDW interpolation) |
| API endpoints | **20+** |
| Map layers | **8** toggleable heatmap overlays |

---

## Features

### Dashboard
- City selector (14 Gujarat cities)
- 4 stats cards with live satellite metrics
- Interactive Leaflet map with 8 heatmap layers (LST, NDVI, NO₂, SO₂, CO, O₃, Aerosol, Soil Moisture)
- Time-series charts (Recharts)

### ML Analytics
- **Anomaly Detection** — Isolation Forest identifies unusual environmental events
- **Trend Prediction** — LSTM (PyTorch) forecasts 30 days ahead with confidence intervals
- **Hotspot Clustering** — DBSCAN finds geographic clusters of extreme values
- **ARIMA** — Backup time-series forecasting

### Specialized Analysis
- **Vegetation Loss** — NDVI decline %, area lost, LSTM forecast, critical zones
- **Land Conversion** — 2020 vs 2024 cell-by-cell comparison, urban sprawl metrics
- **Farmland Misuse** — Crop activity scoring (0-100), idle land detection
- **Urban Heat Island** — UHI intensity (urban vs fringe delta °C), zone rankings

### Green Infrastructure Gap Analysis
- NDVI-LST regression fitted from the city's own satellite data
- Top 50 plantation sites ranked by projected cooling impact
- Projected temperature reduction per site (°C)
- Tree species recommendations (Gujarat Forest Dept guidelines)
- Interactive map with priority markers

### Environment Action Plan
- Municipal-commissioner-grade report
- Report number, classification, data sources table
- 4 evidence-backed findings with satellite data
- Risk assessment matrix
- 5 recommendations with timelines, budgets, responsible authorities
- KPI monitoring framework with quarterly milestones
- Export as PDF or JSON

### Multi-Agent System
```
User clicks "Generate" → Orchestrator
    → Data Agent (fetches satellite data)
    → Analysis Agent (runs ML models)
    → Action Plan Agent (generates report)
→ Combined response with data + analysis + action plan
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 + Vite 6 | UI framework + build |
| Tailwind CSS v4 | Styling |
| React-Leaflet + leaflet.heat | Interactive maps with heatmaps |
| Recharts | Time-series charts |
| Framer Motion | Animations |
| Axios | HTTP client |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | REST API |
| Uvicorn | ASGI server |
| Pydantic v2 | Validation |
| python-jose + bcrypt | JWT auth |
| scikit-learn | Isolation Forest, DBSCAN |
| PyTorch | LSTM neural network |
| statsmodels | ARIMA forecasting |
| pandas + numpy | Data processing |
| SQLAlchemy + GeoAlchemy2 | PostgreSQL + PostGIS ORM |

### Data & Infrastructure
| Technology | Purpose |
|-----------|---------|
| Google Earth Engine | Satellite data access |
| PostgreSQL + PostGIS (Neon) | Cloud spatial database |
| IDW Interpolation | 1 km grid harmonization |
| Vercel | Frontend hosting |
| Render | Backend hosting |

---

## Satellite Data Sources

| Mission | Agency | Parameter | Resolution |
|---------|--------|-----------|-----------|
| MODIS Terra (MOD11A2) | NASA | Land Surface Temperature | 1 km, 8-day |
| MODIS Terra (MOD13A2) | NASA | Vegetation Index (NDVI) | 1 km, 16-day |
| Sentinel-5P TROPOMI | ESA | NO₂, SO₂, CO, O₃, Aerosol | ~7 km, daily |
| NASA SMAP (SPL3SMP_E) | NASA/JPL | Soil Moisture | 9 km, daily |
| Landsat 8/9 | NASA/USGS | Land Use Classification | 30 m, 16-day |

**Harmonization:** All parameters resampled to a common **0.01° (~1.1 km) grid** using Inverse Distance Weighting (IDW) interpolation — 961 aligned cells per city.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Create account |
| POST | `/api/v1/auth/login` | Login (JWT) |
| GET | `/api/v1/satellite/parameters` | Available parameters |
| GET | `/api/v1/satellite/timeseries/{param}` | Time-series data |
| GET | `/api/v1/satellite/cities` | Supported cities |
| GET | `/api/v1/satellite/grid` | Harmonized grid info |
| GET | `/api/v1/satellite/query` | PostGIS spatial query |
| GET | `/api/v1/maps/heatmap/{param}` | Heatmap layer data |
| GET | `/api/v1/maps/land-use-change` | Land use comparison |
| POST | `/api/v1/analytics/anomalies` | Isolation Forest |
| POST | `/api/v1/analytics/trends` | LSTM/ARIMA forecast |
| POST | `/api/v1/analytics/hotspots` | DBSCAN clustering |
| GET | `/api/v1/analytics/summary/{city}` | Full city summary |
| POST | `/api/v1/action-plan/generate` | Generate action plan |
| GET | `/api/v1/analysis/vegetation` | Vegetation loss |
| GET | `/api/v1/analysis/land-conversion` | Land conversion |
| GET | `/api/v1/analysis/farmland` | Farmland misuse |
| GET | `/api/v1/analysis/heat` | Urban heat island |
| GET | `/api/v1/analysis/full-report` | All analyses combined |
| GET | `/api/v1/green-gap/analyse` | Plantation site analysis |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app + CORS + routers
│   │   ├── config.py                # Pydantic Settings
│   │   ├── routes/                  # API endpoints
│   │   │   ├── auth.py, satellite.py, analytics.py
│   │   │   ├── maps.py, action_plan.py, analysis.py
│   │   │   └── green_gap.py
│   │   ├── services/                # Business logic
│   │   │   ├── satellite_service.py # Data loading + harmonization
│   │   │   ├── ml_service.py        # ML orchestration
│   │   │   ├── vegetation_service.py, heat_service.py
│   │   │   ├── land_conversion_service.py, farmland_service.py
│   │   │   ├── green_gap_service.py # NDVI-LST plantation analysis
│   │   │   └── action_plan_service.py
│   │   ├── ml/                      # ML models
│   │   │   ├── lstm_predictor.py    # PyTorch LSTM
│   │   │   ├── anomaly_detector.py  # Isolation Forest
│   │   │   ├── hotspot_clusterer.py # DBSCAN
│   │   │   └── ndvi_lst_regression.py
│   │   ├── agents/                  # Multi-agent pipeline
│   │   │   ├── orchestrator.py
│   │   │   ├── data_agent.py, analysis_agent.py
│   │   │   └── action_plan_agent.py
│   │   ├── models/                  # Pydantic + SQLAlchemy models
│   │   └── utils/                   # GEE helpers, geo, cities
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/                   # 10 pages
│       ├── components/              # 20+ components
│       ├── services/                # API service layer
│       └── context/                 # Auth + City context
├── data/
│   └── [14 cities]/                 # 9 params + land use per city
├── notebooks/                       # GEE fetch, EDA, ML experiments
└── docs/                            # Architecture + report
```

---

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
# Optional: set DATABASE_URL in .env for PostgreSQL
python -m uvicorn app.main:app --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Environment Variables
```bash
# backend/.env
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql+asyncpg://user:pass@host/db  # optional, falls back to in-memory
```

---

## Demo Flow

1. **Landing** → "Satellite Intelligence for Smarter Cities"
2. **Signup/Login** → JWT auth
3. **Dashboard** → Ahmedabad satellite data on map → toggle heatmap layers
4. **Switch City** → Change to Surat or Vadodara — instant results
5. **Analytics** → Anomalies → Trends (LSTM forecast) → Hotspots → Domain Analysis
6. **Green Gap** → "Plant trees HERE for -4.2°C cooling" with GPS coordinates
7. **Action Plan** → Generate → municipal-grade report → Export as PDF
8. **Closing:** *"Works for any city. Satellite data is global, free, updated daily."*

---

## Team

Built for **AETRIX 2026 — PS-4**: Satellite Environmental Intelligence Platform for Smart Cities

| Name | Role |
|------|------|
| **Himanshu Mishra** | Full-Stack Development, GEE Integration, ML Pipeline, UI/UX |
| **Vedant Mehta** | Backend Services, Specialized Analysis, Deployment,Landing page and login page ui/ux|
| **Riya Joshi** | Research,Ideation,Integration,Dashboard Design|
| **Soham Gor** | ,Frontend Animation,Frontend Development, Theme System, Research Mode |


**Domain:** Sustainability & Environment
**Evaluation:** Problem Relevance (Critical) > Innovation & Technical Implementation (High) > Feasibility & Scalability (Medium)

---

## Problem Statement

**PS-4:** Build a Satellite Environmental Intelligence Platform that helps municipal corporations, environmental regulators, and urban planners make data-driven decisions about urban heat islands, air quality, vegetation loss, soil moisture, and land use change — using free, publicly available satellite data from NASA and ESA missions.

**Target Users:**
- Municipal corporations and city planners making environmental management decisions
- Environmental regulators (GPCB/CPCB) tracking pollution and land use change
- Urban planners assessing heat islands, green cover, and drainage
- Researchers querying spatial-temporal environmental data

---

## Setup & Run Instructions

### Prerequisites
- **Python 3.11+** with pip
- **Node.js 18+** with npm
- (Optional) PostgreSQL with PostGIS extension
- (Optional) Google Earth Engine service account for live data fetch

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env         # Edit with your settings
# Required: JWT_SECRET
# Optional: DATABASE_URL (PostgreSQL), GEE_SERVICE_ACCOUNT_EMAIL

# Run the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend
npm install

# For local development (proxies API to localhost:8000)
npm run dev
# Opens at http://localhost:5173

# For production build
npm run build
```

### Database Setup (Optional)
```bash
# If using PostgreSQL + PostGIS for spatial queries & Research Mode
# Set DATABASE_URL in backend/.env:
# DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname

# Load satellite data into database
cd ..
python scripts/load_data_to_db.py
# Loads ~98,000 rows across 14 cities with PostGIS spatial indexes
```

### GEE Data Fetch (Optional)
```bash
# To re-fetch satellite data from Google Earth Engine
# Requires: gee_service_account.json in project root
python notebooks/01_gee_data_fetch.py
# Fetches data for 14 Gujarat cities, 10 parameters, 2020-2026
```

### Environment Variables
```bash
# backend/.env
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
DATABASE_URL=postgresql+asyncpg://user:pass@host/db   # optional
GEE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com  # optional
GEE_KEY_FILE=gee_service_account.json  # optional

# frontend/.env.production
VITE_API_URL=https://your-backend-url.com/api/v1
```

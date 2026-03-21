# AETRIX 2026 | PS-4: Satellite Environmental Intelligence Platform
## PPT Generation Brief — Complete Project Details

---

## WHAT IS THIS PROJECT?

**SatIntel** is a full-stack **Satellite Environmental Intelligence Platform** that turns raw Earth observation data into actionable environmental policy for smart cities.

It pulls real satellite data from 4 NASA/ESA missions (MODIS, Sentinel-5P, SMAP, Landsat), runs machine learning analytics (anomaly detection, LSTM forecasting, spatial clustering), displays everything on interactive heatmap-enabled maps, and generates a **municipal-grade Environment Action Plan** — a professional report that can be handed directly to a city commissioner.

**Built for:** AETRIX 2026 — 36-hour hackathon at PDEU, Gandhinagar
**Domain:** Sustainability & Environment
**Problem Statement:** PS-4 — Satellite Environmental Intelligence Platform for Smart Cities

---

## THE PROBLEM WE SOLVE

Cities face environmental degradation — urban heat islands, vegetation loss, rising air pollution, water body encroachment, farmland misuse — but decision-makers lack a single platform that:
1. Ingests multi-source satellite data automatically
2. Runs ML-based analysis to detect anomalies, forecast trends, and find hotspots
3. Produces actionable, location-specific recommendations backed by satellite evidence

**Our platform bridges the gap between raw satellite data and municipal policy action.**

---

## WHAT THE WEBSITE DOES (User Flow)

### 1. Landing Page
- Hero: "Satellite Intelligence for Smarter Cities"
- Shows platform capabilities: Multi-Satellite Data Fusion, ML-Powered Analytics, Actionable City Intelligence
- Stats: 4+ satellite missions, 3 ML algorithms, 1 km resolution, 2-year temporal coverage
- Tech stack showcase

### 2. Login / Signup
- JWT-based authentication (HS256, 24h expiry)
- Protected routes — all analysis features require login

### 3. Dashboard (Main View)
- **City selector** — switch between 14 Gujarat cities instantly
- **4 Stats Cards** showing live satellite metrics:
  - Average Temperature (°C) from MODIS LST
  - Vegetation Index (NDVI) from MODIS
  - Air Quality (NO₂/SO₂/CO/O₃/Aerosol — dropdown selector) from Sentinel-5P
  - Soil Moisture (m³/m³) from NASA SMAP
- **Interactive Leaflet Map** (60% of screen):
  - Heatmap overlays using `leaflet.heat` canvas rendering
  - 8 toggleable layers: LST, NDVI, NO₂, SO₂, CO, O₃, Aerosol, Soil Moisture
  - CartoDB Dark Matter basemap
  - Parameter-specific color gradients (blue→red for temp, brown→green for vegetation, etc.)
  - Circle markers with popups showing exact values
- **Time-Series Charts** (40% of screen):
  - Temperature trend line
  - Vegetation health trend line
  - Air quality trend line
  - Built with Recharts (area charts with gradient fills)

### 4. Analytics Page
- **Parameter selector**: LST, NDVI, NO₂, SOIL_MOISTURE
- **4 Analysis Tabs**:

  **Tab 1 — Anomalies:** Detected unusual environmental events using Isolation Forest
  - Lists each anomaly with: date, lat/lng, value, severity (Critical/High/Moderate)

  **Tab 2 — Trends:** Time-series forecasting using LSTM
  - Historical data + 30-day forecast overlay
  - Trend direction indicator (increasing/decreasing)
  - Confidence intervals

  **Tab 3 — Hotspots:** Geographic clustering using DBSCAN
  - Map showing cluster circles (red = critical, orange = high, amber = moderate)
  - Cluster details: center coordinates, cell count, severity

  **Tab 4 — Domain Analysis (Specialized):** 5 in-depth environmental analyses:
  1. **Vegetation Loss Detection** — NDVI decline %, critical zones, area lost, forecast
  2. **Land Conversion Tracking** — 2020 vs 2024 land use comparison, urban sprawl metrics
  3. **Farmland Misuse Detection** — Crop activity scoring, idle land flagging, suspicious zones
  4. **Urban Heat Island Mapping** — Zone-wise temperature ranking, UHI intensity, peak temps
  5. **Water Body Encroachment** — Preserved vs encroached water cells, area lost

### 5. Action Plan Page
- Click **"Generate Environment Action Plan"** → triggers multi-agent pipeline
- Progress indicator: Fetching data → Anomaly detection → Trend analysis → Hotspot ID → Generating plan
- Outputs a **municipal-commissioner-grade report** containing:
  - Report metadata (number, classification, date, authority)
  - Executive summary with real satellite data values
  - Data sources table (mission, parameter, resolution, coverage)
  - 4 key findings backed by satellite evidence
  - Risk assessment matrix (parameter × likelihood × impact × urgency)
  - Priority intervention zones (specific city locations with coordinates)
  - 5 actionable recommendations with timelines, budgets (₹ Cr), responsible authorities
  - KPI monitoring framework with quarterly milestones
  - Legal disclaimer
- **Export as PDF or JSON**

---

## CITIES SUPPORTED (14 Gujarat Cities)

| # | City | Population | Focus Area |
|---|------|-----------|------------|
| 1 | **Ahmedabad** | 8.6M metro | Primary demo city, UHI focus |
| 2 | **Surat** | 7.8M metro | Industrial + textile zone |
| 3 | **Vadodara** | 2.2M metro | Petrochemical corridor |
| 4 | **Rajkot** | 2.0M metro | SME hub |
| 5 | **Bhavnagar** | 0.7M | Coastal + shipbreaking |
| 6 | **Jamnagar** | 0.8M | Reliance Refinery zone |
| 7 | **Gandhinagar** | 0.4M | State capital, GIFT City |
| 8 | **Junagadh** | 0.4M | Gir Forest proximity |
| 9 | **Anand** | 0.3M | Dairy/Agriculture hub |
| 10 | **Morbi** | 0.3M | Ceramics industry hub |
| 11 | **Mehsana** | 0.2M | Agriculture zone |
| 12 | **Bharuch** | 0.2M | Petrochemical zone |
| 13 | **Navsari** | 0.2M | Agricultural region |
| 14 | **Vapi** | 0.2M | Chemical industry hub |

Each city has its own pre-fetched satellite dataset with 9 environmental parameters and land-use change data.

---

## SATELLITE DATA SOURCES

| Satellite Mission | Agency | Parameter | Resolution | Frequency |
|------------------|--------|-----------|------------|-----------|
| **MODIS Terra** (MOD11A2) | NASA | Land Surface Temperature (LST) | 1 km | 8-day composite |
| **MODIS Terra** (MOD13A2) | NASA | Vegetation Index (NDVI) | 1 km | 16-day composite |
| **Sentinel-5P TROPOMI** | ESA | NO₂ (Nitrogen Dioxide) | ~7 km | Daily |
| **Sentinel-5P TROPOMI** | ESA | SO₂ (Sulfur Dioxide) | ~7 km | Daily |
| **Sentinel-5P TROPOMI** | ESA | CO (Carbon Monoxide) | ~7 km | Daily |
| **Sentinel-5P TROPOMI** | ESA | O₃ (Ozone) | ~7 km | Daily |
| **Sentinel-5P TROPOMI** | ESA | Aerosol Index | ~7 km | Daily |
| **NASA SMAP** (SPL3SMP_E) | NASA | Soil Moisture | 9 km | Daily |
| **Landsat 8/9** | NASA/USGS | Land Use Classification | 30 m | 16-day |

**Temporal coverage:** January 2023 — December 2024 (2 years)
**Spatial coverage:** City bounding boxes for all 14 Gujarat cities
**Harmonization:** All parameters resampled to a common **1 km grid** using Inverse Distance Weighting (IDW) interpolation

---

## ML / AI MODELS USED

### 1. Isolation Forest (Anomaly Detection)
- **Library:** scikit-learn
- **Purpose:** Detect unusual environmental events — temperature spikes, pollution events, vegetation drops, moisture anomalies
- **How it works:** Builds random trees that isolate anomalies faster than normal points. Points isolated in fewer splits = more anomalous.
- **Output:** Each anomaly gets a confidence score (0–1) and severity label (Critical / High / Moderate)
- **Contamination:** 5% (assumes ~5% of data points are anomalous)

### 2. LSTM Neural Network (Time-Series Forecasting)
- **Library:** PyTorch (with exponential smoothing fallback)
- **Purpose:** Predict future values for any environmental parameter (30-day / 6-month forecasts)
- **Architecture:** 2-layer LSTM, 32 hidden units, lookback window of 12 timesteps
- **Output:** Predicted values with confidence intervals (high/low bounds), trend direction
- **Special feature:** `crop_activity_score()` — scores NDVI patterns against known farming cycles (0–100) to detect farmland misuse

### 3. DBSCAN (Spatial Hotspot Clustering)
- **Library:** scikit-learn
- **Purpose:** Identify geographic clusters of extreme values — heat islands, pollution zones, vegetation stress areas, water loss zones
- **How it works:** Groups nearby high-value points using density-based spatial clustering. No need to specify number of clusters.
- **Parameters:** eps=0.02 (~2 km radius), min_samples=3
- **Output:** Cluster centroids, cell counts, severity, confidence score

### 4. ARIMA (Backup Trend Prediction)
- **Library:** statsmodels
- **Purpose:** Alternative time-series forecasting using Auto-Regressive Integrated Moving Average
- **Order:** (5, 1, 0)
- **Fallback:** Linear extrapolation if ARIMA fails to converge

---

## MULTI-AGENT SYSTEM (Innovation Differentiator)

A 3-agent pipeline orchestrated for automated end-to-end environmental analysis:

```
User clicks "Generate Action Plan"
        │
        ▼
   ORCHESTRATOR
        │
   ┌────┼────┐
   ▼    ▼    ▼
 DATA  ANALYSIS  ACTION PLAN
 AGENT  AGENT    AGENT
   │    │        │
   │  Fetches    Runs 3 ML      Generates municipal-
   │  satellite  models across   grade report with
   │  data for   all parameters  evidence-backed
   │  the city   (anomaly,       recommendations,
   │             trend, hotspot) budgets, timelines
   │    │        │
   └────┼────────┘
        ▼
   COMBINED RESPONSE
   {satellite_data, analysis, action_plan}
```

**Why multi-agent?** Different expertise needed at each stage:
- **Data Agent** specializes in multi-source satellite data fetching and harmonization
- **Analysis Agent** specializes in ML model execution and result interpretation
- **Action Plan Agent** specializes in policy language and municipal report formatting

---

## 5 SPECIALIZED ENVIRONMENTAL ANALYSES

### 1. Vegetation Loss Detection
- Compares NDVI first half vs second half → calculates decline percentage
- Counts critical zones (NDVI < 0.15 = barren/severely stressed)
- Calculates area of vegetation lost from land-use change (km²)
- Runs Isolation Forest for NDVI anomaly detection
- DBSCAN clusters low-NDVI stress zones
- LSTM 6-month NDVI forecast
- Outputs trend direction (declining/stable/improving)

### 2. Land Conversion Tracking
- Compares 2020 vs 2024 land-use classification data
- Tracks conversions: vegetation→urban, water→urban, sparse→dense, etc.
- Flags rapid conversion zones (vegetation→urban = highest concern)
- DBSCAN clusters changed cells
- Reports total area changed (km²) and conversion breakdown by type

### 3. Farmland Misuse Detection
- Scores each location's crop activity (0–100) using LSTM against known farming cycles
- Classifies: active_farmland / idle_land / barren_or_converted
- Flags suspicious zones: locations with greenness (NDVI) but low farming activity patterns
- Clusters suspicious zones using DBSCAN
- Helps identify land that should be farmed but isn't

### 4. Urban Heat Island Mapping
- Divides city into 6 zones: City Core, Industrial East, Western Suburbs, North, South, Periphery
- Calculates UHI intensity = core_avg_temp − fringe_avg_temp (°C)
- Ranks zones by average temperature
- Identifies peak temperature and city-wide average
- Runs Isolation Forest for temperature anomalies
- DBSCAN clusters heat hotspots
- Reports top 3 hottest zones

### 5. Water Body Encroachment
- Tracks water cells from 2020 → checks their 2024 status
- Categorizes: preserved water / encroached (converted to urban/vegetation)
- Calculates area of water body lost (km²)
- Breaks down encroachment by type (urban vs vegetation)
- Identifies specific locations of encroachment

---

## TECH STACK

### Backend
| Technology | Purpose |
|-----------|---------|
| **FastAPI** (Python 3.11+) | REST API framework |
| **Uvicorn** | ASGI server |
| **Pydantic v2** | Request/response validation |
| **python-jose** | JWT token creation/validation |
| **passlib (bcrypt)** | Password hashing |
| **scikit-learn** | Isolation Forest, DBSCAN |
| **PyTorch** | LSTM neural network |
| **statsmodels** | ARIMA time-series |
| **pandas + numpy** | Data processing |
| **geopandas** | Geospatial dataframes |
| **xarray** | Multi-dimensional satellite arrays |
| **earthengine-api** | Google Earth Engine integration |
| **Motor** | MongoDB async driver |
| **SQLAlchemy + GeoAlchemy2** | PostgreSQL + PostGIS ORM |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework |
| **Vite 6** | Build tool + dev server |
| **React Router v6** | Client-side routing |
| **Tailwind CSS v4** | Utility-first styling |
| **Leaflet + React-Leaflet** | Interactive maps |
| **leaflet.heat** | Heatmap canvas overlays |
| **Recharts** | Time-series charts |
| **Axios** | HTTP client |
| **Lucide React** | Icons |

### Data Pipeline
| Technology | Purpose |
|-----------|---------|
| **Google Earth Engine (GEE)** | Cloud-based satellite data access |
| **MODIS, Sentinel-5P, SMAP, Landsat** | Satellite missions |
| **IDW Interpolation** | Spatial harmonization to 1 km grid |
| **JSON storage** | Pre-fetched data for fast demo |

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐   │
│  │ Landing  │  │Dashboard │  │ Analytics │  │ Action Plan  │   │
│  │  Page    │  │  Page    │  │   Page    │  │    Page      │   │
│  └──────────┘  └──────────┘  └───────────┘  └──────────────┘   │
│        │            │              │               │             │
│  ┌─────┴────────────┴──────────────┴───────────────┴─────┐      │
│  │              API Services Layer (Axios)                │      │
│  └───────────────────────┬───────────────────────────────┘      │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────────────┐      │
│  │         City Context (14 Gujarat cities)               │      │
│  └───────────────────────────────────────────────────────┘      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (JSON)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI + Python)                     │
│                                                                   │
│  ┌─────────────────── API Routes ──────────────────────────┐    │
│  │ /auth  /satellite  /analytics  /maps  /action-plan      │    │
│  │ /users /data       /health     /analysis (5 specialized) │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────┴────────────────────────────────┐    │
│  │              SERVICE LAYER (Business Logic)              │    │
│  │                                                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │Satellite │ │    ML    │ │  Action  │ │   Auth   │   │    │
│  │  │ Service  │ │ Service  │ │  Plan    │ │ Service  │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  │                                                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │Vegetation│ │  Land    │ │ Farmland │ │  Heat    │   │    │
│  │  │ Service  │ │Conversion│ │ Service  │ │ Service  │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  │                                                          │    │
│  │  ┌──────────┐                                            │    │
│  │  │  Water   │                                            │    │
│  │  │ Service  │                                            │    │
│  │  └──────────┘                                            │    │
│  └──────────────────────────────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────┴────────────────────────────────┐    │
│  │                    ML MODELS                             │    │
│  │  Isolation Forest │ LSTM (PyTorch) │ DBSCAN │ ARIMA     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────┴────────────────────────────────┐    │
│  │               MULTI-AGENT PIPELINE                       │    │
│  │  Orchestrator → Data Agent → Analysis Agent → Plan Agent │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  /data/[14 cities]/                                    │      │
│  │    lst_timeseries.json    (MODIS LST)                  │      │
│  │    ndvi_timeseries.json   (MODIS NDVI)                 │      │
│  │    no2_timeseries.json    (Sentinel-5P NO₂)            │      │
│  │    so2_timeseries.json    (Sentinel-5P SO₂)            │      │
│  │    co_timeseries.json     (Sentinel-5P CO)             │      │
│  │    o3_timeseries.json     (Sentinel-5P O₃)             │      │
│  │    aerosol_timeseries.json(Sentinel-5P Aerosol)        │      │
│  │    soil_moisture.json     (NASA SMAP)                  │      │
│  │    land_use_2020.json     (Landsat 8)                  │      │
│  │    land_use_2024.json     (Landsat 9)                  │      │
│  │    land_use_change_summary.json                        │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  Google Earth Engine (GEE) — source for all data       │      │
│  │  Harmonized to 1 km grid via IDW interpolation         │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## API ENDPOINTS (18 Total)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/health` | No | Health check |
| POST | `/api/v1/auth/signup` | No | Create account |
| POST | `/api/v1/auth/login` | No | Login, get JWT |
| GET | `/api/v1/users/me` | Yes | Current user profile |
| GET | `/api/v1/satellite/parameters` | No | List available parameters |
| POST | `/api/v1/satellite/fetch` | Yes | Fetch satellite data for city |
| GET | `/api/v1/satellite/timeseries/{param}` | No | Time-series for charts |
| POST | `/api/v1/analytics/anomalies` | Yes | Run Isolation Forest |
| POST | `/api/v1/analytics/trends` | Yes | Run LSTM/ARIMA forecast |
| POST | `/api/v1/analytics/hotspots` | Yes | Run DBSCAN clustering |
| GET | `/api/v1/analytics/summary/{city}` | Yes | Full city analytics |
| GET | `/api/v1/maps/heatmap/{param}` | No | Heatmap layer data |
| GET | `/api/v1/maps/layers` | No | All map layers |
| GET | `/api/v1/maps/land-use-change` | No | 2020 vs 2024 comparison |
| POST | `/api/v1/action-plan/generate` | Yes | Generate action plan |
| GET | `/api/v1/action-plan/history` | Yes | Past plans |
| GET | `/api/v1/analysis/vegetation` | No | Vegetation loss analysis |
| GET | `/api/v1/analysis/land-conversion` | No | Land conversion analysis |
| GET | `/api/v1/analysis/farmland` | No | Farmland misuse analysis |
| GET | `/api/v1/analysis/heat` | No | Urban heat island analysis |
| GET | `/api/v1/analysis/water` | No | Water encroachment analysis |
| GET | `/api/v1/analysis/full-report` | No | All 5 analyses combined |

---

## KEY NUMBERS FOR PPT

- **14** Gujarat cities supported with real satellite data
- **9** environmental parameters tracked per city
- **4** satellite missions integrated (MODIS, Sentinel-5P, SMAP, Landsat)
- **4** ML/AI models (Isolation Forest, LSTM, DBSCAN, ARIMA)
- **5** specialized environmental analyses (Vegetation, Land, Farmland, Heat, Water)
- **3** AI agents in multi-agent pipeline
- **2 years** of temporal coverage (2023–2024)
- **1 km** harmonized spatial resolution
- **18+** REST API endpoints
- **8** interactive map layers with heatmap overlays
- **60+** source files across frontend and backend

---

## WHAT MAKES THIS PROJECT STAND OUT

1. **Real Satellite Data** — Not mock data. Actual MODIS, Sentinel-5P, SMAP observations for Gujarat cities via Google Earth Engine.

2. **Multi-City Coverage** — 14 Gujarat cities, not just one. Switch cities with a single click — same analysis pipeline runs everywhere.

3. **5 Domain-Specific Analyses** — Goes beyond generic charts. Vegetation loss, land conversion, farmland misuse, heat islands, water encroachment — each with specialized detection logic.

4. **Multi-Agent AI Pipeline** — 3 specialized agents (Data, Analysis, Action Plan) coordinated by an orchestrator. Not just one model — a full pipeline.

5. **Municipal-Grade Reports** — Action plans formatted like real government reports with classification, evidence, risk matrices, budgets (₹ Cr), responsible authorities, KPI frameworks, and quarterly monitoring schedules.

6. **Interactive Geospatial Maps** — Not static images. Leaflet heatmaps with 8 toggleable layers, zoom, popups, and cluster visualization on a dark basemap.

7. **LSTM Neural Network** — Deep learning for time-series forecasting with confidence intervals. Includes a custom `crop_activity_score` for farmland misuse detection.

8. **Export Ready** — Action plans can be exported as PDF or JSON for submission to authorities.

9. **Scalable Architecture** — City-agnostic design. Add a new city = add bounding box coordinates + fetch data. The entire ML pipeline runs automatically.

10. **Hackathon-Practical** — Pre-fetched data means zero latency in demo. No waiting for API calls. Everything renders instantly.

---

## DEMO SCRIPT (For Presentation)

1. **Landing Page** → Show the hero, explain the problem we solve
2. **Login** → Quick auth demo
3. **Dashboard** → "Here's Ahmedabad right now" — show heatmap layers, toggle LST/NDVI/NO₂, point out stats cards
4. **Switch City** → Change to Surat or Vadodara — "Same pipeline, different city, instant results"
5. **Analytics** → Click NDVI → show anomalies detected → show forecast → show hotspot clusters on map
6. **Domain Analysis** → Show all 5 specialized cards — "This isn't just charts, it's environmental intelligence"
7. **Action Plan** → Click Generate → watch progress → show the full municipal report → "Hand this to the commissioner today"
8. **Export** → Download as PDF → "Ready for submission"

**Closing line:** *"This platform works for every city. We built it for Gujarat. It can be deployed for any city in India — just change the coordinates. The satellite data is global, free, and updated daily."*

---

## TEAM & HACKATHON INFO

- **Hackathon:** AETRIX 2026 at PDEU, Gandhinagar
- **Duration:** 36 hours
- **Domain:** Sustainability & Environment
- **Problem Statement:** PS-4 — Satellite Environmental Intelligence Platform for Smart Cities
- **Evaluation Criteria:** Problem Relevance (Critical) > Innovation & Technical Implementation (High) > Feasibility & Scalability (Medium)

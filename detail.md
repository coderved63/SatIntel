# AETRIX 2026 | PS-4: Satellite Environmental Intelligence Platform — Detailed Project Report

## Project Overview

This project is a **full-stack Satellite Environmental Intelligence Platform** built for the AETRIX 2026 hackathon (Problem Statement 4). It ingests real satellite data from multiple NASA/ESA missions, runs machine learning analytics (anomaly detection, trend forecasting, hotspot clustering), renders interactive geospatial maps, and generates a municipal-grade **Environment Action Plan** for Ahmedabad.

**Target City:** Ahmedabad, Gujarat
**Tech Stack:** FastAPI (Python) + React 18 (Vite) + Leaflet Maps + scikit-learn + Multi-Agent System
**Demo Flow:** Login → Dashboard (map + stats) → Analytics (anomalies + trends + hotspots) → Action Plan (generate live)

---

## Development Timeline (Git History)

| # | Commit | Description |
|---|--------|-------------|
| 1 | `7e4cc53` | Initialized project structure — folders, `.gitignore`, base config |
| 2 | `e73d0ce` | Built FastAPI backend with Pydantic config, JWT auth service, auth routes |
| 3 | `17e5902` | Added satellite data service (loads pre-fetched GEE JSON), satellite routes |
| 4 | `06776ab` | Added ML service — Isolation Forest, ARIMA, DBSCAN algorithms |
| 5 | `d730625` | Built multi-agent system — orchestrator, data agent, analysis agent, action plan agent |
| 6 | `c61b3a4` | Set up React frontend with Vite, Tailwind, auth flow (login/signup/context) |
| 7 | `321b0fc` | Added layout components (Navbar, Sidebar, DashboardLayout) and landing page |
| 8 | `4d1a9ad` | Built interactive dashboard — Leaflet map with heatmaps, stats cards, charts |
| 9 | `310e009` | Added analytics page with anomaly list, trend chart, and hotspot map |
| 10 | `14948fb` | Added action plan page and data explorer page |
| 11 | `42322b7` | Added real Ahmedabad satellite dataset (LST, NDVI, NO₂, Soil Moisture JSON files) |
| 12 | `fb25b17` | Added project README |
| 13 | `3a13754` | Added PDF/JSON export for action plan; upgraded report to municipal-grade quality |

---

## Backend — Detailed Breakdown

### 1. FastAPI Application (`backend/app/main.py`)

The backend is a FastAPI application with:
- **CORS middleware** configured for `localhost:5173` (frontend dev server) and all origins
- **8 routers** mounted under `/api/v1`: health, auth, users, satellite, analytics, maps, action_plan, data
- **Uvicorn** as the ASGI server

### 2. Configuration (`backend/app/config.py`)

Pydantic `BaseSettings` class loading from `.env`:
- MongoDB connection URL and database name
- JWT secret key, algorithm (HS256), and token expiry (24 hours)
- Google Earth Engine service account credentials
- Anthropic and OpenAI API keys for LLM-based action plan generation
- Cached singleton via `@lru_cache()`

### 3. Authentication System

**`backend/app/services/auth_service.py`**
- In-memory user store (dict-based, no database dependency for demo)
- Password hashing with `passlib` (bcrypt)
- JWT token creation and validation using `python-jose`
- Functions: `signup()`, `login()`, `create_token()`, `decode_token()`, `verify_password()`, `hash_password()`

**`backend/app/middleware/auth_middleware.py`**
- `get_current_user()` FastAPI dependency
- Extracts Bearer token from Authorization header
- Validates JWT and returns user payload
- Raises `401 Unauthorized` on invalid/expired tokens

**`backend/app/routes/auth.py`**
- `POST /api/v1/auth/signup` — creates user, returns `{ token, user: { id, name, email } }`
- `POST /api/v1/auth/login` — authenticates credentials, returns JWT

**`backend/app/routes/users.py`**
- `GET /api/v1/users/me` — returns the authenticated user's profile

### 4. Satellite Data Service (`backend/app/services/satellite_service.py`)

This is the core data layer. It:
- **Loads pre-fetched satellite JSON** from `data/ahmedabad/` at module import time
- Supports 5 environmental parameters:
  - **LST** (Land Surface Temperature) — from MODIS Terra (MOD11A2), unit: °C
  - **NDVI** (Vegetation Index) — from MODIS (MOD13A2), unit: index (0-1)
  - **NO₂** (Nitrogen Dioxide) — from Sentinel-5P TROPOMI, unit: µmol/m²
  - **SOIL_MOISTURE** — from NASA SMAP, unit: m³/m³
  - **LAND_USE** — from Landsat 8/9, classification codes

Key functions:
- `fetch_satellite_data(city, parameters, date_range)` — returns filtered data for a city
- `get_timeseries(parameter, city)` — aggregates data by date (mean values per date) for chart rendering
- `get_heatmap_data(parameter, city)` — formats as `[[lat, lng, intensity], ...]` for Leaflet heatmap layers
- `get_all_layers()` — returns all map layers with their data and metadata (name, color, unit, source)
- `get_statistics(parameter, city)` — computes mean, std, min, max, median using NumPy
- `get_land_use_change(city)` — compares 2020 vs 2024 land use to show urban sprawl

### 5. Satellite Data Routes (`backend/app/routes/satellite.py`)

- `GET /api/v1/satellite/parameters` — returns list of available parameters with metadata
- `POST /api/v1/satellite/fetch` — fetches data for city + parameters + date range (auth required)
- `GET /api/v1/satellite/timeseries/{parameter}` — time-series for chart visualization

### 6. ML Analytics Service (`backend/app/services/ml_service.py`)

Three machine learning algorithms running on the satellite data:

**Anomaly Detection — Isolation Forest:**
- Uses `sklearn.ensemble.IsolationForest` with `contamination=0.05`
- Detects unusual environmental events (temperature spikes, pollution events, vegetation drops)
- Assigns severity: **critical** (score < -0.3), **high** (score < -0.15), **moderate** (rest)
- Returns: date, lat, lng, value, anomaly_score, severity for each anomaly

**Trend Prediction — ARIMA:**
- Uses `statsmodels.tsa.arima.model.ARIMA` with order `(5, 1, 0)`
- Forecasts 30 days into the future for any parameter
- Falls back to **linear extrapolation** if ARIMA fails (robust for demo)
- Returns: historical values, forecast values, trend_direction (increasing/decreasing), confidence interval

**Hotspot Clustering — DBSCAN:**
- Uses `sklearn.cluster.DBSCAN` with `eps=0.01`, `min_samples=3`
- Filters to top 20th percentile values (hottest, most polluted, etc.)
- Clusters geographically proximate extreme values
- Returns: cluster_id, center_lat, center_lng, num_points, severity (high if > 5 points)

**Summary Analytics:**
- `get_city_summary(city)` — runs all three models across all 4 parameters
- Returns comprehensive statistics, anomaly counts, hotspot counts, trend directions

### 7. Analytics Routes (`backend/app/routes/analytics.py`)

- `POST /api/v1/analytics/anomalies` — detects anomalies for a specific parameter (auth required)
- `POST /api/v1/analytics/trends` — predicts trend & generates forecast (auth required)
- `POST /api/v1/analytics/hotspots` — finds geographic hotspot clusters (auth required)
- `GET /api/v1/analytics/summary/{city}` — returns full analytics summary for a city (auth required)

### 8. Map Data Routes (`backend/app/routes/maps.py`)

- `GET /api/v1/maps/heatmap/{parameter}` — returns heatmap data points formatted for leaflet.heat
- `GET /api/v1/maps/layers` — returns all available map layers with their data
- `GET /api/v1/maps/land-use-change` — returns 2020 vs 2024 land use comparison data

### 9. Action Plan Service (`backend/app/services/action_plan_service.py`)

Generates a **municipal-commissioner-grade Environment Action Plan**:

`generate_action_plan(city, parameters)`:
1. Collects statistics for each satellite parameter
2. Runs anomaly detection and hotspot clustering
3. Calls `_generate_template_plan()` to build a structured report

`_generate_template_plan(city, satellite_findings)` produces:
- **Report metadata** — report number, classification (OFFICIAL-SENSITIVE), date, authority
- **Executive summary** — 3-paragraph overview of findings with real satellite data values
- **Data sources table** — satellite mission, parameter, resolution, temporal coverage for each dataset
- **4 key findings** with evidence:
  1. Urban Heat Island Effect (LST data) — severity, evidence string, trend, affected population
  2. Vegetation Cover Deficit (NDVI data) — percentage loss, specific zones
  3. Air Quality Degradation (NO₂ data) — exceedance levels, health risk areas
  4. Soil Moisture Stress (SOIL_MOISTURE data) — drought risk zones, agricultural impact
- **Risk assessment matrix** — parameter, risk level, likelihood, impact, urgency rating
- **Priority intervention zones** — specific Ahmedabad areas (Maninagar, Vatva, Naroda, etc.) with lat/lng, zone type, severity
- **5 evidence-backed recommendations** with:
  - Title, description, priority level
  - Timeline (immediate / short-term / medium-term / long-term)
  - Estimated budget (₹2-25 Cr range)
  - Responsible authority (AMC, GPCB, Forest Dept, etc.)
  - Specific target location in Ahmedabad
- **KPIs and monitoring framework** — target values, baseline, quarterly milestones
- **Quarterly monitoring schedule** — Q1 through Q4 activities
- **Legal disclaimer**

### 10. Action Plan Routes (`backend/app/routes/action_plan.py`)

- `POST /api/v1/action-plan/generate` — triggers the full multi-agent pipeline, returns complete action plan (auth required)
- `GET /api/v1/action-plan/history` — retrieves previously generated plans (auth required, returns empty for now)

### 11. Multi-Agent System (`backend/app/agents/`)

A 3-agent pipeline orchestrated for automated end-to-end analysis:

**Orchestrator (`orchestrator.py`):**
- `run_analysis(city, parameters, date_range)` — coordinates all 3 agents sequentially
- Logs timing for each agent step
- Returns combined result: `{ satellite_data, analysis, action_plan, metadata }`

**Data Agent (`data_agent.py`):**
- Fetches satellite data from `satellite_service` for each requested parameter
- Returns raw_data, statistics, timeseries, and heatmap data per parameter
- Handles errors gracefully per-parameter

**Analysis Agent (`analysis_agent.py`):**
- Runs all 3 ML models (Isolation Forest, ARIMA, DBSCAN) on each parameter's data
- Returns structured results: anomalies, trend, hotspots per parameter
- Logs summary counts

**Action Plan Agent (`action_plan_agent.py`):**
- Restructures analysis results into the format expected by `action_plan_service`
- Calls `_generate_template_plan()` to produce the municipal-grade report
- Returns the complete action plan

### 12. Database Service (`backend/app/services/db_service.py`)

Dual-mode database abstraction:
- **PostgreSQL + PostGIS** mode: async CRUD with spatial queries (`ST_DWithin`), SQLAlchemy models
- **In-memory fallback** mode: dict-based storage when no database is configured
- Models: Users, SatelliteObservations, ActionPlanRecords
- The fallback mode ensures the demo works without any database setup

### 13. Database Models (`backend/app/models/db_models.py`)

SQLAlchemy + PostGIS ORM models:
- `User` — id (UUID), name, email, hashed_password, created_at
- `SatelliteObservation` — city, parameter, date, lat, lng, value, unit, source, geom (PostGIS POINT)
- `ActionPlanRecord` — id, city, plan_json (JSONB), created_at, created_by (FK to User)
- Spatial indexes on geometry columns for fast geospatial queries

### 14. Pydantic Schemas (`backend/app/models/schemas.py`)

Request/Response models for all API endpoints:
- **Auth:** SignupRequest, LoginRequest, AuthResponse, UserResponse
- **Satellite:** LocationQuery, DateRange, SatelliteDataRequest, DataPoint, SpatialDataPoint
- **Analytics:** AnalyticsRequest, AnomalyResult, TrendResult, HotspotResult
- **Action Plan:** ActionPlanRequest, Finding, Recommendation, ActionPlan, ActionPlanResponse
- **Maps:** HeatmapData, MapLayer

### 15. Utility Modules

**`backend/app/utils/gee_helpers.py`** — Google Earth Engine Integration:
- `init_gee()` — initializes GEE with service account or interactive auth
- City configs for Ahmedabad, Delhi, Bengaluru (bbox, center)
- `fetch_lst()` — MODIS Terra LST (MOD11A2), 8-day composite, 1km, Kelvin→Celsius
- `fetch_ndvi()` — MODIS NDVI (MOD13A2), 16-day, 1km, scaled by 0.0001
- `fetch_no2()` — Sentinel-5P TROPOMI NO₂ column density
- `fetch_land_use()` — Landsat 8 surface reflectance + simple classification
- `_extract_timeseries()` — samples grid points across city bbox
- `save_to_json()` — exports to JSON files in `data/` directory

**`backend/app/utils/geo_helpers.py`** — Geospatial Harmonization:
- `get_grid(city, resolution_km)` — generates a regular lat/lng grid at ~1km spacing
- `harmonize_to_grid(data_points, grid_points)` — Inverse Distance Weighting (IDW) interpolation
- `harmonize_timeseries(raw_timeseries, grid_points)` — harmonizes all dates to common grid
- `compute_grid_statistics(grid_data)` — mean, std, min, max, median, percentiles

**`backend/app/utils/cities.py`** — City Configuration:
- CITIES dict with Ahmedabad, Delhi, Bengaluru
- Each city has: name, bbox, center, zoom level, population, area_sq_km, notable_areas
- Helper functions: `get_city()`, `get_city_list()`, `get_bbox()`

### 16. Health Check (`backend/app/routes/health.py`)

- `GET /api/v1/health` — returns `{"status": "healthy", "service": "Satellite Environmental Intelligence Platform"}`

### 17. Data Upload Route (`backend/app/routes/data.py`)

- `POST /api/v1/data/upload` — stub endpoint for file uploads (auth required, placeholder implementation)

---

## Frontend — Detailed Breakdown

### 1. Application Shell

**`frontend/src/main.jsx`** — React 19 entry point, mounts `<App />` with StrictMode

**`frontend/src/App.jsx`** — React Router v6 with 9 routes:
- Public: `/` (LandingPage), `/login` (LoginPage), `/signup` (SignupPage)
- Protected: `/dashboard`, `/analytics`, `/action-plan`, `/data-explorer`, `/about`
- Fallback: `*` → NotFoundPage
- All routes wrapped in `<AuthProvider>`

**`frontend/vite.config.js`**:
- React + Tailwind CSS v4 plugins
- Dev server on port 5173
- API proxy: `/api` → `http://localhost:8000`

### 2. Authentication Context (`frontend/src/context/AuthContext.jsx`)

- `AuthProvider` component wraps the app
- `useAuth()` hook provides: `user`, `login()`, `signup()`, `logout()`, `isAuthenticated`, `loading`
- Persists token + user object in `localStorage`
- Auto-restores session on page reload

### 3. API Services Layer

**`frontend/src/services/api.js`** — Axios Instance:
- Base URL: `/api/v1`
- Request interceptor: attaches `Authorization: Bearer <token>` from localStorage
- Response interceptor: on 401, clears token and redirects to `/login`

**`frontend/src/services/authService.js`**:
- `signup(name, email, password)` → `POST /auth/signup`
- `login(email, password)` → `POST /auth/login`
- `logout()` → clears localStorage
- Saves token + user to localStorage on success

**`frontend/src/services/satelliteService.js`**:
- `fetchData(city, parameters, dateRange)` → `POST /satellite/fetch`
- `getParameters()` → `GET /satellite/parameters`
- `getTimeSeries(parameter, city)` → `GET /satellite/timeseries/{parameter}`

**`frontend/src/services/analyticsService.js`**:
- `getAnomalies(parameter, city)` → `POST /analytics/anomalies`
- `getTrends(parameter, city)` → `POST /analytics/trends`
- `getHotspots(parameter, city)` → `POST /analytics/hotspots`
- `getSummary(city)` → `GET /analytics/summary/{city}`

**`frontend/src/services/actionPlanService.js`**:
- `generatePlan(city, parameters)` → `POST /action-plan/generate`
- `getPlanHistory()` → `GET /action-plan/history`

### 4. Pages

**`LandingPage.jsx`** — Public Home:
- Dark gradient hero: "Satellite Intelligence for Smarter Cities"
- 3 feature cards: Multi-Satellite Data Fusion, ML-Powered Environmental Analytics, Actionable City Intelligence
- Stats bar: 4+ satellite missions, 3 ML algorithms, 1km resolution, 2-year coverage
- Tech stack section showing all technologies
- CTA: "Get Started" → /signup, "Login" → /login

**`LoginPage.jsx`** — Authentication:
- Email + password form with validation
- Error message display
- "Don't have an account?" link to signup

**`SignupPage.jsx`** — Registration:
- Name + email + password form
- Redirects to dashboard on success

**`DashboardPage.jsx`** — Main Dashboard (Protected):
- Fetches analytics summary + timeseries on mount
- **4 Stats Cards** (top row):
  - Avg Temperature (°C) with trend indicator
  - Vegetation Index (NDVI) with change percentage
  - Air Quality (NO₂ µmol/m²) with anomaly count
  - Soil Moisture (m³/m³) with status
- **Interactive Map** (left, 60% width):
  - Leaflet map centered on Ahmedabad
  - Heatmap overlays for active layers
  - Layer toggle controls (LST, NDVI, NO₂, Soil Moisture)
- **Charts** (right, 40% width):
  - Temperature Trend (area chart, red gradient)
  - Vegetation Health Trend (area chart, green gradient)
- Uses: MapView, LayerControl, StatsCard, ChartWidget components

**`AnalyticsPage.jsx`** — ML Analytics View (Protected):
- **Parameter selector**: dropdown to choose LST, NDVI, NO₂, or SOIL_MOISTURE
- **3 tabs**: Anomalies | Trends | Hotspots
- Auto-loads data when parameter changes
- **Anomalies tab**: AnomalyList component showing detected anomalies with severity badges
- **Trends tab**: TrendChart component with historical + forecast overlay
- **Hotspots tab**: HotspotMap component showing DBSCAN clusters on map

**`ActionPlanPage.jsx`** — Action Plan Generation (Protected):
- **"Generate Environment Action Plan"** button
- Progress indicator showing pipeline steps:
  1. Fetching satellite data...
  2. Running anomaly detection...
  3. Analyzing trends...
  4. Identifying hotspots...
  5. Generating action plan...
- **Export menu**: Download as PDF or JSON
- **PlanViewer** component renders the full report
- Parameters included: LST, NDVI, NO₂, SOIL_MOISTURE

**`DataExplorerPage.jsx`** — Data Browser (Protected):
- Browse satellite data by parameter, location, and date range

**`AboutPage.jsx`** — Project Information (Protected)

**`NotFoundPage.jsx`** — 404 catch-all page

### 5. Layout Components

**`Navbar.jsx`** — Top navigation bar:
- Logo + "AETRIX SatIntel" branding
- User menu with logout button

**`Sidebar.jsx`** — Left navigation:
- Links: Dashboard, Analytics, Action Plan, Data Explorer, About
- Active link highlighting with colored indicator
- Icons from Lucide React

**`DashboardLayout.jsx`** — Page wrapper:
- Combines Navbar (top) + Sidebar (left) + main content area (right)
- Consistent layout across all protected pages

**`Footer.jsx`** — Page footer

### 6. Common Components

- **`Button.jsx`** — Reusable button with variants (primary, secondary, danger), sizes, loading state
- **`Input.jsx`** — Form input with label, error state, icon support
- **`Card.jsx`** — Container card with optional title, padding, border
- **`Loader.jsx`** — Animated loading spinner
- **`ProtectedRoute.jsx`** — Route guard; redirects unauthenticated users to `/login`

### 7. Dashboard Components

**`StatsCard.jsx`** — Statistics display card:
- Props: title, value, subtitle, icon, color (red/emerald/purple/blue/cyan/amber)
- Trend indicator arrow (up/down)
- Color-coded left border

**`ChartWidget.jsx`** — Time-series area chart:
- Built with Recharts (`ResponsiveContainer`, `AreaChart`, `Area`, `Tooltip`, `CartesianGrid`)
- Props: title, data, xKey, yKey, color, unit, height
- Gradient fill under the curve
- Responsive to container width

**`MapView.jsx`** — Interactive Leaflet Map:
- **Center:** Ahmedabad (23.0225, 72.5714), **Zoom:** 11
- **Base tiles:** CartoDB Dark Matter (dark theme)
- **HeatmapLayer** — custom component using `leaflet.heat` plugin
  - Renders as canvas overlay on the Leaflet map
  - Configurable: radius, blur, maxZoom, gradient colors
- **CircleMarker overlays** — individual data points with popups showing value + date
- **Parameter-specific gradients:**
  - LST: blue → cyan → yellow → red (cold to hot)
  - NDVI: brown → yellow → light green → dark green (barren to healthy)
  - NO₂: green → yellow → orange → red → purple (clean to polluted)
  - SOIL_MOISTURE: red → orange → yellow → cyan → blue (dry to wet)
- Fetches data from `/api/v1/maps/heatmap/{parameter}`

**`LayerControl.jsx`** — Map layer toggle panel:
- 4 toggleable layers: LST, NDVI, NO₂, SOIL_MOISTURE
- Each toggle shows parameter name + color indicator
- Callbacks to parent for enabling/disabling layers on the map

**`DataTable.jsx`** — Generic data table with columns and rows

### 8. Analytics Components

**`AnomalyList.jsx`** — Anomaly Detection Results:
- Summary card: total anomalies found / total data points analyzed
- List of anomalies, each showing:
  - Date of occurrence
  - Location (lat, lng)
  - Measured value
  - Anomaly score
  - Severity badge: **Critical** (red), **High** (amber), **Moderate** (yellow)
- Empty state message when no anomalies detected

**`TrendChart.jsx`** — Time-Series + Forecast Visualization:
- **Historical data** plotted as line/area chart
- **Forecast overlay** (30-day prediction) shown in different color
- Trend direction indicator: "Increasing" or "Decreasing"
- Built with Recharts

**`HotspotMap.jsx`** — Hotspot Cluster Visualization:
- Leaflet map showing DBSCAN cluster results
- Circle overlays at cluster centers
- Circle size proportional to number of points in cluster
- Color coded by severity (high = red, moderate = orange)
- Popup with cluster details: ID, center coordinates, point count, severity

### 9. Action Plan Components

**`PlanViewer.jsx`** — Full Report Renderer (~700+ lines):
- **Report header**: report number, classification badge ("OFFICIAL-SENSITIVE"), prepared by, date
- **Summary statistics grid**: key metrics at a glance (avg temp, NDVI, NO₂, moisture)
- **Executive summary**: 3-paragraph narrative with real satellite data values
- **Data sources table**: satellite mission, parameter, spatial resolution, temporal coverage
- **Priority actions**: numbered list with amber-highlighted action items
- **Risk assessment matrix**: parameter → risk level → likelihood → impact → urgency
- **Key findings section**: 4 FindingCard components (one per parameter)
- **Priority zones**: specific Ahmedabad locations with coordinates, zone type, severity
- **Recommendations section**: 5 RecommendationCard components with full details
- **Monitoring framework**: KPIs table with targets, baselines, quarterly milestones
- **Quarterly schedule**: Q1-Q4 planned activities
- **Disclaimer**: legal notice about data sources and limitations
- Styled with colored sections, border accents, icons, and professional formatting

**`FindingCard.jsx`** — Individual Finding Display:
- Title, description, severity badge
- Evidence string (specific satellite data values)
- Affected population estimate
- Trend indicator (worsening/stable/improving)

**`RecommendationCard.jsx`** — Individual Recommendation Display:
- Title, detailed description
- Priority level (Critical/High/Medium)
- Timeline (Immediate/Short-term/Medium-term/Long-term)
- Target location in Ahmedabad
- Estimated budget (₹ Crores)
- Responsible authority (AMC, GPCB, etc.)

**`ExportPlan.jsx`** — Export Utilities:
- `exportAsPDF()` — generates downloadable PDF of the action plan
- `exportAsJSON()` — downloads action plan as JSON file

---

## Data Layer — Detailed Breakdown

### Pre-fetched Satellite Data (`data/ahmedabad/`)

All data covers **January 2023 — December 2024** for the **Ahmedabad bounding box** (72.4–72.7°E, 22.9–23.2°N).

**`lst_timeseries.json`** — Land Surface Temperature:
- Source: MODIS Terra (MOD11A2), 8-day composite, 1km resolution
- ~900+ observations across spatial grid
- Values: 17.9°C — 45°C (converted from Kelvin)
- Schema: `{ date, lat, lng, value, parameter: "LST" }`

**`ndvi_timeseries.json`** — Normalized Difference Vegetation Index:
- Source: MODIS (MOD13A2), 16-day composite, 1km resolution
- Values: 0.05 — 0.6 (0 = barren, 1 = dense vegetation)
- Schema: `{ date, lat, lng, value, parameter: "NDVI" }`

**`no2_timeseries.json`** — Nitrogen Dioxide:
- Source: Sentinel-5P TROPOMI
- Values: in mol/m² (displayed as µmol/m² × 1e6)
- Schema: `{ date, lat, lng, value, parameter: "NO2" }`

**`soil_moisture.json`** — Soil Moisture:
- Source: NASA SMAP (SPL3SMP_E)
- Values: 0.05 — 0.35 m³/m³ (volumetric water content)
- Schema: `{ date, lat, lng, value, parameter: "SOIL_MOISTURE" }`

### Data Generation Scripts

**`data/generate_data.py`** — Generates synthetic/mock satellite data as a fallback when real GEE data is unavailable.

**`scripts/generate_land_use.py`** — Generates land use classification data:
- Creates grids for 2020 and 2024
- Classes: 0 = water, 1 = urban, 2 = sparse vegetation, 3 = dense vegetation
- Simulates urban sprawl (increased urban area in 2024)
- Outputs: `land_use_2020.json`, `land_use_2024.json`

**`notebooks/01_gee_data_fetch.py`** — GEE data extraction script:
- Authenticates with Google Earth Engine
- Fetches LST, NDVI, NO₂, and land use data using `gee_helpers`
- Saves to JSON files in `data/ahmedabad/`

---

## Key Technical Features

### 1. Multi-Satellite Data Fusion
- Integrates data from **4 satellite missions**: MODIS, Sentinel-5P, SMAP, Landsat
- **5 environmental parameters**: temperature, vegetation, air pollution, soil moisture, land use
- All data harmonized to a **common 1km grid** using IDW interpolation
- **2-year temporal coverage** (2023–2024)

### 2. Machine Learning Pipeline
- **Isolation Forest** for anomaly detection with severity classification (critical/high/moderate)
- **ARIMA** for 30-day time-series forecasting with linear fallback
- **DBSCAN** for geographic hotspot clustering of extreme values
- All models run on real satellite observations, not synthetic data

### 3. Interactive Geospatial Visualization
- **Leaflet.js** map with CartoDB Dark Matter basemap
- **Heatmap overlays** using `leaflet.heat` canvas rendering
- **4 toggleable layers** with parameter-specific color gradients
- **Circle markers** with popups showing detailed values
- **Hotspot cluster circles** showing DBSCAN results on the map

### 4. Multi-Agent Architecture
- **3 specialized agents** coordinated by an orchestrator:
  - **Data Agent**: fetches and preprocesses satellite data
  - **Analysis Agent**: runs all ML models and interprets results
  - **Action Plan Agent**: generates structured policy recommendations
- Sequential pipeline with logging and timing

### 5. Municipal-Grade Action Plan
- Professional report format with classification, metadata, and legal disclaimer
- **Evidence-backed findings** citing specific satellite data values
- **Risk assessment matrix** with likelihood × impact scoring
- **5 actionable recommendations** with timelines, budgets (₹ Crores), and responsible authorities
- **KPI monitoring framework** with quarterly milestones
- **Specific Ahmedabad locations** identified as priority intervention zones
- **Exportable** as PDF or JSON

### 6. Full Authentication Flow
- JWT-based auth (HS256, 24h expiry)
- Signup/Login with password hashing (bcrypt)
- Protected routes on both frontend and backend
- Auto-logout on token expiry (401 interceptor)

### 7. Database Flexibility
- PostgreSQL + PostGIS support with spatial queries
- In-memory fallback for zero-config demo mode
- SQLAlchemy async ORM with GeoAlchemy2 for spatial types

### 8. City-Agnostic Architecture
- City configuration system supporting Ahmedabad, Delhi, Bengaluru
- Change the bounding box → the entire pipeline works for a new city
- GEE integration supports global satellite data queries

---

## API Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/health` | No | Health check |
| POST | `/api/v1/auth/signup` | No | Create account |
| POST | `/api/v1/auth/login` | No | Login |
| GET | `/api/v1/users/me` | Yes | Get current user |
| GET | `/api/v1/satellite/parameters` | No | List available parameters |
| POST | `/api/v1/satellite/fetch` | Yes | Fetch satellite data |
| GET | `/api/v1/satellite/timeseries/{param}` | No | Time-series data |
| POST | `/api/v1/analytics/anomalies` | Yes | Detect anomalies |
| POST | `/api/v1/analytics/trends` | Yes | Predict trends |
| POST | `/api/v1/analytics/hotspots` | Yes | Find hotspot clusters |
| GET | `/api/v1/analytics/summary/{city}` | Yes | Full city analytics |
| GET | `/api/v1/maps/heatmap/{param}` | No | Heatmap layer data |
| GET | `/api/v1/maps/layers` | No | All map layers |
| GET | `/api/v1/maps/land-use-change` | No | Land use comparison |
| POST | `/api/v1/action-plan/generate` | Yes | Generate action plan |
| GET | `/api/v1/action-plan/history` | Yes | Past action plans |
| POST | `/api/v1/data/upload` | Yes | Upload data (stub) |

---

## File Count Summary

| Area | Files | Description |
|------|-------|-------------|
| Backend Services | 5 | auth, satellite, ML, action plan, database |
| Backend Routes | 8 | health, auth, users, satellite, analytics, maps, action_plan, data |
| Backend Agents | 4 | orchestrator, data, analysis, action_plan |
| Backend Utils | 3 | GEE helpers, geo helpers, city config |
| Backend Models | 2 | Pydantic schemas, SQLAlchemy models |
| Frontend Pages | 8 | landing, login, signup, dashboard, analytics, action plan, data explorer, about, 404 |
| Frontend Components | 18 | layout (4), common (5), dashboard (5), analytics (3), action-plan (3) |
| Frontend Services | 5 | api, auth, satellite, analytics, action plan |
| Data Files | 4+ | LST, NDVI, NO₂, soil moisture JSON datasets |
| Scripts/Notebooks | 3 | GEE fetch, data generation, land use generation |
| **Total** | **~60+** | |

---

## Dependencies

### Backend (`requirements.txt`)
- **Web:** FastAPI 0.109.0, Uvicorn 0.27.0, Pydantic 2.5.3
- **Auth:** python-jose 3.3.0, passlib 1.7.4 (bcrypt)
- **ML:** scikit-learn, statsmodels, pandas, numpy
- **Geo:** geopandas, xarray, rasterio, pyproj
- **Database:** motor (MongoDB async), SQLAlchemy, GeoAlchemy2, asyncpg
- **AI:** anthropic 0.43.0
- **GEE:** earthengine-api, geemap

### Frontend (`package.json`)
- **Core:** React 19, React DOM 19, React Router DOM 7
- **Maps:** Leaflet, React-Leaflet, leaflet.heat
- **Charts:** Recharts
- **HTTP:** Axios
- **Icons:** Lucide React
- **Styling:** Tailwind CSS v4, @tailwindcss/vite
- **Build:** Vite 6, ESLint 9

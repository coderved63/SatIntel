# SatIntel — Satellite Environmental Intelligence Platform
## Complete Project Detail Document
### For PPT Presentation & Word Report | AETRIX 2026 | PS-4

---

## 1. PROJECT OVERVIEW

**Project Name:** SatIntel
**Problem Statement:** PS-4 — Satellite Environmental Intelligence Platform for Smart Cities
**Hackathon:** AETRIX 2026 — 36-hour hackathon at PDEU, Gandhinagar
**Domain:** Sustainability & Environment
**Live Demo:** [satintel.vercel.app](https://satintel.vercel.app)
**Backend API:** [satellite-9q48.onrender.com](https://satellite-9q48.onrender.com/api/v1/health)

### What SatIntel Does

SatIntel is a full-stack satellite environmental intelligence platform that:

1. **Ingests real satellite data** from 4 NASA/ESA missions (MODIS, Sentinel-5P, SMAP, Landsat)
2. **Harmonizes** all data to a common 1 km grid (961 cells per city)
3. **Runs 4 ML models** — Isolation Forest (anomalies), LSTM (prediction), DBSCAN (hotspots), ARIMA (trends)
4. **Visualizes** results on interactive 3D maps with 8 toggleable heatmap layers
5. **Generates municipal-grade Environment Action Plans** — professional reports a city commissioner can act on immediately
6. **Analyzes green infrastructure gaps** — identifies top plantation sites with projected cooling impact
7. **Covers 14 Gujarat cities** — not just Ahmedabad; the platform is city-agnostic

### One-Line Pitch

> "We turn petabytes of free satellite data into one-page action plans that any municipal commissioner can understand and implement."

---

## 2. PROBLEM & SOLUTION

### The Problem

Indian cities face escalating environmental challenges — Urban Heat Islands, air pollution, vegetation loss, water stress — but municipal bodies lack the tools to:
- Access and interpret satellite data (it's complex, multi-source, multi-resolution)
- Detect anomalies and trends automatically
- Identify priority zones for intervention
- Generate evidence-backed policy recommendations

Satellite data exists for every city on Earth, but it sits unused in NASA/ESA archives because no one has built the bridge between raw Earth observation data and actionable municipal policy.

### Our Solution

SatIntel bridges this gap with a 3-step automated pipeline:

| Step | What Happens | Technology |
|------|-------------|-----------|
| **1. Ingest** | Fetch data from 4 satellite missions, harmonize to 1 km grid | Google Earth Engine, IDW interpolation |
| **2. Analyze** | Run anomaly detection, trend forecasting, hotspot clustering | Isolation Forest, LSTM, ARIMA, DBSCAN |
| **3. Act** | Generate municipal-grade action plan with findings + recommendations | Multi-Agent System (3 specialized agents) |

**Result:** A city commissioner clicks one button → gets a professional report with satellite-backed findings, priority zones on a map, budget estimates, and a monitoring framework.

---

## 3. SATELLITE DATA SOURCES

### Missions Used

| # | Mission | Agency | Parameter Measured | Spatial Resolution | Temporal Frequency |
|---|---------|--------|-------------------|-------------------|-------------------|
| 1 | **MODIS Terra** (MOD11A2, MOD13A2) | NASA | Land Surface Temperature (LST), Vegetation Index (NDVI) | 1 km | 8-day / 16-day |
| 2 | **Sentinel-5P TROPOMI** | ESA (Copernicus) | NO₂, SO₂, CO, O₃, Aerosol Optical Depth | ~7 km | Daily |
| 3 | **NASA SMAP** (SPL3SMP_E) | NASA/JPL | Soil Moisture | 9 km | Daily |
| 4 | **Landsat 8/9** | USGS/NASA | Land Use Classification | 30 m | 16-day |

### 9 Environmental Parameters Tracked

| # | Parameter | Unit | What It Tells Us |
|---|-----------|------|-----------------|
| 1 | Land Surface Temperature (LST) | °C | Urban Heat Island intensity, heat stress zones |
| 2 | Vegetation Index (NDVI) | 0–1 scale | Green cover health — 0 = barren, 1 = dense vegetation |
| 3 | Nitrogen Dioxide (NO₂) | mol/m² | Traffic and industrial air pollution |
| 4 | Sulfur Dioxide (SO₂) | mol/m² | Industrial emissions, power plants |
| 5 | Carbon Monoxide (CO) | mol/m² | Combustion pollution, fire events |
| 6 | Ozone (O₃) | mol/m² | Photochemical smog, respiratory risk |
| 7 | Aerosol Optical Depth | index | Particulate matter, haze, dust storms |
| 8 | Soil Moisture | m³/m³ | Drought/flood risk, irrigation needs |
| 9 | Land Use Classification | class | Urban sprawl, deforestation, land conversion |

### Data Coverage

- **Cities:** 14 Gujarat cities (Ahmedabad, Surat, Vadodara, Rajkot, Bhavnagar, Jamnagar, Gandhinagar, Junagadh, Anand, Morbi, Mehsana, Bharuch, Navsari, Vapi)
- **Time Range:** January 2023 – December 2024 (24 months)
- **Grid Resolution:** 0.01° ≈ 1.1 km (harmonized common grid)
- **Cells per City:** 961 (31 × 31 grid)
- **Data Access:** Google Earth Engine Python API (pre-fetched as JSON for demo speed)

### Data Harmonization

All satellite datasets have different resolutions and frequencies. We harmonize them:

```
MODIS (1 km) ──────┐
Sentinel-5P (7 km) ─┤──→ IDW Interpolation ──→ Common 1 km Grid (0.01°)
SMAP (9 km) ────────┤                            961 cells per city
Landsat (30 m) ─────┘                            Aligned lat/lng points
```

**Method:** Inverse Distance Weighting (IDW) interpolation resamples all data to a uniform 0.01° × 0.01° grid, ensuring every parameter can be compared cell-by-cell.

---

## 4. MACHINE LEARNING MODELS

### 4.1 Anomaly Detection — Isolation Forest

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Isolation Forest (scikit-learn) |
| **Purpose** | Detect unusual environmental events — temperature spikes, pollution surges, sudden vegetation loss |
| **How It Works** | Isolates anomalies by random partitioning; anomalies require fewer splits to isolate |
| **Contamination** | 8% (assumes ~8% of data points are anomalous) |
| **Output** | Each anomaly with: date, lat/lng, value, severity (critical/high/moderate), anomaly score |

**Use Cases:**
- Detect heat wave events (LST spikes above seasonal norms)
- Identify sudden deforestation or land clearing (NDVI drops)
- Flag industrial pollution events (NO₂/SO₂ spikes)
- Alert on drought conditions (soil moisture drops)

### 4.2 Trend Prediction — LSTM Neural Network + ARIMA

| Aspect | Detail |
|--------|--------|
| **Primary Model** | LSTM (Long Short-Term Memory) — PyTorch |
| **Fallback Model** | ARIMA (order=2,1,1) — statsmodels |
| **Purpose** | Forecast environmental parameters 30 days ahead |
| **Architecture** | Sequence-to-one LSTM, lookback window = 12 time steps |
| **Training** | 50 epochs with normalized inputs |
| **Output** | Forecast values + confidence bands + trend direction (increasing/decreasing) |

**Use Cases:**
- Predict next month's temperature trajectory
- Forecast vegetation health decline/recovery
- Project air pollution trends for policy planning
- Anticipate soil moisture changes for agricultural planning

### 4.3 Hotspot Clustering — DBSCAN

| Aspect | Detail |
|--------|--------|
| **Algorithm** | DBSCAN (Density-Based Spatial Clustering of Applications with Noise) |
| **Purpose** | Identify geographic clusters of extreme environmental values |
| **Parameters** | eps = 0.01° (~1 km), min_samples = 3 |
| **Input** | Top 20% most extreme data points (80th percentile threshold) |
| **Output** | Clusters with: center lat/lng, number of points, severity rating |

**Use Cases:**
- Identify Urban Heat Island cores
- Map pollution concentration zones
- Locate areas of severe vegetation stress
- Find drought-prone clusters

### 4.4 Green Infrastructure Gap Analysis — NDVI-LST Regression

| Aspect | Detail |
|--------|--------|
| **Method** | Linear Regression: LST = β₀ + β₁ × NDVI |
| **Purpose** | Quantify the relationship between vegetation and temperature, then predict cooling from tree planting |
| **Output** | Top 50 plantation sites ranked by priority score (0–100) |
| **Each Site Includes** | Projected cooling (°C), current NDVI/LST, recommended tree species, priority class |

**How Priority Score Is Calculated:**
- Heat factor (40%): Higher temperature → higher priority
- Vegetation gap (40%): Lower NDVI → higher priority
- Land class bonus (20%): Barren/urban land gets extra priority

**Cooling Projection:** ΔT = β₁ × (target_NDVI − current_NDVI), where target_NDVI = 0.45 (forest threshold)

---

## 5. MULTI-AGENT SYSTEM

### Architecture

SatIntel uses a 3-agent pipeline that automates the full workflow from data collection to policy recommendations:

```
User clicks "Generate Action Plan"
              │
              ▼
     ┌─── ORCHESTRATOR ───┐
     │                      │
     ▼                      │
 DATA AGENT                 │
 • Fetches satellite data   │
 • Harmonizes to 1 km grid  │
 • Returns structured data  │
     │                      │
     ▼                      │
 ANALYSIS AGENT             │
 • Runs Isolation Forest    │
 • Runs LSTM/ARIMA forecast │
 • Runs DBSCAN clustering   │
 • Computes statistics      │
     │                      │
     ▼                      │
 ACTION PLAN AGENT          │
 • Interprets ML results    │
 • Generates findings       │
 • Creates recommendations  │
 • Builds risk matrix       │
 • Produces municipal report│
     │                      │
     ▼                      │
 COMBINED RESPONSE          │
 {                          │
   satellite_data,          │
   anomalies,               │
   trends,                  │
   hotspots,                │
   action_plan              │
 }                          │
     └──────────────────────┘
```

### Agent Descriptions

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Data Agent** | Fetches satellite data for the selected city and parameters from pre-fetched JSON files. Harmonizes to common grid. | City name, parameters, date range | Structured satellite data by parameter |
| **Analysis Agent** | Runs all 4 ML models on the harmonized data. Computes per-parameter statistics. | Satellite data dict | Anomalies, trends, hotspots, statistics |
| **Action Plan Agent** | Interprets analysis results in the context of the specific city. Generates a government-style report with findings, recommendations, budgets, timelines, and KPIs. | City config, analysis results | Municipal-grade action plan |

### Why Multi-Agent?

- **Separation of concerns:** Each agent specializes in one domain (data, analytics, policy)
- **Composability:** Agents can be reused independently or combined differently
- **Transparency:** Each step is logged and traceable
- **Scalability:** Add new agents (e.g., a Water Agent, a Traffic Agent) without changing existing ones

---

## 6. PLATFORM PAGES & FEATURES

### 6.1 Landing Page

**Purpose:** First impression — explains what SatIntel does and why it matters.

**Key Elements:**
- Hero section with animated satellite/Earth visual (CSS-based orbital animation)
- Stats bar: **14 cities | 9 parameters | 4 satellite missions | 4 ML models**
- Problem → Solution narrative with scroll animations (Framer Motion)
- "How It Works" — 3-step pipeline visualization (Ingest → Analyze → Act)
- Data sources table showing all satellite missions
- Tech stack and footer with navigation

### 6.2 Dashboard (Main Command Center)

**Purpose:** At-a-glance environmental health of any city.

**Layout:**
```
┌──────────┬──────────────────────────────────────────────────────────┐
│          │  [Temp Card]  [NDVI Card]  [Air Quality Card]  [Soil]   │
│          ├──────────────────────────────┬───────────────────────────┤
│ Sidebar  │                              │  Temperature Trend Chart  │
│          │   Interactive 3D Map          │  Vegetation Trend Chart   │
│          │   (Deck.GL + MapLibre)        │  Air Quality Trend Chart  │
│          │   8 heatmap layers            │  (Recharts)               │
│          │   5 visualization modes       │                           │
│          │   5 basemap styles            │                           │
└──────────┴──────────────────────────────┴───────────────────────────┘
```

**Stats Cards (4):**
| Card | Example Value | Indicator |
|------|--------------|-----------|
| Avg Temperature | 38.2°C | ↑ 2.3°C above normal, 5 anomalies |
| Vegetation Index | 0.32 NDVI | 8 stress zones detected |
| Air Quality (selectable) | 42 µg/m³ NO₂ | Dropdown: NO₂, SO₂, CO, O₃, Aerosol |
| Soil Moisture | 0.18 m³/m³ | 3 dry zone alerts |

**Map Features:**
- **8 Toggleable Heatmap Layers:** LST, NDVI, NO₂, SO₂, CO, O₃, Aerosol, Soil Moisture
- **5 Visualization Modes:** Heatmap (default), 3D Hexbin, 3D Grid, Scatter, Contour
- **5 Basemap Styles:** Dark, Satellite, Terrain, Streets, Light
- **3D Controls:** Pitch (0–60°), bearing rotation, zoom
- **Layer Control Panel:** Floating UI with color-coded toggle switches

**Time-Series Charts (3):**
- Temperature trend (LST over time)
- Vegetation health trend (NDVI over time)
- Air quality trend (selected pollutant over time)

### 6.3 Analytics Page (ML Results Dashboard)

**Purpose:** Explore ML model outputs in detail.

**Interface:**
- **Parameter selector:** 4 buttons — LST, NDVI, NO₂, Soil Moisture
- **4 Tabs:**

| Tab | What It Shows | Visualization |
|-----|--------------|--------------|
| **Anomalies** | Isolation Forest results — unusual events with severity ratings (critical/high/moderate) | Grid of anomaly cards with color-coded severity badges |
| **Trends** | ARIMA/LSTM forecast — historical + predicted values with confidence bands | Line chart with forecast overlay and trend direction |
| **Hotspots** | DBSCAN clusters — geographic concentration of extreme values | Leaflet map with cluster circles |
| **Domain Analysis** | Links to 4 specialized analyses (Vegetation, Land Conversion, Farmland, Heat) | Cards with descriptions linking to detailed views |

### 6.4 Action Plan Page (Report Generator)

**Purpose:** Generate a complete municipal-grade Environment Action Plan with one click.

**Generation Process (animated progress indicator):**
1. "Fetching satellite data from MODIS, Sentinel-5P, SMAP..."
2. "Running anomaly detection (Isolation Forest)..."
3. "Analyzing trends (ARIMA forecasting)..."
4. "Identifying hotspot clusters (DBSCAN)..."
5. "Generating environment action plan..."

**Generated Report Contains:**

| Section | Content |
|---------|---------|
| **Header** | Report number, classification (CONFIDENTIAL), date, prepared for (Municipal Corporation), prepared by (SatIntel) |
| **Summary Statistics** | Total data points analyzed, satellites used, anomalies detected, hotspot clusters found |
| **Executive Summary** | 2–3 paragraph overview of environmental status |
| **Data Sources** | Table of missions, agencies, parameters, resolutions, coverage periods |
| **Key Findings (4)** | One finding per parameter (LST, NDVI, NO₂, Soil Moisture) with satellite evidence |
| **Risk Assessment Matrix** | Parameter × Risk Level × Trend × Confidence table |
| **Recommendations (5)** | Each with: title, description, timeline (immediate/short/medium/long-term), estimated budget, responsible authority |
| **Priority Zones** | Mini-map showing flagged areas |
| **KPI Monitoring Framework** | Quarterly milestones and measurable targets |

**Export Options:**
- **Save as PDF** (using jsPDF + html2pdf)
- **Export as JSON** (raw structured data)

### 6.5 Green Gap Analysis Page (Tree Plantation Optimizer)

**Purpose:** Identify optimal locations for tree planting to reduce Urban Heat Island effect.

**How It Works:**
1. Fits NDVI-LST regression from real city data
2. Identifies cells with high temperature + low vegetation
3. Projects cooling impact if vegetation is planted
4. Ranks top 50 sites by priority score (0–100)

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│ [Critical Sites]  [Avg Cooling]  [Max Cooling]  [Total Sites]    │
│ [NDVI-LST Regression R² + interpretation]                        │
├──────────────────────────────────────┬───────────────────────────┤
│                                      │  Selected Site Detail     │
│   Interactive Leaflet Map            │  • Current NDVI / LST     │
│   with priority-colored markers      │  • Projected after plant  │
│   • Red = Critical                   │  • Cooling impact (°C)    │
│   • Orange = High                    │  • Recommended species    │
│   • Green = Moderate                 │  • Priority score         │
│                                      ├───────────────────────────┤
│   (Click marker to see details)      │  Top 50 Sites List       │
│                                      │  (scrollable, clickable) │
└──────────────────────────────────────┴───────────────────────────┘
```

**Species Recommendations:** Based on Gujarat Forest Department guidelines — includes local native species suited to each site's conditions.

### 6.6 Research Mode (Spatial-Temporal Query Builder)

**Purpose:** Advanced exploration tool — drop a pin anywhere, query satellite data within a radius.

**Features:**
- **Fullscreen Deck.GL + MapLibre map** with instruction overlay
- **Click to drop pin** → radius ring visualization (cyan glow)
- **Right panel (collapsible):**
  - Parameter multi-select (8 parameters)
  - Date range picker (start/end dates)
  - Radius slider (1–50 km)
  - "Run Query" button
- **Results:**
  - Per-parameter tabs with data point counts
  - Time-series area chart with statistics (mean, min, max)
  - **CSV export** button for raw data download

### 6.7 Data Explorer Page

**Purpose:** Browse all available satellite parameters and their metadata.

**Shows:** Grid of parameter cards, each with:
- Icon and color indicator
- Parameter name and description
- Source satellite mission
- Spatial resolution
- Temporal frequency

### 6.8 Authentication Pages (Login / Signup)

**Design:** Split-layout with glassmorphic card
- Left panel: Quote + diagonal grid texture + gradient overlay
- Right panel: Form with validation
- JWT token (24h expiry) stored in localStorage
- Protected routes redirect to login if unauthenticated

---

## 7. UI/UX DESIGN

### Dark Space Glassmorphic Theme

| Element | Value | Description |
|---------|-------|-------------|
| Background | `#0A0E1A` | Deep space navy |
| Card Surface | `#1A1F35` | Dark blue-gray with glassmorphism |
| Border | `#1E293B` | Subtle slate borders |
| Primary Accent | `#06B6D4` | Cyan — data/tech feel |
| Secondary Accent | `#10B981` | Emerald — environment/nature |
| Text (Primary) | `#E2E8F0` | Light slate |
| Text (Secondary) | `#94A3B8` | Muted slate |
| Font | Space Grotesk | Modern geometric sans-serif |

**Glassmorphism Effect:**
- Translucent card backgrounds with `backdrop-blur`
- Subtle border glow on hover
- Layered depth with shadow and opacity

### Color Scales for Data Visualization

| Data Type | Scale |
|-----------|-------|
| Temperature | Blue → Cyan → Yellow → Orange → Red |
| Vegetation | Brown (stressed, low NDVI) → Green (healthy, high NDVI) |
| Pollution | Green (clean) → Yellow → Red → Purple (hazardous) |
| Soil Moisture | Red (dry) → Blue (wet) |
| Priority | Green (moderate) → Orange (high) → Red (critical) |

### Animations

- **Framer Motion** for page transitions and scroll animations
- Fade-in and slide-up effects on cards and sections
- Smooth hover states on interactive elements
- Progress animation during action plan generation

---

## 8. TECH STACK

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2 | UI framework |
| Vite | 6.3 | Build tool, dev server |
| Tailwind CSS | v4 | Utility-first styling |
| React Router | v7 (v6 API) | Client-side routing |
| Deck.GL | 9.2 | GPU-accelerated 3D map layers |
| MapLibre GL | 5.21 | WebGL map renderer (free, no API key) |
| react-map-gl | 8.1 | React bindings for MapLibre |
| Leaflet | 1.9 | Secondary map engine (Green Gap page) |
| React-Leaflet | 5.0 | React Leaflet bindings |
| Recharts | 3.8 | Time-series charts |
| Framer Motion | 12.38 | Scroll and page animations |
| Axios | 1.13 | HTTP client |
| Lucide React | 0.577 | Icon library |
| jsPDF | — | PDF export for action plans |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | Language |
| FastAPI | — | REST API framework |
| Uvicorn | — | ASGI server |
| Pydantic v2 | — | Request/response validation |
| SQLAlchemy + GeoAlchemy2 | — | ORM with PostGIS spatial support |
| python-jose | — | JWT token encoding/decoding |
| bcrypt/passlib | — | Password hashing |

### ML / Data Science

| Technology | Purpose |
|-----------|---------|
| scikit-learn | Isolation Forest (anomaly detection), DBSCAN (clustering) |
| PyTorch | LSTM neural network (trend prediction) |
| statsmodels | ARIMA (time-series forecasting) |
| pandas | Data processing and manipulation |
| NumPy | Numerical computation |

### Infrastructure

| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend Hosting | Vercel | Static site deployment |
| Backend Hosting | Render | Python API hosting |
| Database | Neon PostgreSQL + PostGIS | Spatial queries (optional, with in-memory fallback) |
| Satellite Data | Google Earth Engine | Data sourcing (pre-fetched as JSON) |

---

## 9. SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19 + Vite)                        │
│                                                                        │
│  Landing  │  Dashboard  │  Analytics  │  Action Plan  │  Green Gap    │
│  Page     │  + 3D Map   │  + ML Tabs  │  + Report     │  + Planting   │
│           │  + Charts   │  + Charts   │  + PDF Export  │  + Map        │
│                                                                        │
│  Research Mode  │  Data Explorer  │  Login/Signup  │  About            │
│  + Query Builder│  + Parameters   │  + JWT Auth    │                   │
│                                                                        │
│  ┌──────────── API Layer (Axios + JWT Interceptor) ──────────────┐    │
└──┼───────────────────────────────────────────────────────────────┼────┘
   │                         REST API (JSON)                        │
┌──┼───────────────────────────────────────────────────────────────┼────┐
│  │                   BACKEND (FastAPI + Python)                   │    │
│                                                                        │
│  Routes (9 modules, 20+ endpoints):                                    │
│    /auth       → signup, login                                         │
│    /satellite  → parameters, timeseries, grid, query, research         │
│    /analytics  → anomalies, trends, hotspots, summary                  │
│    /maps       → heatmap data, land use change                         │
│    /action-plan → generate (multi-agent), history                      │
│    /analysis   → vegetation, land conversion, farmland, heat           │
│    /green-gap  → NDVI-LST regression + plantation sites                │
│    /users      → profile                                               │
│    /health     → health check                                          │
│                                                                        │
│  Services (8 modules):                                                 │
│    satellite_service    → Load & harmonize satellite JSON              │
│    ml_service           → Orchestrate ML models                        │
│    action_plan_service  → Generate municipal reports                   │
│    vegetation_service   → NDVI decline analysis                        │
│    heat_service         → UHI intensity + zone rankings                │
│    land_conversion_svc  → 2020 vs 2024 urban sprawl                   │
│    farmland_service     → Crop activity scoring                        │
│    green_gap_service    → Plantation site optimization                 │
│                                                                        │
│  ML Models (4):                                                        │
│    Isolation Forest │ LSTM │ DBSCAN │ ARIMA                            │
│    + NDVI-LST Regression (Green Gap)                                   │
│                                                                        │
│  Multi-Agent Pipeline:                                                 │
│    Data Agent → Analysis Agent → Action Plan Agent                     │
│                                                                        │
└──┼───────────────────────────────────────────────────────────────┼────┘
   │                                                                │
┌──┼──────────────────────┐  ┌─────────────────────────────────────┼────┐
│  DATA LAYER              │  │  DATABASE                           │    │
│                           │  │                                     │    │
│  /data/[14 cities]/       │  │  PostgreSQL + PostGIS (Neon Cloud)  │    │
│    9 parameter JSONs      │  │  Spatial queries: ST_DWithin        │    │
│    2 land use JSONs       │  │  Tables: users, observations,       │    │
│    1 change summary       │  │          action_plans               │    │
│    2 spatial snapshots    │  │  Fallback: in-memory store          │    │
└───────────────────────────┘  └─────────────────────────────────────────┘
                │
┌───────────────┴───────────────────────────────────────────────────────┐
│                    SATELLITE DATA SOURCES                              │
│                                                                        │
│  MODIS Terra (NASA)     │ Sentinel-5P (ESA)   │ SMAP (NASA/JPL)       │
│  LST: 1km, 8-day       │ NO₂, SO₂, CO, O₃   │ Soil Moisture          │
│  NDVI: 1km, 16-day     │ Aerosol: ~7km, daily │ 9km, daily            │
│                         │                      │                       │
│                         │ Landsat 8/9 (USGS)   │                       │
│                         │ Land Use: 30m, 16-day │                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 10. API ENDPOINTS

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Create account (name, email, password) → JWT token + user |
| POST | `/api/v1/auth/login` | Login (email, password) → JWT token + user |

### Satellite Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/satellite/parameters` | List all 9 available parameters with metadata |
| POST | `/api/v1/satellite/fetch` | Fetch data for city + parameters + date range |
| GET | `/api/v1/satellite/timeseries/{param}` | Time-series for a parameter (city queryable) |
| GET | `/api/v1/satellite/grid` | Harmonized grid info for a city |
| GET | `/api/v1/satellite/query` | Spatial query (lat/lng + radius + date range) |
| GET | `/api/v1/satellite/research` | Research Mode fast query with auto-expansion |

### Maps

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/maps/heatmap/{param}` | Raw lat/lng/value points for heatmap layer |
| GET | `/api/v1/maps/land-use-change` | 2020 vs 2024 land use comparison data |

### ML Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/analytics/anomalies` | Run Isolation Forest anomaly detection |
| POST | `/api/v1/analytics/trends` | Run ARIMA/LSTM trend prediction |
| POST | `/api/v1/analytics/hotspots` | Run DBSCAN hotspot clustering |
| GET | `/api/v1/analytics/summary/{city}` | Full summary across all parameters |

### Specialized Analyses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analysis/vegetation` | NDVI decline %, critical zones, forecast |
| GET | `/api/v1/analysis/land-conversion` | 2020 vs 2024 cell-by-cell land use changes |
| GET | `/api/v1/analysis/farmland` | Crop activity scoring |
| GET | `/api/v1/analysis/heat` | UHI intensity, zone rankings, anomalies |
| GET | `/api/v1/analysis/full-report` | All 4 analyses combined |

### Action Plan

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/action-plan/generate` | Trigger multi-agent pipeline → municipal report |

### Green Gap

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/green-gap/analyse` | NDVI-LST regression + top 50 plantation sites |

---

## 11. SPECIALIZED ANALYSES

### 11.1 Vegetation Loss Analysis

- **NDVI decline %** — compares first half vs second half of time-series
- **Area lost** — square kilometers of vegetation converted (from land use data)
- **Critical zones** — cells with NDVI < 0.15 (near-barren)
- **LSTM forecast** — predicts NDVI trajectory 6 months ahead

### 11.2 Land Conversion Analysis

- **Cell-by-cell comparison** — 2020 vs 2024 land use classification
- **Conversion types** — vegetation→urban, water→urban, agriculture→barren, etc.
- **Rapid conversions flagged** — suspicious land use changes
- **DBSCAN clustering** — groups nearby converted cells into development zones

### 11.3 Farmland Misuse Detection

- **Crop activity scoring** (0–100) — based on NDVI seasonal patterns
- **Idle land detection** — agricultural zones with no crop cycle
- **Seasonal anomalies** — fields that stopped showing crop patterns

### 11.4 Urban Heat Island Analysis

- **UHI intensity** — core city avg temperature minus periphery avg (°C difference)
- **Zone rankings** — neighborhoods ranked by temperature
- **Peak temperature** and city average
- **Hotspot count** and anomaly count per zone

---

## 12. DEMO FLOW (For Presentation)

```
Step 1: LANDING PAGE
  └→ "Satellite Intelligence for Smarter Cities"
  └→ Stats: 14 cities, 9 parameters, 4 missions, 4 ML models

Step 2: SIGNUP / LOGIN
  └→ Create account or login with existing credentials

Step 3: DASHBOARD
  └→ See Ahmedabad's environmental health at a glance
  └→ Toggle heatmap layers (LST, NDVI, NO₂)
  └→ Switch visualization modes (heatmap → 3D hexbin)
  └→ View time-series trend charts

Step 4: SWITCH CITY
  └→ Select Surat from sidebar dropdown
  └→ All data refreshes instantly for Surat

Step 5: ANALYTICS
  └→ Select "LST" → see anomalies (heat wave events detected)
  └→ Switch to "Trends" tab → see ARIMA forecast for next 30 days
  └→ Switch to "Hotspots" tab → see DBSCAN clusters on map

Step 6: RESEARCH MODE
  └→ Click anywhere on map to drop pin
  └→ Set radius to 10 km, select NO₂ + LST
  └→ Run query → see results with time-series chart
  └→ Export as CSV

Step 7: GREEN GAP ANALYSIS
  └→ See top 50 plantation sites for the city
  └→ Click a red marker (critical site)
  └→ See projected cooling: "Planting trees here reduces temp by 2.1°C"
  └→ See recommended species: "Neem, Peepal, Banyan"

Step 8: ACTION PLAN
  └→ Click "Generate Action Plan"
  └→ Watch animated progress (5 steps)
  └→ View generated report:
     - Key Findings (backed by satellite data)
     - Risk Assessment Matrix
     - 5 Recommendations with timelines and budgets
     - KPI Monitoring Framework
  └→ Export as PDF

Step 9: CLOSING STATEMENT
  └→ "This data exists for every city on Earth.
      We built the tool to use it.
      Hand this report to any municipal commissioner."
```

---

## 13. INNOVATION HIGHLIGHTS

| Innovation | Description | Why It Matters |
|-----------|-------------|----------------|
| **Multi-Source Harmonization** | 4 satellites with different resolutions → unified 1 km grid | No existing tool does this automatically for Indian cities |
| **Multi-Agent Pipeline** | 3 specialized agents (Data → Analysis → Plan) | Automates the full workflow that currently requires teams of specialists |
| **Green Gap Analysis** | NDVI-LST regression to predict cooling from tree planting | Directly actionable — tells cities WHERE to plant and HOW MUCH cooling to expect |
| **14-City Coverage** | Not just one demo city — works for any Gujarat city | Proves scalability and city-agnostic architecture |
| **Research Mode** | Fullscreen spatial-temporal query builder with CSV export | Empowers researchers and officers to explore data independently |
| **Municipal-Grade Reports** | Professional action plans with budgets, timelines, KPIs | Output that a government official can actually use — not just another dashboard |
| **3D Visualization** | Deck.GL with hexbin, grid, contour, and scatter modes | Makes data tangible — 3D columns rising from the map show impact at a glance |
| **Real Satellite Data** | All data is real, from NASA/ESA missions, for real cities | Not synthetic or demo data — genuine environmental intelligence |

---

## 14. SCALABILITY & FUTURE SCOPE

### How It Scales

- **To any city:** Change the bounding box coordinates → GEE returns data for that city. Pipeline is city-agnostic.
- **To any country:** Satellite data is global. Add country-specific parameters or regulations.
- **To more parameters:** Add new satellite collections in GEE → new JSON files → new heatmap layers.
- **To real-time:** Replace JSON files with live GEE queries + streaming pipeline.
- **To production:** Add PostGIS spatial indexing, Redis caching, load balancing.

### Future Enhancements

1. **Real-time satellite data streaming** via Google Earth Engine live queries
2. **Water body analysis** — lake/river monitoring using Sentinel-2
3. **Noise pollution mapping** — integrate urban noise sensor data
4. **Traffic correlation** — overlay pollution with traffic density
5. **Mobile app** — field verification for plantation sites
6. **Alert system** — automated notifications when anomalies detected
7. **Historical comparison** — decade-over-decade environmental change
8. **Carbon footprint calculator** — estimate CO₂ offset from recommended plantations

---

## 15. Q&A PREPARATION

| Question | Answer |
|----------|--------|
| **How does this scale to other cities?** | Change the bounding box coordinates. GEE has global data. The pipeline is city-agnostic — we already demonstrate with 14 cities. |
| **Where does the data come from?** | MODIS (NASA), Sentinel-5P (ESA/Copernicus), SMAP (NASA/JPL), Landsat (USGS). All free and publicly available via Google Earth Engine. |
| **How often does satellite data update?** | MODIS: daily/8-day. Sentinel-5P: daily. Landsat: 16-day. SMAP: daily. We handle varying frequencies through harmonization. |
| **What about resolution differences?** | We harmonize everything to a common 1 km grid using IDW interpolation via GEE's reproject and reduceResolution. |
| **Can municipalities actually use this?** | Yes. The action plan is generated in plain language. The map is interactive. No technical expertise is needed to read the output. It's designed for non-technical stakeholders. |
| **Why multi-agent?** | Different expertise needed: data collection requires geospatial knowledge, statistical analysis requires ML knowledge, policy recommendations require domain knowledge. Each agent specializes. |
| **What's the accuracy of your predictions?** | We can show ARIMA RMSE, Isolation Forest precision/recall, DBSCAN silhouette score, and NDVI-LST regression R² value — all computed on real data. |
| **What makes this different from existing tools?** | Existing tools (GEE, QGIS) require expert knowledge. We automate the full pipeline and output actionable reports, not raw data. |
| **How is the Green Gap analysis useful?** | It tells municipalities exactly WHERE to plant trees and predicts HOW MUCH cooling (in °C) each site will achieve. Species recommendations follow Gujarat Forest Dept guidelines. |
| **What if GEE goes down?** | All data is pre-fetched and stored as JSON files. The platform works fully offline from cached data. |

---

## 16. TEAM CONTRIBUTION AREAS

| Area | Scope |
|------|-------|
| **Frontend Development** | React pages, Deck.GL/MapLibre maps, Recharts visualizations, Tailwind styling, Framer Motion animations |
| **Backend Development** | FastAPI routes, services, authentication, database integration, API design |
| **ML Engineering** | Isolation Forest, LSTM, DBSCAN, ARIMA implementation, model tuning, Green Gap regression |
| **Data Engineering** | GEE data extraction, harmonization pipeline, JSON data preparation for 14 cities |
| **Multi-Agent System** | Orchestrator, Data Agent, Analysis Agent, Action Plan Agent design and implementation |
| **UI/UX Design** | Dark space glassmorphic theme, color scales, responsive layout, animation design |

---

## 17. KEY METRICS

| Metric | Value |
|--------|-------|
| Cities Covered | 14 (Gujarat) |
| Environmental Parameters | 9 |
| Satellite Missions | 4 (MODIS, Sentinel-5P, SMAP, Landsat) |
| ML Models | 4 (Isolation Forest, LSTM, DBSCAN, ARIMA) + 1 (NDVI-LST Regression) |
| Heatmap Layers | 8 |
| Visualization Modes | 5 |
| Map Styles | 5 |
| API Endpoints | 20+ |
| Frontend Pages | 10 |
| Backend Services | 8 |
| Grid Cells per City | 961 (31 × 31) |
| Grid Resolution | 1 km (0.01°) |
| Data Time Range | 24 months (Jan 2023 – Dec 2024) |
| Plantation Sites Ranked | Top 50 per city |
| Action Plan Sections | 8 (header, stats, executive summary, data sources, findings, risk matrix, recommendations, KPIs) |

---

*Document generated for AETRIX 2026 — PS-4 Submission*
*SatIntel — Satellite Environmental Intelligence Platform*

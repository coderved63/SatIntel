# SatIntel — Frontend Development Guide
## Product Manager → Frontend Team Handoff Document

---

## 1. PRODUCT OVERVIEW

**SatIntel** is a satellite environmental intelligence platform. The frontend is a React 19 SPA that displays satellite data on interactive maps, runs ML analytics, and renders government-grade action plans.

**Live URLs:**
- Frontend (Vercel): check `.env` for `VITE_API_URL`
- Backend (Render): `https://<render-app>.onrender.com/api/v1`
- Dev: `http://localhost:5173` (frontend) → proxy to `http://localhost:8000` (backend)

---

## 2. TECH STACK & DEPENDENCIES

```
npm install
```

| Package | Version | What It Does |
|---------|---------|-------------|
| `react` | ^19.2.4 | UI framework |
| `react-dom` | ^19.2.4 | DOM rendering |
| `react-router-dom` | ^7.13.1 | Client-side routing (v6 API) |
| `axios` | ^1.13.6 | HTTP client for API calls |
| `tailwindcss` | ^4.2.2 | Utility-first CSS (via Vite plugin) |
| `maplibre-gl` | ^5.21.0 | WebGL map renderer (free, no API key) |
| `react-map-gl` | ^8.1.0 | React bindings for MapLibre |
| `@deck.gl/core` | ^9.2.11 | GPU-accelerated data layers |
| `@deck.gl/react` | ^9.2.11 | React wrapper for Deck.gl |
| `@deck.gl/layers` | ^9.2.11 | Scatter, Column, Arc, Icon, GeoJSON layers |
| `@deck.gl/aggregation-layers` | ^9.2.11 | Heatmap, Hexagon, Grid, Contour, ScreenGrid |
| `leaflet` | ^1.9.4 | Secondary map engine (Green Gap page only) |
| `react-leaflet` | ^5.0.0 | React Leaflet bindings |
| `leaflet.heat` | ^0.2.0 | Heatmap plugin for Leaflet |
| `recharts` | ^3.8.0 | Time-series area/line charts |
| `framer-motion` | ^12.38.0 | Scroll animation on landing page |
| `lucide-react` | ^0.577.0 | Icon library |
| `vite` | ^6.3.5 | Build tool, dev server on port 5173 |
| `@tailwindcss/vite` | ^4.2.2 | Tailwind Vite plugin |

**Build commands:**
```bash
npm run dev      # Start dev server (port 5173, proxies /api → localhost:8000)
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

---

## 3. PROJECT STRUCTURE

```
frontend/src/
├── main.jsx                          # React root, StrictMode
├── App.jsx                           # BrowserRouter, all routes, providers
├── index.css                         # Tailwind base + global styles
├── App.css                           # App-level styles
│
├── context/
│   ├── AuthContext.jsx               # Auth state: user, login, signup, logout
│   └── CityContext.jsx               # Active city state: 14 Gujarat cities
│
├── services/
│   ├── api.js                        # Axios instance, interceptors
│   ├── authService.js                # signup, login, logout
│   ├── satelliteService.js           # fetchData, getParameters, getTimeSeries
│   ├── analyticsService.js           # getAnomalies, getTrends, getHotspots, getSummary
│   ├── actionPlanService.js          # generatePlan, getPlanHistory
│   ├── analysisService.js            # getVegetation, getLandConversion, getFarmland, getHeat, getFullReport
│   └── greenGapService.js            # analyse
│
├── pages/
│   ├── LandingPage.jsx               # Scroll animation → hero → features → stats
│   ├── LoginPage.jsx                 # Email + password form
│   ├── SignupPage.jsx                # Name + email + password form
│   ├── DashboardPage.jsx             # Map + stats cards + charts
│   ├── AnalyticsPage.jsx             # 4-tab ML analysis view
│   ├── ActionPlanPage.jsx            # Multi-agent plan generator + viewer
│   ├── GreenGapPage.jsx              # NDVI-LST regression plantation sites
│   ├── DataExplorerPage.jsx          # Data browser (stub)
│   ├── AboutPage.jsx                 # About page (stub)
│   └── NotFoundPage.jsx              # 404
│
├── components/
│   ├── common/
│   │   ├── Button.jsx                # Variants: primary, secondary, danger
│   │   ├── Input.jsx                 # Form input with label
│   │   ├── Card.jsx                  # Container card
│   │   ├── Loader.jsx                # Spinner with optional text
│   │   └── ProtectedRoute.jsx        # Redirects to /login if not authed
│   │
│   ├── layout/
│   │   ├── Navbar.jsx                # Top bar: logo + user menu
│   │   ├── Sidebar.jsx               # Navigation links + city selector dropdown
│   │   ├── DashboardLayout.jsx       # Navbar + Sidebar + content wrapper
│   │   └── Footer.jsx                # Footer
│   │
│   ├── landing/
│   │   └── ScrollAnimation.jsx       # 240-frame scroll-driven canvas animation
│   │
│   ├── dashboard/
│   │   ├── MapView.jsx               # MapLibre + Deck.gl map (5 styles, 5 viz modes, fire layer)
│   │   ├── StatsCard.jsx             # Metric card: value, icon, trend
│   │   ├── ChartWidget.jsx           # Recharts area chart
│   │   ├── LayerControl.jsx          # Toggle switches for 8 map layers
│   │   └── DataTable.jsx             # Generic table
│   │
│   ├── analytics/
│   │   ├── AnomalyList.jsx           # List of anomalies with severity badges
│   │   ├── TrendChart.jsx            # Historical + forecast chart
│   │   ├── HotspotMap.jsx            # Leaflet map with cluster circles
│   │   └── SpecializedAnalysis.jsx   # 4-card domain analysis grid
│   │
│   └── action-plan/
│       ├── PlanViewer.jsx            # Full action plan report renderer (~700 lines)
│       ├── FindingCard.jsx           # Individual finding display
│       ├── RecommendationCard.jsx    # Individual recommendation display
│       └── ExportPlan.jsx            # PDF + JSON export utilities
```

---

## 4. ROUTING & AUTH FLOW

### Routes (in `App.jsx`)

| Path | Component | Protected | Description |
|------|-----------|-----------|-------------|
| `/` | `LandingPage` | No | Scroll animation → hero |
| `/login` | `LoginPage` | No | Login form |
| `/signup` | `SignupPage` | No | Signup form |
| `/dashboard` | `DashboardPage` | **Yes** | Main view: map + stats + charts |
| `/analytics` | `AnalyticsPage` | **Yes** | ML analytics: anomalies, trends, hotspots, domain |
| `/action-plan` | `ActionPlanPage` | **Yes** | Generate & view action plans |
| `/green-gap` | `GreenGapPage` | **Yes** | Tree plantation site analysis |
| `/data-explorer` | `DataExplorerPage` | **Yes** | Data browser |
| `/about` | `AboutPage` | **Yes** | Project info |
| `*` | `NotFoundPage` | No | 404 catch-all |

### Provider Hierarchy
```jsx
<BrowserRouter>
  <AuthProvider>      // provides useAuth()
    <CityProvider>    // provides useCity()
      <Routes>...</Routes>
    </CityProvider>
  </AuthProvider>
</BrowserRouter>
```

### Auth Flow
1. User signs up or logs in → backend returns `{ token, user }`
2. Token + user saved to `localStorage`
3. Axios request interceptor attaches `Authorization: Bearer <token>` to every request
4. Axios response interceptor catches `401` → clears token → redirects to `/login`
5. `ProtectedRoute` checks `isAuthenticated` → redirects to `/login` if false
6. `useAuth()` hook provides: `user`, `login()`, `signup()`, `logout()`, `isAuthenticated`, `loading`

---

## 5. GLOBAL STATE

### AuthContext (`useAuth()`)
```typescript
interface AuthContext {
  user: { id: string; name: string; email: string } | null;
  login(email: string, password: string): Promise<void>;
  signup(name: string, email: string, password: string): Promise<void>;
  logout(): void;
  isAuthenticated: boolean;
  loading: boolean;  // true while checking localStorage on mount
}
```

### CityContext (`useCity()`)
```typescript
interface CityContext {
  city: {
    key: string;       // "ahmedabad", "surat", etc.
    name: string;      // "Ahmedabad", "Surat", etc.
    center: [number, number];  // [lat, lng]
    zoom: number;
  };
  cities: City[];      // all 14 Gujarat cities
  changeCity(key: string): void;
}
```

**14 cities available:**

| key | name | center | zoom |
|-----|------|--------|------|
| `ahmedabad` | Ahmedabad | [23.0225, 72.5714] | 11 |
| `surat` | Surat | [21.1702, 72.8311] | 12 |
| `vadodara` | Vadodara | [22.3072, 73.1812] | 12 |
| `rajkot` | Rajkot | [22.3039, 70.8022] | 12 |
| `bhavnagar` | Bhavnagar | [21.7645, 72.1519] | 12 |
| `jamnagar` | Jamnagar | [22.4707, 70.0577] | 12 |
| `gandhinagar` | Gandhinagar | [23.2156, 72.6369] | 13 |
| `junagadh` | Junagadh | [21.5222, 70.4579] | 12 |
| `anand` | Anand | [22.5645, 72.9289] | 12 |
| `morbi` | Morbi | [22.8120, 70.8370] | 13 |
| `mehsana` | Mehsana | [23.5880, 72.3693] | 13 |
| `bharuch` | Bharuch | [21.7051, 72.9959] | 13 |
| `navsari` | Navsari | [20.9467, 72.9520] | 13 |
| `vapi` | Vapi | [20.3893, 72.9106] | 13 |

**IMPORTANT:** When the user changes city in the sidebar, ALL pages must reload their data using the new `city.key`. Every API call should pass `city.key` as a query param or body field.

---

## 6. API REFERENCE (Every Endpoint)

### Base Configuration

```javascript
// services/api.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
});
// Interceptors: auto-attach token, auto-redirect on 401
```

---

### 6.1 Authentication

#### `POST /auth/signup`
```
Request:  { name: string, email: string, password: string }
Response: { token: string, user: { id, name, email } }
Error:    { detail: "Email already registered" } (400)
```

#### `POST /auth/login`
```
Request:  { email: string, password: string }
Response: { token: string, user: { id, name, email } }
Error:    { detail: "Invalid email or password" } (401)
```

#### `GET /users/me` (auth required)
```
Response: { id: string, name: string, email: string }
```

---

### 6.2 Satellite Data

#### `GET /satellite/parameters`
Returns the list of all 9 available parameters with metadata.
```json
[
  {
    "id": "LST",
    "name": "Land Surface Temperature",
    "unit": "°C",
    "source": "MODIS Terra (MOD11A2)",
    "resolution": "1km",
    "frequency": "8-day composite",
    "color": "#EF4444",
    "description": "Surface temperature from MODIS thermal infrared bands"
  },
  // ... NDVI, NO2, SOIL_MOISTURE, SO2, CO, O3, AEROSOL, LAND_USE
]
```

#### `GET /satellite/timeseries/{parameter}?city=ahmedabad`
Returns date-aggregated mean values for charts.
```json
{
  "parameter": "LST",
  "city": "ahmedabad",
  "timeseries": [
    { "date": "2023-01-01", "value": 25.32 },
    { "date": "2023-01-09", "value": 26.12 }
  ],
  "metadata": { "id": "LST", "name": "...", "unit": "°C", "color": "#EF4444" }
}
```

#### `POST /satellite/fetch` (auth required)
```
Request:  { city: "Ahmedabad", parameters: ["LST", "NDVI"], date_range: { start_date, end_date } }
Response: {
  city: "Ahmedabad",
  parameters: {
    "LST": {
      data: [{ date, lat, lng, value, parameter }],
      count: 450,
      metadata: { id, name, unit, source, color }
    }
  }
}
```

---

### 6.3 Maps

#### `GET /maps/heatmap/{parameter}?city=ahmedabad`
Returns point data for Deck.gl layers. **This is what MapView.jsx fetches.**
```json
{
  "parameter": "LST",
  "city": "ahmedabad",
  "date": "2024-12-30",
  "min_value": 15.23,
  "max_value": 45.87,
  "points": [[23.02, 72.57, 0.82], ...],
  "raw_points": [
    { "lat": 23.02, "lng": 72.57, "value": 38.23 }
  ]
}
```
**Frontend uses `raw_points`** — each object has `lat`, `lng`, `value`. Deck.gl layers use `getPosition: d => [d.lng, d.lat]` and `getWeight: d => Math.abs(d.value)`.

#### `GET /maps/layers?city=ahmedabad`
Returns all layers with embedded data.

#### `GET /maps/land-use-change?city=ahmedabad`
```json
{
  "city": "ahmedabad",
  "year_from": 2020,
  "year_to": 2024,
  "data_2020": [{ lat, lng, value, date }],
  "data_2024": [{ lat, lng, value, date }],
  "change_summary": {
    "urban_2020_pct": 28.5,
    "urban_2024_pct": 35.2,
    "vegetation_decrease_pct": -6.2
  }
}
```

---

### 6.4 Analytics (all auth required)

#### `POST /analytics/anomalies`
```
Request:  { parameter: "LST", city: "Ahmedabad" }
Response: {
  parameter: "LST",
  city: "Ahmedabad",
  anomalies: [{
    date: "2023-06-15",
    lat: 23.01, lng: 72.58,
    value: 48.23,
    severity: "critical" | "high" | "moderate",
    anomaly_score: -0.45
  }],
  total_points: 450,
  anomaly_count: 36,
  contamination: 0.08
}
```

#### `POST /analytics/trends`
```
Request:  { parameter: "LST", city: "Ahmedabad" }
Response: {
  parameter: "LST",
  city: "Ahmedabad",
  historical: { "2023-01-01": 25.32, "2023-01-09": 26.12 },
  forecast: { "2025-01-06": 39.54, "2025-01-13": 39.87 },
  trend_direction: "increasing" | "decreasing",
  model: "ARIMA(2,1,1)",
  forecast_days: 30
}
```

#### `POST /analytics/hotspots`
```
Request:  { parameter: "LST", city: "Ahmedabad" }
Response: {
  parameter: "LST",
  city: "Ahmedabad",
  hotspots: [{
    cluster_id: 0,
    center_lat: 23.01, center_lng: 72.59,
    avg_value: 42.34,
    num_points: 12,
    severity: "critical" | "high" | "moderate",
    radius_km: 2.2
  }],
  total_points: 450,
  hot_points: 120,
  cluster_count: 8,
  threshold: 42.34
}
```

#### `GET /analytics/summary/{city}` (auth required)
Returns stats + anomaly counts + hotspot counts for ALL 4 core parameters. This is what the Dashboard loads on mount.
```json
{
  "city": "Ahmedabad",
  "parameters": {
    "LST": {
      "statistics": {
        "mean": 34.23, "std": 5.34, "min": 15.23, "max": 45.87,
        "median": 34.12, "count": 450, "unit": "°C"
      },
      "anomaly_count": 36,
      "hotspot_count": 8,
      "top_anomalies": [...],
      "top_hotspots": [...]
    },
    "NDVI": { ... },
    "NO2": { ... },
    "SOIL_MOISTURE": { ... }
  }
}
```

---

### 6.5 Specialized Analysis (all auth required)

#### `GET /analysis/vegetation?city=Ahmedabad`
```json
{
  "city": "Ahmedabad",
  "ndvi_decline_pct": 4.5,
  "area_lost_sqkm": 20.9,
  "current_city_ndvi": 0.245,
  "critical_zones": 45,
  "anomaly_count": 28,
  "anomaly_events": [{ date, lat, lng, value, severity, anomaly_score }],
  "clusters": [{ cluster_id, center_lat, center_lng, avg_value, num_points, severity }],
  "forecast_6m": [{ date, forecast_value, confidence }],
  "trend": "declining"
}
```

#### `GET /analysis/land-conversion?city=Ahmedabad`
```json
{
  "city": "Ahmedabad",
  "total_cells_changed": 92,
  "total_area_sqkm": 92.0,
  "conversion_breakdown": {
    "vegetation_to_urban": 58,
    "sparse_vegetation_to_urban": 24,
    "water_to_urban": 5
  },
  "rapid_conversions": 58,
  "rapid_conversion_cells": [{ lat, lng, from, to, from_class, to_class }],
  "cluster_count": 6,
  "change_summary": { "urban_2020_pct", "urban_2024_pct", "vegetation_decrease_pct" }
}
```

#### `GET /analysis/farmland?city=Ahmedabad`
```json
{
  "city": "Ahmedabad",
  "total_zones_analyzed": 350,
  "total_suspicious_zones": 67,
  "total_suspicious_area_sqkm": 67.0,
  "zones": [{ lat, lng, mean_ndvi, crop_activity_score, classification }],
  "suspicious_zones": [{ lat, lng, mean_ndvi, crop_activity_score, classification, flag }],
  "cluster_count": 5,
  "classifications": { "active_farmland": 165, "idle_land": 95, "barren_or_converted": 90 }
}
```

#### `GET /analysis/heat?city=Ahmedabad`
```json
{
  "city": "Ahmedabad",
  "uhi_intensity_celsius": 6.8,
  "peak_temp": 45.8,
  "city_avg_temp": 34.2,
  "zone_rankings": [
    { "zone": "City Core", "avg_temp": 39.2, "max_temp": 45.8, "readings": 120 },
    { "zone": "Industrial East", "avg_temp": 38.1, ... },
    { "zone": "Western Suburbs", ... },
    { "zone": "North", ... },
    { "zone": "South", ... },
    { "zone": "Periphery", ... }
  ],
  "anomaly_count": 36,
  "anomaly_events": [...],
  "hotspot_clusters": [...],
  "hotspot_count": 8
}
```

#### `GET /analysis/full-report?city=Ahmedabad`
Returns all 4 analyses combined:
```json
{
  "city": "Ahmedabad",
  "vegetation": { /* /analysis/vegetation response */ },
  "land_conversion": { /* /analysis/land-conversion response */ },
  "farmland": { /* /analysis/farmland response */ },
  "heat": { /* /analysis/heat response */ }
}
```

---

### 6.6 Green Gap Analysis (auth required)

#### `GET /green-gap/analyse?city=ahmedabad`
```json
{
  "city": "ahmedabad",
  "regression": {
    "beta0": 45.0,
    "beta1": -12.0,
    "r_squared": 0.623,
    "sample_size": 425,
    "interpretation": "For every +0.1 increase in NDVI, surface temperature decreases by 1.20 degrees C"
  },
  "city_mean_lst": 34.2,
  "city_mean_ndvi": 0.25,
  "total_candidate_cells": 420,
  "critical_sites": 42,
  "avg_projected_cooling": 2.3,
  "max_projected_cooling": 5.7,
  "top_50_sites": [
    {
      "lat": 23.0156,
      "lng": 72.5845,
      "current_ndvi": 0.045,
      "current_lst": 45.8,
      "land_class": "urban",
      "priority_score": 92.3,
      "projected_cooling": 5.7,
      "projected_new_lst": 40.1,
      "recommended_species": "Peepal (Ficus religiosa), Banyan (Ficus benghalensis), Neem (Azadirachta indica)",
      "severity": "critical" | "high" | "moderate"
    }
  ],
  "all_candidates": [ /* up to 200 sites, same shape */ ]
}
```

---

### 6.7 Action Plan (auth required)

#### `POST /action-plan/generate`
```
Request: { city: "Ahmedabad", parameters: ["LST","NDVI","NO2","SOIL_MOISTURE"] }
```

Response is a massive JSON object representing a full municipal report. Key top-level fields:

```json
{
  "city": "Ahmedabad",
  "report_title": "Environment Action Plan for Ahmedabad ...",
  "report_number": "EAP/AHM/2026/03-001",
  "generated_at": "2026-03-21T10:30:45",
  "classification": "For Official Use — Municipal Administration",
  "prepared_for": "Ahmedabad Municipal Corporation",
  "prepared_by": "SatIntel — Satellite Environmental Intelligence Platform",
  "executive_summary": "... multi-paragraph text ...",
  "summary_statistics": {
    "total_data_points_analyzed": 1800,
    "satellite_missions_used": 4,
    "total_anomalies_detected": 120,
    "total_hotspot_clusters": 25
  },
  "data_sources": [{ mission, agency, parameter, resolution, coverage }],
  "findings": [{
    "id": "F-01",
    "title": "...",
    "description": "...",
    "severity": "critical" | "high",
    "parameter": "LST",
    "evidence": "...",
    "affected_population": "...",
    "trend": "Increasing"
  }],
  "risk_matrix": [{
    "hazard": "...",
    "likelihood": "Very High",
    "impact": "Critical — ...",
    "risk_level": "CRITICAL" | "HIGH",
    "affected_areas": "..."
  }],
  "priority_zones": [{ name, lat, lng, parameter, severity, description }],
  "recommendations": [{
    "id": "R-01",
    "title": "...",
    "description": "...",
    "priority": "immediate" | "short-term" | "long-term",
    "timeline": "...",
    "location": "...",
    "estimated_impact": "...",
    "responsible_authority": "...",
    "budget_category": "..."
  }],
  "priority_actions": ["IMMEDIATE: ...", "URGENT: ...", "WITHIN 30 DAYS: ..."],
  "monitoring_framework": {
    "schedule": [{ quarter, focus }],
    "kpis": [{ metric, current, target_1yr, target_3yr }]
  },
  "disclaimer": "..."
}
```

**PlanViewer.jsx renders this entire structure** — it's the most complex component (~700 lines).

---

## 7. PAGE-BY-PAGE SPECIFICATION

### 7.1 Landing Page (`/`)

**Behavior:**
1. On load, user sees a **240-frame scroll animation** (ScrollAnimation component)
2. As user scrolls (500vh tall container), satellite imagery frames play on a canvas
3. Text scenes fade in/out at specific scroll positions:
   - 0–18%: "SatIntel."
   - 20–42%: "14 Gujarat Cities."
   - 44–66%: "ML-Powered Analytics."
   - 68–88%: "From Data To Action."
   - 90–100%: Final CTA transition
4. At 98% scroll, `onComplete` fires → hero section fades in
5. Hero section has: headline, subtitle, Get Started / Login buttons
6. Below hero: 3 feature cards, stats bar, tech stack pills, footer

**Frames location:** `public/frames/ezgif-frame-001.jpg` through `ezgif-frame-240.jpg`

**Key props:**
- `ScrollAnimation` receives `onComplete` callback
- Uses `framer-motion` `useScroll` + `useSpring` for smooth progress

---

### 7.2 Dashboard (`/dashboard`)

**Data loading on mount + city change:**
```javascript
const [summaryRes, lstTs, ndviTs, smTs, no2Ts] = await Promise.all([
  analyticsService.getSummary(city.key),
  satelliteService.getTimeSeries('LST', city.key),
  satelliteService.getTimeSeries('NDVI', city.key),
  satelliteService.getTimeSeries('SOIL_MOISTURE', city.key),
  satelliteService.getTimeSeries('NO2', city.key),
]);
```

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: "{City} Environmental Dashboard"                     │
├──────────┬──────────┬──────────┬──────────────────────────────┤
│StatsCard │StatsCard │AQ Card   │StatsCard                     │
│ Temp     │ NDVI     │(dropdown)│ Soil Moist                   │
├──────────┴──────────┴──────────┴──────────────────────────────┤
│                     │                                         │
│   MapLibre+Deck.gl  │  Chart: Temperature Trend              │
│   Map (60%)         │  Chart: Vegetation Trend               │
│   + LayerControl    │  Chart: AQ Trend (dynamic param)       │
│                     │  (40%)                                  │
│                     │                                         │
└─────────────────────┴─────────────────────────────────────────┘
```

**Air Quality dropdown card:** Switches between NO₂, SO₂, CO, O₃, Aerosol. Each has its own `scale` factor for display (e.g., NO₂ × 1e6 → µmol/m²). When user picks a new AQ param, load its timeseries and update the chart.

**Map layers (8 toggleable):**
- LST (red), NDVI (green), NO₂ (purple), SO₂ (amber), CO (red), O₃ (blue), Aerosol (brown), SOIL_MOISTURE (blue)
- Default on: LST, NDVI
- Each layer fetches from `/maps/heatmap/{PARAM}?city={city.key}`

**MapView props:**
```jsx
<MapView layers={layers} city={city} />
```
- `layers`: array of `{ id, label, color, enabled }`
- `city`: object from `useCity()` — used for center/zoom + API calls

---

### 7.3 Analytics (`/analytics`)

**Data loading on mount + parameter/city change:**
```javascript
const [anomalyRes, trendRes, hotspotRes] = await Promise.all([
  analyticsService.getAnomalies(activeParam, city.key),
  analyticsService.getTrends(activeParam, city.key),
  analyticsService.getHotspots(activeParam, city.key),
]);
```

**4 parameters:** LST, NDVI, NO₂, SOIL_MOISTURE (button selector at top)

**4 tabs:**
1. **Anomalies** → `<AnomalyList data={anomalies} />`
   - Shows: anomaly_count / total_points header
   - List items: date, lat/lng, value, severity badge (red/amber/yellow)

2. **Trends** → `<TrendChart data={trends} />`
   - Area chart: historical values + forecast overlay
   - Label: trend_direction

3. **Hotspots** → `<HotspotMap data={hotspots} />`
   - Leaflet map with CircleMarker for each cluster
   - Circle color = severity, radius ∝ num_points
   - List below map with cluster details

4. **Domain Analysis** → `<SpecializedAnalysis />`
   - Calls `analysisService.getFullReport(city.key)` on mount
   - Renders 4 cards: Vegetation, Land Conversion, Farmland, Heat
   - Each card shows key metrics from its analysis

---

### 7.4 Green Gap (`/green-gap`)

**Data loading on mount:**
```javascript
greenGapService.analyse(city.key)
```

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Header: "Green Infrastructure Gap Analysis"                 │
├──────────┬──────────┬──────────┬───────────────────────────┤
│ Critical │ Avg      │ Max      │ Total                      │
│ Sites    │ Cooling  │ Cooling  │ Candidates                 │
├──────────┴──────────┴──────────┴───────────────────────────┤
│ Regression Card: β₁, R², sample size, interpretation       │
├────────────────────────────┬───────────────────────────────┤
│                            │  Selected Site Detail:         │
│   Leaflet Map              │  - Before/After temp           │
│   (top 50 sites as         │  - Projected cooling           │
│    CircleMarkers)          │  - Recommended species         │
│                            │  - Priority score bar          │
│   (60%)                    │                                │
│                            │  Top 50 Site List              │
│                            │  (scrollable, clickable)       │
│                            │  (40%)                         │
└────────────────────────────┴───────────────────────────────┘
```

**Severity colors:**
- Critical (≥70): `#dc2626` (red)
- High (≥40): `#f59e0b` (amber)
- Moderate: `#16a34a` (green)

**Click a site on map → populates the detail panel** with before/after comparison, cooling projection, and species recommendation.

---

### 7.5 Action Plan (`/action-plan`)

**Flow:**
1. User clicks "Generate Environment Action Plan"
2. Frontend shows animated progress steps:
   - Fetching satellite data...
   - Running anomaly detection...
   - Analyzing trends...
   - Identifying hotspots...
   - Generating action plan...
3. Calls `actionPlanService.generatePlan(city.key, ['LST','NDVI','NO2','SOIL_MOISTURE'])`
4. On response, renders `<PlanViewer plan={data} />`
5. Export menu: "Download PDF" / "Download JSON"

**PlanViewer sections (in order):**
1. Report header (number, classification, dates)
2. Summary statistics grid
3. Executive summary
4. Data sources table
5. Priority actions (amber highlighted list)
6. Risk assessment matrix table
7. Key findings (4 FindingCards)
8. Priority zones (locations on mini-map)
9. Recommendations (5 RecommendationCards)
10. Monitoring framework + KPIs table
11. Quarterly schedule
12. Disclaimer

---

## 8. MAP COMPONENT SPEC (MapView.jsx)

This is the most complex component. It uses **MapLibre GL JS** as the basemap and **Deck.gl** for data visualization layers.

### Basemap Styles (5, all free, no API key)
| Key | Label | Source |
|-----|-------|--------|
| `dark` | Dark | `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` |
| `satellite` | Satellite | Esri World Imagery raster tiles |
| `terrain` | Terrain | OpenTopoMap raster tiles |
| `streets` | Streets | `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json` |
| `light` | Light | `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` |

### Visualization Modes (5)
| Key | Deck.gl Layer | 3D-capable |
|-----|--------------|------------|
| `heatmap` | `HeatmapLayer` | No |
| `hexbin` | `HexagonLayer` | Yes (extruded hexagons) |
| `grid` | `GridLayer` | Yes (extruded grid cells) |
| `scatter` | `ScatterplotLayer` | No |
| `contour` | `ContourLayer` | No |

### Color Ranges (per parameter)
```javascript
const COLOR_RANGES = {
  LST:    [[59,130,246],[6,182,212],[251,191,36],[249,115,22],[239,68,68]],   // blue→red
  NDVI:   [[146,64,14],[217,119,6],[132,204,22],[34,197,94],[5,150,105]],     // brown→green
  NO2:    [[16,185,129],[132,204,22],[251,191,36],[168,85,247],[124,58,237]], // green→purple
  SO2:    [[34,197,94],[250,204,21],[245,158,11],[239,68,68],[185,28,28]],
  CO:     [[59,130,246],[96,165,250],[250,204,21],[239,68,68],[220,38,38]],
  O3:     [[147,197,253],[59,130,246],[37,99,235],[29,78,216],[30,58,138]],
  AEROSOL:[[254,243,199],[217,119,6],[180,83,9],[146,64,14],[92,45,13]],
  SOIL_MOISTURE: [[239,68,68],[249,115,22],[251,191,36],[59,130,246],[29,78,216]],
};
```

### Wildfire Layer (Extras tab)
- Toggle on → fetches NASA FIRMS VIIRS CSV for India (last 2 days)
- Filters to Gujarat region (lat 20–24.5, lng 68–74.5)
- Renders as two ScatterplotLayers (outer glow + inner core)
- Tooltip shows: confidence, fire power (MW), date, location

### Control Panel UI
- Top-left floating button "Controls" → opens panel
- 3 tabs: Style (basemap picker) / Visualize (viz mode picker) / Extras (3D toggle, wildfire toggle)

---

## 9. COLOR PALETTE & DESIGN TOKENS

### Theme Colors (Tailwind classes)
| Purpose | Color | Tailwind | Hex |
|---------|-------|----------|-----|
| Background | Dark navy | `bg-slate-900` | `#0F172A` |
| Card bg | Slightly lighter | `bg-slate-800/50` | semi-transparent |
| Borders | Subtle | `border-slate-700/50` | semi-transparent |
| Primary accent | Cyan | `text-cyan-400` | `#06B6D4` |
| Secondary accent | Emerald | `text-emerald-400` | `#10B981` |
| Text primary | White | `text-white` | `#FFFFFF` |
| Text secondary | Slate | `text-slate-400` | `#94A3B8` |
| Text muted | Darker slate | `text-slate-500` | `#64748B` |

### Parameter Colors
| Parameter | Color | Hex |
|-----------|-------|-----|
| LST | Red | `#EF4444` |
| NDVI | Emerald | `#10B981` |
| NO₂ | Purple | `#8B5CF6` |
| SO₂ | Amber | `#F59E0B` |
| CO | Red | `#DC2626` |
| O₃ | Blue | `#2563EB` |
| Aerosol | Brown | `#92400E` |
| Soil Moisture | Blue | `#3B82F6` |

### Severity Colors
| Severity | Color | Hex |
|----------|-------|-----|
| Critical | Red | `#dc2626` |
| High | Amber | `#f59e0b` |
| Moderate | Green | `#16a34a` |

---

## 10. SIDEBAR NAVIGATION

```javascript
const links = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/analytics',     label: 'Analytics',      icon: BarChart3 },
  { to: '/action-plan',   label: 'Action Plan',    icon: FileText },
  { to: '/data-explorer', label: 'Data Explorer',  icon: Database },
  { to: '/about',         label: 'About',          icon: Info },
  { to: '/green-gap',     label: 'Green Gap',      icon: TreePine },
];
```

Below the nav links: **City selector dropdown** showing all 14 cities. Active city highlighted in cyan.

---

## 11. DATA FLOW PATTERNS

### Pattern 1: Page loads data on mount + city change
```jsx
const { city } = useCity();
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  someService.getData(city.key)
    .then(setData)
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
}, [city.key]);
```

### Pattern 2: Map fetches layer data per enabled layer
```jsx
useEffect(() => {
  layers.filter(l => l.enabled).forEach(async (layer) => {
    const paramId = layer.id.toUpperCase();
    if (heatmapData[paramId]) return; // already loaded
    const res = await fetch(`/api/v1/maps/heatmap/${paramId}?city=${city.key}`);
    const data = await res.json();
    setHeatmapData(prev => ({ ...prev, [paramId]: data.raw_points }));
  });
}, [layers, city.key]);
```

### Pattern 3: Analytics reloads on parameter + city change
```jsx
useEffect(() => {
  runAnalysis();
}, [activeParam, city.key]);
```

---

## 12. ERROR HANDLING

- All API errors → catch block → set error state → show error message with retry button
- 401 from any API → Axios interceptor clears token → redirect to `/login`
- Network failure → show "Failed to load data" + retry
- Empty data → show "No data available for this city/parameter"

---

## 13. RESPONSIVE BEHAVIOR

- **Desktop (lg+):** Sidebar visible, map 60% / charts 40%, full stats row
- **Tablet (md):** Stats cards 2-column, map full width above charts
- **Mobile (sm):** Single column, sidebar collapses, cards stack vertically

Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`

---

## 14. IMPORTANT GOTCHAS

1. **MapLibre needs CSS import:** `import 'maplibre-gl/dist/maplibre-gl.css'`
2. **Leaflet needs CSS import:** `import 'leaflet/dist/leaflet.css'`
3. **Deck.gl layers are rebuilt on every render** — use `useMemo` to prevent thrashing
4. **NASA FIRMS API** may be slow/fail — handle gracefully, fire layer is optional
5. **AQ parameters** have different scale factors for display — NO₂ ×1e6, CO ×1e2, O₃ ×1e3
6. **City key** is lowercase (`ahmedabad`), city name is Title Case (`Ahmedabad`)
7. **Map recenters** on city change via `setViewState` effect
8. **Action plan generation** can take 5–15 seconds — show progress animation
9. **ScrollAnimation** preloads 240 images — show loading progress bar
10. **`/green-gap`** uses Leaflet (not MapLibre) — different map component

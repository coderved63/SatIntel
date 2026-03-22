# SatIntel — Final Submission Report

---

## PAGE 1 — COVER PAGE

---

**Project Title:** SatIntel — Satellite Environmental Intelligence Platform for Smart Cities

**Team Name:** Team Nexus

**Team ID:** AETRIX-2026-PS4-NEXUS *(update with actual assigned ID)*

**Problem Statement:** PS-4: Satellite Environmental Intelligence Platform for Smart Cities

**Domain:** Sustainable Environment

**Hackathon:** AETRIX 2026 — 36-Hour Hackathon, PDEU, Gandhinagar

**Date:** March 21–22, 2026

### Team Members & Roles

| Name | Role |
|------|------|
| Himanshu Mishra | Full-Stack Development, GEE Integration, ML Pipeline, UI/UX |
| Vedant Mehta | Backend Services, Specialized Analysis, Deployment |
| Riya Joshi | Frontend Development, Theme System, Research Mode |

---

*Confidential — For Jury Evaluation Only*

---
---

## PAGE 2 — EXECUTIVE SUMMARY + PROBLEM STATEMENT

---

### Section 1: Executive Summary

**SatIntel** is a satellite environmental intelligence platform that transforms raw Earth observation data from NASA and ESA missions into actionable environmental policy for Indian cities. The platform ingests data from four satellite missions — MODIS, Sentinel-5P, SMAP, and Landsat — covering nine environmental parameters including land surface temperature, vegetation health, air pollution (NO₂, SO₂, CO, O₃, aerosol), soil moisture, and land use classification. All datasets are harmonized to a common 1 km grid using Inverse Distance Weighting (IDW) interpolation, enabling direct cross-parameter comparison at any location.

The platform runs five ML models — Isolation Forest for anomaly detection, LSTM and ARIMA for trend forecasting, DBSCAN for spatial hotspot clustering, and NDVI-LST regression for green infrastructure planning — across 14 Gujarat cities. A multi-agent system orchestrates the full pipeline: data ingestion, ML analysis, and automated generation of municipal-grade Environment Action Plans. The result is a tool that a municipal commissioner can use today — no satellite expertise required. SatIntel achieves sub-second dashboard loads (25× speedup via pre-computation) while processing over 225,000 harmonized data points per city, making satellite intelligence practically accessible for urban environmental governance.

---

### Section 2: Problem Statement & Domain Relevance

#### The Root Cause

Indian cities face escalating environmental crises — urban heat islands exceeding 48°C, vegetation loss from unregulated construction, hazardous air pollution corridors near industrial zones, and declining soil moisture signaling drought risk. NASA and ESA satellites photograph every city on Earth daily, generating petabytes of freely available environmental data. However, a critical gap exists: **no practical tool bridges raw satellite data and municipal decision-making**. The data exists; the analysis pipeline does not.

#### Why This Matters

Urban environmental degradation directly impacts public health (heat stroke mortality, respiratory illness from pollution), food security (farmland conversion, soil degradation), water resources (drought from declining soil moisture), and urban livability. Ahmedabad alone recorded 1,344 heat-related deaths in 2010, leading to India's first Heat Action Plan. Cities need continuous satellite-backed monitoring — not sporadic manual surveys — to respond proactively.

#### Who Is Affected

Over 26 million people across Gujarat's 14 major cities are directly affected. Municipal corporations, urban planning authorities, district collectors, environmental regulators, agricultural officers, and public health departments all require environmental intelligence but lack tools to access satellite data without specialized GIS expertise.

#### Existing Solutions & Their Limitations

- **Google Earth Engine:** Powerful but requires programming expertise; produces raw data, not actionable reports.
- **ISRO Bhuvan Portal:** Visualization only; no ML analytics, no automated reporting, limited interactivity.
- **Commercial Platforms (Planet, Maxar):** Expensive ($5,000–50,000/year), not tailored for Indian municipalities.
- **Manual Ground Surveys:** Expensive, infrequent (annual), limited coverage, weeks to process.

None of these solutions provide an end-to-end pipeline from satellite data to ML-driven analysis to a ready-to-use municipal action plan — which is exactly what SatIntel delivers.

---
---

## PAGE 3 — PROPOSED SOLUTION + TECH STACK

---

### Section 3: Proposed Solution

#### Overview

SatIntel is a full-stack web platform that automates the entire satellite-to-action pipeline. Users select a city, and the system loads pre-harmonized satellite data from four missions, runs five ML models, performs four domain-specific analyses (vegetation loss, urban heat islands, land conversion, farmland misuse), and generates a professional Environment Action Plan — all within one second of dashboard load.

#### Key Features

- **Multi-Satellite Data Harmonization:** Nine environmental parameters from four satellite missions, harmonized to a common 1 km grid (961 cells per city) via IDW interpolation — enabling direct cross-parameter spatial analysis.
- **Five ML Models:** Isolation Forest (anomaly detection), LSTM + ARIMA (trend forecasting), DBSCAN (hotspot clustering), NDVI-LST regression (green infrastructure gap analysis with projected cooling per plantation site).
- **Multi-Agent Pipeline:** Three specialized agents — Data Agent, Analysis Agent, Action Plan Agent — orchestrated to generate evidence-backed municipal reports with findings, risk matrices, recommendations, timelines, and KPI frameworks.
- **Interactive Geospatial Dashboard:** Eight toggleable heatmap layers on Leaflet maps, anomaly markers, hotspot clusters, time-series charts, city health scores, and a 14-city comparative ranking leaderboard.
- **Green Infrastructure Optimizer:** Identifies the top 50 tree plantation sites per city, ranked by projected temperature reduction (°C), with species recommendations based on Gujarat Forest Department guidelines.

#### Innovation vs. Existing Approaches

Unlike existing tools that stop at visualization, SatIntel closes the loop from data to decision. The multi-agent system generates reports in the language of municipal governance — not satellite science. The NDVI-LST regression quantifies the exact cooling impact of planting trees at specific coordinates, making environmental planning measurable and evidence-based.

#### Direct Users & Benefits

Municipal commissioners receive ready-to-implement action plans. Urban planners see exactly where heat islands and pollution corridors exist. Agricultural officers identify farmland misuse via crop activity scoring. Environmental regulators get anomaly alerts backed by satellite evidence. No GIS expertise is needed — the platform translates satellite data into plain-language findings.

---

### Section 4: Tech Stack & Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19, Vite 6, Tailwind CSS v4 | Component-based UI, fast HMR, utility styling |
| Maps | React-Leaflet, leaflet.heat | 8 interactive heatmap layers, markers, clusters |
| Charts | Recharts | Time-series area/line charts with forecasts |
| Backend | FastAPI, Uvicorn, Pydantic v2 | Async REST API, validation, auto-docs |
| Auth | JWT (HS256), bcrypt, python-jose | Stateless token auth, 24h expiry |
| ML | scikit-learn, PyTorch, statsmodels | Isolation Forest, LSTM, ARIMA, DBSCAN |
| Satellite | Google Earth Engine (Python API) | MODIS, Sentinel-5P, SMAP, Landsat data |
| Harmonization | NumPy (IDW interpolation) | Resample all data to common 1 km grid |
| Database | PostgreSQL + PostGIS (Neon), JSON fallback | Spatial queries, user storage |
| Deployment | Vercel (frontend), Render (backend) | Production hosting with CI/CD |

#### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  SATELLITE SOURCES                                                   │
│  MODIS (LST, NDVI) │ Sentinel-5P (NO₂,SO₂,CO,O₃,Aerosol)          │
│  SMAP (Soil Moisture) │ Landsat 8/9 (Land Use)                      │
└────────────────────────────┬─────────────────────────────────────────┘
                             ▼
               ┌─────────────────────────┐
               │  Google Earth Engine     │──→ Pre-fetched JSON files
               │  (Cloud Processing)      │    /data/[14 cities]/*.json
               └─────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FASTAPI BACKEND                                                     │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────────┐   │
│  │ IDW Harmoni- │  │ ML Models     │  │ Multi-Agent Pipeline    │   │
│  │ zation →     │→ │ IF│LSTM│DBSCAN│→ │ Data→Analysis→ActionPlan│   │
│  │ 961-cell grid│  │ ARIMA│Regress.│  │ (Orchestrator)          │   │
│  └──────────────┘  └───────────────┘  └─────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Domain Services: Vegetation│Heat│LandConv│Farm│GreenGap│Alerts│   │
│  └──────────────────────────────────────────────────────────────┘    │
│  Auth (JWT) │ Cache (Memory/Redis) │ 20+ REST Endpoints             │
└────────────────────────────┬─────────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  REACT FRONTEND                                                      │
│  Dashboard (Map+Stats+Charts) │ Analytics (Anomalies+Trends+Hotspots)│
│  Action Plan (PDF Export) │ Green Gap │ Rankings │ Research Mode      │
└──────────────────────────────────────────────────────────────────────┘
```

---
---

## PAGE 4 — IMPLEMENTATION DETAILS

---

### Section 5: Implementation Details

#### Development Process — Key Milestones

| Phase | Hours | Milestone |
|-------|-------|-----------|
| Foundation | 0–3 | Project scaffolding, GEE authentication, pre-fetched satellite data for 14 Gujarat cities (9 parameters each), JWT auth flow end-to-end |
| Core Pipeline | 3–10 | IDW harmonization engine (961-cell grid), Isolation Forest anomaly detection, ARIMA trend prediction, DBSCAN clustering, interactive Leaflet map with 8 heatmap layers |
| Domain Analysis | 10–18 | Vegetation loss service, Urban Heat Island zone analysis, land conversion tracking (2020 vs 2024), farmland misuse detection via LSTM crop scoring, green infrastructure gap analysis with NDVI-LST regression |
| Multi-Agent | 18–24 | Three-agent orchestration pipeline (data → analysis → action plan), municipal-grade report generation with risk matrices and KPI frameworks, PDF/JSON export |
| Optimization | 24–30 | 25× speedup via pre-harmonized data + pre-computed ML cache, startup cache warmup for all 14 cities, sub-second dashboard loads |
| Polish | 30–36 | City rankings leaderboard, CSV export, anomaly descriptions, alert system, edge case handling, demo rehearsal |

#### Challenges & Solutions

**1. Cross-Sensor Grid Alignment:** Four satellite missions produce data at different spatial resolutions (1 km, 7 km, 9 km, 30 m) on incompatible grids. Direct comparison was impossible. We implemented IDW interpolation to resample all datasets to a unified 0.01° grid (961 cells), enabling pixel-level cross-parameter analysis. This required 14.7 million interpolation calculations per city, which we solved by pre-computing and caching harmonized files.

**2. Dashboard Load Time (23s → 0.92s):** Raw pipeline (load JSON → harmonize → run ML) took 23 seconds per page load — unacceptable for a demo. We implemented a three-tier optimization: (a) pre-harmonized JSON files eliminate 12s of IDW computation, (b) pre-computed ML results cache eliminates 12s of model training, (c) startup cache warmup pre-loads all cities into memory. Result: 25× faster, sub-second loads.

**3. Meaningful Anomaly Detection at Scale:** Running Isolation Forest on 225,000 raw data points produced 18,000+ anomalies — mostly noise from spatial variance. We switched to date-level aggregation (city-wide mean per date), reducing input to ~43 meaningful time points. This surfaced genuine environmental events (heat waves, pollution spikes) instead of spatial noise, cutting results to dozens of actionable anomalies.

#### Scalability Measures

- **City-Agnostic Design:** Adding a new city requires only its bounding box coordinates and a GEE data fetch — the entire pipeline (harmonization, ML, action plan) works automatically. Currently supports 14 cities; designed for any city globally.
- **Modular Services Layer:** Each service (satellite, ML, vegetation, heat, etc.) has independent function signatures. Swapping MongoDB for PostGIS, ARIMA for LSTM, or file storage for Redis requires changing one service — no route or frontend changes.
- **Async FastAPI:** All endpoints are async, supporting concurrent requests. Background startup cache warmup ensures first-request performance matches subsequent requests.
- **Three-Level Caching:** Memory → Redis → File fallback chain ensures performance at any infrastructure level.

#### Security Considerations

- **Authentication:** JWT tokens (HS256) with bcrypt password hashing, 24-hour expiry, automatic logout on 401 responses.
- **API Security:** CORS whitelist restricted to frontend origin, Pydantic v2 input validation on all endpoints, HTTPException error handling prevents stack trace leakage.
- **Data Protection:** GEE service account credentials excluded from version control via .gitignore. Environment variables for all secrets (JWT secret, database URL).
- **Protected Routes:** All satellite, analytics, and action plan endpoints require valid JWT via dependency injection middleware.

---

### Section 6: Future Scope & Enhancements

- **Real-Time Satellite Streaming:** Replace pre-fetched data with live GEE queries triggered by schedule or user request, enabling near-real-time monitoring with automated alert dispatch via SMS/email to municipal officers.
- **LLM-Powered Action Plans:** Integrate Claude or GPT-4 API to generate context-aware natural language recommendations instead of template-based reports — adapting language and priorities to each city's specific challenges.
- **National Scale Deployment:** Expand from 14 Gujarat cities to all 4,000+ Indian municipalities. Partner with the Ministry of Environment, Forest and Climate Change (MoEFCC) for integration into the National Clean Air Programme (NCAP) monitoring infrastructure.
- **Mobile App + Offline Mode:** React Native companion app for field officers with offline caching for low-connectivity rural areas. GPS-tagged ground truth photo uploads to validate satellite findings.
- **Carbon Credit Estimation:** Use NDVI change data to estimate carbon sequestration from green cover improvements, enabling cities to participate in voluntary carbon markets.

---
---

## PAGE 5 — UX + MARKET VIABILITY

---

### Section 7: User Experience & Interface

#### Key User Journey

A user begins at the landing page, which presents the platform's value proposition — "Satellite Intelligence for Smarter Cities" — with three feature cards explaining multi-satellite data, ML-powered analytics, and automated action plans. After signing up or logging in (JWT-authenticated), the user enters the dashboard.

The dashboard opens with a city selector in the navigation bar (defaulting to Ahmedabad), four statistics cards displaying current averages for temperature, vegetation, air quality, and soil moisture, and a large interactive map centered on the selected city at zoom level 11. The map displays eight toggleable heatmap layers — users click layer controls to overlay urban heat islands, vegetation health, pollution corridors, or soil moisture in real time. Anomaly markers pulse in red; hotspot clusters appear as shaded circles. A time-series chart panel alongside the map shows parameter trends over two years.

From the sidebar, the user navigates to the Analytics page, where they select a parameter and explore three tabs — Anomalies (listing detected events with severity, deviation, and plain-language descriptions), Trends (LSTM forecast overlaid on historical data), and Hotspots (DBSCAN clusters mapped spatially). A fourth tab provides domain-specific analyses: vegetation loss metrics, UHI zone rankings, land conversion tracking, and farmland misuse detection.

The Action Plan page provides a one-click pipeline: the user presses "Generate Action Plan," observes a multi-step progress indicator (fetching data → running analysis → generating recommendations), and receives a professional municipal report with numbered findings, a risk assessment matrix, prioritized recommendations with timelines and budget categories, and a KPI monitoring framework. The report is exportable as PDF or JSON.

The Green Gap page presents the top 50 tree plantation sites ranked by projected cooling impact, with species recommendations. The City Rankings page compares all 14 Gujarat cities across environmental metrics with CSV export for further analysis.

#### Accessibility Considerations

- **Device:** Fully responsive design via Tailwind CSS — works on desktops, tablets, and mobile devices.
- **Connectivity:** Pre-computed data and three-level caching ensure sub-second loads even on moderate connections. JSON fallback eliminates dependency on external databases.
- **Language:** Reports use plain English with no jargon. All satellite-specific terms (NDVI, LST) are accompanied by human-readable labels ("Vegetation Health," "Surface Temperature").
- **Theme:** Dark/light mode toggle via ThemeContext for user preference and reduced eye strain during extended use.

#### Unique UX Decisions

We chose to display anomaly descriptions in natural language ("Extreme heat event — surface temperature significantly above seasonal average") rather than raw numbers, ensuring non-technical stakeholders immediately understand severity. The map defaults to showing the most impactful layers (UHI and anomalies enabled), with secondary layers (soil moisture, ozone) available on demand — reducing cognitive overload while maintaining depth.

---

### Section 8: Market Viability & Business Model

#### Target Users

Primary: Municipal corporations and urban local bodies across India (~4,000 municipalities). Secondary: State pollution control boards (29 states), district agricultural officers (~740 districts), urban planning authorities, and environmental consultancies. The platform is designed for non-technical government officers — no GIS or satellite expertise required.

#### Monetisation Strategy

- **SaaS Tiered Licensing:** Free tier (1 city, basic parameters) for awareness; Professional tier (₹50,000/year per city) for municipalities with full analytics, action plans, and alerts; Enterprise tier for state-level deployments covering all districts.
- **Government Contracts:** Direct procurement under Smart Cities Mission, AMRUT 2.0, and National Clean Air Programme budgets. India's Smart Cities Mission alone has ₹48,000 crore allocated — environmental monitoring is a mandatory component.
- **Consulting Reports:** On-demand detailed environmental assessments for real estate developers, infrastructure projects requiring Environmental Impact Assessments (EIA), and industrial compliance reporting.

#### Compliance & Regulatory Alignment

- Aligned with India's National Clean Air Programme (NCAP) monitoring requirements.
- Supports Heat Action Plan compliance (mandated for all major Indian cities post-2013).
- Uses only freely available public satellite data (NASA/ESA) — no licensing restrictions on data redistribution.
- All data processing occurs server-side; no personal data collection beyond auth credentials.

#### Real-World Deployment Scenarios

**Scenario 1 — Ahmedabad Municipal Corporation Heat Action Plan:** AMC deploys SatIntel to monitor urban heat islands in real time. The platform identifies that the Naroda-Odhav industrial corridor consistently registers 4.2°C above city average. The Green Gap module recommends 12 specific plantation sites along this corridor, projecting 2.3°C average cooling. AMC allocates budget from Smart Cities Mission funds, plants 10,000 trees at GPS-tagged coordinates, and uses SatIntel's quarterly monitoring to track NDVI improvement and temperature reduction over 12 months.

**Scenario 2 — Gujarat Pollution Control Board (GPCB) Industrial Monitoring:** GPCB uses SatIntel's anomaly detection across 14 cities to flag unusual NO₂ and SO₂ spikes near GIDC industrial estates. When the system detects a critical SO₂ anomaly in Vapi's chemical hub, GPCB dispatches an inspection team within 48 hours — compared to the current quarterly inspection cycle. The platform's evidence-backed alerts (satellite timestamp, coordinates, deviation magnitude) provide legal standing for enforcement notices.

---
---

## PAGE 6 — CONCLUSION + APPENDIX

---

### Section 9: Conclusion

#### Key Impact & Achievements

SatIntel demonstrates that satellite environmental intelligence can be made practically accessible to non-technical municipal decision-makers. In 36 hours, we built a platform that ingests data from four NASA/ESA satellite missions, harmonizes nine environmental parameters to a common spatial grid, runs five ML models, performs four domain-specific analyses, and generates professional municipal action plans — all loading in under one second. The platform covers 14 Gujarat cities with over 225,000 harmonized data points per city, representing two years of continuous satellite observation.

The technical pipeline — from IDW interpolation for cross-sensor alignment, to Isolation Forest anomaly detection aggregated at city-level for noise reduction, to NDVI-LST regression for quantifying cooling potential at specific GPS coordinates — transforms abstract satellite imagery into concrete decisions: "Plant 500 Neem trees at (23.05, 72.40) for a projected 2.3°C cooling." Every number in every report traces back to an actual satellite measurement.

#### What We Are Most Proud Of

The 25× performance optimization — reducing dashboard load from 23 seconds to under 1 second through pre-harmonization and ML caching — and the Green Infrastructure Gap Analysis, which uses NDVI-LST regression to produce GPS-precise tree plantation recommendations with quantified temperature impact. This feature alone makes SatIntel immediately useful for any municipal corporation's urban forestry program.

#### Vision Statement

> *"Every city on Earth has satellite data. SatIntel gives every city the intelligence to act on it."*

---

### Section 10: Appendix

#### References & Data Sources

| Source | Agency | Data | Dataset ID |
|--------|--------|------|-----------|
| MODIS Terra | NASA | LST (8-day, 1km) | MODIS/061/MOD11A2 |
| MODIS Terra | NASA | NDVI (16-day, 1km) | MODIS/061/MOD13A2 |
| Sentinel-5P TROPOMI | ESA/Copernicus | NO₂, SO₂, CO, O₃, Aerosol | COPERNICUS/S5P/OFFL/L3_* |
| NASA SMAP | NASA/JPL | Soil Moisture (daily, 9km) | NASA/SMAP/SPL3SMP_E/006 |
| Landsat 8/9 | USGS/NASA | Land Use (16-day, 30m) | LANDSAT/LC08-09/C02/T1_L2 |

#### APIs & Libraries Used

| Category | Libraries |
|----------|----------|
| Frontend | React 19, Vite 6, React Router v7, Tailwind CSS v4, Recharts, React-Leaflet, leaflet.heat, Framer Motion, Axios, Lucide React |
| Backend | FastAPI, Uvicorn, Pydantic v2, python-jose, bcrypt/passlib, SQLAlchemy, GeoAlchemy2 |
| ML / Data Science | scikit-learn (IsolationForest, DBSCAN), PyTorch (LSTM), statsmodels (ARIMA), NumPy, Pandas |
| Geospatial | Google Earth Engine Python API (earthengine-api), geemap, pyproj |
| Infrastructure | PostgreSQL + PostGIS (Neon Cloud), Vercel, Render |

#### Acknowledgements

- NASA Goddard Space Flight Center and ESA Copernicus Programme for freely available satellite data.
- Google Earth Engine team for providing cloud-based geospatial processing at no cost for research.
- PDEU and the AETRIX 2026 organizing committee for providing the platform and problem statement.
- Gujarat Forest Department guidelines referenced for tree species recommendations in Green Gap analysis.

---

**Project Repository:** github.com/coderved63/Satellite
**Platform Metrics:** 14 cities | 9 parameters | 4 satellite missions | 5 ML models | 20+ API endpoints | 225K+ data points per city | Sub-second dashboard loads

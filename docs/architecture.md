# System Architecture — SatIntel

## Overview
SatIntel is a satellite environmental intelligence platform that processes multi-mission satellite data through an ML analytics pipeline to generate actionable Environment Action Plans for cities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │ Dashboard │  │Analytics │  │  Action  │  │  Data Explorer   ││
│  │  + Map    │  │  Page    │  │  Plan    │  │                  ││
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬──────────┘│
│        └──────────────┼─────────────┼────────────────┘           │
│                       │     Axios + JWT Auth                     │
└───────────────────────┼──────────────────────────────────────────┘
                        │ REST API
┌───────────────────────┼──────────────────────────────────────────┐
│                   BACKEND (FastAPI + Uvicorn)                     │
│                       │                                           │
│  ┌────────────────────▼─────────────────────────────────────┐    │
│  │                    API Routes Layer                        │    │
│  │  /auth  /satellite  /analytics  /maps  /action-plan       │    │
│  └──────────┬───────────┬───────────┬────────────────────────┘    │
│             │           │           │                              │
│  ┌──────────▼───┐ ┌─────▼────┐ ┌───▼────────────┐               │
│  │  Satellite   │ │    ML    │ │  Action Plan   │               │
│  │  Service     │ │  Service │ │  Service       │               │
│  │  (GEE/JSON)  │ │          │ │  (Template)    │               │
│  └──────┬───────┘ └────┬─────┘ └───────┬────────┘               │
│         │              │               │                          │
│  ┌──────▼──────────────▼───────────────▼────────────────────┐    │
│  │              Multi-Agent Orchestrator                      │    │
│  │  Data Agent → Analysis Agent → Action Plan Agent           │    │
│  └──────────────────────┬────────────────────────────────────┘    │
│                         │                                         │
│  ┌──────────────────────▼────────────────────────────────────┐    │
│  │          PostgreSQL + PostGIS / JSON Fallback              │    │
│  └───────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│                 SATELLITE DATA SOURCES                             │
│  ┌─────────┐  ┌────────────┐  ┌──────────┐  ┌───────────────┐   │
│  │  MODIS  │  │Sentinel-5P │  │ Landsat  │  │    SMAP       │   │
│  │ (NASA)  │  │   (ESA)    │  │(USGS/NASA)│  │   (NASA)      │   │
│  │ LST,NDVI│  │    NO₂     │  │ Land Use │  │Soil Moisture  │   │
│  │  1km    │  │   ~7km     │  │   30m    │  │    9km        │   │
│  └─────────┘  └────────────┘  └──────────┘  └───────────────┘   │
│         All accessed via Google Earth Engine Python API            │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Ingestion**: GEE Python API queries 4 satellite missions (MODIS, Sentinel-5P, Landsat, SMAP)
2. **Harmonization**: All data resampled to common 1 km grid using IDW interpolation
3. **Storage**: PostgreSQL + PostGIS with spatial indices (fallback: JSON files)
4. **ML Analytics**: Isolation Forest (anomalies), ARIMA (trends), DBSCAN (hotspots)
5. **Visualization**: React-Leaflet with 6 toggleable map layers
6. **Action Plan**: Template-based report from ML findings → PDF/JSON export

## ML Pipeline

| Algorithm | Purpose | Library | Input | Output |
|-----------|---------|---------|-------|--------|
| Isolation Forest | Anomaly Detection | scikit-learn | Time-series values | Anomaly flags + severity |
| ARIMA(2,1,1) | Trend Prediction | statsmodels | Aggregated time-series | 30-day forecast |
| DBSCAN | Hotspot Clustering | scikit-learn | Spatial coordinates + values | Geographic clusters |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React-Leaflet, Recharts |
| Backend | FastAPI, Uvicorn, Pydantic v2 |
| Database | PostgreSQL + PostGIS (GeoAlchemy2) |
| ML | scikit-learn, statsmodels, pandas, numpy |
| Satellite | Google Earth Engine Python API |
| Auth | JWT (HS256), passlib + bcrypt |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/signup | User registration |
| POST | /api/v1/auth/login | User login |
| GET | /api/v1/satellite/parameters | Available parameters |
| GET | /api/v1/satellite/timeseries/{param} | Time-series data |
| GET | /api/v1/maps/heatmap/{param} | Heatmap layer data |
| GET | /api/v1/maps/land-use-change | Land use comparison |
| POST | /api/v1/analytics/anomalies | Run anomaly detection |
| POST | /api/v1/analytics/trends | Run trend prediction |
| POST | /api/v1/analytics/hotspots | Run hotspot clustering |
| GET | /api/v1/analytics/summary/{city} | Full city summary |
| POST | /api/v1/action-plan/generate | Generate action plan |

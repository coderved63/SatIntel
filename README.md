# Satellite Environmental Intelligence Platform

A platform that ingests satellite data from multiple missions (MODIS, Sentinel-5P, SMAP), runs ML analytics, and generates interactive geospatial maps with environment action plans for smart cities.

Built for **AETRIX 2026** hackathon — focused on Ahmedabad.

## Features

- **Multi-Satellite Data Ingestion** — Land Surface Temperature, NDVI, NO₂, Soil Moisture via Google Earth Engine
- **ML Analytics** — Anomaly detection (Isolation Forest), trend prediction (ARIMA), hotspot clustering (DBSCAN)
- **Interactive Maps** — Leaflet-based maps with togglable heatmap layers for urban heat islands, pollution zones, vegetation health
- **Multi-Agent Pipeline** — Automated data collection → analysis → action plan generation
- **Environment Action Plan** — AI-generated city-specific recommendations backed by satellite findings

## Tech Stack

**Frontend:** React 18 + Vite, Tailwind CSS, React-Leaflet, Recharts

**Backend:** FastAPI, Python 3.11+, JWT auth

**ML:** scikit-learn, statsmodels, pandas, numpy

**Data:** Google Earth Engine API, MODIS, Sentinel-5P, SMAP

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env     # edit with your keys
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:8000`, frontend on `http://localhost:5173`.

## Project Structure

```
├── backend/          # FastAPI app with routes, services, ML, agents
├── frontend/         # React app with maps, charts, dashboards
├── data/             # Pre-fetched satellite data for Ahmedabad
└── README.md
```

## Team

Built at AETRIX 2026, PDEU Gandhinagar.

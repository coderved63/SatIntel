# Project Report — SatIntel
## Satellite Environmental Intelligence Platform for Smart Cities

### AETRIX 2026 | PS-4 | Team [YOUR TEAM NAME]

---

## 1. Problem Statement
Urban environmental monitoring requires integrating data from multiple satellite missions to identify critical issues like urban heat islands, vegetation loss, air pollution, and drought stress. Municipal authorities lack tools to translate raw satellite data into actionable policy recommendations.

## 2. Our Solution
SatIntel is a web platform that:
- **Ingests** data from 4 satellite missions (MODIS, Sentinel-5P, Landsat, SMAP) via Google Earth Engine
- **Harmonizes** all data to a common 1 km spatial grid
- **Stores** harmonized time-series in a PostGIS spatial database
- **Analyzes** using 3 ML algorithms (Isolation Forest, ARIMA, DBSCAN)
- **Visualizes** on interactive maps with 6 toggleable layers
- **Generates** Environment Action Plans with specific findings and recommendations

## 3. Key Features
- Real satellite data for Ahmedabad (2023-2024)
- ML-powered anomaly detection, trend forecasting, and hotspot clustering
- Interactive Leaflet maps with heatmap overlays
- Land use change detection (2020 vs 2024 urban sprawl)
- Municipal-grade action plan report with PDF export
- Multi-agent pipeline: Data Agent → Analysis Agent → Action Plan Agent

## 4. Technical Architecture
See docs/architecture.md for detailed diagrams.

## 5. Data Sources
| Mission | Agency | Parameter | Resolution |
|---------|--------|-----------|-----------|
| MODIS Terra | NASA | Land Surface Temperature | 1 km, 8-day |
| MODIS Terra | NASA | Vegetation Index (NDVI) | 1 km, 16-day |
| Sentinel-5P | ESA | Tropospheric NO₂ | ~7 km, daily |
| Landsat 8/9 | USGS/NASA | Land Use Classification | 30 m, annual |
| SMAP | NASA | Soil Moisture | 9 km, daily |

## 6. ML Models & Results
- **Isolation Forest**: Detected 81 environmental anomalies across 4 parameters
- **ARIMA(2,1,1)**: 30-day forecasts for all parameters with trend direction
- **DBSCAN**: Identified 26 hotspot clusters (heat islands, pollution zones, vegetation stress)

## 7. Demo Flow
Login → Dashboard (satellite data on map) → Toggle layers → Analytics (anomalies, trends, hotspots) → Generate Action Plan → Export as PDF

## 8. Scalability
- City-agnostic: change bounding box coordinates for any city globally
- GEE provides global satellite data — pipeline works for any location
- Architecture supports adding new satellite missions and parameters

## 9. Team
[Add your team member names and roles]

## 10. References
- Google Earth Engine: https://earthengine.google.com/
- MODIS: https://modis.gsfc.nasa.gov/
- Sentinel-5P: https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-5p
- Landsat: https://landsat.gsfc.nasa.gov/

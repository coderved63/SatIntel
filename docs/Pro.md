# SatIntel — Satellite Data Technical Reference (Pro)

## 1. Data Source Update Frequencies

| Parameter | Satellite Mission | Agency | Native Frequency | GEE Lag | Our Fetch Strategy |
|-----------|------------------|--------|-------------------|---------|-------------------|
| **LST** | MODIS Terra MOD11A2 | NASA | 8-day composite | ~2 days | 8-day composites, all available dates |
| **NDVI** | MODIS Terra MOD13A2 | NASA | 16-day composite | ~5 days | 16-day composites, all available dates |
| **NO₂** | Sentinel-5P TROPOMI | ESA/Copernicus | Daily | ~5 hours | Monthly mean composites |
| **SO₂** | Sentinel-5P TROPOMI | ESA/Copernicus | Daily | ~5 hours | Monthly mean composites |
| **CO** | Sentinel-5P TROPOMI | ESA/Copernicus | Daily | ~5 hours | Monthly mean composites |
| **O₃** | Sentinel-5P TROPOMI | ESA/Copernicus | Daily | ~5 hours | Monthly mean composites |
| **Aerosol Index** | Sentinel-5P TROPOMI | ESA/Copernicus | Daily | ~5 hours | Monthly mean composites |
| **Soil Moisture** | NASA SMAP SPL3SMP_E v006 | NASA/JPL | 3-day composite | ~3 days | 3-day composites, all available dates |
| **Land Use** | Landsat 8 + Landsat 9 | USGS/NASA | 16-day revisit | ~2 weeks | Annual NDVI-based classification composite |
| **Wildfires** | VIIRS SNPP (FIRMS) | NASA | Near real-time | ~3 hours | Live CSV API (last 48h) — already live |

### Recommended Refresh Schedule

| Data Type | Recommended Refresh | Reason |
|-----------|-------------------|--------|
| Sentinel-5P (NO₂, SO₂, CO, O₃, Aerosol) | **Weekly** | Daily source, monthly composites benefit from weekly updates |
| MODIS (LST, NDVI) | **Every 2 weeks** | 8-16 day composites, new data every ~10 days |
| SMAP (Soil Moisture) | **Weekly** | 3-day composite, relevant for drought monitoring |
| Landsat (Land Use) | **Quarterly** | Annual composite, changes are slow |
| FIRMS (Wildfires) | **Already live** | Frontend fetches directly from NASA FIRMS API |

---

## 2. GEE Collection IDs

| Parameter | GEE Collection ID | Band Name |
|-----------|------------------|-----------|
| LST | `MODIS/061/MOD11A2` | `LST_Day_1km` |
| NDVI | `MODIS/061/MOD13A2` | `NDVI` |
| NO₂ | `COPERNICUS/S5P/OFFL/L3_NO2` | `tropospheric_NO2_column_number_density` |
| SO₂ | `COPERNICUS/S5P/OFFL/L3_SO2` | `SO2_column_number_density` |
| CO | `COPERNICUS/S5P/OFFL/L3_CO` | `CO_column_number_density` |
| O₃ | `COPERNICUS/S5P/OFFL/L3_O3` | `O3_column_number_density` |
| Aerosol | `COPERNICUS/S5P/OFFL/L3_AER_AI` | `absorbing_aerosol_index` |
| Soil Moisture | `NASA/SMAP/SPL3SMP_E/006` | `soil_moisture_am` |
| Land Use | `LANDSAT/LC08/C02/T1_L2` + `LANDSAT/LC09/C02/T1_L2` | `SR_B4`, `SR_B5` → NDVI → classification |

---

## 3. Raw Data Conversion (GEE → Our Format)

### LST (Land Surface Temperature)
```
GEE Raw: Digital Number (DN) in band LST_Day_1km
Conversion: value = DN × 0.02 - 273.15
Units: °C (Celsius)
Range: ~15°C to ~50°C for Gujarat
```

### NDVI (Vegetation Index)
```
GEE Raw: Scaled integer in band NDVI
Conversion: value = DN × 0.0001
Units: Dimensionless index (0 to 1)
Range: 0.0 (barren) to 0.8 (dense vegetation)
Interpretation: <0.2 = barren/built, 0.2-0.4 = sparse, >0.4 = healthy vegetation
```

### NO₂ (Nitrogen Dioxide)
```
GEE Raw: tropospheric_NO2_column_number_density
Conversion: No conversion needed (already in mol/m²)
Units: mol/m²
Display: × 10⁶ for µmol/m²
Range: 0.00003 to 0.0002 mol/m² for Gujarat
```

### SO₂ (Sulfur Dioxide)
```
GEE Raw: SO2_column_number_density
Conversion: No conversion needed (already in mol/m²)
Units: mol/m²
Range: typically 0 to 0.001 mol/m²
```

### CO (Carbon Monoxide)
```
GEE Raw: CO_column_number_density
Conversion: No conversion needed (already in mol/m²)
Units: mol/m²
Range: 0.02 to 0.06 mol/m² for Gujarat
```

### O₃ (Ozone)
```
GEE Raw: O3_column_number_density
Conversion: No conversion needed (already in mol/m²)
Units: mol/m²
Range: 0.1 to 0.16 mol/m²
```

### Aerosol Index
```
GEE Raw: absorbing_aerosol_index
Conversion: No conversion needed
Units: Dimensionless index
Range: -1 to 5 (>1 indicates aerosol presence, >2 = heavy dust/smoke)
```

### Soil Moisture
```
GEE Raw: soil_moisture_am (AM overpass)
Conversion: No conversion needed
Units: m³/m³ (volumetric water content)
Range: 0.02 to 0.45 m³/m³
Interpretation: <0.1 = very dry, 0.1-0.2 = dry, 0.2-0.3 = moist, >0.3 = wet
```

### Land Use Classification
```
GEE Raw: Landsat SR_B4 (Red), SR_B5 (NIR)
Step 1: Apply scale factor: band × 0.0000275 + (-0.2)
Step 2: Compute NDVI = (NIR - Red) / (NIR + Red)
Step 3: Classify:
  NDVI > 0.4   → 3 (dense_vegetation)
  NDVI > 0.1   → 2 (sparse_vegetation)
  NDVI > -0.1  → 1 (urban/barren)
  NDVI ≤ -0.1  → 0 (water)
Cloud filter: CLOUD_COVER < 20%
Method: Median annual composite
```

---

## 4. Our JSON Schema

Every data file follows this schema:
```json
{
  "date": "2024-01-15",      // ISO date string
  "lat": 23.0225,            // Latitude (WGS84)
  "lng": 72.5714,            // Longitude (WGS84)
  "value": 35.4200,          // Converted measurement value
  "parameter": "LST"         // Parameter identifier
}
```

Land Use files add:
```json
{
  "class_label": "urban"     // Human-readable class name
}
```

---

## 5. Extraction Method

### Grid Sampling
- **Grid size:** 3×3 points per city bounding box (9 sample points)
- **Method:** `ee.ImageCollection.getRegion()` — single API call returns all points × all dates
- **Scale:** 1000m (1km resolution)
- **Max images:** 50 per collection (to avoid GEE timeout)

### Monthly Compositing (Sentinel-5P)
- Daily data is too voluminous (~730 images over 2 years)
- We compute monthly mean images server-side on GEE
- Result: ~24 images per 2-year period (now ~75 for 6+ years)

### Harmonization (backend)
- Raw data from different missions has different native resolutions
- IDW (Inverse Distance Weighting) interpolation resamples to a uniform 0.01° (~1.1km) grid
- Implemented in `geo_helpers.py → harmonize_timeseries()`

---

## 6. Data Pipeline

```
Satellite Missions (NASA/ESA)
        ↓
Google Earth Engine (cloud processing)
        ↓  getRegion() batch API
    Raw JSON files → data/<city>/*.json
        ↓  _load_raw()
    IDW Harmonization → 1km common grid
        ↓  _load_data()
    Backend Services (FastAPI)
        ↓  bulk insert
    PostgreSQL + PostGIS (Neon)
        ↓  ST_DWithin spatial queries
    Research Mode / Dashboard / Analytics
```

---

## 7. Hybrid Live Fetch Architecture

```
User Request → Check cache age
  ├── < 1 week old → Serve cached JSON (instant)
  └── > 1 week old → Serve cached + trigger background GEE refresh
                          ↓
                    GEE API fetch (30-60s)
                          ↓
                    Update JSON files + PostgreSQL
                          ↓
                    Update "last_synced" timestamp
                          ↓
                    Next request gets fresh data
```

**Dashboard shows:** "Last synced: X hours/days ago" with a "Sync Now" button.

---

## 8. Data Coverage

| Dimension | Value |
|-----------|-------|
| **Temporal range** | January 2020 – March 2026 (6+ years) |
| **Cities** | 14 Gujarat cities |
| **Parameters** | 8 environmental + 1 land use |
| **Spatial resolution** | 1km harmonized grid |
| **Total data points** | ~84,000+ (across all cities/params) |
| **Database** | Neon PostgreSQL + PostGIS (spatial indexed) |
| **Storage** | JSON files (local) + PostgreSQL (cloud) |

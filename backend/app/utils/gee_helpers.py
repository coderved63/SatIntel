"""
Google Earth Engine (GEE) Integration.
Supports all Gujarat cities and air quality parameters.
"""
import ee
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.utils.cities import CITIES, get_city

logger = logging.getLogger(__name__)

_initialized = False


def init_gee(service_account_email: str = "", key_file: str = "gee_service_account.json", project: str = ""):
    """Initialize GEE. Call once at startup."""
    global _initialized
    if _initialized:
        return True

    if service_account_email and Path(key_file).exists():
        try:
            credentials = ee.ServiceAccountCredentials(service_account_email, key_file)
            init_kwargs = {"credentials": credentials}
            if project:
                init_kwargs["project"] = project
            ee.Initialize(**init_kwargs)
            _initialized = True
            logger.info("GEE initialized with service account")
            return True
        except Exception as e:
            logger.warning(f"Service account init failed: {e}")

    try:
        init_kwargs = {}
        if project:
            init_kwargs["project"] = project
        ee.Initialize(**init_kwargs)
        _initialized = True
        logger.info("GEE initialized with default credentials")
        return True
    except Exception as e:
        logger.error(f"GEE initialization failed: {e}")
        return False


def get_bbox(city: str = "ahmedabad") -> ee.Geometry:
    """Get the bounding box for a city as an EE Geometry."""
    cfg = get_city(city)
    return ee.Geometry.Rectangle(cfg["bbox"])


def _make_monthly_collection(base_collection, band_name, start_date, end_date):
    """Create monthly mean composites from a daily collection."""
    start = ee.Date(start_date)
    end = ee.Date(end_date)
    n_months = end.difference(start, 'month').round()

    def make_monthly(i):
        i = ee.Number(i)
        month_start = start.advance(i, 'month')
        month_end = month_start.advance(1, 'month')
        return (base_collection
                .filterDate(month_start, month_end)
                .select(band_name)
                .mean()
                .set('system:time_start', month_start.millis()))

    return ee.ImageCollection(ee.List.sequence(0, n_months.subtract(1)).map(make_monthly))


def _extract_timeseries(collection, bbox, band_name, scale_factor=1.0, offset=0.0, num_points=10):
    """
    Extract time-series data using getRegion() for fast batch extraction.
    Single API call for all points x all dates.
    """
    import numpy as np

    cfg_bbox = bbox.bounds().coordinates().getInfo()[0]
    min_lng, min_lat = cfg_bbox[0]
    max_lng, max_lat = cfg_bbox[2]

    grid_size = max(int(np.sqrt(num_points)), 3)
    lats = np.linspace(min_lat + 0.01, max_lat - 0.01, grid_size)
    lngs = np.linspace(min_lng + 0.01, max_lng - 0.01, grid_size)

    points = []
    for lat in lats:
        for lng in lngs:
            points.append(ee.Feature(ee.Geometry.Point([float(lng), float(lat)])))
    sample_fc = ee.FeatureCollection(points)

    size = collection.size().getInfo()
    if size > 500:
        collection = collection.limit(500)
        logger.info(f"Limited collection from {size} to 500 images")

    region_data = collection.select(band_name).getRegion(sample_fc, scale=1000).getInfo()

    header = region_data[0]
    band_idx = header.index(band_name)
    time_idx = header.index('time')
    lon_idx = header.index('longitude')
    lat_idx = header.index('latitude')

    results = []
    for row in region_data[1:]:
        val = row[band_idx]
        timestamp = row[time_idx]
        if val is None or timestamp is None:
            continue
        val = val * scale_factor + offset
        date_str = datetime.utcfromtimestamp(timestamp / 1000).strftime('%Y-%m-%d')
        results.append({
            "date": date_str,
            "lat": round(row[lat_idx], 4),
            "lng": round(row[lon_idx], 4),
            "value": round(val, 4),
        })

    return results


# ── Core Environmental Parameters ─────────────────────────────

def fetch_lst(city: str = "ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """Fetch Land Surface Temperature from MODIS Terra (MOD11A2). 8-day, 1km."""
    bbox = get_bbox(city)
    collection = (
        ee.ImageCollection('MODIS/061/MOD11A2')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select('LST_Day_1km')
    )
    data = _extract_timeseries(collection, bbox, 'LST_Day_1km', scale_factor=0.02, offset=-273.15)
    for d in data:
        d["parameter"] = "LST"
    logger.info(f"Fetched {len(data)} LST points for {city}")
    return data


def fetch_ndvi(city: str = "ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """Fetch NDVI from MODIS (MOD13A2). 16-day, 1km."""
    bbox = get_bbox(city)
    collection = (
        ee.ImageCollection('MODIS/061/MOD13A2')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select('NDVI')
    )
    data = _extract_timeseries(collection, bbox, 'NDVI', scale_factor=0.0001)
    for d in data:
        d["parameter"] = "NDVI"
    logger.info(f"Fetched {len(data)} NDVI points for {city}")
    return data


def fetch_soil_moisture(city: str = "ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """Fetch Soil Moisture from NASA SMAP (SPL3SMP_E). 3-day, ~9km."""
    bbox = get_bbox(city)
    collection = (
        ee.ImageCollection('NASA/SMAP/SPL3SMP_E/006')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select('soil_moisture_am')
    )
    data = _extract_timeseries(collection, bbox, 'soil_moisture_am')
    for d in data:
        d["parameter"] = "SOIL_MOISTURE"
    logger.info(f"Fetched {len(data)} soil moisture points for {city}")
    return data


# ── Air Quality Parameters (Sentinel-5P TROPOMI) ──────────────

def fetch_no2(city: str = "ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """Fetch NO2 from Sentinel-5P TROPOMI. Monthly composites. mol/m²."""
    bbox = get_bbox(city)
    band = 'tropospheric_NO2_column_number_density'
    base = (
        ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select(band)
    )
    collection = _make_monthly_collection(base, band, start_date, end_date)
    data = _extract_timeseries(collection, bbox, band)
    for d in data:
        d["parameter"] = "NO2"
    logger.info(f"Fetched {len(data)} NO2 points for {city}")
    return data


def fetch_so2(city: str = "ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """Fetch SO2 from Sentinel-5P TROPOMI. Monthly composites. mol/m²."""
    bbox = get_bbox(city)
    band = 'SO2_column_number_density'
    base = (
        ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_SO2')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select(band)
    )
    collection = _make_monthly_collection(base, band, start_date, end_date)
    data = _extract_timeseries(collection, bbox, band)
    for d in data:
        d["parameter"] = "SO2"
    logger.info(f"Fetched {len(data)} SO2 points for {city}")
    return data


def fetch_co(city: str = "ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """Fetch CO from Sentinel-5P TROPOMI. Monthly composites. mol/m²."""
    bbox = get_bbox(city)
    band = 'CO_column_number_density'
    base = (
        ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CO')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select(band)
    )
    collection = _make_monthly_collection(base, band, start_date, end_date)
    data = _extract_timeseries(collection, bbox, band)
    for d in data:
        d["parameter"] = "CO"
    logger.info(f"Fetched {len(data)} CO points for {city}")
    return data


def fetch_ozone(city: str = "ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """Fetch O3 (Ozone) from Sentinel-5P TROPOMI. Monthly composites. mol/m²."""
    bbox = get_bbox(city)
    band = 'O3_column_number_density'
    base = (
        ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_O3')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select(band)
    )
    collection = _make_monthly_collection(base, band, start_date, end_date)
    data = _extract_timeseries(collection, bbox, band)
    for d in data:
        d["parameter"] = "O3"
    logger.info(f"Fetched {len(data)} O3 points for {city}")
    return data


def fetch_aerosol(city: str = "ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """Fetch UV Aerosol Index from Sentinel-5P TROPOMI. PM2.5/haze proxy. Monthly composites."""
    bbox = get_bbox(city)
    band = 'absorbing_aerosol_index'
    base = (
        ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_AER_AI')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select(band)
    )
    collection = _make_monthly_collection(base, band, start_date, end_date)
    data = _extract_timeseries(collection, bbox, band)
    for d in data:
        d["parameter"] = "AEROSOL"
    logger.info(f"Fetched {len(data)} aerosol index points for {city}")
    return data


# ── Land Use ───────────────────────────────────────────────────

def fetch_land_use(city: str = "ahmedabad", year: int = 2024) -> list[dict]:
    """Fetch land use classification from Landsat 8/9 NDVI thresholds."""
    bbox = get_bbox(city)
    collection = (
        ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
        .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
        .filterBounds(bbox)
        .filterDate(f'{year}-01-01', f'{year}-12-31')
        .filter(ee.Filter.lt('CLOUD_COVER', 20))
    )

    def add_ndvi(image):
        nir = image.select('SR_B5').multiply(0.0000275).add(-0.2)
        red = image.select('SR_B4').multiply(0.0000275).add(-0.2)
        ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
        return image.addBands(ndvi)

    composite = collection.map(add_ndvi).median()
    ndvi = composite.select('NDVI')
    classified = (
        ndvi.gt(0.4).multiply(3)
        .add(ndvi.gt(0.1).And(ndvi.lte(0.4)).multiply(2))
        .add(ndvi.gt(-0.1).And(ndvi.lte(0.1)).multiply(1))
    ).rename('land_class')

    data = _extract_timeseries(
        ee.ImageCollection([classified.set('system:time_start', ee.Date(f'{year}-06-15').millis())]),
        bbox, 'land_class', num_points=25,
    )

    class_labels = {0: "water", 1: "urban", 2: "sparse_vegetation", 3: "dense_vegetation"}
    for d in data:
        d["parameter"] = "LAND_USE"
        d["date"] = str(year)
        d["class_label"] = class_labels.get(int(d["value"]), "unknown")

    logger.info(f"Fetched {len(data)} land use points for {city} ({year})")
    return data


# ── Batch fetch ────────────────────────────────────────────────

# All available fetch functions mapped by parameter name
FETCH_FUNCTIONS = {
    "LST": ("lst_timeseries.json", fetch_lst),
    "NDVI": ("ndvi_timeseries.json", fetch_ndvi),
    "NO2": ("no2_timeseries.json", fetch_no2),
    "SO2": ("so2_timeseries.json", fetch_so2),
    "CO": ("co_timeseries.json", fetch_co),
    "O3": ("o3_timeseries.json", fetch_ozone),
    "AEROSOL": ("aerosol_timeseries.json", fetch_aerosol),
    "SOIL_MOISTURE": ("soil_moisture.json", fetch_soil_moisture),
}


def save_to_json(data: list[dict], filepath: str):
    """Save fetched data to JSON file."""
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
    logger.info(f"Saved {len(data)} points to {filepath}")

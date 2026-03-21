"""
Google Earth Engine (GEE) Integration.

Setup Instructions (Person 1 — do these steps):
1. Go to https://code.earthengine.google.com/ — sign in with Google
2. Go to https://console.cloud.google.com/
3. Create a new project (or use existing)
4. Enable "Earth Engine API" in APIs & Services
5. Go to IAM & Admin → Service Accounts → Create Service Account
6. Name it "gee-satellite-intel", grant "Earth Engine Resource Viewer" role
7. Create a JSON key → download it
8. Save as backend/gee_service_account.json
9. Register the service account at https://signup.earthengine.google.com/#!/service_accounts
10. Put the email in backend/.env as GEE_SERVICE_ACCOUNT_EMAIL
"""
import ee
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── City Configuration ────────────────────────────────────────
CITIES = {
    "Ahmedabad": {
        "bbox": [72.4, 22.9, 72.7, 23.2],
        "center": [23.0225, 72.5714],
        "state": "Gujarat",
    },
    "Delhi": {
        "bbox": [76.8, 28.4, 77.4, 28.9],
        "center": [28.6139, 77.2090],
        "state": "Delhi",
    },
    "Bengaluru": {
        "bbox": [77.4, 12.8, 77.8, 13.2],
        "center": [12.9716, 77.5946],
        "state": "Karnataka",
    },
}

_initialized = False


def init_gee(service_account_email: str = "", key_file: str = "gee_service_account.json"):
    """Initialize GEE. Call once at startup."""
    global _initialized
    if _initialized:
        return True

    # Try service account first (for backend deployment)
    if service_account_email and Path(key_file).exists():
        try:
            credentials = ee.ServiceAccountCredentials(service_account_email, key_file)
            ee.Initialize(credentials)
            _initialized = True
            logger.info("GEE initialized with service account")
            return True
        except Exception as e:
            logger.warning(f"Service account init failed: {e}")

    # Try default credentials (for local dev — run `earthengine authenticate` first)
    try:
        ee.Initialize()
        _initialized = True
        logger.info("GEE initialized with default credentials")
        return True
    except Exception as e:
        logger.error(f"GEE initialization failed: {e}")
        logger.error("Run 'earthengine authenticate' or set up a service account")
        return False


def get_bbox(city: str = "Ahmedabad") -> ee.Geometry:
    """Get the bounding box for a city as an EE Geometry."""
    cfg = CITIES.get(city, CITIES["Ahmedabad"])
    return ee.Geometry.Rectangle(cfg["bbox"])


def _extract_timeseries(collection, bbox, band_name, scale_factor=1.0, offset=0.0, num_points=10):
    """
    Extract time-series data from a GEE ImageCollection.
    Samples `num_points` locations within the bbox for each image date.
    Returns list of {date, lat, lng, value}.
    """
    # Create sample points across the bbox
    cfg_bbox = bbox.bounds().coordinates().getInfo()[0]
    min_lng, min_lat = cfg_bbox[0]
    max_lng, max_lat = cfg_bbox[2]

    import numpy as np
    np.random.seed(42)
    lats = np.linspace(min_lat + 0.01, max_lat - 0.01, int(np.sqrt(num_points)))
    lngs = np.linspace(min_lng + 0.01, max_lng - 0.01, int(np.sqrt(num_points)))
    sample_points = [(float(lat), float(lng)) for lat in lats for lng in lngs]

    # Get image dates
    image_list = collection.toList(collection.size())
    size = collection.size().getInfo()

    results = []
    for i in range(min(size, 50)):  # Cap at 50 images to avoid timeout
        try:
            image = ee.Image(image_list.get(i))
            date_ms = image.date().millis().getInfo()
            date_str = datetime.utcfromtimestamp(date_ms / 1000).strftime('%Y-%m-%d')

            for lat, lng in sample_points:
                point = ee.Geometry.Point([lng, lat])
                value = image.select(band_name).reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=point,
                    scale=1000,
                ).getInfo()

                val = value.get(band_name)
                if val is not None:
                    val = val * scale_factor + offset
                    results.append({
                        "date": date_str,
                        "lat": round(lat, 4),
                        "lng": round(lng, 4),
                        "value": round(val, 4),
                    })
        except Exception as e:
            logger.warning(f"Error extracting image {i}: {e}")
            continue

    return results


def fetch_lst(city: str = "Ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """
    Fetch Land Surface Temperature from MODIS Terra (MOD11A2).
    8-day composite, 1km resolution.
    Raw values: Kelvin * 0.02 → subtract 273.15 for Celsius.
    """
    bbox = get_bbox(city)
    collection = (
        ee.ImageCollection('MODIS/061/MOD11A2')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select('LST_Day_1km')
    )

    data = _extract_timeseries(
        collection, bbox,
        band_name='LST_Day_1km',
        scale_factor=0.02,  # DN to Kelvin
        offset=-273.15,     # Kelvin to Celsius
    )

    for d in data:
        d["parameter"] = "LST"

    logger.info(f"Fetched {len(data)} LST points for {city}")
    return data


def fetch_ndvi(city: str = "Ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """
    Fetch NDVI from MODIS (MOD13A2).
    16-day composite, 1km resolution.
    Raw values: multiply by 0.0001 for NDVI scale (0-1).
    """
    bbox = get_bbox(city)
    collection = (
        ee.ImageCollection('MODIS/061/MOD13A2')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select('NDVI')
    )

    data = _extract_timeseries(
        collection, bbox,
        band_name='NDVI',
        scale_factor=0.0001,
    )

    for d in data:
        d["parameter"] = "NDVI"

    logger.info(f"Fetched {len(data)} NDVI points for {city}")
    return data


def fetch_no2(city: str = "Ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> list[dict]:
    """
    Fetch NO2 from Sentinel-5P TROPOMI.
    Daily, ~7km resolution.
    Values: tropospheric NO2 column density in mol/m².
    """
    bbox = get_bbox(city)
    collection = (
        ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
        .filterBounds(bbox)
        .filterDate(start_date, end_date)
        .select('tropospheric_NO2_column_number_density')
    )

    # NO2 has daily data — sample monthly to avoid too many API calls
    collection = collection.filter(ee.Filter.calendarRange(1, 28, 'day_of_month'))

    data = _extract_timeseries(
        collection, bbox,
        band_name='tropospheric_NO2_column_number_density',
    )

    for d in data:
        d["parameter"] = "NO2"

    logger.info(f"Fetched {len(data)} NO2 points for {city}")
    return data


def fetch_land_use(city: str = "Ahmedabad", year: int = 2024) -> list[dict]:
    """
    Fetch land use classification from Landsat 8/9.
    Creates a median composite for the year, classifies by NDVI thresholds:
      NDVI > 0.4  → vegetation (value=3)
      NDVI > 0.1  → sparse/mixed (value=2)
      NDVI > -0.1 → urban/barren (value=1)
      NDVI <= -0.1 → water (value=0)
    """
    bbox = get_bbox(city)

    # Landsat 8/9 surface reflectance
    collection = (
        ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
        .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
        .filterBounds(bbox)
        .filterDate(f'{year}-01-01', f'{year}-12-31')
        .filter(ee.Filter.lt('CLOUD_COVER', 20))
    )

    # Compute NDVI from Landsat bands
    def add_ndvi(image):
        nir = image.select('SR_B5').multiply(0.0000275).add(-0.2)
        red = image.select('SR_B4').multiply(0.0000275).add(-0.2)
        ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
        return image.addBands(ndvi)

    composite = collection.map(add_ndvi).median()

    # Classify
    ndvi = composite.select('NDVI')
    classified = (
        ndvi.gt(0.4).multiply(3)         # vegetation
        .add(ndvi.gt(0.1).And(ndvi.lte(0.4)).multiply(2))  # sparse
        .add(ndvi.gt(-0.1).And(ndvi.lte(0.1)).multiply(1))  # urban
        # water = 0 (default)
    ).rename('land_class')

    # Sample the classified image
    data = _extract_timeseries(
        ee.ImageCollection([classified.set('system:time_start', ee.Date(f'{year}-06-15').millis())]),
        bbox,
        band_name='land_class',
        num_points=25,  # More points for land use
    )

    class_labels = {0: "water", 1: "urban", 2: "sparse_vegetation", 3: "dense_vegetation"}
    for d in data:
        d["parameter"] = "LAND_USE"
        d["date"] = str(year)
        d["class_label"] = class_labels.get(int(d["value"]), "unknown")

    logger.info(f"Fetched {len(data)} land use points for {city} ({year})")
    return data


def fetch_all(city: str = "Ahmedabad", start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> dict:
    """
    Fetch all satellite parameters for a city.
    Returns dict keyed by parameter name.
    """
    if not _initialized:
        if not init_gee():
            logger.error("GEE not initialized — cannot fetch data")
            return {}

    results = {}

    try:
        results["LST"] = fetch_lst(city, start_date, end_date)
    except Exception as e:
        logger.error(f"LST fetch failed: {e}")
        results["LST"] = []

    try:
        results["NDVI"] = fetch_ndvi(city, start_date, end_date)
    except Exception as e:
        logger.error(f"NDVI fetch failed: {e}")
        results["NDVI"] = []

    try:
        results["NO2"] = fetch_no2(city, start_date, end_date)
    except Exception as e:
        logger.error(f"NO2 fetch failed: {e}")
        results["NO2"] = []

    try:
        results["LAND_USE_2020"] = fetch_land_use(city, 2020)
        results["LAND_USE_2024"] = fetch_land_use(city, 2024)
    except Exception as e:
        logger.error(f"Land use fetch failed: {e}")

    return results


def save_to_json(data: list[dict], filepath: str):
    """Save fetched data to JSON file."""
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
    logger.info(f"Saved {len(data)} points to {filepath}")

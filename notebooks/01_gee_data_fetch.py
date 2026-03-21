"""
GEE Data Fetch — All Gujarat Cities
=====================================
Fetches real satellite + air quality data from Google Earth Engine
for all Gujarat cities and saves to data/<city>/.

Usage:
    python notebooks/01_gee_data_fetch.py
"""
import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.utils.gee_helpers import (
    init_gee, save_to_json, FETCH_FUNCTIONS,
    fetch_land_use,
)
from app.utils.cities import get_gujarat_cities, get_city

# ── Configuration ──────────────────────────────────────────────
START_DATE = "2020-01-01"
END_DATE = "2026-03-22"

SERVICE_ACCOUNT_EMAIL = "gee-service@prompted-it-all.iam.gserviceaccount.com"
KEY_FILE = os.path.join(os.path.dirname(__file__), '..', 'backend', 'gee_service_account.json')
PROJECT = "prompted-it-all"

DATA_ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')

# ── Initialize GEE ────────────────────────────────────────────
print("Initializing Google Earth Engine...")
success = init_gee(service_account_email=SERVICE_ACCOUNT_EMAIL, key_file=KEY_FILE, project=PROJECT)
if not success:
    print("ERROR: GEE initialization failed!")
    sys.exit(1)
print("GEE initialized successfully!\n")

# ── Fetch data for all Gujarat cities ─────────────────────────
cities = get_gujarat_cities()
print(f"Fetching data for {len(cities)} Gujarat cities: {', '.join(cities)}")
print(f"Parameters: {', '.join(FETCH_FUNCTIONS.keys())} + Land Use (2020, 2024)")
print(f"Date range: {START_DATE} to {END_DATE}")
print("=" * 60)

total_start = time.time()

for city_key in cities:
    city_cfg = get_city(city_key)
    city_name = city_cfg["name"]
    city_dir = os.path.join(DATA_ROOT, city_key)
    os.makedirs(city_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  {city_name} ({city_key})")
    print(f"{'='*60}")
    city_start = time.time()

    # Fetch all timeseries parameters
    for param, (filename, fetch_fn) in FETCH_FUNCTIONS.items():
        print(f"  [{param}] Fetching...", end=" ", flush=True)
        try:
            data = fetch_fn(city_key, START_DATE, END_DATE)
            filepath = os.path.join(city_dir, filename)
            save_to_json(data, filepath)
            print(f"{len(data)} points")
        except Exception as e:
            print(f"ERROR: {e}")

    # Fetch land use for 2020 and 2024
    for year in [2020, 2022, 2024, 2025]:
        print(f"  [LAND_USE_{year}] Fetching...", end=" ", flush=True)
        try:
            data = fetch_land_use(city_key, year)
            filepath = os.path.join(city_dir, f"land_use_{year}.json")
            save_to_json(data, filepath)
            print(f"{len(data)} points")
        except Exception as e:
            print(f"ERROR: {e}")

    elapsed = time.time() - city_start
    print(f"  >> {city_name} done in {elapsed:.0f}s")

total_elapsed = time.time() - total_start
print(f"\n{'='*60}")
print(f"ALL DONE — {len(cities)} cities in {total_elapsed:.0f}s")
print(f"Data saved to: {DATA_ROOT}")

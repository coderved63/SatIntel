"""
Notebook 01: Google Earth Engine Data Fetch
============================================
Run this to fetch REAL satellite data for Ahmedabad and save to data/ahmedabad/

Instructions:
1. pip install earthengine-api
2. Run: earthengine authenticate  (one-time, opens browser)
3. Run this script

OR if using service account:
1. Place gee_service_account.json in backend/
2. Set GEE_SERVICE_ACCOUNT_EMAIL in .env
"""
import sys
sys.path.insert(0, '../backend')

from app.utils.gee_helpers import init_gee, fetch_lst, fetch_ndvi, fetch_no2, fetch_land_use, save_to_json

# Step 1: Initialize GEE
print("Initializing Google Earth Engine...")
success = init_gee()
if not success:
    print("ERROR: GEE init failed. Run 'earthengine authenticate' first.")
    sys.exit(1)
print("GEE initialized successfully!")

city = "Ahmedabad"
start = "2023-01-01"
end = "2024-12-31"

# Step 2: Fetch LST
print(f"\n--- Fetching Land Surface Temperature ({city}) ---")
lst_data = fetch_lst(city, start, end)
print(f"Got {len(lst_data)} LST data points")
save_to_json(lst_data, f"../data/ahmedabad/lst_timeseries.json")

# Step 3: Fetch NDVI
print(f"\n--- Fetching Vegetation Index ({city}) ---")
ndvi_data = fetch_ndvi(city, start, end)
print(f"Got {len(ndvi_data)} NDVI data points")
save_to_json(ndvi_data, f"../data/ahmedabad/ndvi_timeseries.json")

# Step 4: Fetch NO2
print(f"\n--- Fetching Air Pollution NO2 ({city}) ---")
no2_data = fetch_no2(city, start, end)
print(f"Got {len(no2_data)} NO2 data points")
save_to_json(no2_data, f"../data/ahmedabad/no2_timeseries.json")

# Step 5: Fetch Land Use (2020 + 2024)
print(f"\n--- Fetching Land Use 2020 ({city}) ---")
lu_2020 = fetch_land_use(city, 2020)
print(f"Got {len(lu_2020)} land use points (2020)")
save_to_json(lu_2020, f"../data/ahmedabad/land_use_2020.json")

print(f"\n--- Fetching Land Use 2024 ({city}) ---")
lu_2024 = fetch_land_use(city, 2024)
print(f"Got {len(lu_2024)} land use points (2024)")
save_to_json(lu_2024, f"../data/ahmedabad/land_use_2024.json")

print("\n=== ALL DATA FETCHED SUCCESSFULLY ===")
print("Files saved to data/ahmedabad/")
print("You can now start the backend — it will use this real data.")

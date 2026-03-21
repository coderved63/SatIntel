"""Generate land use data for 2020 and 2024. Run from project root: python scripts/generate_land_use.py"""
import json
import random
import os

random.seed(42)

# Ahmedabad grid: 22.95-23.10 lat, 72.45-72.70 lng
lats = [round(22.95 + i * 0.015, 4) for i in range(11)]
lngs = [round(72.45 + j * 0.015, 4) for j in range(18)]

class_labels = {0: "water", 1: "urban", 2: "sparse_vegetation", 3: "dense_vegetation"}

def get_class_2020(lat, lng):
    if 72.56 < lng < 72.59 and 22.98 < lat < 23.08:
        return 0
    if 23.0 < lat < 23.06 and 72.53 < lng < 72.62:
        return 1
    if lat < 23.0 and lng > 72.60:
        return random.choice([1, 1, 2])
    if lng < 72.52:
        return random.choice([2, 3, 3, 3])
    if lat > 23.07:
        return random.choice([2, 3, 3])
    return random.choice([1, 2, 2, 3])

def get_class_2024(lat, lng):
    if 72.56 < lng < 72.59 and 22.98 < lat < 23.08:
        return 0
    if 23.0 < lat < 23.06 and 72.53 < lng < 72.62:
        return 1
    if lat < 23.0 and lng > 72.60:
        return random.choice([1, 1, 1, 2])
    if lng < 72.52:
        return random.choice([1, 1, 2, 3])
    if lat > 23.07:
        return random.choice([1, 2, 2, 3])
    if 72.49 < lng < 72.54 and 23.0 < lat < 23.06:
        return 1
    return random.choice([1, 1, 2, 3])

data_2020 = []
for lat in lats:
    for lng in lngs:
        cls = get_class_2020(lat, lng)
        data_2020.append({
            "date": "2020",
            "lat": lat + round(random.uniform(-0.003, 0.003), 4),
            "lng": lng + round(random.uniform(-0.003, 0.003), 4),
            "value": cls,
            "class_label": class_labels[cls],
            "parameter": "LAND_USE"
        })

random.seed(43)
data_2024 = []
for lat in lats:
    for lng in lngs:
        cls = get_class_2024(lat, lng)
        data_2024.append({
            "date": "2024",
            "lat": lat + round(random.uniform(-0.003, 0.003), 4),
            "lng": lng + round(random.uniform(-0.003, 0.003), 4),
            "value": cls,
            "class_label": class_labels[cls],
            "parameter": "LAND_USE"
        })

urban_2020 = sum(1 for d in data_2020 if d["value"] == 1)
urban_2024 = sum(1 for d in data_2024 if d["value"] == 1)
veg_2020 = sum(1 for d in data_2020 if d["value"] >= 2)
veg_2024 = sum(1 for d in data_2024 if d["value"] >= 2)

print(f"2020: {urban_2020} urban, {veg_2020} vegetation, {len(data_2020)} total")
print(f"2024: {urban_2024} urban, {veg_2024} vegetation, {len(data_2024)} total")
print(f"Urban increase: {urban_2024 - urban_2020} cells ({round((urban_2024-urban_2020)/len(data_2020)*100,1)}%)")

out_dir = os.path.join(os.path.dirname(__file__), "..", "data", "ahmedabad")
os.makedirs(out_dir, exist_ok=True)

with open(os.path.join(out_dir, "land_use_2020.json"), "w") as f:
    json.dump(data_2020, f, indent=2)
with open(os.path.join(out_dir, "land_use_2024.json"), "w") as f:
    json.dump(data_2024, f, indent=2)

print("Saved land_use_2020.json and land_use_2024.json")

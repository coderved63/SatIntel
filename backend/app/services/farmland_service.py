"""
Farmland Misuse Detection Service.
Identifies zones where agricultural land shows signs of conversion or abandonment.
Uses NDVI crop activity scoring to distinguish active farms from idle/converted land.
"""
import logging
import numpy as np
from collections import defaultdict
from app.services import satellite_service

logger = logging.getLogger(__name__)


def analyse(city: str = "Ahmedabad") -> dict:
    """Detect farmland misuse and abandonment."""
    ndvi_data = satellite_service._load_data("NDVI")
    if not ndvi_data:
        return {"city": city, "error": "No NDVI data available"}

    # Group NDVI by location
    location_ts = defaultdict(list)
    for d in ndvi_data:
        key = (round(d["lat"], 4), round(d["lng"], 4))
        location_ts[key].append((d["date"], d["value"]))

    # Score each location for crop activity
    try:
        from app.ml.lstm_predictor import LSTMPredictor
        predictor = LSTMPredictor(lookback=6)
    except:
        predictor = None

    zones = []
    suspicious = []
    for (lat, lng), ts in location_ts.items():
        ts_sorted = sorted(ts, key=lambda x: x[0])
        values = [v for _, v in ts_sorted]
        mean_ndvi = np.mean(values)
        std_ndvi = np.std(values)

        # Crop score
        if predictor:
            crop_score = predictor.crop_activity_score(ts_sorted)
        else:
            crop_score = min(std_ndvi / 0.15, 1.0) * 40 + min(mean_ndvi / 0.25, 1.0) * 30 + 15

        zone = {
            "lat": lat,
            "lng": lng,
            "mean_ndvi": round(float(mean_ndvi), 4),
            "std_ndvi": round(float(std_ndvi), 4),
            "crop_activity_score": round(crop_score, 1),
            "classification": "active_farmland" if crop_score > 50 else ("idle_land" if crop_score > 25 else "barren_or_converted"),
        }
        zones.append(zone)

        # Flag suspicious: was potentially farmland (some greenness) but low activity
        if mean_ndvi > 0.12 and crop_score < 30:
            zone["flag"] = "potential_misuse"
            suspicious.append(zone)

    # Cluster suspicious zones
    cluster_count = 0
    if len(suspicious) >= 3:
        from sklearn.cluster import DBSCAN
        coords = np.array([[z["lat"], z["lng"]] for z in suspicious])
        clustering = DBSCAN(eps=0.02, min_samples=2).fit(coords)
        cluster_count = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)

    return {
        "city": city,
        "total_zones_analyzed": len(zones),
        "total_suspicious_zones": len(suspicious),
        "total_suspicious_area_sqkm": round(len(suspicious) * 1.0, 1),
        "zones": sorted(zones, key=lambda z: z["crop_activity_score"]),
        "suspicious_zones": suspicious[:20],
        "cluster_count": cluster_count,
        "classifications": {
            "active_farmland": sum(1 for z in zones if z["classification"] == "active_farmland"),
            "idle_land": sum(1 for z in zones if z["classification"] == "idle_land"),
            "barren_or_converted": sum(1 for z in zones if z["classification"] == "barren_or_converted"),
        },
    }

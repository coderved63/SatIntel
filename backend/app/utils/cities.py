"""
City configurations for the satellite intelligence platform.
City-agnostic architecture — add any city by adding its config here.
"""

CITIES = {
    "ahmedabad": {
        "name": "Ahmedabad",
        "state": "Gujarat",
        "country": "India",
        "bbox": [72.4, 22.9, 72.7, 23.2],  # [min_lng, min_lat, max_lng, max_lat]
        "center": [23.0225, 72.5714],        # [lat, lng]
        "zoom": 11,
        "population": "8.6 million (metro)",
        "area_km2": 464,
        "climate": "Semi-arid (BSh)",
        "notable_areas": [
            "Sabarmati Riverfront",
            "Kankaria Lake",
            "Vatva Industrial Area",
            "Naroda GIDC",
            "SG Highway",
            "Bopal",
            "Maninagar",
        ],
    },
    "delhi": {
        "name": "Delhi",
        "state": "Delhi",
        "country": "India",
        "bbox": [76.8, 28.4, 77.4, 28.9],
        "center": [28.6139, 77.2090],
        "zoom": 11,
        "population": "32 million (metro)",
        "area_km2": 1484,
        "climate": "Semi-arid (BSh)",
        "notable_areas": ["Connaught Place", "Anand Vihar", "Dwarka", "Noida border"],
    },
    "bengaluru": {
        "name": "Bengaluru",
        "state": "Karnataka",
        "country": "India",
        "bbox": [77.4, 12.8, 77.8, 13.2],
        "center": [12.9716, 77.5946],
        "zoom": 11,
        "population": "13 million (metro)",
        "area_km2": 741,
        "climate": "Tropical savanna (Aw)",
        "notable_areas": ["Whitefield", "Electronic City", "Hebbal", "Bellandur Lake"],
    },
}


def get_city(city_key: str) -> dict:
    """Get city config by key (case-insensitive)."""
    return CITIES.get(city_key.lower(), CITIES["ahmedabad"])


def get_city_list() -> list[dict]:
    """Get list of all supported cities."""
    return [
        {"key": k, "name": v["name"], "state": v["state"], "center": v["center"]}
        for k, v in CITIES.items()
    ]


def get_bbox(city_key: str) -> list[float]:
    """Get bounding box [min_lng, min_lat, max_lng, max_lat]."""
    return get_city(city_key)["bbox"]

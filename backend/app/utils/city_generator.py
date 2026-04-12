"""
Dynamic City Data Generator — creates realistic satellite data for any city.
150+ cities with climate-accurate seasonal patterns.
"""
import json
import math
import os
import random
import logging
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
DATA_BASE = Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parent.parent.parent.parent / "data"))

WORLD_CITIES = {
    # INDIA
    "ahmedabad": {"name": "Ahmedabad", "bbox": [72.4, 22.9, 72.7, 23.2], "center": [23.02, 72.57], "climate": "semi_arid", "temp_range": [12, 48], "pollution": "high", "moisture": "dry", "ndvi_base": 0.25},
    "delhi": {"name": "Delhi", "bbox": [76.8, 28.4, 77.4, 28.9], "center": [28.61, 77.21], "climate": "semi_arid", "temp_range": [4, 47], "pollution": "very_high", "moisture": "dry", "ndvi_base": 0.22},
    "mumbai": {"name": "Mumbai", "bbox": [72.7, 18.85, 73.1, 19.3], "center": [19.08, 72.88], "climate": "tropical", "temp_range": [18, 38], "pollution": "high", "moisture": "wet", "ndvi_base": 0.35},
    "bangalore": {"name": "Bangalore", "bbox": [77.4, 12.8, 77.8, 13.2], "center": [12.97, 77.59], "climate": "tropical", "temp_range": [15, 38], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.40},
    "hyderabad": {"name": "Hyderabad", "bbox": [78.2, 17.2, 78.7, 17.6], "center": [17.39, 78.49], "climate": "semi_arid", "temp_range": [14, 43], "pollution": "high", "moisture": "dry", "ndvi_base": 0.28},
    "chennai": {"name": "Chennai", "bbox": [80.0, 12.85, 80.35, 13.25], "center": [13.08, 80.27], "climate": "tropical", "temp_range": [20, 42], "pollution": "high", "moisture": "wet", "ndvi_base": 0.30},
    "kolkata": {"name": "Kolkata", "bbox": [88.2, 22.4, 88.6, 22.7], "center": [22.57, 88.36], "climate": "tropical", "temp_range": [12, 42], "pollution": "very_high", "moisture": "wet", "ndvi_base": 0.32},
    "pune": {"name": "Pune", "bbox": [73.7, 18.4, 74.0, 18.65], "center": [18.52, 73.86], "climate": "semi_arid", "temp_range": [10, 40], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35},
    "jaipur": {"name": "Jaipur", "bbox": [75.6, 26.75, 76.0, 27.05], "center": [26.91, 75.79], "climate": "arid", "temp_range": [5, 47], "pollution": "high", "moisture": "dry", "ndvi_base": 0.18},
    "lucknow": {"name": "Lucknow", "bbox": [80.8, 26.75, 81.1, 27.0], "center": [26.85, 80.95], "climate": "subtropical", "temp_range": [6, 45], "pollution": "very_high", "moisture": "moderate", "ndvi_base": 0.30},
    "chandigarh": {"name": "Chandigarh", "bbox": [76.7, 30.65, 76.85, 30.8], "center": [30.73, 76.78], "climate": "subtropical", "temp_range": [4, 43], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.42},
    "bhopal": {"name": "Bhopal", "bbox": [77.3, 23.15, 77.55, 23.35], "center": [23.26, 77.41], "climate": "subtropical", "temp_range": [8, 45], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35},
    "indore": {"name": "Indore", "bbox": [75.7, 22.6, 76.0, 22.85], "center": [22.72, 75.86], "climate": "subtropical", "temp_range": [8, 44], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.30},
    "nagpur": {"name": "Nagpur", "bbox": [79.0, 21.05, 79.2, 21.25], "center": [21.15, 79.09], "climate": "semi_arid", "temp_range": [10, 48], "pollution": "high", "moisture": "dry", "ndvi_base": 0.28},
    "patna": {"name": "Patna", "bbox": [85.05, 25.55, 85.25, 25.7], "center": [25.61, 85.14], "climate": "subtropical", "temp_range": [8, 44], "pollution": "very_high", "moisture": "moderate", "ndvi_base": 0.32},
    "ranchi": {"name": "Ranchi", "bbox": [85.25, 23.3, 85.45, 23.45], "center": [23.36, 85.33], "climate": "subtropical", "temp_range": [6, 40], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.45},
    "guwahati": {"name": "Guwahati", "bbox": [91.6, 26.1, 91.85, 26.25], "center": [26.14, 91.74], "climate": "subtropical", "temp_range": [10, 38], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.50},
    "bhubaneswar": {"name": "Bhubaneswar", "bbox": [85.75, 20.2, 85.95, 20.4], "center": [20.30, 85.82], "climate": "tropical", "temp_range": [14, 43], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.38},
    "thiruvananthapuram": {"name": "Thiruvananthapuram", "bbox": [76.85, 8.4, 77.05, 8.6], "center": [8.52, 76.94], "climate": "tropical", "temp_range": [22, 35], "pollution": "low", "moisture": "wet", "ndvi_base": 0.55},
    "coimbatore": {"name": "Coimbatore", "bbox": [76.9, 10.9, 77.1, 11.1], "center": [11.0, 76.96], "climate": "semi_arid", "temp_range": [18, 38], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35},
    "visakhapatnam": {"name": "Visakhapatnam", "bbox": [83.2, 17.65, 83.4, 17.85], "center": [17.69, 83.30], "climate": "tropical", "temp_range": [18, 40], "pollution": "high", "moisture": "wet", "ndvi_base": 0.35},
    "kochi": {"name": "Kochi", "bbox": [76.2, 9.9, 76.4, 10.1], "center": [9.97, 76.28], "climate": "tropical", "temp_range": [23, 35], "pollution": "low", "moisture": "wet", "ndvi_base": 0.52},
    "varanasi": {"name": "Varanasi", "bbox": [82.9, 25.25, 83.1, 25.4], "center": [25.32, 83.01], "climate": "subtropical", "temp_range": [6, 46], "pollution": "very_high", "moisture": "moderate", "ndvi_base": 0.25},
    "agra": {"name": "Agra", "bbox": [77.9, 27.1, 78.1, 27.25], "center": [27.18, 78.02], "climate": "semi_arid", "temp_range": [4, 47], "pollution": "high", "moisture": "dry", "ndvi_base": 0.20},
    "amritsar": {"name": "Amritsar", "bbox": [74.8, 31.55, 74.95, 31.7], "center": [31.63, 74.87], "climate": "semi_arid", "temp_range": [2, 45], "pollution": "high", "moisture": "dry", "ndvi_base": 0.28},
    "kanpur": {"name": "Kanpur", "bbox": [80.25, 26.35, 80.45, 26.55], "center": [26.45, 80.35], "climate": "subtropical", "temp_range": [5, 46], "pollution": "very_high", "moisture": "moderate", "ndvi_base": 0.22},
    "dehradun": {"name": "Dehradun", "bbox": [77.95, 30.25, 78.15, 30.4], "center": [30.32, 78.03], "climate": "subtropical", "temp_range": [2, 38], "pollution": "low", "moisture": "wet", "ndvi_base": 0.55},
    "shimla": {"name": "Shimla", "bbox": [77.1, 31.05, 77.2, 31.15], "center": [31.10, 77.17], "climate": "temperate", "temp_range": [-4, 28], "pollution": "low", "moisture": "wet", "ndvi_base": 0.60},
    "mysore": {"name": "Mysore", "bbox": [76.55, 12.25, 76.75, 12.4], "center": [12.31, 76.66], "climate": "tropical", "temp_range": [16, 37], "pollution": "low", "moisture": "moderate", "ndvi_base": 0.42},
    "jodhpur": {"name": "Jodhpur", "bbox": [73.0, 26.2, 73.2, 26.4], "center": [26.29, 73.02], "climate": "arid", "temp_range": [5, 49], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.10},
    "udaipur": {"name": "Udaipur", "bbox": [73.6, 24.5, 73.8, 24.7], "center": [24.59, 73.71], "climate": "semi_arid", "temp_range": [6, 43], "pollution": "low", "moisture": "moderate", "ndvi_base": 0.30},
    "srinagar": {"name": "Srinagar", "bbox": [74.7, 34.0, 74.9, 34.2], "center": [34.08, 74.80], "climate": "temperate", "temp_range": [-6, 35], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.45},
    "goa": {"name": "Goa", "bbox": [73.75, 15.35, 73.95, 15.55], "center": [15.50, 73.83], "climate": "tropical", "temp_range": [20, 36], "pollution": "low", "moisture": "wet", "ndvi_base": 0.55},
    "madurai": {"name": "Madurai", "bbox": [78.05, 9.85, 78.25, 10.0], "center": [9.93, 78.12], "climate": "semi_arid", "temp_range": [20, 40], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.28},
    "raipur": {"name": "Raipur", "bbox": [81.55, 21.2, 81.75, 21.35], "center": [21.25, 81.63], "climate": "subtropical", "temp_range": [10, 46], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.30},
    # More Indian Municipal Corporations
    "allahabad": {"name": "Prayagraj", "bbox": [81.75, 25.35, 81.95, 25.5], "center": [25.43, 81.85], "climate": "subtropical", "temp_range": [6, 47], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.25},
    "meerut": {"name": "Meerut", "bbox": [77.65, 28.9, 77.85, 29.05], "center": [28.98, 77.71], "climate": "semi_arid", "temp_range": [4, 46], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.25},
    "nashik": {"name": "Nashik", "bbox": [73.7, 19.9, 73.9, 20.1], "center": [20.0, 73.79], "climate": "semi_arid", "temp_range": [10, 40], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.32},
    "thane": {"name": "Thane", "bbox": [72.9, 19.15, 73.1, 19.3], "center": [19.22, 72.97], "climate": "tropical", "temp_range": [18, 38], "pollution": "high", "moisture": "wet", "ndvi_base": 0.33},
    "navi_mumbai": {"name": "Navi Mumbai", "bbox": [73.0, 19.0, 73.15, 19.15], "center": [19.03, 73.04], "climate": "tropical", "temp_range": [18, 37], "pollution": "high", "moisture": "wet", "ndvi_base": 0.30},
    "solapur": {"name": "Solapur", "bbox": [75.85, 17.6, 76.05, 17.75], "center": [17.68, 75.91], "climate": "semi_arid", "temp_range": [12, 43], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.20},
    "hubli": {"name": "Hubli-Dharwad", "bbox": [75.05, 15.3, 75.25, 15.5], "center": [15.36, 75.12], "climate": "semi_arid", "temp_range": [14, 38], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.32},
    "belgaum": {"name": "Belagavi", "bbox": [74.45, 15.8, 74.65, 15.95], "center": [15.85, 74.50], "climate": "semi_arid", "temp_range": [12, 38], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35},
    "mangalore": {"name": "Mangalore", "bbox": [74.8, 12.8, 75.0, 13.0], "center": [12.87, 74.88], "climate": "tropical", "temp_range": [20, 37], "pollution": "low", "moisture": "wet", "ndvi_base": 0.50},
    "tiruchirappalli": {"name": "Tiruchirappalli", "bbox": [78.6, 10.75, 78.8, 10.9], "center": [10.79, 78.69], "climate": "tropical", "temp_range": [20, 40], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.28},
    "salem": {"name": "Salem", "bbox": [78.05, 11.6, 78.25, 11.75], "center": [11.66, 78.15], "climate": "semi_arid", "temp_range": [18, 39], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.30},
    "warangal": {"name": "Warangal", "bbox": [79.55, 17.9, 79.75, 18.05], "center": [17.98, 79.60], "climate": "semi_arid", "temp_range": [14, 43], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.30},
    "guntur": {"name": "Guntur", "bbox": [80.4, 16.25, 80.55, 16.4], "center": [16.31, 80.44], "climate": "tropical", "temp_range": [18, 43], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.28},
    "bikaner": {"name": "Bikaner", "bbox": [73.2, 27.95, 73.4, 28.15], "center": [28.02, 73.31], "climate": "arid", "temp_range": [2, 48], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.08},
    "ajmer": {"name": "Ajmer", "bbox": [74.55, 26.4, 74.75, 26.55], "center": [26.45, 74.64], "climate": "semi_arid", "temp_range": [5, 45], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.18},
    "kota": {"name": "Kota", "bbox": [75.8, 25.1, 76.0, 25.25], "center": [25.18, 75.86], "climate": "semi_arid", "temp_range": [6, 46], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.20},
    "jabalpur": {"name": "Jabalpur", "bbox": [79.9, 23.1, 80.1, 23.25], "center": [23.18, 79.95], "climate": "subtropical", "temp_range": [8, 45], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35},
    "gorakhpur": {"name": "Gorakhpur", "bbox": [83.35, 26.7, 83.55, 26.85], "center": [26.76, 83.37], "climate": "subtropical", "temp_range": [6, 44], "pollution": "high", "moisture": "wet", "ndvi_base": 0.35},
    "bareilly": {"name": "Bareilly", "bbox": [79.35, 28.3, 79.55, 28.45], "center": [28.37, 79.42], "climate": "subtropical", "temp_range": [5, 45], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.28},
    "aligarh": {"name": "Aligarh", "bbox": [78.0, 27.85, 78.15, 28.0], "center": [27.88, 78.08], "climate": "semi_arid", "temp_range": [4, 46], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.22},
    "moradabad": {"name": "Moradabad", "bbox": [78.7, 28.8, 78.9, 28.95], "center": [28.84, 78.78], "climate": "subtropical", "temp_range": [4, 45], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.25},
    "durgapur": {"name": "Durgapur", "bbox": [87.25, 23.45, 87.4, 23.6], "center": [23.55, 87.32], "climate": "tropical", "temp_range": [10, 42], "pollution": "high", "moisture": "wet", "ndvi_base": 0.35},
    "siliguri": {"name": "Siliguri", "bbox": [88.35, 26.7, 88.5, 26.8], "center": [26.73, 88.43], "climate": "subtropical", "temp_range": [8, 36], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.48},
    "jammu": {"name": "Jammu", "bbox": [74.8, 32.7, 74.95, 32.8], "center": [32.73, 74.87], "climate": "subtropical", "temp_range": [4, 42], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35},
    "cuttack": {"name": "Cuttack", "bbox": [85.85, 20.45, 86.0, 20.55], "center": [20.46, 85.88], "climate": "tropical", "temp_range": [14, 42], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.38},
    "tirupati": {"name": "Tirupati", "bbox": [79.35, 13.6, 79.5, 13.7], "center": [13.63, 79.42], "climate": "tropical", "temp_range": [18, 40], "pollution": "low", "moisture": "moderate", "ndvi_base": 0.35},
    "nellore": {"name": "Nellore", "bbox": [79.95, 14.4, 80.1, 14.5], "center": [14.44, 79.99], "climate": "tropical", "temp_range": [20, 42], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.28},
    "kolhapur": {"name": "Kolhapur", "bbox": [74.2, 16.65, 74.35, 16.75], "center": [16.70, 74.24], "climate": "semi_arid", "temp_range": [12, 38], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.38},
    "sangli": {"name": "Sangli", "bbox": [74.5, 16.8, 74.65, 16.95], "center": [16.85, 74.57], "climate": "semi_arid", "temp_range": [12, 40], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.30},
    "latur": {"name": "Latur", "bbox": [76.5, 18.35, 76.65, 18.5], "center": [18.40, 76.57], "climate": "semi_arid", "temp_range": [12, 42], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.22},
    "dhanbad": {"name": "Dhanbad", "bbox": [86.4, 23.75, 86.55, 23.85], "center": [23.79, 86.44], "climate": "subtropical", "temp_range": [8, 42], "pollution": "very_high", "moisture": "moderate", "ndvi_base": 0.30},
    "bokaro": {"name": "Bokaro", "bbox": [85.95, 23.65, 86.1, 23.75], "center": [23.67, 86.15], "climate": "subtropical", "temp_range": [8, 42], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.32},
    "bilaspur": {"name": "Bilaspur", "bbox": [82.1, 22.05, 82.25, 22.15], "center": [22.08, 82.16], "climate": "subtropical", "temp_range": [10, 45], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35},
    "imphal": {"name": "Imphal", "bbox": [93.9, 24.75, 94.05, 24.85], "center": [24.82, 93.95], "climate": "subtropical", "temp_range": [4, 32], "pollution": "low", "moisture": "wet", "ndvi_base": 0.55},
    "agartala": {"name": "Agartala", "bbox": [91.2, 23.8, 91.35, 23.9], "center": [23.83, 91.28], "climate": "tropical", "temp_range": [10, 36], "pollution": "low", "moisture": "wet", "ndvi_base": 0.50},
    "shillong": {"name": "Shillong", "bbox": [91.85, 25.55, 91.95, 25.6], "center": [25.57, 91.88], "climate": "subtropical", "temp_range": [2, 24], "pollution": "low", "moisture": "wet", "ndvi_base": 0.58},
    "gangtok": {"name": "Gangtok", "bbox": [88.6, 27.3, 88.7, 27.4], "center": [27.33, 88.62], "climate": "temperate", "temp_range": [-2, 22], "pollution": "low", "moisture": "wet", "ndvi_base": 0.60},
    "aizawl": {"name": "Aizawl", "bbox": [92.7, 23.7, 92.8, 23.8], "center": [23.73, 92.72], "climate": "subtropical", "temp_range": [8, 28], "pollution": "low", "moisture": "wet", "ndvi_base": 0.55},
    "pondicherry": {"name": "Pondicherry", "bbox": [79.8, 11.9, 79.9, 12.0], "center": [11.93, 79.83], "climate": "tropical", "temp_range": [22, 38], "pollution": "low", "moisture": "wet", "ndvi_base": 0.35},
    # Gujarat (real GEE data exists)
    "surat": {"name": "Surat", "bbox": [72.7, 21.1, 73.0, 21.3], "center": [21.17, 72.83], "climate": "tropical", "temp_range": [14, 42], "pollution": "high", "moisture": "wet", "ndvi_base": 0.30},
    "vadodara": {"name": "Vadodara", "bbox": [73.1, 22.2, 73.4, 22.4], "center": [22.31, 73.18], "climate": "semi_arid", "temp_range": [10, 44], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.28},
    "rajkot": {"name": "Rajkot", "bbox": [70.7, 22.2, 71.0, 22.4], "center": [22.30, 70.80], "climate": "semi_arid", "temp_range": [10, 44], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.22},
    "gandhinagar": {"name": "Gandhinagar", "bbox": [72.5, 23.1, 72.8, 23.3], "center": [23.22, 72.64], "climate": "semi_arid", "temp_range": [10, 45], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.30},
    # WORLD
    "tokyo": {"name": "Tokyo", "bbox": [139.5, 35.5, 140.0, 35.85], "center": [35.68, 139.69], "climate": "subtropical", "temp_range": [1, 35], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.35},
    "beijing": {"name": "Beijing", "bbox": [116.1, 39.7, 116.7, 40.1], "center": [39.90, 116.40], "climate": "continental", "temp_range": [-10, 38], "pollution": "very_high", "moisture": "dry", "ndvi_base": 0.20},
    "shanghai": {"name": "Shanghai", "bbox": [121.2, 31.0, 121.7, 31.5], "center": [31.23, 121.47], "climate": "subtropical", "temp_range": [1, 38], "pollution": "high", "moisture": "wet", "ndvi_base": 0.28},
    "seoul": {"name": "Seoul", "bbox": [126.8, 37.4, 127.2, 37.7], "center": [37.57, 126.98], "climate": "continental", "temp_range": [-10, 35], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.32},
    "singapore": {"name": "Singapore", "bbox": [103.6, 1.2, 104.0, 1.5], "center": [1.35, 103.82], "climate": "tropical", "temp_range": [24, 34], "pollution": "low", "moisture": "wet", "ndvi_base": 0.50},
    "bangkok": {"name": "Bangkok", "bbox": [100.3, 13.6, 100.8, 13.95], "center": [13.76, 100.50], "climate": "tropical", "temp_range": [22, 38], "pollution": "high", "moisture": "wet", "ndvi_base": 0.30},
    "dubai": {"name": "Dubai", "bbox": [55.1, 25.05, 55.5, 25.35], "center": [25.20, 55.27], "climate": "arid", "temp_range": [14, 50], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.05},
    "istanbul": {"name": "Istanbul", "bbox": [28.6, 40.8, 29.2, 41.2], "center": [41.01, 28.98], "climate": "subtropical", "temp_range": [2, 33], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.35},
    "london": {"name": "London", "bbox": [-0.5, 51.3, 0.3, 51.7], "center": [51.51, -0.13], "climate": "temperate", "temp_range": [0, 30], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.42},
    "paris": {"name": "Paris", "bbox": [2.2, 48.8, 2.5, 48.95], "center": [48.86, 2.35], "climate": "temperate", "temp_range": [0, 33], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.38},
    "berlin": {"name": "Berlin", "bbox": [13.1, 52.35, 13.6, 52.7], "center": [52.52, 13.41], "climate": "continental", "temp_range": [-5, 32], "pollution": "low", "moisture": "moderate", "ndvi_base": 0.40},
    "new_york": {"name": "New York", "bbox": [-74.25, 40.5, -73.7, 40.9], "center": [40.71, -74.01], "climate": "subtropical", "temp_range": [-5, 35], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35},
    "los_angeles": {"name": "Los Angeles", "bbox": [-118.7, 33.7, -118.1, 34.2], "center": [34.05, -118.24], "climate": "semi_arid", "temp_range": [8, 40], "pollution": "high", "moisture": "dry", "ndvi_base": 0.22},
    "sao_paulo": {"name": "Sao Paulo", "bbox": [-46.9, -23.8, -46.35, -23.35], "center": [-23.55, -46.63], "climate": "subtropical", "temp_range": [10, 32], "pollution": "high", "moisture": "wet", "ndvi_base": 0.38},
    "mexico_city": {"name": "Mexico City", "bbox": [-99.4, 19.2, -98.9, 19.6], "center": [19.43, -99.13], "climate": "subtropical", "temp_range": [5, 30], "pollution": "very_high", "moisture": "moderate", "ndvi_base": 0.30},
    "toronto": {"name": "Toronto", "bbox": [-79.65, 43.55, -79.15, 43.85], "center": [43.65, -79.38], "climate": "continental", "temp_range": [-15, 32], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.38},
    "cairo": {"name": "Cairo", "bbox": [31.1, 29.9, 31.5, 30.2], "center": [30.04, 31.24], "climate": "arid", "temp_range": [9, 42], "pollution": "very_high", "moisture": "dry", "ndvi_base": 0.08},
    "lagos": {"name": "Lagos", "bbox": [3.2, 6.35, 3.6, 6.65], "center": [6.52, 3.38], "climate": "tropical", "temp_range": [22, 35], "pollution": "very_high", "moisture": "wet", "ndvi_base": 0.30},
    "nairobi": {"name": "Nairobi", "bbox": [36.7, -1.4, 37.0, -1.15], "center": [-1.29, 36.82], "climate": "tropical", "temp_range": [10, 28], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.42},
    "cape_town": {"name": "Cape Town", "bbox": [18.3, -34.1, 18.7, -33.85], "center": [-33.93, 18.42], "climate": "semi_arid", "temp_range": [6, 30], "pollution": "low", "moisture": "moderate", "ndvi_base": 0.32},
    "sydney": {"name": "Sydney", "bbox": [150.95, -33.95, 151.35, -33.7], "center": [-33.87, 151.21], "climate": "subtropical", "temp_range": [8, 35], "pollution": "low", "moisture": "moderate", "ndvi_base": 0.38},
    "moscow": {"name": "Moscow", "bbox": [37.3, 55.6, 37.9, 55.9], "center": [55.76, 37.62], "climate": "continental", "temp_range": [-20, 30], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.35},
    "hong_kong": {"name": "Hong Kong", "bbox": [113.85, 22.2, 114.3, 22.55], "center": [22.40, 114.11], "climate": "subtropical", "temp_range": [12, 35], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.38},
    "jakarta": {"name": "Jakarta", "bbox": [106.65, -6.35, 107.0, -6.1], "center": [-6.21, 106.85], "climate": "tropical", "temp_range": [24, 35], "pollution": "very_high", "moisture": "wet", "ndvi_base": 0.25},
    "dhaka": {"name": "Dhaka", "bbox": [90.3, 23.65, 90.55, 23.9], "center": [23.81, 90.41], "climate": "tropical", "temp_range": [12, 40], "pollution": "very_high", "moisture": "wet", "ndvi_base": 0.28},
    "karachi": {"name": "Karachi", "bbox": [66.85, 24.8, 67.3, 25.1], "center": [24.86, 67.01], "climate": "arid", "temp_range": [12, 45], "pollution": "very_high", "moisture": "dry", "ndvi_base": 0.10},
    "riyadh": {"name": "Riyadh", "bbox": [46.5, 24.5, 47.0, 24.9], "center": [24.71, 46.68], "climate": "arid", "temp_range": [8, 50], "pollution": "high", "moisture": "dry", "ndvi_base": 0.04},
    "kuala_lumpur": {"name": "Kuala Lumpur", "bbox": [101.55, 3.05, 101.8, 3.25], "center": [3.14, 101.69], "climate": "tropical", "temp_range": [24, 35], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.45},
    "madrid": {"name": "Madrid", "bbox": [-3.85, 40.3, -3.55, 40.55], "center": [40.42, -3.70], "climate": "semi_arid", "temp_range": [0, 40], "pollution": "medium", "moisture": "dry", "ndvi_base": 0.25},
    "rome": {"name": "Rome", "bbox": [12.35, 41.8, 12.6, 42.0], "center": [41.90, 12.50], "climate": "subtropical", "temp_range": [3, 35], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35},
    "amsterdam": {"name": "Amsterdam", "bbox": [4.7, 52.3, 5.0, 52.45], "center": [52.37, 4.90], "climate": "temperate", "temp_range": [-2, 28], "pollution": "low", "moisture": "wet", "ndvi_base": 0.45},
    "buenos_aires": {"name": "Buenos Aires", "bbox": [-58.55, -34.7, -58.3, -34.5], "center": [-34.60, -58.38], "climate": "subtropical", "temp_range": [5, 35], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.32},
    "lima": {"name": "Lima", "bbox": [-77.2, -12.2, -76.8, -11.85], "center": [-12.05, -77.04], "climate": "arid", "temp_range": [14, 28], "pollution": "high", "moisture": "dry", "ndvi_base": 0.12},
    "melbourne": {"name": "Melbourne", "bbox": [144.7, -37.95, 145.2, -37.65], "center": [-37.81, 144.96], "climate": "temperate", "temp_range": [4, 35], "pollution": "low", "moisture": "moderate", "ndvi_base": 0.40},
    "athens": {"name": "Athens", "bbox": [23.6, 37.85, 23.85, 38.05], "center": [37.98, 23.73], "climate": "semi_arid", "temp_range": [5, 40], "pollution": "high", "moisture": "dry", "ndvi_base": 0.22},
    "barcelona": {"name": "Barcelona", "bbox": [2.05, 41.3, 2.3, 41.5], "center": [41.39, 2.17], "climate": "subtropical", "temp_range": [5, 33], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.30},
    "bogota": {"name": "Bogota", "bbox": [-74.2, 4.5, -73.95, 4.8], "center": [4.71, -74.07], "climate": "tropical", "temp_range": [8, 22], "pollution": "high", "moisture": "wet", "ndvi_base": 0.40},
    "santiago": {"name": "Santiago", "bbox": [-70.8, -33.6, -70.45, -33.35], "center": [-33.45, -70.67], "climate": "semi_arid", "temp_range": [2, 33], "pollution": "high", "moisture": "dry", "ndvi_base": 0.25},
    "chicago": {"name": "Chicago", "bbox": [-87.9, 41.65, -87.5, 42.0], "center": [41.88, -87.63], "climate": "continental", "temp_range": [-15, 35], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35},
    "johannesburg": {"name": "Johannesburg", "bbox": [27.9, -26.35, 28.2, -26.05], "center": [-26.20, 28.05], "climate": "subtropical", "temp_range": [2, 30], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.30},
}

_GEE_CITIES = {"ahmedabad","surat","vadodara","rajkot","bhavnagar","jamnagar","gandhinagar","junagadh","anand","morbi","mehsana","bharuch","navsari","vapi"}


def _seasonal_temp(month, climate, temp_range):
    low, high = temp_range
    mid = (low + high) / 2
    amp = (high - low) / 2
    if climate == "tropical":
        return mid + amp * 0.3 * math.sin((month - 4) * math.pi / 6)
    elif climate == "arid":
        return mid + amp * 0.9 * math.sin((month - 1) * math.pi / 6)
    else:
        return mid + amp * math.sin((month - 1) * math.pi / 6)


def _seasonal_ndvi(month, climate, ndvi_base):
    if climate == "tropical":
        return ndvi_base + 0.08 * math.sin((month - 9) * math.pi / 6)
    elif climate in ("continental", "temperate"):
        return ndvi_base + 0.15 * math.sin((month - 7) * math.pi / 6)
    elif climate == "arid":
        return ndvi_base + 0.03 * math.sin((month - 8) * math.pi / 6)
    else:
        return ndvi_base + 0.12 * math.sin((month - 8) * math.pi / 6)


def generate_city_data(city_key: str, force: bool = False) -> bool:
    city_key = city_key.lower().replace(" ", "_").replace("-", "_")
    city_dir = DATA_BASE / city_key
    if not force and city_dir.exists() and (city_dir / "lst_timeseries.json").exists():
        return False
    cfg = WORLD_CITIES.get(city_key)
    if not cfg:
        return False

    city_dir.mkdir(parents=True, exist_ok=True)
    bbox = cfg["bbox"]
    climate = cfg["climate"]
    temp_range = cfg["temp_range"]
    ndvi_base = cfg["ndvi_base"]
    pollution = cfg["pollution"]
    moisture = cfg["moisture"]

    lats = np.linspace(bbox[1] + 0.01, bbox[3] - 0.01, 3)
    lngs = np.linspace(bbox[0] + 0.01, bbox[2] - 0.01, 3)
    grid = [(round(float(lat), 4), round(float(lng), 4)) for lat in lats for lng in lngs]

    dates = []
    for year in [2023, 2024]:
        d = datetime(year, 1, 1)
        while d.year == year:
            dates.append(d.strftime("%Y-%m-%d"))
            d += timedelta(days=8)

    np.random.seed(hash(city_key) % (2**31))
    random.seed(hash(city_key) % (2**31))

    pol_base = {"low": 0.00003, "medium": 0.00006, "high": 0.00010, "very_high": 0.00014}[pollution]
    moist_base = {"dry": 0.08, "moderate": 0.18, "wet": 0.28}[moisture]

    def _gen(param, val_fn):
        data = []
        for dt in dates:
            m = int(dt.split("-")[1])
            for lat, lng in grid:
                v = val_fn(m, lat, lng)
                data.append({"date": dt, "lat": lat, "lng": lng, "value": round(float(v), 4), "parameter": param})
        return data

    center = cfg["center"]
    max_d = math.sqrt((bbox[3]-bbox[1])**2 + (bbox[2]-bbox[0])**2) / 2 or 0.1

    def _dist(lat, lng):
        return math.sqrt((lat - center[0])**2 + (lng - center[1])**2) / max_d

    # LST
    lst = _gen("LST", lambda m, la, lo: _seasonal_temp(m, climate, temp_range) + max(0, (1-_dist(la,lo))*4) + random.gauss(0, 1.5))
    _save(city_dir / "lst_timeseries.json", lst)

    # NDVI
    ndvi = _gen("NDVI", lambda m, la, lo: max(0.01, _seasonal_ndvi(m, climate, ndvi_base) - max(0, (1-_dist(la,lo))*0.12) + random.gauss(0, 0.03)))
    _save(city_dir / "ndvi_timeseries.json", ndvi)

    # NO2
    no2 = _gen("NO2", lambda m, la, lo: max(1e-6, pol_base*(1+0.5*math.cos((m-1)*math.pi/6)) + max(0,(1-_dist(la,lo))*pol_base*0.5) + random.gauss(0, pol_base*0.15)))
    _save(city_dir / "no2_timeseries.json", no2)

    # SO2
    so2_b = pol_base * 0.5
    so2 = _gen("SO2", lambda m, la, lo: max(1e-6, so2_b*(1+0.3*math.cos((m-1)*math.pi/6)) + random.gauss(0, so2_b*0.15)))
    _save(city_dir / "so2_timeseries.json", so2)

    # CO
    co_b = {"low": 0.02, "medium": 0.03, "high": 0.035, "very_high": 0.04}[pollution]
    co = _gen("CO", lambda m, la, lo: max(0.001, co_b*(1+0.2*math.cos((m-1)*math.pi/6)) + random.gauss(0, co_b*0.1)))
    _save(city_dir / "co_timeseries.json", co)

    # O3
    o3_b = 0.13
    o3 = _gen("O3", lambda m, la, lo: max(0.01, o3_b*(1+0.15*math.sin((m-4)*math.pi/6)) + random.gauss(0, o3_b*0.08)))
    _save(city_dir / "o3_timeseries.json", o3)

    # Aerosol
    aer_b = {"low": 0.5, "medium": 1.0, "high": 1.5, "very_high": 2.5}[pollution]
    aerosol = _gen("AEROSOL", lambda m, la, lo: max(0.01, aer_b*(1+0.4*math.cos((m-1)*math.pi/6)) + random.gauss(0, aer_b*0.15)))
    _save(city_dir / "aerosol_timeseries.json", aerosol)

    # Soil Moisture
    def _sm(m, la, lo):
        if climate in ("tropical", "subtropical"):
            return max(0.01, moist_base + 0.12*max(0, math.sin((m-5)*math.pi/4)) + random.gauss(0, 0.03))
        return max(0.01, moist_base + 0.08*math.sin((m-3)*math.pi/6) + random.gauss(0, 0.03))
    sm = _gen("SOIL_MOISTURE", _sm)
    _save(city_dir / "soil_moisture.json", sm)

    # Land Use
    lu_lats = np.linspace(bbox[1]+0.01, bbox[3]-0.01, 5)
    lu_lngs = np.linspace(bbox[0]+0.01, bbox[2]-0.01, 5)
    cls_map = {0: "water", 1: "urban", 2: "sparse_vegetation", 3: "dense_vegetation"}
    for year, urban_w in [("2020", [40,35,25]), ("2024", [60,25,15])]:
        lu = []
        for lat in lu_lats:
            for lng in lu_lngs:
                d = _dist(float(lat), float(lng))
                if d < 0.3:
                    c = random.choices([1,2,3], weights=urban_w)[0]
                elif d < 0.6:
                    c = random.choices([1,2,3], weights=[25,40,35])[0]
                else:
                    c = random.choices([0,2,3], weights=[5,30,65])[0]
                lu.append({"date": year, "lat": round(float(lat),4), "lng": round(float(lng),4), "value": float(c), "parameter": "LAND_USE", "class_label": cls_map[c]})
        _save(city_dir / f"land_use_{year}.json", lu)

    logger.info(f"Generated data for {cfg['name']}: {len(lst)} LST points")
    return True


def _save(path, data):
    with open(path, "w") as f:
        json.dump(data, f)


def get_available_cities():
    cities = []
    for key, cfg in WORLD_CITIES.items():
        city_dir = DATA_BASE / key
        has_data = city_dir.exists() and (city_dir / "lst_timeseries.json").exists()
        cities.append({
            "key": key, "name": cfg["name"], "center": cfg["center"],
            "bbox": cfg["bbox"], "has_data": has_data,
            "data_source": "gee" if key in _GEE_CITIES else "generated",
        })
    return sorted(cities, key=lambda c: (0 if c["data_source"] == "gee" else 1, c["name"]))


def _estimate_climate_from_lat(lat: float) -> dict:
    """Estimate climate profile from latitude alone — used for unknown cities."""
    abs_lat = abs(lat)
    if abs_lat < 10:
        return {"climate": "tropical", "temp_range": [22, 35], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.45}
    elif abs_lat < 23.5:
        return {"climate": "tropical", "temp_range": [18, 40], "pollution": "medium", "moisture": "moderate", "ndvi_base": 0.35}
    elif abs_lat < 35:
        return {"climate": "subtropical", "temp_range": [5, 42], "pollution": "high", "moisture": "moderate", "ndvi_base": 0.28}
    elif abs_lat < 50:
        return {"climate": "temperate", "temp_range": [-2, 32], "pollution": "medium", "moisture": "wet", "ndvi_base": 0.40}
    elif abs_lat < 60:
        return {"climate": "continental", "temp_range": [-10, 28], "pollution": "low", "moisture": "wet", "ndvi_base": 0.38}
    else:
        return {"climate": "continental", "temp_range": [-20, 20], "pollution": "low", "moisture": "wet", "ndvi_base": 0.25}


def generate_custom_city(name: str, lat: float, lng: float) -> bool:
    """Generate data for a completely custom city using lat/lng coordinates.
    Climate is estimated from latitude. Works for ANY city on Earth."""
    city_key = name.lower().replace(" ", "_").replace("-", "_")
    city_dir = DATA_BASE / city_key
    if city_dir.exists() and (city_dir / "lst_timeseries.json").exists():
        return False

    climate_est = _estimate_climate_from_lat(lat)
    # Create a temporary entry in WORLD_CITIES
    WORLD_CITIES[city_key] = {
        "name": name.title(),
        "bbox": [lng - 0.15, lat - 0.15, lng + 0.15, lat + 0.15],
        "center": [lat, lng],
        **climate_est,
    }
    return generate_city_data(city_key)


def ensure_city_data(city_key: str) -> bool:
    city_key = city_key.lower().replace(" ", "_").replace("-", "_")
    city_dir = DATA_BASE / city_key
    if city_dir.exists() and (city_dir / "lst_timeseries.json").exists():
        return True
    if city_key in WORLD_CITIES:
        return generate_city_data(city_key)
    return False

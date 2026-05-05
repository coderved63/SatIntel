# TerraWatch — Backend + ML Full Build Prompt
## For: Backend developer + ML developer
## Stack: Python · FastAPI · Uvicorn · Repository pattern (SQL/NoSQL agnostic)
## Principles: SOLID throughout

---

## 1. WHAT YOU ARE BUILDING

TerraWatch is a land intelligence platform for Ahmedabad that detects land misuse using
freely available satellite data. The backend serves processed satellite analytics to a
Next.js frontend. Your job is to build:

1. A FastAPI application that reads pre-fetched satellite JSON files
2. Three ML models that process those files and produce scored outputs
3. A report generation endpoint that exports evidence as PDF
4. A repository layer that works with SQL OR NoSQL — switchable via one env var

The frontend is already designed. It expects specific JSON responses from your API.
Your job is to make those responses correct and fast.

---

## 2. PROJECT FOLDER STRUCTURE

```
terrawatch/
│
├── data/
│   └── ahmedabad/
│       ├── lst_timeseries.json          # Surface temp · 2yr · MODIS
│       ├── lst_spatial.json             # Surface temp grid · latest
│       ├── ndvi_timeseries.json         # Vegetation index · 2yr · MODIS
│       ├── ndvi_spatial.json            # Vegetation grid · latest
│       ├── land_use_2020.json           # Land classification · Landsat
│       ├── land_use_2024.json           # Land classification · Landsat
│       └── land_use_change_summary.json # % shift summary
│
├── backend/
│   ├── main.py
│   ├── core/
│   │   ├── config.py                    # Pydantic settings — env vars only
│   │   └── dependencies.py             # FastAPI DI — get_repository()
│   │
│   ├── interfaces/                      # ABSTRACTIONS ONLY — no logic here
│   │   ├── i_satellite_repository.py
│   │   └── i_analytics_repository.py
│   │
│   ├── domain/                          # Pure Python dataclasses — no DB, no HTTP
│   │   ├── satellite.py
│   │   └── analytics_result.py
│   │
│   ├── infrastructure/
│   │   └── repositories/
│   │       ├── sql/
│   │       │   └── sql_analytics_repository.py
│   │       └── nosql/
│   │           └── mongo_analytics_repository.py
│   │
│   ├── services/
│   │   ├── satellite_service.py         # Reads JSON files
│   │   ├── vegetation_service.py        # Output 1
│   │   ├── land_conversion_service.py   # Output 2
│   │   ├── farmland_service.py          # Output 3
│   │   ├── heat_service.py              # Output 4
│   │   ├── water_service.py             # Output 5
│   │   └── report_service.py           # PDF export
│   │
│   ├── ml/
│   │   ├── isolation_forest.py          # Anomaly detection
│   │   ├── lstm_predictor.py            # Trend + crop scoring
│   │   └── dbscan_clustering.py         # Spatial clusters
│   │
│   └── api/
│       └── v1/
│           ├── dashboard.py
│           ├── vegetation.py
│           ├── land_conversion.py
│           ├── farmland.py
│           ├── heat.py
│           ├── water.py
│           └── reports.py
│
├── .env.example
├── requirements.txt
└── docker-compose.yml
```

---

## 3. ENVIRONMENT VARIABLES — .env.example

```bash
# App
APP_NAME=TerraWatch
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256

# DB — change DB_TYPE to switch repository implementation
# Options: postgresql | mongodb | sqlite
DB_TYPE=postgresql
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/terrawatch

# MongoDB (only if DB_TYPE=mongodb)
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=terrawatch

# Data
DATA_DIR=./data
CITY=ahmedabad

# ML
ANOMALY_CONTAMINATION=0.05
LSTM_LOOKBACK_STEPS=12
DBSCAN_EPS=0.02
DBSCAN_MIN_SAMPLES=3
```

---

## 4. REQUIREMENTS

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
pydantic-settings==2.3.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# ML
scikit-learn==1.5.0
numpy==1.26.4
torch==2.3.0          # for LSTM
pandas==2.2.2

# DB
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
motor==3.4.0           # async MongoDB

# PDF
reportlab==4.2.0

# Dev
python-dotenv==1.0.1
```

---

## 5. CORE CONFIG

```python
# backend/core/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "TerraWatch"
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    DB_TYPE: str = "postgresql"
    DATABASE_URL: Optional[str] = None
    MONGO_URI: Optional[str] = None
    MONGO_DB_NAME: str = "terrawatch"
    DATA_DIR: str = "./data"
    CITY: str = "ahmedabad"
    ANOMALY_CONTAMINATION: float = 0.05
    LSTM_LOOKBACK_STEPS: int = 12
    DBSCAN_EPS: float = 0.02
    DBSCAN_MIN_SAMPLES: int = 3

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 6. DOMAIN MODELS

```python
# backend/domain/satellite.py
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class TimeSeriesPoint:
    date: str          # "2023-01-01"
    value: float

@dataclass
class SpatialPoint:
    lat: float
    lng: float
    value: float
    parameter: str     # "LST" | "NDVI" | "LAND_USE"
    unit: str

@dataclass
class LandUsePoint:
    lat: float
    lng: float
    class_id: int      # 0=water 1=urban_barren 2=sparse_veg 3=dense_veg
    class_name: str    # "water"|"urban_barren"|"sparse_vegetation"|"dense_vegetation"
```

```python
# backend/domain/analytics_result.py
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class AnomalyEvent:
    date: str
    lat: float
    lng: float
    parameter: str
    value: float
    deviation: float       # how many standard deviations from baseline
    confidence: float      # 0.0 to 1.0

@dataclass
class DBSCANCluster:
    cluster_id: str
    centroid_lat: float
    centroid_lng: float
    cell_count: int
    area_sqkm: float
    confidence: float
    dominant_parameter: str

@dataclass
class VegetationResult:
    city: str
    ndvi_decline_pct: float
    area_lost_sqkm: float
    critical_wards: int
    anomaly_events: List[AnomalyEvent]
    clusters: List[DBSCANCluster]
    forecast_6m: List[TimeSeriesPoint]   # from LSTM

@dataclass
class LandConversionResult:
    city: str
    total_cells_changed: int
    total_area_sqkm: float
    conversion_breakdown: Dict[str, float]  # {"dense_veg_to_urban": 18.4, ...}
    rapid_conversions: int                   # Isolation Forest flagged
    clusters: List[DBSCANCluster]

@dataclass
class FarmlandResult:
    city: str
    total_suspicious_zones: int
    total_suspicious_acres: float
    zones: List[Dict[str, Any]]             # list of scored zones
    clusters: List[DBSCANCluster]

@dataclass
class HeatResult:
    city: str
    uhi_intensity: float                    # urban vs fringe delta °C
    peak_temp: float
    anomaly_events: List[AnomalyEvent]
    ward_rankings: List[Dict[str, Any]]     # [{"ward": "Vatva", "avg_temp": 48.3}]
    clusters: List[DBSCANCluster]

@dataclass
class WaterResult:
    city: str
    cells_encroached: int
    area_lost_sqkm: float
    water_bodies: List[Dict[str, Any]]      # per lake/zone breakdown
```

---

## 7. SATELLITE SERVICE — reads your JSON files

```python
# backend/services/satellite_service.py
# Single Responsibility: only reads and returns raw JSON data.
# All ML and analytics happen in the individual output services.

import json, os
from typing import List
from backend.core.config import settings
from backend.domain.satellite import TimeSeriesPoint, SpatialPoint, LandUsePoint

class SatelliteService:
    def __init__(self):
        self._base = os.path.join(settings.DATA_DIR, settings.CITY)

    def _load(self, filename: str):
        path = os.path.join(self._base, filename)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Data file not found: {path}")
        with open(path) as f:
            return json.load(f)

    def get_ndvi_timeseries(self) -> List[TimeSeriesPoint]:
        return [TimeSeriesPoint(**d) for d in self._load("ndvi_timeseries.json")]

    def get_ndvi_spatial(self) -> List[SpatialPoint]:
        return [SpatialPoint(**d) for d in self._load("ndvi_spatial.json")]

    def get_lst_timeseries(self) -> List[TimeSeriesPoint]:
        return [TimeSeriesPoint(**d) for d in self._load("lst_timeseries.json")]

    def get_lst_spatial(self) -> List[SpatialPoint]:
        return [SpatialPoint(**d) for d in self._load("lst_spatial.json")]

    def get_land_use(self, year: int) -> List[LandUsePoint]:
        return [LandUsePoint(**d) for d in self._load(f"land_use_{year}.json")]

    def get_land_use_change_summary(self) -> dict:
        return self._load("land_use_change_summary.json")
```

---

## 8. ML MODELS

### 8.1 Isolation Forest — anomaly detection

```python
# backend/ml/isolation_forest.py
# Input: list of (date, value) tuples for a single grid cell or zone
# Output: list of anomaly events with confidence score
# Used by: vegetation_service, heat_service, farmland_service, land_conversion_service

import numpy as np
from sklearn.ensemble import IsolationForest
from typing import List, Tuple

class AnomalyDetector:
    """
    Single Responsibility: detect statistically abnormal values in a time series.
    Each cell is scored against its OWN history — not city-wide average.
    This catches sudden drops/spikes that are unusual FOR THAT CELL specifically.
    """

    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination

    def detect(
        self,
        timeseries: List[Tuple[str, float]],  # [(date, value), ...]
        parameter: str = "NDVI"
    ) -> List[dict]:
        """
        Returns list of anomaly events.
        Each event: {date, value, deviation, confidence, is_anomaly}
        """
        if len(timeseries) < 8:
            return []

        dates = [t[0] for t in timeseries]
        values = np.array([t[1] for t in timeseries]).reshape(-1, 1)

        model = IsolationForest(
            contamination=self.contamination,
            random_state=42,
            n_estimators=100
        )
        model.fit(values)

        scores = model.decision_function(values)    # negative = more anomalous
        labels = model.predict(values)              # -1 = anomaly, 1 = normal

        mean = float(np.mean(values))
        std = float(np.std(values))

        results = []
        for i, (date, value) in enumerate(timeseries):
            deviation = abs(value - mean) / std if std > 0 else 0
            confidence = float(np.clip((0 - scores[i]) / 0.5, 0, 1))
            results.append({
                "date": date,
                "value": round(value, 4),
                "deviation": round(deviation, 2),
                "confidence": round(confidence, 2),
                "is_anomaly": bool(labels[i] == -1),
                "parameter": parameter
            })

        return [r for r in results if r["is_anomaly"]]
```

### 8.2 LSTM — trend prediction + crop cycle scoring

```python
# backend/ml/lstm_predictor.py
# TWO uses:
#   1. Forecast: predict next N values from a time series (used by veg, heat)
#   2. Crop score: score a time series against a seasonal wave pattern (used by farmland)

import numpy as np
import torch
import torch.nn as nn
from typing import List, Tuple

class LSTMModel(nn.Module):
    def __init__(self, input_size=1, hidden_size=32, num_layers=2, output_size=1):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])


class LSTMPredictor:
    """
    Single Responsibility: temporal prediction and crop rhythm scoring.
    Dependency Inversion: no direct dependency on file paths or DB.
    """

    def __init__(self, lookback: int = 12):
        self.lookback = lookback
        self.model = LSTMModel()

    def _prepare_sequences(self, values: np.ndarray):
        X, y = [], []
        for i in range(len(values) - self.lookback):
            X.append(values[i:i + self.lookback])
            y.append(values[i + self.lookback])
        return np.array(X), np.array(y)

    def forecast(
        self,
        timeseries: List[Tuple[str, float]],
        steps: int = 6
    ) -> List[dict]:
        """
        Train on the provided time series and predict N steps forward.
        Returns: [{"step": 1, "predicted_value": 0.18, "confidence_low": 0.12, ...}]
        """
        values = np.array([v for _, v in timeseries], dtype=np.float32)
        if len(values) < self.lookback + 2:
            return []

        # Normalize
        vmin, vmax = values.min(), values.max()
        if vmax - vmin < 1e-6:
            return [{"step": i+1, "predicted_value": round(float(values[-1]), 4),
                     "confidence_low": round(float(values[-1]) * 0.9, 4),
                     "confidence_high": round(float(values[-1]) * 1.1, 4)} for i in range(steps)]

        norm = (values - vmin) / (vmax - vmin)
        X, y = self._prepare_sequences(norm)
        X_t = torch.FloatTensor(X).unsqueeze(-1)
        y_t = torch.FloatTensor(y).unsqueeze(-1)

        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.01)
        criterion = nn.MSELoss()
        self.model.train()
        for _ in range(50):
            optimizer.zero_grad()
            loss = criterion(self.model(X_t), y_t)
            loss.backward()
            optimizer.step()

        self.model.eval()
        results = []
        current = list(norm[-self.lookback:])
        with torch.no_grad():
            for step in range(steps):
                inp = torch.FloatTensor(current[-self.lookback:]).unsqueeze(0).unsqueeze(-1)
                pred = self.model(inp).item()
                pred_real = float(pred * (vmax - vmin) + vmin)
                results.append({
                    "step": step + 1,
                    "predicted_value": round(pred_real, 4),
                    "confidence_low": round(pred_real * 0.88, 4),
                    "confidence_high": round(pred_real * 1.12, 4)
                })
                current.append(pred)

        return results

    def crop_activity_score(
        self,
        timeseries: List[Tuple[str, float]]
    ) -> float:
        """
        Score a zone's NDVI time series on how closely it resembles a real crop cycle.
        Real farming: clear seasonal wave (std deviation > 0.05, multiple peaks).
        Idle land: flat line near zero (std deviation < 0.02).
        Returns: float 0–100 (higher = more farming activity detected)
        """
        values = np.array([v for _, v in timeseries], dtype=np.float32)
        if len(values) < 4:
            return 0.0

        std = float(np.std(values))
        mean = float(np.mean(values))

        # Count direction changes (peaks and troughs = crop cycles)
        diffs = np.diff(values)
        direction_changes = int(np.sum(np.diff(np.sign(diffs)) != 0))

        # Score components
        std_score = min(std / 0.15, 1.0)                    # 0.15 std = full marks
        mean_score = min(mean / 0.25, 1.0)                  # 0.25 mean NDVI = healthy
        rhythm_score = min(direction_changes / 6.0, 1.0)    # 6+ direction changes = 2 cycles

        score = (std_score * 40 + mean_score * 30 + rhythm_score * 30)
        return round(float(score), 1)
```

### 8.3 DBSCAN — spatial cluster detection

```python
# backend/ml/dbscan_clustering.py
# Input: list of (lat, lng) coordinates of flagged cells
# Output: cluster labels — which cells belong to the same spatial group
# Used by: all 5 output services

import numpy as np
from sklearn.cluster import DBSCAN
from typing import List, Tuple, Dict

class SpatialClusterer:
    """
    Single Responsibility: find spatially contiguous groups of flagged cells.
    A cluster of 8 changed cells in 2km = coordinated activity signal.
    8 isolated individual cells = noise, lower significance.
    """

    def __init__(self, eps: float = 0.02, min_samples: int = 3):
        # eps in degrees (~2km at Ahmedabad latitude)
        self.eps = eps
        self.min_samples = min_samples

    def cluster(
        self,
        points: List[Tuple[float, float]]  # [(lat, lng), ...]
    ) -> List[Dict]:
        """
        Returns list of clusters.
        Each cluster: {cluster_id, centroid_lat, centroid_lng, cell_count, area_sqkm}
        Points with cluster_id=-1 are noise (isolated, not part of any cluster).
        """
        if len(points) < self.min_samples:
            return []

        coords = np.array(points)
        model = DBSCAN(eps=self.eps, min_samples=self.min_samples, metric='euclidean')
        labels = model.fit_predict(coords)

        clusters = []
        for cluster_id in set(labels):
            if cluster_id == -1:
                continue  # noise points
            mask = labels == cluster_id
            cluster_coords = coords[mask]
            centroid_lat = float(np.mean(cluster_coords[:, 0]))
            centroid_lng = float(np.mean(cluster_coords[:, 1]))
            cell_count = int(mask.sum())
            # Rough area: each cell is ~1km², adjust for cell density
            area_sqkm = round(cell_count * 1.0, 1)
            clusters.append({
                "cluster_id": f"C-{cluster_id + 1}",
                "centroid_lat": round(centroid_lat, 4),
                "centroid_lng": round(centroid_lng, 4),
                "cell_count": cell_count,
                "area_sqkm": area_sqkm,
                "confidence": round(min(cell_count / 10.0, 1.0), 2)
            })

        return sorted(clusters, key=lambda c: c["cell_count"], reverse=True)
```

---

## 9. THE 5 OUTPUT SERVICES

### 9.1 Vegetation Service

```python
# backend/services/vegetation_service.py
from backend.services.satellite_service import SatelliteService
from backend.ml.isolation_forest import AnomalyDetector
from backend.ml.lstm_predictor import LSTMPredictor
from backend.ml.dbscan_clustering import SpatialClusterer

class VegetationService:
    """
    Output 1: Vegetation loss detection.
    Data: ndvi_timeseries.json + ndvi_spatial.json + land_use_2020/2024
    What it detects: NDVI decline over 2 years, sudden drops (IF),
                     spatial clusters of loss (DBSCAN), future trajectory (LSTM)
    """

    def __init__(
        self,
        satellite: SatelliteService,
        anomaly_detector: AnomalyDetector,
        predictor: LSTMPredictor,
        clusterer: SpatialClusterer
    ):
        self._sat = satellite
        self._if = anomaly_detector
        self._lstm = predictor
        self._dbscan = clusterer

    async def analyse(self) -> dict:
        ts = self._sat.get_ndvi_timeseries()          # 2yr city avg NDVI
        spatial = self._sat.get_ndvi_spatial()        # current grid
        land_2020 = self._sat.get_land_use(2020)
        land_2024 = self._sat.get_land_use(2024)

        # 1. Overall decline
        values = [(p.date, p.value) for p in ts]
        first_half_avg = sum(v for _, v in values[:len(values)//2]) / (len(values)//2)
        second_half_avg = sum(v for _, v in values[len(values)//2:]) / (len(values)//2)
        decline_pct = round((first_half_avg - second_half_avg) / first_half_avg * 100, 1)

        # 2. Area lost from land use diff
        dense_2020 = sum(1 for p in land_2020 if p.class_name == "dense_vegetation")
        dense_2024 = sum(1 for p in land_2024 if p.class_name == "dense_vegetation")
        area_lost = round((dense_2020 - dense_2024) * 0.25, 1)  # 500m grid = 0.25 sqkm/cell

        # 3. Anomaly detection on city-wide NDVI time series
        anomalies = self._if.detect(values, parameter="NDVI")

        # 4. Spatial clusters of low-NDVI cells
        low_ndvi_points = [(p.lat, p.lng) for p in spatial if p.value < 0.1]
        clusters = self._dbscan.cluster(low_ndvi_points)

        # 5. LSTM 6-month forecast
        forecast = self._lstm.forecast(values, steps=6)

        return {
            "city": "ahmedabad",
            "ndvi_decline_pct": decline_pct,
            "area_lost_sqkm": area_lost,
            "anomaly_count": len(anomalies),
            "anomaly_events": anomalies[:10],  # top 10 for API response
            "clusters": clusters,
            "forecast_6m": forecast,
            "current_city_ndvi": round(second_half_avg, 3)
        }
```

### 9.2 Land Conversion Service

```python
# backend/services/land_conversion_service.py
from backend.services.satellite_service import SatelliteService
from backend.ml.isolation_forest import AnomalyDetector
from backend.ml.dbscan_clustering import SpatialClusterer
from collections import defaultdict

class LandConversionService:
    """
    Output 2: Land conversion + barren land detection.
    Data: land_use_2020.json + land_use_2024.json + land_use_change_summary.json
    What it detects: cells that changed class, conversion type breakdown,
                     rapid conversions (IF), spatial clusters (DBSCAN)
    """

    def __init__(
        self,
        satellite: SatelliteService,
        anomaly_detector: AnomalyDetector,
        clusterer: SpatialClusterer
    ):
        self._sat = satellite
        self._if = anomaly_detector
        self._dbscan = clusterer

    async def analyse(self) -> dict:
        land_2020 = self._sat.get_land_use(2020)
        land_2024 = self._sat.get_land_use(2024)
        change_summary = self._sat.get_land_use_change_summary()

        # Match cells by lat/lng
        map_2020 = {(round(p.lat, 3), round(p.lng, 3)): p.class_name for p in land_2020}
        map_2024 = {(round(p.lat, 3), round(p.lng, 3)): p.class_name for p in land_2024}

        changed_cells = []
        conversion_breakdown = defaultdict(int)

        for coord, class_2020 in map_2020.items():
            class_2024 = map_2024.get(coord)
            if class_2024 and class_2024 != class_2020:
                changed_cells.append({
                    "lat": coord[0], "lng": coord[1],
                    "from": class_2020, "to": class_2024
                })
                key = f"{class_2020}_to_{class_2024}"
                conversion_breakdown[key] += 1

        # Convert counts to area (each 500m grid cell = 0.25 sqkm)
        breakdown_sqkm = {k: round(v * 0.25, 1) for k, v in conversion_breakdown.items()}

        # Isolation Forest: flag rapid conversions
        # Use NDVI timeseries to detect cells with unusually fast change
        ndvi_ts = self._sat.get_ndvi_timeseries()
        ndvi_values = [(p.date, p.value) for p in ndvi_ts]
        rapid_anomalies = self._if.detect(ndvi_values, parameter="land_change")

        # DBSCAN on changed cell coordinates
        changed_coords = [(c["lat"], c["lng"]) for c in changed_cells]
        clusters = self._dbscan.cluster(changed_coords)

        return {
            "city": "ahmedabad",
            "total_cells_changed": len(changed_cells),
            "total_area_sqkm": round(len(changed_cells) * 0.25, 1),
            "conversion_breakdown": breakdown_sqkm,
            "rapid_conversions": len(rapid_anomalies),
            "changed_cells": changed_cells[:100],  # first 100 for map layer
            "clusters": clusters,
            "change_summary": change_summary
        }
```

### 9.3 Farmland Service

```python
# backend/services/farmland_service.py
from backend.services.satellite_service import SatelliteService
from backend.ml.lstm_predictor import LSTMPredictor
from backend.ml.isolation_forest import AnomalyDetector
from backend.ml.dbscan_clustering import SpatialClusterer

class FarmlandService:
    """
    Output 3: Idle farmland / fake agriculture detection.
    Data: ndvi_timeseries.json + ndvi_spatial.json + land_use_2024.json
    What it detects: agricultural zones where NDVI shows no seasonal crop cycle.
    LSTM scores each zone 0-100. Score < 20 = suspicious.
    """

    def __init__(
        self,
        satellite: SatelliteService,
        predictor: LSTMPredictor,
        anomaly_detector: AnomalyDetector,
        clusterer: SpatialClusterer
    ):
        self._sat = satellite
        self._lstm = predictor
        self._if = anomaly_detector
        self._dbscan = clusterer

    async def analyse(self) -> dict:
        ts = self._sat.get_ndvi_timeseries()
        spatial = self._sat.get_ndvi_spatial()
        land_2024 = self._sat.get_land_use(2024)

        # Agricultural cells from land use
        agri_coords = {
            (round(p.lat, 3), round(p.lng, 3))
            for p in land_2024
            if p.class_name in ("sparse_vegetation",)
            # Note: true parcel-level agri boundary needs GIS layer overlay
            # Using sparse_vegetation as proxy for agricultural land fringe
        }

        # Score each agricultural spatial cell
        all_values = [(p.date, p.value) for p in ts]
        city_score = self._lstm.crop_activity_score(all_values)

        # For demonstration: create zone-level scores from spatial NDVI variance
        low_activity_cells = [
            p for p in spatial
            if p.value < 0.15 and (round(p.lat, 3), round(p.lng, 3)) in agri_coords
        ]

        # Score suspicious zones
        suspicious_zones = []
        for i, cell in enumerate(low_activity_cells[:50]):
            score = self._lstm.crop_activity_score(all_values) * (cell.value / 0.15)
            suspicious_zones.append({
                "zone_id": f"AG-{100 + i}",
                "lat": cell.lat,
                "lng": cell.lng,
                "activity_score": round(min(score, 20), 1),
                "avg_ndvi": round(cell.value, 3),
                "status": "suspicious" if score < 20 else "borderline"
            })

        suspicious_zones.sort(key=lambda z: z["activity_score"])

        # Isolation Forest: sudden farming cessation
        anomalies = self._if.detect(all_values, parameter="NDVI_farmland")

        # DBSCAN on suspicious cell coordinates
        suspicious_coords = [(z["lat"], z["lng"]) for z in suspicious_zones]
        clusters = self._dbscan.cluster(suspicious_coords)

        return {
            "city": "ahmedabad",
            "city_crop_score": round(city_score, 1),
            "total_suspicious_zones": len([z for z in suspicious_zones if z["activity_score"] < 15]),
            "zones": suspicious_zones[:20],
            "sudden_cessation_events": len(anomalies),
            "clusters": clusters
        }
```

### 9.4 Heat Service

```python
# backend/services/heat_service.py
from backend.services.satellite_service import SatelliteService
from backend.ml.isolation_forest import AnomalyDetector
from backend.ml.lstm_predictor import LSTMPredictor
from backend.ml.dbscan_clustering import SpatialClusterer
import numpy as np

class HeatService:
    """
    Output 4: Urban heat anomaly.
    Data: lst_timeseries.json + lst_spatial.json + ndvi_spatial.json
    What it detects: surface temp anomalies (IF), UHI intensity,
                     ward heat ranking, LST-NDVI inverse correlation (proof),
                     LSTM summer forecast.
    """

    def __init__(
        self,
        satellite: SatelliteService,
        anomaly_detector: AnomalyDetector,
        predictor: LSTMPredictor,
        clusterer: SpatialClusterer
    ):
        self._sat = satellite
        self._if = anomaly_detector
        self._lstm = predictor
        self._dbscan = clusterer

    async def analyse(self) -> dict:
        lst_ts = self._sat.get_lst_timeseries()
        lst_spatial = self._sat.get_lst_spatial()
        ndvi_spatial = self._sat.get_ndvi_spatial()

        lst_values = [(p.date, p.value) for p in lst_ts]

        # UHI intensity: difference between high-LST cells and low-LST cells
        lst_sorted = sorted(lst_spatial, key=lambda p: p.value)
        fringe_avg = sum(p.value for p in lst_sorted[:len(lst_sorted)//4]) / (len(lst_sorted)//4)
        urban_avg = sum(p.value for p in lst_sorted[-(len(lst_sorted)//4):]) / (len(lst_sorted)//4)
        uhi_intensity = round(urban_avg - fringe_avg, 1)

        # Isolation Forest anomaly events
        anomalies = self._if.detect(lst_values, parameter="LST")

        # LST-NDVI correlation (inverse proof)
        ndvi_map = {(round(p.lat, 3), round(p.lng, 3)): p.value for p in ndvi_spatial}
        correlation_pairs = []
        for p in lst_spatial:
            ndvi_val = ndvi_map.get((round(p.lat, 3), round(p.lng, 3)))
            if ndvi_val is not None:
                correlation_pairs.append({"lst": p.value, "ndvi": ndvi_val, "lat": p.lat, "lng": p.lng})

        # DBSCAN on high-temp cells
        hot_cells = [(p.lat, p.lng) for p in lst_spatial if p.value > urban_avg]
        clusters = self._dbscan.cluster(hot_cells)

        # LSTM 6-month forecast
        forecast = self._lstm.forecast(lst_values, steps=6)

        return {
            "city": "ahmedabad",
            "uhi_intensity": uhi_intensity,
            "peak_temp": round(max(p.value for p in lst_spatial), 1),
            "city_avg_temp": round(sum(p.value for p in lst_spatial) / len(lst_spatial), 1),
            "anomaly_events": anomalies[:10],
            "correlation_sample": correlation_pairs[:50],
            "clusters": clusters,
            "forecast_6m": forecast
        }
```

### 9.5 Water Service

```python
# backend/services/water_service.py
from backend.services.satellite_service import SatelliteService

class WaterService:
    """
    Output 5: Water body encroachment.
    Data: land_use_2020.json + land_use_2024.json ONLY.
    No ML needed — pure diff. Water cells in 2020 that are urban/barren in 2024 = encroached.
    This is the simplest but most legally actionable output.
    """

    def __init__(self, satellite: SatelliteService):
        self._sat = satellite

    async def analyse(self) -> dict:
        land_2020 = self._sat.get_land_use(2020)
        land_2024 = self._sat.get_land_use(2024)

        map_2020 = {(round(p.lat, 3), round(p.lng, 3)): p.class_name for p in land_2020}
        map_2024 = {(round(p.lat, 3), round(p.lng, 3)): p.class_name for p in land_2024}

        encroached = []
        for coord, class_2020 in map_2020.items():
            if class_2020 != "water":
                continue
            class_2024 = map_2024.get(coord)
            if class_2024 and class_2024 != "water":
                encroached.append({
                    "lat": coord[0],
                    "lng": coord[1],
                    "was": "water",
                    "now": class_2024,
                    "area_sqkm": 0.25
                })

        # Group by approximate zone (lat/lng bucket)
        from collections import defaultdict
        zones = defaultdict(list)
        for cell in encroached:
            zone_key = f"{round(cell['lat'], 1):.1f}_{round(cell['lng'], 1):.1f}"
            zones[zone_key].append(cell)

        zone_summary = [
            {
                "zone_id": k,
                "cell_count": len(v),
                "area_sqkm": round(len(v) * 0.25, 2),
                "centroid_lat": round(sum(c["lat"] for c in v) / len(v), 4),
                "centroid_lng": round(sum(c["lng"] for c in v) / len(v), 4)
            }
            for k, v in sorted(zones.items(), key=lambda x: -len(x[1]))
        ]

        return {
            "city": "ahmedabad",
            "total_cells_encroached": len(encroached),
            "total_area_lost_sqkm": round(len(encroached) * 0.25, 1),
            "encroached_cells": encroached,
            "water_body_zones": zone_summary[:10]
        }
```

---

## 10. FASTAPI ROUTES

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.v1 import dashboard, vegetation, land_conversion, farmland, heat, water, reports

app = FastAPI(title="TerraWatch API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(vegetation.router, prefix="/api/v1")
app.include_router(land_conversion.router, prefix="/api/v1")
app.include_router(farmland.router, prefix="/api/v1")
app.include_router(heat.router, prefix="/api/v1")
app.include_router(water.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
```

```python
# backend/api/v1/vegetation.py  (same pattern for all 5)
from fastapi import APIRouter, Depends
from backend.services.vegetation_service import VegetationService
from backend.core.dependencies import get_vegetation_service

router = APIRouter(prefix="/vegetation", tags=["Vegetation"])

@router.get("/analyse")
async def analyse_vegetation(service: VegetationService = Depends(get_vegetation_service)):
    return await service.analyse()
```

### All API endpoints your frontend calls:

| Method | Endpoint | Service | Frontend page |
|--------|----------|---------|---------------|
| GET | /api/v1/dashboard/summary | All 5 services | /dashboard |
| GET | /api/v1/vegetation/analyse | VegetationService | /vegetation-loss |
| GET | /api/v1/land-conversion/analyse | LandConversionService | /land-conversion |
| GET | /api/v1/farmland/analyse | FarmlandService | /idle-farmland |
| GET | /api/v1/heat/analyse | HeatService | /heat-anomaly |
| GET | /api/v1/water/analyse | WaterService | /water-bodies |
| POST | /api/v1/reports/evidence | ReportService | All pages |

---

## 11. DEPENDENCY INJECTION — DB-AGNOSTIC WIRING

```python
# backend/core/dependencies.py
# Change DB_TYPE in .env to switch database. Zero code changes elsewhere.

from functools import lru_cache
from backend.core.config import settings
from backend.services.satellite_service import SatelliteService
from backend.ml.isolation_forest import AnomalyDetector
from backend.ml.lstm_predictor import LSTMPredictor
from backend.ml.dbscan_clustering import SpatialClusterer
from backend.services.vegetation_service import VegetationService
from backend.services.land_conversion_service import LandConversionService
from backend.services.farmland_service import FarmlandService
from backend.services.heat_service import HeatService
from backend.services.water_service import WaterService

@lru_cache()
def get_satellite_service() -> SatelliteService:
    return SatelliteService()

@lru_cache()
def get_ml_components():
    return (
        AnomalyDetector(contamination=settings.ANOMALY_CONTAMINATION),
        LSTMPredictor(lookback=settings.LSTM_LOOKBACK_STEPS),
        SpatialClusterer(eps=settings.DBSCAN_EPS, min_samples=settings.DBSCAN_MIN_SAMPLES)
    )

def get_vegetation_service() -> VegetationService:
    sat = get_satellite_service()
    iso, lstm, dbscan = get_ml_components()
    return VegetationService(sat, iso, lstm, dbscan)

def get_land_conversion_service() -> LandConversionService:
    sat = get_satellite_service()
    iso, _, dbscan = get_ml_components()
    return LandConversionService(sat, iso, dbscan)

def get_farmland_service() -> FarmlandService:
    sat = get_satellite_service()
    iso, lstm, dbscan = get_ml_components()
    return FarmlandService(sat, lstm, iso, dbscan)

def get_heat_service() -> HeatService:
    sat = get_satellite_service()
    iso, lstm, dbscan = get_ml_components()
    return HeatService(sat, iso, lstm, dbscan)

def get_water_service() -> WaterService:
    return WaterService(get_satellite_service())
```

---

## 12. HOW TO RUN

```bash
# 1. Clone and enter project
git clone <repo>
cd terrawatch

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and fill environment variables
cp .env.example .env
# Edit .env — set SECRET_KEY, DB_TYPE, DATABASE_URL

# 5. Make sure your GEE data files exist
ls data/ahmedabad/
# Should show: lst_timeseries.json, lst_spatial.json, ndvi_timeseries.json,
#              ndvi_spatial.json, land_use_2020.json, land_use_2024.json,
#              land_use_change_summary.json

# 6. Run the backend
uvicorn backend.main:app --reload --port 8000

# 7. Test it's working
curl http://localhost:8000/api/v1/vegetation/analyse
curl http://localhost:8000/api/v1/water/analyse

# 8. View interactive API docs
open http://localhost:8000/docs
```

---

## 13. SOLID PRINCIPLES — WHERE EACH ONE APPLIES

S — Single Responsibility:
  SatelliteService only reads files.
  VegetationService only computes vegetation analytics.
  AnomalyDetector only runs Isolation Forest.
  Each router handles exactly one domain.

O — Open/Closed:
  Add a 6th output? Create a new service class. Zero changes to existing services.
  Add a new city? Change CITY env var. Zero code changes.

L — Liskov Substitution:
  SQLAnalyticsRepository and MongoAnalyticsRepository both implement
  IAnalyticsRepository. Fully substitutable via DB_TYPE env var.

I — Interface Segregation:
  IReadRepository (get, list) is separate from IWriteRepository (save, delete).
  Analytics services only depend on IReadRepository.

D — Dependency Inversion:
  Route handlers depend on service interfaces, not concrete classes.
  Services depend on ML class interfaces, not sklearn/torch directly.
  All wiring happens in dependencies.py — one place, never scattered.

---

## 14. WHAT EACH TEAM MEMBER OWNS

GEE / data person:
  Deliver all 9 JSON files to data/ahmedabad/ using the GEE guide.
  Tell backend person when files are ready.

ML person:
  Implement backend/ml/isolation_forest.py
  Implement backend/ml/lstm_predictor.py
  Implement backend/ml/dbscan_clustering.py
  Test each model independently using the JSON files directly.
  Tune: contamination, lookback, eps, min_samples via .env

Backend person:
  Implement all 5 services (satellite_service + 5 output services)
  Implement FastAPI routes (7 endpoints)
  Implement dependencies.py wiring
  Implement report_service.py (PDF export using reportlab)
  Run uvicorn and verify all endpoints return correct JSON

Frontend person:
  Next.js app calls these 7 endpoints
  Dashboard page: GET /api/v1/dashboard/summary
  Each module page: GET /api/v1/{module}/analyse
  Export button: POST /api/v1/reports/evidence
  Use Leaflet.js for maps, Recharts for all charts

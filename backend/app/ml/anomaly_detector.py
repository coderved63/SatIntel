"""
Enhanced Anomaly Detector — Isolation Forest with confidence scores.
"""
import numpy as np
from sklearn.ensemble import IsolationForest
from typing import List, Tuple

class AnomalyDetector:
    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination

    def detect(self, timeseries: List[Tuple[str, float]], parameter: str = "NDVI") -> List[dict]:
        if len(timeseries) < 8:
            return []

        dates = [t[0] for t in timeseries]
        values = np.array([t[1] for t in timeseries]).reshape(-1, 1)

        model = IsolationForest(contamination=self.contamination, random_state=42, n_estimators=100)
        model.fit(values)

        scores = model.decision_function(values)
        labels = model.predict(values)

        mean = float(np.mean(values))
        std = float(np.std(values))

        results = []
        for i, (date, value) in enumerate(timeseries):
            if labels[i] == -1:
                deviation = abs(value - mean) / std if std > 0 else 0
                confidence = float(np.clip((0 - scores[i]) / 0.5, 0, 1))
                severity = "critical" if confidence > 0.7 else ("high" if confidence > 0.4 else "moderate")
                results.append({
                    "date": date,
                    "value": round(value, 4),
                    "deviation": round(deviation, 2),
                    "confidence": round(confidence, 2),
                    "severity": severity,
                    "anomaly_score": round(float(scores[i]), 4),
                    "parameter": parameter,
                })

        return sorted(results, key=lambda x: x["confidence"], reverse=True)

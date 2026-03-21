"""
Enhanced Spatial Clusterer — DBSCAN with area and confidence scoring.
"""
import numpy as np
from sklearn.cluster import DBSCAN
from typing import List, Tuple, Dict

class SpatialClusterer:
    def __init__(self, eps: float = 0.02, min_samples: int = 3):
        self.eps = eps
        self.min_samples = min_samples

    def cluster(self, points: List[Tuple[float, float]], values: List[float] = None) -> List[Dict]:
        if len(points) < self.min_samples:
            return []

        coords = np.array(points)
        model = DBSCAN(eps=self.eps, min_samples=self.min_samples, metric='euclidean')
        labels = model.fit_predict(coords)

        clusters = []
        for cluster_id in sorted(set(labels)):
            if cluster_id == -1:
                continue
            mask = labels == cluster_id
            cluster_coords = coords[mask]
            cell_count = int(mask.sum())
            centroid_lat = float(np.mean(cluster_coords[:, 0]))
            centroid_lng = float(np.mean(cluster_coords[:, 1]))
            area_sqkm = round(cell_count * 1.0, 1)
            confidence = round(min(cell_count / 10.0, 1.0), 2)

            avg_value = None
            if values is not None:
                vals_arr = np.array(values)
                avg_value = round(float(np.mean(vals_arr[mask])), 4)

            severity = "critical" if cell_count >= 8 else ("high" if cell_count >= 4 else "moderate")

            clusters.append({
                "cluster_id": f"C-{cluster_id + 1}",
                "centroid_lat": round(centroid_lat, 4),
                "centroid_lng": round(centroid_lng, 4),
                "cell_count": cell_count,
                "area_sqkm": area_sqkm,
                "confidence": confidence,
                "severity": severity,
                "avg_value": avg_value,
            })

        return sorted(clusters, key=lambda c: c["cell_count"], reverse=True)

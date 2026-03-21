"""
NDVI-LST Linear Regression — fits relationship between vegetation and temperature.
Uses the city's own satellite data to project cooling impact of tree planting.
"""
import numpy as np
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)


class NDVILSTRegression:
    def __init__(self):
        self.beta0: float = 0.0
        self.beta1: float = 0.0
        self.r_squared: float = 0.0
        self.is_fitted: bool = False

    def fit(self, pairs: List[Tuple[float, float]]) -> dict:
        if len(pairs) < 5:
            # Not enough data — use expected Ahmedabad estimate
            self.beta0 = 45.0
            self.beta1 = -12.0
            self.r_squared = 0.0
            self.is_fitted = True
            return {
                "beta0": self.beta0, "beta1": self.beta1,
                "r_squared": 0.0, "sample_size": len(pairs),
                "interpretation": "Insufficient matched cells — using estimated coefficients",
            }

        ndvi = np.array([p[0] for p in pairs])
        lst = np.array([p[1] for p in pairs])

        # Remove outliers
        if np.std(ndvi) > 0 and np.std(lst) > 0:
            ndvi_z = np.abs((ndvi - ndvi.mean()) / np.std(ndvi))
            lst_z = np.abs((lst - lst.mean()) / np.std(lst))
            mask = (ndvi_z < 3) & (lst_z < 3)
            ndvi, lst = ndvi[mask], lst[mask]

        # OLS: LST = beta0 + beta1 * NDVI
        A = np.vstack([np.ones_like(ndvi), ndvi]).T
        result = np.linalg.lstsq(A, lst, rcond=None)
        self.beta0, self.beta1 = float(result[0][0]), float(result[0][1])

        # R squared
        lst_pred = self.beta0 + self.beta1 * ndvi
        ss_res = float(np.sum((lst - lst_pred) ** 2))
        ss_tot = float(np.sum((lst - lst.mean()) ** 2))
        self.r_squared = round(1 - ss_res / ss_tot, 3) if ss_tot > 0 else 0.0
        self.is_fitted = True

        return {
            "beta0": round(self.beta0, 3),
            "beta1": round(self.beta1, 3),
            "r_squared": self.r_squared,
            "interpretation": (
                f"For every +0.1 increase in NDVI, surface temperature "
                f"decreases by {abs(self.beta1 * 0.1):.2f} degrees C"
            ),
            "sample_size": len(ndvi),
        }

    def project_cooling(self, current_ndvi: float, target_ndvi: float = 0.35) -> float:
        if not self.is_fitted:
            return 0.0
        ndvi_gain = max(0, target_ndvi - current_ndvi)
        return round(abs(self.beta1) * ndvi_gain, 2)

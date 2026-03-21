"""
LSTM Predictor — trend forecasting + crop activity scoring.
Uses PyTorch for sequence-to-one prediction.

Two uses:
  1. Forecast: predict next N values from a time series
  2. Crop score: score a time series against farming patterns (0-100)
"""
import numpy as np
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)

# Try PyTorch, fall back to numpy-based simple predictor
try:
    import torch
    import torch.nn as nn
    _HAS_TORCH = True
except ImportError:
    _HAS_TORCH = False
    logger.warning("PyTorch not installed — LSTM will use numpy fallback")


if _HAS_TORCH:
    class _LSTMModel(nn.Module):
        def __init__(self, input_size=1, hidden_size=32, num_layers=2, output_size=1):
            super().__init__()
            self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
            self.fc = nn.Linear(hidden_size, output_size)

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.fc(out[:, -1, :])


class LSTMPredictor:
    """
    Temporal prediction and crop rhythm scoring.
    Falls back to exponential smoothing if PyTorch is not installed.
    """

    def __init__(self, lookback: int = 12):
        self.lookback = lookback
        if _HAS_TORCH:
            self.model = _LSTMModel()

    def _prepare_sequences(self, values: np.ndarray):
        X, y = [], []
        for i in range(len(values) - self.lookback):
            X.append(values[i:i + self.lookback])
            y.append(values[i + self.lookback])
        return np.array(X), np.array(y)

    def forecast(self, timeseries: List[Tuple[str, float]], steps: int = 6) -> List[dict]:
        """
        Train on provided time series and predict N steps forward.
        Returns: [{"step": 1, "predicted_value": 0.18, "confidence_low": ..., "confidence_high": ...}]
        """
        values = np.array([v for _, v in timeseries], dtype=np.float32)
        if len(values) < self.lookback + 2:
            return [{"step": i + 1, "predicted_value": round(float(values[-1]), 4),
                     "confidence_low": round(float(values[-1]) * 0.9, 4),
                     "confidence_high": round(float(values[-1]) * 1.1, 4)} for i in range(steps)]

        vmin, vmax = values.min(), values.max()
        if vmax - vmin < 1e-6:
            return [{"step": i + 1, "predicted_value": round(float(values[-1]), 4),
                     "confidence_low": round(float(values[-1]) * 0.9, 4),
                     "confidence_high": round(float(values[-1]) * 1.1, 4)} for i in range(steps)]

        norm = (values - vmin) / (vmax - vmin)

        if _HAS_TORCH:
            return self._forecast_torch(norm, vmin, vmax, steps)
        else:
            return self._forecast_numpy(values, steps)

    def _forecast_torch(self, norm, vmin, vmax, steps):
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
                std_est = abs(pred_real) * 0.12
                results.append({
                    "step": step + 1,
                    "predicted_value": round(pred_real, 4),
                    "confidence_low": round(pred_real - std_est, 4),
                    "confidence_high": round(pred_real + std_est, 4),
                })
                current.append(pred)

        return results

    def _forecast_numpy(self, values, steps):
        """Exponential smoothing fallback when PyTorch not available."""
        alpha = 0.3
        result = float(values[-1])
        results = []
        for step in range(steps):
            result = alpha * float(values[-(step + 1) % len(values)]) + (1 - alpha) * result
            std_est = abs(result) * 0.12
            results.append({
                "step": step + 1,
                "predicted_value": round(result, 4),
                "confidence_low": round(result - std_est, 4),
                "confidence_high": round(result + std_est, 4),
            })
        return results

    def crop_activity_score(self, timeseries: List[Tuple[str, float]]) -> float:
        """
        Score how closely a zone's NDVI resembles a real crop cycle.
        Real farming: clear seasonal wave (std > 0.05, multiple peaks).
        Idle land: flat near zero (std < 0.02).
        Returns: 0-100 (higher = more farming activity).
        """
        values = np.array([v for _, v in timeseries], dtype=np.float32)
        if len(values) < 4:
            return 0.0

        std = float(np.std(values))
        mean = float(np.mean(values))

        diffs = np.diff(values)
        direction_changes = int(np.sum(np.diff(np.sign(diffs)) != 0))

        std_score = min(std / 0.15, 1.0)
        mean_score = min(mean / 0.25, 1.0)
        rhythm_score = min(direction_changes / 6.0, 1.0)

        score = std_score * 40 + mean_score * 30 + rhythm_score * 30
        return round(float(score), 1)

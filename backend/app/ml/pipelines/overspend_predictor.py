"""
Overspending probability predictor.
Uses a simple regression model on mid-month spending velocity.
Falls back to heuristic when no model is trained.
"""
from datetime import datetime
from typing import Optional
import pickle
from pathlib import Path

import numpy as np

MODEL_DIR = Path(__file__).parent.parent / "models"


def _heuristic_predict(
    daily_avg_spend: float,
    days_elapsed: int,
    days_in_month: int,
    budget: float,
    spent_so_far: float,
) -> float:
    """
    Linear extrapolation: project full-month spend and compute probability.
    """
    if days_elapsed == 0:
        return 0.0
    projected = (spent_so_far / days_elapsed) * days_in_month
    if projected <= budget:
        return max(0.0, (projected / budget - 0.7) * 3.33)
    else:
        overshoot_ratio = projected / budget
        return min(1.0, 0.5 + (overshoot_ratio - 1.0))


class OverspendPredictor:
    def __init__(self):
        self._model = None
        self._load_model()

    def _load_model(self):
        path = MODEL_DIR / "overspend_model.pkl"
        if path.exists():
            with open(path, "rb") as f:
                self._model = pickle.load(f)

    def predict(
        self,
        spent_so_far: float,
        budget: float,
        days_elapsed: int,
        days_in_month: int = 30,
        category_breakdown: Optional[dict] = None,
    ) -> dict:
        """
        Returns:
          probability: float [0,1]
          projected_spend: float
          risk_level: str
          top_risk_categories: list
        """
        daily_avg = spent_so_far / max(days_elapsed, 1)
        projected = daily_avg * days_in_month

        features = [
            spent_so_far,
            budget,
            days_elapsed,
            days_in_month,
            daily_avg,
            projected / max(budget, 1),
            spent_so_far / max(budget, 1),
        ]

        if self._model:
            try:
                prob = float(self._model.predict_proba([features])[0][1])
            except Exception:
                prob = _heuristic_predict(daily_avg, days_elapsed, days_in_month, budget, spent_so_far)
        else:
            prob = _heuristic_predict(daily_avg, days_elapsed, days_in_month, budget, spent_so_far)

        if prob < 0.3:
            risk_level = "low"
        elif prob < 0.6:
            risk_level = "medium"
        elif prob < 0.8:
            risk_level = "high"
        else:
            risk_level = "critical"

        top_risk = []
        if category_breakdown:
            sorted_cats = sorted(category_breakdown.items(), key=lambda x: x[1], reverse=True)
            top_risk = [{"category": k, "spent": v} for k, v in sorted_cats[:3]]

        return {
            "probability": round(prob, 3),
            "projected_spend": round(projected, 2),
            "budget": budget,
            "risk_level": risk_level,
            "top_risk_categories": top_risk,
        }

    def train(self, X: list[list], y: list[int]):
        """Train binary classifier (0=no overspend, 1=overspend)."""
        from sklearn.ensemble import GradientBoostingClassifier
        model = GradientBoostingClassifier(n_estimators=100, max_depth=4)
        model.fit(X, y)
        self._model = model
        MODEL_DIR.mkdir(exist_ok=True)
        with open(MODEL_DIR / "overspend_model.pkl", "wb") as f:
            pickle.dump(model, f)


_predictor: Optional[OverspendPredictor] = None


def get_predictor() -> OverspendPredictor:
    global _predictor
    if _predictor is None:
        _predictor = OverspendPredictor()
    return _predictor

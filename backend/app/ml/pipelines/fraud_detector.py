"""
Anomaly-based fraud detection using Isolation Forest.
Detects unusual transaction amounts, timing, and velocity.
"""
import pickle
from pathlib import Path
from typing import Optional
import numpy as np

MODEL_DIR = Path(__file__).parent.parent / "models"


def _extract_features(transactions: list[dict]) -> np.ndarray:
    """
    Features per transaction:
    - amount
    - hour of day
    - day of week
    - is_weekend
    - z_score of amount vs user history
    - txn velocity (count in last hour)
    """
    amounts = [t["amount"] for t in transactions]
    mean_amt = np.mean(amounts) if amounts else 1
    std_amt = np.std(amounts) if amounts else 1

    features = []
    for t in transactions:
        dt = t.get("transacted_at")
        hour = dt.hour if dt else 12
        dow = dt.weekday() if dt else 0
        is_weekend = 1 if dow >= 5 else 0
        z = (t["amount"] - mean_amt) / max(std_amt, 1)
        features.append([t["amount"], hour, dow, is_weekend, z])

    return np.array(features)


class FraudDetector:
    def __init__(self):
        self._model = None
        self._load_model()

    def _load_model(self):
        path = MODEL_DIR / "fraud_model.pkl"
        if path.exists():
            with open(path, "rb") as f:
                self._model = pickle.load(f)

    def score(self, transaction: dict, user_history: list[dict]) -> tuple[float, bool]:
        """
        Returns (anomaly_score [0,1], is_fraud_flagged).
        Isolation Forest returns -1 for anomalies; we map to [0,1].
        """
        all_txns = user_history + [transaction]
        features = _extract_features(all_txns)

        if self._model and len(features) >= 5:
            scores = self._model.score_samples(features)
            raw = scores[-1]  # score for the new transaction
            # Isolation Forest: more negative = more anomalous
            # Typical range: -0.5 to 0.0 → map to [0,1]
            normalized = max(0.0, min(1.0, (-raw - 0.1) * 3))
        else:
            # Heuristic: flag if amount > 3 std deviations
            amounts = [t["amount"] for t in user_history]
            if not amounts:
                return 0.1, False
            mean_a = np.mean(amounts)
            std_a = np.std(amounts)
            z = abs(transaction["amount"] - mean_a) / max(std_a, 1)
            normalized = min(1.0, z / 5)

        is_flagged = normalized > 0.7
        return round(normalized, 3), is_flagged

    def fit(self, transactions: list[dict]):
        """Train on user's normal transaction history."""
        from sklearn.ensemble import IsolationForest
        if len(transactions) < 20:
            return

        features = _extract_features(transactions)
        model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        model.fit(features)
        self._model = model
        MODEL_DIR.mkdir(exist_ok=True)
        with open(MODEL_DIR / "fraud_model.pkl", "wb") as f:
            pickle.dump(model, f)


_detector: Optional[FraudDetector] = None


def get_detector() -> FraudDetector:
    global _detector
    if _detector is None:
        _detector = FraudDetector()
    return _detector

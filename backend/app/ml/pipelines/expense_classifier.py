"""
Expense category classifier using TF-IDF + XGBoost.
Falls back to rule-based classification when model is not trained.
"""
import re
import pickle
import os
from pathlib import Path
from typing import Optional

import numpy as np

MODEL_DIR = Path(__file__).parent.parent / "models"

# Rule-based keyword mapping (used as fallback + training seed)
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "food": [
        "swiggy", "zomato", "dominos", "pizza", "mcdonald", "kfc", "burger king",
        "subway", "biryani", "restaurant", "hotel", "cafe", "coffee", "tea",
        "grocery", "bigbasket", "blinkit", "zepto", "dunzo", "milk",
    ],
    "travel": [
        "uber", "ola", "rapido", "irctc", "makemytrip", "goibibo", "yatra",
        "indigo", "air india", "spicejet", "metro", "bus", "auto", "taxi",
        "petrol", "diesel", "fuel", "toll", "fastag",
    ],
    "bills": [
        "electricity", "bescom", "msedcl", "tata power", "reliance energy",
        "water", "gas", "airtel", "jio", "vi ", "vodafone", "bsnl",
        "internet", "broadband", "recharge", "postpaid", "prepaid",
    ],
    "emi": [
        "emi", "loan", "bajaj finserv", "hdfc bank", "icici bank", "sbi",
        "axis bank", "kotak", "iifl", "piramal", "muthoot",
    ],
    "shopping": [
        "amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho",
        "snapdeal", "tata cliq", "reliance digital", "croma", "vijay sales",
    ],
    "entertainment": [
        "netflix", "hotstar", "disney", "amazon prime", "youtube", "spotify",
        "gaana", "jiocinema", "zee5", "sony liv", "bookmyshow", "pvr", "inox",
    ],
    "health": [
        "pharmeasy", "netmeds", "1mg", "apollo", "practo", "medicinecart",
        "hospital", "clinic", "doctor", "medicine", "pharmacy", "lab",
    ],
    "education": [
        "byju", "unacademy", "vedantu", "coursera", "udemy", "college",
        "university", "school", "tuition", "coaching",
    ],
    "salary": [
        "salary", "sal cr", "payroll", "stipend", "wages",
    ],
    "investment": [
        "zerodha", "groww", "upstox", "coin", "mutual fund", "sip",
        "nps", "ppf", "fd ", "fixed deposit", "stocks", "demat",
    ],
    "transfer": [
        "upi", "neft", "rtgs", "imps", "transfer", "sent to", "received from",
    ],
    "atm": [
        "atm", "cash withdrawal", "cash deposit",
    ],
}


def rule_based_classify(text: str) -> tuple[str, float]:
    """Fast rule-based classification with confidence score."""
    text_lower = text.lower()
    scores: dict[str, int] = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits:
            scores[category] = hits

    if not scores:
        return "other", 0.4

    best = max(scores, key=scores.get)
    confidence = min(0.95, 0.5 + scores[best] * 0.15)
    return best, confidence


class ExpenseClassifier:
    """
    ML classifier with rule-based fallback.
    Train via `train()` with labeled data; otherwise uses rule-based engine.
    """

    def __init__(self):
        self._model = None
        self._vectorizer = None
        self._load_model()

    def _load_model(self):
        model_path = MODEL_DIR / "expense_classifier.pkl"
        vectorizer_path = MODEL_DIR / "tfidf_vectorizer.pkl"
        if model_path.exists() and vectorizer_path.exists():
            with open(model_path, "rb") as f:
                self._model = pickle.load(f)
            with open(vectorizer_path, "rb") as f:
                self._vectorizer = pickle.load(f)

    def _save_model(self):
        MODEL_DIR.mkdir(exist_ok=True)
        with open(MODEL_DIR / "expense_classifier.pkl", "wb") as f:
            pickle.dump(self._model, f)
        with open(MODEL_DIR / "tfidf_vectorizer.pkl", "wb") as f:
            pickle.dump(self._vectorizer, f)

    def classify(self, text: str, merchant: Optional[str] = None) -> tuple[str, float]:
        """Returns (category, confidence)."""
        combined = f"{merchant or ''} {text}".strip()

        if self._model and self._vectorizer:
            try:
                X = self._vectorizer.transform([combined])
                proba = self._model.predict_proba(X)[0]
                pred_idx = np.argmax(proba)
                pred_label = self._model.classes_[pred_idx]
                return pred_label, float(proba[pred_idx])
            except Exception:
                pass

        return rule_based_classify(combined)

    def train(self, texts: list[str], labels: list[str]):
        """Train or retrain the classifier."""
        from sklearn.feature_extraction.text import TfidfVectorizer
        from xgboost import XGBClassifier
        from sklearn.preprocessing import LabelEncoder

        vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2), sublinear_tf=True)
        X = vectorizer.fit_transform(texts)

        le = LabelEncoder()
        y = le.fit_transform(labels)

        model = XGBClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            use_label_encoder=False,
            eval_metric="mlogloss",
        )
        model.fit(X, y)
        # Attach label mapping to model for decode
        model.classes_ = le.classes_

        self._vectorizer = vectorizer
        self._model = model
        self._save_model()


# Singleton
_classifier: Optional[ExpenseClassifier] = None


def get_classifier() -> ExpenseClassifier:
    global _classifier
    if _classifier is None:
        _classifier = ExpenseClassifier()
    return _classifier

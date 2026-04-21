"""Tests for SMS parser — covers real Indian bank message patterns."""
import pytest
from app.ml.pipelines.sms_parser import parse_sms


SMS_SAMPLES = [
    (
        "Dear Customer, Rs.1,500.00 debited from your HDFC Bank A/C X1234 on 15/04/2024 at SWIGGY. Avl Bal: Rs.45,230.50",
        {"type": "debit", "amount": 1500.0, "bank": "HDFC Bank", "account_last4": "1234"},
    ),
    (
        "Your SBI account X5678 is credited with Rs.75000 on 01/04/2024. Salary. Bal:1,20,500",
        {"type": "credit", "amount": 75000.0, "bank": "SBI"},
    ),
    (
        "INR 2,499.00 debited from Kotak Bank a/c **9012 for Amazon order. UPI Ref: 4091234567",
        {"type": "debit", "amount": 2499.0, "bank": "Kotak Bank"},
    ),
    (
        "₹500 paid to Zomato via UPI on 12-04-2024. Ref: 12345678",
        {"type": "debit", "amount": 500.0},
    ),
    (
        "Hello from TechCorp! Your OTP is 123456. Valid for 5 minutes.",
        None,  # Should not parse — no transaction
    ),
]


@pytest.mark.parametrize("sms,expected", SMS_SAMPLES)
def test_parse_sms(sms, expected):
    result = parse_sms(sms)
    if expected is None:
        assert result is None
        return

    assert result is not None
    assert result.amount == expected["amount"]
    assert result.type == expected["type"]

    if "bank" in expected:
        assert result.bank == expected["bank"]
    if "account_last4" in expected:
        assert result.account_last4 == expected["account_last4"]


def test_parse_sms_confidence():
    sms = "Rs.5000 debited from ICICI A/c X4321 at Flipkart. Balance: Rs.20,000"
    result = parse_sms(sms)
    assert result is not None
    assert result.confidence > 0.5

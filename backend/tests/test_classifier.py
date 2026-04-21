from app.ml.pipelines.expense_classifier import rule_based_classify


def test_food_classification():
    cat, conf = rule_based_classify("Swiggy order delivered")
    assert cat == "food"
    assert conf > 0.5


def test_travel_classification():
    cat, conf = rule_based_classify("Ola ride booked from airport")
    assert cat == "travel"


def test_emi_classification():
    cat, conf = rule_based_classify("EMI debited HDFC Bank loan")
    assert cat == "emi"


def test_entertainment_classification():
    cat, conf = rule_based_classify("Netflix subscription renewed")
    assert cat == "entertainment"


def test_fallback_other():
    cat, conf = rule_based_classify("payment received")
    # Should return something with non-zero confidence
    assert conf > 0

# Tests for the Machine Learning part (the ai folder).
# Run them from the foodconnect folder with:    python -m pytest

import pandas as pd
import pytest
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeClassifier

from ai import classification, forecast, prediction
from ai.data_preparation import clean_history, has_enough_history, incoming_for, stock_of
from ai.make_training_data import TRAINING_FILE, make_examples


def make_product(history, stock=20, minimum=10, barcode="1", name="Test pasta"):
    return {"barcode": barcode, "name": name, "minimum": minimum, "lastWeeks": history, "batches": [{"qty": stock, "date": "2030-01-01"}]}


@pytest.fixture(autouse=True)
def fresh_models():
    # Every test starts without trained Linear Regression models
    forecast.regression_models = {}
    forecast.trained_for = None
    forecast.times_trained = 0


# ---------- Linear Regression ----------

def test_linear_regression_trains():
    model = prediction.train_product_model(make_product([10, 12, 14, 16]))
    assert isinstance(model, LinearRegression)
    assert hasattr(model, "coef_")   # only a model that was really trained has this


def test_linear_regression_follows_the_trend():
    # 10, 12, 14, 16 goes up by 2 every week, so the next week must be 18 (the average would say 13)
    product = make_product([10, 12, 14, 16])
    assert prediction.predict_next_week(product, prediction.train_product_model(product)) == 18


def test_prediction_is_a_whole_number():
    product = make_product([35, 37, 38, 41])
    answer = prediction.predict_next_week(product, prediction.train_product_model(product))
    assert type(answer) == int


def test_prediction_is_never_negative():
    # Demand that drops fast would give a line below 0
    product = make_product([30, 20, 10, 0])
    assert prediction.predict_next_week(product, prediction.train_product_model(product)) == 0


@pytest.mark.parametrize("history", [[], [5], [5, 6], None, "many", [5, None, 7, 8], [5, -1, 7, 8], [5, "6", 7, 8], [5, True, 7, 8], [5, float("nan"), 7]])
def test_too_little_or_broken_history_gives_no_model(history):
    product = make_product(history)
    assert not has_enough_history(product)
    assert prediction.train_product_model(product) is None


def test_evaluation_does_not_test_on_the_training_weeks():
    # Weeks 1 to 3 go up by 2 (10, 12, 14), so the model trained on them predicts 16 for week 4.
    # Week 4 was really 30, so the error must be 14. If week 4 was used for training, it would be smaller.
    result = prediction.evaluate([make_product([10, 12, 14, 30])])
    assert result == {"productsTested": 1, "averageError": 14.0}


def test_evaluation_skips_products_with_too_few_weeks():
    assert prediction.evaluate([make_product([10, 12, 14])]) == {"productsTested": 0, "averageError": None}


# ---------- Decision Tree Classifier ----------

def test_training_file_is_reproducible():
    # Making the examples again with the fixed seed gives exactly the file in the repository
    saved = pd.read_csv(TRAINING_FILE)
    pd.testing.assert_frame_equal(saved, make_examples(), check_dtype=False)


def test_training_file_has_all_three_risks():
    assert set(pd.read_csv(TRAINING_FILE)["risk"]) == {"LOW", "MEDIUM", "HIGH"}


def test_classifier_trains_and_is_tested_on_other_examples():
    result = classification.train()
    assert isinstance(result["model"], DecisionTreeClassifier)
    assert list(result["model"].feature_names_in_) == classification.FEATURES
    evaluation = result["evaluation"]
    assert evaluation["trainedOn"] + evaluation["testedOn"] == 600
    assert evaluation["testedOn"] == 150
    assert 0 <= evaluation["accuracy"] <= 1
    assert evaluation["accuracy"] > 0.8   # on the made-up examples; much lower would mean something broke


def test_classifier_training_is_reproducible():
    assert classification.train()["evaluation"] == classification.train()["evaluation"]


def test_classifier_gives_sensible_risks():
    plenty = {"current_stock": 80, "predicted_demand": 10, "average_handed_out": 10, "minimum_stock": 10, "incoming_donations": 0, "stock_after_week": 70}
    empty = {"current_stock": 2, "predicted_demand": 40, "average_handed_out": 40, "minimum_stock": 10, "incoming_donations": 0, "stock_after_week": -38}
    assert classification.classify(plenty)["risk"] == "LOW"
    assert classification.classify(empty)["risk"] == "HIGH"
    assert 0 <= classification.classify(plenty)["confidence"] <= 100


# ---------- Both models together ----------

def test_forecast_has_every_field():
    result = forecast.make_forecast([make_product([35, 37, 38, 41], stock=17, minimum=20)], [])
    row = result["forecasts"][0]
    assert row == {
        "productId": "1", "name": "Test pasta", "stock": 17, "predictedDemand": 43, "predictionModel": "Linear Regression",
        "status": "ok", "risk": "HIGH", "confidence": row["confidence"], "riskModel": "Decision Tree Classifier",
        "extra": 9, "toBuy": 35,   # 43 + 20% (9) - 17 on the shelf = 35
    }
    assert result["extraPercent"] == 20


def test_classifier_gets_the_prediction_and_the_stock(monkeypatch):
    seen = {}

    def fake_classify(features):
        seen.update(features)
        return {"risk": "LOW", "confidence": 100}

    monkeypatch.setattr(classification, "classify", fake_classify)
    donations = [{"item": "test pasta", "qty": 5, "status": "accepted"}, {"item": "Test pasta", "qty": 9, "status": "waiting"}]
    forecast.make_forecast([make_product([10, 12, 14, 16], stock=20, minimum=8)], donations)
    assert seen == {
        "current_stock": 20, "predicted_demand": 18, "average_handed_out": 13.0,
        "minimum_stock": 8, "incoming_donations": 5, "stock_after_week": 7,   # 20 + 5 - 18
    }


def test_product_without_history_gets_insufficient_data():
    row = forecast.make_forecast([make_product([])], [])["forecasts"][0]
    assert row["status"] == "insufficient_data"
    assert row["predictedDemand"] is None and row["risk"] is None and row["toBuy"] is None


def test_shopping_amount_is_never_negative():
    row = forecast.make_forecast([make_product([10, 10, 10, 10], stock=500)], [])["forecasts"][0]
    assert row["toBuy"] == 0


def test_broken_data_does_not_crash():
    products = [
        {"barcode": "1", "name": "No history at all", "minimum": 5, "batches": []},
        {"barcode": "2", "name": "Broken batch", "minimum": None, "lastWeeks": [5, 6, 7, 8], "batches": [{"qty": None, "date": "2030-01-01"}, {"qty": 4}]},
    ]
    rows = forecast.make_forecast(products, [{"status": "accepted"}])["forecasts"]
    assert rows[0]["status"] == "insufficient_data"
    assert rows[1]["status"] == "ok" and rows[1]["stock"] == 4


def test_prediction_changes_when_the_history_changes():
    product = make_product([10, 10, 10, 10])
    before = forecast.make_forecast([product], [])["forecasts"][0]["predictedDemand"]
    product["lastWeeks"] = [10, 20, 30, 40]
    after = forecast.make_forecast([product], [])["forecasts"][0]["predictedDemand"]
    assert before == 10 and after == 50


def test_models_are_not_trained_again_for_the_same_history():
    product = make_product([10, 12, 14, 16])
    forecast.make_forecast([product], [])
    forecast.make_forecast([product], [])
    forecast.make_forecast([product], [])
    assert forecast.times_trained == 1
    product["lastWeeks"] = [10, 12, 14, 20]
    forecast.make_forecast([product], [])
    assert forecast.times_trained == 2


def test_risk_changes_when_the_stock_changes():
    # The same history, so Linear Regression is not trained again, but the classifier sees the new stock
    product = make_product([20, 20, 20, 20], stock=100, minimum=10)
    assert forecast.make_forecast([product], [])["forecasts"][0]["risk"] == "LOW"
    product["batches"] = [{"qty": 3, "date": "2030-01-01"}]
    assert forecast.make_forecast([product], [])["forecasts"][0]["risk"] == "HIGH"
    assert forecast.times_trained == 1


def test_small_helpers():
    assert clean_history({"lastWeeks": [1, 2.5, 0]}) == [1, 2.5, 0]
    assert stock_of({}) == 0
    assert incoming_for({"name": "Rice"}, [{"item": " rice ", "qty": 2, "status": "pickedup"}, {"item": "Rice", "qty": 7, "status": "received"}]) == 2

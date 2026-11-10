# FoodConnect AI: connects the two models.
#
# For every product:
#   1. Linear Regression (prediction.py) predicts the demand for the next 7 days.
#   2. The Decision Tree Classifier (classification.py) gets that prediction together with the
#      stock, the minimum stock and the donations on their way, and answers LOW, MEDIUM or HIGH.
#   3. The shopping list amount is worked out from the prediction:
#      to buy = predicted demand + 20% extra - stock on the shelf (never below 0).
#
# app.py calls make_forecast() and sends the answer to the manager's pages.

import math

from ai import classification, prediction
from ai.data_preparation import clean_history, history_signature, incoming_for, stock_of

EXTRA_PERCENT = 20   # buy 20% more than predicted, to be safe (the same rule the shopping list always had)

# The trained Linear Regression models, by barcode. They are only trained again when the history
# of a product changes, not every time a page asks for the forecast.
regression_models = {}
trained_for = None       # the history the models were trained for
times_trained = 0        # so the tests can check that we don't train on every request


def train_regression_if_needed(products):
    global regression_models, trained_for, times_trained
    signature = history_signature(products)
    if signature == trained_for:
        return
    regression_models = {}
    for product in products:
        regression_models[product["barcode"]] = prediction.train_product_model(product)
    trained_for = signature
    times_trained = times_trained + 1


def forecast_for(product, donations):
    stock = stock_of(product)
    result = {
        "productId": product["barcode"],     # the barcode is the ID of a product in FoodConnect
        "name": product["name"],
        "stock": stock,
        "predictedDemand": None,
        "predictionModel": prediction.MODEL_NAME,
        "status": "insufficient_data",
        "risk": None,
        "confidence": None,
        "riskModel": classification.MODEL_NAME,
        "extra": None,
        "toBuy": None,
    }
    model = regression_models.get(product["barcode"])
    if model is None:
        return result   # too little history: no prediction, so no risk and no suggestion either

    # 1. Linear Regression: the amount
    demand = prediction.predict_next_week(product, model)
    history = clean_history(product)

    # 2. Decision Tree Classifier: the risk. It gets the prediction as one of its inputs.
    incoming = incoming_for(product, donations)
    risk = classification.classify({
        "current_stock": stock,
        "predicted_demand": demand,
        "average_handed_out": sum(history) / len(history),
        "minimum_stock": product.get("minimum") or 0,
        "incoming_donations": incoming,
        "stock_after_week": stock + incoming - demand,
    })

    # 3. Shopping list: from the predicted amount, not from the risk
    extra = math.ceil(demand * EXTRA_PERCENT / 100)
    result["predictedDemand"] = demand
    result["status"] = "ok"
    result["risk"] = risk["risk"]
    result["confidence"] = risk["confidence"]
    result["extra"] = extra
    result["toBuy"] = max(0, demand + extra - stock)
    return result


def make_forecast(products, donations):
    # The forecast for every product, plus how the models did on their tests
    train_regression_if_needed(products)
    forecasts = []
    for product in products:
        forecasts.append(forecast_for(product, donations))
    return {
        "forecasts": forecasts,
        "extraPercent": EXTRA_PERCENT,
        "models": {
            "prediction": {"name": prediction.MODEL_NAME, "evaluation": prediction.evaluate(products)},
            "risk": {"name": classification.MODEL_NAME, "evaluation": classification.get_trained()["evaluation"]},
        },
    }

# FoodConnect AI, model 2: Decision Tree Classifier (scikit-learn).
# Predicts the risk that a product runs out in the next 7 days: LOW, MEDIUM or HIGH.
#
# How it works: a decision tree learns a list of yes/no questions from examples, such as
# "is there less than 3 left after this week?". It learns them from the made-up examples in
# training_data/shortage_risk_examples.csv (see make_training_data.py), because FoodConnect has
# no real history of products running out yet.
#
# This model never predicts an amount. The amount (the predicted demand) comes from Linear
# Regression in prediction.py and is one of the things this model looks at.

import pandas as pd
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

from ai.make_training_data import RANDOM_SEED, TRAINING_FILE

MODEL_NAME = "Decision Tree Classifier"
RISKS = ["LOW", "MEDIUM", "HIGH"]

# What the model looks at for each product, in this order
FEATURES = ["current_stock", "predicted_demand", "average_handed_out", "minimum_stock", "incoming_donations", "stock_after_week"]

trained = None   # the trained model and its test results. Filled in the first time it is needed.


def load_training_data():
    examples = pd.read_csv(TRAINING_FILE)
    missing = [column for column in FEATURES + ["risk"] if column not in examples.columns]
    if missing:
        raise ValueError("The training file misses the columns: " + ", ".join(missing))
    examples = examples.dropna()
    examples = examples[examples["risk"].isin(RISKS)]
    if len(examples) < 50:
        raise ValueError("The training file needs at least 50 usable examples.")
    return examples


def train():
    # Trains the tree on 75% of the examples and tests it on the other 25%, which it never saw.
    examples = load_training_data()
    train_rows, test_rows = train_test_split(examples, test_size=0.25, random_state=RANDOM_SEED, stratify=examples["risk"])

    # max_depth=4 keeps the tree small: at most 4 questions per product, so it stays easy to explain
    model = DecisionTreeClassifier(max_depth=4, random_state=RANDOM_SEED)
    model.fit(train_rows[FEATURES], train_rows["risk"])

    predicted = model.predict(test_rows[FEATURES])
    report = classification_report(test_rows["risk"], predicted, labels=RISKS, output_dict=True, zero_division=0)
    per_risk = {}
    for risk in RISKS:
        per_risk[risk] = {"precision": round(report[risk]["precision"], 2), "recall": round(report[risk]["recall"], 2)}
    evaluation = {
        "trainedOn": len(train_rows),
        "testedOn": len(test_rows),
        "accuracy": round(accuracy_score(test_rows["risk"], predicted), 2),
        "perRisk": per_risk,
        "note": "Measured on made-up examples. It says nothing yet about a real food bank.",
    }
    return {"model": model, "evaluation": evaluation}


def get_trained():
    # The training data never changes while the website runs, so training once is enough.
    global trained
    if trained is None:
        trained = train()
    return trained


def classify(features):
    # features: a dictionary with a number for every name in FEATURES.
    # Returns the risk and how sure the model is (0 to 100).
    model = get_trained()["model"]
    row = pd.DataFrame([features])[FEATURES]
    risk = model.predict(row)[0]
    # The share of training examples with this answer among the examples that got the same questions
    confidence = round(model.predict_proba(row)[0].max() * 100)
    return {"risk": str(risk), "confidence": int(confidence)}

# FoodConnect AI, model 1: Linear Regression (scikit-learn).
# Predicts how many items of a product will be handed out in the next 7 days.
#
# How it works: for each product we know how many items were handed out in each of the last weeks.
# Linear Regression draws the best straight line through those points (week number -> items) and
# we read the line one week further. So a product that goes up every week gets a higher prediction
# than its average, and a product that goes down gets a lower one.
#
# Limitation: the sample data only has 4 weeks per product. A line through 4 points is a rough
# estimate, not a reliable long-term forecast.

import math

import pandas as pd
from sklearn.linear_model import LinearRegression

from ai.data_preparation import MIN_WEEKS, clean_history, has_enough_history, history_table

MODEL_NAME = "Linear Regression"


def train(table):
    # table has the columns week and handed_out (see data_preparation.history_table)
    model = LinearRegression()
    model.fit(table[["week"]], table["handed_out"])
    return model


def predict_week(model, week):
    # The prediction for one week number, as a whole number of items that is never below 0
    value = model.predict(pd.DataFrame({"week": [week]}))[0]
    return max(0, math.floor(value + 0.5))   # round to the nearest whole item


def train_product_model(product):
    # Trains the model of one product on all its weeks. Returns None with too little history.
    if not has_enough_history(product):
        return None
    return train(history_table(product))


def predict_next_week(product, model):
    # The demand for the next 7 days: the week right after the last week in the history
    next_week = len(clean_history(product))
    return predict_week(model, next_week)


def evaluate(products):
    # How good is the model? We may not test on the same weeks we trained on, so for every product:
    # train on all weeks except the last one, predict the last week, and compare with what really
    # happened. The answer is the average number of items the prediction was off by.
    errors = []
    for product in products:
        history = clean_history(product)
        if history is None or len(history) < MIN_WEEKS + 1:
            continue   # we need MIN_WEEKS weeks to train on, plus 1 week to test on
        table = history_table(product)
        model = train(table.iloc[:-1])                  # every week except the last
        predicted = predict_week(model, len(history) - 1)
        errors.append(abs(predicted - history[-1]))
    if len(errors) == 0:
        return {"productsTested": 0, "averageError": None}
    return {"productsTested": len(errors), "averageError": round(sum(errors) / len(errors), 1)}

# FoodConnect AI: makes the practice examples for the classifier.
#
# IMPORTANT: these examples are MADE UP. They are not records from a real food bank.
# A classifier needs examples with the right answer (did the product run out or not?), and
# FoodConnect has no such history yet. So this file invents 600 realistic stock situations,
# plays out one week for each of them, and writes down what happened.
#
# The result is saved in training_data/shortage_risk_examples.csv. It is kept apart from the real
# stock in app.py. Because the random seed is fixed, running this file again gives exactly the
# same examples:    python -m ai.make_training_data

from pathlib import Path

import numpy as np
import pandas as pd

TRAINING_FILE = Path(__file__).parent / "training_data" / "shortage_risk_examples.csv"
RANDOM_SEED = 42
NUMBER_OF_EXAMPLES = 600


def label_for(items_left, minimum_stock):
    # The right answer for one example, after its week was played out
    if items_left < 0:
        return "HIGH"       # the shelf ran empty during the week
    if items_left < minimum_stock:
        return "MEDIUM"     # not empty, but below the minimum stock
    return "LOW"


def make_examples():
    random = np.random.default_rng(RANDOM_SEED)
    rows = []
    for _ in range(NUMBER_OF_EXAMPLES):
        # A made-up product situation, in the same ranges as the FoodConnect sample products
        average_handed_out = int(random.integers(5, 46))                       # per week
        predicted_demand = round(average_handed_out * random.uniform(0.8, 1.2))
        minimum_stock = int(random.integers(5, 26))
        current_stock = int(random.integers(0, 81))
        incoming_donations = 0
        if random.random() < 0.3:                                              # 3 in 10 have food on its way
            incoming_donations = int(random.integers(1, 13))

        # Play out the week. Real demand is never exactly the prediction: here up to 15% more or less.
        real_demand = round(predicted_demand * random.uniform(0.85, 1.15))
        items_left = current_stock + incoming_donations - real_demand

        rows.append({
            "current_stock": current_stock,
            "predicted_demand": predicted_demand,
            "average_handed_out": average_handed_out,
            "minimum_stock": minimum_stock,
            "incoming_donations": incoming_donations,
            # what should be left after the week according to the prediction (not the real demand)
            "stock_after_week": current_stock + incoming_donations - predicted_demand,
            "risk": label_for(items_left, minimum_stock),
        })
    return pd.DataFrame(rows)


if __name__ == "__main__":
    examples = make_examples()
    TRAINING_FILE.parent.mkdir(exist_ok=True)
    examples.to_csv(TRAINING_FILE, index=False)
    print("Saved", len(examples), "made-up examples in", TRAINING_FILE)
    print(examples["risk"].value_counts().to_string())

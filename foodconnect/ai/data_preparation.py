# FoodConnect AI: preparing the data.
# The models can't read the products from app.py directly. This file turns them into tables
# (pandas DataFrames) and checks that the numbers are usable.

import pandas as pd

MIN_WEEKS = 3   # a product needs at least 3 weeks of history before we predict anything


def is_count(value):
    # A usable number of items: 0 or more. True, False, None, text and negative numbers are not.
    if type(value) not in (int, float):
        return False
    return value == value and 0 <= value < 1_000_000   # value == value is False for "not a number"


def clean_history(product):
    # The numbers handed out per week, oldest week first.
    # Returns None when the history is missing or has a value that is not a usable number.
    history = product.get("lastWeeks")
    if type(history) != list:
        return None
    for value in history:
        if not is_count(value):
            return None
    return history


def has_enough_history(product):
    history = clean_history(product)
    return history is not None and len(history) >= MIN_WEEKS


def history_table(product):
    # One row per week: the week number (0 = oldest) and how many items were handed out.
    # This is the table that Linear Regression learns from.
    history = clean_history(product)
    return pd.DataFrame({"week": range(len(history)), "handed_out": history})


def stock_of(product):
    # How many items of this product are on the shelf. Batches with a broken amount are skipped.
    total = 0
    for batch in product.get("batches") or []:
        if is_count(batch.get("qty")):
            total = total + batch["qty"]
    return total


def incoming_for(product, donations):
    # Items of this product that a volunteer accepted or picked up but that are not on the shelf yet.
    # Households type the name of the food themselves, so we can only match donations with exactly
    # the same name as the product.
    total = 0
    for donation in donations:
        same_name = str(donation.get("item", "")).strip().lower() == product["name"].strip().lower()
        on_its_way = donation.get("status") in ("accepted", "pickedup")
        if same_name and on_its_way and is_count(donation.get("qty")):
            total = total + donation["qty"]
    return total


def history_signature(products):
    # Text that changes when the history of any product changes.
    # forecast.py uses it to know when Linear Regression has to be trained again.
    parts = []
    for product in products:
        parts.append(str(product.get("barcode")) + ":" + str(product.get("lastWeeks")))
    return "|".join(parts)

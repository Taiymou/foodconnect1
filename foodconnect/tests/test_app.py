# Tests for the website (app.py): the new forecast route, and that the routes from before still work.
# Run them from the foodconnect folder with:    python -m pytest

import importlib
import sys

import pytest

import app as app_module
from ai import forecast


@pytest.fixture
def site():
    # A fresh website with the sample data for every test
    importlib.reload(app_module)
    forecast.regression_models = {}
    forecast.trained_for = None
    forecast.times_trained = 0
    return app_module


@pytest.fixture
def client(site):
    return site.app.test_client()


def log_in(client, first_name):
    answer = client.post("/api/login", json={"email": first_name + "@foodconnect.nl", "password": "demo1234"})
    assert answer.status_code == 200
    return {"Authorization": answer.get_json()["token"]}


# ---------- The forecast route ----------

def test_forecast_for_the_manager(client):
    answer = client.get("/api/forecast", headers=log_in(client, "lisa"))
    assert answer.status_code == 200
    data = answer.get_json()
    assert len(data["forecasts"]) == 12
    assert data["version"] == 1
    for row in data["forecasts"]:
        assert row["status"] == "ok"
        assert type(row["predictedDemand"]) == int and row["predictedDemand"] >= 0
        assert row["risk"] in ("LOW", "MEDIUM", "HIGH")
        assert row["toBuy"] >= 0
        assert row["predictionModel"] == "Linear Regression"
        assert row["riskModel"] == "Decision Tree Classifier"
    barcodes = [row["productId"] for row in data["forecasts"]]
    assert len(barcodes) == len(set(barcodes))   # every product is on the list once
    assert data["models"]["prediction"]["evaluation"]["productsTested"] == 12
    assert data["models"]["risk"]["evaluation"]["testedOn"] == 150


def test_shopping_amount_follows_the_formula(client):
    # to buy = predicted demand + 20% extra - stock on the shelf, never below 0
    for row in client.get("/api/forecast", headers=log_in(client, "lisa")).get_json()["forecasts"]:
        extra = -(-row["predictedDemand"] * 20 // 100)   # 20%, rounded up
        assert row["extra"] == extra
        assert row["toBuy"] == max(0, row["predictedDemand"] + extra - row["stock"])


def test_forecast_needs_a_log_in(client):
    assert client.get("/api/forecast").status_code == 401
    assert client.get("/api/forecast", headers={"Authorization": "not-a-real-token"}).status_code == 401


def test_forecast_is_only_for_the_manager(client):
    for first_name in ("sara", "tom"):
        answer = client.get("/api/forecast", headers=log_in(client, first_name))
        assert answer.status_code == 400
        assert "forecasts" not in answer.get_json()


def test_forecast_follows_a_scan(client):
    manager = log_in(client, "lisa")
    volunteer = log_in(client, "tom")
    rice = "2001230000028"

    def rice_row():
        data = client.get("/api/forecast", headers=manager).get_json()
        return [row for row in data["forecasts"] if row["productId"] == rice][0], data["version"]

    before, version_before = rice_row()
    assert before["stock"] == 46 and before["toBuy"] == 0
    for _ in range(40):
        assert client.post("/api/scan/out", json={"barcode": rice}, headers=volunteer).status_code == 200
    after, version_after = rice_row()
    assert after["stock"] == 6
    assert after["risk"] == "HIGH"
    assert after["toBuy"] == after["predictedDemand"] + after["extra"] - 6
    assert version_after == version_before + 40


def test_new_product_has_no_prediction_yet(client):
    volunteer = log_in(client, "tom")
    new = {"barcode": "87654321", "name": "Oat milk", "category": "Dairy", "size": "1 litre", "minimum": 5}
    assert client.post("/api/products", json=new, headers=volunteer).status_code == 200
    rows = client.get("/api/forecast", headers=log_in(client, "lisa")).get_json()["forecasts"]
    oat_milk = [row for row in rows if row["productId"] == "87654321"][0]
    assert oat_milk["status"] == "insufficient_data"
    assert oat_milk["predictedDemand"] is None and oat_milk["toBuy"] is None


def test_forecast_follows_new_history(site, client):
    manager = log_in(client, "lisa")
    first = client.get("/api/forecast", headers=manager).get_json()["forecasts"][0]
    site.products[0]["lastWeeks"] = [5, 5, 5, 5]
    second = client.get("/api/forecast", headers=manager).get_json()["forecasts"][0]
    assert first["predictedDemand"] == 43 and second["predictedDemand"] == 5


def test_website_survives_when_the_models_fail(client, monkeypatch):
    # For example when scikit-learn is not installed: the forecast gives a clear error, the rest works
    monkeypatch.setitem(sys.modules, "ai.forecast", None)
    manager = log_in(client, "lisa")
    answer = client.get("/api/forecast", headers=manager)
    assert answer.status_code == 503
    assert answer.get_json()["error"] == "The predictions are not available right now."
    assert client.get("/api/state", headers=manager).status_code == 200


# ---------- The routes from before still work ----------

def test_home_page_loads(client):
    answer = client.get("/")
    assert answer.status_code == 200
    assert b"FoodConnect" in answer.data
    assert b"js/forecast.js" in answer.data


def test_wrong_password(client):
    assert client.post("/api/login", json={"email": "lisa@foodconnect.nl", "password": "wrong"}).status_code == 401


def test_state_and_accounts(client):
    assert len(client.get("/api/accounts").get_json()["accounts"]) == 3
    state = client.get("/api/state", headers=log_in(client, "lisa")).get_json()["state"]
    assert len(state["products"]) == 12 and len(state["weeks"]) == 5


def test_scan_in_out_and_waste(client):
    volunteer = log_in(client, "tom")
    pasta = "2001230000011"

    def pasta_stock(answer):
        product = [p for p in answer.get_json()["state"]["products"] if p["barcode"] == pasta][0]
        return sum(batch["qty"] for batch in product["batches"])

    assert pasta_stock(client.post("/api/scan/in", json={"barcode": pasta, "qty": 5, "date": "2030-01-01"}, headers=volunteer)) == 22
    assert pasta_stock(client.post("/api/scan/out", json={"barcode": pasta}, headers=volunteer)) == 21
    assert pasta_stock(client.post("/api/scan/waste", json={"barcode": pasta}, headers=volunteer)) == 20
    assert client.post("/api/scan/out", json={"barcode": "000"}, headers=volunteer).status_code == 400


def test_donation_from_offer_to_received(client):
    household = log_in(client, "sara")
    volunteer = log_in(client, "tom")
    offered = client.post("/api/donations", json={"item": "Lentils", "qty": 3, "date": "2030-01-01"}, headers=household)
    assert offered.status_code == 200
    donation_id = offered.get_json()["state"]["donations"][0]["id"]
    for step in ("accept", "picked", "received"):
        assert client.post("/api/donations/" + donation_id + "/" + step, headers=volunteer).status_code == 200
    assert client.post("/api/donations", json={"item": "x", "qty": 0, "date": "nope"}, headers=household).status_code == 400

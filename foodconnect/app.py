# FoodConnect: the server, made with Flask.
# 1. Install once:          pip install -r requirements.txt
# 2. Start the website:     python app.py
# 3. Open in your browser:  http://127.0.0.1:5000
#
# Flask keeps all the data (donations, stock and scans) in its memory, so every browser
# window sees the same data. Stop and start python app.py to begin again with the sample data.

import secrets
from datetime import date, datetime, timedelta

from flask import Flask, jsonify, render_template, request
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)


# ---------- 1. Small helpers ----------

def day_from_today(days):
    # A date as text like "2026-11-20", the same format as <input type="date">
    return (date.today() + timedelta(days=days)).isoformat()


def days_left(day_text):
    return (date.fromisoformat(day_text) - date.today()).days


def time_ago(minutes):
    # A time like "11:52", some minutes ago
    return (datetime.now() - timedelta(minutes=minutes)).strftime("%H:%M")


def read_date(text):
    # The date from a form, or None when it is empty or not a date
    try:
        return date.fromisoformat(text)
    except (TypeError, ValueError):
        return None


def is_whole_number(value, low, high):
    # type(...) == int is False for True, False and 2.5, so those don't count as whole numbers
    return type(value) == int and low <= value <= high


def error(message, hint=""):
    # Sends an error back to the page. The page shows the message to the user.
    return jsonify(error=message, hint=hint), 400


def not_logged_in():
    return jsonify(error="Please log in again."), 401


# ---------- 2. Sample data ----------

# Passwords are stored as a hash, never as plain text.
users = [
    {"email": "sara@foodconnect.nl", "password": generate_password_hash("demo1234"), "name": "Sara de Vries", "first": "Sara", "role": "household", "address": "Lindelaan 14", "area": "Centre"},
    {"email": "tom@foodconnect.nl", "password": generate_password_hash("demo1234"), "name": "Tom Peeters", "first": "Tom", "role": "volunteer"},
    {"email": "lisa@foodconnect.nl", "password": generate_password_hash("demo1234"), "name": "Lisa van Dijk", "first": "Lisa", "role": "manager"},
]

# Every product belongs to one of these categories.
CATEGORIES = ["Pasta, rice and grains", "Beans and legumes", "Vegetables and fruit", "Dairy", "Oil and spreads", "Fish and meat"]

# Each product has a barcode, a category, a minimum stock, how many were handed out in each of the
# last 4 weeks (oldest week first), and batches: how many items on the shelf have which date on the
# package. The handed-out numbers are the history that the prediction learns from (see the ai folder).
products = [
    {"barcode": "2001230000011", "name": "Wholegrain pasta", "size": "500 g", "category": "Pasta, rice and grains", "minimum": 20, "lastWeeks": [35, 37, 38, 41], "batches": [{"qty": 17, "date": day_from_today(160)}]},
    {"barcode": "2001230000028", "name": "Brown rice", "size": "1 kg", "category": "Pasta, rice and grains", "minimum": 15, "lastWeeks": [27, 24, 26, 25], "batches": [{"qty": 46, "date": day_from_today(240)}]},
    {"barcode": "2001230000035", "name": "Couscous", "size": "500 g", "category": "Pasta, rice and grains", "minimum": 10, "lastWeeks": [14, 13, 15, 14], "batches": [{"qty": 22, "date": day_from_today(200)}]},
    {"barcode": "2001230000042", "name": "Kidney beans", "size": "400 g can", "category": "Beans and legumes", "minimum": 20, "lastWeeks": [20, 21, 23, 22], "batches": [{"qty": 13, "date": day_from_today(350)}]},
    {"barcode": "2001230000059", "name": "Chickpeas", "size": "400 g jar", "category": "Beans and legumes", "minimum": 15, "lastWeeks": [15, 17, 16, 18], "batches": [{"qty": 26, "date": day_from_today(320)}]},
    {"barcode": "2001230000066", "name": "Mixed vegetables", "size": "400 g can", "category": "Vegetables and fruit", "minimum": 20, "lastWeeks": [31, 32, 31, 34], "batches": [{"qty": 10, "date": day_from_today(5)}, {"qty": 32, "date": day_from_today(250)}]},
    {"barcode": "2001230000073", "name": "Tomato passata", "size": "500 g jar", "category": "Vegetables and fruit", "minimum": 12, "lastWeeks": [18, 17, 16, 19], "batches": [{"qty": 15, "date": day_from_today(180)}]},
    {"barcode": "2001230000080", "name": "Long-life milk", "size": "1 litre", "category": "Dairy", "minimum": 24, "lastWeeks": [33, 32, 34, 33], "batches": [{"qty": 4, "date": day_from_today(2)}, {"qty": 24, "date": day_from_today(60)}]},
    {"barcode": "2001230000097", "name": "Plain yoghurt", "size": "1 litre", "category": "Dairy", "minimum": 10, "lastWeeks": [13, 15, 14, 15], "batches": [{"qty": 2, "date": day_from_today(-1)}, {"qty": 6, "date": day_from_today(3)}]},
    {"barcode": "2001230000103", "name": "Sunflower oil", "size": "1 litre", "category": "Oil and spreads", "minimum": 8, "lastWeeks": [12, 11, 12, 10], "batches": [{"qty": 14, "date": day_from_today(270)}]},
    {"barcode": "2001230000110", "name": "Peanut butter", "size": "350 g jar", "category": "Oil and spreads", "minimum": 10, "lastWeeks": [12, 12, 13, 12], "batches": [{"qty": 11, "date": day_from_today(200)}]},
    {"barcode": "2001230000127", "name": "Tuna in water", "size": "160 g can", "category": "Fish and meat", "minimum": 20, "lastWeeks": [22, 24, 23, 26], "batches": [{"qty": 3, "date": day_from_today(4)}, {"qty": 40, "date": day_from_today(300)}]},
]

# Items per week. The last row is this week, and the scan station adds to it.
weeks = [
    {"label": "4 weeks ago", "cameIn": 261, "handedOut": 252, "wasted": 11},
    {"label": "3 weeks ago", "cameIn": 261, "handedOut": 255, "wasted": 6},
    {"label": "2 weeks ago", "cameIn": 269, "handedOut": 261, "wasted": 9},
    {"label": "Last week", "cameIn": 268, "handedOut": 269, "wasted": 5},
    {"label": "This week so far", "cameIn": 12, "handedOut": 2, "wasted": 1},
]

# The latest scans, newest first.
scan_log = [
    {"time": time_ago(12), "mode": "waste", "name": "Plain yoghurt", "change": -1, "left": 8},
    {"time": time_ago(33), "mode": "in", "name": "Brown rice", "change": 12, "left": 46},
    {"time": time_ago(62), "mode": "out", "name": "Wholegrain pasta", "change": -1, "left": 17},
    {"time": time_ago(77), "mode": "out", "name": "Tuna in water", "change": -1, "left": 43},
]

# Donations from households. status: waiting, accepted, pickedup, received or cancelled.
# owner and volunteerEmail say whose donation it is. Only Sara and Tom have demo accounts.
SARA = "sara@foodconnect.nl"
TOM = "tom@foodconnect.nl"
donations = [
    {"id": "D101", "owner": SARA, "from": "Sara", "fullName": "Sara de Vries", "address": "Lindelaan 14", "area": "Centre", "item": "Wholegrain pasta", "qty": 4, "date": day_from_today(160), "status": "waiting", "volunteer": None, "volunteerEmail": None},
    {"id": "D102", "owner": SARA, "from": "Sara", "fullName": "Sara de Vries", "address": "Lindelaan 14", "area": "Centre", "item": "Mixed vegetables", "qty": 6, "date": day_from_today(300), "status": "accepted", "volunteer": "Tom", "volunteerEmail": TOM},
    {"id": "D103", "owner": SARA, "from": "Sara", "fullName": "Sara de Vries", "address": "Lindelaan 14", "area": "Centre", "item": "Brown rice", "qty": 2, "date": day_from_today(240), "status": "received", "volunteer": "Tom", "volunteerEmail": TOM},
    {"id": "D104", "owner": None, "from": "Fatima", "fullName": "Fatima El Amrani", "address": "Stationsstraat 21", "area": "Centre", "item": "Long-life milk", "qty": 6, "date": day_from_today(25), "status": "waiting", "volunteer": None, "volunteerEmail": None},
    {"id": "D105", "owner": None, "from": "Daan", "fullName": "Daan Bakker", "address": "Kastanjelaan 3", "area": "North", "item": "Peanut butter", "qty": 3, "date": day_from_today(200), "status": "waiting", "volunteer": None, "volunteerEmail": None},
    {"id": "D106", "owner": None, "from": "Fatima", "fullName": "Fatima El Amrani", "address": "Stationsstraat 21", "area": "Centre", "item": "Baby formula", "qty": 2, "date": day_from_today(120), "status": "waiting", "volunteer": None, "volunteerEmail": None},
    {"id": "D107", "owner": None, "from": "Noor", "fullName": "Noor Jansen", "address": "Heuvelstraat 9", "area": "South", "item": "Kidney beans", "qty": 8, "date": day_from_today(350), "status": "pickedup", "volunteer": "Tom", "volunteerEmail": TOM},
    {"id": "D108", "owner": None, "from": "Daan", "fullName": "Daan Bakker", "address": "Kastanjelaan 3", "area": "North", "item": "Sunflower oil", "qty": 2, "date": day_from_today(4), "status": "waiting", "volunteer": None, "volunteerEmail": None},
]
next_donation_number = 109

version = 1      # goes up after every change, so the pages know when to draw again
logged_in = {}   # token -> user. Every browser window that logs in gets its own token.


# ---------- 3. Working with the data ----------

def changed():
    global version
    version = version + 1


def find_product(barcode):
    for product in products:
        if product["barcode"] == barcode:
            return product
    return None


def find_donation(donation_id):
    for donation in donations:
        if donation["id"] == donation_id:
            return donation
    return None


def stock_of(product):
    total = 0
    for batch in product["batches"]:
        total = total + batch["qty"]
    return total


def batch_date(batch):
    return batch["date"]


# Takes one item from a batch. An empty batch is removed.
def take_one(product, batch):
    batch["qty"] = batch["qty"] - 1
    if batch["qty"] == 0:
        product["batches"].remove(batch)


def add_to_log(mode, product, change):
    scan_log.insert(0, {"time": time_ago(0), "mode": mode, "name": product["name"], "change": change, "left": stock_of(product)})
    if len(scan_log) > 50:
        scan_log.pop()   # keep the latest 50 scans


def get_user():
    # The user who sent this request, or None when they are not logged in
    token = request.headers.get("Authorization", "")
    return logged_in.get(token)


def get_data():
    # The data the page sent, or an empty dictionary
    data = request.get_json(silent=True)
    if data is None:
        return {}
    return data


# A copy of a donation with only what the page may see
def donation_for_page(donation, with_address):
    copy = {
        "id": donation["id"], "item": donation["item"], "qty": donation["qty"], "date": donation["date"],
        "status": donation["status"], "from": donation["from"], "area": donation["area"], "volunteer": donation["volunteer"],
    }
    if with_address:
        copy["fullName"] = donation["fullName"]
        copy["address"] = donation["address"]
    return copy


# Each role only gets the donations it may see.
# A volunteer only sees the address of a donation they accepted, until they picked it up.
def donations_for(user):
    result = []
    for d in donations:
        if user["role"] == "household" and d["owner"] == user["email"]:
            result.append(donation_for_page(d, False))
        elif user["role"] == "volunteer" and d["status"] == "waiting":
            result.append(donation_for_page(d, False))
        elif user["role"] == "volunteer" and d["volunteerEmail"] == user["email"]:
            result.append(donation_for_page(d, d["status"] == "accepted"))
    return result


# Everything the pages of one user need
def state_for(user):
    return {"version": version, "products": products, "weeks": weeks, "scanLog": scan_log[:8], "donations": donations_for(user)}


# ---------- 4. Pages and log in ----------

@app.route("/")
def home():
    # Flask looks for index.html in the templates folder
    return render_template("index.html")


@app.get("/api/accounts")
def accounts():
    # The demo accounts for the log in page, without the passwords
    result = []
    for u in users:
        result.append({"email": u["email"], "name": u["name"], "first": u["first"], "role": u["role"]})
    return jsonify(accounts=result)


@app.post("/api/login")
def login():
    data = get_data()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    for user in users:
        if user["email"] == email and check_password_hash(user["password"], password):
            token = secrets.token_urlsafe(24)
            logged_in[token] = user
            page_user = {"name": user["name"], "first": user["first"], "role": user["role"], "address": user.get("address")}
            return jsonify(token=token, user=page_user, state=state_for(user))
    # The same message for a wrong email and a wrong password, so nobody can guess accounts
    return jsonify(error="The email or password is wrong."), 401


@app.post("/api/logout")
def logout():
    token = request.headers.get("Authorization", "")
    logged_in.pop(token, None)
    return jsonify(ok=True)


@app.get("/api/state")
def state():
    # The pages ask this every 3 seconds, to see changes made in other windows
    user = get_user()
    if user is None:
        return not_logged_in()
    return jsonify(state=state_for(user))


# ---------- 5. Household: offer food ----------

@app.post("/api/donations")
def offer_donation():
    global next_donation_number
    user = get_user()
    if user is None or user["role"] != "household":
        return not_logged_in()
    data = get_data()
    item = str(data.get("item", "")).strip()
    qty = data.get("qty")
    day = read_date(data.get("date"))

    # Check the input before saving it (FR12 and FR15)
    if len(item) < 2 or len(item) > 60:
        return error("The name of the food needs 2 to 60 characters.")
    if not is_whole_number(qty, 1, 50):
        return error("How many must be a whole number from 1 to 50.")
    if day is None:
        return error("Fill in the date on the package.")
    if (day - date.today()).days < 2:
        return error("The date is too close. Choose a date at least 2 days from today.")

    donations.insert(0, {
        "id": "D" + str(next_donation_number), "owner": user["email"], "from": user["first"], "fullName": user["name"],
        "address": user["address"], "area": user["area"], "item": item, "qty": qty, "date": day.isoformat(),
        "status": "waiting", "volunteer": None, "volunteerEmail": None,
    })
    next_donation_number = next_donation_number + 1
    changed()
    return jsonify(state=state_for(user))


# The steps of a donation: cancel (household), accept, picked and received (volunteer)
@app.post("/api/donations/<donation_id>/<step>")
def donation_step(donation_id, step):
    user = get_user()
    if user is None:
        return not_logged_in()
    donation = find_donation(donation_id)
    if donation is None:
        return error("This donation was not found.")
    changed_meanwhile = "This donation changed in the meantime. The list shows its latest status now."

    if step == "cancel":
        # Only the household that offered it, and only while nobody accepted it
        if donation["owner"] != user["email"]:
            return error("This donation was not found.")
        if donation["status"] != "waiting":
            return error(changed_meanwhile)
        donation["status"] = "cancelled"
    elif step == "accept":
        if user["role"] != "volunteer":
            return error("Your account can't do this.")
        if donation["status"] != "waiting":
            return error(changed_meanwhile)
        donation["status"] = "accepted"
        donation["volunteer"] = user["first"]
        donation["volunteerEmail"] = user["email"]
    elif step == "picked":
        # Only the volunteer who accepted it
        if donation["volunteerEmail"] != user["email"]:
            return error("This donation was not found.")
        if donation["status"] != "accepted":
            return error(changed_meanwhile)
        donation["status"] = "pickedup"
    elif step == "received":
        if donation["volunteerEmail"] != user["email"]:
            return error("This donation was not found.")
        if donation["status"] != "pickedup":
            return error(changed_meanwhile)
        donation["status"] = "received"
    else:
        return error("This step doesn't exist.")

    changed()
    return jsonify(state=state_for(user))


# ---------- 6. Volunteer: scan station ----------

@app.post("/api/scan/in")
def scan_in():
    # In: put the items on the shelf with the date on the package
    user = get_user()
    if user is None or user["role"] != "volunteer":
        return not_logged_in()
    data = get_data()
    product = find_product(str(data.get("barcode", "")))
    qty = data.get("qty")
    day = read_date(data.get("date"))
    if product is None:
        return error("Unknown barcode", "Register the product first.")
    if not is_whole_number(qty, 1, 200):
        return error("How many must be a whole number from 1 to 200.")
    if day is None:
        return error("Fill in the date on the package.")
    if day < date.today():
        return error("This date has passed. Switch to Waste to throw the food away.")
    product["batches"].append({"qty": qty, "date": day.isoformat()})
    product["batches"].sort(key=batch_date)   # oldest date first
    weeks[-1]["cameIn"] = weeks[-1]["cameIn"] + qty
    add_to_log("in", product, qty)
    changed()
    return jsonify(state=state_for(user))


@app.post("/api/scan/out")
def scan_out():
    # Out: hand out the item with the oldest date, but never food that is past its date
    user = get_user()
    if user is None or user["role"] != "volunteer":
        return not_logged_in()
    product = find_product(str(get_data().get("barcode", "")))
    if product is None:
        return error("Unknown barcode", "Register the product first.")
    batch = None
    for b in product["batches"]:   # the batches are sorted, oldest date first
        if days_left(b["date"]) >= 0:
            batch = b
            break
    if batch is None:
        if stock_of(product) > 0:
            return error(product["name"] + " is past its date", "Switch to Waste and scan it again.")
        return error("No " + product["name"] + " on the shelf", "Switch to In to add it.")
    take_one(product, batch)
    weeks[-1]["handedOut"] = weeks[-1]["handedOut"] + 1
    add_to_log("out", product, -1)
    changed()
    return jsonify(state=state_for(user))


@app.post("/api/scan/waste")
def scan_waste():
    # Waste: take the item with the oldest date
    user = get_user()
    if user is None or user["role"] != "volunteer":
        return not_logged_in()
    product = find_product(str(get_data().get("barcode", "")))
    if product is None:
        return error("Unknown barcode", "Register the product first.")
    if len(product["batches"]) == 0:
        return error("No " + product["name"] + " on the shelf", "The stock is already 0, so nothing was thrown away.")
    take_one(product, product["batches"][0])
    weeks[-1]["wasted"] = weeks[-1]["wasted"] + 1
    add_to_log("waste", product, -1)
    changed()
    return jsonify(state=state_for(user))


@app.post("/api/products")
def register_product():
    # Unknown barcode: register the product (FR04)
    user = get_user()
    if user is None or user["role"] != "volunteer":
        return not_logged_in()
    data = get_data()
    barcode = str(data.get("barcode", "")).strip()
    name = str(data.get("name", "")).strip()
    category = str(data.get("category", ""))
    size = str(data.get("size", "")).strip()
    minimum = data.get("minimum")
    if not barcode.isdigit() or len(barcode) < 8 or len(barcode) > 13:
        return error("Not a barcode. Scan again, or type the 8 to 13 digits.")
    if len(name) < 2 or len(name) > 40:
        return error("The product name needs 2 to 40 characters.")
    if category not in CATEGORIES:
        return error("Choose a category.")
    if len(size) > 20:
        return error("The pack size can have up to 20 characters.")
    if not is_whole_number(minimum, 0, 500):
        return error("The minimum stock must be a whole number from 0 to 500.")
    if find_product(barcode) is not None:
        return error("This barcode is already registered.")
    if size == "":
        size = "No pack size"
    product = {"barcode": barcode, "name": name, "size": size, "category": category, "minimum": minimum, "lastWeeks": [], "batches": []}   # no history yet, so no prediction yet
    products.append(product)
    add_to_log("new", product, 0)
    changed()
    return jsonify(state=state_for(user))


# ---------- 7. Manager: the forecast (Machine Learning) ----------

@app.get("/api/forecast")
def forecast():
    # The predictions for the dashboard and the shopping list. The models are in the ai folder:
    # Linear Regression predicts the demand for the next 7 days, and a Decision Tree Classifier
    # predicts the risk that a product runs out. See ai/forecast.py for how they work together.
    user = get_user()
    if user is None:
        return not_logged_in()
    if user["role"] != "manager":
        return error("Your account can't do this.")
    try:
        # Imported here, so the rest of the website still works when scikit-learn is not installed
        from ai.forecast import make_forecast
        result = make_forecast(products, donations)
    except Exception as problem:
        app.logger.error("The forecast failed: %s", problem)
        return jsonify(error="The predictions are not available right now.", hint="Run: pip install -r requirements.txt"), 503
    result["version"] = version   # the version of the data these predictions belong to
    return jsonify(result)


# ---------- 8. Start ----------

if __name__ == "__main__":
    app.run(debug=True)

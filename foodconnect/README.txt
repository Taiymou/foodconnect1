FoodConnect website (Flask)

1. Install once:            pip install -r requirements.txt
2. Start the website:       python app.py
3. Open in your browser:    http://127.0.0.1:5000

Keep the folders as they are:
- app.py                    the server: it keeps the data and checks every change
- templates/index.html      the page (Flask looks for pages in templates)
- static/style.css          the styling (Flask serves CSS and JavaScript from static)
- static/js/                the JavaScript, one file per part of the website:
    helpers.js              small helpers that the other files use
    api.js                  talks to app.py: gets the data and sends changes to it
    stock.js                stock and status (Low stock, Getting low)
    forecast.js             manager: shows the predictions that Flask sends (it predicts nothing itself)
    login.js                log in, log out and switching pages
    donate.js               household: My donations
    scan.js                 volunteer: Scan station
    pickups.js              volunteer: Pickups
    dashboard.js            manager: Dashboard
    shopping.js             manager: Shopping list
    start.js                starts the page (loaded last)
- static/icons/             the small pictures (SVG files) for the products, buttons and menu
- ai/                       the Machine Learning, in Python (scikit-learn):
    data_preparation.py     turns the products into tables for the models and checks the numbers
    prediction.py           model 1, Linear Regression: the demand for the next 7 days
    classification.py       model 2, Decision Tree Classifier: LOW, MEDIUM or HIGH risk of running out
    forecast.py             connects the two models and works out the shopping list
    make_training_data.py   makes the practice examples for the classifier
    training_data/          those examples (made up, not real food bank records)
- tests/                    the automated tests. Run them with:    python -m pytest
- requirements.txt          the Python packages the website needs

Log in with a demo account. The password is demo1234.

All browser windows share the same data. To see the connections, open two windows:
log in as Sara (household) in one and as Tom (volunteer) in the other. A donation that
Sara offers shows up on Tom's Pickups page within a few seconds, and every scan Tom makes
shows up on Lisa's (manager) dashboard.

The data lives in the server's memory. Stop and start python app.py to begin again
with the sample data.


Machine Learning in FoodConnect
-------------------------------
The manager's Dashboard (Forecast for the next 7 days) and the Shopping list use two models.
Flask makes the predictions (GET /api/forecast); the JavaScript only shows them.

1. Linear Regression predicts how many items of each product will be handed out in the next
   7 days. For each product it draws the best straight line through the numbers handed out in
   the last weeks and reads the line one week further. A product needs at least 3 weeks of
   history; a newly registered product shows "Not enough history" until then.

2. A Decision Tree Classifier predicts the risk that a product runs out: LOW, MEDIUM or HIGH.
   It looks at the stock, the predicted demand from model 1, the average handed out, the minimum
   stock, donations that are on their way, and what should be left after the week.

3. Shopping list: to buy = predicted demand + 20% extra - stock on the shelf, never below 0.

Good to know (limits):
- The sample data has only 4 weeks per product. A line through 4 points is a rough estimate.
  Test: train on the first 3 weeks, predict week 4, compare with the real week 4. On the sample
  data this is off by 1.5 items on average.
- FoodConnect has no real history of products running out, so the classifier learns from 600
  made-up examples (ai/training_data/shortage_risk_examples.csv, made by
  python -m ai.make_training_data with a fixed seed). It is trained on 450 of them and tested on
  the other 150: 93% right. That number is about the made-up examples only. It says nothing yet
  about a real food bank.
- The website has no "new week" step yet: scans change the stock straight away (so the risk and
  the shopping list change too), but the 4 weeks of history stay the same until app.py gets a way
  to close a week. Linear Regression is trained again as soon as the history of a product changes.
- Donations only count as "on their way" when the household typed exactly the product name.

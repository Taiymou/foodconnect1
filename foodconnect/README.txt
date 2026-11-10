FoodConnect website (Flask)

1. Install Flask once:      pip install flask
2. Start the website:       python app.py
3. Open in your browser:    http://127.0.0.1:5000

Keep the folders as they are:
- app.py                    the server: it keeps the data and checks every change
- templates/index.html      the page (Flask looks for pages in templates)
- static/style.css          the styling (Flask serves CSS and JavaScript from static)
- static/js/                the JavaScript, one file per part of the website:
    helpers.js              small helpers that the other files use
    api.js                  talks to app.py: gets the data and sends changes to it
    stock.js                stock, status (Low stock, Getting low) and the prediction
    login.js                log in, log out and switching pages
    donate.js               household: My donations
    scan.js                 volunteer: Scan station
    pickups.js              volunteer: Pickups
    dashboard.js            manager: Dashboard
    shopping.js             manager: Shopping list
    start.js                starts the page (loaded last)
- static/icons/             the small pictures (SVG files) for the products, buttons and menu

Log in with a demo account. The password is demo1234.

All browser windows share the same data. To see the connections, open two windows:
log in as Sara (household) in one and as Tom (volunteer) in the other. A donation that
Sara offers shows up on Tom's Pickups page within a few seconds, and every scan Tom makes
shows up on Lisa's (manager) dashboard.

The data lives in the server's memory. Stop and start python app.py to begin again
with the sample data.

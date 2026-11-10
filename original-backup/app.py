# FoodConnect: runs the website with Flask.
# 1. Install Flask once:    pip install flask
# 2. Start the website:     python app.py
# 3. Open in your browser:  http://127.0.0.1:5000

from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def home():
    # Flask looks for index.html in the templates folder.
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True)

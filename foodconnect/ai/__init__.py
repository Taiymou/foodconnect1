# FoodConnect: the Machine Learning part of the website.
#
#   data_preparation.py   turns the products from app.py into tables for the models
#   prediction.py         model 1, Linear Regression: how many items will be handed out in the next 7 days
#   classification.py     model 2, Decision Tree Classifier: LOW, MEDIUM or HIGH risk of running out
#   forecast.py           connects the two models and works out the shopping list
#   make_training_data.py makes the practice examples that the classifier learns from
#
# app.py only uses forecast.make_forecast().

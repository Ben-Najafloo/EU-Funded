# app/routes/projects/base.py
"""Core database connections and configuration for projects routes."""

import spacy
from pymongo import MongoClient
import os

# MongoDB Setup
mongo_client = MongoClient(os.getenv("MONGOURL"))
db = mongo_client["cordis_db"]
projects_collection = db["projects"]
organizations_collection = db["organizations"]

# NLP Setup
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = None

from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

mongo_client = MongoClient(os.getenv("MONGOURL"))

print("=== CONNECTION INFO ===")
print(f"MongoDB URL: {os.getenv('MONGOURL')[:50]}...")  # Don't print full URL
print(f"Available databases: {mongo_client.list_database_names()}")

db = mongo_client["cordis_db"]
print(f"\nCollections in 'cordis_db': {db.list_collection_names()}")

# Check if projects collection exists and has data
projects_collection = db["projects"]
print(f"\nProjects count: {projects_collection.count_documents({})}")

# Check indexes on the actual collection
print("\n=== INDEXES ON projects collection ===")
for idx in projects_collection.list_indexes():
    print(f"  - {idx['name']}: {idx.get('weights', idx.get('key'))}")

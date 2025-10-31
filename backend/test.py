from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# Create fresh connection
client = MongoClient(os.getenv("MONGOURL"))
db = client["cordis_db"]
collection = db["projects"]

# Verify we can query normally
print(f"Normal query works: {collection.count_documents({})}")

# Try text search with explicit collection reference
try:
    result = collection.find_one({"$text": {"$search": "climate"}})
    print(f"Text search works: {result is not None}")
    print(
        f"Found title: {result.get('title', 'N/A')[:50] if result else 'N/A'}")
except Exception as e:
    print(f"Text search error: {e}")

# Try with aggregation
try:
    pipeline = [
        {"$match": {"$text": {"$search": "climate"}}},
        {"$limit": 1}
    ]
    results = list(collection.aggregate(pipeline))
    print(f"Aggregation text search works: {len(results)} results")
except Exception as e:
    print(f"Aggregation error: {e}")

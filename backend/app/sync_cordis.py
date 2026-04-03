import requests
import zipfile
import io
import csv
from pymongo import MongoClient, TEXT
from flask import current_app

CORDIS_ZIP_URL = "https://cordis.europa.eu/data/cordis-HORIZONprojects-csv.zip"
#https://cordis.europa.eu/data/cordis-fp7projects-csv.zip
#https://cordis.europa.eu/data/cordis-h2020projects-csv.zip

BATCH_SIZE = 1000


def download_zip(url):
    """Download zip file and return bytes."""
    response = requests.get(url)
    response.raise_for_status()
    return io.BytesIO(response.content)


def read_csv_from_zip(zip_bytes, filename_prefix):
    """
    Extract CSV from zip with a given prefix ('project' or 'organization').
    Returns list of dicts.
    """
    docs = []
    with zipfile.ZipFile(zip_bytes) as z:
        # Find the first CSV file matching prefix
        csv_name = next((name for name in z.namelist()
                        if name.lower().startswith(filename_prefix)), None)
        if not csv_name:
            print(f"⚠️ No {filename_prefix} CSV found in zip!")
            return docs
        with z.open(csv_name) as f:
            # Detect delimiter (usually ';')
            text = io.TextIOWrapper(f, encoding="utf-8")
            reader = csv.DictReader(text, delimiter=';')
            for row in reader:
                docs.append(row)
    return docs


def clean_document(doc: dict) -> dict:
    """Remove invalid keys (None), strip whitespace, and normalize numeric fields."""
    cleaned = {}
    for k, v in doc.items():
        if k is None:
            continue

        key = k.strip()
        value = v.strip() if isinstance(v, str) else v

        # Convert ecMaxContribution and totalCost to float if possible
        if key in ["ecMaxContribution", "totalCost"] and isinstance(value, str):
            try:
                # Replace comma with dot (e.g., "226276,8" -> "226276.8")
                cleaned[key] = float(value.replace(",", "."))
            except ValueError:
                cleaned[key] = 0.0  # fallback if empty or invalid
        else:
            cleaned[key] = value

    return cleaned


def insert_batch(collection, docs):
    """Insert documents in batches to avoid memory issues."""
    batch = []
    for doc in docs:
        cleaned = clean_document(doc)
        batch.append(cleaned)
        if len(batch) >= BATCH_SIZE:
            collection.insert_many(batch)
            batch.clear()
    if batch:
        collection.insert_many(batch)


def sync_cordis():
    """Main function to sync CORDIS data into MongoDB."""
    mongo_uri = current_app.config["MONGO_URI"]
    client = MongoClient(mongo_uri)
    db = client["cordis_db"]

    projects_collection = db["projects"]
    organizations_collection = db["organizations"]

    print("⬇️ Downloading CORDIS zip file...")
    zip_bytes = download_zip(CORDIS_ZIP_URL)

    print("📂 Extracting projects CSV...")
    projects = read_csv_from_zip(zip_bytes, "project")
    print(f"✅ Found {len(projects)} projects.")

    print("📂 Extracting organizations CSV...")
    organizations = read_csv_from_zip(zip_bytes, "organization")
    print(f"✅ Found {len(organizations)} organizations.")

    print("🗑 Dropping old collections...")
    projects_collection.drop()
    organizations_collection.drop()

    print("💾 Inserting new data...")
    insert_batch(projects_collection, projects)
    insert_batch(organizations_collection, organizations)

    print("📈 Creating indexes...")
    # projects_collection.create_index(
    #     [("title", TEXT), ("acronym", TEXT), ("objective", TEXT)])
    # organizations_collection.create_index(
    #     [("organization_name", TEXT), ("acronym", TEXT)])
    # projects_collection.create_index("startDate")
    # projects_collection.create_index("endDate")
    # projects_collection.create_index("ecMaxContribution")

    # Drop old text index if it exists (to avoid conflicts)
    try:
        projects_collection.drop_index(
            "title_text_acronym_text_objective_text")
        print("   Dropped old text index")
    except:
        pass  # Index didn't exist, that's fine

    # Create NEW weighted text index for better search relevance
    projects_collection.create_index([
        ("title", "text"),
        ("acronym", "text"),
        ("keywords", "text"),
        ("objective", "text")
    ], weights={
        "title": 10,      # Title matches are most important
        "acronym": 8,     # Acronym second priority
        "keywords": 5,    # Keywords third
        "objective": 2    # Objective least priority (it's long text)
    }, name="search_text_index")
    print("   ✅ Created weighted text search index")

    # Organizations text index
    organizations_collection.create_index(
        [("organization_name", "text"), ("acronym", "text")],
        name="org_text_index"
    )
    print("   ✅ Created organization text index")

    # Other indexes for filtering and sorting
    projects_collection.create_index("startDate")
    projects_collection.create_index("endDate")
    projects_collection.create_index("ecMaxContribution")
    projects_collection.create_index("status")  # Add this for status filtering
    projects_collection.create_index("frameworkProgramme")

    print("✅ Sync completed.")
    return {
        "projects_inserted": len(projects),
        "organizations_inserted": len(organizations),
        "status": "success"
    }

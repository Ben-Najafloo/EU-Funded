# app/routes/stats.py
from flask import Blueprint, jsonify, request
import os
from bson import Decimal128
from pymongo import MongoClient
import re
from pymongo.errors import PyMongoError


mongo_client = MongoClient(os.getenv("MONGOURL"))
db = mongo_client["cordis_db"]
projects_collection = db["projects"]
organizations_collection = db["organizations"]

stats_bp = Blueprint("stats", __name__)


def _parse_float(val):
    if isinstance(val, Decimal128):
        return float(val.to_decimal())
    try:
        return float(str(val).replace(",", "").strip()) if val not in (None, "") else 0.0
    except Exception:
        return 0.0


# Add this decorator to handle MongoDB errors
def handle_mongo_errors(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except PyMongoError as e:
            print(f"MongoDB Error in {func.__name__}: {str(e)}")
            return jsonify({"error": "Database error occurred"}), 500
        except Exception as e:
            print(f"Error in {func.__name__}: {str(e)}")
            return jsonify({"error": "An unexpected error occurred"}), 500
    wrapper.__name__ = func.__name__
    return wrapper


@stats_bp.route("/health")
def health_check():
    try:
        # Test MongoDB connection
        projects_count = projects_collection.count_documents({})
        orgs_count = organizations_collection.count_documents({})
        return jsonify({
            "status": "healthy",
            "projects_count": projects_count,
            "organizations_count": orgs_count
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# 1. Projects by country


@stats_bp.route("/projects_by_country", methods=["GET"])
@handle_mongo_errors
def projects_by_country():
    pipeline = [
        {"$group": {
            "_id": "$country",
            "project_count": {"$addToSet": "$projectID"}
        }},
        {"$project": {
            "country": "$_id",
            "project_count": {"$size": "$project_count"},
            "_id": 0
        }},
        {"$sort": {"project_count": -1}},
        {"$limit": 10}
    ]

    results = list(organizations_collection.aggregate(pipeline))
    return jsonify(results)

# 2. Projects per programme


@stats_bp.route("/projects_per_programme", methods=["GET"])
def projects_per_programme():
    # Use masterCall instead of frameworkProgramme
    pipeline = [
        {"$match": {"masterCall": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": "$masterCall",
            "project_count": {"$sum": 1}
        }},
        {"$project": {
            "programme": "$_id",
            "project_count": 1,
            "_id": 0
        }},
        {"$sort": {"project_count": -1}}
    ]

    results = list(projects_collection.aggregate(pipeline))
    return jsonify(results)

# 3. EU contribution per country


@stats_bp.route("/eu_contribution_per_country", methods=["GET"])
def eu_contribution_per_country():
    pipeline = [
        {"$match": {
            "country": {"$exists": True, "$ne": None},
            "ecContribution": {"$exists": True, "$ne": None, "$ne": ""}
        }},
        {"$addFields": {
            "cleaned_contribution": {
                "$replaceOne": {
                    "input": "$ecContribution",
                    "find": ",",
                    "replacement": "."
                }
            }
        }},
        {"$addFields": {
            "numeric_contribution": {
                "$convert": {
                    "input": "$cleaned_contribution",
                    "to": "double",
                    "onError": 0.0,
                    "onNull": 0.0
                }
            }
        }},
        {"$group": {
            "_id": "$country",
            "total_contribution": {"$sum": "$numeric_contribution"}
        }},
        {"$project": {
            "country": "$_id",
            "total_eu_contribution": "$total_contribution",
            "_id": 0
        }},
        {"$sort": {"total_eu_contribution": -1}},
        {"$limit": 12}
    ]

    results = list(organizations_collection.aggregate(
        pipeline, allowDiskUse=True))
    return jsonify(results)


# 4. Projects over time


@stats_bp.route("/projects_over_time", methods=["GET"])
@handle_mongo_errors
def projects_over_time():
    pipeline = [
        {"$match": {"startDate": {"$exists": True, "$ne": None}}},
        {"$addFields": {
            "year": {"$substr": ["$startDate", 0, 4]}
        }},
        {"$group": {
            "_id": "$year",
            "project_count": {"$sum": 1}
        }},
        {"$project": {
            "year": "$_id",
            "project_count": 1,
            "_id": 0
        }},
        {"$sort": {"year": 1}}
    ]

    results = list(projects_collection.aggregate(pipeline))
    return jsonify(results)

# 5. Top organizations


@stats_bp.route("/top_organizations", methods=["GET"])
def top_organizations():
    limit = request.args.get("limit", 10, type=int)

    try:
        # Use a simple aggregation that's less likely to cause issues
        pipeline = [
            {"$match": {"name": {"$exists": True, "$ne": None}}},
            {"$group": {
                "_id": "$name",
                "project_count": {"$sum": 1}
            }},
            {"$project": {
                "organization": "$_id",
                "project_count": 1,
                "_id": 0
            }},
            {"$sort": {"project_count": -1}},
            {"$limit": limit}
        ]

        results = list(organizations_collection.aggregate(
            pipeline, allowDiskUse=True))
        return jsonify(results)

    except Exception as e:
        # If aggregation fails, fall back to client-side processing
        print(
            f"Aggregation failed, falling back to client-side processing: {str(e)}")

        # Get all organizations and count projects manually
        org_counts = {}
        cursor = organizations_collection.find(
            {"name": {"$exists": True, "$ne": None}},
            {"name": 1, "projectID": 1}
        )

        for org in cursor:
            name = org.get("name")
            if name:
                if name not in org_counts:
                    org_counts[name] = set()
                org_counts[name].add(org.get("projectID"))

        # Convert to list of dicts
        results = [
            {"organization": name, "project_count": len(projects)}
            for name, projects in org_counts.items()
        ]

        # Sort and limit
        results.sort(key=lambda x: x["project_count"], reverse=True)
        results = results[:limit]

        return jsonify(results)

# 6. Top projects by EU contribution


@stats_bp.route("/top_projects_by_eu_contribution", methods=["GET"])
@handle_mongo_errors
def top_projects_by_eu_contribution():
    pipeline = [
        {"$project": {
            "acronym": 1,
            "ecMaxContribution": {"$toDouble": "$ecMaxContribution"},
            "title": 1
        }},
        {"$sort": {"ecMaxContribution": -1}},
        {"$limit": 15},
        {"$project": {
            "acronym": {"$ifNull": ["$acronym", "N/A"]},
            "project_topic": {"$ifNull": ["$title", "N/A"]},
            "eu_contribution": {"$ifNull": ["$ecMaxContribution", 0]},
            "_id": 0
        }}
    ]

    results = list(projects_collection.aggregate(pipeline))
    return jsonify(results)

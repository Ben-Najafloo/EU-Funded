# app/routes/projects/routes.py

from flask import Blueprint, request, jsonify
from pymongo import ASCENDING, DESCENDING
from datetime import datetime
from dateutil.relativedelta import relativedelta
import re

from .base import projects_collection, organizations_collection, db
from .utils import (
    normalize_project,
    serialize_doc,
    convert_objectid,
    enrich_project_with_organizations,
    extract_project_keywords,
    get_trending_keywords,
    get_keyword_suggestions,
    summarize_objective
)

# Create the blueprint
projects_bp = Blueprint("projects", __name__)


# ============================================================================
# LIST ENDPOINTS
# ============================================================================

@projects_bp.route("/", methods=["GET"])
def list_projects():
    """Return first N projects with pagination."""
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("limit", 20))
    skip = (page - 1) * per_page

    cursor = projects_collection.find({}).skip(skip).limit(per_page)
    projects = [normalize_project(doc) for doc in cursor]
    total_count = projects_collection.estimated_document_count()

    return jsonify({
        "page": page,
        "limit": per_page,
        "total": total_count,
        "results": projects
    })


@projects_bp.route("/recent", methods=["GET"])
def get_recent_projects():
    """Get recently started projects."""
    cursor = projects_collection.find({}).sort(
        "startDate", DESCENDING).limit(15)

    projects = []
    for doc in cursor:
        normalized = normalize_project(doc)
        enriched = enrich_project_with_organizations(normalized)
        projects.append(enriched)

    return jsonify(projects)


@projects_bp.route("/closed", methods=["GET"])
def get_closed_projects():
    """Get recently closed projects."""
    cursor = projects_collection.find(
        {"endDate": {"$ne": None}}).sort("endDate", ASCENDING).limit(15)

    projects = []
    for doc in cursor:
        normalized = normalize_project(doc)
        enriched = enrich_project_with_organizations(normalized)
        projects.append(enriched)

    return jsonify(projects)


@projects_bp.route("/expiring_soon", methods=["GET"])
def get_expiring_soon_projects():
    """Get projects expiring within the next 2 months."""
    today = datetime.now().date()
    two_months_later = today + relativedelta(months=2)

    today_str = today.isoformat()
    two_months_later_str = two_months_later.isoformat()

    query = {
        "endDate": {
            "$gte": today_str,
            "$lte": two_months_later_str
        }
    }

    cursor = projects_collection.find(query).sort(
        "endDate", ASCENDING).limit(15)

    projects = []
    for doc in cursor:
        normalized = normalize_project(doc)
        enriched = enrich_project_with_organizations(normalized)
        projects.append(enriched)

    return jsonify(projects)


@projects_bp.route("/all_topics", methods=["GET"])
def get_all_topics():
    """Get all distinct topics."""
    all_topics = db.projects.distinct("topics")
    return jsonify(all_topics)


@projects_bp.route('/all_topics/search', methods=["GET"])
def search_topics():
    """Search topics by query string."""
    query = request.args.get('q', '')
    topics = db.projects.distinct("topics")
    filtered = [p for p in topics if query.lower() in p.lower()]
    return jsonify(filtered[:1000])  # Limit results


# ============================================================================
# SEARCH ENDPOINT
# ============================================================================

@projects_bp.route("/search", methods=["GET"])
def search_projects():
    """Advanced search with text search, filters, and phrase boosting."""
    q = request.args.get("q", "").strip()
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))
    skip = (page - 1) * per_page

    pipeline = []

    # --- TEXT SEARCH WITH CUSTOM PHRASE BOOST ---
    if q:
        # Step 1: Text search
        pipeline.append({
            "$match": {
                "$text": {"$search": q}
            }
        })

        # Step 2: Calculate base text score
        pipeline.append({
            "$addFields": {
                "textScore": {"$meta": "textScore"}
            }
        })

        # Step 3: Add phrase boost
        escaped_q = re.escape(q.lower())
        pipeline.append({
            "$addFields": {
                "titlePhraseBoost": {
                    "$cond": {
                        "if": {
                            "$regexMatch": {
                                "input": {"$toLower": "$title"},
                                "regex": escaped_q
                            }
                        },
                        "then": 100,
                        "else": 0
                    }
                },
                "objectivePhraseBoost": {
                    "$cond": {
                        "if": {
                            "$regexMatch": {
                                "input": {"$toLower": "$objective"},
                                "regex": escaped_q
                            }
                        },
                        "then": 50,
                        "else": 0
                    }
                },
                "keywordsPhraseBoost": {
                    "$cond": {
                        "if": {
                            "$regexMatch": {
                                "input": {"$toLower": {"$ifNull": ["$keywords", ""]}},
                                "regex": escaped_q
                            }
                        },
                        "then": 75,
                        "else": 0
                    }
                }
            }
        })

        # Step 4: Calculate final score
        pipeline.append({
            "$addFields": {
                "finalScore": {
                    "$add": [
                        "$textScore",
                        "$titlePhraseBoost",
                        "$objectivePhraseBoost",
                        "$keywordsPhraseBoost"
                    ]
                }
            }
        })

    # --- Other filters ---
    filters = {}

    project_id = request.args.get("project_id")
    if project_id:
        filters["id"] = {"$regex": re.escape(project_id), "$options": "i"}

    keywords_param = request.args.get("keywords")
    if keywords_param:
        keywords = [k.strip() for k in keywords_param.split(",") if k.strip()]
        if keywords:
            filters["$or"] = [
                {"keywords": {
                    "$regex": rf"\b{re.escape(k)}\b", "$options": "i"}}
                for k in keywords
            ]

    status = request.args.get("status")
    if status:
        filters["status"] = status

    acronym = request.args.get("acronym")
    if acronym:
        filters["acronym"] = {
            "$regex": rf"^{re.escape(acronym)}$", "$options": "i"}

    title = request.args.get("title")
    if title:
        filters["title"] = {"$regex": re.escape(title), "$options": "i"}

    programme = request.args.get("programme")
    if programme:
        filters["frameworkProgramme"] = programme

    topics = request.args.get("topics")
    if topics:
        filters["topics"] = topics

    start_date = request.args.get("start_date")
    if start_date:
        filters["startDate"] = {"$gte": start_date}

    end_date = request.args.get("end_date")
    if end_date:
        filters.setdefault("endDate", {})
        filters["endDate"]["$lte"] = end_date

    min_contribution = request.args.get("min_contribution")
    max_contribution = request.args.get("max_contribution")
    if min_contribution or max_contribution:
        try:
            filters["ecMaxContribution"] = {}
            if min_contribution:
                filters["ecMaxContribution"]["$gte"] = float(min_contribution)
            if max_contribution:
                filters["ecMaxContribution"]["$lte"] = float(max_contribution)
        except ValueError:
            pass

    min_total_cost = request.args.get("min_total_cost")
    max_total_cost = request.args.get("max_total_cost")
    if min_total_cost or max_total_cost:
        try:
            filters["totalCost"] = {}
            if min_total_cost:
                filters["totalCost"]["$gte"] = float(min_total_cost)
            if max_total_cost:
                filters["totalCost"]["$lte"] = float(max_total_cost)
        except ValueError:
            pass

    if filters:
        pipeline.append({"$match": filters})

    # Sort by final score (if text search) or by date
    if q:
        pipeline.append({"$sort": {"finalScore": -1, "startDate": -1}})
    else:
        pipeline.append({"$sort": {"startDate": -1}})

    # Get total count before pagination
    count_pipeline = pipeline.copy()
    count_pipeline.append({"$count": "total"})
    count_result = list(projects_collection.aggregate(count_pipeline))
    total_count = count_result[0]["total"] if count_result else 0

    # Add pagination
    pipeline.append({"$skip": skip})
    pipeline.append({"$limit": per_page})

    # Execute aggregation
    cursor = projects_collection.aggregate(pipeline)
    results = []

    for doc in cursor:
        doc = serialize_doc(doc)
        project_id = doc["id"]

        # Fetch related organizations
        organizations = []
        for org in organizations_collection.find({"projectID": project_id}):
            org_data = serialize_doc(org)
            org_data["project_count"] = organizations_collection.count_documents({
                "organisationID": org_data["organisationID"]
            })
            org_data["coordinator_count"] = organizations_collection.count_documents({
                "organisationID": org_data["organisationID"],
                "role": {"$regex": "^coordinator$", "$options": "i"}
            })
            organizations.append(org_data)

        countries = request.args.get("countries")
        if countries:
            allowed_countries = set(countries.split(","))
            org_countries = {org.get("country") for org in organizations}
            if org_countries.isdisjoint(allowed_countries):
                continue

        coordinator = next(
            (org for org in organizations if org.get(
                "role", "").lower() == "coordinator"),
            None
        )
        organizations = [org for org in organizations if org.get(
            "role", "").lower() != "coordinator"]

        doc["extracted_keywords"] = extract_project_keywords(doc)[:10]

        if request.args.get('include_summary') == 'true' and doc.get("objective"):
            doc["objective_summary"] = summarize_objective(doc["objective"])

        doc["coordinator"] = coordinator
        doc["organizations"] = organizations

        # Include finalScore in the response
        if q and "finalScore" in doc:
            doc["relevance_score"] = round(doc["finalScore"], 2)

        # Clean up intermediate scoring fields
        for field in ["textScore", "titlePhraseBoost", "objectivePhraseBoost", "keywordsPhraseBoost"]:
            doc.pop(field, None)

        results.append(doc)

    return jsonify({
        "projects": results,
        "total": total_count,
        "page": page,
        "pages": (total_count + per_page - 1) // per_page,
        "per_page": per_page
    })

# ============================================================================
# DETAIL ENDPOINTS
# ============================================================================


@projects_bp.route("/<project_id>", methods=["GET"])
def get_project(project_id):
    """Return a single project with its organizations and coordinator."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        return jsonify({"error": "Project not found"}), 404

    project = convert_objectid(project)
    enriched = enrich_project_with_organizations(project)

    # Add enhanced keywords
    enriched["extracted_keywords"] = extract_project_keywords(project)

    # Always provide objective summary data structure
    if project.get("objective"):
        summary = summarize_objective(project["objective"])
        enriched["objective_data"] = {
            "full_text": project["objective"],
            "summary": summary,
            "has_summary": summary is not None,
            "original_length": len(project["objective"]),
            "summary_length": len(summary) if summary else 0,
            "compression_ratio": round(len(summary) / len(project["objective"]) * 100, 1) if summary else 0
        }
    else:
        enriched["objective_data"] = {
            "full_text": None,
            "summary": None,
            "has_summary": False,
            "original_length": 0,
            "summary_length": 0,
            "compression_ratio": 0
        }

    return jsonify(enriched)


@projects_bp.route("/<project_id>/summary", methods=["GET"])
def get_project_summary(project_id):
    """Generate AI summary for a project's objective."""
    try:
        project = projects_collection.find_one({"id": project_id})
        if not project:
            return jsonify({"error": "Project not found"}), 404

        objective = project.get("objective")
        if not objective:
            return jsonify({"error": "No objective available"}), 404

        summary = summarize_objective(objective)

        return jsonify({
            "project_id": project_id,
            "original_length": len(objective),
            "summary_length": len(summary) if summary else 0,
            "summary": summary,
            "success": summary is not None
        })

    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


# ============================================================================
# KEYWORD ENDPOINTS
# ============================================================================

@projects_bp.route("/keywords/trending", methods=["GET"])
def get_trending_keywords_endpoint():
    """Get most popular keywords across projects."""
    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        keywords = get_trending_keywords(limit)
        return jsonify({
            "keywords": keywords,
            "total": len(keywords)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_bp.route("/keywords/suggestions", methods=["GET"])
def get_keyword_suggestions_endpoint():
    """Get keyword suggestions for autocomplete."""
    try:
        query = request.args.get("q", "")
        limit = min(int(request.args.get("limit", 10)), 20)
        suggestions = get_keyword_suggestions(query, limit)
        return jsonify({
            "suggestions": suggestions,
            "query": query
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_bp.route("/<project_id>/keywords", methods=["GET"])
def get_project_keywords_endpoint(project_id):
    """Get extracted keywords for a specific project."""
    try:
        project = projects_collection.find_one({"id": project_id})
        if not project:
            return jsonify({"error": "Project not found"}), 404

        keywords = extract_project_keywords(project)
        return jsonify({
            "project_id": project_id,
            "keywords": keywords,
            "total": len(keywords)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# STATISTICS ENDPOINTS
# ============================================================================

@projects_bp.route("/statistics/summary", methods=["GET"])
def get_project_statistics():
    """Return summary statistics for the projects database."""
    try:
        total_projects = projects_collection.count_documents({})

        status_counts = {}
        statuses = ["SIGNED", "CLOSED", "TERMINATED", "ONGOING"]

        for status in statuses:
            count = projects_collection.count_documents({"status": status})
            status_counts[status.lower()] = count

        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_contribution": {
                        "$sum": {
                            "$convert": {
                                "input": "$ecMaxContribution",
                                "to": "double",
                                "onError": 0,
                                "onNull": 0
                            }
                        }
                    }
                }
            }
        ]

        contribution_result = list(projects_collection.aggregate(pipeline))
        total_contribution = contribution_result[0]["total_contribution"] if contribution_result else 0

        country_count = len(organizations_collection.distinct("country"))

        org_count = organizations_collection.count_documents({})

        return jsonify({
            "total_projects": total_projects,
            "status_counts": status_counts,
            "total_contribution": total_contribution,
            "countries_involved": country_count,
            "organizations_count": org_count
        })

    except Exception as e:
        print(f"Error generating statistics: {str(e)}")
        return jsonify({"error": "Could not generate statistics"}), 500

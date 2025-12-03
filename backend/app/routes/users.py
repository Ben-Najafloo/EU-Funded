from flask import Blueprint, jsonify, g, request
from app.middleware.clerk import require_auth
from app.models import UserModel
from pymongo import MongoClient
import os
import re
from datetime import datetime

users_bp = Blueprint('users', __name__)

# for history / favorite projects
mongo_client = MongoClient(os.getenv("MONGOURL"))
db = mongo_client["cordis_db"]
projects_collection = db["projects"]
organizations_collection = db["organizations"]


def _parse_float(val):
    """Parse float values from various formats."""
    try:
        return float(str(val).replace(",", "").strip()) if val not in (None, "") else 0.0
    except Exception:
        return 0.0


def _parse_date(val):
    """Parse date values to ISO format."""
    if not val:
        return None
    try:
        return datetime.strptime(val, "%Y-%m-%d").date().isoformat()
    except Exception:
        return None


def serialize_doc(doc):
    """Convert MongoDB document ObjectId to string."""
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


def enrich_project_with_organizations(project):
    """
    Fetch organizations and coordinator for a project.
    Similar to the logic in projects/routes.py
    """
    project_id = project.get("id")
    if not project_id:
        return project

    # Fetch all organizations for this project
    organizations = []
    for org in organizations_collection.find({"projectID": project_id}):
        org_data = serialize_doc(org)

        # Add project count and coordinator count for this organization
        org_data["project_count"] = organizations_collection.count_documents({
            "organisationID": org_data.get("organisationID")
        })
        org_data["coordinator_count"] = organizations_collection.count_documents({
            "organisationID": org_data.get("organisationID"),
            "role": {"$regex": "^coordinator$", "$options": "i"}
        })

        organizations.append(org_data)

    # Find the coordinator
    coordinator = next(
        (org for org in organizations if org.get(
            "role", "").lower() == "coordinator"),
        None
    )

    # Filter out coordinator from organizations list
    other_organizations = [
        org for org in organizations
        if org.get("role", "").lower() != "coordinator"
    ]

    # Add to project
    project["coordinator"] = coordinator
    project["organizations"] = other_organizations

    return project


def normalize_project(doc):
    """Convert MongoDB document to API response format with correct types."""
    return {
        "id": doc.get("id"),
        "acronym": doc.get("acronym"),
        "title": doc.get("title"),
        "status": doc.get("status"),
        "start_date": _parse_date(doc.get("startDate")),
        "end_date": _parse_date(doc.get("endDate")),
        "eu_contribution": _parse_float(doc.get("ecMaxContribution")),
    }


@users_bp.route('/test-auth', methods=['GET'])
@require_auth
def test_auth():
    """Test route to verify Clerk authentication is working"""
    return jsonify({
        "message": "Authentication successful!",
        "clerk_user_id": g.clerk_user_id,
        "user_id": str(g.user.get('_id')),
        "email": g.user.get('email'),
        "created_at": g.user.get('createdAt').isoformat() if g.user.get('createdAt') else None
    }), 200


@users_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current authenticated user's data"""
    user = dict(g.user)
    user['_id'] = str(user['_id'])

    # Convert datetime objects to ISO format
    if user.get('createdAt'):
        user['createdAt'] = user['createdAt'].isoformat()
    if user.get('updatedAt'):
        user['updatedAt'] = user['updatedAt'].isoformat()

    return jsonify(user), 200


@users_bp.route('/history/projects', methods=['GET'])
@require_auth
def get_history_projects():
    limit = request.args.get('limit', 20, type=int)
    user_model = UserModel()

    history = user_model.get_history(g.clerk_user_id, limit)
    project_ids = [entry['projectId'] for entry in history]

    if not project_ids:
        return jsonify({"projects": []}), 200

    projects = []
    for project_doc in projects_collection.find({"id": {"$in": project_ids}}):
        normalized = normalize_project(project_doc)
        projects.append({
            "id": normalized["id"],
            "acronym": normalized["acronym"],
            "title": normalized["title"]
        })

    project_map = {proj["id"]: proj for proj in projects}
    ordered_projects = []

    for history_entry in history:
        project_id = history_entry['projectId']
        if project_id in project_map:
            project_data = project_map[project_id].copy()
            project_data["openedAt"] = history_entry['openedAt'].isoformat(
            ) if history_entry.get('openedAt') else None
            ordered_projects.append(project_data)

    return jsonify({"projects": ordered_projects}), 200


@users_bp.route('/favorite/projects', methods=['GET'])
@require_auth
def get_favorite_projects():
    """Get favorite projects with full details including organizations and coordinator."""
    user_model = UserModel()

    # get_favorites returns a list of project IDs (strings)
    project_ids = user_model.get_favorites(g.clerk_user_id)

    if not project_ids:
        return jsonify({"projects": []}), 200

    projects = []
    for project_doc in projects_collection.find({"id": {"$in": project_ids}}):
        # Convert ObjectId to string
        project = serialize_doc(project_doc)

        # Enrich with organizations and coordinator
        enriched_project = enrich_project_with_organizations(project)

        projects.append(enriched_project)

    return jsonify({"projects": projects}), 200


@users_bp.route('/favorites', methods=['GET'])
@require_auth
def get_favorites():
    """Get user's favorite project IDs"""
    user_model = UserModel()
    favorites = user_model.get_favorites(g.clerk_user_id)
    return jsonify({"favorites": favorites}), 200


@users_bp.route('/favorites/<project_id>', methods=['POST'])
@require_auth
def add_favorite(project_id):
    """Add a project to user's favorites"""
    user_model = UserModel()
    result = user_model.add_favorite(g.clerk_user_id, project_id)

    if result.modified_count > 0 or result.matched_count > 0:
        return jsonify({
            "message": "Added to favorites",
            "projectId": project_id
        }), 200
    else:
        return jsonify({"error": "Failed to add favorite"}), 500


@users_bp.route('/favorites/<project_id>', methods=['DELETE'])
@require_auth
def remove_favorite(project_id):
    """Remove a project from user's favorites"""
    user_model = UserModel()
    result = user_model.remove_favorite(g.clerk_user_id, project_id)

    if result.modified_count > 0 or result.matched_count > 0:
        return jsonify({
            "message": "Removed from favorites",
            "projectId": project_id
        }), 200
    else:
        return jsonify({"error": "Failed to remove favorite"}), 500


@users_bp.route('/history', methods=['GET'])
@require_auth
def get_history():
    """Get user's project history"""
    limit = request.args.get('limit', 20, type=int)
    user_model = UserModel()
    history = user_model.get_history(g.clerk_user_id, limit)

    # Convert datetime objects to ISO format
    for entry in history:
        if 'openedAt' in entry and entry['openedAt']:
            entry['openedAt'] = entry['openedAt'].isoformat()

    return jsonify({"history": history}), 200


@users_bp.route('/history/<project_id>', methods=['POST'])
@require_auth
def add_to_history(project_id):
    """Add a project to user's history (when user opens/views it)"""
    user_model = UserModel()
    result = user_model.add_history(g.clerk_user_id, project_id)

    if result.modified_count > 0 or result.matched_count > 0:
        return jsonify({
            "message": "Added to history",
            "projectId": project_id
        }), 200
    else:
        return jsonify({"error": "Failed to add to history"}), 500


@users_bp.route('/preferences', methods=['GET'])
@require_auth
def get_preferences():
    """Get user's preferences"""
    user_model = UserModel()
    preferences = user_model.get_preferences(g.clerk_user_id)
    return jsonify({"preferences": preferences}), 200


@users_bp.route('/preferences', methods=['PUT'])
@require_auth
def update_preferences():
    """Update user's preferences"""
    data = request.get_json()

    if not data or 'preferences' not in data:
        return jsonify({"error": "Missing 'preferences' in request body"}), 400

    preferences = data['preferences']

    # Validate preferences structure (optional but recommended)
    if not isinstance(preferences, dict):
        return jsonify({"error": "Preferences must be an object"}), 400

    user_model = UserModel()
    result = user_model.update_preferences(g.clerk_user_id, preferences)

    if result.modified_count > 0 or result.matched_count > 0:
        return jsonify({
            "message": "Preferences updated successfully",
            "preferences": preferences
        }), 200
    else:
        return jsonify({"error": "Failed to update preferences"}), 500


@users_bp.route('/favorites', methods=['DELETE'])
@require_auth
def delete_all_favorites():
    """Delete all favorites"""
    user_model = UserModel()
    result = user_model.delete_all_favorites(g.clerk_user_id)

    if result.modified_count > 0 or result.matched_count > 0:
        return jsonify({"message": "All favorites deleted"}), 200
    else:
        return jsonify({"error": "Failed to delete favorites"}), 500


@users_bp.route('/favorites/reorder', methods=['PUT'])
@require_auth
def reorder_favorites():
    """Reorder favorites with new array order"""
    data = request.get_json()

    if not data or 'favorites' not in data:
        return jsonify({"error": "Missing 'favorites' array in request body"}), 400

    new_order = data['favorites']

    if not isinstance(new_order, list):
        return jsonify({"error": "Favorites must be an array"}), 400

    user_model = UserModel()
    result = user_model.reorder_favorites(g.clerk_user_id, new_order)

    if result.modified_count > 0 or result.matched_count > 0:
        return jsonify({
            "message": "Favorites reordered successfully",
            "favorites": new_order
        }), 200
    else:
        return jsonify({"error": "Failed to reorder favorites"}), 500


@users_bp.route('/history', methods=['DELETE'])
@require_auth
def delete_all_history():
    """Delete all history"""
    user_model = UserModel()
    result = user_model.delete_all_history(g.clerk_user_id)

    if result.modified_count > 0 or result.matched_count > 0:
        return jsonify({"message": "All history deleted"}), 200
    else:
        return jsonify({"error": "Failed to delete history"}), 500


@users_bp.route('/history/<project_id>', methods=['DELETE'])
@require_auth
def delete_history_item(project_id):
    """Delete a specific project from history"""
    user_model = UserModel()
    result = user_model.delete_history_item(g.clerk_user_id, project_id)

    if result.modified_count > 0 or result.matched_count > 0:
        return jsonify({
            "message": "Project removed from history",
            "projectId": project_id
        }), 200
    else:
        return jsonify({"error": "Failed to remove from history"}), 500


@users_bp.route('/preferences/recommended-projects', methods=['GET'])
@require_auth
def get_recommended_projects():
    """Get project recommendations based on user preferences - searches title, objective, and keywords."""
    user_model = UserModel()
    preferences = user_model.get_preferences(g.clerk_user_id)

    if not preferences:
        return jsonify({
            "projects": [],
            "message": "No preferences found. Please set your preferences first.",
            "has_preferences": False
        }), 200

    limit = int(request.args.get('limit', 20))
    user_topics = preferences.get('topics', [])

    # Handle both string and array formats
    if isinstance(user_topics, str):
        user_topics = [t.strip() for t in user_topics.split(',') if t.strip()]

    if not user_topics or len(user_topics) == 0:
        return jsonify({
            "projects": [],
            "message": "No topics in preferences. Please add topics to get recommendations.",
            "has_preferences": True,
            "preferences": preferences
        }), 200

    # Build query to search in title, objective, and keywords
    # For each user topic, search across multiple fields
    or_conditions = []

    for topic in user_topics:
        escaped_topic = re.escape(topic)
        # Search in title, objective, and keywords (case-insensitive, word boundary)
        or_conditions.extend([
            {"title": {"$regex": f"\\b{escaped_topic}\\b", "$options": "i"}},
            {"objective": {"$regex": f"\\b{escaped_topic}\\b", "$options": "i"}},
            {"keywords": {"$regex": f"\\b{escaped_topic}\\b", "$options": "i"}}
        ])

    query = {"$or": or_conditions}

    # Execute query with sorting
    cursor = projects_collection.find(query).sort("startDate", -1).limit(limit)
    projects = list(cursor)

    # Normalize projects and add match information
    normalized_projects = []
    for doc in projects:
        normalized = normalize_project(doc)

        # Determine which topics matched and where
        matched_info = []
        for topic in user_topics:
            topic_lower = topic.lower()
            matched_in = []

            if normalized.get("title") and topic_lower in normalized["title"].lower():
                matched_in.append("title")
            if normalized.get("objective") and topic_lower in normalized["objective"].lower():
                matched_in.append("objective")
            if normalized.get("keywords") and topic_lower in normalized["keywords"].lower():
                matched_in.append("keywords")

            if matched_in:
                matched_info.append({
                    "topic": topic,
                    "matched_in": matched_in
                })

        normalized["matchedTopics"] = [m["topic"] for m in matched_info]
        normalized["matchDetails"] = matched_info
        normalized_projects.append(normalized)

    return jsonify({
        "projects": normalized_projects,
        "total": len(normalized_projects),
        "user_topics": user_topics,
        "has_preferences": True,
        "searched_fields": ["title", "objective", "keywords"]
    }), 200

# @users_bp.route('/preferences/debug', methods=['GET'])
# @require_auth
# def debug_preferences():
#     """Debug endpoint to check preferences and matching."""
#     user_model = UserModel()
#     preferences = user_model.get_preferences(g.clerk_user_id)

#     # Get user's topics
#     user_topics = preferences.get('topics', []) if preferences else []

#     # Handle string format
#     if isinstance(user_topics, str):
#         user_topics = [t.strip() for t in user_topics.split(',') if t.strip()]

#     # Sample some topics from database
#     all_topics = db.projects.distinct("topics")
#     sample_topics = all_topics[:20] if all_topics else []

#     # Try to find ANY project with topics
#     sample_project = db.projects.find_one(
#         {"topics": {"$exists": True, "$ne": []}})

#     # Count projects matching each user topic
#     topic_matches = {}
#     if user_topics:
#         for topic in user_topics:
#             # Try exact match
#             exact_count = projects_collection.count_documents(
#                 {"topics": topic})
#             # Try case-insensitive match
#             regex_count = projects_collection.count_documents({
#                 "topics": {"$regex": f"^{re.escape(topic)}$", "$options": "i"}
#             })
#             topic_matches[topic] = {
#                 "exact_match": exact_count,
#                 "case_insensitive_match": regex_count
#             }

#     return jsonify({
#         "user_preferences": preferences,
#         "user_topics": user_topics,
#         "user_topics_type": type(preferences.get('topics', [])).__name__ if preferences else None,
#         "sample_database_topics": sample_topics,
#         "sample_project_topics": sample_project.get("topics") if sample_project else None,
#         "topic_match_counts": topic_matches,
#         "total_projects_with_topics": projects_collection.count_documents({"topics": {"$exists": True, "$ne": []}})
#     }), 200

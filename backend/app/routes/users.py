from flask import Blueprint, jsonify, g, request
from app.middleware.clerk import require_auth
from app.models import UserModel
from pymongo import MongoClient
import os

users_bp = Blueprint('users', __name__)

# for history / favorite projects
mongo_client = MongoClient(os.getenv("MONGOURL"))
db = mongo_client["cordis_db"]
projects_collection = db["projects"]


def normalize_project(doc):
    """Convert MongoDB document to API response format with correct types."""
    return {
        "id": doc.get("id"),
        "acronym": doc.get("acronym"),
        "title": doc.get("title")
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
    user_model = UserModel()

    # get_favorites returns a list of project IDs (strings)
    project_ids = user_model.get_favorites(g.clerk_user_id)

    if not project_ids:
        return jsonify({"projects": []}), 200

    projects = []
    for project_doc in projects_collection.find({"id": {"$in": project_ids}}):
        normalized = normalize_project(project_doc)
        projects.append({
            "id": normalized["id"],
            "acronym": normalized["acronym"],
            "title": normalized["title"],
        })

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

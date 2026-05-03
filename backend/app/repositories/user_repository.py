"""
User repository — all MongoDB operations for user data.
"""
import re
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorCollection

from app.utils.serializers import normalize_project, serialize_doc

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def get_or_create_user(col: AsyncIOMotorCollection, clerk_user_id: str, email: str | None) -> dict:
    user = await col.find_one({"clerkUserId": clerk_user_id})
    if not user:
        now = _now()
        data = {
            "clerkUserId": clerk_user_id,
            "email": email,
            "favorites": [],
            "history": [],
            "preferences": {"topics": [], "funding_types": []},
            "createdAt": now,
            "updatedAt": now,
        }
        result = await col.insert_one(data)
        user = await col.find_one({"_id": result.inserted_id})
    elif email and user.get("email") != email:
        await col.update_one(
            {"clerkUserId": clerk_user_id},
            {"$set": {"email": email, "updatedAt": _now()}},
        )
        user["email"] = email
    return user


async def get_favorites(col: AsyncIOMotorCollection, clerk_user_id: str) -> list[str]:
    user = await col.find_one({"clerkUserId": clerk_user_id}, {"favorites": 1})
    return (user or {}).get("favorites", [])


async def add_favorite(col: AsyncIOMotorCollection, clerk_user_id: str, project_id: str) -> bool:
    result = await col.update_one(
        {"clerkUserId": clerk_user_id},
        {"$addToSet": {"favorites": project_id}, "$set": {"updatedAt": _now()}},
    )
    return result.matched_count > 0


async def remove_favorite(col: AsyncIOMotorCollection, clerk_user_id: str, project_id: str) -> bool:
    result = await col.update_one(
        {"clerkUserId": clerk_user_id},
        {"$pull": {"favorites": project_id}, "$set": {"updatedAt": _now()}},
    )
    return result.matched_count > 0


async def delete_all_favorites(col: AsyncIOMotorCollection, clerk_user_id: str) -> bool:
    result = await col.update_one(
        {"clerkUserId": clerk_user_id},
        {"$set": {"favorites": [], "updatedAt": _now()}},
    )
    return result.matched_count > 0


async def reorder_favorites(col: AsyncIOMotorCollection, clerk_user_id: str, new_order: list[str]) -> bool:
    result = await col.update_one(
        {"clerkUserId": clerk_user_id},
        {"$set": {"favorites": new_order, "updatedAt": _now()}},
    )
    return result.matched_count > 0


async def get_history(col: AsyncIOMotorCollection, clerk_user_id: str, limit: int = 20) -> list[dict]:
    user = await col.find_one(
        {"clerkUserId": clerk_user_id},
        {"history": {"$slice": limit}},
    )
    history = (user or {}).get("history", [])
    for entry in history:
        if isinstance(entry.get("openedAt"), datetime):
            entry["openedAt"] = entry["openedAt"].isoformat()
    return history


async def add_history(col: AsyncIOMotorCollection, clerk_user_id: str, project_id: str) -> bool:
    entry = {"projectId": project_id, "openedAt": _now()}
    result = await col.update_one(
        {"clerkUserId": clerk_user_id},
        {"$push": {"history": {"$each": [entry], "$position": 0, "$slice": 50}},
         "$set": {"updatedAt": _now()}},
    )
    return result.matched_count > 0


async def delete_all_history(col: AsyncIOMotorCollection, clerk_user_id: str) -> bool:
    result = await col.update_one(
        {"clerkUserId": clerk_user_id},
        {"$set": {"history": [], "updatedAt": _now()}},
    )
    return result.matched_count > 0


async def delete_history_item(col: AsyncIOMotorCollection, clerk_user_id: str, project_id: str) -> bool:
    result = await col.update_one(
        {"clerkUserId": clerk_user_id},
        {"$pull": {"history": {"projectId": project_id}}, "$set": {"updatedAt": _now()}},
    )
    return result.matched_count > 0


async def get_preferences(col: AsyncIOMotorCollection, clerk_user_id: str) -> dict:
    user = await col.find_one({"clerkUserId": clerk_user_id}, {"preferences": 1})
    return (user or {}).get("preferences", {})


async def update_preferences(col: AsyncIOMotorCollection, clerk_user_id: str, preferences: dict) -> bool:
    result = await col.update_one(
        {"clerkUserId": clerk_user_id},
        {"$set": {"preferences": preferences, "updatedAt": _now()}},
    )
    return result.matched_count > 0


async def get_favorite_projects(
    users_col: AsyncIOMotorCollection,
    projects_col: AsyncIOMotorCollection,
    orgs_col: AsyncIOMotorCollection,
    clerk_user_id: str,
) -> list[dict]:
    from app.repositories.project_repository import _org_lookup_pipeline, _shape_orgs
    project_ids = await get_favorites(users_col, clerk_user_id)
    if not project_ids:
        return []

    pipeline = [
        {"$match": {"id": {"$in": project_ids}}},
        *_org_lookup_pipeline(),
    ]
    docs = await projects_col.aggregate(pipeline).to_list(length=len(project_ids))

    results = []
    doc_map = {d.get("id"): d for d in docs}
    for pid in project_ids:
        doc = doc_map.get(pid)
        if doc:
            doc = serialize_doc(doc)
            coordinator, participants = _shape_orgs(doc.get("_orgs_raw", []))
            doc["coordinator"] = coordinator
            doc["organizations"] = participants
            doc.pop("_orgs_raw", None)
            results.append(doc)
    return results


async def get_history_projects(
    users_col: AsyncIOMotorCollection,
    projects_col: AsyncIOMotorCollection,
    clerk_user_id: str,
    limit: int = 20,
) -> list[dict]:
    history = await get_history(users_col, clerk_user_id, limit)
    if not history:
        return []

    project_ids = [e["projectId"] for e in history]
    docs = await projects_col.find(
        {"id": {"$in": project_ids}},
        {"id": 1, "acronym": 1, "title": 1},
    ).to_list(length=limit)

    doc_map = {d["id"]: d for d in docs}
    results = []
    for entry in history:
        pid = entry["projectId"]
        doc = doc_map.get(pid)
        if doc:
            results.append({
                "id": doc.get("id"),
                "acronym": doc.get("acronym"),
                "title": doc.get("title"),
                "openedAt": entry.get("openedAt"),
            })
    return results


async def get_recommended_projects(
    users_col: AsyncIOMotorCollection,
    projects_col: AsyncIOMotorCollection,
    clerk_user_id: str,
    limit: int = 20,
) -> dict:
    preferences = await get_preferences(users_col, clerk_user_id)
    if not preferences:
        return {"projects": [], "message": "No preferences found. Please set your preferences first.",
                "has_preferences": False, "total": 0, "user_topics": [], "searched_fields": []}

    user_topics = preferences.get("topics", [])
    if isinstance(user_topics, str):
        user_topics = [t.strip() for t in user_topics.split(",") if t.strip()]

    if not user_topics:
        return {"projects": [], "message": "No topics in preferences. Please add topics to get recommendations.",
                "has_preferences": True, "preferences": preferences, "total": 0,
                "user_topics": [], "searched_fields": []}

    or_conditions = []
    for topic in user_topics:
        escaped = re.escape(topic)
        or_conditions.extend([
            {"title": {"$regex": f"\\b{escaped}\\b", "$options": "i"}},
            {"objective": {"$regex": f"\\b{escaped}\\b", "$options": "i"}},
            {"keywords": {"$regex": f"\\b{escaped}\\b", "$options": "i"}},
        ])

    docs = await projects_col.find({"$or": or_conditions}).sort("startDate", -1).limit(limit).to_list(length=limit)

    projects = []
    for doc in docs:
        normalized = normalize_project(doc)
        matched_info = []
        for topic in user_topics:
            tl = topic.lower()
            matched_in = []
            if normalized.get("title") and tl in (normalized["title"] or "").lower():
                matched_in.append("title")
            if normalized.get("objective") and tl in (normalized["objective"] or "").lower():
                matched_in.append("objective")
            if normalized.get("keywords") and tl in (normalized["keywords"] or "").lower():
                matched_in.append("keywords")
            if matched_in:
                matched_info.append({"topic": topic, "matched_in": matched_in})

        normalized["matchedTopics"] = [m["topic"] for m in matched_info]
        normalized["matchDetails"] = matched_info
        projects.append(normalized)

    return {
        "projects": projects,
        "total": len(projects),
        "user_topics": user_topics,
        "has_preferences": True,
        "searched_fields": ["title", "objective", "keywords"],
    }

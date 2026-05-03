from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Any
from app.core.dependencies import CurrentUser, UsersCol, ProjectsCol, OrgsCol
from app.repositories import user_repository as repo
from app.utils.serializers import serialize_doc

router = APIRouter(prefix="/api/users", tags=["users"])


class FavoritesReorderRequest(BaseModel):
    favorites: list[str]


class PreferencesUpdateRequest(BaseModel):
    preferences: dict[str, Any]


def _serialize_user(user: dict) -> dict:
    u = serialize_doc(dict(user))
    if hasattr(u.get("createdAt"), "isoformat"):
        u["createdAt"] = u["createdAt"].isoformat()
    if hasattr(u.get("updatedAt"), "isoformat"):
        u["updatedAt"] = u["updatedAt"].isoformat()
    return u


@router.get("/test-auth")
async def test_auth(current_user: CurrentUser):
    return {
        "message": "Authentication successful!",
        "clerk_user_id": current_user.get("clerkUserId"),
        "user_id": str(current_user.get("_id")),
        "email": current_user.get("email"),
        "created_at": current_user.get("createdAt").isoformat() if current_user.get("createdAt") else None,
    }


@router.get("/me")
async def get_current_user(current_user: CurrentUser):
    return _serialize_user(current_user)


@router.get("/favorites")
async def get_favorites(current_user: CurrentUser, users: UsersCol):
    favorites = await repo.get_favorites(users, current_user["clerkUserId"])
    return {"favorites": favorites}


@router.get("/favorite/projects")
async def get_favorite_projects(
    current_user: CurrentUser,
    users: UsersCol,
    projects: ProjectsCol,
    orgs: OrgsCol,
):
    result = await repo.get_favorite_projects(users, projects, orgs, current_user["clerkUserId"])
    return {"projects": result}


@router.post("/favorites/{project_id}")
async def add_favorite(project_id: str, current_user: CurrentUser, users: UsersCol):
    ok = await repo.add_favorite(users, current_user["clerkUserId"], project_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to add favorite")
    return {"message": "Added to favorites", "projectId": project_id}


@router.delete("/favorites/reorder")
async def _reorder_conflict():
    # Disambiguate route — this path is unreachable; reorder uses PUT below
    raise HTTPException(status_code=405)


@router.put("/favorites/reorder")
async def reorder_favorites(body: FavoritesReorderRequest, current_user: CurrentUser, users: UsersCol):
    ok = await repo.reorder_favorites(users, current_user["clerkUserId"], body.favorites)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to reorder favorites")
    return {"message": "Favorites reordered successfully", "favorites": body.favorites}


@router.delete("/favorites/{project_id}")
async def remove_favorite(project_id: str, current_user: CurrentUser, users: UsersCol):
    ok = await repo.remove_favorite(users, current_user["clerkUserId"], project_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to remove favorite")
    return {"message": "Removed from favorites", "projectId": project_id}


@router.delete("/favorites")
async def delete_all_favorites(current_user: CurrentUser, users: UsersCol):
    ok = await repo.delete_all_favorites(users, current_user["clerkUserId"])
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete favorites")
    return {"message": "All favorites deleted"}


@router.get("/history")
async def get_history(
    current_user: CurrentUser,
    users: UsersCol,
    limit: int = Query(20, ge=1, le=100),
):
    history = await repo.get_history(users, current_user["clerkUserId"], limit)
    return {"history": history}


@router.get("/history/projects")
async def get_history_projects(
    current_user: CurrentUser,
    users: UsersCol,
    projects: ProjectsCol,
    limit: int = Query(20, ge=1, le=100),
):
    result = await repo.get_history_projects(users, projects, current_user["clerkUserId"], limit)
    return {"projects": result}


@router.post("/history/{project_id}")
async def add_to_history(project_id: str, current_user: CurrentUser, users: UsersCol):
    ok = await repo.add_history(users, current_user["clerkUserId"], project_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to add to history")
    return {"message": "Added to history", "projectId": project_id}


@router.delete("/history/{project_id}")
async def delete_history_item(project_id: str, current_user: CurrentUser, users: UsersCol):
    ok = await repo.delete_history_item(users, current_user["clerkUserId"], project_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to remove from history")
    return {"message": "Project removed from history", "projectId": project_id}


@router.delete("/history")
async def delete_all_history(current_user: CurrentUser, users: UsersCol):
    ok = await repo.delete_all_history(users, current_user["clerkUserId"])
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete history")
    return {"message": "All history deleted"}


@router.get("/preferences")
async def get_preferences(current_user: CurrentUser, users: UsersCol):
    prefs = await repo.get_preferences(users, current_user["clerkUserId"])
    return {"preferences": prefs}


@router.put("/preferences")
async def update_preferences(
    body: PreferencesUpdateRequest,
    current_user: CurrentUser,
    users: UsersCol,
):
    ok = await repo.update_preferences(users, current_user["clerkUserId"], body.preferences)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update preferences")
    return {"message": "Preferences updated successfully", "preferences": body.preferences}


@router.get("/preferences/recommended-projects")
async def get_recommended_projects(
    current_user: CurrentUser,
    users: UsersCol,
    projects: ProjectsCol,
    limit: int = Query(20, ge=1, le=100),
):
    return await repo.get_recommended_projects(users, projects, current_user["clerkUserId"], limit)

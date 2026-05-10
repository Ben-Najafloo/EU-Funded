"""
Shared FastAPI dependencies injected via Depends().
Routes never import Motor or touch the DB directly — they use these.
"""
from typing import Annotated, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorCollection

from app.database import (
    get_projects_collection,
    get_organizations_collection,
    get_users_collection,
)
from app.core.security import verify_clerk_token
from app.core.exceptions import AuthenticationError

bearer_scheme = HTTPBearer(auto_error=False)


# ── Collection dependencies ──────────────────────────────────────────────────

def get_projects_col() -> AsyncIOMotorCollection:
    return get_projects_collection()


def get_orgs_col() -> AsyncIOMotorCollection:
    return get_organizations_collection()


def get_users_col() -> AsyncIOMotorCollection:
    return get_users_collection()


# Type aliases for cleaner route signatures
ProjectsCol = Annotated[AsyncIOMotorCollection, Depends(get_projects_col)]
OrgsCol = Annotated[AsyncIOMotorCollection, Depends(get_orgs_col)]
UsersCol = Annotated[AsyncIOMotorCollection, Depends(get_users_col)]


# ── Auth dependencies ────────────────────────────────────────────────────────

async def _extract_token_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Verify Bearer token and return decoded JWT payload. Raises 401 on failure."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return await verify_clerk_token(credentials.credentials)
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    payload: Annotated[dict, Depends(_extract_token_payload)],
    users: UsersCol,
) -> dict[str, Any]:
    """
    Resolve JWT → MongoDB user document.
    Creates the user on first login (get-or-create).
    Injects the full user dict into the route — equivalent to Flask's g.user.
    """
    clerk_user_id: str = payload.get("sub", "")
    email: str | None = payload.get("email")

    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

    user = await users.find_one({"clerkUserId": clerk_user_id})

    if not user:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        user_data = {
            "clerkUserId": clerk_user_id,
            "email": email,
            "favorites": [],
            "history": [],
            "preferences": {"topics": [], "funding_types": []},
            "createdAt": now,
            "updatedAt": now,
        }
        result = await users.insert_one(user_data)
        user = await users.find_one({"_id": result.inserted_id})
    elif email and user.get("email") != email:
        from datetime import datetime, timezone
        await users.update_one(
            {"clerkUserId": clerk_user_id},
            {"$set": {"email": email, "updatedAt": datetime.now(timezone.utc)}},
        )
        user["email"] = email

    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    users: UsersCol = Depends(get_users_col),
) -> dict[str, Any] | None:
    """
    Like get_current_user but returns None instead of raising 401.
    Use for routes that work with or without authentication.
    """
    if credentials is None:
        return None
    try:
        payload = await verify_clerk_token(credentials.credentials)
        return await get_current_user(payload, users)
    except Exception:
        return None


# Type aliases
CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
OptionalUser = Annotated[dict[str, Any] | None, Depends(get_optional_user)]

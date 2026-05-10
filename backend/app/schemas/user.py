from pydantic import BaseModel
from typing import Any


class UserResponse(BaseModel):
    model_config = {"extra": "allow"}


class FavoritesReorderRequest(BaseModel):
    favorites: list[str]


class PreferencesUpdateRequest(BaseModel):
    preferences: dict[str, Any]


class HistoryEntry(BaseModel):
    projectId: str
    openedAt: str | None = None


class HistoryResponse(BaseModel):
    history: list[Any]


class FavoritesResponse(BaseModel):
    favorites: list[str]


class ProjectsListResponse(BaseModel):
    projects: list[Any]


class RecommendedProjectsResponse(BaseModel):
    projects: list[Any]
    total: int
    user_topics: list[str]
    has_preferences: bool
    searched_fields: list[str]
    message: str | None = None

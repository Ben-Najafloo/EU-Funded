from pydantic import BaseModel, field_validator
from typing import Any


class ProjectBase(BaseModel):
    id: str | None = None
    acronym: str | None = None
    title: str | None = None
    status: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    total_cost: float = 0.0
    eu_contribution: float = 0.0
    legal_basis: str | None = None
    topics: Any = None
    programme: str | None = None
    objective: str | None = None
    signature_date: str | None = None
    keywords: str | None = None


class OrganizationEmbed(BaseModel):
    """Organization as embedded in a project response — matches Flask output exactly."""
    model_config = {"extra": "allow"}


class ObjectiveData(BaseModel):
    full_text: str | None = None
    summary: str | None = None
    has_summary: bool = False
    original_length: int = 0
    summary_length: int = 0
    compression_ratio: float = 0.0


class ProjectDetail(ProjectBase):
    """Full project with orgs, coordinator, keywords — used by GET /{project_id}."""
    coordinator: Any = None
    organizations: list[Any] = []
    extracted_keywords: list[str] = []
    objective_data: ObjectiveData | None = None
    model_config = {"extra": "allow"}


class ProjectEnriched(ProjectBase):
    """Project with orgs — used by list/search endpoints."""
    coordinator: Any = None
    organizations: list[Any] = []
    relevance_score: float | None = None
    model_config = {"extra": "allow"}


# ── Request schemas ──────────────────────────────────────────────────────────

class ProjectSearchParams(BaseModel):
    q: str = ""
    page: int = 1
    per_page: int = 10
    project_id: str | None = None
    keywords: str | None = None
    status: str | None = None
    acronym: str | None = None
    title: str | None = None
    programme: str | None = None
    topics: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    min_contribution: float | None = None
    max_contribution: float | None = None
    min_total_cost: float | None = None
    max_total_cost: float | None = None
    countries: str | None = None
    include_summary: bool = False

from pydantic import BaseModel
from typing import Any


class OrganizationBase(BaseModel):
    model_config = {"extra": "allow"}


class OrgInfoRequest(BaseModel):
    url: str


class OrgProjectsResponse(BaseModel):
    projects: list[Any]
    total: int
    page: int
    pages: int
    per_page: int
    organization_id: str
    role_filter: str

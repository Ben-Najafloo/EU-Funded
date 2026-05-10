from pydantic import BaseModel
from typing import Any


class PaginatedResponse(BaseModel):
    page: int
    limit: int
    total: int
    results: list[Any]


class SearchResponse(BaseModel):
    projects: list[Any]
    total: int
    page: int
    pages: int
    per_page: int


class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    error: str

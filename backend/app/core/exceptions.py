from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


# ── Domain exceptions ───────────────────────────────────────────────────────
# Raise these in repositories and routers.
# The handlers below convert them to JSON responses automatically.

class NotFoundError(Exception):
    def __init__(self, resource: str, identifier: str | int):
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} '{identifier}' not found")


class AuthenticationError(Exception):
    def __init__(self, detail: str = "Authentication required"):
        self.detail = detail
        super().__init__(detail)


class AuthorizationError(Exception):
    def __init__(self, detail: str = "Insufficient permissions"):
        self.detail = detail
        super().__init__(detail)


class ValidationError(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class DatabaseError(Exception):
    def __init__(self, detail: str = "Database operation failed"):
        self.detail = detail
        super().__init__(detail)


# ── Handlers ────────────────────────────────────────────────────────────────
# Register all of these in main.py via app.add_exception_handler()

async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"error": "not_found", "message": str(exc)},
    )


async def authentication_handler(request: Request, exc: AuthenticationError) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"error": "unauthorized", "message": exc.detail},
        headers={"WWW-Authenticate": "Bearer"},
    )


async def authorization_handler(request: Request, exc: AuthorizationError) -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={"error": "forbidden", "message": exc.detail},
    )


async def validation_handler(request: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": "validation_error", "message": exc.detail},
    )


async def database_handler(request: Request, exc: DatabaseError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"error": "service_unavailable", "message": "Database operation failed"},
    )


async def generic_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all — never leak internal details in production."""
    return JSONResponse(
        status_code=500,
        content={"error": "internal_server_error", "message": "An unexpected error occurred"},
    )

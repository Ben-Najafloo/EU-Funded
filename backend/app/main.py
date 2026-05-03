import logging
import logging.config
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import app.database as db_module
from app.config import get_settings
from app.core.exceptions import (
    NotFoundError, AuthenticationError, AuthorizationError,
    ValidationError, DatabaseError,
    not_found_handler, authentication_handler, authorization_handler,
    validation_handler, database_handler, generic_handler,
)
from app.routers import projects, organizations, users, stats, gemini, admin

settings = get_settings()

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── Rate limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    logger.info("Connecting to MongoDB...")
    await db_module.connect()
    logger.info("Creating indexes...")
    await db_module.create_indexes()
    logger.info("Startup complete — ready to serve requests")
    yield
    # SHUTDOWN
    logger.info("Shutting down...")
    await db_module.disconnect()
    logger.info("Goodbye")


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Cordis API",
    version="1.0.0",
    description="EU Research Projects API — FastAPI + Motor + MongoDB",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# State for rate limiter
app.state.limiter = limiter

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ────────────────────────────────────────────────────────
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(NotFoundError, not_found_handler)
app.add_exception_handler(AuthenticationError, authentication_handler)
app.add_exception_handler(AuthorizationError, authorization_handler)
app.add_exception_handler(ValidationError, validation_handler)
app.add_exception_handler(DatabaseError, database_handler)
app.add_exception_handler(Exception, generic_handler)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(projects.router)
app.include_router(organizations.router)
app.include_router(users.router)
app.include_router(stats.router)
app.include_router(gemini.router)
app.include_router(admin.router)


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {"message": "Cordis API", "docs": "/docs", "version": "1.0.0"}

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import ASCENDING, TEXT
from app.config import get_settings

settings = get_settings()

# Module-level client — initialized in lifespan, never recreated per-request
_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("Database client not initialized. Check lifespan setup.")
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.DB_NAME]


# ── Collection accessors ────────────────────────────────────────────────────
# Import these in repositories — routes never touch Motor directly.

def get_projects_collection() -> AsyncIOMotorCollection:
    return get_db()["projects"]


def get_organizations_collection() -> AsyncIOMotorCollection:
    return get_db()["organizations"]


def get_users_collection() -> AsyncIOMotorCollection:
    return get_db()["users"]


# ── Lifecycle ───────────────────────────────────────────────────────────────

async def connect() -> None:
    """Open the Motor connection pool. Called once at app startup."""
    global _client
    _client = AsyncIOMotorClient(
        settings.MONGOURL,
        maxPoolSize=50,
        minPoolSize=5,
        serverSelectionTimeoutMS=5000,
    )
    # Verify connectivity immediately so we fail fast on bad config
    await _client.admin.command("ping")


async def disconnect() -> None:
    """Close the connection pool. Called once at app shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def create_indexes() -> None:
    """
    Create all MongoDB indexes at startup.
    safe to call repeatedly — MongoDB ignores duplicate index creation.
    """
    projects = get_projects_collection()
    organizations = get_organizations_collection()
    users = get_users_collection()

    # Users
    await users.create_index("clerkUserId", unique=True)

    # Projects — text index for full-text search
    # TO:
    try:
        await projects.drop_index("search_text_index")
    except Exception:
        pass
    await projects.create_index(
        [("title", TEXT), ("objective", TEXT), ("keywords", TEXT)],
        weights={"title": 10, "keywords": 5, "objective": 1},
        name="projects_text_search",
    )

    # Projects — filter/sort indexes
    await projects.create_index("status")
    await projects.create_index("startDate")
    await projects.create_index("endDate")
    await projects.create_index("frameworkProgramme")
    await projects.create_index("topics")
    await projects.create_index([("startDate", ASCENDING)])
    await projects.create_index([("endDate", ASCENDING)])
    await projects.create_index("ecMaxContribution")
    await projects.create_index("totalCost")

    # Organizations — lookup indexes (critical for $lookup performance)
    await organizations.create_index("projectID")
    await organizations.create_index("organisationID")
    await organizations.create_index([("projectID", ASCENDING), ("organisationID", ASCENDING)])

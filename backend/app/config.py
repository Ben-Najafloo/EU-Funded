from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    MONGOURL: str
    DB_NAME: str = "cordis_db"

    # Clerk Auth
    CLERK_SECRET_KEY: str
    CLERK_JWKS_URL: str | None = None

    # Groq
    GROQ_API_KEY: str

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # App
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    API_VERSION: str = "v1"
    API_PREFIX: str = "/api"

    # Rate limiting
    RATE_LIMIT_DEFAULT: str = "200/minute"
    RATE_LIMIT_SEARCH: str = "60/minute"

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    """
    Cached settings instance — reads .env once, reused everywhere.
    Import this function, not the Settings class directly.
    """
    return Settings()

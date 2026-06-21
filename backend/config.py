"""
config.py – Application settings loaded from environment / .env file.
"""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:password@localhost:5432/decision_simulator"
    )

    # ── OpenRouter ────────────────────────────────────────────────────────────
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Per-pass model selection (per user spec)
    PASS1_MODEL: str = "nvidia/nemotron-3-super-120b-a12b:free"
    PASS2_MODEL: str = "openai/gpt-oss-120b:free"
    # PASS2_MODEL: str = "openai/gpt-4o-mini"
    WHATIF_MODEL: str = "openai/gpt-oss-120b:free"

    # Fallback chain used if per-pass model fails
    LLM_MODEL_PRIORITY: list[str] = [
        "openai/gpt-oss-120b:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
    ]

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_TITLE: str = "AI Career Path Scenario Simulator"
    APP_VERSION: str = "2.0.0"
    CORS_ORIGINS: str = "http://localhost:3000"

    # ── HTTP headers for OpenRouter ───────────────────────────────────────────
    HTTP_REFERER: str = "http://localhost:3000"
    X_TITLE: str = "AI Career Path Scenario Simulator"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()

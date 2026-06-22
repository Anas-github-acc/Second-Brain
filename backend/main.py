"""
main.py – FastAPI application entry point.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import create_tables
from routers import sessions, whatif, jobs
from services.llm_service import close_http_client


# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)


# ─── Lifespan ─────────────────────────────────────────────────────────────────

import sys
import subprocess

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Create DB tables on startup; close HTTP client on shutdown."""
    logger.info("Starting up – creating tables…")
    await create_tables()
    logger.info("Database tables ready.")

    # Start background RQ worker inside the same container/dyno
    worker_process = None
    try:
        logger.info("Launching background RQ worker process...")
        worker_process = subprocess.Popen(
            [sys.executable, "-c", "from rq.cli import main; main()", "worker", "--url", settings.REDIS_URL, "default"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        logger.info("Background RQ worker launched with PID %d", worker_process.pid)
    except Exception:
        logger.exception("Failed to start background RQ worker process")

    yield

    if worker_process:
        logger.info("Shutting down background RQ worker...")
        worker_process.terminate()
        try:
            worker_process.wait(timeout=5)
            logger.info("Background RQ worker stopped.")
        except subprocess.TimeoutExpired:
            logger.warning("Background RQ worker failed to stop in 5s. Killing...")
            worker_process.kill()

    logger.info("Shutting down – closing HTTP client…")
    await close_http_client()
    logger.info("Shutdown complete.")



# ─── Application ──────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=(
        "Second Brain - an AI-powered career & life path decision simulator."
        "Convert career decision to graph nodes"
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

cors_origins = settings.cors_origins_list
allow_credentials = True
if "*" in cors_origins:
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(sessions.router)
app.include_router(whatif.router)
app.include_router(jobs.router)



# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_TITLE,
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
    }


@app.get("/", tags=["health"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_TITLE} API",
        "docs": "/docs",
        "health": "/health",
    }


# ─── Dev runner ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.APP_ENV == "development",
        log_level="info",
    )

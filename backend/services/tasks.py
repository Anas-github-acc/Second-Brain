"""
services/tasks.py – Background tasks for Redis Queue (RQ) processing.
"""
from __future__ import annotations

import asyncio
import logging
from redis import Redis
from rq import Queue
from sqlalchemy import select

from config import settings
from database import AsyncSessionLocal
from models.db_models import DecisionSession
from services.pass1_discovery import run_pass1
from services.pass2_scenario_graph import run_pass2
from services.whatif_engine import run_whatif
from models.schemas import CreateSessionRequest

logger = logging.getLogger(__name__)


# ─── Redis & Queue Setup ──────────────────────────────────────────────────────

def get_redis_conn() -> Redis:
    return Redis.from_url(settings.REDIS_URL)


def get_queue() -> Queue:
    return Queue("default", connection=get_redis_conn())


# ─── Async Task Executors ─────────────────────────────────────────────────────

async def _async_run_pass1_task(body_dict: dict) -> dict:
    body = CreateSessionRequest(**body_dict)
    async with AsyncSessionLocal() as db:
        try:
            session_id, response = await run_pass1(db, body)
            await db.commit()
            logger.info("Pass 1 background task completed. session_id: %s", session_id)
            return response.model_dump()
        except Exception as e:
            logger.exception("Error in _async_run_pass1_task")
            await db.rollback()
            raise e


async def _async_run_pass2_task(session_id: str, responses: dict) -> dict:
    from services.state_store import apply_responses
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(DecisionSession).where(DecisionSession.id == session_id)
            )
            session = result.scalar_one()

            # Apply answers to session state
            new_state = apply_responses(session.current_state, responses)
            session.current_state = new_state
            await db.flush()

            # Run Pass 2 Graph Generation
            response = await run_pass2(db, session)
            await db.commit()

            logger.info("Pass 2 background task completed. session_id: %s", session_id)
            return response.model_dump()
        except Exception as e:
            logger.exception("Error in _async_run_pass2_task")
            await db.rollback()
            raise e


async def _async_run_whatif_task(
    session_id: str, target_node_id: str, what_if_query: str
) -> dict:
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(DecisionSession).where(DecisionSession.id == session_id)
            )
            session = result.scalar_one()

            # Run What-if expansion
            response = await run_whatif(db, session, target_node_id, what_if_query)
            await db.commit()

            logger.info("What-if background task completed. session_id: %s", session_id)
            return response.model_dump()
        except Exception as e:
            logger.exception("Error in _async_run_whatif_task")
            await db.rollback()
            raise e


# ─── Sync Worker Wrappers (called directly by RQ Worker) ──────────────────────

def run_pass1_task(body_dict: dict) -> dict:
    return asyncio.run(_async_run_pass1_task(body_dict))


def run_pass2_task(session_id: str, responses: dict) -> dict:
    return asyncio.run(_async_run_pass2_task(session_id, responses))


def run_whatif_task(
    session_id: str, target_node_id: str, what_if_query: str
) -> dict:
    return asyncio.run(_async_run_whatif_task(session_id, target_node_id, what_if_query))

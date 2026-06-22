"""
services/background_tasks.py – Async task executors executed via FastAPI BackgroundTasks.
"""
from __future__ import annotations

import logging
from sqlalchemy import select

from database import AsyncSessionLocal
from models.db_models import DecisionSession
from services.job_store import update_job
from services.pass1_discovery import run_pass1
from services.pass2_scenario_graph import run_pass2
from services.whatif_engine import run_whatif
from models.schemas import CreateSessionRequest

logger = logging.getLogger(__name__)


async def run_pass1_bg(job_id: str, body: CreateSessionRequest) -> None:
    """Pass 1 (Discovery Engine) executed in FastAPI BackgroundTasks."""
    update_job(job_id, "running")
    async with AsyncSessionLocal() as db:
        try:
            session_id, response = await run_pass1(db, body)
            await db.commit()
            update_job(
                job_id,
                "completed",
                result=response.model_dump(),
                session_id=session_id,
            )
            logger.info("Pass 1 background task completed for job_id %s, session_id %s", job_id, session_id)
        except Exception as e:
            logger.exception("Error in run_pass1_bg for job_id %s", job_id)
            await db.rollback()
            update_job(job_id, "failed", error=str(e))


async def run_pass2_bg(job_id: str, session_id: str, responses: dict) -> None:
    """Pass 2 (Graph Generation) executed in FastAPI BackgroundTasks."""
    update_job(job_id, "running")
    from services.state_store import apply_responses
    async with AsyncSessionLocal() as db:
        try:
            # Get session
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

            update_job(job_id, "completed", result=response.model_dump())
            logger.info("Pass 2 background task completed for job_id %s, session_id %s", job_id, session_id)
        except Exception as e:
            logger.exception("Error in run_pass2_bg for job_id %s", job_id)
            await db.rollback()
            update_job(job_id, "failed", error=str(e))


async def run_whatif_bg(
    job_id: str, session_id: str, target_node_id: str, what_if_query: str
) -> None:
    """What-if expansion task executed in FastAPI BackgroundTasks."""
    update_job(job_id, "running")
    async with AsyncSessionLocal() as db:
        try:
            # Get session
            result = await db.execute(
                select(DecisionSession).where(DecisionSession.id == session_id)
            )
            session = result.scalar_one()

            # Run What-if expansion
            response = await run_whatif(db, session, target_node_id, what_if_query)
            await db.commit()

            update_job(job_id, "completed", result=response.model_dump())
            logger.info("What-if background task completed for job_id %s, session_id %s", job_id, session_id)
        except Exception as e:
            logger.exception("Error in run_whatif_bg for job_id %s", job_id)
            await db.rollback()
            update_job(job_id, "failed", error=str(e))

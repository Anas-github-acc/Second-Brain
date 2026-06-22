"""
routers/sessions.py – Session management endpoints.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.db_models import DecisionSession
from models.schemas import (
    CreateSessionRequest,
    DiscoveryResponse,
    GraphResponse,
    SubmitAnswersRequest,
    UnifiedSession,
    JobAcceptedResponse,
)
from services.job_store import create_job
from services.background_tasks import run_pass1_bg, run_pass2_bg

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _get_session_or_404(session_id: str, db: AsyncSession) -> DecisionSession:
    result = await db.execute(
        select(DecisionSession).where(DecisionSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found.",
        )
    return session


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "/create",
    response_model=JobAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Pass 1 – Discovery Engine",
    description="Submit a user prompt. Enqueues a discovery task. Returns 202 with job_id.",
)
async def create_session(
    body: CreateSessionRequest,
    background_tasks: BackgroundTasks,
) -> JobAcceptedResponse:
    job_id = create_job("pass1")
    background_tasks.add_task(run_pass1_bg, job_id, body)
    return JobAcceptedResponse(job_id=job_id, status="pending")


@router.post(
    "/{session_id}/answers",
    response_model=JobAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit answers + trigger Pass 2 Graph Generation",
    description="Submit all user question answers. Enqueues task to generate scenario graph.",
)
async def submit_answers_and_generate(
    session_id: str,
    body: SubmitAnswersRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> JobAcceptedResponse:
    await _get_session_or_404(session_id, db)

    job_id = create_job("pass2", session_id=session_id)
    background_tasks.add_task(run_pass2_bg, job_id, session_id, body.responses)
    return JobAcceptedResponse(job_id=job_id, status="pending")




@router.get(
    "/{session_id}",
    response_model=UnifiedSession,
    summary="Get full session state",
)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> UnifiedSession:
    session = await _get_session_or_404(session_id, db)
    return state_from_dict(session.current_state)

"""
routers/sessions.py – Session management endpoints.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
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
)
from services.pass1_discovery import run_pass1
from services.pass2_scenario_graph import run_pass2
from services.state_store import apply_responses, state_from_dict

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
    response_model=DiscoveryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Pass 1 – Discovery Engine",
    description="Submit a user prompt. Returns discovery state with questions to ask.",
)
async def create_session(
    body: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
) -> DiscoveryResponse:
    try:
        _session_id, response = await run_pass1(db, body)
        return response
    except RuntimeError as exc:
        logger.exception("Pass 1 LLM failure")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM service unavailable: {exc}",
        ) from exc


@router.post(
    "/{session_id}/answers",
    response_model=GraphResponse,
    summary="Submit answers + trigger Pass 2 Graph Generation",
    description="Submit all user question answers. Triggers Pass 2 to generate the scenario graph.",
)
async def submit_answers_and_generate(
    session_id: str,
    body: SubmitAnswersRequest,
    db: AsyncSession = Depends(get_db),
) -> GraphResponse:
    session = await _get_session_or_404(session_id, db)

    # Merge answers into state
    new_state = apply_responses(session.current_state, body.responses)
    session.current_state = new_state
    await db.flush()

    # Run Pass 2
    try:
        return await run_pass2(db, session)
    except RuntimeError as exc:
        logger.exception("Pass 2 LLM failure for session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Scenario graph LLM service unavailable: {exc}",
        ) from exc


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

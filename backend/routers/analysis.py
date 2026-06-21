"""
routers/analysis.py – Pass 2 analysis endpoint.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.db_models import DecisionSession
from models.schemas import AnalysisResponse
from fastapi.responses import StreamingResponse
from services.pass2_analysis import run_pass2, run_pass2_stream
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["analysis"])


async def _get_session_or_404(session_id: str, db: AsyncSession) -> DecisionSession:
    result = await db.execute(
        select(DecisionSession)
        .where(DecisionSession.id == session_id)
        .options(
            selectinload(DecisionSession.graph),
            selectinload(DecisionSession.scenario_tree),
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    return session


@router.post("/{session_id}/analyze", response_model=AnalysisResponse)
async def analyze_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> AnalysisResponse:
    """
    Run Pass 2 analysis:
    - Hidden tradeoff discovery
    - Scenario tree generation
    - Option scoring (weighted by user's analytical profile)
    - Dashboard summary

    Stores results in DB and returns them.
    """
    session = await _get_session_or_404(session_id, db)

    try:
        return await run_pass2(db, session)
    except RuntimeError as exc:
        logger.exception("Pass 2 LLM failure for session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Analysis LLM service unavailable: {exc}",
        ) from exc


@router.post("/{session_id}/analyze/stream")
async def analyze_session_stream(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Run Pass 2 analysis and stream progress and responses as Server-Sent Events (SSE).
    """
    session = await _get_session_or_404(session_id, db)

    async def event_generator():
        try:
            async for chunk in run_pass2_stream(db, session):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as exc:
            logger.exception("Stream analysis failure for session %s", session_id)
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


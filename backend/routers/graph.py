"""
routers/graph.py – Decision graph endpoints.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.db_models import DecisionSession
from models.schemas import (
    AnswerFactorRequest,
    DecisionGraphResponse,
    EdgeResponse,
    Factor,
    FactorQuestion,
    NodeResponse,
)
from services.confidence_engine import compute_confidence
from services.state_store import apply_answer, state_from_dict
from services.tradeoff_engine import compute_weights

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["graph"])


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


@router.get("/{session_id}/graph", response_model=DecisionGraphResponse)
async def get_graph(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> DecisionGraphResponse:
    """Return the decision graph for a session."""
    session = await _get_session_or_404(session_id, db)
    if session.graph is None:
        raise HTTPException(status_code=404, detail="Graph not yet generated for this session.")

    g = session.graph
    state = state_from_dict(session.current_state)

    return DecisionGraphResponse(
        session_id=session_id,
        nodes=[NodeResponse(**n) for n in g.nodes],
        edges=[EdgeResponse(**e) for e in g.edges],
        factors=[Factor(**f) for f in g.factors],
        questions=state.questions,
        metadata=g.metadata_,
    )


@router.post("/{session_id}/answer", status_code=status.HTTP_200_OK)
async def answer_factor(
    session_id: str,
    body: AnswerFactorRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit an answer for a factor question.
    Updates analytical weights + confidence score in current_state.
    """
    session = await _get_session_or_404(session_id, db)
    state = state_from_dict(session.current_state)

    # Validate factor_id exists
    factor_ids = {f.id for f in state.factors}
    if body.factor_id not in factor_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Factor '{body.factor_id}' not found in session.",
        )

    # Compute new weights with the updated answered set
    # Build temporary answered list including this new answer
    from models.schemas import AnsweredFactor
    from datetime import datetime, timezone
    temp_answered = [
        af for af in state.answered_factors if af.factor_id != body.factor_id
    ] + [
        AnsweredFactor(
            factor_id=body.factor_id,
            responses=body.responses,
            answered_at=datetime.now(timezone.utc),
        )
    ]
    new_weights = compute_weights(state.factors, temp_answered)
    confidence_resp = compute_confidence(session_id, state.factors, temp_answered)

    # Persist
    new_state = apply_answer(
        session.current_state,
        factor_id=body.factor_id,
        responses=body.responses,
        new_weights=new_weights,
        new_confidence=confidence_resp.confidence,
    )
    session.current_state = new_state
    await db.flush()

    return {
        "session_id": session_id,
        "factor_id": body.factor_id,
        "analytical_weights": new_weights.model_dump(),
        "confidence": confidence_resp.confidence,
        "answered_factors": confidence_resp.answered_factors,
        "missing_factors": confidence_resp.missing_factors,
    }

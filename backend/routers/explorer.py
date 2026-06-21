"""
routers/explorer.py – What-if scenario explorer + action plan endpoints.
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
    ActionPlan,
    ExploreRequest,
    PlanRequest,
    WhatIfResponse,
)
from prompts.whatif import WHATIF_SYSTEM, WHATIF_USER_TEMPLATE
from services.llm_service import call_llm
from services.pass3_planner import run_pass3
from services.state_store import state_from_dict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["explorer"])


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


@router.post("/{session_id}/explore", response_model=WhatIfResponse)
async def explore_what_if(
    session_id: str,
    body: ExploreRequest,
    db: AsyncSession = Depends(get_db),
) -> WhatIfResponse:
    """
    Explore a what-if scenario from a specific node in the decision tree.
    Calls LLM with node context + what-if query.
    """
    session = await _get_session_or_404(session_id, db)
    state = state_from_dict(session.current_state)

    import json
    messages = [
        {"role": "system", "content": WHATIF_SYSTEM},
        {
            "role": "user",
            "content": WHATIF_USER_TEMPLATE.format(
                raw_prompt=state.raw_prompt,
                node_id=body.node_id,
                path_trace=json.dumps(body.path_trace),
                what_if_query=body.what_if_query,
            ),
        },
    ]

    try:
        data = await call_llm(messages)
    except RuntimeError as exc:
        logger.exception("What-if LLM failure for session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Explorer LLM service unavailable: {exc}",
        ) from exc

    return WhatIfResponse(
        session_id=session_id,
        node_id=body.node_id,
        what_if_query=body.what_if_query,
        exploration=data,
    )


@router.post("/{session_id}/plan", response_model=ActionPlan)
async def generate_plan(
    session_id: str,
    body: PlanRequest,
    db: AsyncSession = Depends(get_db),
) -> ActionPlan:
    """
    Generate a concrete action plan for the user's chosen option (Pass 3).
    """
    session = await _get_session_or_404(session_id, db)

    try:
        return await run_pass3(db, session, body.selected_option)
    except RuntimeError as exc:
        logger.exception("Pass 3 LLM failure for session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Planner LLM service unavailable: {exc}",
        ) from exc

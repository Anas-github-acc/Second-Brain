"""
routers/whatif.py – What-if Graph Expansion endpoint.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.db_models import DecisionSession
from models.schemas import WhatIfRequest, WhatIfResponse
from services.whatif_engine import run_whatif

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["whatif"])


async def _get_session_or_404(session_id: str, db: AsyncSession) -> DecisionSession:
    result = await db.execute(
        select(DecisionSession).where(DecisionSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    return session


@router.post(
    "/{session_id}/whatif",
    response_model=WhatIfResponse,
    summary="What-if Graph Expansion Engine",
    description=(
        "Mark a node and submit a what-if query. "
        "LLM generates 2-6 new nodes branching off that node, "
        "expanding the adjacency matrix and returning the full updated graph."
    ),
)
async def expand_what_if(
    session_id: str,
    body: WhatIfRequest,
    db: AsyncSession = Depends(get_db),
) -> WhatIfResponse:
    session = await _get_session_or_404(session_id, db)

    # Validate target node ID exists
    from services.state_store import state_from_dict
    state = state_from_dict(session.current_state)
    existing_ids = {n.id for n in state.scenario_graph.nodes}
    if body.target_node_id not in existing_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Node ID {body.target_node_id} not found in scenario graph.",
        )

    try:
        return await run_whatif(db, session, body.target_node_id, body.what_if_query)
    except RuntimeError as exc:
        logger.exception("What-if LLM failure for session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"What-if LLM service unavailable: {exc}",
        ) from exc

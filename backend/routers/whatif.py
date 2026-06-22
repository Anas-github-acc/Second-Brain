import logging

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.db_models import DecisionSession
from models.schemas import WhatIfRequest, JobAcceptedResponse
from services.job_store import create_job
from services.background_tasks import run_whatif_bg

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
    response_model=JobAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="What-if Graph Expansion Engine",
    description=(
        "Mark a node and submit a what-if query. "
        "Enqueues a background job for graph expansion."
    ),
)
async def expand_what_if(
    session_id: str,
    body: WhatIfRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> JobAcceptedResponse:
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

    job_id = create_job("whatif", session_id=session_id)
    background_tasks.add_task(
        run_whatif_bg, job_id, session_id, body.target_node_id, body.what_if_query
    )

    return JobAcceptedResponse(job_id=job_id, status="pending")



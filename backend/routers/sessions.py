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
    JobAcceptedResponse,
)
from services.tasks import get_queue, run_pass1_task, run_pass2_task

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
) -> JobAcceptedResponse:
    queue = get_queue()
    job = queue.enqueue(run_pass1_task, body.model_dump(), result_ttl=3600)
    return JobAcceptedResponse(job_id=job.get_id(), status="pending")


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
    db: AsyncSession = Depends(get_db),
) -> JobAcceptedResponse:
    await _get_session_or_404(session_id, db)

    queue = get_queue()
    job = queue.enqueue(run_pass2_task, session_id, body.responses, result_ttl=3600)
    return JobAcceptedResponse(job_id=job.get_id(), status="pending")





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

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import JobStatusResponse
from services.tasks import get_queue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get(
    "/{job_id}",
    response_model=JobStatusResponse,
    summary="Get background job status and result",
)
async def get_job_status(
    job_id: str,
) -> JobStatusResponse:
    queue = get_queue()
    job = queue.fetch_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found.",
        )

    rq_status = job.get_status()
    if rq_status in ("queued", "deferred"):
        status_str = "pending"
    elif rq_status == "started":
        status_str = "running"
    elif rq_status == "finished":
        status_str = "completed"
    else:
        status_str = "failed"

    result = job.result
    error = job.exc_info if rq_status == "failed" else None

    # Try to extract session_id from result dict if present
    session_id = None
    if result and isinstance(result, dict):
        session_id = result.get("session_id")

    return JobStatusResponse(
        id=job.id,
        status=status_str,
        session_id=session_id,
        result=result,
        error=error,
    )



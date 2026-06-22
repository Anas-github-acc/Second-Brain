import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import JobStatusResponse
from services.job_store import get_job

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
    job = get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found.",
        )
    return JobStatusResponse(
        id=job.id,
        status=job.status,
        session_id=job.session_id,
        result=job.result,
        error=job.error,
    )


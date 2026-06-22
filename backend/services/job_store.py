"""
services/job_store.py – Global in-memory storage for background tasks.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional
from pydantic import BaseModel


class InMemoryJob(BaseModel):
    id: str
    status: str  # "pending", "running", "completed", "failed"
    session_id: Optional[str] = None
    result: Optional[Any] = None
    error: Optional[str] = None


# Global in-memory registry
_jobs: Dict[str, InMemoryJob] = {}


def create_job(task_name: str, session_id: Optional[str] = None) -> str:
    """Create a new job record in-memory and return its ID."""
    job_id = str(uuid.uuid4())
    _jobs[job_id] = InMemoryJob(
        id=job_id,
        status="pending",
        session_id=session_id,
    )
    return job_id


def get_job(job_id: str) -> Optional[InMemoryJob]:
    """Retrieve a job by its ID from the in-memory store."""
    return _jobs.get(job_id)


def update_job(
    job_id: str,
    status: str,
    result: Optional[Any] = None,
    error: Optional[str] = None,
    session_id: Optional[str] = None,
) -> None:
    """Update job fields in the in-memory store."""
    job = _jobs.get(job_id)
    if job:
        job.status = status
        if result is not None:
            job.result = result
        if error is not None:
            job.error = error
        if session_id is not None:
            job.session_id = session_id

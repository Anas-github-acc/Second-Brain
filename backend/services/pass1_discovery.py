"""
services/pass1_discovery.py – Pass 1: Discovery Engine.
Calls LLM to analyze user prompt and generate discovery questions.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.db_models import DecisionSession, User
from models.schemas import (
    CreateSessionRequest,
    DiscoveryQuestion,
    DiscoveryResponse,
    DiscoveryState,
)
from prompts.pass1 import PASS1_SYSTEM, PASS1_USER_TEMPLATE
from services.llm_service import call_llm_with_model
from services.state_store import init_state

logger = logging.getLogger(__name__)


def _parse_discovery(data: dict) -> DiscoveryState:
    """Coerce raw LLM dict into a DiscoveryState."""
    raw_questions = data.get("questions", [])
    questions = []
    for i, q in enumerate(raw_questions):
        questions.append(
            DiscoveryQuestion(
                id=q.get("id", i),
                text=q.get("text", ""),
                context_tradeoff=q.get("context_tradeoff", ""),
                options=q.get("options", []),
                allow_custom=bool(q.get("allow_custom", True)),
                can_skip=bool(q.get("can_skip", False)),
                is_open=bool(q.get("is_open", i == 0)),
                is_user_goal=bool(q.get("is_user_goal", False)),
            )
        )
    # Ensure first question is open
    if questions:
        questions[0].is_open = True

    return DiscoveryState(
        target_identified=bool(data.get("target_identified", False)),
        user_goal=data.get("user_goal"),
        paths=data.get("paths", []),
        metadata=data.get("metadata", {}),
        questions=questions,
        user_responses={},
    )


async def run_pass1(
    db: AsyncSession,
    body: CreateSessionRequest,
) -> tuple[str, DiscoveryResponse]:
    """
    Full Pass 1 pipeline:
    1. Upsert user
    2. Call LLM with Discovery Engine prompt (using PASS1_MODEL)
    3. Persist session with initial state
    4. Return (session_id, DiscoveryResponse)
    """
    # ── 1. Upsert user ────────────────────────────────────────────────────────
    result = await db.execute(select(User).where(User.name == body.user_name))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(id=str(uuid.uuid4()), name=body.user_name)
        db.add(user)
        await db.flush()

    # ── 2. Call LLM ───────────────────────────────────────────────────────────
    messages = [
        {"role": "system", "content": PASS1_SYSTEM},
        {"role": "user", "content": PASS1_USER_TEMPLATE.format(raw_prompt=body.raw_prompt)},
    ]
    logger.info("Pass 1 – calling model %s for prompt: %s", settings.PASS1_MODEL, body.raw_prompt[:80])
    data = await call_llm_with_model(settings.PASS1_MODEL, messages)

    # ── 3. Parse discovery ────────────────────────────────────────────────────
    discovery = _parse_discovery(data)

    # ── 4. Create session ─────────────────────────────────────────────────────
    session_id = str(uuid.uuid4())
    initial_state = init_state(
        session_id=session_id,
        user_name=body.user_name,
        raw_prompt=body.raw_prompt,
        discovery=discovery,
    )

    session = DecisionSession(
        id=session_id,
        user_id=user.id,
        raw_prompt=body.raw_prompt,
        current_state=initial_state,
    )
    db.add(session)
    await db.flush()

    logger.info("Pass 1 complete – session_id=%s, %d questions", session_id, len(discovery.questions))

    return session_id, DiscoveryResponse(
        session_id=session_id,
        discovery=discovery,
    )

"""
services/pass1_graph.py – Pass 1: Call LLM to generate the decision graph,
then persist it in the DB.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.db_models import DecisionGraph, DecisionSession, User
from models.schemas import (
    DecisionGraphResponse,
    EdgeResponse,
    Factor,
    FactorQuestion,
    NodeResponse,
    SessionCreatedResponse,
)
from prompts.pass1 import PASS1_SYSTEM, PASS1_USER_TEMPLATE
from services.confidence_engine import compute_confidence
from services.llm_service import call_llm
from services.state_store import init_state

logger = logging.getLogger(__name__)


def _parse_graph_response(data: dict, session_id: str) -> DecisionGraphResponse:
    """Validate and coerce raw LLM dict into a DecisionGraphResponse."""
    nodes = [
        NodeResponse(
            id=n["id"],
            label=n["label"],
            type=n.get("type", "option"),
            description=n.get("description", ""),
            metadata=n.get("metadata", {}),
        )
        for n in data.get("nodes", [])
    ]
    edges = [
        EdgeResponse(
            source=e["source"],
            target=e["target"],
            label=e.get("label", ""),
            weight=float(e.get("weight", 1.0)),
        )
        for e in data.get("edges", [])
    ]
    factors = [
        Factor(
            id=f["id"],
            label=f["label"],
            description=f.get("description", ""),
            importance=float(f.get("importance", 0.5)),
            category=f.get("category", "personal"),
        )
        for f in data.get("factors", [])
    ]
    questions = [
        FactorQuestion(
            factor_id=q["factor_id"],
            question=q["question"],
            options=q.get("options", []),
            type=q.get("type", "single"),
        )
        for q in data.get("questions", [])
    ]
    return DecisionGraphResponse(
        session_id=session_id,
        nodes=nodes,
        edges=edges,
        factors=factors,
        questions=questions,
        metadata=data.get("metadata", {}),
    )


async def run_pass1(
    db: AsyncSession,
    user_name: str,
    raw_prompt: str,
) -> SessionCreatedResponse:
    """
    Full Pass 1 pipeline:
    1. Upsert user record
    2. Call LLM with Pass 1 prompt
    3. Persist session + graph in DB
    4. Return SessionCreatedResponse
    """
    # ── 1. Upsert user ────────────────────────────────────────────────────────
    result = await db.execute(select(User).where(User.name == user_name))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(id=str(uuid.uuid4()), name=user_name)
        db.add(user)
        await db.flush()

    # ── 2. Call LLM ───────────────────────────────────────────────────────────
    messages = [
        {"role": "system", "content": PASS1_SYSTEM},
        {"role": "user", "content": PASS1_USER_TEMPLATE.format(raw_prompt=raw_prompt)},
    ]
    logger.info("Pass 1 – calling LLM for prompt: %s", raw_prompt[:80])
    data = await call_llm(messages)

    # ── 3. Parse graph ────────────────────────────────────────────────────────
    session_id = str(uuid.uuid4())
    graph_response = _parse_graph_response(data, session_id)

    # ── 4. Build initial state ────────────────────────────────────────────────
    initial_state = init_state(
        session_id=session_id,
        user_name=user_name,
        raw_prompt=raw_prompt,
        factors=graph_response.factors,
        questions=graph_response.questions,
    )

    # ── 5. Persist session ────────────────────────────────────────────────────
    session = DecisionSession(
        id=session_id,
        user_id=user.id,
        raw_prompt=raw_prompt,
        current_state=initial_state,
    )
    db.add(session)

    # ── 6. Persist graph ──────────────────────────────────────────────────────
    graph_record = DecisionGraph(
        id=str(uuid.uuid4()),
        session_id=session_id,
        nodes=[n.model_dump() for n in graph_response.nodes],
        edges=[e.model_dump() for e in graph_response.edges],
        factors=[f.model_dump() for f in graph_response.factors],
        metadata_=graph_response.metadata,
    )
    db.add(graph_record)
    await db.flush()

    logger.info("Pass 1 complete – session_id=%s", session_id)

    return SessionCreatedResponse(
        session_id=session_id,
        user_name=user_name,
        factors=graph_response.factors,
        questions=graph_response.questions,
        graph=graph_response,
    )

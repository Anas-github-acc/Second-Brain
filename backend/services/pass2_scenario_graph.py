"""
services/pass2_scenario_graph.py – Pass 2: Scenario Graph Engine.
Generates a rich interactive scenario graph using the adjacency matrix format.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.db_models import DecisionSession
from models.schemas import (
    ChildEdge,
    GraphResponse,
    RedditLink,
    ScenarioGraph,
    ScenarioGraphNode,
    ScenarioNodeData,
)
from prompts.pass2 import PASS2_SYSTEM, PASS2_USER_TEMPLATE
from services.llm_service import call_llm_with_model
from services.state_store import apply_scenario_graph, state_from_dict

logger = logging.getLogger(__name__)


def _parse_node(raw: dict, idx: int) -> ScenarioGraphNode:
    """Parse a single node from LLM output."""
    raw_data = raw.get("data", {})
    reddit_links = []
    for rl in raw_data.get("reddit_links", []):
        try:
            reddit_links.append(RedditLink(title=rl.get("title", ""), url=rl.get("url", "")))
        except Exception:
            pass

    data = ScenarioNodeData(
        label=raw_data.get("label", raw.get("title", f"Node {idx}")),
        about=raw_data.get("about", ""),
        how_this_helps_reach_goal=raw_data.get("how_this_helps_reach_goal", ""),
        reddit_links=reddit_links,
        is_expanded=bool(raw_data.get("is_expanded", True)),
        time_estimate=raw_data.get("time_estimate"),
    )

    children = []
    for c in raw.get("children", []):
        try:
            children.append(
                ChildEdge(
                    target_id=str(c.get("target_id", "")),
                    label=str(c.get("label", "")),
                    animation=bool(c.get("animation", c.get("animated", False))),
                )
            )
        except Exception:
            pass

    return ScenarioGraphNode(
        id=str(raw.get("id", idx)),
        type=raw.get("type", "outcome"),
        position=raw.get("position", {"x": 0, "y": 0}),
        data=data,
        children=children,
    )


def _parse_graph(data: dict) -> ScenarioGraph:
    """Parse LLM output dict into a ScenarioGraph."""
    raw_nodes = data.get("nodes", [])
    nodes = []
    for i, rn in enumerate(raw_nodes):
        try:
            nodes.append(_parse_node(rn, i))
        except Exception as exc:
            logger.warning("Skipping malformed node %s: %s", i, exc)

    node_count = data.get("node_count", len(nodes))

    return ScenarioGraph(
        node_count=node_count,
        nodes=nodes,
    )


async def run_pass2(
    db: AsyncSession,
    session: DecisionSession,
) -> GraphResponse:
    """
    Full Pass 2 pipeline:
    1. Read discovery state from session
    2. Call LLM with Scenario Graph Engine prompt (using PASS2_MODEL)
    3. Parse into ScenarioGraph with adjacency matrix
    4. Persist updated state
    5. Return GraphResponse
    """
    state = state_from_dict(session.current_state)
    discovery = state.discovery

    user_goal = discovery.user_goal or state.raw_prompt
    paths = discovery.paths or []
    user_responses = discovery.user_responses or {}
    metadata = discovery.metadata or {}

    # Build context for Pass 2
    messages = [
        {
            "role": "system",
            "content": PASS2_SYSTEM.format(
                user_goal=user_goal,
                paths=json.dumps(paths),
                user_responses=json.dumps(user_responses),
                metadata=json.dumps(metadata),
            ),
        },
        {
            "role": "user",
            "content": PASS2_USER_TEMPLATE.format(
                user_goal=user_goal,
                paths=json.dumps(paths),
                user_responses=json.dumps(user_responses),
                metadata=json.dumps(metadata),
            ),
        },
    ]

    logger.info("Pass 2 – calling model %s for session %s", settings.PASS2_MODEL, session.id)
    data = await call_llm_with_model(settings.PASS2_MODEL, messages)

    graph = _parse_graph(data)

    # Persist
    new_state = apply_scenario_graph(session.current_state, graph)
    session.current_state = new_state
    await db.flush()

    logger.info(
        "Pass 2 complete – session %s, %d nodes",
        session.id,
        graph.node_count,
    )

    return GraphResponse(session_id=session.id, scenario_graph=graph)

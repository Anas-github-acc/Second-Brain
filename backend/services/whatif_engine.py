"""
services/whatif_engine.py – What-if: Graph Expansion Engine.
Expands the active graph by adding new nodes connected to a target node.
"""
from __future__ import annotations

import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.db_models import DecisionSession
from models.schemas import ScenarioGraph, WhatIfResponse
from prompts.whatif import WHATIF_SYSTEM, WHATIF_USER_TEMPLATE
from services.llm_service import call_llm_with_model
from services.state_store import apply_whatif_expansion, state_from_dict

logger = logging.getLogger(__name__)


async def run_whatif(
    db: AsyncSession,
    session: DecisionSession,
    target_node_id: str,
    what_if_query: str,
) -> WhatIfResponse:
    """
    What-if expansion pipeline:
    1. Read current graph from session state
    2. Build context from discovery + all existing nodes + children relationships
    3. Call LLM (WHATIF_MODEL) with target node + query
    4. Append new nodes and updated children relationships to state
    5. Return full updated WhatIfResponse
    """
    state = state_from_dict(session.current_state)
    graph = state.scenario_graph
    discovery = state.discovery

    # Build context block
    context = {
        "original_prompt": state.raw_prompt,
        "user_goal": discovery.user_goal,
        "paths": discovery.paths,
        "user_responses": discovery.user_responses,
        "metadata": discovery.metadata,
    }

    # Serialize nodes for prompt (compact, including children)
    nodes_for_prompt = [
        {
            "id": n.id,
            "type": n.type,
            "label": n.data.label,
            "about": n.data.about,
            "children": [
                {
                    "target_id": c.target_id,
                    "label": c.label,
                    "animation": c.animation,
                }
                for c in n.children
            ]
        }
        for n in graph.nodes
    ]

    messages = [
        {
            "role": "system",
            "content": WHATIF_SYSTEM.format(
                context=json.dumps(context),
                nodes=json.dumps(nodes_for_prompt),
                node_count=graph.node_count,
                target_node_id=target_node_id,
                what_if_query=what_if_query,
            ),
        },
        {
            "role": "user",
            "content": WHATIF_USER_TEMPLATE.format(
                context=json.dumps(context),
                nodes=json.dumps(nodes_for_prompt),
                node_count=graph.node_count,
                target_node_id=target_node_id,
                what_if_query=what_if_query,
            ),
        },
    ]

    logger.info(
        "What-if – calling model %s for session %s, target node %s",
        settings.WHATIF_MODEL, session.id, target_node_id
    )
    data = await call_llm_with_model(settings.WHATIF_MODEL, messages)

    appended_nodes = data.get("appended_nodes", [])
    new_links_from_target = data.get("new_links_from_target", [])

    # Validate appended nodes IDs
    for nd in appended_nodes:
        if "id" not in nd or not nd["id"]:
            nd["id"] = f"whatif_{nd.get('type', 'node')}_{len(graph.nodes)}"

    # Persist expansion
    new_state = apply_whatif_expansion(
        session.current_state,
        appended_nodes=appended_nodes,
        target_node_id=target_node_id,
        new_links_from_target=new_links_from_target,
    )
    session.current_state = new_state
    await db.flush()

    updated_state = state_from_dict(new_state)
    logger.info(
        "What-if complete – session %s, %d new nodes added, total %d",
        session.id, len(appended_nodes), updated_state.scenario_graph.node_count
    )

    return WhatIfResponse(
        session_id=session.id,
        target_node_id=target_node_id,
        scenario_graph=updated_state.scenario_graph,
    )

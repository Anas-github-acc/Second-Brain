"""
services/state_store.py – Pure functions for reading/writing UnifiedSession state.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from models.schemas import UnifiedSession, DiscoveryState, ScenarioGraph


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def state_to_dict(state: UnifiedSession) -> dict[str, Any]:
    return state.model_dump(mode="json")


def state_from_dict(raw: dict[str, Any]) -> UnifiedSession:
    return UnifiedSession.model_validate(raw)


def init_state(
    session_id: str,
    user_name: str,
    raw_prompt: str,
    discovery: DiscoveryState,
) -> dict[str, Any]:
    """Create a fresh UnifiedSession dict after Pass 1 completes."""
    now = datetime.now(timezone.utc)
    state = UnifiedSession(
        session_id=session_id,
        user_name=user_name,
        raw_prompt=raw_prompt,
        status="questioning",
        discovery=discovery,
        scenario_graph=ScenarioGraph(),
        created_at=now,
        updated_at=now,
    )
    return state_to_dict(state)


def apply_responses(
    current: dict[str, Any],
    responses: dict[str, str],
) -> dict[str, Any]:
    """Merge user question responses into discovery.user_responses."""
    state = state_from_dict(current)
    state.discovery.user_responses.update(responses)
    # Set user_goal if any question with is_user_goal is answered
    for q in state.discovery.questions:
        key = f"q_{q.id}"
        if q.is_user_goal and key in responses and responses[key]:
            state.discovery.user_goal = responses[key]
    state.status = "generating"
    state.updated_at = datetime.now(timezone.utc)
    return state_to_dict(state)


def apply_scenario_graph(
    current: dict[str, Any],
    graph: ScenarioGraph,
) -> dict[str, Any]:
    """Store Pass 2 scenario graph result into the state."""
    state = state_from_dict(current)
    state.scenario_graph = graph
    state.status = "complete"
    state.updated_at = datetime.now(timezone.utc)
    return state_to_dict(state)


def apply_whatif_expansion(
    current: dict[str, Any],
    appended_nodes: list[dict],
    target_node_id: str,
    new_links_from_target: list[dict],
) -> dict[str, Any]:
    """Append new What-if nodes and update the parent node's children list."""
    state = state_from_dict(current)
    graph = state.scenario_graph

    # 1. Parse and append new nodes
    from models.schemas import ScenarioGraphNode, ChildEdge
    for nd in appended_nodes:
        # Ensure all IDs are strings
        if "id" in nd:
            nd["id"] = str(nd["id"])

        # Ensure target_id in children are strings
        if "children" in nd:
            for child in nd["children"]:
                if "target_id" in child:
                    child["target_id"] = str(child["target_id"])

        graph.nodes.append(ScenarioGraphNode.model_validate(nd))

    # 2. Find target node and append new links
    target_node = None
    target_str = str(target_node_id)
    for node in graph.nodes:
        if str(node.id) == target_str:
            target_node = node
            break

    if target_node is not None:
        for link in new_links_from_target:
            target_node.children.append(
                ChildEdge(
                    target_id=str(link.get("target_id", "")),
                    label=str(link.get("label", "")),
                    animation=bool(link.get("animation", link.get("animated", False))),
                )
            )

    graph.node_count = len(graph.nodes)
    state.scenario_graph = graph
    state.updated_at = datetime.now(timezone.utc)
    return state_to_dict(state)

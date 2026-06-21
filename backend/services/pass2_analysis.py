"""
services/pass2_analysis.py – Pass 2: Combined tradeoff + scenario tree + dashboard.
"""
from __future__ import annotations

import json
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from models.db_models import DecisionSession, ScenarioTree
from models.schemas import (
    AnalysisResponse,
    AnalyticalWeights,
    AnsweredFactor,
    Factor,
    HiddenTradeoff,
    OptionScore,
    ScenarioNode,
)
from prompts.pass2 import PASS2_SYSTEM, PASS2_USER_TEMPLATE
from services.llm_service import call_llm, call_llm_stream
from services.state_store import apply_analysis, state_from_dict
from typing import AsyncIterator

logger = logging.getLogger(__name__)


def _format_factor_responses(
    factors: list[Factor],
    answered: list[AnsweredFactor],
) -> str:
    factor_map = {f.id: f for f in factors}
    lines = []
    for af in answered:
        label = factor_map[af.factor_id].label if af.factor_id in factor_map else af.factor_id
        responses = ", ".join(af.responses)
        lines.append(f"- {label}: {responses}")
    return "\n".join(lines) if lines else "No answers yet."


def _format_weights(weights: AnalyticalWeights | None) -> str:
    if weights is None:
        return "learning=25, freedom=25, income=25, stability=25 (defaults)"
    return (
        f"learning={weights.learning}, freedom={weights.freedom}, "
        f"income={weights.income}, stability={weights.stability}"
    )


def _extract_options(nodes_raw: list[dict]) -> list[str]:
    return [n["label"] for n in nodes_raw if n.get("type") == "option"]


def _parse_tradeoffs(raw: list[dict]) -> list[HiddenTradeoff]:
    result = []
    for item in raw:
        try:
            result.append(
                HiddenTradeoff(
                    id=item.get("id", str(uuid.uuid4())),
                    title=item["title"],
                    description=item.get("description", ""),
                    affected_options=item.get("affected_options", []),
                    severity=item.get("severity", "medium"),
                    dimension=item.get("dimension", "income"),
                )
            )
        except Exception as exc:
            logger.warning("Skipping malformed tradeoff: %s – %s", item, exc)
    return result


def _parse_scenario_node(raw: dict) -> ScenarioNode:
    children = [_parse_scenario_node(c) for c in raw.get("children", [])]
    return ScenarioNode(
        id=raw.get("id", str(uuid.uuid4())),
        parent_id=raw.get("parent_id"),
        label=raw.get("label", ""),
        description=raw.get("description", ""),
        probability=float(raw.get("probability", 0.5)),
        time_horizon=raw.get("time_horizon", ""),
        outcomes=raw.get("outcomes", {}),
        children=children,
    )


def _parse_option_scores(raw: list[dict]) -> list[OptionScore]:
    result = []
    for item in raw:
        try:
            result.append(
                OptionScore(
                    option_id=item.get("option_id", str(uuid.uuid4())),
                    option_label=item.get("option_label", ""),
                    total_score=float(item.get("total_score", 0.0)),
                    breakdown=item.get("breakdown", {}),
                    rank=int(item.get("rank", 1)),
                    recommendation=item.get("recommendation", ""),
                )
            )
        except Exception as exc:
            logger.warning("Skipping malformed option score: %s – %s", item, exc)
    return sorted(result, key=lambda s: s.rank)


async def run_pass2(
    db: AsyncSession,
    session: DecisionSession,
) -> AnalysisResponse:
    """
    Full Pass 2 pipeline:
    1. Read state from session.current_state
    2. Call LLM with factor responses + analytical weights
    3. Parse tradeoffs, scenario tree, option scores
    4. Persist ScenarioTree record
    5. Update session.current_state
    6. Return AnalysisResponse
    """
    state = state_from_dict(session.current_state)
    graph_nodes = []
    if session.graph:
        graph_nodes = session.graph.nodes or []

    options = _extract_options(graph_nodes)
    if not options:
        # Fallback: extract from scenario node labels in state
        options = [
            n["label"] for n in graph_nodes
        ] or ["Option A", "Option B", "Option C"]

    factor_responses_text = _format_factor_responses(
        state.factors, state.answered_factors
    )
    weights_text = _format_weights(state.analytical_weights)

    messages = [
        {"role": "system", "content": PASS2_SYSTEM},
        {
            "role": "user",
            "content": PASS2_USER_TEMPLATE.format(
                raw_prompt=state.raw_prompt,
                factor_responses=factor_responses_text,
                analytical_weights=weights_text,
                options=json.dumps(options),
            ),
        },
    ]

    logger.info("Pass 2 – calling LLM for session %s", session.id)
    data = await call_llm(messages)

    # Parse results
    tradeoffs = _parse_tradeoffs(data.get("tradeoffs", []))
    scenario_tree = _parse_scenario_node(
        data.get("scenario_tree", {"id": "root", "label": "Decision", "probability": 1.0, "time_horizon": "now"})
    )
    option_scores = _parse_option_scores(data.get("option_scores", []))
    dashboard = data.get("dashboard", {})

    # Persist ScenarioTree record
    existing_tree = session.scenario_tree
    if existing_tree:
        existing_tree.tree = scenario_tree.model_dump(mode="json")
        existing_tree.tradeoffs = [t.model_dump() for t in tradeoffs]
        existing_tree.option_scores = [s.model_dump() for s in option_scores]
        existing_tree.dashboard = dashboard
    else:
        tree_record = ScenarioTree(
            id=str(uuid.uuid4()),
            session_id=session.id,
            tree=scenario_tree.model_dump(mode="json"),
            tradeoffs=[t.model_dump() for t in tradeoffs],
            option_scores=[s.model_dump() for s in option_scores],
            dashboard=dashboard,
        )
        db.add(tree_record)

    # Update current_state
    new_state_dict = apply_analysis(
        session.current_state,
        tradeoffs=tradeoffs,
        scenario_tree=scenario_tree,
        option_scores=option_scores,
        dashboard=dashboard,
    )
    session.current_state = new_state_dict
    await db.flush()

    logger.info("Pass 2 complete – session %s, %d tradeoffs, %d options scored",
                session.id, len(tradeoffs), len(option_scores))

    return AnalysisResponse(
        session_id=session.id,
        tradeoffs=tradeoffs,
        scenario_tree=scenario_tree,
        option_scores=option_scores,
        dashboard=dashboard,
    )


async def run_pass2_stream(
    db: AsyncSession,
    session: DecisionSession,
) -> AsyncIterator[dict[str, Any]]:
    """
    Stream Pass 2 analysis. Yields chunks of type:
    - {"type": "thinking", "chunk": "..."}
    - {"type": "content", "chunk": "..."}
    - {"type": "final", "data": {...}}
    """
    state = state_from_dict(session.current_state)
    graph_nodes = []
    if session.graph:
        graph_nodes = session.graph.nodes or []

    options = _extract_options(graph_nodes)
    if not options:
        options = [n["label"] for n in graph_nodes] or ["Option A", "Option B", "Option C"]

    factor_responses_text = _format_factor_responses(
        state.factors, state.answered_factors
    )
    weights_text = _format_weights(state.analytical_weights)

    messages = [
        {"role": "system", "content": PASS2_SYSTEM},
        {
            "role": "user",
            "content": PASS2_USER_TEMPLATE.format(
                raw_prompt=state.raw_prompt,
                factor_responses=factor_responses_text,
                analytical_weights=weights_text,
                options=json.dumps(options),
            ),
        },
    ]

    logger.info("Pass 2 stream – calling LLM for session %s", session.id)
    
    async for chunk in call_llm_stream(messages):
        if chunk["type"] == "final":
            data = chunk["data"]
            tradeoffs = _parse_tradeoffs(data.get("tradeoffs", []))
            scenario_tree = _parse_scenario_node(
                data.get("scenario_tree", {"id": "root", "label": "Decision", "probability": 1.0, "time_horizon": "now"})
            )
            option_scores = _parse_option_scores(data.get("option_scores", []))
            dashboard = data.get("dashboard", {})

            # Persist ScenarioTree record
            existing_tree = session.scenario_tree
            if existing_tree:
                existing_tree.tree = scenario_tree.model_dump(mode="json")
                existing_tree.tradeoffs = [t.model_dump() for t in tradeoffs]
                existing_tree.option_scores = [s.model_dump() for s in option_scores]
                existing_tree.dashboard = dashboard
            else:
                import uuid
                tree_record = ScenarioTree(
                    id=str(uuid.uuid4()),
                    session_id=session.id,
                    tree=scenario_tree.model_dump(mode="json"),
                    tradeoffs=[t.model_dump() for t in tradeoffs],
                    option_scores=[s.model_dump() for s in option_scores],
                    dashboard=dashboard,
                )
                db.add(tree_record)

            # Update current_state
            new_state_dict = apply_analysis(
                session.current_state,
                tradeoffs=tradeoffs,
                scenario_tree=scenario_tree,
                option_scores=option_scores,
                dashboard=dashboard,
            )
            session.current_state = new_state_dict
            await db.flush()

            yield {
                "type": "final",
                "data": {
                    "session_id": session.id,
                    "tradeoffs": [t.model_dump() for t in tradeoffs],
                    "scenario_tree": scenario_tree.model_dump(mode="json"),
                    "option_scores": [s.model_dump() for s in option_scores],
                    "dashboard": dashboard,
                }
            }
        else:
            yield chunk


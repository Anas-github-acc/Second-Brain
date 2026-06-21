"""
services/pass3_planner.py – Pass 3: Action plan generation for chosen option.
"""
from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from models.db_models import DecisionSession
from models.schemas import ActionPlan, ActionStep
from prompts.pass3 import PASS3_SYSTEM, PASS3_USER_TEMPLATE
from services.llm_service import call_llm
from services.state_store import apply_action_plan, state_from_dict

logger = logging.getLogger(__name__)


def _parse_action_plan(data: dict, session_id: str, selected_option: str) -> ActionPlan:
    steps = []
    for raw_step in data.get("steps", []):
        try:
            steps.append(
                ActionStep(
                    step=int(raw_step.get("step", len(steps) + 1)),
                    title=raw_step["title"],
                    description=raw_step.get("description", ""),
                    timeline=raw_step.get("timeline", ""),
                    resources=raw_step.get("resources", []),
                    success_metric=raw_step.get("success_metric", ""),
                )
            )
        except Exception as exc:
            logger.warning("Skipping malformed action step: %s – %s", raw_step, exc)

    return ActionPlan(
        session_id=session_id,
        selected_option=selected_option,
        rationale=data.get("rationale", ""),
        steps=steps,
        risks=data.get("risks", []),
        contingencies=data.get("contingencies", []),
        kpis=data.get("kpis", []),
    )


async def run_pass3(
    db: AsyncSession,
    session: DecisionSession,
    selected_option: str,
) -> ActionPlan:
    """
    Full Pass 3 pipeline:
    1. Read state
    2. Call LLM with selected option + user profile
    3. Parse action plan
    4. Update session.current_state
    5. Return ActionPlan
    """
    state = state_from_dict(session.current_state)

    # Build factor responses summary
    factor_map = {f.id: f.label for f in state.factors}
    factor_lines = []
    for af in state.answered_factors:
        label = factor_map.get(af.factor_id, af.factor_id)
        factor_lines.append(f"- {label}: {', '.join(af.responses)}")
    factor_responses_text = "\n".join(factor_lines) or "No responses recorded."

    weights = state.analytical_weights
    weights_text = (
        f"learning={weights.learning}, freedom={weights.freedom}, "
        f"income={weights.income}, stability={weights.stability}"
        if weights else "equal weights (25 each)"
    )

    messages = [
        {"role": "system", "content": PASS3_SYSTEM},
        {
            "role": "user",
            "content": PASS3_USER_TEMPLATE.format(
                raw_prompt=state.raw_prompt,
                selected_option=selected_option,
                factor_responses=factor_responses_text,
                analytical_weights=weights_text,
            ),
        },
    ]

    logger.info("Pass 3 – calling LLM for session %s, option=%s", session.id, selected_option)
    data = await call_llm(messages)

    plan = _parse_action_plan(data, session.id, selected_option)

    # Persist to state
    new_state_dict = apply_action_plan(session.current_state, plan)
    session.current_state = new_state_dict
    await db.flush()

    logger.info("Pass 3 complete – session %s, %d steps", session.id, len(plan.steps))
    return plan

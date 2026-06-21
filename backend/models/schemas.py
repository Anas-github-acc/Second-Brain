"""
models/schemas.py – Pydantic v2 schemas aligned with new unified state store.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Discovery Engine – Pass 1
# ─────────────────────────────────────────────────────────────────────────────

class DiscoveryQuestion(BaseModel):
    id: int
    text: str
    context_tradeoff: str = ""
    options: list[str] = Field(default_factory=list)
    allow_custom: bool = True
    can_skip: bool = False
    is_open: bool = False
    is_user_goal: bool = False


class DiscoveryState(BaseModel):
    target_identified: bool = False
    user_goal: Optional[str] = None
    paths: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    questions: list[DiscoveryQuestion] = Field(default_factory=list)
    user_responses: dict[str, str] = Field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Scenario Graph Engine – Pass 2
# ─────────────────────────────────────────────────────────────────────────────

class RedditLink(BaseModel):
    title: str
    url: str


class ScenarioNodeData(BaseModel):
    label: str
    about: str = ""
    how_this_helps_reach_goal: str = ""
    reddit_links: list[RedditLink] = Field(default_factory=list)
    is_expanded: bool = True
    time_estimate: Optional[str] = None


class ChildEdge(BaseModel):
    target_id: str
    label: str
    animation: bool


class ScenarioGraphNode(BaseModel):
    id: str
    type: str  # "root" | "comparisonRoot" | "unionPath" | "outcome" | "failureFork" | "riskMitigation"
    position: dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0})
    data: ScenarioNodeData
    children: list[ChildEdge] = Field(default_factory=list)


class ScenarioGraph(BaseModel):
    node_count: int = 0
    nodes: list[ScenarioGraphNode] = Field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# Unified Session State
# ─────────────────────────────────────────────────────────────────────────────

class UnifiedSession(BaseModel):
    session_id: str
    user_name: str
    raw_prompt: str
    status: str = "discovery"  # "discovery" | "questioning" | "generating" | "complete"
    discovery: DiscoveryState = Field(default_factory=DiscoveryState)
    scenario_graph: ScenarioGraph = Field(default_factory=ScenarioGraph)
    created_at: datetime
    updated_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Request Bodies
# ─────────────────────────────────────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    user_name: str = Field(..., min_length=1, max_length=255)
    raw_prompt: str = Field(..., min_length=5)


class SubmitAnswersRequest(BaseModel):
    responses: dict[str, str]  # { "q_0": "answer", "q_1": "skip" }


class GenerateGraphRequest(BaseModel):
    pass  # uses session state


class WhatIfRequest(BaseModel):
    target_node_id: str
    what_if_query: str = Field(..., min_length=5)


# ─────────────────────────────────────────────────────────────────────────────
# Response Schemas
# ─────────────────────────────────────────────────────────────────────────────

class DiscoveryResponse(BaseModel):
    session_id: str
    discovery: DiscoveryState


class GraphResponse(BaseModel):
    session_id: str
    scenario_graph: ScenarioGraph


class WhatIfExpansionResult(BaseModel):
    new_node_count: int
    appended_nodes: list[ScenarioGraphNode]
    new_links_from_target: list[ChildEdge]


class WhatIfResponse(BaseModel):
    session_id: str
    target_node_id: str
    scenario_graph: ScenarioGraph  # full updated graph

"""
services/confidence_engine.py – Computes confidence score from answered factors.
"""
from __future__ import annotations

from models.schemas import AnsweredFactor, ConfidenceResponse, Factor


def compute_confidence(
    session_id: str,
    factors: list[Factor],
    answered_factors: list[AnsweredFactor],
) -> ConfidenceResponse:
    """
    confidence = sum(importance for answered factors)
                 / sum(importance for all factors) * 100

    Returns a ConfidenceResponse with confidence %, answered ids, and missing ids.
    """
    if not factors:
        return ConfidenceResponse(
            session_id=session_id,
            confidence=0.0,
            answered_factors=[],
            missing_factors=[],
        )

    answered_ids = {af.factor_id for af in answered_factors}
    total_importance = sum(f.importance for f in factors)

    if total_importance == 0:
        # Edge case: all importances are 0 – just count answered ratio
        confidence = (len(answered_ids) / len(factors)) * 100.0
    else:
        answered_importance = sum(
            f.importance for f in factors if f.id in answered_ids
        )
        confidence = (answered_importance / total_importance) * 100.0

    missing = [f.id for f in factors if f.id not in answered_ids]
    answered = [f.id for f in factors if f.id in answered_ids]

    return ConfidenceResponse(
        session_id=session_id,
        confidence=round(confidence, 2),
        answered_factors=answered,
        missing_factors=missing,
    )

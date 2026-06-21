"""
services/tradeoff_engine.py – Local (no-LLM) computation of analytical weights.

Maps user factor answers → (learning, freedom, income, stability) weights
that sum to 100, reflecting the user's revealed priorities.
"""
from __future__ import annotations

from models.schemas import AnalyticalWeights, AnsweredFactor, Factor


# ─── Keyword heuristics ───────────────────────────────────────────────────────

_HIGH_RISK_TOKENS = {
    "high risk", "risk taker", "startup", "entrepreneur",
    "bold", "aggressive", "gamble", "go all in",
}
_LOW_RISK_TOKENS = {
    "safe", "stable", "low risk", "secure", "conservative",
    "no risk", "risk-averse", "cautious",
}
_STUDENT_TOKENS = {
    "student", "study", "college", "university", "masters",
    "phd", "degree", "graduate", "learning", "academic",
}
_SAVINGS_TOKENS = {
    "savings", "saved", "emergency fund", "financially secure",
    "no debt", "debt-free", "money saved",
}
_INCOME_TOKENS = {
    "high salary", "money", "income", "compensation", "pay",
    "financial", "earn", "lucrative",
}
_FREEDOM_TOKENS = {
    "freedom", "flexible", "autonomy", "remote", "independence",
    "own boss", "work from home", "wfh",
}


def _token_match(text: str, tokens: set[str]) -> bool:
    lower = text.lower()
    return any(t in lower for t in tokens)


def _score_responses(responses: list[str], tokens: set[str]) -> float:
    """Return 0-1 match fraction across all response strings."""
    if not responses:
        return 0.0
    matches = sum(1 for r in responses if _token_match(r, tokens))
    return matches / len(responses)


# ─── Public API ───────────────────────────────────────────────────────────────

def compute_weights(
    factors: list[Factor],
    answered_factors: list[AnsweredFactor],
) -> AnalyticalWeights:
    """
    Compute analytical weights from factor answers without calling an LLM.

    Base weights start at 25 each (equal). Then adjust:
    - High risk tolerance   → +freedom, –stability
    - Low risk tolerance    → +stability, –freedom
    - Student / learning    → +learning
    - Good savings          → –income penalty (can tolerate lower pay)
    - Income emphasis       → +income
    - Freedom emphasis      → +freedom
    """
    # Flatten all responses into a single corpus for global signals
    all_responses: list[str] = []
    for af in answered_factors:
        all_responses.extend(af.responses)

    learning = 25.0
    freedom = 25.0
    income = 25.0
    stability = 25.0

    if all_responses:
        risk_high = _score_responses(all_responses, _HIGH_RISK_TOKENS)
        risk_low = _score_responses(all_responses, _LOW_RISK_TOKENS)
        student = _score_responses(all_responses, _STUDENT_TOKENS)
        savings = _score_responses(all_responses, _SAVINGS_TOKENS)
        income_emphasis = _score_responses(all_responses, _INCOME_TOKENS)
        freedom_emphasis = _score_responses(all_responses, _FREEDOM_TOKENS)

        # Risk tolerance adjustments (±10 points each)
        freedom += risk_high * 10.0
        stability -= risk_high * 10.0
        stability += risk_low * 10.0
        freedom -= risk_low * 10.0

        # Student / learning stage
        learning += student * 15.0

        # Good savings → income less critical
        income -= savings * 8.0

        # Explicit income / freedom signals
        income += income_emphasis * 8.0
        freedom += freedom_emphasis * 8.0

    # Factor-category weighting: boost dimensions that have high-importance answered factors
    factor_map = {f.id: f for f in factors}
    for af in answered_factors:
        factor = factor_map.get(af.factor_id)
        if factor is None:
            continue
        boost = factor.importance * 5.0  # max +5 per factor
        cat = factor.category.lower()
        if cat == "financial":
            income += boost
        elif cat == "career":
            learning += boost * 0.5
            income += boost * 0.5
        elif cat == "personal":
            freedom += boost
        elif cat == "health":
            stability += boost

    # Clamp all values to [5, 60] to avoid degenerate extremes
    learning = max(5.0, min(60.0, learning))
    freedom = max(5.0, min(60.0, freedom))
    income = max(5.0, min(60.0, income))
    stability = max(5.0, min(60.0, stability))

    # Normalise to sum = 100
    total = learning + freedom + income + stability
    scale = 100.0 / total

    return AnalyticalWeights(
        learning=round(learning * scale, 2),
        freedom=round(freedom * scale, 2),
        income=round(income * scale, 2),
        stability=round(stability * scale, 2),
    )

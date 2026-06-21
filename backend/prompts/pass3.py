"""
prompts/pass3.py – Prompt templates for Pass 3: Action Plan generation.
"""

PASS3_SYSTEM = """\
You are a strategic life coach AI. Generate a concrete, actionable plan for the user's chosen decision path.

Always return ONLY valid JSON — no markdown fences, no prose, no explanation.
"""

PASS3_USER_TEMPLATE = """\
Decision context: "{raw_prompt}"
Chosen option: "{selected_option}"

User profile from responses:
{factor_responses}

Analytical weights:
{analytical_weights}

Return a JSON object:
{{
  "rationale": "string (3-4 sentences explaining why this is the right choice given user's profile)",
  "steps": [
    {{
      "step": 1,
      "title": "string",
      "description": "string (detailed, actionable)",
      "timeline": "string (e.g. 'Week 1-2', 'Month 1', 'Month 2-3')",
      "resources": ["resource1", "resource2"],
      "success_metric": "string (measurable outcome)"
    }}
  ],
  "risks": [
    "string (specific risk for this choice)"
  ],
  "contingencies": [
    "string (what to do if risk materialises)"
  ],
  "kpis": [
    "string (key performance indicator to track)"
  ]
}}

Rules:
1. Include 6-10 concrete action steps ordered chronologically.
2. Steps must cover: immediate actions (week 1-4), short-term (month 1-3), medium-term (month 3-12).
3. Each step must have a measurable success_metric.
4. Include 3-5 risks and matching contingencies.
5. Include 4-6 KPIs.
6. Resources should be specific (book titles, websites, people to contact, tools).
"""

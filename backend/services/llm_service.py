"""
services/llm_service.py – Async OpenRouter client with per-pass model targeting,
fallback chain, and JSON fence stripping.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, AsyncIterator

import httpx

from config import settings

logger = logging.getLogger(__name__)

# ─── JSON cleaning ────────────────────────────────────────────────────────────

_FENCE_RE = re.compile(
    r"^```(?:json)?\s*\n?(.*?)\n?```\s*$",
    re.DOTALL | re.IGNORECASE,
)


def strip_json_fences(text: str) -> str:
    """Remove markdown code fences from LLM output."""
    stripped = text.strip()
    m = _FENCE_RE.match(stripped)
    if m:
        return m.group(1).strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?", "", stripped).strip()
        stripped = re.sub(r"```$", "", stripped).strip()
    return stripped


def clean_json_raw(s: str) -> str:
    """
    Cleans a raw JSON string from LLMs:
    1. Escapes unescaped inner quotes inside strings.
    2. Escapes raw newlines and tabs inside strings.
    3. Removes trailing commas outside strings.
    """
    result = []
    in_string = False
    escaped = False
    n = len(s)
    i = 0
    while i < n:
        char = s[i]
        if in_string:
            if escaped:
                result.append(char)
                escaped = False
            elif char == '\\':
                result.append(char)
                escaped = True
            elif char == '"':
                j = i + 1
                while j < n and s[j].isspace():
                    j += 1
                is_closing = False
                if j == n:
                    is_closing = True
                elif s[j] in (',', '}', ']', ':'):
                    is_closing = True

                if is_closing:
                    in_string = False
                    result.append(char)
                else:
                    result.append('\\"')
            elif char == '\n':
                result.append('\\n')
            elif char == '\t':
                result.append('\\t')
            else:
                result.append(char)
        else:
            if char == '"':
                in_string = True
                result.append(char)
            elif char == ',':
                j = i + 1
                while j < n and s[j].isspace():
                    j += 1
                if j < n and s[j] in ('}', ']'):
                    pass
                else:
                    result.append(char)
            else:
                result.append(char)
        i += 1
    return "".join(result)


def parse_llm_json(raw: str) -> Any:
    """Strip fences, clean common JSON errors, then parse JSON."""
    cleaned = strip_json_fences(raw)
    cleaned = clean_json_raw(cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        for start_char, end_char in [('{', '}'), ('[', ']')]:
            start = cleaned.find(start_char)
            end = cleaned.rfind(end_char)
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(cleaned[start: end + 1])
                except json.JSONDecodeError:
                    pass
        
        # Format detailed error context
        pos = exc.pos
        context_start = max(0, pos - 100)
        context_end = min(len(cleaned), pos + 100)
        error_context = cleaned[context_start:context_end]
        marker = " " * (pos - context_start) + "^"
        raise ValueError(
            f"Could not parse LLM JSON output: {exc}\n"
            f"Error context (around char {pos}):\n"
            f"{error_context}\n"
            f"{marker}\n"
            f"---\n"
            f"Full clean response (first 2000 chars):\n"
            f"{cleaned[:2000]}"
        ) from exc


# ─── HTTP client singleton ────────────────────────────────────────────────────

_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=180.0)
    return _http_client


async def close_http_client() -> None:
    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None


# ─── Core completion call ─────────────────────────────────────────────────────

async def _call_model(
    model: str,
    messages: list[dict[str, str]],
) -> str:
    """Call a single model on OpenRouter. Returns the raw assistant text."""
    client = get_http_client()
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": settings.HTTP_REFERER,
        "X-Title": settings.X_TITLE,
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 4096,
    }
    response = await client.post(
        f"{settings.OPENROUTER_BASE_URL}/chat/completions",
        headers=headers,
        json=payload,
    )
    response.raise_for_status()
    data = response.json()

    choices = data.get("choices", [])
    if not choices:
        raise ValueError(f"No choices returned from model {model}: {data}")
    content = choices[0].get("message", {}).get("content", "")
    if not content:
        raise ValueError(f"Empty content from model {model}")
    return content


# ─── Public API ──────────────────────────────────────────────────────────────

async def call_llm_with_model(
    primary_model: str,
    messages: list[dict[str, str]],
) -> Any:
    """
    Try primary_model first, then fall back through LLM_MODEL_PRIORITY.
    Returns parsed JSON.
    """
    models_to_try = [primary_model] + [
        m for m in settings.LLM_MODEL_PRIORITY if m != primary_model
    ]
    last_error: Exception | None = None
    for model in models_to_try:
        try:
            logger.info("Calling LLM model: %s", model)
            raw = await _call_model(model, messages)
            result = parse_llm_json(raw)
            logger.info("Model %s succeeded", model)
            return result
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "Model %s returned HTTP %s: %s",
                model,
                exc.response.status_code,
                exc.response.text[:200],
            )
            last_error = exc
        except (ValueError, json.JSONDecodeError) as exc:
            logger.warning("Model %s JSON parse error: %s", model, exc)
            last_error = exc
        except Exception as exc:  # noqa: BLE001
            logger.warning("Model %s unexpected error: %s", model, exc)
            last_error = exc

    raise RuntimeError(
        f"All LLM models failed. Last error: {last_error}"
    ) from last_error


async def call_llm(messages: list[dict[str, str]]) -> Any:
    """Legacy call using default priority list."""
    return await call_llm_with_model(settings.LLM_MODEL_PRIORITY[0], messages)

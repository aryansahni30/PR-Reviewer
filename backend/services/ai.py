import asyncio
import logging
import os
import json
import re
from openai import AsyncOpenAI, NotFoundError, APIStatusError

logger = logging.getLogger(__name__)

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = "deepseek-ai/deepseek-v3.2"
FALLBACK_MODEL = "qwen/qwen3.5-122b-a10b"
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 529}

RESPONSE_SCHEMA = """
{
  "summary": "A concise summary of what this PR does and its overall quality",
  "health_score": 85,
  "language": "Python",
  "issues": [
    {
      "severity": "bug",
      "file": "src/main.py",
      "line": 42,
      "description": "Potential null pointer dereference: variable may be None before use",
      "confidence": 92
    }
  ]
}
"""

SEVERITY_OPTIONS = '"bug", "warning", or "suggestion"'


def build_system_prompt(language: str, strict_mode: bool) -> str:
    base = (
        "You are a strict senior software engineer doing a first-pass code review. "
        "Respond only in valid JSON matching the exact schema provided. "
        "No markdown, no explanation, just JSON."
    )

    if strict_mode:
        base += " Be extremely critical. Flag every issue no matter how minor."

    lang_lower = language.lower()
    if "python" in lang_lower:
        base += " Flag missing type hints, unused imports, PEP8 violations."
    elif "javascript" in lang_lower or "typescript" in lang_lower:
        base += " Flag console.logs, unhandled promises, missing error handling."

    return base


def build_user_prompt(
    diff: str,
    pr_title: str,
    pr_description: str,
    file_contexts: dict[str, str] | None = None,
) -> str:
    # Build the file-context section if we have full file contents
    context_section = ""
    if file_contexts:
        context_parts = []
        for filepath, content in file_contexts.items():
            context_parts.append(f"--- {filepath} ---\n{content}")
        context_section = (
            "\n\n=== Full source of changed files (use this for context) ===\n"
            + "\n\n".join(context_parts)
            + "\n=== End of file context ==="
        )

    return f"""Review the following GitHub Pull Request diff and return a JSON analysis.

PR Title: {pr_title}
PR Description: {pr_description or "No description provided."}

IMPORTANT: Respond ONLY with valid JSON matching this exact schema:
{RESPONSE_SCHEMA}

Rules:
- "severity" must be one of: {SEVERITY_OPTIONS}
- "health_score" is 0-100 (100 = perfect code, 0 = critical issues everywhere)
- "confidence" is 0-100 percentage of how confident you are in the issue
- "line" should be the approximate line number in the file where the issue occurs (use 0 if unknown)
- Include at least the most important issues; be thorough but not redundant
- The "language" field should be the primary language detected in the diff
- For Markdown (.md) or documentation files, ONLY flag critical issues (e.g., completely broken formatting). Do NOT flag minor typos, broken reference examples, or stylistic choices. Severity of documentation issues should rarely be "bug".
- You are provided the full source of each changed file below. Use it to verify whether variables, functions, and imports exist before flagging them as undefined.
{context_section}

Diff to review:
```
{diff}
```

Return only the JSON object. No markdown fences, no explanation."""


def extract_json_from_response(text: str) -> dict:
    """Extract and parse JSON from the model's response text.

    DeepSeek v3.2 wraps output in markdown fences despite instructions.
    Four-stage extraction with greedy matching to handle nested objects
    and a final truncation-repair pass for cut-off responses.
    """
    text = text.strip()

    # Stage 1: direct parse (model obeyed instructions)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Stage 2: markdown fence — GREEDY [\s\S]* so nested braces don't truncate
    match = re.search(r"```(?:json)?\s*(\{[\s\S]*\})\s*```", text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Stage 3: find outermost JSON object anywhere in the text
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # Stage 4: truncation repair — response was cut off mid-JSON
    # Find the start of JSON and try to close all open brackets
    json_start = text.find("{")
    if json_start != -1:
        fragment = text[json_start:]
        repaired = _try_repair_truncated_json(fragment)
        if repaired is not None:
            return repaired

    raise ValueError(f"Could not extract valid JSON from model response: {text[:500]}")


def _try_repair_truncated_json(fragment: str) -> dict | None:
    """Attempt to repair truncated JSON by closing open structures.

    Strategy: strip the last incomplete value/key, then close all
    open brackets and braces.
    """
    # Remove any trailing incomplete string (cut mid-word)
    # Look for the last complete key-value or array element
    # Try progressively shorter prefixes to find a repairable point
    for trim in range(min(200, len(fragment)), 0, -1):
        candidate = fragment[: len(fragment) - trim]

        # Strip trailing partial tokens: commas, colons, partial strings
        candidate = candidate.rstrip()
        while candidate and candidate[-1] in (',', ':', '"', "'"):
            candidate = candidate[:-1].rstrip()

        # Count open vs close brackets
        open_braces = candidate.count("{") - candidate.count("}")
        open_brackets = candidate.count("[") - candidate.count("]")

        if open_braces < 0 or open_brackets < 0:
            continue

        # Close everything
        candidate += "]" * open_brackets + "}" * open_braces

        try:
            data = json.loads(candidate)
            if isinstance(data, dict) and "summary" in data:
                logger.warning("Repaired truncated JSON (trimmed %d chars)", trim)
                return data
        except json.JSONDecodeError:
            continue

    return None


async def _call_with_fallback(
    client: AsyncOpenAI,
    model: str,
    messages: list,
    max_retries: int = 3,
) -> object:
    """Try `model` with retries, then fall back to FALLBACK_MODEL if it stays down.

    Retry schedule: 2s → 4s → 8s (per model). Total worst-case wait before
    falling back: ~14s. If the fallback also fails, the error propagates.
    """
    for current_model in [model, FALLBACK_MODEL]:
        last_error: Exception | None = None

        for attempt in range(max_retries):
            try:
                response = await client.chat.completions.create(
                    model=current_model,
                    messages=messages,
                    max_tokens=8192,
                    temperature=0.2,
                )
                if current_model != model:
                    logger.warning("Used fallback model '%s' (primary '%s' was down)", current_model, model)
                return response, current_model
            except NotFoundError as e:
                last_error = e
                wait = 2 ** (attempt + 1)
                logger.warning(
                    "NVIDIA 404 for '%s', attempt %d/%d — retrying in %ds",
                    current_model, attempt + 1, max_retries, wait,
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(wait)
            except APIStatusError as e:
                if e.status_code in _RETRYABLE_STATUS_CODES and attempt < max_retries - 1:
                    last_error = e
                    wait = 2 ** (attempt + 1)
                    logger.warning(
                        "NVIDIA %d for '%s', attempt %d/%d — retrying in %ds",
                        e.status_code, current_model, attempt + 1, max_retries, wait,
                    )
                    await asyncio.sleep(wait)
                else:
                    raise

        logger.error("Model '%s' unavailable after %d attempts, trying next.", current_model, max_retries)

    raise ValueError(
        f"Both '{model}' and fallback '{FALLBACK_MODEL}' are unavailable. Try again later."
    ) from last_error


async def analyze_pr_diff(
    diff: str,
    pr_title: str,
    pr_description: str,
    language: str,
    strict_mode: bool = False,
    model: str = DEFAULT_MODEL,
    file_contexts: dict[str, str] | None = None,
) -> dict:
    """Call NVIDIA API to analyze a PR diff and return structured feedback.

    Retries the real request directly on cold-start 404s and other transient
    errors (2s → 4s → 8s → 16s → 32s backoff, 5 attempts total).
    No separate warm-up call — retrying the actual payload is both simpler
    and correct: the container warms up by the time one of the retries lands.
    """
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise ValueError("NVIDIA_API_KEY environment variable is not set.")

    client = AsyncOpenAI(
        base_url=NVIDIA_BASE_URL,
        api_key=api_key,
        timeout=120.0,
    )

    system_prompt = build_system_prompt(language, strict_mode)
    user_content = build_user_prompt(diff, pr_title, pr_description, file_contexts)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    response, used_model = await _call_with_fallback(client, model, messages)

    response_text = response.choices[0].message.content or ""

    if not response_text.strip():
        raise ValueError("Model returned an empty response.")

    result = extract_json_from_response(response_text)
    result = normalize_ai_response(result, language)
    result["model_used"] = used_model
    return result


def normalize_ai_response(data: dict, detected_language: str) -> dict:
    """Normalize and validate the AI response to match our expected schema."""
    normalized = {
        "summary": str(data.get("summary", "No summary provided.")),
        "health_score": max(0, min(100, int(data.get("health_score", 50)))),
        "language": str(data.get("language", detected_language)),
        "issues": [],
    }

    valid_severities = {"bug", "warning", "suggestion"}
    for issue in data.get("issues", []):
        if not isinstance(issue, dict):
            continue
        severity = str(issue.get("severity", "suggestion")).lower()
        if severity not in valid_severities:
            severity = "suggestion"
        normalized["issues"].append(
            {
                "severity": severity,
                "file": str(issue.get("file", "unknown")),
                "line": max(0, int(issue.get("line", 0))),
                "description": str(issue.get("description", "")),
                "confidence": max(0, min(100, int(issue.get("confidence", 70)))),
            }
        )

    severity_order = {"bug": 0, "warning": 1, "suggestion": 2}
    normalized["issues"].sort(key=lambda x: severity_order.get(x["severity"], 3))

    return normalized

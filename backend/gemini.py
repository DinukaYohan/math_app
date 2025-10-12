"""
Gemini adapter: minimal wrapper to call Google's Generative AI.

Design goals:
- Keep interface aligned with llm.generate(prompt, max_new_tokens).
- Import google-generativeai lazily to avoid hard dependency unless used.
- Read API key from env vars: GEMINI_API_KEY or GOOGLE_API_KEY.
- Allow model override via GEMINI_MODEL (default: gemini-2.5-flash).
- Default max tokens is 512 for more headroom.
"""

from __future__ import annotations

import os
from typing import Optional


class _MissingDependency(Exception):
    pass


def _load_sdk():
    """Import the Google Generative AI SDK lazily.

    Raises _MissingDependency if the package is not installed.
    """
    try:
        import google.generativeai as genai  # type: ignore
        return genai
    except Exception as e:  # broad: package may be absent or misconfigured
        raise _MissingDependency(
            "google-generativeai is not installed. Add it to requirements.txt and pip install it."
        ) from e


def _configure(genai, api_key: Optional[str]):
    key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not key:
        raise RuntimeError(
            "Gemini API key not set. Provide GEMINI_API_KEY or GOOGLE_API_KEY in the environment."
        )
    genai.configure(api_key=key)


def _build_model(genai, max_new_tokens: int):
    model_id = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    # Ensure a sane floor for output tokens: Gemini can occasionally emit
    # empty candidates when the cap is too low. Allow env override.
    floor = 512
    env_override = os.getenv("GEMINI_MAX_OUTPUT_TOKENS")
    try:
        if env_override:
            floor = max(floor, int(env_override))
    except Exception:
        pass

    max_tokens = int(max(max_new_tokens or 0, floor))

    return genai.GenerativeModel(
        model_id,
        generation_config={
            "max_output_tokens": max_tokens,
            "temperature": float(os.getenv("GEMINI_TEMPERATURE", "0.7")),
            # Ensure responses are returned as plain text parts
            "response_mime_type": "text/plain",
        },
    )


def _candidate_text(resp) -> Optional[str]:
    """Extract the first non-empty text from the response.

    Be tolerant of SDK variations where parts may be objects, dicts, or raw strings.
    """
    # Fast path: some SDKs expose a convenience accessor
    try:
        txt = getattr(resp, "text", None)
        if isinstance(txt, str) and txt.strip():
            return txt.strip()
    except Exception:
        pass

    cands = getattr(resp, "candidates", None) or []
    for cand in cands:
        parts = getattr(getattr(cand, "content", None), "parts", None) or []
        for part in parts:
            # Object-style (TextPart.text)
            text = getattr(part, "text", None)
            if isinstance(text, str) and text.strip():
                return text.strip()
            # Dict-style ({"text": ...})
            if isinstance(part, dict):
                t = part.get("text")
                if isinstance(t, str) and t.strip():
                    return t.strip()
            # Raw string part
            if isinstance(part, str) and part.strip():
                return part.strip()
    return None


def _format_finish_reason(resp) -> str:
    cands = getattr(resp, "candidates", None) or []

    reasons = []
    safety = []

    for cand in cands:
        finish = getattr(cand, "finish_reason", None)
        reason_name = getattr(finish, "name", None)
        if reason_name:
            reasons.append(reason_name)
        elif isinstance(finish, str):
            reasons.append(finish)
        elif finish is not None:
            reasons.append(str(finish))

        for rating in getattr(cand, "safety_ratings", None) or []:
            cat = getattr(rating, "category", None)
            if not cat:
                continue
            bits = []
            prob = getattr(rating, "probability", None) or getattr(rating, "probability_score", None)
            severity = getattr(rating, "severity", None)
            blocked = getattr(rating, "blocked", None)
            if prob:
                bits.append(str(prob))
            if severity:
                bits.append(str(severity))
            if blocked is True:
                bits.append("blocked")
            elif blocked is False:
                bits.append("allowed")
            detail = ", ".join(bits)
            safety.append(f"{cat}{': ' + detail if detail else ''}")

    def _unique(seq):
        seen = set()
        out = []
        for item in seq:
            if item not in seen:
                seen.add(item)
                out.append(item)
        return out

    reason_str = ", ".join(_unique(reasons)) if reasons else "unknown"
    safety_str = "; ".join(_unique(safety)) if safety else ""

    if safety_str:
        return f"finish_reason={reason_str}; safety={safety_str}"
    return f"finish_reason={reason_str}"


def generate(prompt: str, max_new_tokens: int = 512, *, api_key: Optional[str] = None) -> str:
    """Generate text from Gemini for a single prompt.

    Args:
        prompt: Input text prompt.
        max_new_tokens: Upper bound for output tokens.
        api_key: Optional override; otherwise uses env.

    Returns:
        The model's text response.
        """
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("prompt must be a non-empty string")

    format_instructions = (
        "Respond using the following structure exactly. Keep the section titles in bold markdown using double asterisks and end them with a colon:\n"
        "**Math Word Problem:**\n"
        "{one concise sentence describing the scenario}\n\n"
        "**Question:**\n"
        "{the single question that should be answered}\n\n"
        "**Answer:**\n"
        "{a short, correct answer that solves the problem}\n\n"
        "**Learning Objective:**\n"
        "{restate the learning objective from the prompt, or write 'Not specified.' if none is given}\n\n"
        "**Culturally Appropriate Example:**\n"
        "{one short sentence connecting the context to the region or culture mentioned; if none, write 'Not specified.'}\n"
        "Do not add extra sections or commentary."
    )

    final_prompt = prompt.strip()
    if "Math Word Problem:" not in final_prompt or "Answer:" not in final_prompt:
        final_prompt = f"{final_prompt}\n\n{format_instructions}"

    genai = _load_sdk()
    _configure(genai, api_key)
    model = _build_model(genai, max_new_tokens)

    try:
        resp = model.generate_content(final_prompt)
    except Exception as e:
        # Surface a readable error; the Flask layer will convert to JSON.
        raise RuntimeError(f"Gemini generation failed: {e}") from e

    content = _candidate_text(resp)
    if content:
        return content

    # No usable text: inspect finish reason and attempt one targeted retry
    reason = _format_finish_reason(resp)

    if "MAX_TOKENS" in reason:
        try:
            bigger = max(int(max_new_tokens) * 2, 1024)
        except Exception:
            bigger = 1024
        try:
            model2 = _build_model(genai, bigger)
            resp2 = model2.generate_content(final_prompt)
            content2 = _candidate_text(resp2)
            if content2:
                return content2
            # If still empty, annotate truncation for the caller instead of 500s
            reason2 = _format_finish_reason(resp2)
            return f"[Gemini] Output truncated (token limit). Details: {reason2}."
        except Exception:
            # Fall back to explanatory text
            return f"[Gemini] Output truncated (token limit). Details: {reason}."

    # Safety or other non-text outcomes: return explanatory text instead of raising
    return f"[Gemini] No content returned. Details: {reason}."

    # No usable text; expose finish reason and safety info to help callers debug.
    reason = _format_finish_reason(resp)
    raise RuntimeError(f"Gemini returned no text. Details: {reason}.")

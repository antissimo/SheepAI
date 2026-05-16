import os
from typing import Any

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

from agents.filter_agent import extract_json_object

STANDARDIZE_SYSTEM_PROMPT = """You are a report text standardization agent.

Your task:
1. Normalize noisy citizen report text.
2. Keep original meaning and concrete facts.
3. Translate the normalized text to English.

Return JSON only:
{
  "standardized_text_en": "..."
}

No markdown. No extra text.
"""

LOCALIZE_SYSTEM_PROMPT = """You are a localization agent.

Translate the given short fields from English to Croatian.
Keep meaning exactly, keep tone neutral and practical.

Return JSON only:
{
  "reason_hr": "...",
  "safety_warning_hr": null
}

No markdown. No extra text.
"""


def _gemini_model_info(model_name: str) -> dict[str, Any]:
    family = "gemini-2.0-flash"
    lowered = model_name.lower()
    if "2.5-pro" in lowered:
        family = "gemini-2.5-pro"
    elif "2.5-flash" in lowered:
        family = "gemini-2.5-flash"
    elif "1.5-pro" in lowered:
        family = "gemini-1.5-pro"
    elif "1.5-flash" in lowered:
        family = "gemini-1.5-flash"
    return {
        "vision": False,
        "function_calling": False,
        "json_output": True,
        "structured_output": False,
        "multiple_system_messages": True,
        "family": family,
    }


async def _run_json_task(system_prompt: str, task: str) -> dict[str, Any] | None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    base_url = os.getenv(
        "GEMINI_BASE_URL",
        "https://generativelanguage.googleapis.com/v1beta/openai/",
    ).strip()

    client = OpenAIChatCompletionClient(
        model=model,
        api_key=api_key,
        base_url=base_url,
        model_info=_gemini_model_info(model),
    )
    try:
        agent = AssistantAgent(
            name="split_standardize_agent",
            model_client=client,
            system_message=system_prompt,
        )
        response = await agent.run(task=task)
        messages = getattr(response, "messages", None) or []
        raw = None
        for message in reversed(messages):
            content = getattr(message, "content", None)
            if isinstance(content, str) and content.strip():
                raw = content.strip()
                break
        if raw is None:
            raw = str(response)
        return extract_json_object(raw)
    except Exception:
        return None
    finally:
        try:
            await client.close()
        except Exception:
            pass


async def run_standardize_agent(text: str) -> str:
    task = (
        "Input citizen report text:\n"
        f"{text}\n\n"
        "Return JSON with standardized_text_en only."
    )
    parsed = await _run_json_task(STANDARDIZE_SYSTEM_PROMPT, task)
    standardized = (parsed or {}).get("standardized_text_en")
    if isinstance(standardized, str) and standardized.strip():
        return standardized.strip()
    return text


async def localize_filter_fields(reason_en: str, safety_warning_en: str | None) -> tuple[str, str | None]:
    task = (
        "Fields to translate:\n"
        f"- reason_en: {reason_en!r}\n"
        f"- safety_warning_en: {safety_warning_en!r}\n"
        "Return JSON only."
    )
    parsed = await _run_json_task(LOCALIZE_SYSTEM_PROMPT, task)
    if not parsed:
        return reason_en, safety_warning_en

    reason_hr = parsed.get("reason_hr")
    safety_hr = parsed.get("safety_warning_hr")
    if not isinstance(reason_hr, str) or not reason_hr.strip():
        reason_hr = reason_en
    if safety_hr is not None and not isinstance(safety_hr, str):
        safety_hr = safety_warning_en
    return reason_hr.strip(), safety_hr

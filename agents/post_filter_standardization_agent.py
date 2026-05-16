import os
from pathlib import Path
from typing import Any

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

from agents.filter_agent import extract_json_object
from agents.schemas import StandardizationAgentResult

SYSTEM_PROMPT = """You are a standardization agent in a city issue pipeline.

Task:
1. Clean and normalize the citizen report text.
2. Keep only factual and actionable information.
3. Produce English text for downstream classification.

Return JSON only:
{
  "standardized_text_en": "...",
  "summary_en": "..."
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


async def run_post_filter_standardization_agent(
    text: str | None,
    lat: float | None,
    lng: float | None,
    district_suggestion: str | None,
    image_path: str | None = None,
    image_name: str | None = None,
) -> StandardizationAgentResult:
    base_text = text or "Image-only report submitted. Visual evidence attached."
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return StandardizationAgentResult(
            standardized_text_en=base_text,
            summary_en=base_text,
            raw_model_response="GEMINI_API_KEY is not set.",
        )

    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    base_url = os.getenv(
        "GEMINI_BASE_URL",
        "https://generativelanguage.googleapis.com/v1beta/openai/",
    ).strip()

    prompt = (
        "Input report context:\n"
        f"- text: {text!r}\n"
        f"- lat: {lat}\n"
        f"- lng: {lng}\n"
        f"- district_suggestion: {district_suggestion!r}\n"
        f"- image_path: {image_path!r}\n"
        f"- image_name: {image_name!r}\n"
        "Return JSON only."
    )

    client = OpenAIChatCompletionClient(
        model=model,
        api_key=api_key,
        base_url=base_url,
        model_info=_gemini_model_info(model),
    )
    try:
        agent = AssistantAgent(
            name="split_post_filter_standardization_agent",
            model_client=client,
            system_message=SYSTEM_PROMPT,
        )
        task_payload: Any = prompt

        # Best-effort vision path for image-only or mixed input.
        if image_path and Path(image_path).is_file():
            try:
                from autogen_core import Image as AGImage
                from PIL import Image as PILImage

                pil_image = PILImage.open(image_path).convert("RGB")
                task_payload = [
                    prompt
                    + "\nIf image is provided, extract concrete visual evidence and include it in standardized_text_en.",
                    AGImage.from_pil(pil_image),
                ]
            except Exception:
                task_payload = prompt

        response = await agent.run(task=task_payload)
        messages = getattr(response, "messages", None) or []
        raw = None
        for message in reversed(messages):
            content = getattr(message, "content", None)
            if isinstance(content, str) and content.strip():
                raw = content.strip()
                break
        if raw is None:
            raw = str(response)

        parsed = extract_json_object(raw)
        parsed["raw_model_response"] = raw
        return StandardizationAgentResult.model_validate(parsed)
    except Exception:
        return StandardizationAgentResult(
            standardized_text_en=base_text,
            summary_en=base_text,
            raw_model_response=None,
        )
    finally:
        try:
            await client.close()
        except Exception:
            pass

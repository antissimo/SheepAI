import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from agents.schemas import CitizenReportInput, FilterAgentResult

load_dotenv()

SYSTEM_PROMPT = """You are a Filter Agent for citizen reports in Split.

Your task is to decide whether a report is good enough to enter the city ticketing system.

A report is valid if:
- it describes a concrete issue in public space, traffic, safety, cleanliness, healthcare, or municipal order
- it contains enough information for city services to act
- location coordinates (lat/lng) and exact street address are optional at this stage
- it is not spam
- it is not only insults
- it is not obviously fake
- it is not a private issue outside city service scope

A report is invalid if:
- it has no meaningful issue description
- it contains only insults
- it is an obvious empty test
- it is unrelated to city services
- it asks for dangerous or illegal action
- it requests urgent intervention without enough actionable detail
- do NOT mark invalid only because lat/lng or exact address is missing

If the situation may be life-threatening, valid can still be true, but safety_warning must be:
"If there is immediate danger to life, health, or property, call 112 immediately."

Return JSON only in this format:
{
  "valid": true,
  "score": 0.85,
  "reason": "Short explanation why the report was accepted or rejected.",
  "missing_fields": [],
  "safety_warning": null,
  "image_used": false
}

Do not return markdown.
Do not return text outside JSON.
"""

OPTIONAL_LOCATION_FIELDS = {"lat", "lng", "latitude", "longitude", "address", "exact_address"}


def extract_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json"):
            stripped = stripped[4:].strip()

    decoder = json.JSONDecoder()
    for idx, char in enumerate(stripped):
        if char != "{":
            continue
        try:
            parsed, _ = decoder.raw_decode(stripped[idx:])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    raise ValueError("No JSON object found in model response.")


def _image_exists(path: str | None) -> bool:
    if not path:
        return False
    return Path(path).is_file()


def _build_user_prompt(report: CitizenReportInput, image_exists: bool, use_vision: bool) -> str:
    text = report.text or ""
    lat = "null" if report.lat is None else str(report.lat)
    lng = "null" if report.lng is None else str(report.lng)
    district = report.district_suggestion or "null"
    image_state = "yes" if image_exists else "no"
    image_instruction = (
        "Image analysis is enabled; include image signal only if truly used."
        if use_vision and image_exists
        else "Image analysis is not enabled. Do not infer image content."
    )
    return (
        "Input report:\n"
        f"- text: {text!r}\n"
        f"- lat: {lat}\n"
        f"- lng: {lng}\n"
        f"- district_suggestion: {district!r}\n"
        f"- image_present: {image_state}\n"
        f"- image_path: {report.image_path!r}\n"
        f"- note: {image_instruction}\n"
        "- rule: if image_present is yes, do NOT mark report as empty only because text is missing."
    )


def _fallback_result(reason: str, raw: str | None = None) -> FilterAgentResult:
    return FilterAgentResult(
        valid=False,
        score=0.0,
        reason=reason,
        missing_fields=["model_json"],
        safety_warning=None,
        image_used=False,
        raw_model_response=raw,
    )


def _normalize_missing_fields(fields: list[str]) -> list[str]:
    normalized = []
    for field in fields:
        key = field.strip().lower()
        if key in OPTIONAL_LOCATION_FIELDS:
            continue
        normalized.append(field)
    return normalized


def _gemini_model_info(model_name: str, vision_enabled: bool) -> dict[str, Any]:
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
        "vision": vision_enabled,
        "function_calling": False,
        "json_output": True,
        "structured_output": False,
        "multiple_system_messages": True,
        "family": family,
    }


async def run_filter_agent(report: CitizenReportInput) -> FilterAgentResult:
    if not report.text and not report.image_path:
        return FilterAgentResult(
            valid=False,
            score=0.0,
            reason="Report must contain at least text or image.",
            missing_fields=["text_or_image"],
            safety_warning=None,
            image_used=False,
            raw_model_response=None,
        )

    image_exists = _image_exists(report.image_path)
    if report.image_path and not image_exists:
        return FilterAgentResult(
            valid=False,
            score=0.0,
            reason="Provided image path does not exist.",
            missing_fields=["image_path"],
            safety_warning=None,
            image_used=False,
            raw_model_response=None,
        )

    use_vision = os.getenv("GEMINI_USE_VISION", "false").strip().lower() == "true"
    text_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    vision_model = os.getenv("GEMINI_VISION_MODEL", "gemini-2.0-flash")
    selected_model = vision_model if (use_vision and image_exists) else text_model
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_base_url = os.getenv(
        "GEMINI_BASE_URL",
        "https://generativelanguage.googleapis.com/v1beta/openai/",
    ).strip()

    if not gemini_api_key:
        return _fallback_result("GEMINI_API_KEY is not set.")

    try:
        from autogen_agentchat.agents import AssistantAgent
        from autogen_ext.models.openai import OpenAIChatCompletionClient
    except Exception as exc:
        return _fallback_result(
            f"AutoGen/Gemini dependency error: {exc}",
            raw=str(exc),
        )

    client = None
    raw_response: str | None = None
    vision_fallback_note = None
    try:
        client = OpenAIChatCompletionClient(
            model=selected_model,
            api_key=gemini_api_key,
            base_url=gemini_base_url,
            model_info=_gemini_model_info(selected_model, use_vision and image_exists),
        )
        agent = AssistantAgent(
            name="split_filter_agent",
            model_client=client,
            system_message=SYSTEM_PROMPT,
        )

        user_prompt = _build_user_prompt(
            report, image_exists=image_exists, use_vision=use_vision
        )
        task_payload: Any = user_prompt

        if use_vision and image_exists and report.image_path:
            # Best-effort multimodal path for Ollama vision model.
            try:
                from autogen_core import Image as AGImage
                from PIL import Image as PILImage

                pil_image = PILImage.open(report.image_path).convert("RGB")
                task_payload = [user_prompt, AGImage.from_pil(pil_image)]
            except Exception:
                vision_fallback_note = "Image was not analyzed due to technical fallback."
                task_payload = _build_user_prompt(
                    report, image_exists=image_exists, use_vision=False
                )

        try:
            response = await agent.run(task=task_payload)
        except Exception:
            if not (use_vision and image_exists):
                raise
            vision_fallback_note = "Image was not analyzed due to technical fallback."
            try:
                await client.close()
            except Exception:
                pass
            client = OpenAIChatCompletionClient(
                model=text_model,
                api_key=gemini_api_key,
                base_url=gemini_base_url,
                model_info=_gemini_model_info(text_model, False),
            )
            agent = AssistantAgent(
                name="split_filter_agent_text_fallback",
                model_client=client,
                system_message=SYSTEM_PROMPT,
            )
            fallback_prompt = _build_user_prompt(
                report, image_exists=image_exists, use_vision=False
            )
            response = await agent.run(task=fallback_prompt)

        messages = getattr(response, "messages", None) or []
        for message in reversed(messages):
            content = getattr(message, "content", None)
            if isinstance(content, str) and content.strip():
                raw_response = content.strip()
                break
        if raw_response is None:
            raw_response = str(response)

        try:
            parsed = extract_json_object(raw_response)
            parsed["raw_model_response"] = raw_response
            result = FilterAgentResult.model_validate(parsed)
        except Exception:
            return _fallback_result("Model did not return valid JSON.", raw=raw_response)

        result.missing_fields = _normalize_missing_fields(result.missing_fields)

        # Do not fail a report only because optional location/address is missing.
        reason_lower = result.reason.lower()
        location_only_reject = (
            not result.valid
            and not result.missing_fields
            and any(token in reason_lower for token in ["lat", "lng", "latitude", "longitude", "address"])
        )
        if location_only_reject:
            result.valid = True
            result.score = max(result.score, 0.7)
            result.reason = (
                "Report is valid. Exact address and coordinates are optional and can be provided later via map pin."
            )

        if vision_fallback_note:
            result.image_used = False
            result.reason = f"{result.reason} {vision_fallback_note}".strip()

        # Image-only reports are allowed; don't reject only because text is missing.
        if image_exists and not report.text:
            reason_lower = result.reason.lower()
            image_only_reject = (
                not result.valid
                and (
                    "empty" in reason_lower
                    or "text" in reason_lower
                    or "does not describe any issue" in reason_lower
                )
            )
            if image_only_reject:
                result.valid = True
                result.score = max(result.score, 0.6)
                result.reason = (
                    "Image-only report is accepted. Text details are missing, "
                    "but visual evidence is provided."
                )
                result.missing_fields = []

        return result
    except Exception as exc:
        return _fallback_result(f"Gemini/agent runtime error: {exc}", raw=raw_response)
    finally:
        if client is not None:
            try:
                await client.close()
            except Exception:
                pass

import json
import os
from pathlib import Path
from typing import Any

from agents.schemas import CitizenReportInput, FilterAgentResult

SYSTEM_PROMPT = """Ti si Filter Agent za građanske prijave u Splitu.

Tvoj posao je procijeniti je li prijava dovoljno dobra za ulazak u gradski ticketing sustav.

Prijava je validna ako:
- opisuje konkretan problem u javnom prostoru, prometu, sigurnosti, čistoći, zdravstvu ili komunalnom redu
- ima dovoljno informacija da služba može reagirati
- nije spam
- nije samo vrijeđanje
- nije očito lažna
- nije privatni problem koji gradske službe ne mogu riješiti

Prijava je nevalidna ako:
- nema nikakav opis problema
- sadrži samo uvrede
- očito je test bez sadržaja
- nema veze s gradskim službama
- traži nešto opasno ili nezakonito
- traži hitnu intervenciju, ali nema dovoljno informacija

Ako je problem potencijalno životno ugrožavajući, valid može biti true, ali safety_warning mora reći:
"Ako postoji neposredna opasnost za život, zdravlje ili imovinu, odmah nazovite 112."

Vrati isključivo JSON u ovom formatu:
{
  "valid": true,
  "score": 0.85,
  "reason": "Kratko objašnjenje zašto je prijava prihvaćena ili odbijena.",
  "missing_fields": [],
  "safety_warning": null,
  "image_used": false
}

Nemoj vraćati markdown.
Nemoj vraćati tekst izvan JSON-a.
"""


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
        "Ulazna prijava:\n"
        f"- text: {text!r}\n"
        f"- lat: {lat}\n"
        f"- lng: {lng}\n"
        f"- district_suggestion: {district!r}\n"
        f"- image_present: {image_state}\n"
        f"- image_path: {report.image_path!r}\n"
        f"- note: {image_instruction}"
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


async def run_filter_agent(report: CitizenReportInput) -> FilterAgentResult:
    if not report.text and not report.image_path:
        return FilterAgentResult(
            valid=False,
            score=0.0,
            reason="Prijava mora sadržavati barem tekst ili sliku.",
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
            reason="Dostavljena putanja slike ne postoji.",
            missing_fields=["image_path"],
            safety_warning=None,
            image_used=False,
            raw_model_response=None,
        )

    use_vision = os.getenv("OLLAMA_USE_VISION", "false").strip().lower() == "true"
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
    vision_model = os.getenv("OLLAMA_VISION_MODEL", "llava")
    selected_model = vision_model if (use_vision and image_exists) else ollama_model

    try:
        from autogen_agentchat.agents import AssistantAgent
        from autogen_ext.models.ollama import OllamaChatCompletionClient
    except Exception as exc:
        return _fallback_result(
            f"AutoGen/Ollama dependency error: {exc}",
            raw=str(exc),
        )

    client = None
    raw_response: str | None = None
    vision_fallback_note = None
    try:
        client = OllamaChatCompletionClient(model=selected_model)
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
                vision_fallback_note = "Slika nije analizirana zbog tehničkog fallbacka."
                task_payload = _build_user_prompt(
                    report, image_exists=image_exists, use_vision=False
                )

        try:
            response = await agent.run(task=task_payload)
        except Exception:
            if not (use_vision and image_exists):
                raise
            vision_fallback_note = "Slika nije analizirana zbog tehničkog fallbacka."
            try:
                await client.close()
            except Exception:
                pass
            client = OllamaChatCompletionClient(model=ollama_model)
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
            return _fallback_result("Model nije vratio validan JSON.", raw=raw_response)

        if vision_fallback_note:
            result.image_used = False
            result.reason = f"{result.reason} {vision_fallback_note}".strip()

        return result
    except Exception as exc:
        return _fallback_result(f"Ollama/agent runtime error: {exc}", raw=raw_response)
    finally:
        if client is not None:
            try:
                await client.close()
            except Exception:
                pass

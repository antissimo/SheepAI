import os
from typing import Any

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

from agents.filter_agent import extract_json_object
from agents.schemas import ClassificationAgentResult
from agents.sluzba import Sluzba

ALLOWED_SLUZBA_KEYS = [sluzba.name for sluzba in Sluzba]
ALLOWED_SLUZBA_TEXT = ", ".join(ALLOWED_SLUZBA_KEYS)

SYSTEM_PROMPT = f"""You are a classification agent for Split city issue tickets.

Supported services (use only these exact keys): {ALLOWED_SLUZBA_TEXT}

Classification techniques you must follow:
1) Keyword routing: map explicit cues (fire/smoke -> VATROGASCI, assault/theft -> POLICIJA, trash/waste -> CISTOCA, bus/tram delay -> JAVNI_PRIJEVOZ, water leak/sewer -> VODOVOD_KANALIZACIJA, streetlight outage -> JAVNA_RASVJETA, road pothole/signage damage -> ODRZAVANJE_CESTA, parking/municipal order -> KOMUNALNO_REDARSTVO).
2) Severity-first rule for hitnost: KRITICNA only for immediate life/property danger, VISOKA for urgent safety/major traffic disruption, SREDNJA for actionable but not immediate danger, NISKA for minor issues.
3) Ambiguity fallback: if signal is weak or conflicting, set sluzba=NEPOZNATO and explain uncertainty in opis_problema.
4) Brevity + structure: naslov must be short and concrete; opis_problema must be actionable and factual.
5) Duplicate estimate: broj_duplikata defaults to 0 unless text explicitly indicates repeated/same issue reports.

Classify the issue and return only JSON:
{{
  "hitnost": "NISKA|SREDNJA|VISOKA|KRITICNA",
  "naslov": "Kratki naslov problema",
  "sluzba": "{ALLOWED_SLUZBA_TEXT}",
  "opis_problema": "Sažet opis problema",
  "kotar": "Naziv kotara ili null",
  "lokacija": "lat,lng ili null",
  "broj_duplikata": 0,
  "status": "NOVO"
}}

No markdown. No extra text.
"""


def _heuristic_classification(
    standardized_text_en: str,
    lat: float | None,
    lng: float | None,
    district_suggestion: str | None,
    image_name: str | None,
    reason: str | None = None,
) -> ClassificationAgentResult:
    text = f"{standardized_text_en or ''} {(image_name or '')}".lower()

    sluzba = Sluzba.NEPOZNATO.name
    hitnost = "SREDNJA"
    naslov = "Prijavljen komunalni problem"
    opis = "Prijava zahtijeva dodatnu provjeru i ručnu potvrdu klasifikacije."

    if any(token in text for token in ["pozar", "fire", "smoke", "flame", "burn"]):
        sluzba = Sluzba.VATROGASCI.name
        hitnost = "VISOKA"
        naslov = "Sumnja na požar"
        opis = "Vizualni ili tekstualni signal upućuje na mogući požar."
    elif any(token in text for token in ["smece", "otpad", "kontejner", "container", "trash", "garbage"]):
        sluzba = Sluzba.CISTOCA.name
        hitnost = "SREDNJA"
        naslov = "Problem s otpadom"
        opis = "Vizualni ili tekstualni signal upućuje na problem sa smećem ili kontejnerom."
    elif any(token in text for token in ["rupa", "pothole", "road damage", "asfalt"]):
        sluzba = Sluzba.ODRZAVANJE_CESTA.name
        naslov = "Oštećenje ceste"
    elif any(token in text for token in ["svjetlo", "rasvjeta", "streetlight", "light outage"]):
        sluzba = Sluzba.JAVNA_RASVJETA.name
        naslov = "Kvar javne rasvjete"
    elif any(token in text for token in ["tučnjava", "napad", "theft", "assault", "police"]):
        sluzba = Sluzba.POLICIJA.name
        hitnost = "VISOKA"
        naslov = "Sigurnosni incident"

    if reason:
        opis = f"{opis} ({reason})"

    return ClassificationAgentResult(
        hitnost=hitnost,
        naslov=naslov,
        sluzba=sluzba,
        opis_problema=opis,
        kotar=district_suggestion,
        lokacija=f"{lat},{lng}" if lat is not None and lng is not None else None,
        broj_duplikata=0,
        status="NOVO",
        raw_model_response=None,
    )


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


async def run_classification_agent(
    standardized_text_en: str,
    lat: float | None,
    lng: float | None,
    district_suggestion: str | None,
    image_path: str | None = None,
    image_name: str | None = None,
) -> ClassificationAgentResult:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return _heuristic_classification(
            standardized_text_en,
            lat,
            lng,
            district_suggestion,
            image_name,
            reason="GEMINI_API_KEY nije postavljen.",
        )

    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    base_url = os.getenv(
        "GEMINI_BASE_URL",
        "https://generativelanguage.googleapis.com/v1beta/openai/",
    ).strip()
    prompt = (
        "Classify this standardized English report for Split city services.\n"
        f"- standardized_text_en: {standardized_text_en!r}\n"
        f"- lat: {lat}\n"
        f"- lng: {lng}\n"
        f"- district_suggestion: {district_suggestion!r}\n"
        f"- image_path: {image_path!r}\n"
        f"- image_name: {image_name!r}\n"
        "- If image is present, use visual evidence for service selection.\n"
        "- Do not return NEPOZNATO when there is clear visual signal.\n"
        "- If uncertain but issue is clearly public-space/utility, prefer KOMUNALNO_REDARSTVO over NEPOZNATO.\n"
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
            name="split_classification_agent",
            model_client=client,
            system_message=SYSTEM_PROMPT,
        )
        response = await agent.run(task=prompt)
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
        if parsed.get("sluzba") not in ALLOWED_SLUZBA_KEYS:
            parsed["sluzba"] = Sluzba.NEPOZNATO.name
        parsed["raw_model_response"] = raw
        result = ClassificationAgentResult.model_validate(parsed)
        image_name_l = (image_name or "").lower()
        text_l = standardized_text_en.lower()
        fire_signal = any(token in image_name_l for token in ["pozar", "fire", "smoke", "vatra"]) or any(
            token in text_l for token in ["fire", "flame", "smoke", "burning"]
        )
        if fire_signal:
            result.sluzba = Sluzba.VATROGASCI.name
            if result.hitnost in {"NISKA", "SREDNJA"}:
                result.hitnost = "VISOKA"
            if "požar" not in result.naslov.lower() and "fire" not in result.naslov.lower():
                result.naslov = "Sumnja na požar"
        # Avoid NEPOZNATO for image-only reports unless we truly have no signal.
        if result.sluzba == Sluzba.NEPOZNATO.name and image_path:
            result.sluzba = Sluzba.KOMUNALNO_REDARSTVO.name
            if "nepozn" in result.naslov.lower():
                result.naslov = "Vizualno prijavljen komunalni problem"
            if "bez dodatnih detalja" in result.opis_problema.lower():
                result.opis_problema = (
                    "Prijava je zaprimljena sa slikom. Potrebna je terenska provjera, "
                    "dodijeljeno komunalnom redarstvu kao početna služba."
                )
        if result.kotar is None:
            result.kotar = district_suggestion
        if result.lokacija is None and lat is not None and lng is not None:
            result.lokacija = f"{lat},{lng}"
        return result
    except Exception as exc:
        return _heuristic_classification(
            standardized_text_en,
            lat,
            lng,
            district_suggestion,
            image_name,
            reason=f"Greška klasifikacije: {exc}",
        )
    finally:
        try:
            await client.close()
        except Exception:
            pass

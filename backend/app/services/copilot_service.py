"""
Saarthi analyst copilot service.
Builds page-aware evidence context and uses Gemini 2.5 Flash when configured,
with a deterministic fallback and response sanitization.
"""
from __future__ import annotations

import asyncio
import json
import logging

from app.config import get_settings
from app.services import action_plan_service, evidence_service, green_gap_service, heat_service, ml_service, satellite_service, time_machine_service, vegetation_service

logger = logging.getLogger(__name__)

PAGE_PARAMETERS = {
    "dashboard": ["LST", "NDVI", "NO2", "SOIL_MOISTURE"],
    "analytics": ["LST", "NDVI", "NO2", "SOIL_MOISTURE"],
    "action-plan": ["LST", "NDVI", "NO2", "SOIL_MOISTURE"],
    "saarthi": ["LST", "NDVI", "NO2", "SOIL_MOISTURE"],
    "green-gap": ["NDVI", "LST"],
    "research": ["LST", "NDVI", "NO2"],
    "time-machine": ["LST"],
    "rankings": ["LST", "NDVI", "NO2", "SOIL_MOISTURE"],
}


def _safe_evidence_call(label: str, func):
    try:
        return func()
    except Exception as exc:
        logger.warning(f"Saarthi evidence call failed for {label}: {exc}")
        return {"error": f"{label} unavailable", "detail": str(exc)}


def _page_evidence(page: str, city: str, parameter: str | None, date_range: dict) -> dict:
    active_parameter = parameter or (PAGE_PARAMETERS.get(page, ["LST"])[0])
    if page == "analytics":
        return {
            "anomalies": ml_service.detect_anomalies(active_parameter, city, date_range=date_range),
            "trends": ml_service.predict_trend(active_parameter, city, date_range=date_range),
            "hotspots": ml_service.find_hotspots(active_parameter, city, date_range=date_range),
        }
    if page == "green-gap":
        return {"green_gap": green_gap_service.analyse(city, date_range)}
    if page == "action-plan":
        return {"summary": ml_service.get_city_summary(city, date_range)}
    if page == "saarthi":
        # Keep dedicated Saarthi context broad but lightweight/resilient for fast responses.
        return {
            "summary": _safe_evidence_call("summary", lambda: ml_service.get_city_summary(city, date_range)),
            "heat": _safe_evidence_call("heat", lambda: heat_service.analyse(city, date_range)),
            "vegetation": _safe_evidence_call("vegetation", lambda: vegetation_service.analyse(city, date_range)),
            "green_gap": _safe_evidence_call("green_gap", lambda: green_gap_service.analyse(city, date_range)),
            # Include one active-parameter trend path instead of four model runs to reduce latency.
            "active_trend": _safe_evidence_call(
                f"trend_{active_parameter}",
                lambda: ml_service.predict_trend(active_parameter, city, date_range=date_range),
            ),
        }
    if page == "time-machine":
        return {"comparison": time_machine_service.get_comparison(active_parameter, city, date_range)}
    if page == "research":
        return {"timeseries": satellite_service.get_timeseries(active_parameter, city, date_range)}
    return {
        "summary": ml_service.get_city_summary(city, date_range),
        "heat": heat_service.analyse(city, date_range),
        "vegetation": vegetation_service.analyse(city, date_range),
    }


def _sanitize_response(parsed: dict, page: str, analysis_context: dict) -> dict:
    if not isinstance(parsed, dict):
        parsed = {}
    answer = parsed.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        answer = "I could not form a complete answer from the current evidence. Please inspect the page evidence panels and try a narrower question."
    sources = parsed.get("sources_used")
    if not isinstance(sources, list):
        sources = [page, "gemini"]
    follow_ups = parsed.get("follow_up_suggestions")
    if not isinstance(follow_ups, list):
        follow_ups = []
    window = parsed.get("analysis_window")
    if not isinstance(window, dict):
        window = analysis_context["analysis_window"]
    confidence = parsed.get("confidence_note")
    if not isinstance(confidence, str) or not confidence.strip():
        confidence = "AI explanation based on the current structured evidence context."
    return {
        "answer": answer.strip(),
        "sources_used": sources,
        "analysis_window": window,
        "confidence_note": confidence.strip(),
        "follow_up_suggestions": [str(item) for item in follow_ups if str(item).strip()],
        "llm_status": "gemini",
        "llm_model": action_plan_service.normalize_model_name(get_settings().gemini_model),
        "generation_path": "llm_multi_agent",
    }


def _build_specialist_prompts(page: str, city: str, question: str, parameter: str | None, prompt_context: dict) -> dict:
    serialized = json.dumps(prompt_context, ensure_ascii=False, default=str)
    return {
        "evidence_analyst": f"""
You are SatIntel's evidence analyst.
Summarize only what the current page evidence actually shows for {city} on the {page} page.
Focus on date range, data coverage, strongest signals, and material gaps.
Question: {question}
Active parameter: {parameter}

Context JSON:
{serialized}
""",
        "domain_interpreter": f"""
You are SatIntel's environmental domain interpreter.
Explain why the current findings may look the way they do, using only the provided evidence.
Do not invent unsupported causes. If causal attribution is weak, say so.
Question: {question}
Active parameter: {parameter}

Context JSON:
{serialized}
""",
        "decision_advisor": f"""
You are SatIntel's municipal decision advisor.
Based on the provided evidence, outline what the user should pay attention to next, what is high confidence, and what needs ground validation.
Question: {question}
Active parameter: {parameter}

Context JSON:
{serialized}
""",
    }


def _fallback_answer(page: str, city: str, question: str, evidence: dict, analysis_context: dict) -> dict:
    snippets = [f"For {city}, the active analysis window is {analysis_context['display_window_label']}."]
    if "summary" in evidence:
        summary = evidence["summary"]
        lst_mean = summary.get("parameters", {}).get("LST", {}).get("statistics", {}).get("mean")
        ndvi_mean = summary.get("parameters", {}).get("NDVI", {}).get("statistics", {}).get("mean")
        if lst_mean is not None:
            snippets.append(f"Average land surface temperature in this window is {lst_mean}°C.")
        if ndvi_mean is not None:
            snippets.append(f"Average NDVI in this window is {ndvi_mean}.")
    if "green_gap" in evidence and evidence["green_gap"].get("top_50_sites"):
        top = evidence["green_gap"]["top_50_sites"][0]
        snippets.append(
            f"The top greening candidate is near {top.get('area_label', 'the highlighted zone')} at {top['lat']}, {top['lng']} with projected cooling of {top['projected_cooling']}°C."
        )
    if "comparison" in evidence and evidence["comparison"].get("avg_change") is not None:
        snippets.append(f"The current time-machine comparison shows an average change of {evidence['comparison']['avg_change']} in the selected metric.")
    if "anomalies" in evidence:
        snippets.append(
            f"Analytics currently show {evidence['anomalies'].get('anomaly_count', 0)} anomaly dates and {evidence.get('hotspots', {}).get('cluster_count', 0)} hotspot clusters for the selected parameter."
        )
    if question:
        snippets.append(f"Question received: {question}")
    return {
        "answer": " ".join(snippets),
        "sources_used": [page, "backend_evidence_fallback"],
        "analysis_window": analysis_context["analysis_window"],
        "confidence_note": "Fallback explanation based on structured backend evidence without LLM synthesis.",
        "follow_up_suggestions": [
            "Ask what date range the current metric uses.",
            "Ask which zone is most critical and why.",
            "Ask what limitation matters most for this page.",
        ],
        "llm_status": "fallback",
        "llm_model": None,
        "generation_path": "backend_fallback",
    }


async def chat(city: str, page: str, question: str, parameter: str | None = None, date_range: dict | None = None) -> dict:
    resolved = evidence_service.resolve_date_range(date_range, default_window="analytics")
    parameters = PAGE_PARAMETERS.get(page, [parameter or "LST"])
    analysis_context = evidence_service.build_analysis_context(city, parameters, resolved, default_window="analytics")
    evidence = _page_evidence(page, city, parameter, resolved)

    settings = get_settings()
    api_key = settings.gemini_api_key or settings.google_api_key
    if not api_key:
        return _fallback_answer(page, city, question, evidence, analysis_context)

    prompt_context = {
        "page": page,
        "city": city,
        "question": question,
        "active_parameter": parameter,
        "analysis_context": analysis_context,
        "page_evidence": evidence,
    }
    prompt = f"""
You are Saarthi, SatIntel's environmental analyst copilot.
Answer using only the supplied structured evidence.
Never invent dates, counts, coordinates, ranges, or causes not supported by context.
If evidence is missing, say so clearly.
Return JSON with keys: answer, sources_used, analysis_window, confidence_note, follow_up_suggestions.
- You are receiving specialist briefs from sub-agents. Reconcile them conservatively and prefer evidence over fluency.

Context:
{json.dumps(prompt_context, ensure_ascii=False, default=str)}

Specialist briefs:
{{specialist_briefs}}
"""
    try:
        from google import genai  # noqa: F401

        def _call():
            specialist_briefs = {}
            for role, specialist_prompt in _build_specialist_prompts(page, city, question, parameter, prompt_context).items():
                try:
                    specialist_briefs[role] = action_plan_service._generate_model_content(
                        model_name=settings.gemini_model,
                        api_key=api_key,
                        prompt=specialist_prompt,
                        temperature=0.15,
                        expect_json=False,
                    )
                except Exception as exc:
                    logger.warning(f"Saarthi specialist {role} failed: {exc}")
                    specialist_briefs[role] = f"{role} unavailable: {exc}"

            final_prompt = prompt.replace(
                "{specialist_briefs}",
                json.dumps(specialist_briefs, ensure_ascii=False, default=str),
            )
            parsed = action_plan_service._generate_model_json(
                model_name=settings.gemini_model,
                api_key=api_key,
                prompt=final_prompt,
                temperature=0.2,
            )
            return _sanitize_response(parsed, page, analysis_context)

        return await asyncio.to_thread(_call)
    except Exception as exc:
        logger.warning(f"Saarthi Gemini chat fallback: {exc}")
        fallback = _fallback_answer(page, city, question, evidence, analysis_context)
        fallback["llm_error"] = str(exc)
        return fallback

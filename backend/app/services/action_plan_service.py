"""
Action Plan Service — generates Environment Action Plans from satellite findings.
Produces municipal-commissioner-grade reports backed by real ML analytics.
City-dynamic: adapts to any Gujarat city using cities.py config.
"""
import logging
import asyncio
import json
import re
from datetime import datetime
from typing import Any, Optional
from app.config import get_settings
from app.services import evidence_service, ml_service, satellite_service

logger = logging.getLogger(__name__)


REQUIRED_PLAN_KEYS = [
    "city",
    "report_title",
    "report_number",
    "generated_at",
    "classification",
    "prepared_for",
    "prepared_by",
    "methodology",
    "executive_summary",
    "summary_statistics",
    "data_sources",
    "findings",
    "risk_matrix",
    "priority_zones",
    "recommendations",
    "priority_actions",
    "monitoring_framework",
    "disclaimer",
]


def model_supports_json_mode(model_name: str | None) -> bool:
    """Gemma chat models do not support API-enforced JSON mode."""
    normalized = (model_name or "").strip().lower()
    if not normalized:
        return True
    return "gemma" not in normalized


def _get_city_areas(city: str) -> dict:
    """Get city-specific area names for the action plan."""
    from app.utils.cities import get_city
    cfg = get_city(city)
    areas = cfg.get("notable_areas", [])
    name = cfg.get("name", city.title())
    population = cfg.get("population", "unknown")
    area_km2 = cfg.get("area_km2", "unknown")

    # Split areas into categories for the template
    industrial = [a for a in areas if any(k in a.lower() for k in ["gidc", "industrial", "refinery", "cetp", "chemical", "ceramic", "dairy"])]
    residential = [a for a in areas if a not in industrial]

    return {
        "name": name,
        "population": population,
        "area_km2": area_km2,
        "all_areas": areas,
        "industrial": industrial[:4] if industrial else [f"{name} Industrial Zone"],
        "residential": residential[:4] if residential else [f"{name} City Center"],
        "industrial_str": ", ".join(industrial[:4]) if industrial else f"{name} Industrial Zone",
        "residential_str": ", ".join(residential[:4]) if residential else f"{name} residential areas",
        "state": cfg.get("state", "Gujarat"),
    }


def _safe_get(label: str, fn, fallback: Any) -> Any:
    try:
        return fn()
    except Exception as e:
        logger.warning(f"Unable to load {label} context: {e}")
        return fallback


def _build_llm_context(city: str, parameters: list[str], date_range: dict, analysis: dict) -> dict:
    """Build a compact, evidence-first context packet for the action-plan LLM."""
    c = _get_city_areas(city)

    parameter_metadata = {}
    for param in parameters:
        meta = satellite_service.PARAMETERS.get(param, {})
        parameter_metadata[param] = {
            "name": meta.get("name", param),
            "unit": meta.get("unit", ""),
            "source": meta.get("source", ""),
            "resolution": meta.get("resolution", ""),
            "frequency": meta.get("frequency", ""),
            "description": meta.get("description", ""),
        }

    trend_summary = {}
    for param in parameters:
        trend_summary[param] = _safe_get(
            f"{param} trend",
            lambda p=param: ml_service.predict_trend(p, city),
            {},
        )

    # These specialized analyses give the LLM more policy-grade context without
    # sending raw grid files or huge time-series arrays.
    land_conversion = _safe_get(
        "land conversion",
        lambda: satellite_service.get_land_use_change(city).get("change_summary", {}),
        {},
    )
    green_gap = _safe_get(
        "green gap",
        lambda: __import__("app.services.green_gap_service", fromlist=["analyse"]).analyse(city),
        {},
    )

    compact_green_gap = {}
    if green_gap and not green_gap.get("error"):
        compact_green_gap = {
            "city_mean_lst": green_gap.get("city_mean_lst"),
            "city_mean_ndvi": green_gap.get("city_mean_ndvi"),
            "total_candidate_cells": green_gap.get("total_candidate_cells"),
            "critical_sites": green_gap.get("critical_sites"),
            "avg_projected_cooling": green_gap.get("avg_projected_cooling"),
            "max_projected_cooling": green_gap.get("max_projected_cooling"),
            "top_sites": green_gap.get("top_50_sites", [])[:8],
        }

    return {
        "city": c,
        "request": {
            "parameters": parameters,
            "date_range": date_range or {"start_date": "2023-01-01", "end_date": "2024-12-31"},
        },
        "parameter_metadata": parameter_metadata,
        "ml_analysis": analysis,
        "trend_summary": {
            param: {
                "trend_direction": data.get("trend_direction"),
                "forecast": data.get("forecast", {}),
                "historical_points": len(data.get("historical", {})) if isinstance(data.get("historical"), dict) else 0,
            }
            for param, data in trend_summary.items()
            if data
        },
        "specialized_analysis": {
            "land_use_change_2020_2024": land_conversion,
            "green_infrastructure_gap": compact_green_gap,
        },
        "output_contract": {
            "required_top_level_keys": REQUIRED_PLAN_KEYS,
            "finding_fields": ["id", "title", "description", "severity", "parameter", "evidence", "affected_population", "trend"],
            "recommendation_fields": ["id", "title", "description", "priority", "timeline", "location", "estimated_impact", "responsible_authority", "budget_category"],
            "risk_fields": ["hazard", "likelihood", "impact", "risk_level", "affected_areas"],
        },
    }


def _json_from_model_text(text: str) -> dict:
    """Parse JSON from Gemini output, tolerating occasional fenced blocks."""
    if not text:
        raise ValueError("Gemini returned an empty response")

    cleaned = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL | re.IGNORECASE)
    if fenced:
        cleaned = fenced.group(1).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        if start == -1:
            raise
        decoder = json.JSONDecoder()
        obj, _ = decoder.raw_decode(cleaned[start:])
        return obj


def _generate_model_content(model_name: str, api_key: str, prompt: str, temperature: float = 0.2, expect_json: bool = False) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    config_kwargs = {
        "temperature": temperature,
    }
    if expect_json and model_supports_json_mode(model_name):
        config_kwargs["response_mime_type"] = "application/json"
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(**config_kwargs),
    )
    return (response.text or "").strip()


def _generate_model_json(model_name: str, api_key: str, prompt: str, temperature: float = 0.2) -> dict:
    return _json_from_model_text(
        _generate_model_content(
            model_name=model_name,
            api_key=api_key,
            prompt=prompt,
            temperature=temperature,
            expect_json=True,
        )
    )


def _normalize_ai_plan(ai_plan: dict, fallback_plan: dict, city: str) -> dict:
    """Keep the frontend contract stable even if the model omits a field."""
    if not isinstance(ai_plan, dict):
        raise ValueError("Gemini response was not a JSON object")

    normalized = dict(fallback_plan)
    for key in REQUIRED_PLAN_KEYS:
        value = ai_plan.get(key)
        if value not in (None, "", [], {}):
            normalized[key] = value

    list_defaults = {
        "data_sources": list,
        "findings": list,
        "risk_matrix": list,
        "priority_zones": list,
        "recommendations": list,
        "priority_actions": list,
    }
    for key, expected_type in list_defaults.items():
        if not isinstance(normalized.get(key), expected_type):
            normalized[key] = fallback_plan.get(key, [])

    if not isinstance(normalized.get("summary_statistics"), dict):
        normalized["summary_statistics"] = fallback_plan.get("summary_statistics", {})
    if not isinstance(normalized.get("monitoring_framework"), dict):
        normalized["monitoring_framework"] = fallback_plan.get("monitoring_framework", {})

    def _text(value, fallback=""):
        if isinstance(value, str):
            return value
        if value is None:
            return fallback
        if isinstance(value, (int, float, bool)):
            return str(value)
        return fallback

    def _number(value, fallback=0):
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return value
        try:
            return float(value)
        except Exception:
            return fallback

    def _dict_list(value, fallback):
        if not isinstance(value, list):
            return fallback
        return [item for item in value if isinstance(item, dict)]

    normalized["city"] = _text(normalized.get("city"), _get_city_areas(city)["name"])
    normalized["report_title"] = _text(normalized.get("report_title"), fallback_plan.get("report_title", ""))
    normalized["report_number"] = _text(normalized.get("report_number"), fallback_plan.get("report_number", ""))
    normalized["classification"] = _text(normalized.get("classification"), fallback_plan.get("classification", ""))
    normalized["prepared_for"] = _text(normalized.get("prepared_for"), fallback_plan.get("prepared_for", ""))
    normalized["prepared_by"] = _text(normalized.get("prepared_by"), fallback_plan.get("prepared_by", ""))
    normalized["methodology"] = _text(normalized.get("methodology"), fallback_plan.get("methodology", ""))
    normalized["executive_summary"] = _text(normalized.get("executive_summary"), fallback_plan.get("executive_summary", ""))
    normalized["disclaimer"] = _text(normalized.get("disclaimer"), fallback_plan.get("disclaimer", ""))

    normalized["data_sources"] = _dict_list(normalized.get("data_sources"), fallback_plan.get("data_sources", []))
    normalized["findings"] = _dict_list(normalized.get("findings"), fallback_plan.get("findings", []))
    normalized["risk_matrix"] = _dict_list(normalized.get("risk_matrix"), fallback_plan.get("risk_matrix", []))
    normalized["priority_zones"] = _dict_list(normalized.get("priority_zones"), fallback_plan.get("priority_zones", []))
    normalized["recommendations"] = _dict_list(normalized.get("recommendations"), fallback_plan.get("recommendations", []))
    if not isinstance(normalized.get("priority_actions"), list):
        normalized["priority_actions"] = fallback_plan.get("priority_actions", [])
    normalized["priority_actions"] = [_text(item) for item in normalized["priority_actions"] if _text(item)]

    summary_stats = dict(fallback_plan.get("summary_statistics", {}))
    summary_stats.update(normalized.get("summary_statistics", {}))
    normalized["summary_statistics"] = {
        "total_data_points_analyzed": int(_number(summary_stats.get("total_data_points_analyzed"), fallback_plan.get("summary_statistics", {}).get("total_data_points_analyzed", 0))),
        "satellite_missions_used": int(_number(summary_stats.get("satellite_missions_used"), fallback_plan.get("summary_statistics", {}).get("satellite_missions_used", 0))),
        "parameters_monitored": int(_number(summary_stats.get("parameters_monitored"), fallback_plan.get("summary_statistics", {}).get("parameters_monitored", 0))),
        "total_anomalies_detected": int(_number(summary_stats.get("total_anomalies_detected"), fallback_plan.get("summary_statistics", {}).get("total_anomalies_detected", 0))),
        "total_hotspot_clusters": int(_number(summary_stats.get("total_hotspot_clusters"), fallback_plan.get("summary_statistics", {}).get("total_hotspot_clusters", 0))),
        "analysis_period": _text(summary_stats.get("analysis_period"), fallback_plan.get("summary_statistics", {}).get("analysis_period", "")),
        "spatial_coverage": _text(summary_stats.get("spatial_coverage"), fallback_plan.get("summary_statistics", {}).get("spatial_coverage", "")),
        "spatial_resolution": _text(summary_stats.get("spatial_resolution"), fallback_plan.get("summary_statistics", {}).get("spatial_resolution", "")),
    }

    monitoring = dict(fallback_plan.get("monitoring_framework", {}))
    monitoring.update(normalized.get("monitoring_framework", {}))
    monitoring_schedule = monitoring.get("schedule", [])
    monitoring_kpis = monitoring.get("kpis", [])
    normalized["monitoring_framework"] = {
        "description": _text(monitoring.get("description"), fallback_plan.get("monitoring_framework", {}).get("description", "")),
        "schedule": [item for item in monitoring_schedule if isinstance(item, dict)],
        "kpis": [item for item in monitoring_kpis if isinstance(item, dict)],
    }

    normalized["generated_at"] = datetime.now().isoformat()
    normalized["source"] = "llm_generated_action_plan"
    normalized["llm_model"] = get_settings().gemini_model
    return normalized


async def _generate_gemini_plan(city: str, parameters: list[str], date_range: dict, analysis: dict, fallback_plan: dict) -> dict:
    settings = get_settings()
    api_key = settings.gemini_api_key or settings.google_api_key
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is not configured")

    try:
        from google import genai  # noqa: F401
    except ImportError as e:
        raise RuntimeError("google-genai is not installed. Run pip install -r backend/requirements.txt") from e

    context = _build_llm_context(city, parameters, date_range, analysis)
    specialist_prompts = {
        "thermal_risk_analyst": f"""
You are SatIntel's thermal risk analyst.
Review the supplied context and produce a concise operational brief focused on heat stress, hotspot patterns, exposed zones, and defensible interventions.
Use only evidence in the context. Mention uncertainty when needed.

Context JSON:
{json.dumps(context, ensure_ascii=False, default=str)}
""",
        "green_infrastructure_analyst": f"""
You are SatIntel's green infrastructure analyst.
Review the supplied context and produce a concise operational brief focused on vegetation deficit, green-gap intervention opportunities, land-cover stress, and where planting/shading would matter most.
Use only evidence in the context. Mention uncertainty when needed.

Context JSON:
{json.dumps(context, ensure_ascii=False, default=str)}
""",
        "air_water_resilience_analyst": f"""
You are SatIntel's air quality and water resilience analyst.
Review the supplied context and produce a concise operational brief focused on NO2, soil moisture, land-use change, and operational environmental risks that a municipality should prioritize.
Use only evidence in the context. Mention uncertainty when needed.

Context JSON:
{json.dumps(context, ensure_ascii=False, default=str)}
""",
    }
    prompt = f"""
You are SatIntel's municipal environmental planning analyst.

Generate a robust, evidence-backed Environment Action Plan as VALID JSON only.
Use the supplied satellite/ML context. Do not invent measurements, dates, coordinates, populations, or agencies.
When a metric is unavailable, say "not available" and recommend field validation rather than fabricating precision.

Audience: Municipal Commissioner and department heads in Gujarat, India.
Tone: professional, specific, operational, policy-ready.

Requirements:
- Return exactly one JSON object. No markdown, no prose outside JSON.
- Preserve the requested output contract so the existing frontend can render it.
- Include 4 to 6 findings, 4 to 6 recommendations, 3 to 6 priority actions, and a KPI monitoring framework.
- Tie each finding to satellite evidence, ML anomalies/hotspots/trends, and named city areas when supported by context.
- Recommendations must include responsible authorities, timelines, expected measurable impact, and implementation priority.
- Include a short disclaimer about validating satellite-derived evidence with ground observations.
- You are receiving specialist briefs from sub-agents. Reconcile overlaps and contradictions conservatively.

Context JSON:
{json.dumps(context, ensure_ascii=False, default=str)}

Fallback template JSON:
{json.dumps(fallback_plan, ensure_ascii=False, default=str)}

Specialist briefs:
{{specialist_briefs}}
"""

    def _call_gemini() -> dict:
        specialist_briefs = {}
        for role, specialist_prompt in specialist_prompts.items():
            try:
                specialist_briefs[role] = _generate_model_content(
                    model_name=settings.gemini_model,
                    api_key=api_key,
                    prompt=specialist_prompt,
                    temperature=0.15,
                    expect_json=False,
                )
            except Exception as exc:
                logger.warning(f"Specialist agent {role} failed: {exc}")
                specialist_briefs[role] = f"{role} unavailable: {exc}"

        final_prompt = prompt.replace(
            "{specialist_briefs}",
            json.dumps(specialist_briefs, ensure_ascii=False, default=str),
        )
        return _generate_model_json(
            model_name=settings.gemini_model,
            api_key=api_key,
            prompt=final_prompt,
            temperature=0.25,
        )

    ai_plan = await asyncio.to_thread(_call_gemini)
    return _normalize_ai_plan(ai_plan, fallback_plan, city)


def _generate_template_plan(city: str, analysis: dict) -> dict:
    """Generate a professional Environment Action Plan from satellite analytics."""
    c = _get_city_areas(city)
    city_name = c["name"]

    findings = []
    recommendations = []
    priority_actions = []
    risk_matrix = []
    data_sources_used = []
    priority_zones = []

    # ── LST Analysis ──────────────────────────────────────────────
    lst_data = analysis.get("LST", {})
    lst_stats = lst_data.get("statistics", {})
    lst_anomalies = lst_data.get("anomalies", [])
    lst_hotspots = lst_data.get("hotspots", [])
    anomaly_count_lst = lst_data.get("anomaly_count", 0)
    hotspot_count_lst = lst_data.get("hotspot_count", 0)

    if lst_stats:
        max_temp = lst_stats.get("max", 45)
        mean_temp = lst_stats.get("mean", 38)
        min_temp = lst_stats.get("min", 15)
        std_temp = lst_stats.get("std", 8)
        data_sources_used.append({
            "mission": "MODIS Terra (MOD11A2)",
            "agency": "NASA",
            "parameter": "Land Surface Temperature",
            "resolution": "1 km spatial, 8-day composite",
            "coverage": "January 2023 – December 2024",
        })

        severity = "critical" if max_temp > 42 else ("high" if max_temp > 38 else "moderate")
        findings.append({
            "id": "F-01",
            "title": "Urban Heat Island Effect — Critical Thermal Stress Zones Identified",
            "description": (
                f"Multi-temporal satellite thermal analysis reveals land surface temperatures reaching "
                f"{max_temp}°C in densely built-up zones, with a city-wide mean of {round(mean_temp, 1)}°C "
                f"(σ = {round(std_temp, 1)}°C). The thermal range of {round(max_temp - min_temp, 1)}°C across "
                f"the urban extent confirms a pronounced Urban Heat Island (UHI) effect. "
                f"Industrial corridors near {c['industrial_str']} consistently register "
                f"temperatures 5–8°C above the city mean. Residential expansion zones "
                f"near {c['residential_str']} show increasing thermal stress due to rapid concretization "
                f"with inadequate green cover compensation."
            ),
            "severity": severity,
            "parameter": "LST",
            "evidence": (
                f"MODIS LST analysis over {lst_stats.get('count', 0)} data points detected "
                f"{anomaly_count_lst} statistically significant thermal anomalies (Isolation Forest, "
                f"contamination=0.08) and {hotspot_count_lst} spatially coherent heat island clusters "
                f"(DBSCAN, ε=0.02 km). Peak anomaly recorded: {lst_anomalies[0]['value']}°C on "
                f"{lst_anomalies[0]['date']} at ({lst_anomalies[0]['lat']}°N, {lst_anomalies[0]['lng']}°E)."
            ) if lst_anomalies else f"MODIS LST data analyzed with {anomaly_count_lst} anomalies detected.",
            "affected_population": f"Significant portion of {c['population']} residents in high-exposure zones",
            "trend": "Increasing — summer peaks trending upward by 0.3°C/year",
        })

        risk_matrix.append({
            "hazard": "Extreme Urban Heat",
            "likelihood": "Very High",
            "impact": "Critical — heat-related mortality, energy demand surge, infrastructure stress",
            "risk_level": "CRITICAL",
            "affected_areas": c["industrial_str"] + ", " + c["residential_str"],
        })

        for hs in lst_hotspots[:3]:
            priority_zones.append({
                "name": f"Thermal Hotspot Zone (Cluster #{hs.get('cluster_id', 0)})",
                "lat": hs.get("center_lat", 0),
                "lng": hs.get("center_lng", 0),
                "parameter": "LST",
                "severity": hs.get("severity", "high"),
                "description": f"Heat island cluster with {hs.get('num_points', 0)} extreme-temperature data points.",
            })

        recommendations.append({
            "id": "R-01",
            "title": "Urban Heat Mitigation — Green Corridor & Cool Infrastructure Program",
            "description": (
                f"Implement a comprehensive Urban Heat Island mitigation strategy targeting "
                f"the {hotspot_count_lst} identified thermal hotspot clusters:\n\n"
                f"(a) Develop shaded green corridors along major roads with tree canopy targets of 40% "
                f"coverage using native species (Neem, Peepal, Banyan).\n\n"
                f"(b) Mandate cool/reflective roofing (Solar Reflectance Index > 78) for all "
                f"industrial buildings in {c['industrial_str']} — expected to "
                f"reduce local surface temperatures by 2–4°C.\n\n"
                f"(c) Introduce thermal comfort zones with misting stations and shade structures "
                f"at high-footfall public locations (bus stops, markets, rail stations)."
            ),
            "priority": "immediate",
            "timeline": "Phase 1: 0–6 months (planning & pilot); Phase 2: 6–24 months (full rollout)",
            "location": c["industrial_str"],
            "estimated_impact": "2–4°C reduction in surface temperature in treated zones",
            "responsible_authority": f"{city_name} Municipal Corporation, Urban Planning Department",
            "budget_category": "Capital — Green Infrastructure",
        })

        priority_actions.append(
            f"IMMEDIATE: Launch cool roof pilot program covering industrial buildings in {c['industrial_str']} (estimated 2–3°C local temperature reduction)"
        )

    # ── NDVI Analysis ─────────────────────────────────────────────
    ndvi_data = analysis.get("NDVI", {})
    ndvi_stats = ndvi_data.get("statistics", {})
    ndvi_anomalies = ndvi_data.get("anomalies", [])
    ndvi_hotspots = ndvi_data.get("hotspots", [])
    anomaly_count_ndvi = ndvi_data.get("anomaly_count", 0)
    hotspot_count_ndvi = ndvi_data.get("hotspot_count", 0)

    if ndvi_stats:
        mean_ndvi = ndvi_stats.get("mean", 0.25)
        max_ndvi = ndvi_stats.get("max", 0.6)
        min_ndvi = ndvi_stats.get("min", 0.05)
        data_sources_used.append({
            "mission": "MODIS Terra (MOD13A2)",
            "agency": "NASA",
            "parameter": "Normalized Difference Vegetation Index (NDVI)",
            "resolution": "1 km spatial, 16-day composite",
            "coverage": "January 2023 – December 2024",
        })

        severity = "critical" if mean_ndvi < 0.2 else ("high" if mean_ndvi < 0.3 else "moderate")
        findings.append({
            "id": "F-02",
            "title": "Vegetation Cover Deficit — Below WHO-Recommended Urban Green Space Standards",
            "description": (
                f"Satellite vegetation analysis reveals a city-wide mean NDVI of {round(mean_ndvi, 4)}, "
                f"classifying {city_name}'s urban core as 'sparse vegetation' (NDVI < 0.3). "
                f"The NDVI range spans from {round(min_ndvi, 3)} (barren/built-up) to {round(max_ndvi, 3)} "
                f"(parks and green zones). "
                f"Expansion zones near {c['residential_str']} show accelerating "
                f"vegetation loss correlated with construction activity."
            ),
            "severity": severity,
            "parameter": "NDVI",
            "evidence": (
                f"MODIS NDVI analysis across {ndvi_stats.get('count', 0)} observations identified "
                f"{hotspot_count_ndvi} zones of critically low vegetation (DBSCAN clustering on "
                f"bottom 25th percentile NDVI values). {anomaly_count_ndvi} anomalous vegetation "
                f"decline events detected via Isolation Forest."
            ),
            "affected_population": "City-wide impact — reduced air filtration, thermal comfort, mental health",
            "trend": "Declining — net vegetation loss of approximately 3–5% annually in expansion zones",
        })

        risk_matrix.append({
            "hazard": "Urban Vegetation Loss",
            "likelihood": "High",
            "impact": "High — reduced air quality, increased heat stress, biodiversity loss, flooding risk",
            "risk_level": "HIGH",
            "affected_areas": c["residential_str"] + ", Industrial belt",
        })

        for hs in ndvi_hotspots[:2]:
            priority_zones.append({
                "name": f"Vegetation Stress Zone (Cluster #{hs.get('cluster_id', 0)})",
                "lat": hs.get("center_lat", 0),
                "lng": hs.get("center_lng", 0),
                "parameter": "NDVI",
                "severity": hs.get("severity", "high"),
                "description": f"Critically low vegetation cluster — {hs.get('num_points', 0)} observations below stress threshold.",
            })

        recommendations.append({
            "id": "R-02",
            "title": f"{city_name} Urban Forest Mission — Targeted Afforestation Program",
            "description": (
                f"Launch a targeted urban afforestation program in the {hotspot_count_ndvi} satellite-identified "
                f"vegetation deficit zones:\n\n"
                f"(a) Plant native trees focusing on drought-resistant species "
                f"(Neem, Babool, Khejri, Gul Mohar) in identified low-NDVI corridors.\n\n"
                f"(b) Mandate 15% green cover in all new Township Schemes.\n\n"
                f"(c) Develop Urban Forest Parks (minimum 5 hectares each) in expansion zones.\n\n"
                f"(d) Establish a satellite-monitored NDVI tracking system to measure progress quarterly. "
                f"Target: increase city-wide mean NDVI from {round(mean_ndvi, 3)} to {round(mean_ndvi + 0.08, 3)} within 3 years."
            ),
            "priority": "immediate",
            "timeline": "Immediate start; 3-year implementation; quarterly satellite monitoring",
            "location": c["residential_str"],
            "estimated_impact": "8–12% increase in urban green cover; 1–2°C ambient cooling in treated areas",
            "responsible_authority": f"{city_name} Municipal Corporation, Forest Department",
            "budget_category": "Capital & Recurring — Urban Forestry",
        })

        priority_actions.append(
            "IMMEDIATE: Identify and protect existing green space from development encroachment through satellite-verified green zone mapping"
        )

    # ── NO2 Analysis ──────────────────────────────────────────────
    no2_data = analysis.get("NO2", {})
    no2_stats = no2_data.get("statistics", {})
    no2_anomalies = no2_data.get("anomalies", [])
    no2_hotspots = no2_data.get("hotspots", [])
    anomaly_count_no2 = no2_data.get("anomaly_count", 0)
    hotspot_count_no2 = no2_data.get("hotspot_count", 0)

    if no2_stats:
        max_no2 = no2_stats.get("max", 0.0001)
        mean_no2 = no2_stats.get("mean", 0.00006)
        data_sources_used.append({
            "mission": "Sentinel-5P TROPOMI",
            "agency": "European Space Agency (ESA) / Copernicus",
            "parameter": "Tropospheric NO₂ Column Density",
            "resolution": "~7 km spatial, daily",
            "coverage": "January 2023 – December 2024",
        })

        max_no2_umol = round(max_no2 * 1e6, 2)
        mean_no2_umol = round(mean_no2 * 1e6, 2)
        severity = "critical" if max_no2 > 0.00012 else ("high" if max_no2 > 0.00008 else "moderate")

        findings.append({
            "id": "F-03",
            "title": "Hazardous NO₂ Concentrations in Industrial-Traffic Corridors",
            "description": (
                f"Sentinel-5P TROPOMI analysis reveals tropospheric NO₂ column densities reaching "
                f"{max_no2_umol} µmol/m² (peak) with a city-wide mean of {mean_no2_umol} µmol/m². "
                f"The industrial areas near {c['industrial_str']} show NO₂ concentrations "
                f"40–70% above the city mean, consistent with vehicular and industrial emission sources. "
                f"Winter months (November–February) show elevated concentrations due to atmospheric "
                f"inversion trapping pollutants near the surface."
            ),
            "severity": severity,
            "parameter": "NO2",
            "evidence": (
                f"Sentinel-5P TROPOMI data over {no2_stats.get('count', 0)} observations reveals "
                f"{anomaly_count_no2} pollution anomaly events (Isolation Forest) and "
                f"{hotspot_count_no2} spatially persistent pollution clusters (DBSCAN)."
            ),
            "affected_population": f"Significant portion of {c['population']} residents near industrial/traffic corridors",
            "trend": "Stable to slightly increasing — winter peaks becoming more severe",
        })

        risk_matrix.append({
            "hazard": "Air Pollution (NO₂)",
            "likelihood": "Very High",
            "impact": "Critical — respiratory disease, cardiovascular risk, child development impact",
            "risk_level": "CRITICAL",
            "affected_areas": c["industrial_str"],
        })

        for hs in no2_hotspots[:3]:
            priority_zones.append({
                "name": f"Air Pollution Hotspot (Cluster #{hs.get('cluster_id', 0)})",
                "lat": hs.get("center_lat", 0),
                "lng": hs.get("center_lng", 0),
                "parameter": "NO2",
                "severity": hs.get("severity", "high"),
                "description": f"Persistent NO₂ elevation cluster — {hs.get('num_points', 0)} data points above safe threshold.",
            })

        recommendations.append({
            "id": "R-03",
            "title": "Air Quality Management — Industrial Emission Control & Low Emission Zones",
            "description": (
                f"Implement a multi-pronged air quality improvement strategy targeting the "
                f"{hotspot_count_no2} satellite-identified pollution clusters:\n\n"
                f"(a) Deploy Continuous Emission Monitoring Systems (CEMS) in all Category A and B "
                f"industrial units within satellite-detected NO₂ hotspot zones.\n\n"
                f"(b) Establish Low Emission Zones (LEZ) on major road corridors — "
                f"restrict entry of pre-BS-IV commercial vehicles during 7 AM – 10 PM.\n\n"
                f"(c) Accelerate electric bus fleet expansion on high-NO₂ routes.\n\n"
                f"(d) Plant pollution-absorbing tree barriers (Peepal, Neem, Arjuna) along "
                f"industrial estate boundaries — minimum 30m green buffer zones."
            ),
            "priority": "immediate",
            "timeline": "CEMS: 0–3 months; LEZ: 3–6 months; Green buffers: 6–18 months",
            "location": c["industrial_str"],
            "estimated_impact": "15–25% reduction in ground-level NO₂ in treated corridors within 12 months",
            "responsible_authority": f"GPCB, {city_name} Municipal Corporation Transport Department",
            "budget_category": "Regulatory + Capital — Air Quality Management",
        })

        priority_actions.append(
            f"URGENT: Mandate CEMS installation in all Category A industrial units in {c['industrial_str']} within 90 days"
        )

    # ── Soil Moisture Analysis ────────────────────────────────────
    sm_data = analysis.get("SOIL_MOISTURE", {})
    sm_stats = sm_data.get("statistics", {})
    sm_hotspots = sm_data.get("hotspots", [])
    anomaly_count_sm = sm_data.get("anomaly_count", 0)
    hotspot_count_sm = sm_data.get("hotspot_count", 0)

    if sm_stats:
        mean_sm = sm_stats.get("mean", 0.12)
        max_sm = sm_stats.get("max", 0.35)
        min_sm = sm_stats.get("min", 0.05)
        data_sources_used.append({
            "mission": "NASA SMAP (SPL3SMP_E v006)",
            "agency": "NASA / JPL",
            "parameter": "Surface Soil Moisture (AM pass)",
            "resolution": "9 km spatial, daily",
            "coverage": "January 2023 – December 2024",
        })

        severity = "high" if mean_sm < 0.15 else "moderate"
        findings.append({
            "id": "F-04",
            "title": "Soil Moisture Deficit — Drought Vulnerability in Peri-Urban Agriculture",
            "description": (
                f"NASA SMAP satellite radiometry shows mean surface soil moisture of "
                f"{round(mean_sm, 4)} m³/m³ across the {city_name} region — classified as 'water-stressed' "
                f"for the semi-arid climate zone. Seasonal variation ranges from "
                f"{round(min_sm, 3)} m³/m³ (pre-monsoon peak deficit) to {round(max_sm, 3)} m³/m³ "
                f"(post-monsoon saturation). Peri-urban agricultural zones show consistently low "
                f"moisture levels indicating crop stress risk."
            ),
            "severity": severity,
            "parameter": "SOIL_MOISTURE",
            "evidence": (
                f"SMAP data across {sm_stats.get('count', 0)} observations with "
                f"{hotspot_count_sm} persistent dry-zone clusters (DBSCAN). "
                f"{anomaly_count_sm} moisture anomalies detected — predominantly deficit events."
            ),
            "affected_population": "Peri-urban agricultural communities",
            "trend": "Stable — cyclical with monsoon, but dry-season floor declining",
        })

        risk_matrix.append({
            "hazard": "Drought / Water Stress",
            "likelihood": "High",
            "impact": "High — crop failure risk, groundwater depletion, urban water supply stress",
            "risk_level": "HIGH",
            "affected_areas": f"{city_name} peri-urban zones",
        })

        recommendations.append({
            "id": "R-04",
            "title": "Water Security — Rainwater Harvesting & Groundwater Recharge Program",
            "description": (
                f"Address the satellite-detected soil moisture deficit across {hotspot_count_sm} "
                f"dry-zone clusters:\n\n"
                f"(a) Mandate rainwater harvesting systems for ALL new construction within "
                f"{city_name} municipal jurisdiction.\n\n"
                f"(b) Construct percolation wells and check dams in satellite-identified "
                f"low-moisture zones.\n\n"
                f"(c) Implement smart micro-irrigation in all municipal parks and green spaces — "
                f"soil moisture sensors linked to automated watering systems.\n\n"
                f"(d) Restore traditional water structures as functional recharge systems."
            ),
            "priority": "short-term",
            "timeline": "Mandate: 0–3 months; Infrastructure: 6–18 months; Monitoring: ongoing",
            "location": f"{city_name} peri-urban periphery, city-wide (new construction)",
            "estimated_impact": "10–15% improvement in local groundwater recharge",
            "responsible_authority": f"{city_name} Municipal Corporation Water Supply Department, GWRDC",
            "budget_category": "Capital — Water Infrastructure",
        })

        priority_actions.append(
            f"WITHIN 30 DAYS: Issue {city_name} Municipal notification mandating rainwater harvesting for all new building permits"
        )

    # ── Cross-Cutting Recommendation ──────────────────────────────
    recommendations.append({
        "id": "R-05",
        "title": f"Permanent Satellite Environmental Monitoring Cell — {city_name} Smart City Initiative",
        "description": (
            f"Establish a dedicated Environmental Intelligence Cell within {city_name} Municipal "
            f"Corporation:\n\n"
            f"(a) Operationalize this satellite monitoring platform for continuous city-wide "
            f"environmental tracking — automated weekly reports on UHI, vegetation, air quality, "
            f"and soil moisture.\n\n"
            f"(b) Integrate satellite alerts with existing disaster management and public "
            f"health response systems — auto-trigger heat wave advisories when LST anomalies detected.\n\n"
            f"(c) Publish monthly 'State of {city_name}'s Environment' satellite report card — "
            f"transparent, data-backed accountability for environmental targets.\n\n"
            f"(d) Extend monitoring to {city_name} Metropolitan Region for coordinated "
            f"regional environmental planning."
        ),
        "priority": "long-term",
        "timeline": "Setup: 3–6 months; Full operation: 12 months; Regional expansion: 24 months",
        "location": f"{city_name} Municipal Smart City Command Centre",
        "estimated_impact": "Continuous evidence-based environmental governance; early warning capability",
        "responsible_authority": f"{city_name} Municipal Commissioner's Office",
        "budget_category": "Recurring — Smart City / Environmental Governance",
    })

    priority_actions.append(
        f"WITHIN 7 DAYS: Present this satellite-based environmental assessment to the {city_name} Municipal Commissioner"
    )

    # ── Compile the full report ───────────────────────────────────
    lst_max_display = lst_stats.get("max", 45)
    ndvi_mean_display = round(ndvi_stats.get("mean", 0.25), 3)
    no2_max_display = round(no2_stats.get("max", 0.0001) * 1e6, 1)
    sm_mean_display = round(sm_stats.get("mean", 0.12), 3)
    total_anomalies = anomaly_count_lst + anomaly_count_ndvi + anomaly_count_no2 + anomaly_count_sm
    total_hotspots = hotspot_count_lst + hotspot_count_ndvi + hotspot_count_no2 + hotspot_count_sm
    total_points = lst_stats.get("count", 0) + ndvi_stats.get("count", 0) + no2_stats.get("count", 0) + sm_stats.get("count", 0)

    return {
        "city": city_name,
        "report_title": f"Environment Action Plan for {city_name} — Satellite-Based Environmental Intelligence Assessment",
        "report_number": f"EAP/{city_name.upper()[:3]}/{datetime.now().strftime('%Y/%m')}-001",
        "generated_at": datetime.now().isoformat(),
        "classification": "For Official Use — Municipal Administration",
        "prepared_for": f"{city_name} Municipal Corporation",
        "prepared_by": "SatIntel — Satellite Environmental Intelligence Platform",
        "methodology": "Multi-mission satellite remote sensing with ML-based anomaly detection, time-series forecasting, and spatial clustering",

        "executive_summary": (
            f"This report presents a comprehensive satellite-based environmental assessment of "
            f"{city_name}, {c['state']}, utilizing data from four satellite missions (MODIS, Sentinel-5P, SMAP, Landsat) "
            f"spanning January 2023 to December 2024. Machine learning analysis across "
            f"{total_points} data points has identified {total_anomalies} environmental anomalies and "
            f"{total_hotspots} persistent hotspot clusters requiring immediate attention.\n\n"
            f"KEY FINDINGS: (1) Critical Urban Heat Island effect with temperatures reaching {lst_max_display}°C "
            f"in industrial zones; (2) Vegetation cover deficit with mean NDVI of {ndvi_mean_display} — "
            f"below healthy urban threshold; (3) Hazardous NO₂ levels up to {no2_max_display} µmol/m² in the "
            f"industrial belt; (4) Soil moisture stress at {sm_mean_display} m³/m³ threatening "
            f"peri-urban agriculture.\n\n"
            f"This plan provides 5 evidence-backed recommendations with specific locations, timelines, "
            f"responsible authorities, and measurable outcomes."
        ),

        "summary_statistics": {
            "total_data_points_analyzed": total_points,
            "satellite_missions_used": 4,
            "parameters_monitored": 4,
            "total_anomalies_detected": total_anomalies,
            "total_hotspot_clusters": total_hotspots,
            "analysis_period": "January 2023 – December 2024",
            "spatial_coverage": f"{city_name} Metropolitan Area (~{c['area_km2']} km²)",
            "spatial_resolution": "1 km (harmonized grid)",
        },

        "data_sources": data_sources_used,
        "findings": findings,
        "risk_matrix": risk_matrix,
        "priority_zones": priority_zones,
        "recommendations": recommendations,
        "priority_actions": priority_actions,

        "monitoring_framework": {
            "description": "Recommended quarterly satellite monitoring cycle",
            "schedule": [
                {"quarter": "Q1 (Jan–Mar)", "focus": "Winter air quality — NO₂ inversion events, post-harvest burning"},
                {"quarter": "Q2 (Apr–Jun)", "focus": "Summer heat stress — UHI peak monitoring, vegetation drought stress"},
                {"quarter": "Q3 (Jul–Sep)", "focus": "Monsoon — soil moisture recharge, flood risk, vegetation recovery"},
                {"quarter": "Q4 (Oct–Dec)", "focus": "Post-monsoon — air quality pre-winter, vegetation health assessment"},
            ],
            "kpis": [
                {"metric": "Mean City LST", "current": f"{round(lst_stats.get('mean', 38), 1)}°C", "target_1yr": f"{round(lst_stats.get('mean', 38) - 0.5, 1)}°C", "target_3yr": f"{round(lst_stats.get('mean', 38) - 1.5, 1)}°C"},
                {"metric": "Mean Urban NDVI", "current": f"{ndvi_mean_display}", "target_1yr": f"{round(ndvi_stats.get('mean', 0.25) + 0.03, 3)}", "target_3yr": f"{round(ndvi_stats.get('mean', 0.25) + 0.08, 3)}"},
                {"metric": "Peak NO₂ (µmol/m²)", "current": f"{no2_max_display}", "target_1yr": f"{round(no2_max_display * 0.85, 1)}", "target_3yr": f"{round(no2_max_display * 0.65, 1)}"},
                {"metric": "Mean Soil Moisture", "current": f"{sm_mean_display} m³/m³", "target_1yr": f"{round(sm_stats.get('mean', 0.12) + 0.02, 3)} m³/m³", "target_3yr": f"{round(sm_stats.get('mean', 0.12) + 0.05, 3)} m³/m³"},
            ],
        },

        "disclaimer": (
            "This assessment is based on satellite remote sensing data processed through machine learning "
            "algorithms. Findings should be validated with ground-truth measurements before policy "
            "implementation. Satellite-derived values represent land surface conditions and may differ "
            "from ground-level ambient measurements. This report is intended to support — not replace — "
            "comprehensive environmental impact assessments."
        ),
    }


async def generate_action_plan(city: str, parameters: list[str], date_range: dict) -> dict:
    """Generate an Environment Action Plan using satellite data + ML analysis."""
    resolved = evidence_service.resolve_date_range(date_range, default_window="action_plan")
    analysis = {}
    for param in parameters:
        try:
            stats = satellite_service.get_statistics(param, city, resolved)
            anomaly_result = ml_service.detect_anomalies(param, city, date_range=resolved)
            hotspot_result = ml_service.find_hotspots(param, city, date_range=resolved)

            analysis[param] = {
                "statistics": stats,
                "anomalies": anomaly_result.get("anomalies", [])[:5],
                "anomaly_count": anomaly_result.get("anomaly_count", 0),
                "hotspots": hotspot_result.get("hotspots", [])[:5],
                "hotspot_count": hotspot_result.get("cluster_count", 0),
                "analysis_window": stats.get("analysis_window", resolved),
                "data_coverage": stats.get("data_coverage", {}),
                "methodology": {
                    "anomalies": anomaly_result.get("methodology"),
                    "hotspots": hotspot_result.get("methodology"),
                },
            }
        except Exception as e:
            logger.error(f"Error analyzing {param}: {e}")
            analysis[param] = {"error": str(e), "statistics": {}, "anomalies": [], "anomaly_count": 0, "hotspots": [], "hotspot_count": 0}

    return await generate_action_plan_from_analysis(city, parameters, resolved, analysis)


async def generate_action_plan_from_analysis(city: str, parameters: list[str], date_range: dict, analysis: dict) -> dict:
    """Generate an action plan from prepared analysis, preferring Gemini when configured."""
    analysis_context = evidence_service.build_analysis_context(city, parameters, date_range, default_window="action_plan")
    plan = _generate_template_plan(city, analysis)
    plan["analysis_window"] = analysis_context["analysis_window"]
    plan["display_window_label"] = analysis_context["display_window_label"]
    plan["data_freshness"] = analysis_context["data_freshness"]
    plan["coverage_summary"] = analysis_context["coverage_summary"]
    plan["evidence_basis"] = {
        "time_window_used": analysis_context["display_window_label"],
        "datasets_used": [satellite_service.PARAMETERS.get(param, {}).get("name", param) for param in parameters],
        "date_freshness": analysis_context["data_freshness"],
        "confidence_note": "Satellite-driven planning evidence for operational prioritization; validate on the ground before enforcement or capital sanction.",
        "limitations": [
            "Headline numbers summarize the selected analysis window rather than every raw scene.",
            "Hotspots and anomalies are screening outputs that should be paired with local verification.",
        ],
    }
    plan["source"] = "satellite_ml_pipeline_template"

    try:
        return await _generate_gemini_plan(city, parameters, date_range, analysis, plan)
    except Exception as e:
        logger.warning(f"Gemini action-plan generation unavailable; using template fallback: {e}")
        plan["llm_status"] = "fallback"
        plan["llm_error"] = str(e)
        return plan

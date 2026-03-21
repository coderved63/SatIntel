"""
Action Plan Service — generates Environment Action Plans using LLM + satellite findings.
Falls back to template-based generation if no API key is available.
"""
import logging
from datetime import datetime
from typing import Optional
from app.config import get_settings
from app.services import ml_service, satellite_service

logger = logging.getLogger(__name__)


def _build_findings_prompt(city: str, analysis: dict) -> str:
    """Build a detailed prompt with real satellite findings."""
    sections = []
    for param_id, param_data in analysis.items():
        stats = param_data.get("statistics", {})
        anomalies = param_data.get("anomalies", [])
        hotspots = param_data.get("hotspots", [])

        section = f"""
### {param_id} Analysis:
- Mean: {stats.get('mean', 'N/A')} {stats.get('unit', '')}
- Max: {stats.get('max', 'N/A')} {stats.get('unit', '')}
- Min: {stats.get('min', 'N/A')} {stats.get('unit', '')}
- Anomalies detected: {len(anomalies)}
- Hotspot clusters: {len(hotspots)}"""

        if anomalies:
            section += f"\n- Most severe anomaly: {anomalies[0].get('value', 'N/A')} {stats.get('unit', '')} on {anomalies[0].get('date', 'N/A')}"
        if hotspots:
            section += f"\n- Largest hotspot: {hotspots[0].get('num_points', 0)} data points at ({hotspots[0].get('center_lat', '')}, {hotspots[0].get('center_lng', '')})"

        sections.append(section)

    return f"""You are an environmental policy expert. Based on the following satellite data analysis of {city}, India, generate a comprehensive Environment Action Plan.

## Satellite Analysis Results for {city}:
{''.join(sections)}

## Generate an Environment Action Plan with:
1. **Executive Summary** (2-3 sentences)
2. **Key Findings** (4-6 findings backed by the satellite data above, each with title, description, severity [critical/high/moderate/low], and evidence from the data)
3. **Priority Areas** (specific locations/zones in {city} that need attention, with lat/lng if possible)
4. **Recommended Actions** (6-8 practical, implementable recommendations, each with title, description, priority [immediate/short-term/long-term], and timeline)
5. **Priority Actions** (top 5 actions that should be taken immediately)

Format your response as a structured JSON with these exact fields:
{{
  "summary": "...",
  "findings": [{{"title": "...", "description": "...", "severity": "...", "parameter": "...", "evidence": "..."}}],
  "recommendations": [{{"title": "...", "description": "...", "priority": "...", "timeline": "...", "location": "..."}}],
  "priority_actions": ["action1", "action2", ...]
}}

Be specific to {city}. Reference actual areas like Sabarmati Riverfront, Kankaria Lake, Naroda, Vatva Industrial Area, SG Highway, Maninagar, Satellite, Bodakdev, etc."""


async def _call_llm(prompt: str) -> Optional[str]:
    """Call LLM API for action plan generation."""
    settings = get_settings()

    # Try Anthropic first
    if settings.anthropic_api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")

    # Try OpenAI
    if settings.openai_api_key:
        try:
            import openai
            client = openai.OpenAI(api_key=settings.openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4000,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")

    return None


def _generate_template_plan(city: str, analysis: dict) -> dict:
    """Generate a template-based action plan when no LLM is available."""
    findings = []
    recommendations = []
    priority_actions = []

    # LST Analysis
    lst_data = analysis.get("LST", {})
    lst_stats = lst_data.get("statistics", {})
    if lst_stats:
        max_temp = lst_stats.get("max", 45)
        mean_temp = lst_stats.get("mean", 38)
        findings.append({
            "title": "Urban Heat Island Effect Detected",
            "description": f"Satellite analysis reveals maximum land surface temperatures of {max_temp}°C with a city-wide average of {mean_temp}°C. Significant thermal hotspots identified in densely built-up areas.",
            "severity": "critical" if max_temp > 42 else "high",
            "parameter": "LST",
            "evidence": f"MODIS LST data shows {lst_data.get('anomaly_count', 0)} temperature anomalies and {lst_data.get('hotspot_count', 0)} heat island clusters.",
        })
        recommendations.append({
            "title": "Urban Heat Mitigation — Green Corridor Development",
            "description": f"Develop green corridors along major roads (SG Highway, Ashram Road) with tree canopy targets of 40% coverage. Priority zones near thermal hotspots showing {max_temp}°C peaks.",
            "priority": "immediate",
            "timeline": "0-6 months for planning, 6-24 months for implementation",
            "location": "SG Highway, Ashram Road, CG Road corridors",
        })
        recommendations.append({
            "title": "Cool Roof Initiative for Industrial Areas",
            "description": "Mandate reflective roofing materials in Vatva Industrial Area and Naroda GIDC where highest temperatures recorded. Expected 2-3°C reduction in local surface temperatures.",
            "priority": "short-term",
            "timeline": "6-12 months",
            "location": "Vatva Industrial Area, Naroda GIDC",
        })
        priority_actions.append("Launch cool roof pilot in Vatva and Naroda industrial zones")

    # NDVI Analysis
    ndvi_data = analysis.get("NDVI", {})
    ndvi_stats = ndvi_data.get("statistics", {})
    if ndvi_stats:
        mean_ndvi = ndvi_stats.get("mean", 0.25)
        findings.append({
            "title": "Declining Vegetation Cover in Urban Core",
            "description": f"Average NDVI of {mean_ndvi} indicates sparse vegetation across the city. Satellite monitoring shows vegetation stress particularly in western expansion zones.",
            "severity": "high" if mean_ndvi < 0.3 else "moderate",
            "parameter": "NDVI",
            "evidence": f"MODIS NDVI analysis identified {ndvi_data.get('hotspot_count', 0)} zones of critically low vegetation.",
        })
        recommendations.append({
            "title": "Urban Forest Restoration Program",
            "description": "Restore and expand green cover in identified low-NDVI zones. Target: increase NDVI by 0.1 in priority areas within 3 years. Focus on native drought-resistant species.",
            "priority": "immediate",
            "timeline": "Immediate start, 3-year program",
            "location": "Western Ahmedabad expansion zones, Bopal, Shela",
        })
        priority_actions.append("Begin urban forestry program targeting lowest NDVI zones")

    # NO2 Analysis
    no2_data = analysis.get("NO2", {})
    no2_stats = no2_data.get("statistics", {})
    if no2_stats:
        max_no2 = no2_stats.get("max", 0.0001)
        findings.append({
            "title": "Elevated NO₂ Concentrations in Industrial Belt",
            "description": f"Sentinel-5P data reveals elevated tropospheric NO₂ concentrations with peak values of {max_no2} mol/m². Industrial corridors show consistently higher pollution levels.",
            "severity": "critical" if max_no2 > 0.00012 else "high",
            "parameter": "NO2",
            "evidence": f"Tropospheric NO₂ analysis detected {no2_data.get('anomaly_count', 0)} pollution anomalies and {no2_data.get('hotspot_count', 0)} pollution clusters.",
        })
        recommendations.append({
            "title": "Industrial Emission Monitoring & Control",
            "description": "Deploy continuous emission monitoring systems (CEMS) in identified NO₂ hotspot industrial zones. Enforce stricter emission standards for units in satellite-detected pollution clusters.",
            "priority": "immediate",
            "timeline": "0-3 months for deployment",
            "location": "Naroda Industrial Estate, Vatva GIDC, Odhav Industrial Area",
        })
        recommendations.append({
            "title": "Traffic Emission Reduction — Low Emission Zones",
            "description": "Establish Low Emission Zones (LEZ) in areas where satellite data shows NO₂ accumulation correlating with traffic density. Promote electric public transport.",
            "priority": "short-term",
            "timeline": "6-18 months",
            "location": "Ashram Road, Relief Road, Nehru Bridge corridor",
        })
        priority_actions.append("Deploy emission monitoring in top 3 industrial pollution hotspots")

    # Soil Moisture Analysis
    sm_data = analysis.get("SOIL_MOISTURE", {})
    sm_stats = sm_data.get("statistics", {})
    if sm_stats:
        mean_sm = sm_stats.get("mean", 0.12)
        findings.append({
            "title": "Low Soil Moisture Indicating Drought Stress",
            "description": f"SMAP satellite data shows average soil moisture of {mean_sm} m³/m³, indicating semi-arid conditions with potential drought stress in agricultural periphery.",
            "severity": "high" if mean_sm < 0.15 else "moderate",
            "parameter": "SOIL_MOISTURE",
            "evidence": f"NASA SMAP analysis shows soil moisture consistently below comfortable thresholds in {sm_data.get('hotspot_count', 0)} zones.",
        })
        recommendations.append({
            "title": "Water Conservation & Rainwater Harvesting",
            "description": "Mandate rainwater harvesting in new construction within low soil moisture zones. Implement micro-irrigation in urban green spaces and peri-urban agriculture.",
            "priority": "short-term",
            "timeline": "3-12 months",
            "location": "Eastern and northern periphery agricultural zones",
        })
        priority_actions.append("Mandate rainwater harvesting for all new construction permits")

    # Cross-cutting recommendations
    recommendations.append({
        "title": "Satellite-Based Environmental Monitoring Dashboard",
        "description": "Establish a permanent satellite environmental monitoring system for Ahmedabad Municipal Corporation using this platform. Enable real-time tracking of heat islands, air quality, vegetation health, and water stress.",
        "priority": "long-term",
        "timeline": "12-24 months for full deployment",
        "location": "Ahmedabad Municipal Corporation — city-wide",
    })
    priority_actions.append("Present satellite findings to Ahmedabad Municipal Corporation for immediate review")

    return {
        "city": city,
        "generated_at": datetime.now().isoformat(),
        "summary": f"Satellite environmental analysis of {city} reveals critical urban heat island effects with surface temperatures exceeding {lst_stats.get('max', 45)}°C, declining vegetation cover (mean NDVI: {ndvi_stats.get('mean', 0.25)}), elevated NO₂ pollution in industrial corridors, and low soil moisture indicating drought vulnerability. Immediate action is recommended in industrial zones (Vatva, Naroda) for pollution control, along with urban greening programs in western expansion areas and cool roof mandates in high-temperature zones.",
        "findings": findings,
        "recommendations": recommendations,
        "priority_actions": priority_actions,
    }


async def generate_action_plan(city: str, parameters: list[str], date_range: dict) -> dict:
    """Generate an Environment Action Plan using satellite data + ML analysis + LLM."""
    # Step 1: Gather analysis for all parameters
    analysis = {}
    for param in parameters:
        try:
            stats = satellite_service.get_statistics(param)
            anomaly_result = ml_service.detect_anomalies(param, city)
            hotspot_result = ml_service.find_hotspots(param, city)

            analysis[param] = {
                "statistics": stats,
                "anomalies": anomaly_result.get("anomalies", [])[:5],
                "anomaly_count": anomaly_result.get("anomaly_count", 0),
                "hotspots": hotspot_result.get("hotspots", [])[:5],
                "hotspot_count": hotspot_result.get("cluster_count", 0),
            }
        except Exception as e:
            logger.error(f"Error analyzing {param}: {e}")
            analysis[param] = {"error": str(e)}

    # Step 2: Try LLM-based generation
    settings = get_settings()
    if settings.anthropic_api_key or settings.openai_api_key:
        try:
            prompt = _build_findings_prompt(city, analysis)
            llm_response = await _call_llm(prompt)
            if llm_response:
                import json
                # Try to parse JSON from LLM response
                # Handle markdown code blocks
                clean = llm_response.strip()
                if clean.startswith("```"):
                    clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
                    clean = clean.rsplit("```", 1)[0]
                plan_data = json.loads(clean)
                plan_data["city"] = city
                plan_data["generated_at"] = datetime.now().isoformat()
                plan_data["source"] = "llm"
                return plan_data
        except Exception as e:
            logger.warning(f"LLM plan generation failed: {e}. Using template fallback.")

    # Step 3: Fallback to template-based generation
    plan = _generate_template_plan(city, analysis)
    plan["source"] = "template"
    return plan

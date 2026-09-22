from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import random

from utils.database import get_db
from models.db_models import OutbreakAlert, VillageHealthScore

router = APIRouter()

# ── Seed data for demo ───────────────────────────────────────────────────────

MOCK_ALERTS = [
    {
        "id": "1", "disease": "Measles", "region": "South Carolina", "district": "Richland",
        "state": "SC", "risk_level": "critical", "case_count": 789,
        "source": "CDC", "description": "Measles outbreak linked to declining MMR vaccination rates.",
        "recommendations": ["Ensure MMR vaccination", "Isolate confirmed cases", "Contact tracing"],
        "is_active": True, "detected_at": "2026-01-15T00:00:00"
    },
    {
        "id": "2", "disease": "Cholera", "region": "Southern Africa", "district": "Maputo",
        "state": "Mozambique", "risk_level": "high", "case_count": 4320,
        "source": "WHO", "description": "Cyclone-induced flooding causing cholera surge. Mozambique accounts for 90% of cases.",
        "recommendations": ["Distribute ORS", "Boil water advisory", "Deploy WASH teams"],
        "is_active": True, "detected_at": "2026-01-20T00:00:00"
    },
    {
        "id": "3", "disease": "H5N1 Avian Influenza", "region": "US Midwest", "district": "Iowa",
        "state": "Iowa", "risk_level": "medium", "case_count": 12,
        "source": "CDC", "description": "Avian influenza detected in dairy farm workers.",
        "recommendations": ["PPE for farm workers", "Surveillance enhancement", "Antiviral stockpile"],
        "is_active": True, "detected_at": "2026-02-01T00:00:00"
    },
    {
        "id": "4", "disease": "Tuberculosis", "region": "Maharashtra", "district": "Pune Rural",
        "state": "Maharashtra", "risk_level": "high", "case_count": 156,
        "source": "IDSP", "description": "Rising TB cases in rural districts. Drug-resistant strain detected.",
        "recommendations": ["Expand DOTS programme", "Contact tracing", "Nutritional support"],
        "is_active": True, "detected_at": "2026-01-10T00:00:00"
    },
    {
        "id": "5", "disease": "Malaria", "region": "Odisha", "district": "Koraput",
        "state": "Odisha", "risk_level": "medium", "case_count": 234,
        "source": "IDSP", "description": "Seasonal malaria spike with artemisinin resistance concerns.",
        "recommendations": ["Indoor residual spraying", "Rapid diagnostic tests", "ACT distribution"],
        "is_active": True, "detected_at": "2026-02-05T00:00:00"
    },
    {
        "id": "6", "disease": "Dengue", "region": "Uttar Pradesh", "district": "Lucknow",
        "state": "Uttar Pradesh", "risk_level": "medium", "case_count": 89,
        "source": "IDSP", "description": "Dengue cases rising with monsoon season.",
        "recommendations": ["Eliminate stagnant water", "Mosquito nets", "Fever surveillance"],
        "is_active": True, "detected_at": "2026-02-10T00:00:00"
    },
]

MOCK_VILLAGE_SCORES = [
    {"village": "Kurnool Rural Cluster", "district": "Kurnool", "state": "Andhra Pradesh",
     "health_score": 72, "vaccination_coverage": 68, "malnutrition_rate": 18,
     "disease_incidence": 24, "maternal_risk": 15, "sanitation_score": 60},
    {"village": "Koraput Block", "district": "Koraput", "state": "Odisha",
     "health_score": 58, "vaccination_coverage": 52, "malnutrition_rate": 31,
     "disease_incidence": 42, "maternal_risk": 28, "sanitation_score": 45},
    {"village": "Vidarbha East", "district": "Yavatmal", "state": "Maharashtra",
     "health_score": 65, "vaccination_coverage": 74, "malnutrition_rate": 22,
     "disease_incidence": 19, "maternal_risk": 12, "sanitation_score": 68},
    {"village": "Barmer Rural", "district": "Barmer", "state": "Rajasthan",
     "health_score": 55, "vaccination_coverage": 48, "malnutrition_rate": 35,
     "disease_incidence": 38, "maternal_risk": 32, "sanitation_score": 40},
    {"village": "Sundarban Cluster", "district": "South 24 Parganas", "state": "West Bengal",
     "health_score": 63, "vaccination_coverage": 71, "malnutrition_rate": 25,
     "disease_incidence": 28, "maternal_risk": 20, "sanitation_score": 55},
]

@router.get("/alerts")
def get_outbreak_alerts(
    risk_level: Optional[str] = None,
    state: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    import random
    from datetime import datetime
    
    # Clone and mutate slightly to simulate live feed
    alerts = []
    for a in MOCK_ALERTS:
        item = a.copy()
        item["case_count"] += random.randint(-5, 10)
        item["case_count"] = max(0, item["case_count"])  # prevent negative
        alerts.append(item)

    if risk_level:
        alerts = [a for a in alerts if a["risk_level"] == risk_level]
    if state:
        alerts = [a for a in alerts if state.lower() in a["state"].lower()]
    if active_only:
        alerts = [a for a in alerts if a["is_active"]]
        
    return {"alerts": alerts, "total": len(alerts), "timestamp": datetime.utcnow().isoformat()}

@router.get("/alerts/{alert_id}")
def get_alert_detail(alert_id: str):
    import random
    alert = next((a for a in MOCK_ALERTS if a["id"] == alert_id), None)
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Simulate slightly live single item
    item = alert.copy()
    item["case_count"] += random.randint(-5, 10)
    item["case_count"] = max(0, item["case_count"])
    return item

@router.get("/village-scores")
def get_village_scores(state: Optional[str] = None, db: Session = Depends(get_db)):
    import random
    scores = []
    for s in MOCK_VILLAGE_SCORES:
        item = s.copy()
        # Vibrate values +- 1 or 2 to simulate live data stream
        item["health_score"] = min(100, max(0, item["health_score"] + random.uniform(-1.5, 1.5)))
        item["vaccination_coverage"] = min(100, max(0, item["vaccination_coverage"] + random.uniform(-0.5, 0.5)))
        item["malnutrition_rate"] = min(100, max(0, item["malnutrition_rate"] + random.uniform(-0.5, 0.5)))
        item["maternal_risk"] = min(100, max(0, item["maternal_risk"] + random.uniform(-0.5, 0.5)))
        
        # Format explicitly to floats with 1 decimal place or int
        item["health_score"] = round(item["health_score"], 1)
        item["vaccination_coverage"] = round(item["vaccination_coverage"], 1)
        item["malnutrition_rate"] = round(item["malnutrition_rate"], 1)
        item["maternal_risk"] = round(item["maternal_risk"], 1)
        
        scores.append(item)

    if state:
        scores = [s for s in scores if state.lower() in s["state"].lower()]
    return {"villages": scores, "total": len(scores)}

@router.get("/risk-map")
def get_risk_map():
    """Returns disease risk data for map visualization."""
    return {
        "regions": [
            {"region": "Kurnool", "lat": 15.83, "lng": 78.04, "risk": "medium", "disease": "Malaria", "cases": 45},
            {"region": "Koraput", "lat": 18.81, "lng": 82.71, "risk": "high", "disease": "Malaria", "cases": 234},
            {"region": "Yavatmal", "lat": 20.38, "lng": 78.12, "risk": "medium", "disease": "TB", "cases": 89},
            {"region": "Barmer",   "lat": 25.75, "lng": 71.39, "risk": "high", "disease": "Cholera", "cases": 67},
            {"region": "Lucknow",  "lat": 26.85, "lng": 80.95, "risk": "medium", "disease": "Dengue", "cases": 89},
            {"region": "Pune",     "lat": 18.52, "lng": 73.86, "risk": "high", "disease": "TB", "cases": 156},
        ]
    }

@router.get("/surveillance/summary")
def surveillance_summary():
    from datetime import datetime
    import random
    
    return {
        "active_outbreaks": 6 + random.randint(0, 1),
        "critical_alerts": 1,
        "high_risk_regions": 3 + random.randint(0, 1),
        "vaccine_gap_villages": 12 + random.randint(-1, 2),
        "monitored_diseases": ["Measles", "TB", "Malaria", "Cholera", "Dengue", "H5N1", "Mpox"],
        "data_sources": ["WHO", "CDC", "IDSP India", "IMD", "HMIS"],
        "last_updated": datetime.utcnow().isoformat(),
        "trends": {
            "measles": "increasing",
            "malaria": "seasonal_peak",
            "tb": "stable_high",
            "cholera": "decreasing",
            "dengue": "increasing"
        }
    }

@router.get("/forecast")
def outbreak_forecast():
    """AI-based 30-day outbreak forecast."""
    return {
        "forecast_period": "30 days",
        "generated_at": datetime.utcnow().isoformat(),
        "predictions": [
            {
                "disease": "Dengue",
                "region": "North India",
                "probability": 0.78,
                "expected_cases": 450,
                "confidence": "high",
                "drivers": ["monsoon season", "urbanization", "vector breeding"]
            },
            {
                "disease": "Cholera",
                "region": "Flood-affected districts",
                "probability": 0.65,
                "expected_cases": 200,
                "confidence": "medium",
                "drivers": ["flood forecasts", "damaged WASH infrastructure"]
            },
            {
                "disease": "Measles",
                "region": "Undervaccinated clusters",
                "probability": 0.55,
                "expected_cases": 80,
                "confidence": "medium",
                "drivers": ["vaccination coverage < 70%", "international travel"]
            }
        ]
    }

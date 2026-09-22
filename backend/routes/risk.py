# routes/risk.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
import random

router = APIRouter()

class RiskRequest(BaseModel):
    patient_id: Optional[str] = None
    age: int
    gender: str
    heart_rate: Optional[float] = None
    oxygen_level: Optional[float] = None
    temperature: Optional[float] = None
    glucose_level: Optional[float] = None
    blood_pressure_sys: Optional[float] = None
    chronic_conditions: Optional[List[str]] = []
    recent_symptoms: Optional[List[str]] = []
    village_outbreak_risk: Optional[str] = "low"

@router.post("/analyze")
def analyze_risk(req: RiskRequest):
    score = 20  # base

    if req.age > 60: score += 15
    if req.age < 5:  score += 20
    if req.oxygen_level and req.oxygen_level < 95: score += 25
    if req.temperature and req.temperature > 38.5: score += 15
    if req.heart_rate and req.heart_rate > 110: score += 10
    if req.glucose_level and req.glucose_level > 180: score += 15
    if req.blood_pressure_sys and req.blood_pressure_sys > 160: score += 15
    if len(req.chronic_conditions) > 0: score += 10 * len(req.chronic_conditions)
    if req.village_outbreak_risk == "high": score += 20
    if req.village_outbreak_risk == "critical": score += 30

    score = min(score, 100)

    level = "low"
    if score >= 70: level = "critical"
    elif score >= 50: level = "high"
    elif score >= 30: level = "medium"

    return {
        "risk_score": score,
        "risk_level": level,
        "contributing_factors": {
            "age_risk": req.age > 60 or req.age < 5,
            "low_oxygen": req.oxygen_level and req.oxygen_level < 95,
            "fever": req.temperature and req.temperature > 38.5,
            "chronic_conditions": req.chronic_conditions,
            "outbreak_exposure": req.village_outbreak_risk in ["high", "critical"]
        },
        "recommended_action": (
            "IMMEDIATE hospital admission required." if level == "critical"
            else "Schedule urgent PHC visit within 24 hours." if level == "high"
            else "Monitor vitals daily and follow up in 3 days." if level == "medium"
            else "Continue routine monitoring."
        ),
        "shap_values": {
            "age": 0.15 if req.age > 60 else 0.0,
            "oxygen": 0.25 if req.oxygen_level and req.oxygen_level < 95 else 0.0,
            "temperature": 0.15 if req.temperature and req.temperature > 38.5 else 0.0,
            "chronic_disease": 0.10 * len(req.chronic_conditions),
            "outbreak_context": 0.20 if req.village_outbreak_risk == "high" else 0.0,
        }
    }

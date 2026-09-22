"""
GramSwasthya AI — Clinical Decision Support System (CDSS) Routes
Provides AI-powered treatment recommendations, drug interaction checks, and evidence-based guidelines.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from utils.database import get_db
from utils.medical_knowledge import (
    match_symptoms_to_diseases,
    get_treatment,
    check_drug_interactions,
    TREATMENT_GUIDELINES,
    GENERIC_ALTERNATIVES,
)

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class TreatmentRequest(BaseModel):
    symptoms: List[str]
    age: int = 30
    gender: str = "male"
    chronic_conditions: Optional[List[str]] = []
    current_medications: Optional[List[str]] = []
    weight_kg: Optional[float] = None

class DrugInteractionRequest(BaseModel):
    drugs: List[str]


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/suggest-treatment/")
def suggest_treatment(req: TreatmentRequest):
    """AI-powered treatment suggestion based on symptoms, patient profile, and medical knowledge graph."""
    # Step 1: Match symptoms to possible diseases
    conditions = match_symptoms_to_diseases(req.symptoms, req.age, req.gender)

    if not conditions:
        return {
            "conditions": [],
            "primary_diagnosis": None,
            "treatment": None,
            "message": "No matching conditions found. Please provide more symptoms or consult a physician.",
        }

    # Step 2: Get treatment for top condition
    primary = conditions[0]
    disease_key = primary["disease"].lower().replace(" ", "_")
    treatment = get_treatment(disease_key)

    # Step 3: Check drug interactions with current medications
    interactions = []
    if req.current_medications and treatment:
        all_drugs = req.current_medications.copy()
        for med in treatment.get("first_line", []):
            all_drugs.append(med["drug"])
        interactions = check_drug_interactions(all_drugs)

    # Step 4: Check for generic alternatives
    generics = {}
    if treatment:
        for med in treatment.get("first_line", []):
            for brand, generic in GENERIC_ALTERNATIVES.items():
                if generic.lower() in med["drug"].lower() or med["drug"].lower() in generic.lower():
                    generics[brand] = generic

    # Step 5: Pediatric dose adjustment
    if req.weight_kg and req.age < 12 and treatment:
        for med in treatment.get("first_line", []):
            if "mg/kg" in med.get("dose", ""):
                med["pediatric_note"] = f"Adjust dose based on weight: {req.weight_kg} kg"

    return {
        "conditions": conditions,
        "primary_diagnosis": primary["disease"],
        "icd11_code": primary.get("icd11_code"),
        "triage_level": primary["triage_level"],
        "investigations": primary.get("investigations", []),
        "treatment": treatment,
        "drug_interactions": interactions,
        "generic_alternatives": generics,
        "contraindication_alerts": _check_contraindications(req, treatment),
        "disclaimer": "AI-assisted suggestion. Final treatment decision must be made by a qualified physician.",
    }


@router.post("/drug-interactions/")
def drug_interaction_check(req: DrugInteractionRequest):
    """Check for drug interactions between a list of medications."""
    if len(req.drugs) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 drugs to check interactions")

    interactions = check_drug_interactions(req.drugs)

    return {
        "drugs_checked": req.drugs,
        "interactions_found": len(interactions),
        "interactions": interactions,
        "safe": len(interactions) == 0,
        "message": "No interactions detected." if not interactions else f"{len(interactions)} interaction(s) found. Review carefully.",
    }


@router.get("/guidelines/{disease}")
def get_guidelines(disease: str):
    """Get evidence-based treatment guidelines for a specific disease."""
    disease_key = disease.lower().replace(" ", "_").replace("-", "_")

    # Try exact match first, then partial match
    guidelines = TREATMENT_GUIDELINES.get(disease_key)
    if not guidelines:
        for key, val in TREATMENT_GUIDELINES.items():
            if disease_key in key or key in disease_key:
                guidelines = val
                disease_key = key
                break

    if not guidelines:
        raise HTTPException(
            status_code=404,
            detail=f"Guidelines not found for '{disease}'. Available: {', '.join(TREATMENT_GUIDELINES.keys())}"
        )

    return {
        "disease": disease_key.replace("_", " ").title(),
        "guidelines": guidelines,
        "generic_alternatives": {
            brand: generic for brand, generic in GENERIC_ALTERNATIVES.items()
            if any(generic.lower() in med.get("drug", "").lower()
                   for med in guidelines.get("first_line", []))
        },
    }


@router.get("/diseases/")
def list_available_diseases():
    """List all diseases with available CDSS guidelines."""
    return {
        "diseases": [
            {"key": k, "name": k.replace("_", " ").title()}
            for k in TREATMENT_GUIDELINES.keys()
        ],
        "total": len(TREATMENT_GUIDELINES),
    }


# ── Helpers ──────────────────────────────────────────────────────────────────

def _check_contraindications(req: TreatmentRequest, treatment: dict):
    """Check for basic contraindications based on patient profile."""
    alerts = []
    if not treatment:
        return alerts

    chronic = set(c.lower() for c in (req.chronic_conditions or []))

    # Metformin + CKD
    if "chronic kidney disease" in chronic:
        for med in treatment.get("first_line", []):
            if "metformin" in med["drug"].lower():
                alerts.append({
                    "drug": med["drug"],
                    "condition": "Chronic Kidney Disease",
                    "severity": "major",
                    "message": "Metformin contraindicated in advanced CKD. Use with caution or switch to insulin.",
                })

    # NSAIDs + Kidney disease
    if "chronic kidney disease" in chronic:
        for med in treatment.get("first_line", []):
            if any(nsaid in med["drug"].lower() for nsaid in ["ibuprofen", "diclofenac", "aspirin"]):
                alerts.append({
                    "drug": med["drug"],
                    "condition": "Chronic Kidney Disease",
                    "severity": "major",
                    "message": "NSAIDs should be avoided in kidney disease.",
                })

    # Pregnancy check for teratogenic drugs
    if req.gender.lower() == "female" and 15 <= req.age <= 45:
        for med in treatment.get("first_line", []):
            if any(d in med["drug"].lower() for d in ["doxycycline", "ciprofloxacin", "methotrexate"]):
                alerts.append({
                    "drug": med["drug"],
                    "condition": "Potential pregnancy",
                    "severity": "warning",
                    "message": f"{med['drug']} may be harmful in pregnancy. Verify pregnancy status before prescribing.",
                })

    return alerts

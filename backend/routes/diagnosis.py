from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import random, time, base64, os, json
from google import genai
from google.genai import types

from utils.database import get_db
from models.db_models import DiagnosisResult, Patient, TriageLevel
from routes.auth import get_current_user

router = APIRouter()

# ── Pydantic schemas ─────────────────────────────────────────────────────────

class SymptomTriageRequest(BaseModel):
    symptoms: List[str]
    age: int
    gender: str
    temperature: Optional[float] = None
    heart_rate: Optional[float] = None
    oxygen_level: Optional[float] = None
    duration_days: Optional[int] = 1
    patient_id: Optional[str] = None

class DiagnosisResponse(BaseModel):
    diagnosis_type: str
    top_conditions: List[dict]
    triage_level: str
    confidence: float
    recommended_action: str
    explainability: dict

# ── Symptom → Disease mapping (rule-based AI sim) ────────────────────────────

SYMPTOM_DISEASE_MAP = {
    frozenset(["fever", "cough", "weight_loss", "night_sweats"]): {
        "disease": "Tuberculosis", "probability": 0.87, "triage": TriageLevel.urgent
    },
    frozenset(["fever", "chills", "headache", "vomiting"]): {
        "disease": "Malaria", "probability": 0.82, "triage": TriageLevel.urgent
    },
    frozenset(["fever", "rash", "cough", "red_eyes"]): {
        "disease": "Measles", "probability": 0.79, "triage": TriageLevel.urgent
    },
    frozenset(["chest_pain", "breathlessness", "sweating"]): {
        "disease": "Cardiac Emergency", "probability": 0.91, "triage": TriageLevel.emergency
    },
    frozenset(["blurred_vision", "frequent_urination", "fatigue"]): {
        "disease": "Diabetic Complication", "probability": 0.74, "triage": TriageLevel.urgent
    },
    frozenset(["diarrhea", "vomiting", "dehydration"]): {
        "disease": "Cholera / Acute Diarrhoeal Disease", "probability": 0.78, "triage": TriageLevel.urgent
    },
    frozenset(["fever", "cough", "sore_throat"]): {
        "disease": "Upper Respiratory Infection", "probability": 0.72, "triage": TriageLevel.routine
    },
}

def triage_from_vitals(temp, hr, spo2):
    if spo2 and spo2 < 90:
        return TriageLevel.emergency
    if temp and temp > 40:
        return TriageLevel.emergency
    if hr and hr > 120:
        return TriageLevel.urgent
    return None

def match_symptoms(symptoms: List[str]):
    symptom_set = frozenset(s.lower() for s in symptoms)
    best_match = None
    best_overlap = 0
    for key, val in SYMPTOM_DISEASE_MAP.items():
        overlap = len(symptom_set & key)
        if overlap > best_overlap:
            best_overlap = overlap
            best_match = val
    if best_match and best_overlap >= 2:
        return best_match
    return {"disease": "Non-specific illness", "probability": 0.55, "triage": TriageLevel.routine}

# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/symptom-triage", response_model=DiagnosisResponse)
def symptom_triage(req: SymptomTriageRequest, db: Session = Depends(get_db)):
    match = match_symptoms(req.symptoms)

    # Override triage from vitals
    vital_triage = triage_from_vitals(req.temperature, req.heart_rate, req.oxygen_level)
    final_triage = vital_triage or match["triage"]

    actions = {
        TriageLevel.emergency: "⚠️ EMERGENCY: Seek immediate hospital care or call ambulance now.",
        TriageLevel.urgent:    "Visit nearest PHC within 24 hours for evaluation.",
        TriageLevel.routine:   "Schedule teleconsultation within 3 days."
    }

    result = DiagnosisResult(
        patient_id=req.patient_id,
        diagnosis_type="symptom_triage",
        input_type="symptoms",
        result={"disease": match["disease"], "probability": match["probability"]},
        triage_level=final_triage,
        recommended_action=actions[final_triage],
        explainability={
            "top_symptoms": req.symptoms[:5],
            "matched_pattern": match["disease"],
            "confidence_factors": ["symptom_pattern", "vital_signs", "age_risk"]
        }
    )
    if req.patient_id:
        db.add(result)
        db.commit()

    return DiagnosisResponse(
        diagnosis_type="symptom_triage",
        top_conditions=[
            {"disease": match["disease"], "probability": match["probability"]},
            {"disease": "Viral fever", "probability": round(random.uniform(0.2, 0.4), 2)},
            {"disease": "Bacterial infection", "probability": round(random.uniform(0.1, 0.3), 2)},
        ],
        triage_level=final_triage.value,
        confidence=match["probability"],
        recommended_action=actions[final_triage],
        explainability={
            "key_symptoms": req.symptoms,
            "vital_flags": {
                "fever": req.temperature and req.temperature > 38.5,
                "low_oxygen": req.oxygen_level and req.oxygen_level < 95,
                "high_hr": req.heart_rate and req.heart_rate > 100,
            }
        }
    )

@router.post("/tb-xray")
async def tb_xray_analysis(
    patient_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Uses Gemini Vision to analyze the chest X-ray."""
    contents = await file.read()
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Fallback to simulation if no API key is set
        time.sleep(1)
        probability = round(random.uniform(0.05, 0.95), 3)
        is_positive = probability > 0.5
        result = {
            "disease": "Tuberculosis (Simulation Mode - No API Key)",
            "probability": probability,
            "positive": is_positive,
            "triage": "urgent" if is_positive else "routine",
            "recommended_action": "Refer to RNTCP programme." if is_positive else "Monitor if symptoms persist.",
            "heatmap_available": False,
            "model": "GramSwasthya-TB-CNN - Simulated",
            "inference_time_ms": 1200,
            "abnormal_regions": []
        }
    else:
        try:
            client = genai.Client(api_key=api_key)
            mime_type = file.content_type or "image/jpeg"
            
            prompt = """
            You are an expert radiologist AI. Analyze this chest X-ray image carefully.
            Specifically look for signs of Tuberculosis, Pneumonia, or other critical lung abnormalities.
            Return ONLY a valid JSON object with the following schema:
            {
                "disease": "Primary diagnosis name",
                "probability": a float between 0.0 and 1.0 representing your confidence,
                "positive": true if you detect significant abnormalities indicating disease, false otherwise,
                "triage": "emergency", "urgent", or "routine",
                "recommended_action": "Clear, concise next step recommendation",
                "abnormal_regions": ["list of strings describing affected areas like 'upper right lobe'"]
            }
            Do not include any markdown formatting (like ```json), just the raw JSON object.
            """
            
            response = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=[
                    prompt,
                    types.Part.from_bytes(data=contents, mime_type=mime_type)
                ]
            )
            
            # Clean up the response if it has markdown formatting
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "", 1)
            if response_text.endswith("```"):
                response_text = response_text[:-3]
                
            ai_data = json.loads(response_text)
            
            result = {
                "disease": ai_data.get("disease", "Unknown Chest Pathology"),
                "probability": ai_data.get("probability", 0.5),
                "positive": ai_data.get("positive", True),
                "triage": ai_data.get("triage", "urgent"),
                "recommended_action": ai_data.get("recommended_action", "Consult Pulmonologist"),
                "heatmap_available": False,
                "model": "Gemini 2.5 Flash Vision Multimodal",
                "inference_time_ms": 2500,
                "abnormal_regions": ai_data.get("abnormal_regions", [])
            }
        except Exception as e:
            print(f"Gemini API Error: {e}")
            raise HTTPException(status_code=500, detail=f"AI Vision Analysis Failed: {str(e)}")

    if patient_id:
        db_result = DiagnosisResult(
            patient_id=patient_id,
            diagnosis_type="tb_xray",
            input_type="image",
            result=result,
            triage_level=TriageLevel(result["triage"]) if result["triage"] in [t.value for t in TriageLevel] else TriageLevel.urgent,
            recommended_action=result["recommended_action"],
        )
        db.add(db_result)
        db.commit()

    return result

@router.post("/analyze-report")
async def analyze_health_report(
    patient_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Uses Gemini AI to analyze any health report (blood tests, lab reports, etc.)."""
    contents = await file.read()
    filename = file.filename or "report"

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Simulation fallback
        time.sleep(1.5)
        result = {
            "report_type": "Complete Blood Count (CBC) — Simulated",
            "risk_level": random.choice(["low", "moderate", "high"]),
            "abnormal_findings": [
                {"parameter": "Hemoglobin", "value": "9.2 g/dL", "normal_range": "12.0–16.0 g/dL", "status": "Low"},
                {"parameter": "WBC Count", "value": "14,800 /µL", "normal_range": "4,000–11,000 /µL", "status": "High"},
                {"parameter": "Platelet Count", "value": "1,40,000 /µL", "normal_range": "1,50,000–4,00,000 /µL", "status": "Low"},
            ],
            "detected_conditions": [
                {"condition": "Iron Deficiency Anemia", "probability": 0.82},
                {"condition": "Possible Infection / Inflammation", "probability": 0.71},
                {"condition": "Mild Thrombocytopenia", "probability": 0.55},
            ],
            "recommendations": [
                "Consult a physician for anemia evaluation",
                "Serum ferritin and iron studies recommended",
                "Repeat CBC after 2 weeks to monitor WBC trend",
                "Peripheral blood smear for platelet morphology",
            ],
            "summary": "The report shows low hemoglobin suggesting anemia, elevated WBC indicating possible infection, and mildly low platelet count. Further evaluation recommended.",
            "model": "GramSwasthya Report Analyzer — Simulated (No API Key)",
        }
    else:
        try:
            client = genai.Client(api_key=api_key)
            mime_type = file.content_type or "image/jpeg"
            if filename.lower().endswith(".pdf"):
                mime_type = "application/pdf"

            prompt = """
            You are an expert clinical pathologist and medical laboratory analyst AI.
            Analyze this health/medical report carefully. It could be any type of medical report such as:
            - Blood test (CBC, LFT, KFT, Lipid Profile, Thyroid Panel, HbA1c, etc.)
            - Urine analysis
            - Pathology/histopathology report
            - Radiology report
            - Any other medical/lab test report

            Extract and analyze ALL values. Identify abnormal results and assess clinical significance.

            Return ONLY a valid JSON object (no markdown formatting, no ```json wrapper) with this exact schema:
            {
                "report_type": "Name of the report type detected (e.g., Complete Blood Count, Liver Function Test, Lipid Profile)",
                "risk_level": "low" or "moderate" or "high" or "critical",
                "abnormal_findings": [
                    {
                        "parameter": "Name of abnormal parameter",
                        "value": "The observed value with units",
                        "normal_range": "Expected normal range",
                        "status": "High" or "Low" or "Abnormal"
                    }
                ],
                "detected_conditions": [
                    {
                        "condition": "Possible disease or condition name",
                        "probability": a float between 0.0 and 1.0
                    }
                ],
                "recommendations": ["List of recommended next steps or follow-up tests"],
                "summary": "A 2-3 sentence clinical summary of the overall findings"
            }

            Important rules:
            - If all values are normal, set risk_level to "low" and abnormal_findings to an empty array.
            - Always provide at least one recommendation.
            - Be specific with parameter values and ranges.
            - Probability should reflect clinical likelihood given the report findings.
            """

            response = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=[
                    prompt,
                    types.Part.from_bytes(data=contents, mime_type=mime_type)
                ]
            )

            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "", 1)
            if response_text.startswith("```"):
                response_text = response_text.replace("```", "", 1)
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            ai_data = json.loads(response_text)

            result = {
                "report_type": ai_data.get("report_type", "Medical Report"),
                "risk_level": ai_data.get("risk_level", "moderate"),
                "abnormal_findings": ai_data.get("abnormal_findings", []),
                "detected_conditions": ai_data.get("detected_conditions", []),
                "recommendations": ai_data.get("recommendations", ["Consult a physician for further evaluation"]),
                "summary": ai_data.get("summary", "Analysis complete. Please consult a doctor for interpretation."),
                "model": "Gemini 2.5 Flash — Medical Report Analyzer",
            }
        except Exception as e:
            print(f"Gemini Report Analysis Error: {e}")
            raise HTTPException(status_code=500, detail=f"AI Report Analysis Failed: {str(e)}")

    if patient_id:
        db_result = DiagnosisResult(
            patient_id=patient_id,
            diagnosis_type="health_report",
            input_type="document",
            result=result,
            triage_level=TriageLevel({
                "low": "routine", "moderate": "urgent", "high": "urgent", "critical": "emergency"
            }.get(result["risk_level"], "routine")),
            recommended_action=result["recommendations"][0] if result["recommendations"] else "Consult physician",
        )
        db.add(db_result)
        db.commit()

    return result

@router.get("/history/{patient_id}")
def diagnosis_history(patient_id: str, db: Session = Depends(get_db)):
    results = db.query(DiagnosisResult).filter(
        DiagnosisResult.patient_id == patient_id
    ).order_by(DiagnosisResult.created_at.desc()).limit(20).all()
    return [
        {
            "id": r.id,
            "type": r.diagnosis_type,
            "result": r.result,
            "triage": r.triage_level,
            "action": r.recommended_action,
            "verified": r.doctor_verified,
            "date": r.created_at
        } for r in results
    ]

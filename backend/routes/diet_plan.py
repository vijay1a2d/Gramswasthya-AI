from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os, json, time
from google import genai
from google.genai import types

from utils.database import get_db
from models.db_models import Patient, VitalRecord, DiagnosisResult

router = APIRouter()

# ── Schemas ──────────────────────────────────────────────────────────────────

class GenerateDietRequest(BaseModel):
    patient_id: str
    language: Optional[str] = "English"

class ChatDietRequest(BaseModel):
    patient_id: str
    current_plan: Dict[str, Any]
    user_message: str
    language: Optional[str] = "English"
    chat_history: Optional[List[Dict[str, str]]] = []

# ── Helper to fetch patient context ──────────────────────────────────────────

def fetch_patient_context(db: Session, patient_id: str):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    vitals = db.query(VitalRecord).filter(VitalRecord.patient_id == patient_id).order_by(VitalRecord.recorded_at.desc()).first()
    recent_diagnoses = db.query(DiagnosisResult).filter(DiagnosisResult.patient_id == patient_id).order_by(DiagnosisResult.created_at.desc()).limit(3).all()

    vitals_dict = {}
    if vitals:
        vitals_dict = {
            "glucose_level": vitals.glucose_level,
            "blood_pressure_sys": vitals.blood_pressure_sys,
            "blood_pressure_dia": vitals.blood_pressure_dia,
            "heart_rate": vitals.heart_rate,
            "temperature": vitals.temperature,
            "oxygen_level": vitals.oxygen_level
        }
        
    diagnoses_list = []
    for d in recent_diagnoses:
        if d.result and isinstance(d.result, dict):
            diagnoses_list.append(d.result.get("disease", d.diagnosis_type))
        else:
            diagnoses_list.append(d.diagnosis_type)

    return {
        "age": patient.age,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "allergies": patient.allergies or [],
        "chronic_conditions": patient.chronic_conditions or [],
        "latest_vitals": vitals_dict,
        "recent_diagnoses": diagnoses_list
    }

# ── System Prompts ───────────────────────────────────────────────────────────

GENERATE_SYSTEM_PROMPT = """You are GramSwasthya AI Dietitian, an expert clinical nutritionist for a rural healthcare platform in India.
Your task is to generate a highly personalized, culturally appropriate, and medically safe diet plan for a patient based on their health records.

CRITICAL RULES:
1. STRICTLY avoid any foods the patient is allergic to.
2. Modulate the diet appropriately for their chronic conditions (e.g., low GI for diabetes, low sodium for hypertension).
3. Recommend locally available, affordable Indian ingredients (e.g., millets, seasonal vegetables, dals).
4. You MUST respond ONLY with a strictly valid JSON object matching this exact schema (no markdown blocks, no text outside JSON):
{
  "diet_plan": {
    "breakfast": "Description of breakfast",
    "mid_morning": "Description of mid-morning snack",
    "lunch": "Description of lunch",
    "evening": "Description of evening snack",
    "dinner": "Description of dinner"
  },
  "foods_to_avoid": ["List", "of", "foods", "to", "strictly", "avoid"],
  "nutritional_goals": {
    "calories": "Estimated daily kcal",
    "protein": "Target protein",
    "key_focus": "Main nutritional focus (e.g., Low Sodium, High Iron)"
  },
  "special_notes": "A brief, empathetic medical note explaining why this diet was chosen.",
  "weekly_suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}
5. The output MUST be entirely in the language specified by the user. If the language is Hindi or Telugu, ensure medical terms are easily understandable.
"""

CHAT_SYSTEM_PROMPT = """You are GramSwasthya Voice AI Dietitian. You are having an interactive voice conversation with a patient to adjust their diet plan.

Input provided will be:
- The Patient's health context
- The Current Diet Plan JSON
- The User's spoken message
- Previous conversation history

Your tasks:
1. Empathize with the user's request (e.g., if they say "I don't like oats", acknowledge it).
2. If their request is medically safe, update the diet plan JSON accordingly.
3. If their request is unsafe (e.g., asking for high sugar when diabetic), politely explain why they shouldn't have it and suggest a healthy alternative.
4. Ask a friendly, engaging follow-up question.
5. You MUST respond ONLY with a strictly valid JSON object matching this schema (no markdown blocks):
{
  "updated_plan_needed": true or false,
  "updated_plan": { ... }, // Same schema as the original diet_plan, provide ONLY if updated_plan_needed is true. If false, output null.
  "assistant_voice_response": "What you will actually speak back to the user in a natural, conversational tone in their language."
}
6. Respond entirely in the user's language. Keep the `assistant_voice_response` concise (1-3 sentences) as it will be read aloud by TTS.
"""

# ── Simulation ───────────────────────────────────────────────────────────────

def get_simulated_diet(context, language):
    time.sleep(1.5)
    return {
        "diet_plan": {
            "breakfast": "Oats porridge with almonds and chia seeds. 1 cup green tea." if "diabetes" not in str(context).lower() else "Moong dal chilla with mint chutney. Unsweetened tea.",
            "mid_morning": "1 medium apple or a handful of roasted chana.",
            "lunch": "2 multigrain rotis, 1 bowl dal tadka, 1 portion seasonal green veg (palak/methi), small portion salad.",
            "evening": "Roasted foxnuts (makhana) with buttermilk (chaas).",
            "dinner": "Light jawar/ragi roti, 1 bowl bottle gourd (lauki) sabzi, a small portion of cucumber salad."
        },
        "foods_to_avoid": context["allergies"] + ["Deep fried snacks", "Refined sugar/sweets", "Processed packaged foods"],
        "nutritional_goals": {
            "calories": "1600 - 1800 kcal",
            "protein": "55g - 65g",
            "key_focus": "Balanced nutrition with high fiber"
        },
        "special_notes": "Since we noticed some chronic conditions, we've focused on complex carbohydrates and reduced sodium/sugar. Stay hydrated!",
        "weekly_suggestions": ["Try bajra khichdi on weekends", "Include papaya twice a week", "Use cold-pressed mustard oil in moderation"]
    }

def get_simulated_chat(current_plan, user_msg, language):
    time.sleep(1.5)
    return {
        "updated_plan_needed": False,
        "updated_plan": None,
        "assistant_voice_response": f"I heard you say '{user_msg}'. Since I'm in simulation mode, I can't fully update the plan, but I recommend consulting your doctor for significant changes. Is there anything else you want to ask?"
    }

# ── Routes ───────────────────────────────────────────────────────────────────

def _parse_gemini_json(text: str) -> dict:
    t = text.strip()
    if t.startswith("```json"):
        t = t[7:]
    elif t.startswith("```"):
        t = t[3:]
    if t.endswith("```"):
        t = t[:-3]
    return json.loads(t.strip())

@router.post("/generate")
def generate_diet_plan(req: GenerateDietRequest, db: Session = Depends(get_db)):
    context = fetch_patient_context(db, req.patient_id)
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return get_simulated_diet(context, req.language)

    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        Language Requested: {req.language}
        
        Patient Health Context:
        {json.dumps(context, indent=2)}
        
        Generate the diet plan now.
        """
        
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[
                types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
            ],
            config=types.GenerateContentConfig(
                system_instruction=GENERATE_SYSTEM_PROMPT,
                temperature=0.2,
            )
        )
        
        return _parse_gemini_json(response.text)
        
    except Exception as e:
        print(f"Gemini Diet Gen Error: {e}")
        return get_simulated_diet(context, req.language)


@router.post("/chat")
def chat_diet_assistant(req: ChatDietRequest, db: Session = Depends(get_db)):
    context = fetch_patient_context(db, req.patient_id)
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return get_simulated_chat(req.current_plan, req.user_message, req.language)

    try:
        client = genai.Client(api_key=api_key)
        
        history_text = "\n".join([f"{m['role']}: {m['content']}" for m in req.chat_history])
        
        prompt = f"""
        Language Requested: {req.language}
        
        Patient Health Context:
        {json.dumps(context, indent=2)}
        
        Current Diet Plan:
        {json.dumps(req.current_plan, indent=2)}
        
        Conversation History:
        {history_text}
        
        User's Spoken Message: "{req.user_message}"
        
        Respond now as the Voice AI Dietitian.
        """
        
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[
                types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
            ],
            config=types.GenerateContentConfig(
                system_instruction=CHAT_SYSTEM_PROMPT,
                temperature=0.4,
            )
        )
        
        return _parse_gemini_json(response.text)
        
    except Exception as e:
        print(f"Gemini Diet Chat Error: {e}")
        return get_simulated_chat(req.current_plan, req.user_message, req.language)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os, json, time
from dotenv import load_dotenv
from google import genai
from google.genai import types

from utils.database import get_db

load_dotenv()


def get_gemini_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

router = APIRouter()

class GlobalChatRequest(BaseModel):
    patient_id: Optional[str] = None
    user_message: str
    language: Optional[str] = "English"
    chat_history: Optional[List[Dict[str, str]]] = []

SYSTEM_PROMPT = """You are GramSwasthya Global Voice Assistant, an expert, compassionate 3D virtual doctor for a rural healthcare platform in India.
You appear globally on the user's screen and assist them with general health queries, updating their profile, or guiding them through the application.

Your tasks:
1. Empathize with the user's request using a warm, professional bedside manner.
2. Provide highly accurate, concise medical guidance following WHO/ICMR clinical guidelines.
3. If the query is complex or severe, advise them to visit a doctor or use the "Teleconsult" / "Emergency" features.
4. You MUST respond ONLY with a strictly valid JSON object. Do NOT include ANY text, markdown formatting, or explanations outside the JSON object.
5. JSON Schema:
{
  "assistant_voice_response": "Detailed but concise conversational response in the user's language (under 3-4 sentences so speech synthesis is fast).",
  "suggested_action": "Actionable next step (e.g., 'Go to Diagnosis', 'Book Appointment', 'None')"
}
6. Respond entirely in the user's requested language.
"""

def get_simulated_chat(user_msg, language, patient_id=None, db=None):
    from models.db_models import Patient
    import time
    time.sleep(1.2)
    user_msg_lower = user_msg.lower()
    
    # 1. Parse keywords
    diseases = ["diabetes", "hypertension", "asthma", "thyroid", "arthritis", "anemia"]
    found_diseases = [d for d in diseases if d in user_msg_lower]
    
    symptoms = ["fever", "cough", "headache", "pain", "nausea", "vomiting", "weakness", "breathing", "chest", "bleeding", "cold", "dizziness"]
    found_symptoms = [s for s in symptoms if s in user_msg_lower]
    
    response_text = ""
    suggested_action = "None"
    
    combined = found_diseases + found_symptoms
    if combined and patient_id and db:
        try:
            patient = db.query(Patient).filter(Patient.id == patient_id).first()
            if patient:
                current = patient.chronic_conditions if patient.chronic_conditions else []
                patient.chronic_conditions = list(set(current + combined))
                db.commit()
        except Exception:
            pass
            
    if found_diseases:
        response_text += f"I have updated your medical profile with {', '.join(found_diseases)}. "
            
    if found_symptoms:
        response_text += f"I noted your symptoms: {', '.join(found_symptoms)}. "
        if "chest" in user_msg_lower or "breathing" in user_msg_lower or "bleeding" in user_msg_lower:
            response_text += "These symptoms sound serious. Please seek immediate medical attention."
            suggested_action = "Emergency"
        else:
            response_text += "I recommend using the AI Diagnosis tool for a detailed checkup."
            suggested_action = "Go to Diagnosis"
            
    if not response_text:
        if "hospital" in user_msg_lower or "doctor" in user_msg_lower or "medication" in user_msg_lower:
            response_text = "Let me help you find the nearest hospital or schedule a consultation."
            suggested_action = "Go to Hospitals"
        elif "appointment" in user_msg_lower or "consult" in user_msg_lower:
            response_text = "I can help you schedule a teleconsultation with a doctor."
            suggested_action = "Book Appointment"
        else:
            response_text = f"Based on your request, I can help you navigate the system."
            suggested_action = "None"
            
    return {
        "assistant_voice_response": response_text.strip(),
        "detailed_text_response": f"### 🩺 Assistant Summary\n\n{response_text.strip()}\n\n*Note: Operating in offline simulation. Add a Gemini API Key to enable full interactive diagnoses with Markdown formatting.*",
        "suggested_action": suggested_action
    }

def _parse_gemini_json(text: str) -> dict:
    import json
    t = text.strip()
    # Robust JSON extraction
    start = t.find('{')
    end = t.rfind('}')
    if start != -1 and end != -1:
        t = t[start:end+1]
    return json.loads(t)

@router.post("/chat")
def chat_global_assistant(req: GlobalChatRequest, db: Session = Depends(get_db)):
    api_key = get_gemini_api_key()
    if not api_key:
        return get_simulated_chat(req.user_message, req.language, req.patient_id, db)

    try:
        client = genai.Client(api_key=api_key)
        
        history_text = "\n".join([f"{m['role']}: {m['content']}" for m in (req.chat_history or [])])
        
        prompt = f"""
        Language Requested: {req.language}
        Patient ID Context: {req.patient_id if req.patient_id else 'None/Anonymous'}
        
        Conversation History:
        {history_text}
        
        User's Spoken Message: "{req.user_message}"
        
        Respond now as the Global Voice AI Doctor.
        """
        
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[
                types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.4,
            )
        )
        
        return _parse_gemini_json(response.text)
        
    except Exception as e:
        print(f"Gemini Global Chat Error: {e}")
        return get_simulated_chat(req.user_message, req.language, req.patient_id, db)

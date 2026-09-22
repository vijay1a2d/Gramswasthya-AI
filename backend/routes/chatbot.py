from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os, json
from google import genai
from google.genai import types

router = APIRouter()

# ── Request / Response schemas ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str          # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are GramSwasthya AI — an advanced, compassionate virtual health assistant for a rural healthcare platform in India.

Your capabilities:
- Provide highly accurate preliminary health guidance based strictly on established clinical guidelines (WHO/ICMR).
- Explain medical conditions, medications, and procedures in simple language.
- Suggest when to seek emergency care vs. routine consultation.
- Offer evidence-based diet, nutrition, and wellness advice.
- Help users understand lab reports and health metrics.
- Provide standard first-aid instructions.
- Recommend appropriate specialists.
- Support mental health queries with empathetic responses.

Rules:
1. Medical Accuracy: Your medical advice MUST be highly accurate, evidence-based, and aligned with standard medical protocols (like WHO or ICMR guidelines). Do not guess or hallucinate medical facts.
2. Safety First: If symptoms are vague, ask clarifying questions before giving advice. For emergencies (chest pain, breathing difficulty, severe bleeding, unconsciousness), immediately advise calling emergency services or visiting the nearest hospital.
3. No Definitive Diagnosis: Do not diagnose definitively. Always include a disclaimer that you are an AI assistant and recommend consulting a real doctor for serious concerns.
4. Language & Tone: Always respond in the same language the user writes in (Hindi, Telugu, English, etc.). Be warm, empathetic, and culturally sensitive to rural Indian context. Use simple medical terminology with explanations.
5. Format: Keep responses concise but thorough (2-4 paragraphs max). Use bullet points for readability.
6. Platform Guidance: If asked about the platform features, guide users to relevant pages like AI Diagnosis, Appointments, Teleconsult, Emergency, or CDSS.
7. Medication: For medication advice, only mention over-the-counter (OTC) options for symptom relief if standard protocol allows, and ALWAYS state that they must consult a doctor first before starting any new medication.
"""

# ── Simulation fallback ───────────────────────────────────────────────────────

SIMULATED_RESPONSES = {
    "fever": "Based on your symptoms of fever, I recommend:\n\n1. **Rest and hydration** — drink plenty of water, ORS, and coconut water\n2. **Monitor temperature** — if it exceeds 102°F (38.9°C), visit your nearest PHC\n3. **Paracetamol 500mg** can be taken for relief (consult a doctor if pregnant)\n\n⚠️ If fever persists for more than 3 days or is accompanied by rash, severe headache, or breathing difficulty, please use the **Emergency** feature immediately.\n\n_I'm an AI assistant. Please consult a qualified doctor for proper diagnosis._",
    "headache": "For your headache, here are my recommendations:\n\n1. **Hydrate well** — dehydration is a common cause of headaches\n2. **Rest in a quiet, dark room** if possible\n3. **Paracetamol 500mg** can help with mild-moderate headache\n\n🚨 **Seek immediate help** if you experience: sudden severe headache, headache with fever and stiff neck, visual changes, or weakness on one side of the body.\n\nWould you like me to help you book a teleconsultation?\n\n_I'm an AI assistant. Please consult a qualified doctor for proper diagnosis._",
    "cold": "Common cold is usually a viral infection. Here's what I suggest:\n\n1. **Rest and warm fluids** — ginger tea, warm water with honey and lemon\n2. **Steam inhalation** 2-3 times a day helps relieve nasal congestion\n3. **Cetirizine 10mg** once daily for runny nose (consult a doctor first)\n4. **Gargle** with warm salt water for sore throat\n\nMost colds resolve in 5-7 days. If symptoms worsen or you develop high fever, please consult a doctor.\n\n_I'm an AI assistant. Please consult a qualified doctor for proper diagnosis._",
    "default": "Thank you for reaching out. I understand your concern.\n\nBased on what you've described, I'd recommend:\n1. **Monitor your symptoms** closely for the next 24-48 hours\n2. **Stay hydrated** and get adequate rest\n3. If symptoms worsen, please use our **AI Diagnosis** tool for a detailed analysis or book a **Teleconsultation** with a doctor\n\nCould you provide more details about your symptoms? This will help me give you more specific guidance.\n\n_I'm an AI assistant. Please consult a qualified doctor for proper diagnosis._"
}

def get_simulated_response(message: str) -> str:
    text = message.lower()
    for keyword, response in SIMULATED_RESPONSES.items():
        if keyword != "default" and keyword in text:
            return response
    return SIMULATED_RESPONSES["default"]

# ── Chat endpoint ─────────────────────────────────────────────────────────────

@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Chat with the GramSwasthya AI assistant using Gemini."""
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return ChatResponse(reply=get_simulated_response(req.message))

    try:
        client = genai.Client(api_key=api_key)

        # Build conversation contents as string to avoid strict role alternation SDK crashes
        history_text = ""
        for msg in (req.history or []):
            role_name = "User" if msg.role == "user" else "Assistant"
            history_text += f"{role_name}: {msg.content}\n\n"
            
        full_prompt = f"""
Conversation History:
{history_text}

User: {req.message}
"""

        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=full_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=1024,
            )
        )

        reply = response.text.strip() if response.text else "I'm sorry, I couldn't process your request. Please try again."
        return ChatResponse(reply=reply)

    except Exception as e:
        print(f"Gemini Chat Error: {e}")
        # Fallback to simulation
        return ChatResponse(reply=get_simulated_response(req.message))

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

from utils.emotion_analysis import analyze_audio_emotion
from utils.risk_scoring import calculate_risk_score
from utils.triage_engine import determine_triage_level

load_dotenv()


def get_gemini_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

router = APIRouter()

SYSTEM_PROMPT = """You are GramSwasthya AI, a Medical Triage Assistant.
Analyze the user's input, context, and symptoms.
Your task is to provide a brief (1-2 sentences) empathetic, clear action-oriented recommendation.
If Triage Level is Emergency, advise immediately visiting a hospital or calling an ambulance.
If Urgent, advise visiting a PHC within 12-24 hours.
If Routine, advise home care, rest, and monitoring.
Respond in the specified language.
"""

@router.post("/analyze")
async def analyze_voice_input(
    audio: UploadFile = File(None),
    text: str = Form(...),
    language: str = Form("English"),
    context: str = Form("{}")
):
    """
    Analyzes voice input (audio file + transcribed text).
    1. Extracts emotion from audio.
    2. Extracts symptoms using LLM.
    3. Calculates Risk Score.
    4. Determines Triage Level.
    5. Generates AI localized response.
    """
    
    # 1. Parse context
    try:
        user_context = json.loads(context)
    except Exception:
        user_context = {}
        
    symptoms_list = user_context.get("symptoms", [])

    # 2. Extract Emotion from Audio
    emotion_data = {
        "emotion": "Unknown",
        "confidence": 0.0,
        "reason": "No audio provided",
        "features": {}
    }
    
    if audio and audio.filename:
        # Save temp audio file
        suffix = os.path.splitext(audio.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name
        
        try:
            emotion_data = analyze_audio_emotion(tmp_path)
            # Clean up
            os.remove(tmp_path)
        except Exception as e:
            print(f"Error processing audio: {e}")

    # 3. Extract New Symptoms using AI (combine with existing)
    api_key = get_gemini_api_key()
    ai_recommendation = ""
    new_symptoms = []

    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            
            # Sub-task: Extract symptoms from text
            sstr = f"""Extract symptoms from this text as a JSON list of strings representing standardized medical terms. Only return the raw JSON array (e.g. ["Fever", "Cough"]).
            Text: "{text}"
            """
            s_response = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=sstr
            )
            try:
                # Naive JSON parse
                raw_out = s_response.text.strip()
                if raw_out.startswith("```json"):
                    raw_out = raw_out[7:-3]
                new_symps = json.loads(raw_out)
                if isinstance(new_symps, list):
                    new_symptoms = new_symps
            except:
                pass
                
        except Exception as e:
            print(f"Gemini Extract Error: {e}")

    # Combine symptoms
    combined_symptoms = list(set(symptoms_list + new_symptoms))

    # 4. Calculate Risk Score
    risk_input = {
        "age": user_context.get("age", 30),
        "symptoms": combined_symptoms,
        "emotion": emotion_data.get("emotion"),
        "duration_days": user_context.get("duration_days", 1)
    }
    risk_result = calculate_risk_score(risk_input)

    # 5. Determine Triage Level
    triage_result = determine_triage_level(risk_result, combined_symptoms)

    # 6. Generate Contextual AI Response
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""
            Patient Input Text: {text}
            Detected Symptoms: {combined_symptoms}
            Voice Emotion: {emotion_data.get('emotion')}
            Calculated Risk Level: {risk_result.get('risk_level')} (Score: {risk_result.get('risk_score')})
            Designated Triage Level: {triage_result.get('level')}

            Provide a short response to the patient assuring them and recommending what to do.
            MUST respond in the language: {language}
            """
            response = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.3, # lower for medical guidance
                    max_output_tokens=256
                )
            )
            ai_recommendation = response.text.strip()
        except:
            ai_recommendation = triage_result.get("recommendation")
    else:
        ai_recommendation = triage_result.get("recommendation")

    return JSONResponse({
        "text": text,
        "language": language,
        "detected_symptoms": combined_symptoms,
        "emotion_analysis": emotion_data,
        "risk_assessment": risk_result,
        "triage": triage_result,
        "recommendation": ai_recommendation
    })

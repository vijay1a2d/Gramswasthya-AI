def determine_triage_level(risk_result: dict, symptoms: list) -> dict:
    """
    Determines medical triage level (Emergency, Urgent, Routine)
    based on the computed risk score and immediate critical symptoms.
    """
    score = risk_result.get("risk_score", 0)
    symptoms_lower = [s.lower() for s in symptoms]
    
    # Absolute Emergency overrides
    emergency_keywords = ["chest pain", "breathing difficulty", "shortness of breath", "unconscious", "heart attack", "stroke", "severe bleeding", "seizure", "choking"]
    
    is_emergency = False
    for sym in symptoms_lower:
        if any(ek in sym for ek in emergency_keywords):
            is_emergency = True
            break

    if is_emergency or score >= 75:
        return {
            "level": "Emergency",
            "action": "immediate hospital visit",
            "recommendation": "CRITICAL: Call an ambulance or visit the nearest emergency room immediately.",
            "color": "red"
        }
    elif score >= 40:
        return {
            "level": "Urgent",
            "action": "doctor consultation soon",
            "recommendation": "Visit the nearest Primary Health Centre (PHC) or book a teleconsultation within 12-24 hours.",
            "color": "orange"
        }
    else:
        return {
            "level": "Routine",
            "action": "home care guidance",
            "recommendation": "Monitor your symptoms. Rest, stay hydrated, and take over-the-counter medication if appropriate. Consult a doctor if symptoms worsen.",
            "color": "green"
        }

def calculate_risk_score(patient_data: dict) -> dict:
    """
    Calculates a continuous risk score (0-100) based on patient data.
    Input format:
    {
        "age": int (optional),
        "symptoms": list of strings,
        "emotion": str (from emotion_analysis),
        "chronic_diseases": list of strings (optional),
        "duration_days": int (optional)
    }
    """
    score = 0
    factors = []

    age = patient_data.get("age", 30)
    symptoms = [s.lower() for s in patient_data.get("symptoms", [])]
    emotion = patient_data.get("emotion", "Normal")
    chronic = patient_data.get("chronic_diseases", [])
    duration = patient_data.get("duration_days", 1)

    # 1. Base score from age
    if age > 60:
        score += 15
        factors.append("Elderly patient (>60 years)")
    elif age < 5:
        score += 15
        factors.append("Infant/Toddler (<5 years)")

    # 2. Symptom scoring
    critical_symptoms = ["chest pain", "breathing difficulty", "shortness of breath", "unconscious", "severe bleeding", "paralysis", "seizure"]
    major_symptoms = ["high fever", "severe headache", "continuous vomiting", "weakness", "fainting"]
    minor_symptoms = ["fever", "cough", "cold", "runny nose", "body ache", "headache", "nausea"]

    for sym in symptoms:
        if any(cs in sym for cs in critical_symptoms):
            score += 40
            factors.append(f"Critical symptom: {sym}")
        elif any(ms in sym for ms in major_symptoms):
            score += 20
            factors.append(f"Major symptom: {sym}")
        elif any(mis in sym for mis in minor_symptoms):
            score += 5
            factors.append(f"Minor symptom: {sym}")
        else:
            score += 2 # Unknown symptom

    # 3. Emotion factor
    if emotion in ["Anxious/Distressed", "Breathless/Stressed"]:
        score += 15
        factors.append("Distressed/Stressed vocal emotion indicates higher risk")
    elif emotion == "Weak/Fatigued":
        score += 10
        factors.append("Weak baseline vocal energy")

    # 4. Chronic diseases
    if len(chronic) > 0:
        score += 10 + (5 * len(chronic))
        factors.append(f"Pre-existing conditions ({len(chronic)}) increase risk")

    # 5. Duration mult
    if duration > 7:
        score += 15
        factors.append("Prolonged symptoms (>7 days)")
    elif duration > 3:
        score += 5

    # Cap score
    score = min(score, 100)

    # Level designation
    if score >= 70:
        level = "High"
    elif score >= 40:
        level = "Moderate"
    else:
        level = "Low"

    return {
        "risk_score": score,
        "risk_level": level,
        "driving_factors": factors
    }

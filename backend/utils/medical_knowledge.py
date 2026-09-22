"""
GramSwasthya AI — Medical Knowledge Base
Comprehensive medical knowledge for CDSS, symptom triage, and treatment recommendations.
Based on WHO/ICMR guidelines adapted for rural Indian healthcare.
"""

# ── Symptom → Disease Mapping (ICD-11 aligned) ──────────────────────────────

SYMPTOM_DISEASE_MAP = {
    # Respiratory
    "tuberculosis": {
        "symptoms": ["fever", "cough", "weight_loss", "night_sweats", "hemoptysis", "fatigue", "chest_pain"],
        "min_match": 3,
        "probability": 0.85,
        "icd11": "1B10",
        "triage": "urgent",
        "investigations": ["Chest X-ray", "Sputum AFB", "GeneXpert MTB/RIF", "Mantoux Test"],
    },
    "pneumonia": {
        "symptoms": ["fever", "cough", "chest_pain", "breathlessness", "rapid_breathing", "sputum"],
        "min_match": 3,
        "probability": 0.80,
        "icd11": "CA40",
        "triage": "urgent",
        "investigations": ["Chest X-ray", "CBC", "Blood culture", "SpO2"],
    },
    "upper_respiratory_infection": {
        "symptoms": ["fever", "cough", "sore_throat", "runny_nose", "sneezing", "body_ache"],
        "min_match": 2,
        "probability": 0.75,
        "icd11": "CA00-CA08",
        "triage": "routine",
        "investigations": ["Clinical examination"],
    },
    "asthma": {
        "symptoms": ["wheezing", "breathlessness", "cough", "chest_tightness", "nocturnal_cough"],
        "min_match": 2,
        "probability": 0.78,
        "icd11": "CA23",
        "triage": "urgent",
        "investigations": ["Peak flow meter", "Spirometry", "SpO2"],
    },

    # Vector-borne
    "malaria": {
        "symptoms": ["fever", "chills", "sweating", "headache", "body_ache", "nausea", "vomiting"],
        "min_match": 3,
        "probability": 0.82,
        "icd11": "1F40",
        "triage": "urgent",
        "investigations": ["Rapid Malaria Test (RDT)", "Peripheral blood smear", "CBC"],
    },
    "dengue": {
        "symptoms": ["high_fever", "severe_headache", "eye_pain", "joint_pain", "rash", "bleeding_gums", "nausea"],
        "min_match": 3,
        "probability": 0.78,
        "icd11": "1D20",
        "triage": "urgent",
        "investigations": ["NS1 Antigen", "Dengue IgM/IgG", "CBC", "Platelet count"],
    },
    "chikungunya": {
        "symptoms": ["fever", "joint_pain", "joint_swelling", "rash", "headache", "muscle_pain"],
        "min_match": 3,
        "probability": 0.72,
        "icd11": "1D21",
        "triage": "urgent",
        "investigations": ["Chikungunya IgM", "CBC"],
    },

    # GI
    "cholera": {
        "symptoms": ["watery_diarrhea", "vomiting", "dehydration", "rapid_heart_rate", "thirst"],
        "min_match": 2,
        "probability": 0.80,
        "icd11": "1A00",
        "triage": "emergency",
        "investigations": ["Stool culture", "Electrolytes", "Renal function"],
    },
    "typhoid": {
        "symptoms": ["fever", "headache", "abdominal_pain", "constipation", "diarrhea", "rash", "weakness"],
        "min_match": 3,
        "probability": 0.76,
        "icd11": "1A07",
        "triage": "urgent",
        "investigations": ["Widal test", "Blood culture", "Typhidot", "CBC"],
    },
    "gastroenteritis": {
        "symptoms": ["diarrhea", "vomiting", "abdominal_pain", "nausea", "fever", "dehydration"],
        "min_match": 2,
        "probability": 0.72,
        "icd11": "DA63",
        "triage": "routine",
        "investigations": ["Stool examination", "Electrolytes"],
    },

    # Metabolic / Chronic
    "diabetes_uncontrolled": {
        "symptoms": ["frequent_urination", "excessive_thirst", "weight_loss", "blurred_vision", "fatigue", "slow_healing"],
        "min_match": 3,
        "probability": 0.82,
        "icd11": "5A10-5A14",
        "triage": "urgent",
        "investigations": ["Fasting blood glucose", "HbA1c", "Random blood sugar", "Urine sugar"],
    },
    "hypertension": {
        "symptoms": ["headache", "dizziness", "blurred_vision", "chest_pain", "breathlessness", "nosebleed"],
        "min_match": 2,
        "probability": 0.70,
        "icd11": "BA00",
        "triage": "urgent",
        "investigations": ["Blood pressure measurement", "ECG", "Renal function", "Lipid profile"],
    },

    # Maternal
    "pre_eclampsia": {
        "symptoms": ["high_blood_pressure", "swelling", "headache", "blurred_vision", "upper_abdominal_pain", "nausea"],
        "min_match": 3,
        "probability": 0.85,
        "icd11": "JA20",
        "triage": "emergency",
        "investigations": ["BP monitoring", "Urine protein", "CBC", "Liver function", "Renal function"],
    },
    "anemia_pregnancy": {
        "symptoms": ["fatigue", "weakness", "pale_skin", "breathlessness", "dizziness", "fast_heartbeat"],
        "min_match": 3,
        "probability": 0.78,
        "icd11": "3A00",
        "triage": "urgent",
        "investigations": ["CBC", "Hemoglobin level", "Peripheral smear", "Iron studies"],
    },

    # Pediatric
    "measles": {
        "symptoms": ["fever", "rash", "cough", "runny_nose", "red_eyes", "koplik_spots"],
        "min_match": 3,
        "probability": 0.88,
        "icd11": "1F03",
        "triage": "urgent",
        "investigations": ["Clinical diagnosis", "Measles IgM", "CBC"],
    },
    "malnutrition": {
        "symptoms": ["weight_loss", "stunted_growth", "weakness", "swelling", "skin_changes", "hair_changes"],
        "min_match": 3,
        "probability": 0.82,
        "icd11": "5B50-5B57",
        "triage": "urgent",
        "investigations": ["Anthropometric measurements", "CBC", "Serum albumin", "Micronutrients"],
    },
}


# ── Treatment Guidelines (WHO + ICMR) ───────────────────────────────────────

TREATMENT_GUIDELINES = {
    "tuberculosis": {
        "first_line": [
            {"drug": "Isoniazid (H)", "dose": "5 mg/kg", "route": "Oral", "duration": "6 months"},
            {"drug": "Rifampicin (R)", "dose": "10 mg/kg", "route": "Oral", "duration": "6 months"},
            {"drug": "Pyrazinamide (Z)", "dose": "25 mg/kg", "route": "Oral", "duration": "2 months"},
            {"drug": "Ethambutol (E)", "dose": "15 mg/kg", "route": "Oral", "duration": "2 months"},
        ],
        "regimen": "2HRZE + 4HR (DOTS protocol)",
        "monitoring": "Sputum smear at 2, 5, 6 months",
        "follow_up": "Monthly for 6 months",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["Hepatotoxicity monitoring", "Visual acuity check (Ethambutol)", "Pyridoxine supplementation"],
        "source": "RNTCP/NTEP Guidelines 2024",
        "recommended_specialist": "Pulmonologist / Infectious Disease Specialist",
    },
    "pneumonia": {
        "first_line": [
            {"drug": "Amoxicillin", "dose": "500 mg TDS", "route": "Oral", "duration": "7 days"},
            {"drug": "Paracetamol", "dose": "500 mg", "route": "Oral", "duration": "As needed for fever"},
        ],
        "alternative": [
            {"drug": "Azithromycin", "dose": "500 mg OD", "route": "Oral", "duration": "5 days"},
        ],
        "monitoring": "Review in 48 hours",
        "follow_up": "48 hours for improvement check",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["Adequate hydration", "Monitor SpO2", "Hospitalize if SpO2 < 92%"],
        "source": "WHO Community Pneumonia Guidelines",
        "recommended_specialist": "Pulmonologist / General Physician",
    },
    "malaria": {
        "first_line": [
            {"drug": "Artesunate-Lumefantrine (ACT)", "dose": "Weight-based", "route": "Oral", "duration": "3 days"},
            {"drug": "Primaquine", "dose": "0.75 mg/kg", "route": "Oral", "duration": "Single dose (P.falciparum)"},
        ],
        "alternative": [
            {"drug": "Chloroquine", "dose": "25 mg base/kg", "route": "Oral", "duration": "3 days (P.vivax)"},
        ],
        "monitoring": "Parasite count at day 3",
        "follow_up": "Days 3, 7, 14",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["G6PD testing before Primaquine", "Monitor for severe malaria signs"],
        "source": "National Drug Policy on Malaria 2023",
        "recommended_specialist": "General Physician / Internal Medicine",
    },
    "dengue": {
        "first_line": [
            {"drug": "Paracetamol", "dose": "500 mg QID", "route": "Oral", "duration": "As needed"},
            {"drug": "ORS", "dose": "1 liter/day minimum", "route": "Oral", "duration": "Until recovery"},
        ],
        "monitoring": "Daily platelet count, hematocrit",
        "follow_up": "Daily for 5 days",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["NO aspirin or ibuprofen", "Watch for warning signs", "Hospitalize if platelets < 50,000"],
        "source": "WHO Dengue Guidelines 2024",
        "recommended_specialist": "General Physician / Infectious Disease Specialist",
    },
    "cholera": {
        "first_line": [
            {"drug": "ORS", "dose": "200-400 ml after each stool", "route": "Oral", "duration": "Until recovery"},
            {"drug": "Zinc", "dose": "20 mg OD (children)", "route": "Oral", "duration": "14 days"},
            {"drug": "Doxycycline", "dose": "300 mg single dose", "route": "Oral", "duration": "Single dose"},
        ],
        "alternative": [
            {"drug": "Azithromycin", "dose": "1 g single dose", "route": "Oral", "duration": "Single dose"},
        ],
        "monitoring": "Hydration status, renal function",
        "follow_up": "Daily until stable",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["IV fluids if severely dehydrated", "Ringer's lactate for severe cases"],
        "source": "WHO Cholera Treatment Guidelines",
        "recommended_specialist": "Gastroenterologist / General Physician",
    },
    "typhoid": {
        "first_line": [
            {"drug": "Azithromycin", "dose": "500 mg OD", "route": "Oral", "duration": "7 days"},
            {"drug": "Paracetamol", "dose": "500 mg", "route": "Oral", "duration": "As needed for fever"},
        ],
        "alternative": [
            {"drug": "Ceftriaxone", "dose": "2g IV OD", "route": "IV", "duration": "10-14 days"},
        ],
        "monitoring": "Temperature chart, blood culture",
        "follow_up": "Weekly until afebrile",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["Watch for complications (perforation, bleeding)", "Adequate hydration"],
        "source": "ICMR Treatment Guidelines",
        "recommended_specialist": "General Physician / Internal Medicine",
    },
    "diabetes_uncontrolled": {
        "first_line": [
            {"drug": "Metformin", "dose": "500 mg BD, titrate to 1000 mg BD", "route": "Oral", "duration": "Long-term"},
        ],
        "alternative": [
            {"drug": "Glimepiride", "dose": "1-2 mg OD", "route": "Oral", "duration": "Long-term"},
        ],
        "monitoring": "FBS monthly, HbA1c every 3 months",
        "follow_up": "Monthly initially, then 3-monthly",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["Renal function monitoring", "Hypoglycemia education", "Diet and exercise counseling"],
        "source": "ICMR Guidelines for Diabetes Management",
        "recommended_specialist": "Endocrinologist / Diabetologist",
    },
    "hypertension": {
        "first_line": [
            {"drug": "Amlodipine", "dose": "5 mg OD", "route": "Oral", "duration": "Long-term"},
        ],
        "alternative": [
            {"drug": "Enalapril", "dose": "5 mg OD", "route": "Oral", "duration": "Long-term"},
            {"drug": "Losartan", "dose": "50 mg OD", "route": "Oral", "duration": "Long-term"},
        ],
        "monitoring": "BP check weekly initially, then monthly",
        "follow_up": "Monthly",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["Renal function check", "Electrolytes", "Lifestyle modification"],
        "source": "ICMR/WHO Hypertension Guidelines",
        "recommended_specialist": "Cardiologist / General Physician",
    },
    "pre_eclampsia": {
        "first_line": [
            {"drug": "Labetalol", "dose": "100 mg BD", "route": "Oral", "duration": "Until delivery"},
            {"drug": "Magnesium Sulphate", "dose": "Loading: 4g IV + 5g IM each buttock", "route": "IV/IM", "duration": "24 hours"},
        ],
        "monitoring": "BP every 4 hours, urine protein, fetal monitoring",
        "follow_up": "Daily until delivery",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["IMMEDIATE referral to higher center", "Monitor for eclampsia", "Prepare for emergency delivery"],
        "source": "WHO Pre-eclampsia/Eclampsia Guidelines",
        "recommended_specialist": "Obstetrician / Gynecologist",
    },
    "upper_respiratory_infection": {
        "first_line": [
            {"drug": "Paracetamol", "dose": "500 mg TDS", "route": "Oral", "duration": "3-5 days"},
            {"drug": "Cetirizine", "dose": "10 mg OD", "route": "Oral", "duration": "5 days"},
        ],
        "monitoring": "Self-monitoring",
        "follow_up": "If symptoms persist beyond 7 days",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["Antibiotics NOT recommended", "Adequate rest and fluids", "Steam inhalation"],
        "source": "WHO Guidelines for Common Cold",
        "recommended_specialist": "General Physician",
    },
    "gastroenteritis": {
        "first_line": [
            {"drug": "ORS", "dose": "200 ml after each stool", "route": "Oral", "duration": "Until recovery"},
            {"drug": "Zinc", "dose": "20 mg OD (children)", "route": "Oral", "duration": "14 days"},
        ],
        "monitoring": "Hydration status",
        "follow_up": "24-48 hours if not improving",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["Continue breastfeeding in infants", "BRAT diet", "IV fluids if severely dehydrated"],
        "source": "WHO IMCI Guidelines",
        "recommended_specialist": "Gastroenterologist / General Physician",
    },
    "measles": {
        "first_line": [
            {"drug": "Vitamin A", "dose": "200,000 IU (>12 months), 100,000 IU (6-11 months)", "route": "Oral", "duration": "2 doses (day 1 and day 2)"},
            {"drug": "Paracetamol", "dose": "10-15 mg/kg", "route": "Oral", "duration": "As needed"},
        ],
        "monitoring": "Watch for complications (pneumonia, encephalitis)",
        "follow_up": "Daily until rash resolves",
        "generic_available": True,
        "govt_supply": True,
        "precautions": ["Isolate patient", "Contact tracing", "Report to IDSP", "Verify vaccination status"],
        "source": "WHO Measles Management Guidelines",
        "recommended_specialist": "Pediatrician / Infectious Disease Specialist",
    },
}


# ── Drug Interaction Database ────────────────────────────────────────────────

DRUG_INTERACTIONS = [
    {
        "drug_a": "Metformin",
        "drug_b": "Alcohol",
        "severity": "major",
        "effect": "Increased risk of lactic acidosis",
        "recommendation": "Avoid alcohol consumption",
    },
    {
        "drug_a": "Rifampicin",
        "drug_b": "Oral Contraceptives",
        "severity": "major",
        "effect": "Reduced contraceptive efficacy due to enzyme induction",
        "recommendation": "Use alternative contraception method",
    },
    {
        "drug_a": "Isoniazid",
        "drug_b": "Paracetamol",
        "severity": "moderate",
        "effect": "Increased hepatotoxicity risk",
        "recommendation": "Monitor liver function; use lowest effective dose of paracetamol",
    },
    {
        "drug_a": "Amlodipine",
        "drug_b": "Simvastatin",
        "severity": "moderate",
        "effect": "Increased Simvastatin levels, risk of rhabdomyolysis",
        "recommendation": "Limit Simvastatin to 20mg/day",
    },
    {
        "drug_a": "Enalapril",
        "drug_b": "Potassium supplements",
        "severity": "major",
        "effect": "Hyperkalemia risk",
        "recommendation": "Monitor serum potassium regularly",
    },
    {
        "drug_a": "Metformin",
        "drug_b": "Glimepiride",
        "severity": "moderate",
        "effect": "Additive hypoglycemia risk",
        "recommendation": "Monitor blood glucose closely; educate patient on hypoglycemia signs",
    },
    {
        "drug_a": "Aspirin",
        "drug_b": "Ibuprofen",
        "severity": "moderate",
        "effect": "Reduced cardioprotective effect of aspirin; GI bleeding risk",
        "recommendation": "Take aspirin 30 min before ibuprofen if both needed",
    },
    {
        "drug_a": "Warfarin",
        "drug_b": "Azithromycin",
        "severity": "major",
        "effect": "Increased anticoagulant effect, bleeding risk",
        "recommendation": "Monitor INR closely",
    },
    {
        "drug_a": "Ciprofloxacin",
        "drug_b": "Antacids",
        "severity": "moderate",
        "effect": "Reduced ciprofloxacin absorption",
        "recommendation": "Take ciprofloxacin 2 hours before or 6 hours after antacids",
    },
    {
        "drug_a": "Doxycycline",
        "drug_b": "Iron supplements",
        "severity": "moderate",
        "effect": "Reduced doxycycline absorption",
        "recommendation": "Separate doses by at least 2 hours",
    },
]


# ── Generic Drug Alternatives ────────────────────────────────────────────────

GENERIC_ALTERNATIVES = {
    "Augmentin": "Amoxicillin + Clavulanic Acid",
    "Crocin": "Paracetamol",
    "Combiflam": "Ibuprofen + Paracetamol",
    "Glycomet": "Metformin",
    "Amaryl": "Glimepiride",
    "Amlokind": "Amlodipine",
    "Enavas": "Enalapril",
    "Losar": "Losartan",
    "Azee": "Azithromycin",
    "Monocef": "Ceftriaxone",
    "R-Cinex": "Rifampicin + Isoniazid",
    "Lariago": "Chloroquine",
}


# ── PHC / Rural Facility Database ────────────────────────────────────────────

FACILITIES = [
    # Andhra Pradesh
    {"name": "King George Hospital (KGH)", "type": "DH", "lat": 17.7088, "lng": 83.3006, "district": "Visakhapatnam", "state": "Andhra Pradesh", "beds": 1200, "emergency": True, "phone": "0891-2564891"},
    {"name": "GGH Vijayawada", "type": "DH", "lat": 16.5062, "lng": 80.6480, "district": "NTR", "state": "Andhra Pradesh", "beds": 800, "emergency": True, "phone": "0866-2415152"},
    {"name": "SVIMS Tirupati", "type": "DH", "lat": 13.6373, "lng": 79.4042, "district": "Tirupati", "state": "Andhra Pradesh", "beds": 1000, "emergency": True, "phone": "0877-2287777"},
    {"name": "RIMS Kadapa", "type": "DH", "lat": 14.4673, "lng": 78.8242, "district": "YSR Kadapa", "state": "Andhra Pradesh", "beds": 750, "emergency": True, "phone": "08562-220200"},
    {"name": "District Hospital Kurnool", "type": "DH", "lat": 15.8281, "lng": 78.0373, "district": "Kurnool", "state": "Andhra Pradesh", "beds": 400, "emergency": True, "phone": "08518-222222"},
    {"name": "PHC Adoni", "type": "PHC", "lat": 15.6322, "lng": 77.2773, "district": "Kurnool", "state": "Andhra Pradesh", "beds": 30, "emergency": True, "phone": "08512-252001"},
    {"name": "CHC Nandyal", "type": "CHC", "lat": 15.4781, "lng": 78.4836, "district": "Kurnool", "state": "Andhra Pradesh", "beds": 50, "emergency": True, "phone": "08514-222001"},
    
    # Telangana
    {"name": "Gandhi Hospital", "type": "DH", "lat": 17.4241, "lng": 78.5031, "district": "Hyderabad", "state": "Telangana", "beds": 1200, "emergency": True, "phone": "040-27505566"},
    {"name": "Osmania General Hospital", "type": "DH", "lat": 17.3770, "lng": 78.4735, "district": "Hyderabad", "state": "Telangana", "beds": 1500, "emergency": True, "phone": "040-24600121"},
    {"name": "NIMS Hyderabad", "type": "DH", "lat": 17.4226, "lng": 78.4552, "district": "Hyderabad", "state": "Telangana", "beds": 1400, "emergency": True, "phone": "040-23489000"},
    {"name": "TIMS Gachibowli", "type": "DH", "lat": 17.4410, "lng": 78.3541, "district": "Rangareddy", "state": "Telangana", "beds": 800, "emergency": True, "phone": "040-23000632"},
    {"name": "District Hospital Khammam", "type": "DH", "lat": 17.2473, "lng": 80.1514, "district": "Khammam", "state": "Telangana", "beds": 500, "emergency": True, "phone": "08742-224536"},

    # Other States
    {"name": "PHC Koraput", "type": "PHC", "lat": 18.8135, "lng": 82.7128, "district": "Koraput", "state": "Odisha", "beds": 30, "emergency": True, "phone": "06852-250001"},
    {"name": "PHC Yavatmal", "type": "PHC", "lat": 20.3899, "lng": 78.1307, "district": "Yavatmal", "state": "Maharashtra", "beds": 30, "emergency": True, "phone": "07232-242001"},
    {"name": "PHC Barmer", "type": "PHC", "lat": 25.7495, "lng": 71.3893, "district": "Barmer", "state": "Rajasthan", "beds": 30, "emergency": True, "phone": "02982-220001"},
]


# ── Helper Functions ─────────────────────────────────────────────────────────

def match_symptoms_to_diseases(symptoms: list, age: int = 30, gender: str = "male"):
    """Match input symptoms against the knowledge base and return top conditions."""
    symptom_set = set(s.lower().strip().replace(" ", "_") for s in symptoms)
    matches = []

    for disease, info in SYMPTOM_DISEASE_MAP.items():
        disease_symptoms = set(info["symptoms"])
        overlap = symptom_set.intersection(disease_symptoms)
        if len(overlap) >= info["min_match"]:
            # Adjust probability based on match quality
            match_ratio = len(overlap) / len(disease_symptoms)
            adjusted_prob = info["probability"] * (0.7 + 0.3 * match_ratio)

            matches.append({
                "disease": disease.replace("_", " ").title(),
                "probability": round(min(adjusted_prob, 0.99), 2),
                "matched_symptoms": list(overlap),
                "triage_level": info["triage"],
                "icd11_code": info["icd11"],
                "investigations": info["investigations"],
            })

    matches.sort(key=lambda x: x["probability"], reverse=True)
    return matches[:5]  # top 5


def get_treatment(disease_key: str):
    """Get treatment guidelines for a disease."""
    return TREATMENT_GUIDELINES.get(disease_key)


def check_drug_interactions(drugs: list):
    """Check for interactions between a list of drugs."""
    interactions_found = []
    drug_set = set(d.lower().strip() for d in drugs)

    for interaction in DRUG_INTERACTIONS:
        a = interaction["drug_a"].lower()
        b = interaction["drug_b"].lower()
        if a in drug_set and b in drug_set:
            interactions_found.append(interaction)
        # Also check partial matches
        elif any(a in d for d in drug_set) and any(b in d for d in drug_set):
            interactions_found.append(interaction)

    return interactions_found


def find_nearest_facilities(lat: float, lng: float, max_results: int = 5):
    """Find nearest healthcare facilities by GPS coordinates using haversine approximation."""
    import math

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371  # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        return R * 2 * math.asin(math.sqrt(a))

    results = []
    for f in FACILITIES:
        dist = haversine(lat, lng, f["lat"], f["lng"])
        results.append({**f, "distance_km": round(dist, 1)})

    results.sort(key=lambda x: x["distance_km"])
    return results[:max_results]

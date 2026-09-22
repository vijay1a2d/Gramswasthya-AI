from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.db_models import (
    Base, User, UserRole, Patient, VitalRecord, DiagnosisResult,
    Prescription, HospitalBed, VillageHealthScore, TriageLevel
)
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
import random

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gramswasthya.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Staff accounts ───────────────────────────────────────────────────────────
DEMO_USERS = [
    {"name": "Admin User",          "phone": "admin",   "password": "admin",   "role": UserRole.admin,         "village": "HQ",           "district": "Central",           "state": "Delhi"},
    {"name": "Dr. Priya Sharma",     "phone": "doctor",  "password": "doctor",  "role": UserRole.doctor,        "village": "Kurnool",       "district": "Kurnool",           "state": "Andhra Pradesh"},
    {"name": "Dr. Arun Reddy",       "phone": "doctor2", "password": "doctor",  "role": UserRole.doctor,        "village": "Visakhapatnam", "district": "Visakhapatnam",     "state": "Andhra Pradesh"},
    {"name": "Dr. Meena Kumari",     "phone": "doctor3", "password": "doctor",  "role": UserRole.doctor,        "village": "Hyderabad",     "district": "Hyderabad",         "state": "Telangana"},
    {"name": "Dr. Suresh Patil",     "phone": "doctor4", "password": "doctor",  "role": UserRole.doctor,        "village": "Yavatmal",      "district": "Yavatmal",          "state": "Maharashtra"},
    {"name": "Dr. Kavita Mohanty",   "phone": "doctor5", "password": "doctor",  "role": UserRole.doctor,        "village": "Koraput",       "district": "Koraput",           "state": "Odisha"},
    {"name": "Dr. Rajendra Singh",   "phone": "doctor6", "password": "doctor",  "role": UserRole.doctor,        "village": "Barmer",        "district": "Barmer",            "state": "Rajasthan"},
    {"name": "ASHA Sunita Devi",     "phone": "worker",  "password": "worker",  "role": UserRole.health_worker, "village": "Koraput",       "district": "Koraput",           "state": "Odisha"},
]

# ── Demo patients (as per master prompt) ─────────────────────────────────────
DEMO_PATIENTS = [
    {
        "user": {"name": "Lakshmi Devi",  "phone": "9100000001", "password": "patient123", "village": "Adoni",    "district": "Kurnool", "state": "Andhra Pradesh"},
        "patient": {"age": 52, "gender": "Female", "blood_group": "B+",
                    "chronic_conditions": ["Type 2 Diabetes", "Hypertension"],
                    "allergies": ["Sulfa drugs"], "risk_score": 65,
                    "vaccination_history": [{"vaccine": "COVID-19", "date": "2024-03-15", "dose": "Booster"}]},
    },
    {
        "user": {"name": "Rajesh Kumar",  "phone": "9100000002", "password": "patient123", "village": "Nandyal",  "district": "Kurnool", "state": "Andhra Pradesh"},
        "patient": {"age": 34, "gender": "Male", "blood_group": "O+",
                    "chronic_conditions": [],
                    "allergies": [], "risk_score": 72,
                    "vaccination_history": [{"vaccine": "BCG", "date": "1992-05-20", "dose": "1"}]},
    },
    {
        "user": {"name": "Anjali Kumari", "phone": "9100000003", "password": "patient123", "village": "Yemmiganur", "district": "Kurnool", "state": "Andhra Pradesh"},
        "patient": {"age": 28, "gender": "Female", "blood_group": "A+",
                    "chronic_conditions": ["Anemia"],
                    "allergies": ["Penicillin"], "risk_score": 45,
                    "vaccination_history": [{"vaccine": "Tetanus", "date": "2025-08-10", "dose": "Booster"}]},
    },
    {
        "user": {"name": "Mohan Singh",   "phone": "9100000004", "password": "patient123", "village": "Koraput",  "district": "Koraput", "state": "Odisha"},
        "patient": {"age": 67, "gender": "Male", "blood_group": "AB+",
                    "chronic_conditions": ["Heart Disease", "COPD", "Hypertension"],
                    "allergies": ["Aspirin"], "risk_score": 82,
                    "vaccination_history": [{"vaccine": "Influenza", "date": "2025-10-01", "dose": "Annual"}]},
    },
    {
        "user": {"name": "Priya Patel",   "phone": "9100000005", "password": "patient123", "village": "Yavatmal", "district": "Yavatmal", "state": "Maharashtra"},
        "patient": {"age": 8, "gender": "Female", "blood_group": "O-",
                    "chronic_conditions": ["Malnutrition"],
                    "allergies": [], "risk_score": 58,
                    "vaccination_history": [{"vaccine": "MMR", "date": "2019-06-15", "dose": "1"}, {"vaccine": "OPV", "date": "2018-12-01", "dose": "3"}]},
    },
    {
        "user": {"name": "Ravi Verma",    "phone": "9100000006", "password": "patient123", "village": "Barmer",   "district": "Barmer",  "state": "Rajasthan"},
        "patient": {"age": 45, "gender": "Male", "blood_group": "B-",
                    "chronic_conditions": ["Chronic Kidney Disease"],
                    "allergies": ["NSAIDs"], "risk_score": 70,
                    "vaccination_history": [{"vaccine": "Hepatitis B", "date": "2023-01-20", "dose": "3"}]},
    },
]


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed_demo_users(db)
        _seed_demo_patients(db)
        _seed_vitals(db)
        _seed_diagnoses(db)
        _seed_prescriptions(db)
        _seed_hospital_beds(db)
        _seed_village_health_scores(db)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def _seed_demo_users(db):
    for u in DEMO_USERS:
        if not db.query(User).filter(User.phone == u["phone"]).first():
            user = User(
                name=u["name"],
                phone=u["phone"],
                password_hash=pwd_context.hash(u["password"]),
                role=u["role"],
                village=u["village"],
                district=u["district"],
                state=u["state"],
            )
            db.add(user)
    db.flush()


def _seed_demo_patients(db):
    for entry in DEMO_PATIENTS:
        u_data = entry["user"]
        p_data = entry["patient"]
        if not db.query(User).filter(User.phone == u_data["phone"]).first():
            user = User(
                name=u_data["name"],
                phone=u_data["phone"],
                password_hash=pwd_context.hash(u_data["password"]),
                role=UserRole.patient,
                village=u_data["village"],
                district=u_data["district"],
                state=u_data["state"],
            )
            db.add(user)
            db.flush()

            patient = Patient(
                user_id=user.id,
                age=p_data["age"],
                gender=p_data["gender"],
                blood_group=p_data["blood_group"],
                chronic_conditions=p_data["chronic_conditions"],
                allergies=p_data["allergies"],
                risk_score=p_data["risk_score"],
                vaccination_history=p_data["vaccination_history"],
            )
            db.add(patient)
    db.flush()


def _seed_vitals(db):
    """Generate realistic vitals history for each patient."""
    patients = db.query(Patient).all()
    if db.query(VitalRecord).count() > 0:
        return

    now = datetime.utcnow()
    for patient in patients:
        for i in range(5):  # 5 vitals records each
            recorded = now - timedelta(days=i * 3, hours=random.randint(0, 12))
            vital = VitalRecord(
                patient_id=patient.id,
                heart_rate=round(random.uniform(62, 105), 1),
                oxygen_level=round(random.uniform(91, 99), 1),
                blood_pressure_sys=round(random.uniform(110, 160), 0),
                blood_pressure_dia=round(random.uniform(65, 100), 0),
                temperature=round(random.uniform(36.2, 38.8), 1),
                glucose_level=round(random.uniform(80, 220), 0),
                recorded_at=recorded,
                source=random.choice(["manual", "wearable", "iot"]),
            )
            db.add(vital)
    db.flush()


def _seed_diagnoses(db):
    """Seed sample AI diagnosis results."""
    patients = db.query(Patient).all()
    if db.query(DiagnosisResult).count() > 0:
        return

    now = datetime.utcnow()
    sample_diagnoses = [
        {"type": "symptom_triage", "input": "symptoms", "result": {"disease": "Upper Respiratory Infection", "probability": 0.75}, "triage": TriageLevel.routine, "action": "Rest, fluids, paracetamol"},
        {"type": "tb_xray", "input": "image", "result": {"positive": False, "probability": 0.12, "triage_level": "routine"}, "triage": TriageLevel.routine, "action": "No TB detected. Routine follow-up."},
        {"type": "malaria_rdt", "input": "image", "result": {"positive": True, "probability": 0.89, "species": "P.vivax"}, "triage": TriageLevel.urgent, "action": "Start ACT treatment immediately"},
        {"type": "retinopathy", "input": "image", "result": {"grade": 2, "grade_label": "Moderate NPDR", "vision_threatening": False}, "triage": TriageLevel.urgent, "action": "Ophthalmology referral within 1 month"},
    ]

    for idx, patient in enumerate(patients):
        diag = sample_diagnoses[idx % len(sample_diagnoses)]
        result = DiagnosisResult(
            patient_id=patient.id,
            diagnosis_type=diag["type"],
            input_type=diag["input"],
            result=diag["result"],
            triage_level=diag["triage"],
            recommended_action=diag["action"],
            explainability={"method": "rule_based_simulation", "confidence": 0.85},
            doctor_verified=random.choice([True, False]),
            created_at=now - timedelta(days=random.randint(1, 30)),
        )
        db.add(result)
    db.flush()


def _seed_prescriptions(db):
    """Seed sample prescriptions."""
    if db.query(Prescription).count() > 0:
        return

    patients = db.query(Patient).all()
    doctor = db.query(User).filter(User.phone == "doctor").first()
    if not doctor or not patients:
        return

    now = datetime.utcnow()
    sample_meds = [
        {"diagnosis": "Hypertension", "medications": [{"drug": "Amlodipine", "dose": "5 mg OD", "route": "Oral", "duration": "Long-term"}], "instructions": "Take in the morning. Monitor BP weekly."},
        {"diagnosis": "Type 2 Diabetes", "medications": [{"drug": "Metformin", "dose": "500 mg BD", "route": "Oral", "duration": "Long-term"}, {"drug": "Glimepiride", "dose": "1 mg OD", "route": "Oral", "duration": "Long-term"}], "instructions": "Take after meals. Monitor blood sugar."},
        {"diagnosis": "Upper Respiratory Infection", "medications": [{"drug": "Paracetamol", "dose": "500 mg TDS", "route": "Oral", "duration": "5 days"}, {"drug": "Cetirizine", "dose": "10 mg OD", "route": "Oral", "duration": "5 days"}], "instructions": "Rest, adequate fluids. Return if fever persists."},
    ]

    for idx, patient in enumerate(patients[:3]):
        rx = sample_meds[idx % len(sample_meds)]
        prescription = Prescription(
            patient_id=patient.id,
            doctor_id=doctor.id,
            diagnosis=rx["diagnosis"],
            medications=rx["medications"],
            instructions=rx["instructions"],
            valid_until=now + timedelta(days=30),
            created_at=now - timedelta(days=random.randint(1, 14)),
        )
        db.add(prescription)
    db.flush()


def _seed_hospital_beds(db):
    """Seed hospital bed data."""
    if db.query(HospitalBed).count() > 0:
        return

    beds = [
        # Andhra Pradesh
        {"facility_name": "King George Hospital (KGH)", "ward": "General", "district": "Visakhapatnam", "state": "Andhra Pradesh", "total_beds": 1200, "occupied_beds": 950, "icu_beds": 150, "icu_occupied": 135},
        {"facility_name": "GGH Vijayawada", "ward": "General", "district": "Krishna", "state": "Andhra Pradesh", "total_beds": 800, "occupied_beds": 620, "icu_beds": 100, "icu_occupied": 82},
        {"facility_name": "SVIMS Tirupati", "ward": "General", "district": "Tirupati", "state": "Andhra Pradesh", "total_beds": 1000, "occupied_beds": 810, "icu_beds": 120, "icu_occupied": 105},
        {"facility_name": "District Hospital Kurnool", "ward": "General", "district": "Kurnool", "state": "Andhra Pradesh", "total_beds": 400, "occupied_beds": 310, "icu_beds": 50, "icu_occupied": 42},
        {"facility_name": "RIMS Kadapa", "ward": "General", "district": "Kadapa", "state": "Andhra Pradesh", "total_beds": 750, "occupied_beds": 580, "icu_beds": 80, "icu_occupied": 65},
        
        # Telangana
        {"facility_name": "Gandhi Hospital", "ward": "General", "district": "Hyderabad", "state": "Telangana", "total_beds": 1200, "occupied_beds": 1050, "icu_beds": 200, "icu_occupied": 185},
        {"facility_name": "Osmania General Hospital", "ward": "General", "district": "Hyderabad", "state": "Telangana", "total_beds": 1500, "occupied_beds": 1320, "icu_beds": 180, "icu_occupied": 160},
        {"facility_name": "NIMS Hyderabad", "ward": "General", "district": "Hyderabad", "state": "Telangana", "total_beds": 1400, "occupied_beds": 1150, "icu_beds": 250, "icu_occupied": 220},
        {"facility_name": "TIMS Gachibowli", "ward": "General", "district": "Hyderabad", "state": "Telangana", "total_beds": 800, "occupied_beds": 450, "icu_beds": 100, "icu_occupied": 40},
        {"facility_name": "District Hospital Khammam", "ward": "General", "district": "Khammam", "state": "Telangana", "total_beds": 500, "occupied_beds": 380, "icu_beds": 60, "icu_occupied": 45},

        # Sample Rural PHCs/CHCs
        {"facility_name": "PHC Adoni", "ward": "General", "district": "Kurnool", "state": "Andhra Pradesh", "total_beds": 30, "occupied_beds": 18, "icu_beds": 4, "icu_occupied": 2},
        {"facility_name": "CHC Nandyal", "ward": "General", "district": "Kurnool", "state": "Andhra Pradesh", "total_beds": 50, "occupied_beds": 41, "icu_beds": 8, "icu_occupied": 6},
    ]
    for b in beds:
        db.add(HospitalBed(**b))
    db.flush()


def _seed_village_health_scores(db):
    """Seed village health score data."""
    if db.query(VillageHealthScore).count() > 0:
        return

    scores = [
        {"village": "Kurnool Rural Cluster", "district": "Kurnool", "state": "Andhra Pradesh",  "health_score": 72, "vaccination_coverage": 68, "malnutrition_rate": 18, "disease_incidence": 24, "maternal_risk": 15, "sanitation_score": 60},
        {"village": "Koraput Block",         "district": "Koraput", "state": "Odisha",           "health_score": 58, "vaccination_coverage": 52, "malnutrition_rate": 31, "disease_incidence": 42, "maternal_risk": 28, "sanitation_score": 45},
        {"village": "Vidarbha East",         "district": "Yavatmal", "state": "Maharashtra",     "health_score": 65, "vaccination_coverage": 74, "malnutrition_rate": 22, "disease_incidence": 19, "maternal_risk": 12, "sanitation_score": 68},
        {"village": "Barmer Rural",          "district": "Barmer",   "state": "Rajasthan",       "health_score": 55, "vaccination_coverage": 48, "malnutrition_rate": 35, "disease_incidence": 38, "maternal_risk": 32, "sanitation_score": 40},
        {"village": "Sundarban Cluster",     "district": "South 24 Parganas", "state": "West Bengal", "health_score": 63, "vaccination_coverage": 71, "malnutrition_rate": 25, "disease_incidence": 28, "maternal_risk": 20, "sanitation_score": 55},
    ]
    for s in scores:
        db.add(VillageHealthScore(**s))
    db.flush()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

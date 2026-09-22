from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from passlib.context import CryptContext

from utils.database import get_db
from models.db_models import Patient, User, UserRole, VitalRecord, DiagnosisResult
import random
import string
import qrcode
import base64
import json
from io import BytesIO

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def generate_patient_uid() -> str:
    """Generate a unique patient ID like GS-PAT-XXXXXX"""
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"GS-PAT-{random_str}"

def generate_patient_qr(patient: Patient, user: User) -> str:
    """Generate a QR code image as base64 containing patient's critical info"""
    data = {
        "uid": patient.patient_uid,
        "name": user.name,
        "age": patient.age,
        "blood_group": patient.blood_group,
        "chronic_conditions": patient.chronic_conditions,
        "allergies": patient.allergies
    }
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(json.dumps(data))
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"



# ── Schemas ──────────────────────────────────────────────────────────────────

class PatientRegisterRequest(BaseModel):
    name: str
    phone: str
    age: int
    gender: str
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    blood_group: Optional[str] = None
    chronic_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    language: Optional[str] = "hi"

class VitalRequest(BaseModel):
    patient_id: str
    heart_rate: Optional[float] = None
    oxygen_level: Optional[float] = None
    blood_pressure_sys: Optional[float] = None
    blood_pressure_dia: Optional[float] = None
    temperature: Optional[float] = None
    glucose_level: Optional[float] = None
    source: Optional[str] = "manual"

class ProfileUpdateRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    blood_group: Optional[str] = None
    profile_picture: Optional[str] = None
    chronic_conditions: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    
# Import get_current_user
from routes.auth import get_current_user


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/profile/me")
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the profile of the currently logged-in user."""
    # If patient, get patient details
    patient = None
    if current_user.role == UserRole.patient:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "profile_picture": current_user.profile_picture,
        "role": current_user.role.value if current_user.role else None,
        "village": current_user.village,
        "district": current_user.district,
        "state": current_user.state,
        # Patient specific fields, default to None/empty for non-patients
        "age": patient.age if patient else None,
        "gender": patient.gender if patient else None,
        "blood_group": patient.blood_group if patient else None,
        "allergies": patient.allergies if patient else [],
        "chronic_conditions": patient.chronic_conditions if patient else [],
        "patient_uid": patient.patient_uid if patient else None,
        "qr_code_url": patient.qr_code_url if patient else None
    }

@router.put("/profile/me")
def update_my_profile(
    req: ProfileUpdateRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Update the profile of the currently logged-in user."""
    # Update User model fields
    if req.email is not None: current_user.email = req.email
    if req.phone is not None: current_user.phone = req.phone
    if req.village is not None: current_user.village = req.village
    if req.district is not None: current_user.district = req.district
    if req.state is not None: current_user.state = req.state
    if req.profile_picture is not None: current_user.profile_picture = req.profile_picture
    
    # If patient, update Patient model fields
    if current_user.role == UserRole.patient:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            needs_qr_update = False
            if req.blood_group is not None: 
                patient.blood_group = req.blood_group
                needs_qr_update = True
            if req.chronic_conditions is not None:
                patient.chronic_conditions = req.chronic_conditions
                needs_qr_update = True
            if req.allergies is not None:
                patient.allergies = req.allergies
                needs_qr_update = True
                
            if needs_qr_update:
                patient.qr_code_url = generate_patient_qr(patient, current_user)

    db.commit()
    return {"message": "Profile updated successfully"}

@router.get("/")
def list_patients(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    village: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all patients with search, filter, and pagination."""
    query = db.query(Patient)
    patients = query.offset(skip).limit(limit).all()

    results = []
    for p in patients:
        user = db.query(User).filter(User.id == p.user_id).first()
        if not user:
            continue

        # Apply search filter
        if search:
            search_lower = search.lower()
            if search_lower not in (user.name or "").lower() and \
               search_lower not in (user.village or "").lower() and \
               search_lower not in (user.phone or "").lower():
                continue

        # Apply village filter
        if village and village.lower() not in (user.village or "").lower():
            continue

        # Apply risk level filter
        if risk_level:
            if risk_level == "high" and (p.risk_score or 0) < 70:
                continue
            elif risk_level == "medium" and ((p.risk_score or 0) < 30 or (p.risk_score or 0) >= 70):
                continue
            elif risk_level == "low" and (p.risk_score or 0) >= 30:
                continue

        results.append({
            "id": p.id, "user_id": p.user_id,
            "name": user.name,
            "age": p.age, "gender": p.gender,
            "village": user.village,
            "district": user.district,
            "state": user.state,
            "risk_score": p.risk_score,
            "blood_group": p.blood_group,
            "chronic_conditions": p.chronic_conditions or [],
            "phone": user.phone,
            "patient_uid": p.patient_uid,
            "qr_code_url": p.qr_code_url
        })

    return {"patients": results, "total": len(results)}


@router.post("/register")
def register_patient(req: PatientRegisterRequest, db: Session = Depends(get_db)):
    """Register a new patient directly (without full auth registration)."""
    if db.query(User).filter(User.phone == req.phone).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = User(
        name=req.name,
        phone=req.phone,
        password_hash=pwd_context.hash("patient123"),  # default password
        role=UserRole.patient,
        village=req.village,
        district=req.district,
        state=req.state,
        language=req.language,
    )
    db.add(user)
    db.flush()

    patient = Patient(
        user_id=user.id,
        age=req.age,
        gender=req.gender,
        blood_group=req.blood_group,
        chronic_conditions=req.chronic_conditions or [],
        allergies=req.allergies or [],
        patient_uid=generate_patient_uid()
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    
    # Generate initial QR code
    patient.qr_code_url = generate_patient_qr(patient, user)
    db.commit()

    return {
        "message": "Patient registered successfully",
        "patient_id": patient.id,
        "patient_uid": patient.patient_uid,
        "name": req.name,
    }


@router.get("/stats/summary")
def patient_stats(db: Session = Depends(get_db)):
    """Get patient statistics summary."""
    total_patients = db.query(Patient).count()
    patients = db.query(Patient).all()

    high_risk = sum(1 for p in patients if (p.risk_score or 0) >= 70)
    medium_risk = sum(1 for p in patients if 30 <= (p.risk_score or 0) < 70)

    males = sum(1 for p in patients if (p.gender or "").lower() in ("male", "m"))
    females = sum(1 for p in patients if (p.gender or "").lower() in ("female", "f"))

    # Age distribution
    children = sum(1 for p in patients if (p.age or 0) < 18)
    adults = sum(1 for p in patients if 18 <= (p.age or 0) < 60)
    elderly = sum(1 for p in patients if (p.age or 0) >= 60)

    # Chronic conditions
    all_conditions = []
    for p in patients:
        all_conditions.extend(p.chronic_conditions or [])
    condition_counts = {}
    for c in all_conditions:
        condition_counts[c] = condition_counts.get(c, 0) + 1

    total_diagnoses = db.query(DiagnosisResult).count()
    total_vitals = db.query(VitalRecord).count()

    return {
        "total_patients": total_patients,
        "high_risk_count": high_risk,
        "medium_risk_count": medium_risk,
        "gender_distribution": {"male": males, "female": females},
        "age_distribution": {"children_under_18": children, "adults_18_60": adults, "elderly_60_plus": elderly},
        "top_chronic_conditions": dict(sorted(condition_counts.items(), key=lambda x: x[1], reverse=True)[:5]),
        "total_diagnoses": total_diagnoses,
        "total_vitals_records": total_vitals,
    }


@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    user = db.query(User).filter(User.id == patient.user_id).first()
    return {
        "id": patient.id,
        "name": user.name if user else "Unknown",
        "age": patient.age, "gender": patient.gender,
        "blood_group": patient.blood_group,
        "allergies": patient.allergies,
        "chronic_conditions": patient.chronic_conditions,
        "vaccination_history": patient.vaccination_history,
        "risk_score": patient.risk_score,
        "village": user.village if user else None,
        "district": user.district if user else None,
        "state": user.state if user else None,
        "abha_id": user.abha_id if user else None,
        "phone": user.phone if user else None,
        "patient_uid": patient.patient_uid,
        "qr_code_url": patient.qr_code_url
    }


@router.post("/vitals")
def record_vitals(req: VitalRequest, db: Session = Depends(get_db)):
    vital = VitalRecord(**req.dict())
    db.add(vital)
    db.commit()
    db.refresh(vital)
    return {"message": "Vitals recorded", "id": vital.id}


@router.get("/{patient_id}/vitals")
def get_vitals(patient_id: str, limit: int = 10, db: Session = Depends(get_db)):
    vitals = db.query(VitalRecord).filter(
        VitalRecord.patient_id == patient_id
    ).order_by(VitalRecord.recorded_at.desc()).limit(limit).all()
    return [{"id": v.id, "heart_rate": v.heart_rate, "oxygen_level": v.oxygen_level,
             "bp_sys": v.blood_pressure_sys, "bp_dia": v.blood_pressure_dia,
             "temperature": v.temperature, "glucose": v.glucose_level,
             "recorded_at": v.recorded_at, "source": v.source} for v in vitals]


@router.get("/{patient_id}/diagnoses")
def get_diagnoses(patient_id: str, limit: int = 10, db: Session = Depends(get_db)):
    diagnoses = db.query(DiagnosisResult).filter(
        DiagnosisResult.patient_id == patient_id
    ).order_by(DiagnosisResult.created_at.desc()).limit(limit).all()
    return [
        {
            "id": d.id,
            "type": d.diagnosis_type,
            "result": d.result,
            "triage_level": d.triage_level.value if d.triage_level else None,
            "recommended_action": d.recommended_action,
            "doctor_verified": d.doctor_verified,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in diagnoses
    ]

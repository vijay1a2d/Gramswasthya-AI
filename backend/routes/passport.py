"""
GramSwasthya AI — Digital Health Passport Routes
Patient-controlled portable health record with QR code access.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import json, base64, hashlib, os
from utils.database import get_db
from models.db_models import (
    Patient, User, VitalRecord, DiagnosisResult,
    Prescription, MedicalRecord
)

router = APIRouter()


@router.get("/lookup/{passport_code}")
def lookup_passport_by_code(passport_code: str, db: Session = Depends(get_db)):
    """Resolve a scanned QR code or passport ID back to a patient's record."""
    if not passport_code:
        raise HTTPException(status_code=400, detail="Invalid passport code")

    lookup_value = passport_code.strip()
    lookup_lower = lookup_value.lower()

    for patient in db.query(Patient).all():
        generated_code = f"GSP-{patient.id[:8].upper()}"
        if (
            patient.id.lower() == lookup_lower
            or patient.id.upper() == lookup_value.upper()
            or generated_code.lower() == lookup_lower
            or generated_code.lower() == lookup_value.replace("GSP-", "").lower()
        ):
            return get_health_passport(patient.id, db)

    raise HTTPException(status_code=404, detail="Passport not found")


@router.get("/{patient_id}")
def get_health_passport(patient_id: str, db: Session = Depends(get_db)):
    """Get complete digital health passport for a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    user = db.query(User).filter(User.id == patient.user_id).first()

    # Get latest vitals
    latest_vitals = db.query(VitalRecord).filter(
        VitalRecord.patient_id == patient_id
    ).order_by(VitalRecord.recorded_at.desc()).first()

    # Get diagnosis history
    diagnoses = db.query(DiagnosisResult).filter(
        DiagnosisResult.patient_id == patient_id
    ).order_by(DiagnosisResult.created_at.desc()).limit(10).all()

    # Get prescriptions
    prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient_id
    ).order_by(Prescription.created_at.desc()).limit(10).all()

    # Get medical records
    records = db.query(MedicalRecord).filter(
        MedicalRecord.patient_id == patient_id
    ).order_by(MedicalRecord.created_at.desc()).limit(10).all()

    # Build passport
    passport = {
        "passport_id": f"GSP-{patient_id[:8].upper()}",
        "generated_at": datetime.utcnow().isoformat(),
        "version": "1.0",

        # Demographics
        "patient": {
            "id": patient.id,
            "name": user.name if user else "Unknown",
            "age": patient.age,
            "gender": patient.gender,
            "blood_group": patient.blood_group,
            "village": user.village if user else None,
            "district": user.district if user else None,
            "state": user.state if user else None,
            "abha_id": user.abha_id if user else None,
            "phone": user.phone if user else None,
        },

        # Medical profile
        "medical_profile": {
            "chronic_conditions": patient.chronic_conditions or [],
            "allergies": patient.allergies or [],
            "blood_group": patient.blood_group,
            "risk_score": patient.risk_score,
        },

        # Vaccination history
        "vaccination_records": patient.vaccination_history or [],

        # Latest vitals
        "latest_vitals": {
            "heart_rate": latest_vitals.heart_rate,
            "oxygen_level": latest_vitals.oxygen_level,
            "blood_pressure": f"{int(latest_vitals.blood_pressure_sys or 0)}/{int(latest_vitals.blood_pressure_dia or 0)}",
            "temperature": latest_vitals.temperature,
            "glucose_level": latest_vitals.glucose_level,
            "recorded_at": latest_vitals.recorded_at.isoformat() if latest_vitals.recorded_at else None,
        } if latest_vitals else None,

        # AI diagnosis history
        "diagnosis_history": [
            {
                "type": d.diagnosis_type,
                "result": d.result,
                "triage_level": d.triage_level.value if d.triage_level else None,
                "recommended_action": d.recommended_action,
                "doctor_verified": d.doctor_verified,
                "date": d.created_at.isoformat() if d.created_at else None,
            }
            for d in diagnoses
        ],

        # Current prescriptions
        "prescriptions": [
            {
                "diagnosis": p.diagnosis,
                "medications": p.medications,
                "instructions": p.instructions,
                "valid_until": p.valid_until.isoformat() if p.valid_until else None,
                "date": p.created_at.isoformat() if p.created_at else None,
            }
            for p in prescriptions
        ],

        # Medical records
        "medical_records": [
            {
                "type": r.record_type,
                "title": r.title,
                "date": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ],

        # Emergency info
        "emergency_info": {
            "blood_group": patient.blood_group,
            "allergies": patient.allergies or [],
            "chronic_conditions": patient.chronic_conditions or [],
            "emergency_contact": user.phone if user else None,
        },

        # Integrity
        "checksum": hashlib.sha256(
            f"{patient_id}{datetime.utcnow().date()}".encode()
        ).hexdigest()[:16],
    }

    return passport


@router.get("/{patient_id}/qr")
def get_passport_qr(patient_id: str, db: Session = Depends(get_db)):
    """Generate QR code data for offline health passport access."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    user = db.query(User).filter(User.id == patient.user_id).first()

    # QR data — compact version for offline scanning
    passport_id = f"GSP-{patient_id[:8].upper()}"
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    qr_data = {
        "id": passport_id,
        "name": user.name if user else "Unknown",
        "age": patient.age,
        "gender": patient.gender,
        "blood": patient.blood_group,
        "allergies": patient.allergies or [],
        "conditions": patient.chronic_conditions or [],
        "risk": patient.risk_score,
        "url": f"{frontend_url}/health-passport?passportId={passport_id}",
        "generated": datetime.utcnow().strftime("%Y-%m-%d"),
    }

    # Return as JSON string for QR encoding on frontend
    qr_string = json.dumps(qr_data, separators=(",", ":"))

    return {
        "patient_id": patient_id,
        "passport_id": f"GSP-{patient_id[:8].upper()}",
        "qr_data": qr_string,
        "qr_content": qr_data,
        "instructions": "Scan this QR code at any GramSwasthya kiosk or hospital for instant health record access.",
    }


@router.get("/{patient_id}/summary")
def get_passport_summary(patient_id: str, db: Session = Depends(get_db)):
    """Get a compact summary of the health passport (for dashboards and cards)."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    user = db.query(User).filter(User.id == patient.user_id).first()

    diagnosis_count = db.query(DiagnosisResult).filter(
        DiagnosisResult.patient_id == patient_id
    ).count()

    prescription_count = db.query(Prescription).filter(
        Prescription.patient_id == patient_id
    ).count()

    vitals_count = db.query(VitalRecord).filter(
        VitalRecord.patient_id == patient_id
    ).count()

    return {
        "passport_id": f"GSP-{patient_id[:8].upper()}",
        "name": user.name if user else "Unknown",
        "age": patient.age,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "risk_score": patient.risk_score,
        "chronic_conditions": len(patient.chronic_conditions or []),
        "allergies": len(patient.allergies or []),
        "total_diagnoses": diagnosis_count,
        "total_prescriptions": prescription_count,
        "total_vitals_records": vitals_count,
        "vaccinations": len(patient.vaccination_history or []),
    }

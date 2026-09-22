from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

Base = declarative_base()

def gen_id():
    return str(uuid.uuid4())

class UserRole(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"
    health_worker = "health_worker"
    admin = "admin"

class TriageLevel(str, enum.Enum):
    emergency = "emergency"
    urgent = "urgent"
    routine = "routine"

class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True, default=gen_id)
    name          = Column(String, nullable=False)
    phone         = Column(String, unique=True, nullable=False)
    email         = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=False)
    profile_picture = Column(String, nullable=True)
    role          = Column(Enum(UserRole), default=UserRole.patient)
    village       = Column(String)
    district      = Column(String)
    state         = Column(String)
    language      = Column(String, default="en")
    abha_id       = Column(String, unique=True, nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"
    id              = Column(String, primary_key=True, default=gen_id)
    user_id         = Column(String, ForeignKey("users.id"), nullable=False)
    age             = Column(Integer)
    gender          = Column(String)
    blood_group     = Column(String)
    allergies       = Column(JSON, default=list)
    chronic_conditions = Column(JSON, default=list)
    vaccination_history = Column(JSON, default=list)
    risk_score      = Column(Float, default=0.0)
    patient_uid     = Column(String, unique=True, index=True, nullable=True) # E.g. GS-PAT-1234
    qr_code_url     = Column(String, nullable=True) # Direct data URL for the QR code
    created_at      = Column(DateTime, default=datetime.utcnow)
    vitals          = relationship("VitalRecord", back_populates="patient")
    diagnoses       = relationship("DiagnosisResult", back_populates="patient")

class VitalRecord(Base):
    __tablename__ = "vitals"
    id              = Column(String, primary_key=True, default=gen_id)
    patient_id      = Column(String, ForeignKey("patients.id"), nullable=False)
    heart_rate      = Column(Float)
    oxygen_level    = Column(Float)
    blood_pressure_sys = Column(Float)
    blood_pressure_dia = Column(Float)
    temperature     = Column(Float)
    glucose_level   = Column(Float)
    recorded_at     = Column(DateTime, default=datetime.utcnow)
    source          = Column(String, default="manual")  # manual, wearable, iot
    patient         = relationship("Patient", back_populates="vitals")

class DiagnosisResult(Base):
    __tablename__ = "diagnosis_results"
    id              = Column(String, primary_key=True, default=gen_id)
    patient_id      = Column(String, ForeignKey("patients.id"), nullable=False)
    diagnosis_type  = Column(String)  # tb, retinopathy, malaria, symptom_triage
    input_type      = Column(String)  # image, audio, symptoms
    result          = Column(JSON)    # {disease, probability, confidence}
    triage_level    = Column(Enum(TriageLevel))
    recommended_action = Column(Text)
    explainability  = Column(JSON)    # SHAP/LIME/GradCAM data
    doctor_verified = Column(Boolean, default=False)
    verified_by     = Column(String, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    patient         = relationship("Patient", back_populates="diagnoses")

class Appointment(Base):
    __tablename__ = "appointments"
    id             = Column(String, primary_key=True, default=gen_id)
    patient_id     = Column(String, ForeignKey("patients.id"), nullable=False)
    doctor_id      = Column(String, ForeignKey("users.id"), nullable=False)
    scheduled_at   = Column(DateTime, nullable=False)
    type           = Column(String, default="teleconsult")  # teleconsult, in_person
    status         = Column(String, default="scheduled")    # scheduled, completed, cancelled
    notes          = Column(Text)
    triage_level   = Column(Enum(TriageLevel), default=TriageLevel.routine)
    created_at     = Column(DateTime, default=datetime.utcnow)

class OutbreakAlert(Base):
    __tablename__ = "outbreak_alerts"
    id             = Column(String, primary_key=True, default=gen_id)
    disease        = Column(String, nullable=False)
    region         = Column(String, nullable=False)
    district       = Column(String)
    state          = Column(String)
    risk_level     = Column(String)   # low, medium, high, critical
    case_count     = Column(Integer, default=0)
    source         = Column(String)   # WHO, CDC, IDSP, internal
    description    = Column(Text)
    recommendations = Column(JSON, default=list)
    is_active      = Column(Boolean, default=True)
    detected_at    = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id             = Column(String, primary_key=True, default=gen_id)
    patient_id     = Column(String, ForeignKey("patients.id"), nullable=False)
    record_type    = Column(String)   # lab_report, prescription, xray, etc
    title          = Column(String)
    content        = Column(JSON)
    ipfs_cid       = Column(String)   # IPFS content ID
    blockchain_tx  = Column(String)   # blockchain transaction hash
    encrypted      = Column(Boolean, default=True)
    uploaded_by    = Column(String, ForeignKey("users.id"))
    created_at     = Column(DateTime, default=datetime.utcnow)

class HospitalBed(Base):
    __tablename__ = "hospital_beds"
    id             = Column(String, primary_key=True, default=gen_id)
    facility_name  = Column(String, nullable=False)
    ward           = Column(String)
    district       = Column(String)
    state          = Column(String)
    total_beds     = Column(Integer, default=0)
    occupied_beds  = Column(Integer, default=0)
    icu_beds       = Column(Integer, default=0)
    icu_occupied   = Column(Integer, default=0)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class VillageHealthScore(Base):
    __tablename__ = "village_health_scores"
    id                   = Column(String, primary_key=True, default=gen_id)
    village              = Column(String, nullable=False)
    district             = Column(String)
    state                = Column(String)
    health_score         = Column(Float)
    vaccination_coverage = Column(Float)
    malnutrition_rate    = Column(Float)
    disease_incidence    = Column(Float)
    maternal_risk        = Column(Float)
    sanitation_score     = Column(Float)
    computed_at          = Column(DateTime, default=datetime.utcnow)

class Prescription(Base):
    __tablename__ = "prescriptions"
    id             = Column(String, primary_key=True, default=gen_id)
    patient_id     = Column(String, ForeignKey("patients.id"), nullable=False)
    doctor_id      = Column(String, ForeignKey("users.id"), nullable=False)
    diagnosis      = Column(String)
    medications    = Column(JSON, default=list)   # [{drug, dose, route, duration}]
    instructions   = Column(Text)
    valid_until    = Column(DateTime)
    created_at     = Column(DateTime, default=datetime.utcnow)

class Referral(Base):
    __tablename__ = "referrals"
    id                 = Column(String, primary_key=True, default=gen_id)
    patient_id         = Column(String, ForeignKey("patients.id"), nullable=False)
    referring_doctor_id = Column(String, ForeignKey("users.id"), nullable=True)
    specialist_id      = Column(String, ForeignKey("users.id"), nullable=True)
    diagnosis          = Column(String)
    urgency            = Column(String, default="routine")   # emergency, urgent, routine
    status             = Column(String, default="pending")   # pending, accepted, completed
    notes              = Column(Text)
    created_at         = Column(DateTime, default=datetime.utcnow)

class EmergencyEvent(Base):
    __tablename__ = "emergency_events"
    id                   = Column(String, primary_key=True, default=gen_id)
    patient_id           = Column(String, ForeignKey("patients.id"), nullable=True)
    event_type           = Column(String, default="sos")    # sos, accident, cardiac, obstetric
    latitude             = Column(Float)
    longitude            = Column(Float)
    status               = Column(String, default="active") # active, dispatched, resolved
    ambulance_dispatched = Column(Boolean, default=False)
    hospital_notified    = Column(Boolean, default=False)
    nearest_facility     = Column(String)
    notes                = Column(Text)
    created_at           = Column(DateTime, default=datetime.utcnow)
    resolved_at          = Column(DateTime, nullable=True)

class ConsentRecord(Base):
    __tablename__ = "consent_records"
    id             = Column(String, primary_key=True, default=gen_id)
    patient_id     = Column(String, ForeignKey("patients.id"), nullable=False)
    granted_to     = Column(String, ForeignKey("users.id"), nullable=False)
    purpose        = Column(String)    # treatment, research, insurance
    granted_at     = Column(DateTime, default=datetime.utcnow)
    revoked_at     = Column(DateTime, nullable=True)
    blockchain_tx  = Column(String, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id             = Column(String, primary_key=True, default=gen_id)
    user_id        = Column(String, ForeignKey("users.id"), nullable=True)
    action         = Column(String, nullable=False)   # view, create, update, delete
    resource       = Column(String)                    # patient, diagnosis, prescription
    resource_id    = Column(String)
    details        = Column(JSON)
    ip_address     = Column(String)
    timestamp      = Column(DateTime, default=datetime.utcnow)

class RiskScore(Base):
    __tablename__ = "risk_scores"
    id             = Column(String, primary_key=True, default=gen_id)
    patient_id     = Column(String, ForeignKey("patients.id"), nullable=False)
    score          = Column(Float)
    level          = Column(String)
    factors        = Column(JSON, default=list)
    lstm_score     = Column(Float, nullable=True)
    tabular_score  = Column(Float, nullable=True)
    computed_at    = Column(DateTime, default=datetime.utcnow)

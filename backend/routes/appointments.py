# routes/appointments.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from utils.database import get_db
from models.db_models import Appointment, TriageLevel

router = APIRouter()

class AppointmentRequest(BaseModel):
    patient_id: str
    doctor_id: str
    scheduled_at: datetime
    type: Optional[str] = "teleconsult"
    notes: Optional[str] = None
    status: Optional[str] = "pending"
    triage_level: Optional[str] = "routine"

@router.post("/")
def create_appointment(req: AppointmentRequest, db: Session = Depends(get_db)):
    appt = Appointment(
        patient_id=req.patient_id,
        doctor_id=req.doctor_id,
        scheduled_at=req.scheduled_at,
        type=req.type,
        status=req.status,
        notes=req.notes,
        triage_level=TriageLevel(req.triage_level),
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return {"message": "Appointment created", "id": appt.id, "scheduled_at": appt.scheduled_at}

@router.get("/")
def list_appointments(db: Session = Depends(get_db)):
    appts = db.query(Appointment).order_by(Appointment.scheduled_at).limit(50).all()
    return [{"id": a.id, "patient_id": a.patient_id, "doctor_id": a.doctor_id,
             "scheduled_at": a.scheduled_at, "type": a.type, "status": a.status,
             "triage": a.triage_level} for a in appts]

class StatusUpdate(BaseModel):
    status: str

@router.put("/{appointment_id}/status")
def update_status(appointment_id: str, req: StatusUpdate, db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        return {"error": "Appointment not found"}
    appt.status = req.status
    db.commit()
    db.refresh(appt)
    return {"message": "Status updated", "id": appt.id, "status": appt.status}

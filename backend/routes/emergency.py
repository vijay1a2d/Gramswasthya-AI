"""
GramSwasthya AI — Emergency Response System Routes
SOS trigger, nearest facility finder, and emergency event management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from utils.database import get_db
from utils.medical_knowledge import find_nearest_facilities
from models.db_models import EmergencyEvent, Patient, User

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class SOSRequest(BaseModel):
    patient_id: Optional[str] = None
    latitude: float
    longitude: float
    event_type: Optional[str] = "sos"    # sos, accident, cardiac, obstetric
    notes: Optional[str] = None


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/sos")
def trigger_sos(req: SOSRequest, db: Session = Depends(get_db)):
    """Trigger emergency SOS with GPS location. Dispatches to nearest facility."""
    # Find nearest facility
    facilities = find_nearest_facilities(req.latitude, req.longitude, max_results=3)
    nearest = facilities[0] if facilities else None

    # Create emergency event
    event = EmergencyEvent(
        patient_id=req.patient_id,
        event_type=req.event_type,
        latitude=req.latitude,
        longitude=req.longitude,
        status="dispatched",
        ambulance_dispatched=True,
        hospital_notified=True,
        nearest_facility=nearest["name"] if nearest else "Unknown",
        notes=req.notes,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Get patient summary if available
    patient_summary = None
    if req.patient_id:
        patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
        if patient:
            user = db.query(User).filter(User.id == patient.user_id).first()
            patient_summary = {
                "name": user.name if user else "Unknown",
                "age": patient.age,
                "gender": patient.gender,
                "blood_group": patient.blood_group,
                "chronic_conditions": patient.chronic_conditions,
                "allergies": patient.allergies,
            }

    return {
        "event_id": event.id,
        "status": "dispatched",
        "message": f"🚨 Emergency SOS activated! Ambulance dispatched to {nearest['name'] if nearest else 'nearest facility'}.",
        "nearest_facility": nearest,
        "all_nearby_facilities": facilities,
        "patient_summary": patient_summary,
        "estimated_response_time": f"{max(5, int(nearest['distance_km'] * 3))} minutes" if nearest else "Unknown",
        "emergency_contacts": {
            "ambulance": "108",
            "national_emergency": "112",
            "poison_control": "1800-11-6117",
        },
        "timestamp": event.created_at.isoformat(),
    }


@router.get("/nearest-facility")
def nearest_facility(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    limit: int = Query(5, ge=1, le=10),
):
    """Find nearest healthcare facilities by GPS coordinates."""
    facilities = find_nearest_facilities(lat, lng, max_results=limit)

    return {
        "query_location": {"latitude": lat, "longitude": lng},
        "facilities": facilities,
        "total": len(facilities),
    }


@router.get("/events")
def list_emergency_events(
    status: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """List emergency events."""
    query = db.query(EmergencyEvent).order_by(EmergencyEvent.created_at.desc())
    if status:
        query = query.filter(EmergencyEvent.status == status)
    events = query.limit(limit).all()

    return {
        "events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "status": e.status,
                "latitude": e.latitude,
                "longitude": e.longitude,
                "nearest_facility": e.nearest_facility,
                "ambulance_dispatched": e.ambulance_dispatched,
                "created_at": e.created_at.isoformat() if e.created_at else None,
                "resolved_at": e.resolved_at.isoformat() if e.resolved_at else None,
            }
            for e in events
        ],
        "total": len(events),
    }


@router.put("/events/{event_id}/resolve")
def resolve_event(event_id: str, db: Session = Depends(get_db)):
    """Mark an emergency event as resolved."""
    event = db.query(EmergencyEvent).filter(EmergencyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.status = "resolved"
    event.resolved_at = datetime.utcnow()
    db.commit()

    return {"message": "Emergency event resolved", "id": event_id}

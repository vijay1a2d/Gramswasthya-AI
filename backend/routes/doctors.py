# routes/doctors.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from utils.database import get_db
from models.db_models import User, UserRole, HospitalBed

router = APIRouter()

@router.get("/")
def list_doctors(
    hospital_id: Optional[str] = Query(None, description="Filter doctors by hospital ID"),
    db: Session = Depends(get_db),
):
    """List doctors, optionally filtered by hospital.
    Doctors are matched to hospitals based on geographic proximity:
    - Same district = direct match (primary)
    - Same state = nearby match (secondary, if no district match exists)
    """
    doctors = db.query(User).filter(User.role == UserRole.doctor).all()
    hospitals = db.query(HospitalBed).all()

    # Build a mapping: hospital_id -> its district & state
    hospital_map = {h.id: {"district": h.district, "state": h.state} for h in hospitals}

    result = []
    for d in doctors:
        # Match doctor to hospitals by district (primary) or state (secondary)
        matched_hospital_ids = []
        for h in hospitals:
            if h.district and d.district and h.district.lower() == d.district.lower():
                matched_hospital_ids.append(h.id)
            elif h.state and d.state and h.state.lower() == d.state.lower():
                matched_hospital_ids.append(h.id)

        # If filtering by specific hospital, skip doctor if not matched
        if hospital_id and hospital_id not in matched_hospital_ids:
            continue

        result.append({
            "id": d.id,
            "name": d.name,
            "district": d.district,
            "state": d.state,
            "hospital_ids": matched_hospital_ids,
        })
    return result

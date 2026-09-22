from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import random

from utils.database import get_db
from models.db_models import HospitalBed

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
def get_hospital_beds(db: Session = Depends(get_db)):
    """
    Get real-time hospital bed availability.
    Includes a slight simulation of live updates (beds changing by small random amounts).
    """
    beds = db.query(HospitalBed).all()
    if not beds:
        from utils.database import _seed_hospital_beds
        _seed_hospital_beds(db)
        db.commit()
        beds = db.query(HospitalBed).all()
        
    results = []
    for bed in beds:
        # Simulate real-time updates: fluctuate occupied beds slightly
        fluctuation = random.randint(-5, 5)
        
        # Ensure we don't go below 0 or above total beds
        simulated_occupied = bed.occupied_beds + fluctuation
        simulated_occupied = max(0, min(simulated_occupied, bed.total_beds))
        
        # Simulate ICU fluctuations too
        icu_fluctuation = random.randint(-2, 2)
        simulated_icu_occupied = bed.icu_occupied + icu_fluctuation
        simulated_icu_occupied = max(0, min(simulated_icu_occupied, bed.icu_beds))
        
        # Calculate availability for frontend convenience
        available_general = bed.total_beds - simulated_occupied
        available_icu = bed.icu_beds - simulated_icu_occupied
        
        results.append({
            "id": bed.id,
            "facility_name": bed.facility_name,
            "ward": bed.ward,
            "district": bed.district,
            "state": bed.state,
            "total_beds": bed.total_beds,
            "occupied_beds": simulated_occupied,
            "available_beds": available_general,
            "icu_beds": bed.icu_beds,
            "icu_occupied": simulated_icu_occupied,
            "available_icu": available_icu,
            "last_updated": "Just now", # simulated real-time
            "status": "critical" if (available_general < bed.total_beds * 0.1) else "warning" if (available_general < bed.total_beds * 0.3) else "normal"
        })
        
    return results

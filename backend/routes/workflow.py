# routes/workflow.py
from fastapi import APIRouter
from datetime import datetime
import random

router = APIRouter()

@router.get("/bed-status")
def bed_status():
    return {
        "facilities": [
            {"name": "District Hospital Kurnool", "total": 120, "occupied": 87, "icu_total": 20, "icu_occupied": 14},
            {"name": "PHC Adoni", "total": 30, "occupied": 18, "icu_total": 4, "icu_occupied": 2},
            {"name": "CHC Nandyal", "total": 50, "occupied": 41, "icu_total": 8, "icu_occupied": 6},
            {"name": "PHC Yemmiganur", "total": 25, "occupied": 10, "icu_total": 2, "icu_occupied": 0},
        ],
        "summary": {"total_beds": 225, "occupied": 156, "available": 69, "occupancy_rate": 69.3},
        "updated_at": datetime.utcnow().isoformat()
    }

@router.get("/queue-status")
def queue_status():
    return {
        "queues": [
            {"doctor": "Dr. Priya Sharma", "specialty": "General Medicine", "waiting": 12, "avg_wait_min": 25},
            {"doctor": "Dr. Rajan Kumar", "specialty": "Pediatrics", "waiting": 8, "avg_wait_min": 18},
            {"doctor": "Dr. Anitha Rao", "specialty": "Gynecology", "waiting": 6, "avg_wait_min": 20},
            {"doctor": "Dr. Venkat Reddy", "specialty": "Ophthalmology", "waiting": 4, "avg_wait_min": 15},
        ],
        "total_waiting": 30,
        "updated_at": datetime.utcnow().isoformat()
    }

@router.get("/supply-forecast")
def supply_forecast():
    return {
        "forecast_days": 30,
        "supplies": [
            {"item": "ORS Packets", "current_stock": 840, "predicted_demand": 520, "status": "adequate"},
            {"item": "Antibiotics (Amoxicillin)", "current_stock": 180, "predicted_demand": 210, "status": "low"},
            {"item": "Malaria RDT Kits", "current_stock": 95, "predicted_demand": 180, "status": "critical"},
            {"item": "MMR Vaccines", "current_stock": 220, "predicted_demand": 150, "status": "adequate"},
            {"item": "Paracetamol", "current_stock": 1200, "predicted_demand": 800, "status": "adequate"},
            {"item": "IV Fluids", "current_stock": 60, "predicted_demand": 120, "status": "critical"},
        ],
        "alerts": ["Malaria RDT Kits below threshold — reorder immediately", "IV Fluids critically low"]
    }

@router.get("/stats")
def dashboard_stats():
    return {
        "today": {
            "patients_seen": 127,
            "teleconsults": 43,
            "ai_diagnoses": 89,
            "emergency_alerts": 3,
            "screening_camps": 2,
        },
        "this_month": {
            "patients_registered": 1842,
            "tb_screenings": 234,
            "retinopathy_screenings": 89,
            "outbreaks_detected": 2,
            "referrals_made": 67,
        },
        "updated_at": datetime.utcnow().isoformat()
    }

import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn

from routes import auth, patients, doctors, diagnosis, risk, disease_intelligence, workflow, appointments, cdss, emergency, passport, hospital, dashboard, chatbot, diet_plan, global_assistant
from utils.database import init_db

app = FastAPI(
    title="GramSwasthya AI",
    description="AI-powered rural healthcare platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and seed data on startup
@app.on_event("startup")
def startup():
    init_db()

# Routers
app.include_router(auth.router,               prefix="/api/auth",        tags=["Authentication"])
app.include_router(patients.router,           prefix="/api/patients",    tags=["Patients"])
app.include_router(doctors.router,            prefix="/api/doctors",     tags=["Doctors"])
app.include_router(diagnosis.router,          prefix="/api/diagnosis",   tags=["AI Diagnosis"])
app.include_router(risk.router,               prefix="/api/risk",        tags=["Risk Analytics"])
app.include_router(disease_intelligence.router, prefix="/api/disease",   tags=["Disease Intelligence"])
app.include_router(workflow.router,           prefix="/api/workflow",    tags=["Workflow"])
app.include_router(appointments.router,       prefix="/api/appointments",tags=["Appointments"])
app.include_router(cdss.router,              prefix="/api/cdss",        tags=["Clinical Decision Support"])
app.include_router(emergency.router,         prefix="/api/emergency",   tags=["Emergency Response"])
app.include_router(passport.router,          prefix="/api/passport",    tags=["Health Passport"])
app.include_router(hospital.router,          prefix="/api/hospitals",   tags=["Hospitals"])
app.include_router(dashboard.router,         prefix="/api/dashboard",   tags=["Dashboard"])
app.include_router(chatbot.router,           prefix="/api/chat",        tags=["AI Chatbot"])
app.include_router(diet_plan.router,         prefix="/api/diet-plan",   tags=["Diet Plan"])

from routes import voice_assistant
app.include_router(voice_assistant.router,   prefix="/api/voice-assistant", tags=["Voice Assistant"])

app.include_router(global_assistant.router,  prefix="/api/global-assistant", tags=["Global Voice Assistant"])

@app.get("/")
def root():
    return {"message": "GramSwasthya AI API", "status": "running", "version": "1.0.0"}

@app.get("/api/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

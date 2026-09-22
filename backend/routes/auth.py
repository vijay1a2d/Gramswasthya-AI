from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os

from utils.database import get_db
from models.db_models import User, Patient, UserRole

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET_KEY = os.getenv("SECRET_KEY", "gramswasthya-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Schemas
class RegisterRequest(BaseModel):
    name: str
    phone: str
    password: str
    role: UserRole = UserRole.patient
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    language: Optional[str] = "en"
    email: Optional[str] = None
    abha_id: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str
    name: str

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone == req.phone).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = User(
        name=req.name,
        phone=req.phone,
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role,
        village=req.village,
        district=req.district,
        state=req.state,
        language=req.language,
        abha_id=req.abha_id,
    )
    db.add(user)
    db.flush()

    if req.role == UserRole.patient:
        patient = Patient(
            user_id=user.id,
            age=req.age,
            gender=req.gender,
        )
        db.add(patient)

    db.commit()
    db.refresh(user)

    token = create_token({"sub": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "user_id": user.id, "name": user.name}

@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "user_id": user.id, "name": user.name}

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "role": current_user.role,
        "village": current_user.village,
        "district": current_user.district,
        "language": current_user.language,
    }

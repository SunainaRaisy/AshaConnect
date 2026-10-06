from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime
import json

app = FastAPI(title="ASHA Connect API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SQLALCHEMY_DATABASE_URL = "sqlite:///./asha_connect.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    health_id = Column(String, unique=True, index=True) # E.g., 62-7706-2871-3110
    name = Column(String)
    role = Column(String, default="ASHA") # ASHA, ANM, ADMIN
    password = Column(String) # In a real app, hash this

class Household(Base):
    __tablename__ = "households"
    id = Column(String, primary_key=True, index=True) # E.g., HH1025
    village = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(String, ForeignKey("households.id"))
    name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    abha_id = Column(String, nullable=True)
    mobile = Column(String, nullable=True)
    village = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Record(Base):
    __tablename__ = "records"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    register_type = Column(String) # E.g., 'Pregnancy', 'NCD', 'Children'
    data = Column(JSON) # Store specific register fields here
    status = Column(String, default="Draft") # Draft, Submitted, Under ANM Review, Validated, Returned
    ai_flag = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class FollowUp(Base):
    __tablename__ = "follow_ups"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    reason = Column(String)
    due_date = Column(DateTime)
    status = Column(String, default="Pending") # Pending, Completed
    assigned_to = Column(Integer, ForeignKey("users.id"))

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas
class LoginRequest(BaseModel):
    health_id: str
    password: str

class PatientCreate(BaseModel):
    household_id: str
    name: str = Field(min_length=1, max_length=120)
    age: int = Field(ge=0, le=130)
    gender: str
    village: Optional[str] = None
    abha_id: Optional[str] = None
    mobile: Optional[str] = None

class HouseholdCreate(BaseModel):
    id: str = Field(min_length=2, max_length=30)
    village: str = Field(min_length=1, max_length=120)

class RecordCreate(BaseModel):
    patient_id: int
    register_type: str
    data: dict[str, Any]
    ai_flag: Optional[str] = None

# Endpoints
@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.health_id == req.health_id).first()
    # Mocking password verification for prototype
    if not user or user.password != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": "fake-jwt-token", "user": {"id": user.id, "name": user.name, "role": user.role, "health_id": user.health_id}}

@app.get("/api/dashboard/stats")
def get_stats(db: Session = Depends(get_db)):
    return {
        "households": db.query(Household).count(),
        "patients": db.query(Patient).count(),
        "pending_validation": db.query(Record).filter(Record.status.in_(["Submitted", "Under ANM Review"])).count(),
        "validated": db.query(Record).filter(Record.status == "Validated").count(),
        "follow_ups": db.query(FollowUp).filter(FollowUp.status == "Pending").count(),
    }

@app.get("/api/households")
def get_households(db: Session = Depends(get_db)):
    households = db.query(Household).order_by(Household.id).all()
    result = []
    for household in households:
        latest_record = db.query(Record.created_at).join(Patient, Record.patient_id == Patient.id).filter(
            Patient.household_id == household.id
        ).order_by(Record.created_at.desc()).first()
        result.append({
            "id": household.id,
            "village": household.village,
            "members": db.query(Patient).filter(Patient.household_id == household.id).count(),
            "last_visit": latest_record[0].date().isoformat() if latest_record and latest_record[0] else None,
        })
    return result

@app.post("/api/households", status_code=201)
def create_household(req: HouseholdCreate, db: Session = Depends(get_db)):
    household_id = req.id.strip().upper()
    if db.query(Household).filter(Household.id == household_id).first():
        raise HTTPException(status_code=409, detail="Household ID already exists")
    household = Household(id=household_id, village=req.village.strip())
    db.add(household)
    db.commit()
    return {"id": household.id, "village": household.village, "members": 0, "last_visit": None}

@app.get("/api/patients")
def get_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).order_by(Patient.name).all()
    return [{
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "household_id": patient.household_id,
        "village": patient.village,
        "abha_id": patient.abha_id,
        "mobile": patient.mobile,
        "registers": [record.register_type for record in db.query(Record).filter(Record.patient_id == patient.id).all()],
    } for patient in patients]

@app.post("/api/patients", status_code=201)
def create_patient(req: PatientCreate, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == req.household_id).first()
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")

    patient = Patient(
        household_id=household.id,
        name=req.name.strip(),
        age=req.age,
        gender=req.gender,
        village=(req.village or household.village or "").strip(),
        abha_id=req.abha_id or None,
        mobile=req.mobile or None,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "household_id": patient.household_id,
        "village": patient.village,
        "abha_id": patient.abha_id,
        "mobile": patient.mobile,
        "registers": [],
    }

@app.post("/api/records", status_code=201)
def create_record(req: RecordCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    record = Record(
        patient_id=patient.id,
        register_type=req.register_type,
        data=req.data,
        status="Submitted",
        ai_flag=req.ai_flag,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "status": record.status, "register_type": record.register_type}

@app.get("/api/records")
def get_records(db: Session = Depends(get_db)):
    records = db.query(Record, Patient).join(Patient, Record.patient_id == Patient.id).order_by(Record.created_at.desc()).all()
    return [{
        "id": f"REC{record.id:05d}",
        "patient_id": record.patient_id,
        "patient": patient.name,
        "age": patient.age,
        "village": patient.village,
        "register_type": record.register_type,
        "date": record.created_at.date().isoformat() if record.created_at else "",
        "status": record.status,
        "ai_flag": record.ai_flag,
        "data": record.data,
    } for record, patient in records]

@app.get("/api/follow-ups")
def get_follow_ups(db: Session = Depends(get_db)):
    follow_ups = db.query(FollowUp, Patient).join(Patient, FollowUp.patient_id == Patient.id).order_by(FollowUp.due_date).all()
    return [{
        "id": follow_up.id,
        "patient_id": follow_up.patient_id,
        "patient": patient.name,
        "village": patient.village,
        "reason": follow_up.reason,
        "due_date": follow_up.due_date.date().isoformat() if follow_up.due_date else "",
        "status": follow_up.status,
    } for follow_up, patient in follow_ups]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

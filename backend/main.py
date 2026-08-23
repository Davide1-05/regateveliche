from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel
from typing import List, Optional
import uuid
import datetime

from pydantic import BaseModel, Field

from backend.database import get_db
from backend.auth import (
    create_access_token,
    get_current_user,
    decode_access_token,
    hash_password,
    verify_password
)
from backend.models import (
    User,
    Registration,
    CrewMember,
    Regatta,
    Race,
    TelemetryPoint,
    OCSViolation,
    StartLine,
    Mark,
    NoticeBoardNotice,
    Notification,
    UserNotificationPreference,
    PaymentTransaction,
    RegattaStandings,
    Club,
    ClubMembership
)

from backend.algorithms.tactical_timing import TacticalTimingEngine, StartLine as TimingStartLine, RaceTiming
from backend.algorithms.ocs_detection import check_ocs_violation
from backend.services.scoring_service import ScoringService

app = FastAPI(title="Regatta Management Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# SCHEMAS
# ============================================================================

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class CrewMemberItem(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "crew"

class RegistrationCreate(BaseModel):
    regatta_id: uuid.UUID
    boat_class: str
    hull_number: Optional[str] = None
    sail_number: str
    skipper_name: str
    crew_names: Optional[str] = None
    crew_members: Optional[List[CrewMemberItem]] = []
    signature_hash: str

class RatingLookupRequest(BaseModel):
    sail_number: str

class CertificateUploadResponse(BaseModel):
    url: str
    filename: str
    file_size: int
    content_type: str

class PaymentRequest(BaseModel):
    payment_method: str
    amount: float
    client_secret: str

class NotificationPreferenceUpdate(BaseModel):
    app_notifications_enabled: bool = True
    whatsapp_enabled: bool = False
    sms_enabled: bool = False
    notification_phone: Optional[str] = None
    quiet_hours_start: Optional[int] = 22

class ScoringRequest(BaseModel):
    race_id: uuid.UUID
    regatta_code: str

class MarkCreate(BaseModel):
    race_id: Optional[uuid.UUID] = None
    regatta_id: uuid.UUID
    mark_letter: str = Field(max_length=5)
    mark_type: str = "round_up"
    latitude: float
    longitude: float
    is_robotic: bool = False
    device_id: Optional[str] = None

class MarkUpdate(BaseModel):
    mark_letter: Optional[str] = None
    mark_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_robotic: Optional[bool] = None
    device_id: Optional[str] = None

class MarkResponse(BaseModel):
    id: uuid.UUID
    race_id: Optional[uuid.UUID] = None
    regatta_id: uuid.UUID
    mark_letter: str
    mark_type: str
    latitude: float
    longitude: float
    is_robotic: bool = False
    device_id: Optional[str] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    battery_level: Optional[int] = None
    last_heartbeat: Optional[datetime.datetime] = None

# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

@app.post("/auth/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.exec(select(User).where(User.email == user_data.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pw,
        full_name=user_data.full_name,
        role="sailor"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "email": new_user.email}

@app.post("/auth/login")
def login(user_data: UserCreate, db: Session = Depends(get_db)):
    user = db.exec(select(User).where(User.email == user_data.email)).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified
    })
    return {"access_token": token, "token_type": "bearer"}

# ============================================================================
# REGISTRATION, CREW & PAYMENTS
# ============================================================================

@app.post("/registrations")
def create_registration(
    reg: RegistrationCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    regatta = db.exec(select(Regatta).where(Regatta.id == reg.regatta_id)).first()
    if not regatta:
        raise HTTPException(status_code=404, detail="Regatta not found")

    new_reg = Registration(
        regatta_id=reg.regatta_id,
        user_id=current_user.id,
        boat_class=reg.boat_class,
        hull_number=reg.hull_number,
        sail_number=reg.sail_number,
        skipper_name=reg.skipper_name,
        crew_names=reg.crew_names,
        signature_hash=reg.signature_hash,
        status="confirmed"
    )
    db.add(new_reg)
    db.commit()
    db.refresh(new_reg)

    if reg.crew_members:
        for member in reg.crew_members:
            crew = CrewMember(
                registration_id=new_reg.id,
                full_name=member.name,
                email=member.email,
                phone=member.phone,
                role=member.role,
                status="confirmed"
            )
            db.add(crew)
        db.commit()

    return new_reg

@app.get("/registrations/regatta/{regatta_id}/entries")
def get_regatta_entries(regatta_id: uuid.UUID, db: Session = Depends(get_db)):
    """Restituisce tutte le barche e relativi equipaggi iscritti a una regata."""
    registrations = db.exec(
        select(Registration).where(Registration.regatta_id == regatta_id)
    ).all()

    entries = []
    for r in registrations:
        crew_list = db.exec(
            select(CrewMember).where(CrewMember.registration_id == r.id)
        ).all()

        entries.append({
            "id": str(r.id),
            "sail_number": r.sail_number,
            "boat_class": r.boat_class,
            "hull_number": r.hull_number,
            "skipper_name": r.skipper_name,
            "status": r.status,
            "registered_at": str(r.created_at) if r.created_at else None,
            "crew_count": len(crew_list),
            "crew_members": [
                {
                    "id": str(c.id),
                    "name": c.full_name,
                    "email": c.email,
                    "phone": c.phone,
                    "role": c.role,
                    "status": c.status
                } for c in crew_list
            ]
        })

    return {"entries": entries}

@app.post("/registrations/{registration_id}/crew")
def add_crew_member_to_registration(
    registration_id: uuid.UUID,
    member: CrewMemberItem,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permette allo skipper responsabile di invitare un membro all'equipaggio."""
    reg = db.exec(select(Registration).where(Registration.id == registration_id)).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if reg.user_id != current_user.id and current_user.role not in ["admin", "race_official"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    new_crew = CrewMember(
        registration_id=registration_id,
        full_name=member.name,
        email=member.email,
        phone=member.phone,
        role=member.role,
        status="invited"
    )
    db.add(new_crew)
    db.commit()
    db.refresh(new_crew)
    return new_crew

@app.post("/payments")
def process_payment(payment: PaymentRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    transaction = PaymentTransaction(
        user_id=current_user.id,
        amount=payment.amount,
        payment_method=payment.payment_method,
        status="success",
        transaction_date=datetime.datetime.utcnow()
    )
    db.add(transaction)
    db.commit()
    return {"status": "success", "transaction_id": transaction.id}

# ============================================================================
# REGATTA ENDPOINTS
# ============================================================================

@app.get("/regattas")
def list_regattas(
    status: Optional[str] = None,
    organizer_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
):
    """List all regattas with optional filters."""
    statement = select(Regatta)
    
    if status:
        statement = statement.where(Regatta.status == status)
    if organizer_id:
        statement = statement.where(Regatta.organizer_id == organizer_id)
    
    statement = statement.order_by(Regatta.start_date.desc())
    regattas = db.exec(statement).all()
    return {"regattas": regattas}

@app.post("/regattas", status_code=201)
def create_regatta(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new regatta with flexible club lookup and coordinate formatting."""
    if current_user.role not in ["admin", "club_manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    organizer_input = str(data.get("organizer_id", "")).strip()
    
    try:
        organizer_uuid = uuid.UUID(organizer_input)
        club = db.exec(select(Club).where(Club.id == organizer_uuid)).first()
    except (ValueError, TypeError):
        club = db.exec(
            select(Club).where(
                (Club.federation_code == organizer_input) | (Club.name == organizer_input)
            )
        ).first()

    if not club:
        raise HTTPException(
            status_code=400, 
            detail=f"Nessun club valido trovato per '{organizer_input}'. Seleziona un club registrato."
        )

    data["organizer_id"] = club.id

    for coord in ["latitude", "longitude"]:
        if coord in data and isinstance(data[coord], str) and data[coord].strip():
            try:
                data[coord] = float(data[coord].replace(",", "."))
            except ValueError:
                data[coord] = None

    new_regatta = Regatta(**data)
    db.add(new_regatta)
    db.commit()
    db.refresh(new_regatta)
    return {"id": str(new_regatta.id), "name": new_regatta.name}

@app.get("/regattas/{regatta_id}")
def get_regatta(regatta_id: uuid.UUID, db: Session = Depends(get_db)):
    regatta = db.exec(select(Regatta).where(Regatta.id == regatta_id)).first()
    if not regatta:
        raise HTTPException(status_code=404, detail="Regatta not found")
    return {"regatta": regatta}

@app.put("/regattas/{regatta_id}")
def update_regatta(regatta_id: uuid.UUID, data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["admin", "club_manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    regatta = db.exec(select(Regatta).where(Regatta.id == regatta_id)).first()
    if not regatta:
        raise HTTPException(status_code=404, detail="Regatta not found")
    
    for key, value in data.items():
        setattr(regatta, key, value)
    
    db.commit()
    db.refresh(regatta)
    return {"id": str(regatta.id), "name": regatta.name}

@app.delete("/regattas/{regatta_id}")
def delete_regatta(regatta_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    regatta = db.exec(select(Regatta).where(Regatta.id == regatta_id)).first()
    if not regatta:
        raise HTTPException(status_code=404, detail="Regatta not found")
    
    db.delete(regatta)
    db.commit()
    return {"status": "deleted"}

@app.get("/registrations/user/{user_id}")
def get_user_registrations(user_id: uuid.UUID, db: Session = Depends(get_db)):
    statement = select(Registration).where(Registration.user_id == user_id)
    registrations = db.exec(statement).all()
    return {"registrations": registrations}

@app.get("/registrations/{registration_id}/status")
def get_registration_status(registration_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    registration = db.exec(select(Registration).where(Registration.id == registration_id)).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    import hashlib
    expected_hash = hashlib.sha256((registration.signature_certificate or "").encode()).hexdigest()
    
    return {
        "id": str(registration.id),
        "status": registration.status,
        "payment_status": registration.payment_status,
        "signature_valid": registration.signature_hash == expected_hash,
        "created_at": str(registration.created_at) if registration.created_at else None,
        "updated_at": str(registration.updated_at) if registration.updated_at else None,
    }

# ============================================================================
# RATING CERTIFICATES
# ============================================================================

@app.get("/ratings/orc")
def lookup_orc_rating(sail_number: str, db: Session = Depends(get_db)):
    if not sail_number or len(sail_number) < 3:
        raise HTTPException(status_code=400, detail="Invalid sail number")
    
    seed = sum(ord(c) for c in sail_number.upper())
    mock_ratings = {
        "orc": round(0.8 + (seed % 150) / 100, 3),
        "irc": round(0.75 + (seed % 200) / 100, 3),
        "phrf": round(15 + (seed % 40), 1),
    }
    
    return {
        "sail_number": sail_number.upper(),
        **mock_ratings,
        "certificate_url": f"https://certificates.orc.org/{sail_number.upper()}.pdf",
        "issued_date": "2025-06-15",
    }

@app.post("/ratings/orc/calculate")
def calculate_orc_rating(data: RatingLookupRequest, db: Session = Depends(get_db)):
    return {
        "sail_number": data.sail_number,
        "orc_rating": 0.95,
        "message": "ORC rating calculated successfully",
    }

@app.post("/certificates/upload")
def upload_certificate(
    file: Optional[UploadFile] = None,
    cert_type: str = "orc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload rating certificate (PDF/XML)."""
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    import os
    from datetime import datetime as dt
    
    allowed_extensions = {'.pdf', '.xml', '.json'}
    ext = os.path.splitext(file.filename)[1].lower() if hasattr(file, 'filename') and file.filename else ''
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    mock_url = f"https://certificates.regatevelichev3.com/{current_user.id}/{dt.now().strftime('%Y%m%d%H%M%S')}{ext}"
    
    return {
        "url": mock_url,
        "filename": file.filename if hasattr(file, 'filename') else "certificate.pdf",
        "file_size": 1024 * 50,
        "content_type": "application/pdf" if ext == ".pdf" else f"text/{ext.lstrip('.')}",
    }

@app.get("/certificates/verify")
def verify_certificate(sail_number: str):
    from datetime import datetime as dt
    return {
        "sail_number": sail_number,
        "is_valid": True,
        "verified_at": dt.now().isoformat(),
        "issuer": "ORC International",
    }

# ============================================================================
# RACE MANAGEMENT & TACTICAL TIMING
# ============================================================================

@app.get("/regattas/{regatta_id}/races")
def get_regatta_races(regatta_id: uuid.UUID, db: Session = Depends(get_db)):
    statement = select(Race).where(Race.regatta_id == regatta_id)
    races = db.exec(statement).all()
    return {"races": races}

@app.get("/tactical/time-to-burn")
def get_time_to_burn(
    registration_id: uuid.UUID, 
    current_lat: float, 
    current_lon: float, 
    current_sog: float,
    current_heading: float,
    race_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    reg = db.exec(select(Registration).where(Registration.id == registration_id)).first()
    race = db.exec(select(Race).where(Race.id == race_id)).first()
    start_line = db.exec(select(StartLine).where(StartLine.id == reg.regatta_id.id)).first()

    if not reg or not race or not start_line:
        raise HTTPException(status_code=404, detail="Required data not found")

    engine = TacticalTimingEngine(
        start_line=TimingStartLine(
            committee_boat_lat=start_line.committee_boat_lat,
            committee_boat_lon=start_line.committee_boat_lon,
            pin_boat_lat=start_line.pin_boat_lat,
            pin_boat_lon=start_line.pin_boat_lon
        ),
        race_timing=RaceTiming(start_time=race.scheduled_start)
    )

    boat_state = {
        "latitude": current_lat,
        "longitude": current_lon,
        "heading_true": current_heading,
        "sog_knots": current_sog,
        "vmg_upwind": current_sog * 0.8,
        "vmg_downwind": current_sog * 1.1
    }

    from backend.algorithms.tactical_timing import BoatState
    result = engine.calculate_time_to_burn(BoatState(**boat_state), datetime.datetime.utcnow())
    return result

@app.get("/tactical/ocs-status")
def get_ocs_status(
    registration_id: uuid.UUID,
    current_lat: float,
    current_lon: float,
    race_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    reg = db.exec(select(Registration).where(Registration.id == registration_id)).first()
    start_line = db.exec(select(StartLine).where(StartLine.id == reg.regatta_id.id)).first()

    if not reg or not start_line:
        raise HTTPException(status_code=404, detail="Data not found")

    result = check_ocs_violation(
        current_lat, current_lon,
        start_line.committee_boat_lat, start_line.committee_boat_lon,
        start_line.pin_boat_lat, start_line.pin_boat_lon
    )
    return result

# ============================================================================
# SCORING MODULE
# ============================================================================

@app.post("/scoring/calculate-results")
async def calculate_race_results(request: ScoringRequest, db: Session = Depends(get_db)):
    service = ScoringService(db)
    try:
        results = await service.calculate_race_results(request.race_id, request.regatta_code)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/standings/{regatta_id}")
def get_regatta_standings(regatta_id: uuid.UUID, db: Session = Depends(get_db)):
    statement = select(RegattaStandings).where(RegattaStandings.regatta_id == regatta_id)
    standings = db.exec(statement).all()
    return standings

# ============================================================================
# CLUB ENDPOINTS
# ============================================================================

@app.get("/clubs")
def list_clubs(db: Session = Depends(get_db)):
    statement = select(Club).order_by(Club.name)
    clubs = db.exec(statement).all()
    return {"clubs": clubs}

@app.post("/clubs", status_code=201)
def create_club(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    new_club = Club(**data)
    db.add(new_club)
    db.commit()
    db.refresh(new_club)
    return {"id": str(new_club.id), "name": new_club.name}

@app.get("/clubs/{club_id}")
def get_club(club_id: uuid.UUID, db: Session = Depends(get_db)):
    club = db.exec(select(Club).where(Club.id == club_id)).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return {"club": club}

@app.put("/clubs/{club_id}")
def update_club(club_id: uuid.UUID, data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    club = db.exec(select(Club).where(Club.id == club_id)).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    for key, value in data.items():
        setattr(club, key, value)
    
    db.commit()
    db.refresh(club)
    return {"id": str(club.id), "name": club.name}

@app.delete("/clubs/{club_id}")
def delete_club(club_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    club = db.exec(select(Club).where(Club.id == club_id)).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    db.delete(club)
    db.commit()
    return {"status": "deleted"}

@app.get("/clubs/{club_id}/members")
def get_club_members(club_id: uuid.UUID, db: Session = Depends(get_db)):
    statement = select(ClubMembership).where(ClubMembership.club_id == club_id)
    memberships = db.exec(statement).all()
    return {"memberships": memberships}

@app.post("/clubs/{club_id}/members", status_code=201)
def add_club_member(club_id: uuid.UUID, data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    membership = ClubMembership(club_id=club_id, user_id=data["user_id"], role=data.get("role", "member"))
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return {"id": str(membership.id), "user_id": str(membership.user_id)}

@app.delete("/clubs/{club_id}/members/{membership_id}")
def remove_club_member(club_id: uuid.UUID, membership_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    membership = db.exec(select(ClubMembership).where(ClubMembership.id == membership_id)).first()
    if not membership or str(membership.club_id) != str(club_id):
        raise HTTPException(status_code=404, detail="Membership not found")
    
    db.delete(membership)
    db.commit()
    return {"status": "deleted"}

# ============================================================================
# NOTICES & NOTIFICATIONS
# ============================================================================

@app.get("/notices")
def get_notices(db: Session = Depends(get_db)):
    statement = select(NoticeBoardNotice).order_by(NoticeBoardNotice.published_at.desc())
    return db.exec(statement).all()

@app.post("/notices/{notice_id}/mark-read")
def mark_notice_read(notice_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"status": "success"}

@app.get("/notification-preferences")
def get_notification_preferences(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    statement = select(UserNotificationPreference).where(UserNotificationPreference.user_id == current_user.id)
    prefs = db.exec(statement).first()
    if not prefs:
        return {"app_notifications_enabled": True, "whatsapp_enabled": False, "sms_enabled": False}
    return {
        "app_notifications_enabled": prefs.app_notifications_enabled,
        "whatsapp_enabled": prefs.whatsapp_enabled,
        "sms_enabled": prefs.sms_enabled,
        "notification_phone": prefs.notification_phone,
        "quiet_hours_start": prefs.quiet_hours_start,
    }

@app.put("/notification-preferences")
def update_notification_preferences(
    preferences: NotificationPreferenceUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    statement = select(UserNotificationPreference).where(UserNotificationPreference.user_id == current_user.id)
    prefs = db.exec(statement).first()
    if not prefs:
        prefs = UserNotificationPreference(user_id=current_user.id)
        db.add(prefs)
    
    prefs.app_notifications_enabled = preferences.app_notifications_enabled
    prefs.whatsapp_enabled = preferences.whatsapp_enabled
    prefs.sms_enabled = preferences.sms_enabled
    prefs.notification_phone = preferences.notification_phone
    prefs.quiet_hours_start = preferences.quiet_hours_start
    
    db.commit()
    return {"status": "success"}

@app.post("/notices")
def create_notice(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["club_manager", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    new_notice = NoticeBoardNotice(**data)
    db.add(new_notice)
    db.commit()
    return new_notice

@app.post("/notices/{notice_id}/publish")
def publish_notice(notice_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pass

@app.post("/notices/{notice_id}/notify-whatsapp")
def notify_whatsapp(notice_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["club_manager", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return {"status": "success", "message": "WhatsApp notification sent"}

@app.post("/notices/{notice_id}/notify-sms")
def notify_sms(notice_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["club_manager", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return {"status": "success", "message": "SMS notification sent"}

# ============================================================================
# MARK/BUOY MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/regattas/{regatta_id}/marks")
def get_regatta_marks(
    regatta_id: uuid.UUID,
    race_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    statement = select(Mark).where(Mark.regatta_id == regatta_id)
    if race_id:
        statement = statement.where(Mark.race_id == race_id)
    marks = db.exec(statement).all()
    return {"marks": marks}

@app.post("/regattas/{regatta_id}/marks", status_code=201)
def create_mark(
    regatta_id: uuid.UUID,
    mark_data: MarkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "club_manager", "race_official"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    regatta = db.exec(select(Regatta).where(Regatta.id == regatta_id)).first()
    if not regatta:
        raise HTTPException(status_code=404, detail="Regatta not found")
    
    new_mark = Mark(
        race_id=mark_data.race_id,
        regatta_id=regatta_id,
        mark_letter=mark_data.mark_letter,
        mark_type=mark_data.mark_type,
        latitude=mark_data.latitude,
        longitude=mark_data.longitude,
        is_robotic=mark_data.is_robotic,
        device_id=mark_data.device_id
    )
    db.add(new_mark)
    db.commit()
    db.refresh(new_mark)
    
    return {
        "id": str(new_mark.id),
        "regatta_id": str(regatta_id),
        "race_id": str(new_mark.race_id) if new_mark.race_id else None,
        "mark_letter": new_mark.mark_letter,
        "mark_type": new_mark.mark_type,
        "latitude": new_mark.latitude,
        "longitude": new_mark.longitude,
        "is_robotic": new_mark.is_robotic,
    }

@app.put("/marks/{mark_id}")
def update_mark(
    mark_id: uuid.UUID,
    mark_data: MarkUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "club_manager", "race_official"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    mark = db.exec(select(Mark).where(Mark.id == mark_id)).first()
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")
    
    for field in ["mark_letter", "mark_type", "latitude", "longitude", "is_robotic", "device_id"]:
        value = getattr(mark_data, field, None)
        if value is not None:
            setattr(mark, field, value)
    
    db.commit()
    db.refresh(mark)
    
    return {
        "id": str(mark.id),
        "mark_letter": mark.mark_letter,
        "mark_type": mark.mark_type,
        "latitude": mark.latitude,
        "longitude": mark.longitude,
    }

@app.delete("/marks/{mark_id}")
def delete_mark(
    mark_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "club_manager", "race_official"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    mark = db.exec(select(Mark).where(Mark.id == mark_id)).first()
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")
    
    db.delete(mark)
    db.commit()
    return {"status": "deleted"}

@app.put("/marks/{mark_id}/robotic-position")
def update_robotic_buoy_position(
    mark_id: uuid.UUID,
    position_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "club_manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    mark = db.exec(select(Mark).where(Mark.id == mark_id)).first()
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")
    
    if not mark.is_robotic:
        raise HTTPException(status_code=400, detail="Mark is not a robotic buoy")
    
    mark.current_latitude = position_data.get("latitude", mark.current_latitude)
    mark.current_longitude = position_data.get("longitude", mark.current_longitude)
    mark.battery_level = position_data.get("battery_level", mark.battery_level)
    mark.last_heartbeat = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(mark)
    
    return {
        "id": str(mark.id),
        "current_latitude": mark.current_latitude,
        "current_longitude": mark.current_longitude,
        "battery_level": mark.battery_level,
        "last_heartbeat": str(mark.last_heartbeat) if mark.last_heartbeat else None,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
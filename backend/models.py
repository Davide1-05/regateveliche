"""Database models using SQLModel (SQLAlchemy + Pydantic integration)."""

from datetime import datetime, timedelta
from typing import Optional, List
import uuid
import hashlib
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, DateTime, func


# ============================================================================
# USER MANAGEMENT & AUTHENTICATION (RF08 - RBAC)
# ============================================================================

class User(SQLModel, table=True):
    """User model with JWT authentication support."""
    
    __tablename__ = "users"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    email: str = Field(
        unique=True,
        index=True,
        max_length=255,
        nullable=False
    )
    hashed_password: str = Field(max_length=255)
    full_name: Optional[str] = Field(max_length=255, default=None)
    
    # RBAC Role (RF08)
    role: str = Field(
        default="sailor",
        max_length=50,
        index=True
    )  # admin, club_manager, race_official, sailor
    
    # Status flags
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    
    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=datetime.utcnow)
    )
    
    # Relationships
    registrations: list["Registration"] = Relationship(back_populates="user")
    club_memberships: list["ClubMembership"] = Relationship(back_populates="user")


class RefreshToken(SQLModel, table=True):
    """JWT refresh token storage for secure authentication."""
    
    __tablename__ = "refresh_tokens"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    user_id: uuid.UUID = Field(
        foreign_key="users.id",
        index=True
    )
    token_hash: str = Field(max_length=255)  # Hashed refresh token
    expires_at: datetime = Field(index=True)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


# ============================================================================
# CLUB MANAGEMENT (COMP-ADM)
# ============================================================================

class Club(SQLModel, table=True):
    """Sailing club entity."""
    
    __tablename__ = "clubs"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    name: str = Field(max_length=255, unique=True)
    federation_code: Optional[str] = Field(max_length=50, unique=True)
    email: str = Field(max_length=255)
    phone: Optional[str] = Field(max_length=50)
    address: Optional[str] = Field(max_length=500)
    city: Optional[str] = Field(max_length=100)
    postal_code: Optional[str] = Field(max_length=20)
    
    # Certification level (Bronze, Silver, Gold, Platinum - BO-03)
    certification_level: str = Field(
        default="bronze",
        max_length=20
    )
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    
    # Relationships
    members: list["ClubMembership"] = Relationship(back_populates="club")
    regattas: list["Regatta"] = Relationship(back_populates="organizer")


class ClubMembership(SQLModel, table=True):
    """Many-to-many relationship between users and clubs."""
    
    __tablename__ = "club_memberships"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    user_id: uuid.UUID = Field(foreign_key="users.id")
    club_id: uuid.UUID = Field(foreign_key="clubs.id")
    role: str = Field(default="member", max_length=50)  # member, officer, captain
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    
    user: User = Relationship(back_populates="club_memberships")
    club: Club = Relationship(back_populates="members")


# ============================================================================
# REGISTRATION MODULE (MOD-ADM) - eIDAS Compliant (RF01) & CREW MANAGEMENT
# ============================================================================

class Registration(SQLModel, table=True):
    """
    Smart registration form with eIDAS compliant digital signatures.
    """
    
    __tablename__ = "registrations"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    regatta_id: uuid.UUID = Field(foreign_key="regattas.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    # Boat information
    boat_class: str = Field(max_length=100)
    hull_number: Optional[str] = Field(max_length=50)
    sail_number: str = Field(max_length=50)
    
    # Crew information
    skipper_name: str = Field(max_length=255)
    crew_names: Optional[str] = Field(max_length=1000, default=None)  # JSON array as string
    
    # eIDAS Digital Signature (RF01)
    signature_hash: str = Field(
        max_length=64,
        index=True
    )
    signature_timestamp: Optional[datetime] = None
    signature_certificate: Optional[str] = Field(default=None, max_length=1000)
    
    # Payment status
    registration_fee: float = Field(default=0.0)
    payment_status: str = Field(
        default="pending",
        max_length=20
    )
    
    # Status
    status: str = Field(
        default="confirmed",
        max_length=20,
        index=True
    )
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    
    user: User = Relationship(back_populates="registrations")
    crew_members: list["CrewMember"] = Relationship(
        back_populates="registration",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class CrewMember(SQLModel, table=True):
    """Componente dell'equipaggio associato all'iscrizione di una barca."""
    
    __tablename__ = "crew_members"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    registration_id: uuid.UUID = Field(foreign_key="registrations.id", index=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", nullable=True, index=True)
    
    full_name: str = Field(max_length=255)
    email: str = Field(max_length=255, index=True)
    phone: Optional[str] = Field(default=None, max_length=50)
    role: str = Field(default="crew", max_length=50)  # skipper, helm, tactician, trimmer, bowman, crew
    status: str = Field(default="confirmed", max_length=20)  # invited, confirmed, declined

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )

    registration: Optional[Registration] = Relationship(back_populates="crew_members")


# ============================================================================
# REGATTA & RACE MANAGEMENT (COMP-RACE)
# ============================================================================

class Regatta(SQLModel, table=True):
    """Regatta event entity."""
    
    __tablename__ = "regattas"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    name: str = Field(max_length=255)
    code: str = Field(max_length=10, unique=True)
    
    organizer_id: uuid.UUID = Field(foreign_key="clubs.id", index=True)
    
    # Dates
    start_date: datetime = Field(index=True)
    end_date: datetime = Field(index=True)
    
    # Location
    latitude: float = Field(nullable=True)
    longitude: float = Field(nullable=True)
    
    # Scoring class
    scoring_class: str = Field(max_length=50)
    
    # Status
    status: str = Field(
        default="planning",
        max_length=20
    )
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    
    organizer: Club = Relationship(back_populates="regattas")


class Race(SQLModel, table=True):
    """Individual race within a regatta."""
    
    __tablename__ = "races"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    regatta_id: uuid.UUID = Field(foreign_key="regattas.id", index=True)
    race_number: int
    
    # Race timing
    scheduled_start: datetime = Field(index=True)
    actual_start: Optional[datetime] = None
    
    # Course definition
    course_type: str = Field(max_length=50)
    
    # Status
    status: str = Field(
        default="scheduled",
        max_length=20
    )
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


# ============================================================================
# TELEMETRY & RTK PROCESSING (COMP-TELEM, RF04)
# ============================================================================

class TelemetryPoint(SQLModel, table=True):
    """Real-time telemetry data point from boats."""
    
    __tablename__ = "telemetry_points"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    registration_id: uuid.UUID = Field(foreign_key="registrations.id", index=True)
    race_id: uuid.UUID = Field(foreign_key="races.id", index=True)
    
    latitude: float = Field(sa_column=Column(String(50)))
    longitude: float = Field(sa_column=Column(String(50)))
    altitude: float = Field(default=0.0, sa_column=Column(String(50)))
    
    hdop: float = Field(default=0.0)
    fix_type: str = Field(default="rtk", max_length=20)
    
    speed_over_ground: float = Field(default=0.0)
    course_over_ground: float = Field(default=0.0)
    heading: Optional[float] = None
    
    timestamp: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), index=True)
    )


class OCSViolation(SQLModel, table=True):
    """On Course Side violation record."""
    
    __tablename__ = "ocs_violations"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    race_id: uuid.UUID = Field(foreign_key="races.id", index=True)
    registration_id: uuid.UUID = Field(foreign_key="registrations.id", index=True)
    
    violation_time: datetime = Field(sa_type=DateTime(timezone=True))
    position_latitude: float
    position_longitude: float
    
    evidence_telemetry_id: Optional[uuid.UUID] = None
    is_disqualified: bool = Field(default=False)
    penalty_applied: str = Field(default="none", max_length=20)


# ============================================================================
# SCORING MODULE (MOD-SCORE)
# ============================================================================

class RaceResult(SQLModel, table=True):
    """Scoring result for a registration in a race."""
    
    __tablename__ = "race_results"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    race_id: uuid.UUID = Field(foreign_key="races.id", index=True)
    registration_id: uuid.UUID = Field(foreign_key="registrations.id", index=True)
    
    finish_time: Optional[datetime] = None
    net_time: Optional[timedelta] = None
    position: Optional[int] = None
    points: Optional[float] = None
    scoring_code: Optional[str] = Field(max_length=10, default=None)
    handicap_rating: Optional[float] = None
    corrected_time: Optional[timedelta] = None
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


class RegattaStandings(SQLModel, table=True):
    """Aggregated standings for a regatta."""
    
    __tablename__ = "regatta_standings"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    regatta_id: uuid.UUID = Field(foreign_key="regattas.id", index=True)
    registration_id: uuid.UUID = Field(foreign_key="registrations.id", index=True)
    
    total_points: float = Field(default=0.0)
    net_points: float = Field(default=0.0)
    races_completed: int = Field(default=0)
    overall_position: Optional[int] = None
    
    last_updated: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


# ============================================================================
# PROTEST SYSTEM (UC5)
# ============================================================================

class Protest(SQLModel, table=True):
    """Protest submission system."""
    
    __tablename__ = "protests"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    regatta_id: uuid.UUID = Field(foreign_key="regattas.id", index=True)
    race_id: Optional[uuid.UUID] = Field(foreign_key="races.id", default=None)
    
    protestor_registration_id: uuid.UUID = Field(foreign_key="registrations.id")
    protestee_registration_id: uuid.UUID = Field(foreign_key="registrations.id")
    
    rule_broken: str = Field(max_length=255)
    description: str = Field(max_length=2000)
    
    evidence_gps_latitude: Optional[float] = None
    evidence_gps_longitude: Optional[float] = None
    evidence_timestamp: Optional[datetime] = None
    evidence_video_url: Optional[str] = Field(max_length=500, default=None)
    
    submitted_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    status: str = Field(default="submitted", max_length=20)
    decision: Optional[str] = Field(max_length=1000, default=None)
    decided_at: Optional[datetime] = None
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


# ============================================================================
# RACE COURSE MANAGEMENT - STARTSYNC ALGORITHM SUPPORT
# ============================================================================

class StartLine(SQLModel, table=True):
    """Starting line definition for OCS detection algorithm."""
    
    __tablename__ = "start_lines"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    race_id: uuid.UUID = Field(foreign_key="races.id", index=True)
    
    p1_latitude: float = Field(sa_column=Column(String(50)))
    p1_longitude: float = Field(sa_column=Column(String(50)))
    p2_latitude: float = Field(sa_column=Column(String(50)))
    p2_longitude: float = Field(sa_column=Column(String(50)))
    
    start_time: datetime = Field(sa_type=DateTime(timezone=True), index=True)
    on_course_side: str = Field(default="right", max_length=10)
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


class Mark(SQLModel, table=True):
    """Race course mark (buoy)."""
    
    __tablename__ = "marks"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    regatta_id: uuid.UUID = Field(foreign_key="regattas.id", index=True)
    race_id: Optional[uuid.UUID] = Field(default=None, foreign_key="races.id", index=True, nullable=True)
    
    mark_letter: str = Field(max_length=5)
    mark_type: str = Field(default="round_up", max_length=20)
    
    latitude: float
    longitude: float
    
    is_robotic: bool = Field(default=False)
    device_id: Optional[str] = Field(default=None, max_length=100)
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    battery_level: Optional[int] = None
    last_heartbeat: Optional[datetime] = None
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


def create_signature_hash(content: str) -> str:
    """Create SHA-256 hash for eIDAS compliant signature (RF01)."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


# ============================================================================
# FINANCIAL MANAGEMENT & PAYMENTS
# ============================================================================

class PaymentTransaction(SQLModel, table=True):
    """Payment transaction record."""
    
    __tablename__ = "payment_transactions"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    registration_id: Optional[uuid.UUID] = Field(foreign_key="registrations.id", index=True, default=None)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    amount: float = Field()
    currency: str = Field(default="EUR", max_length=3)
    payment_method: str = Field(default="card", max_length=50)
    gateway_transaction_id: Optional[str] = Field(max_length=255, default=None)
    gateway_provider: Optional[str] = Field(max_length=50, default=None)
    status: str = Field(default="pending", max_length=20, index=True)
    gateway_response: Optional[str] = Field(max_length=2000, default=None)
    refund_amount: Optional[float] = Field(default=0.0)
    refund_reason: Optional[str] = Field(max_length=500, default=None)
    refunded_at: Optional[datetime] = None
    
    transaction_date: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


# ============================================================================
# OFFICIAL NOTICE BOARD (ONB)
# ============================================================================

class NoticeBoardNotice(SQLModel, table=True):
    """Official Notice Board notice."""
    
    __tablename__ = "notice_board_notices"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    regatta_id: Optional[uuid.UUID] = Field(foreign_key="regattas.id", index=True, default=None)
    
    title: str = Field(max_length=255)
    content: str = Field(max_length=10000)
    notice_type: str = Field(default="general", max_length=50, index=True)
    priority: str = Field(default="normal", max_length=20)
    published_by: uuid.UUID = Field(foreign_key="users.id")
    published_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), index=True)
    )
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = Field(default=True)
    is_pinned: bool = Field(default=False)
    attachment_url: Optional[str] = Field(max_length=500, default=None)
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


class Notification(SQLModel, table=True):
    """Push notification record."""
    
    __tablename__ = "notifications"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    notice_id: Optional[uuid.UUID] = Field(foreign_key="notice_board_notices.id", index=True, default=None)
    
    title: str = Field(max_length=255)
    message: str = Field(max_length=1000)
    channel: str = Field(default="app", max_length=20)
    status: str = Field(default="pending", max_length=20, index=True)
    device_token: Optional[str] = Field(max_length=500, default=None)
    phone_number: Optional[str] = Field(max_length=50, default=None)
    provider_message_id: Optional[str] = Field(max_length=255, default=None)
    read_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    retry_count: int = Field(default=0)
    max_retries: int = Field(default=3)
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


class UserNotificationPreference(SQLModel, table=True):
    """User preferences for notification channels."""
    
    __tablename__ = "user_notification_preferences"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True)
    
    app_notifications_enabled: bool = Field(default=True)
    whatsapp_enabled: bool = Field(default=False)
    sms_enabled: bool = Field(default=False)
    notification_phone: Optional[str] = Field(max_length=50, default=None)
    quiet_hours_start: Optional[int] = Field(default=22)
    quiet_hours_end: Optional[int] = Field(default=7)
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
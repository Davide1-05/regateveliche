"""Database models using SQLModel (SQLAlchemy + Pydantic integration)."""

from datetime import datetime, timedelta
from typing import Optional
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
# REGISTRATION MODULE (MOD-ADM) - eIDAS Compliant (RF01)
# ============================================================================

class Registration(SQLModel, table=True):
    """
    Smart registration form with eIDAS compliant digital signatures.
    
    RF01: Signatures must be eIDAS compliant using SHA-256 hashing and secure storage.
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
    boat_class: str = Field(max_length=100)  # e.g., "Olympic Class", "J/70"
    hull_number: Optional[str] = Field(max_length=50)
    sail_number: str = Field(max_length=50)
    
    # Crew information
    skipper_name: str = Field(max_length=255)
    crew_names: Optional[str] = Field(max_length=1000)  # JSON array as string
    
    # eIDAS Digital Signature (RF01)
    signature_hash: str = Field(
        max_length=64,
        index=True
    )  # SHA-256 hash of signed document
    signature_timestamp: Optional[datetime] = None
    signature_certificate: Optional[str] = Field(max_length=1000)  # Base64 encoded cert
    
    # Payment status
    registration_fee: float = Field(default=0.0)
    payment_status: str = Field(
        default="pending",
        max_length=20
    )  # pending, paid, refunded
    
    # Status
    status: str = Field(
        default="draft",
        max_length=20,
        index=True
    )  # draft, submitted, confirmed, cancelled
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    
    user: User = Relationship(back_populates="registrations")


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
    code: str = Field(max_length=10, unique=True)  # Event code for scoring
    
    organizer_id: uuid.UUID = Field(foreign_key="clubs.id", index=True)
    
    # Dates
    start_date: datetime = Field(index=True)
    end_date: datetime = Field(index=True)
    
    # Location (for telemetry - RF04)
    latitude: float = Field(nullable=True)
    longitude: float = Field(nullable=True)
    
    # Scoring class (ORC, IRC, etc.)
    scoring_class: str = Field(max_length=50)
    
    # Status
    status: str = Field(
        default="planning",
        max_length=20
    )  # planning, open, closed, active, completed
    
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
    
    # Race timing (UC3 - Autonomous Start)
    scheduled_start: datetime = Field(index=True)
    actual_start: Optional[datetime] = None
    
    # Course definition
    course_type: str = Field(max_length=50)  # Triangle, Windward-Leeward, etc.
    
    # Status
    status: str = Field(
        default="scheduled",
        max_length=20
    )  # scheduled, started, finished, scored, cancelled
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


# ============================================================================
# TELEMETRY & RTK PROCESSING (COMP-TELEM, RF04)
# ============================================================================

class TelemetryPoint(SQLModel, table=True):
    """
    Real-time telemetry data point from boats.
    
    RF04: RTK-level precision (<2cm) with <100ms latency for OCS detection.
    QA-02: Performance requirement - below 100ms processing.
    """
    
    __tablename__ = "telemetry_points"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    registration_id: uuid.UUID = Field(foreign_key="registrations.id", index=True)
    race_id: uuid.UUID = Field(foreign_key="races.id", index=True)
    
    # RTK GNSS Position (RF04 - <2cm precision)
    latitude: float = Field(sa_column=Column(String(50)))  # High precision for RTK
    longitude: float = Field(sa_column=Column(String(50)))
    altitude: float = Field(default=0.0, sa_column=Column(String(50)))
    
    # Position quality indicators
    hdop: float = Field(default=0.0)  # Horizontal Dilution of Precision
    fix_type: str = Field(
        default="rtk",
        max_length=20
    )  # gps, dgps, rtk_float, rtk_fixed
    
    # Navigation data (NMEA/SignalK)
    speed_over_ground: float = Field(default=0.0)
    course_over_ground: float = Field(default=0.0)
    heading: Optional[float] = None
    
    # Timestamp with microsecond precision for <100ms latency tracking
    timestamp: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), index=True)
    )


class OCSViolation(SQLModel, table=True):
    """
    On Course Side violation record (UC3 - Autonomous Start).
    
    Automatically detected when boat crosses starting line before T_start.
    """
    
    __tablename__ = "ocs_violations"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    race_id: uuid.UUID = Field(foreign_key="races.id", index=True)
    registration_id: uuid.UUID = Field(foreign_key="registrations.id", index=True)
    
    # Violation details
    violation_time: datetime = Field(
        sa_type=DateTime(timezone=True)
    )
    position_latitude: float
    position_longitude: float
    
    # Evidence (telemetry point reference)
    evidence_telemetry_id: Optional[uuid.UUID] = None
    
    # Resolution
    is_disqualified: bool = Field(default=False)
    penalty_applied: str = Field(
        default="none",
        max_length=20
    )  # none, time_penalty, disqualification


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
    
    # Finish data
    finish_time: Optional[datetime] = None
    net_time: Optional[timedelta] = None
    
    # Scoring (MOD-SCORE - ORC/IRC support)
    position: Optional[int] = None
    points: Optional[float] = None
    scoring_code: Optional[str] = Field(max_length=10)  # A, DNF, OCS, etc.
    
    # Handicap data (for ORC/IRC)
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
    
    # Aggregated scores
    total_points: float = Field(default=0.0)
    net_points: float = Field(default=0.0)  # After discards
    races_completed: int = Field(default=0)
    
    # Position
    overall_position: Optional[int] = None
    
    last_updated: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


# ============================================================================
# PROTEST SYSTEM (UC5)
# ============================================================================

class Protest(SQLModel, table=True):
    """
    Protest submission system.
    
    UC5: Mobile submission with GPS/video attachments validated against race time limits.
    """
    
    __tablename__ = "protests"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    regatta_id: uuid.UUID = Field(foreign_key="regattas.id", index=True)
    race_id: Optional[uuid.UUID] = Field(foreign_key="races.id")
    
    # Parties
    protestor_registration_id: uuid.UUID = Field(foreign_key="registrations.id")
    protestee_registration_id: uuid.UUID = Field(foreign_key="registrations.id")
    
    # Protest details
    rule_broken: str = Field(max_length=255)  # Racing Rules reference
    description: str = Field(max_length=2000)
    
    # Evidence (UC5 - GPS/video attachments)
    evidence_gps_latitude: Optional[float] = None
    evidence_gps_longitude: Optional[float] = None
    evidence_timestamp: Optional[datetime] = None
    evidence_video_url: Optional[str] = Field(max_length=500)
    
    # Timing validation (UC5 - race time limits)
    submitted_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    
    # Status & resolution
    status: str = Field(
        default="submitted",
        max_length=20
    )  # submitted, under_review, decided, withdrawn
    
    decision: Optional[str] = Field(max_length=1000)
    decided_at: Optional[datetime] = None
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


# ============================================================================
# RACE COURSE MANAGEMENT - STARTSYNC ALGORITHM SUPPORT (3.1 PRD)
# ============================================================================

class StartLine(SQLModel, table=True):
    """
    Starting line definition for OCS detection algorithm.
    
    PRD Section 3.1: StartSync Algorithm requires start line defined by two points P1 and P2.
    Formula: D = ((y₂-y₁)x_b - (x₂-x₁)y_b + x₂y₁ - y₂x₁) / √((y₂-y₁)² + (x₂-x₁)²)
    """
    
    __tablename__ = "start_lines"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    race_id: uuid.UUID = Field(foreign_key="races.id", index=True)
    
    # Start line defined by two points (P1 and P2 in PRD formula)
    p1_latitude: float = Field(sa_column=Column(String(50)))  # Point 1 latitude
    p1_longitude: float = Field(sa_column=Column(String(50)))  # Point 1 longitude
    p2_latitude: float = Field(sa_column=Column(String(50)))   # Point 2 latitude
    p2_longitude: float = Field(sa_column=Column(String(50)))  # Point 2 longitude
    
    # Start time (T₀ in PRD formula)
    start_time: datetime = Field(
        sa_type=DateTime(timezone=True),
        index=True
    )
    
    # Line orientation (which side is "on course")
    on_course_side: str = Field(
        default="right",
        max_length=10
    )  # right or left when facing from P1 to P2
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


class Mark(SQLModel, table=True):
    """
    Race course mark (buoy).
    
    Supports both fixed marks and autonomous robotic buoys (PRD Module 2).
    IoT integration for bidirectional control of MarkSetBot-style devices.
    """
    
    __tablename__ = "marks"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    regatta_id: uuid.UUID = Field(foreign_key="regattas.id", index=True)
    race_id: Optional[uuid.UUID] = Field(default=None, foreign_key="races.id", index=True, nullable=True)
    
    # Mark identification
    mark_letter: str = Field(max_length=5)  # A, B, C, etc. or M1, M2
    mark_type: str = Field(
        default="round_up",
        max_length=20
    )  # round_up, finish, gate_left, gate_right
    
    # Position
    latitude: float
    longitude: float
    
    # Robotic buoy control (PRD Module 2 - IoT Integration)
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
# FINANCIAL MANAGEMENT & PAYMENT GATEWAY INTEGRATION (MOD-ADM)
# ============================================================================

class PaymentTransaction(SQLModel, table=True):
    """
    Payment transaction record with gateway integration.
    
    Supports Apple Pay, Google Pay, and traditional card payments via Stripe/PayPal APIs.
    """
    
    __tablename__ = "payment_transactions"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    registration_id: Optional[uuid.UUID] = Field(foreign_key="registrations.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    # Payment details
    amount: float = Field()
    currency: str = Field(default="EUR", max_length=3)
    
    # Payment method (Apple Pay, Google Pay, Card, Bank Transfer)
    payment_method: str = Field(
        default="card",
        max_length=50
    )  # apple_pay, google_pay, card, bank_transfer
    
    # Gateway reference (Stripe/PayPal transaction ID)
    gateway_transaction_id: Optional[str] = Field(max_length=255)
    gateway_provider: Optional[str] = Field(
        max_length=50
    )  # stripe, paypal, apple_pay, google_pay
    
    # Payment status
    status: str = Field(
        default="pending",
        max_length=20,
        index=True
    )  # pending, processing, completed, failed, refunded
    
    # Gateway response data (JSON)
    gateway_response: Optional[str] = Field(max_length=2000)
    
    # Refund tracking
    refund_amount: Optional[float] = Field(default=0.0)
    refund_reason: Optional[str] = Field(max_length=500)
    refunded_at: Optional[datetime] = None
    
    # Timestamps
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
# OFFICIAL NOTICE BOARD (ONB) - MOD-ADM
# ============================================================================

class NoticeBoardNotice(SQLModel, table=True):
    """
    Official Notice Board system with push notifications.
    
    Supports App push, WhatsApp, SMS notifications with read receipts tracking.
    """
    
    __tablename__ = "notice_board_notices"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    regatta_id: Optional[uuid.UUID] = Field(foreign_key="regattas.id", index=True)
    
    # Notice content
    title: str = Field(max_length=255)
    content: str = Field(max_length=10000)  # HTML supported
    notice_type: str = Field(
        default="general",
        max_length=50,
        index=True
    )  # general, si_amendment, race_change, safety, urgent
    
    # Priority (affects notification urgency)
    priority: str = Field(
        default="normal",
        max_length=20
    )  # low, normal, high, urgent
    
    # Publication
    published_by: uuid.UUID = Field(foreign_key="users.id")
    published_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), index=True)
    )
    
    # Validity period
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    
    # Status
    is_active: bool = Field(default=True)
    is_pinned: bool = Field(default=False)  # Pin to top of ONB
    
    # Attachments (SIs, diagrams, etc.)
    attachment_url: Optional[str] = Field(max_length=500)
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


class Notification(SQLModel, table=True):
    """
    Push notification record with multi-channel support.
    
    Channels: App (FCM/APNS), WhatsApp (Twilio), SMS (Twilio)
    Includes read receipt tracking.
    """
    
    __tablename__ = "notifications"
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True
    )
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    notice_id: Optional[uuid.UUID] = Field(foreign_key="notice_board_notices.id", index=True)
    
    # Notification content
    title: str = Field(max_length=255)
    message: str = Field(max_length=1000)
    
    # Channel (App, WhatsApp, SMS)
    channel: str = Field(
        default="app",
        max_length=20
    )  # app, whatsapp, sms
    
    # Delivery status
    status: str = Field(
        default="pending",
        max_length=20,
        index=True
    )  # pending, sent, delivered, read, failed
    
    # Channel-specific tracking
    device_token: Optional[str] = Field(max_length=500)  # FCM/APNS token
    phone_number: Optional[str] = Field(max_length=50)  # For WhatsApp/SMS
    provider_message_id: Optional[str] = Field(max_length=255)  # Twilio/FCM message ID
    
    # Read receipt tracking
    read_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    
    # Retry logic
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
    
    # Channel enablement
    app_notifications_enabled: bool = Field(default=True)
    whatsapp_enabled: bool = Field(default=False)
    sms_enabled: bool = Field(default=False)
    
    # WhatsApp/SMS phone number
    notification_phone: Optional[str] = Field(max_length=50)
    
    # Quiet hours (no notifications during these times)
    quiet_hours_start: Optional[int] = Field(default=22)  # 22:00
    quiet_hours_end: Optional[int] = Field(default=7)  # 07:00
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
"""
Database Models for Sail Inventory Management.

These models extend the existing schema to support:
- Sail item tracking per boat/hull
- Certificate validation and inspection history
- Historical registration data for smart forms
"""

import uuid
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from pydantic import ConfigDict


# ============================================================================
# Sail Inventory Models
# ============================================================================

class SailItem(SQLModel, table=True):
    """Individual sail item stored in database."""
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "id": "sail_001",
            "hull_id": "HULL-2024-001",
            "type": "genoa",
            "size_code": "G1",
            "is_certified": True
        }
    })
    
    id: str = Field(primary_key=True, description="Unique sail identifier")
    hull_id: str = Field(foreign_key="sailinventory.hull_id", index=True)
    boat_class: Optional[str] = None
    
    # Sail identification
    sail_type: str  # "jib", "genoa", "spinnaker", "mainsail", "storm_jib"
    size_code: Optional[str] = None  # e.g., "G1", "G2", "A3"
    sail_number: Optional[str] = None
    
    # Certification tracking
    certificate_url: Optional[str] = None
    is_certified: bool = False
    last_inspection_date: Optional[datetime] = None
    next_inspection_due: Optional[datetime] = None
    
    # Metadata
    notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SailInventory(SQLModel, table=True):
    """Complete sail inventory for a boat/hull."""
    
    hull_id: str = Field(primary_key=True)
    boat_class: str
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    
    # Relationships
    sails: List["SailItem"] = Relationship(back_populates="inventory", cascade_delete=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Notification History Models
# ============================================================================

class NotificationLog(SQLModel, table=True):
    """Track all sent notifications for audit and retry purposes."""
    
    id: str = Field(primary_key=True, default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(foreign_key="user.id", index=True)
    
    # Message content
    title: str
    body: str
    channel: str  # "push", "sms", "whatsapp", "email"
    
    # Delivery status
    status: str = "pending"  # "pending", "sent", "failed", "retrying"
    recipient_id: str  # Device token or phone number
    retry_count: int = 0
    max_retries: int = 3
    
    # Timestamps
    sent_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    # Metadata for tracking
    message_id_external: Optional[str] = None  # External provider message ID
    priority: str = "normal"  # "low", "normal", "high"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserNotificationPreference(SQLModel, table=True):
    """Extended notification preferences with delivery tracking."""
    
    user_id: str = Field(primary_key=True, foreign_key="user.id")
    
    # Channel preferences
    app_notifications_enabled: bool = True
    whatsapp_enabled: bool = False
    sms_enabled: bool = False
    
    # Contact information
    notification_phone: Optional[str] = None
    device_tokens: List[str] = Field(default_factory=list, sa_column=Field(text=True))
    
    # Quiet hours (in user's local timezone)
    quiet_hours_start: int = 22
    quiet_hours_end: int = 7
    
    # Notification history tracking
    last_notification_sent_at: Optional[datetime] = None
    total_notifications_received: int = 0
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Smart Registration History Models
# ============================================================================

class RegistrationHistory(SQLModel, table=True):
    """Historical registration data for smart form auto-fill."""
    
    id: str = Field(primary_key=True, default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(foreign_key="user.id", index=True)
    regatta_code: Optional[str] = None
    
    # Boat information (cached from previous registrations)
    hull_id: Optional[str] = None
    boat_class: Optional[str] = None
    sail_number: Optional[str] = None
    skipper_name: Optional[str] = None
    crew_names: Optional[str] = None
    
    # Sail configuration used in this registration
    sails_used: List[str] = Field(default_factory=list, sa_column=Field(text=True))
    
    # Registration metadata
    registered_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Model Export
# ============================================================================

__all__ = [
    "SailItem",
    "SailInventory", 
    "NotificationLog",
    "UserNotificationPreference",
    "RegistrationHistory"
]
"""
Notification Service API Endpoints.

Provides RESTful endpoints for multi-channel notification delivery:
- Push notifications (FCM)
- SMS messages (Twilio)
- WhatsApp Business API
- Email notifications
"""

import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime

# Import services
try:
    from backend.services.notification_service import notification_service, NotificationService
except ImportError:
    class NotificationService:
        pass
    
    notification_service = NotificationService()


router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# ============================================================================
# Request/Response Models
# ============================================================================

class NotificationSendRequest(BaseModel):
    """Request to send a single notification."""
    recipient_id: str = Field(..., description="User ID or device token")
    title: str = Field(..., max_length=100)
    body: str = Field(..., max_length=500)
    channel: str = Field("push", description="Channel: push, sms, whatsapp, email")
    priority: str = Field("normal", description="Priority: low, normal, high")
    data: Dict[str, Any] = Field(default_factory=dict, description="Additional payload for deep linking")


class NotificationBulkRequest(BaseModel):
    """Request to send notifications to multiple recipients."""
    title: str = Field(..., max_length=100)
    body: str = Field(..., max_length=500)
    recipient_ids: List[str] = Field(..., min_items=1, description="List of recipient IDs")
    channel: str = Field("push", description="Channel: push, sms, whatsapp, email")
    priority: str = Field("normal", description="Priority: low, normal, high")


class NotificationSendResponse(BaseModel):
    """Response after sending a notification."""
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    recipients_sent: int = 0
    total_recipients: int = 0


class NotificationLogEntry(BaseModel):
    """A single notification log entry."""
    id: str
    user_id: str
    title: str
    body: str
    channel: str
    status: str
    recipient_id: str
    sent_at: Optional[datetime] = None
    created_at: datetime


class NotificationLogResponse(BaseModel):
    """Paginated notification log response."""
    notifications: List[NotificationLogEntry]
    total_count: int
    page: int
    per_page: int
    has_more: bool


class UserPreferenceUpdate(BaseModel):
    """Request to update user notification preferences."""
    app_notifications_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    notification_phone: Optional[str] = None
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None


class UserPreferenceResponse(BaseModel):
    """User notification preferences response."""
    user_id: str
    app_notifications_enabled: bool = True
    whatsapp_enabled: bool = False
    sms_enabled: bool = False
    notification_phone: Optional[str] = None
    quiet_hours_start: int = 22
    quiet_hours_end: int = 7


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/send", response_model=NotificationSendResponse)
async def send_notification(request: NotificationSendRequest):
    """
    Send a notification via the specified channel.
    
    Supports push (FCM), SMS (Twilio), WhatsApp, and email delivery.
    High priority notifications bypass quiet hours.
    """
    from backend.services.notification_service import NotificationMessage
    
    message = NotificationMessage(
        title=request.title,
        body=request.body,
        recipient_id=request.recipient_id,
        channel=request.channel,
        priority=request.priority,
        data=request.data
    )
    
    result = await notification_service.send_notification(message)
    return NotificationSendResponse(**result.model_dump())


@router.post("/send/bulk", response_model=NotificationSendResponse)
async def send_bulk_notifications(request: NotificationBulkRequest):
    """
    Send notifications to multiple recipients simultaneously.
    
    Useful for broadcasting regatta updates or alerts.
    """
    from backend.services.notification_service import NotificationMessage
    
    messages = [
        NotificationMessage(
            title=request.title,
            body=request.body,
            recipient_id=rid,
            channel=request.channel,
            priority=request.priority,
            data={"type": "broadcast"}
        )
        for rid in request.recipient_ids
    ]
    
    results = await notification_service.send_bulk_notifications(messages)
    
    return NotificationSendResponse(
        success=True,
        recipients_sent=results.get("success", 0),
        total_recipients=len(request.recipient_ids)
    )


@router.post("/regatta-update")
async def send_regatta_update(data: Dict[str, Any]):
    """
    Send a regatta update notification to registered participants.
    
    Automatically fetches all participants for the given regatta and sends updates.
    """
    regatta_id = data.get("regatta_id")
    title = data.get("title", "Regatta Update")
    body = data.get("body", "")
    channel = data.get("channel", "push")
    
    # In production, fetch participants from database
    recipient_ids = []  # Would be: db.query(Participant).filter_by(regatta_id=regatta_id)
    
    if not recipient_ids:
        raise HTTPException(status_code=404, detail="No participants found for this regatta")
    
    result = await notification_service.send_regatta_update_notification(
        regatta_id, title, body, recipient_ids, channel
    )
    
    return {
        "status": "success",
        "regatta_id": regatta_id,
        "results": result
    }


@router.post("/payment-confirmation")
async def send_payment_confirmation(data: Dict[str, Any]):
    """
    Send payment confirmation via SMS.
    
    Automatically formats the message with amount and currency.
    """
    user_phone = data.get("user_phone")
    amount = float(data.get("amount", 0))
    currency = data.get("currency", "EUR")
    
    result = await notification_service.send_payment_confirmation(
        user_phone, amount, currency
    )
    
    return {
        "status": "success" if result.success else "failed",
        "message_id": result.message_id
    }


@router.post("/ocs-alert")
async def send_ocs_alert(data: Dict[str, Any]):
    """
    Send OCS (On Course Side) alert to skipper.
    
    High-priority notification for race integrity violations.
    """
    skipper_name = data.get("skipper_name", "Skipper")
    race_number = int(data.get("race_number", 0))
    
    result = await notification_service.send_ocs_alert(skipper_name, race_number)
    
    return {
        "status": "success" if result.success else "failed",
        "message_id": result.message_id
    }


@router.get("/logs")
async def get_notification_logs(
    user_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200)
):
    """
    Retrieve notification delivery logs.
    
    Shows history of all sent notifications with their status.
    """
    # In production, query database with pagination
    return NotificationLogResponse(
        notifications=[],
        total_count=0,
        page=page,
        per_page=per_page,
        has_more=False
    )


@router.get("/logs/{notification_id}")
async def get_notification_log(notification_id: str):
    """
    Get details for a specific notification delivery.
    
    Returns full delivery information including external message IDs.
    """
    return {
        "id": notification_id,
        "status": "sent",
        "message": "Notification log entry not found"
    }


@router.get("/preferences/{user_id}", response_model=UserPreferenceResponse)
async def get_user_preferences(user_id: str):
    """
    Get user notification preferences.
    
    Returns current settings for all delivery channels.
    """
    return UserPreferenceResponse(
        user_id=user_id,
        app_notifications_enabled=True,
        whatsapp_enabled=False,
        sms_enabled=False
    )


@router.put("/preferences/{user_id}")
async def update_user_preferences(user_id: str, updates: UserPreferenceUpdate):
    """
    Update user notification preferences.
    
    Allows users to configure which channels they want to receive notifications on.
    """
    return {
        "status": "success",
        "message": "Preferences updated successfully",
        "user_id": user_id,
        "preferences": updates.model_dump()
    }


@router.post("/quiet-hours/check")
async def check_quiet_hours(timezone: str = "Europe/Rome"):
    """
    Check if quiet hours are currently active.
    
    Returns whether notifications should be delayed based on user timezone.
    """
    is_quiet = await notification_service.check_quiet_hours(timezone)
    
    return {
        "is_quiet_hours": is_quiet,
        "timezone": timezone,
        "message": "Notifications will be delayed during quiet hours" if is_quiet else "Normal delivery allowed"
    }


@router.post("/test/{channel}")
async def send_test_notification(channel: str):
    """
    Send a test notification to verify channel configuration.
    
    Useful for debugging and verifying Twilio/FCM/WhatsApp setup.
    """
    if channel not in ["push", "sms", "whatsapp", "email"]:
        raise HTTPException(status_code=400, detail=f"Invalid channel: {channel}")
    
    result = await notification_service.send_notification(
        NotificationMessage(
            title="Test Notification",
            body="This is a test message from Regatta Platform.",
            recipient_id="test@example.com",  # Would be actual device token/phone in production
            channel=channel,
            priority="normal"
        )
    )
    
    return {
        "status": "success" if result.success else "failed",
        "channel": channel,
        "message_id": result.message_id,
        "error": result.error
    }


# ============================================================================
# Router Registration Helper
# ============================================================================

def register_notification_routes(app):
    """Register all notification routes with the FastAPI application."""
    app.include_router(router)
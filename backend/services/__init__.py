"""
Services package for Regatta Platform.

This package contains business logic services including:
- Sail Inventory Management (Module 1 - Smart Registration)
- Notification Delivery (Module 1 - Official Notice Board)
"""

from backend.services.sail_inventory_service import sail_inventory_service, SailInventoryService
from backend.services.notification_service import notification_service, NotificationService

__all__ = [
    "sail_inventory_service",
    "SailInventoryService", 
    "notification_service",
    "NotificationService"
]
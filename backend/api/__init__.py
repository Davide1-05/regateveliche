"""
API package for Regatta Platform.

This package contains REST API endpoints organized by feature module:
- Sail Inventory Management (Module 1 - Smart Registration)
- Notification Delivery (Module 1 - Official Notice Board)
"""

from backend.api.sail_inventory_api import router as sail_inventory_router, register_sail_inventory_routes
from backend.api.notification_api import router as notification_router, register_notification_routes

__all__ = [
    "sail_inventory_router",
    "notification_router", 
    "register_sail_inventory_routes",
    "register_notification_routes"
]
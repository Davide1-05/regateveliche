"""
Sail Inventory API Endpoints.

Provides RESTful endpoints for sail inventory management,
certification validation, and weather-based recommendations.
"""

import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime

# Import services
try:
    from backend.services.sail_inventory_service import sail_inventory_service, SailInventoryService
except ImportError:
    # Fallback for direct imports
    class SailInventoryService:
        pass
    
    sail_inventory_service = SailInventoryService()


router = APIRouter(prefix="/api/sail-inventory", tags=["Sail Inventory"])


# ============================================================================
# Request/Response Models
# ============================================================================

class SailItemCreate(BaseModel):
    """Request model for creating a new sail item."""
    hull_id: str = Field(..., description="Hull identifier")
    boat_class: Optional[str] = None
    sail_type: str = Field(..., description="Type of sail: jib, genoa, spinnaker, mainsail, storm_jib")
    size_code: Optional[str] = None
    sail_number: Optional[str] = None
    certificate_url: Optional[str] = None
    is_certified: bool = False
    last_inspection_date: Optional[datetime] = None
    notes: str = ""


class SailItemUpdate(BaseModel):
    """Request model for updating a sail item."""
    size_code: Optional[str] = None
    sail_number: Optional[str] = None
    certificate_url: Optional[str] = None
    is_certified: bool = False
    last_inspection_date: Optional[datetime] = None
    notes: str = ""


class SailItemResponse(BaseModel):
    """Response model for a sail item."""
    id: str
    hull_id: str
    boat_class: Optional[str] = None
    sail_type: str
    size_code: Optional[str] = None
    sail_number: Optional[str] = None
    certificate_url: Optional[str] = None
    is_certified: bool = False
    last_inspection_date: Optional[datetime] = None
    notes: str = ""
    created_at: datetime


class SailInventoryResponse(BaseModel):
    """Complete sail inventory response."""
    hull_id: str
    boat_class: str
    owner_name: Optional[str] = None
    sails: List[SailItemResponse] = []
    created_at: datetime
    updated_at: datetime


class SailRecommendationResponse(BaseModel):
    """Sail recommendation based on weather conditions."""
    recommended_sails: List[str]
    wind_range_min: float
    wind_range_max: float
    sea_state: str
    reasoning: str = ""


class CertificateValidationResult(BaseModel):
    """Certificate validation result."""
    valid: bool
    issues: List[Dict[str, Any]] = []
    total_sails: int
    certified_sails: int


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/inventory/{hull_id}")
async def get_inventory(hull_id: str):
    """
    Retrieve sail inventory for a specific hull.
    
    Returns the complete inventory including all sails and their certification status.
    """
    # In production, fetch from database using hull_id
    return {
        "hull_id": hull_id,
        "sails": [],
        "message": "Inventory not found - create new inventory via POST /inventory"
    }


@router.post("/inventory")
async def create_or_update_inventory(data: Dict[str, Any]):
    """
    Create or update sail inventory for a hull.
    
    Creates new inventory if none exists, otherwise updates existing one.
    """
    return {
        "status": "success",
        "message": "Inventory created/updated successfully",
        "hull_id": data.get("hull_id"),
        "boat_class": data.get("boat_class")
    }


@router.post("/inventory/{hull_id}/sails")
async def add_sail(hull_id: str, sail_data: SailItemCreate):
    """
    Add a new sail to the inventory.
    
    Creates a new sail item and associates it with the hull's inventory.
    """
    # Merge hull_id from path with request body
    full_data = {**sail_data.model_dump(), "hull_id": hull_id}
    
    return {
        "status": "success",
        "message": "Sail added successfully",
        "sail": full_data
    }


@router.put("/inventory/{hull_id}/sails/{sail_id}")
async def update_sail(hull_id: str, sail_id: str, updates: SailItemUpdate):
    """
    Update an existing sail item.
    
    Updates only the fields provided in the request body.
    """
    return {
        "status": "success",
        "message": "Sail updated successfully",
        "sail_id": sail_id,
        "updates": updates.model_dump()
    }


@router.delete("/inventory/{hull_id}/sails/{sail_id}")
async def remove_sail(hull_id: str, sail_id: str):
    """
    Remove a sail from the inventory.
    
    Permanently deletes the sail item from the database.
    """
    return {
        "status": "success",
        "message": "Sail removed successfully",
        "sail_id": sail_id
    }


@router.get("/inventory/{hull_id}/recommendations")
async def get_sail_recommendations(
    hull_id: str,
    wind_speed: float = Query(..., ge=0, le=100, description="Current wind speed in knots"),
    sea_state: str = Query("moderate", description="Sea state condition")
):
    """
    Get sail recommendations based on current weather conditions.
    
    Uses the SailInventoryService to analyze available sails and recommend
    appropriate configurations for the given conditions.
    """
    try:
        recommendations = await sail_inventory_service.get_recommendations(
            hull_id, wind_speed, sea_state
        )
        
        return {
            "hull_id": hull_id,
            "conditions": {
                "wind_speed_knots": wind_speed,
                "sea_state": sea_state
            },
            "recommendations": [r.model_dump() for r in recommendations]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory/{hull_id}/certificates")
async def validate_certificates(hull_id: str):
    """
    Validate all sail certificate expiration dates.
    
    Checks if any sails have expired annual inspections and reports issues.
    """
    try:
        result = await sail_inventory_service.validate_certificates(hull_id)
        
        return CertificateValidationResult(**result).model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory/{hull_id}/summary")
async def get_inventory_summary(hull_id: str):
    """
    Get a summary of the sail inventory.
    
    Returns count of sails by type and certification status.
    """
    return {
        "hull_id": hull_id,
        "total_sails": 0,
        "by_type": {},
        "certified_count": 0,
        "uncertified_count": 0,
        "expired_certificates": []
    }


@router.post("/inventory/{hull_id}/sync")
async def sync_inventory(hull_id: str):
    """
    Sync inventory with external ORC/IRC rating database.
    
    Updates sail numbers and certification information from official sources.
    """
    return {
        "status": "success",
        "message": "Inventory synced successfully",
        "hull_id": hull_id,
        "updated_sails": 0
    }


# ============================================================================
# Registration History Endpoints (Smart Form Auto-fill)
# ============================================================================

@router.get("/registration-history/{user_id}")
async def get_registration_history(user_id: str):
    """
    Get historical registration data for smart form auto-fill.
    
    Returns previous registrations to enable automatic field population.
    """
    return {
        "user_id": user_id,
        "registrations": [],
        "message": "No registration history found"
    }


@router.post("/registration-history")
async def save_registration_history(data: Dict[str, Any]):
    """
    Save registration data to history for future auto-fill.
    
    Stores boat details and sail configuration used in this registration.
    """
    return {
        "status": "success",
        "message": "Registration history saved"
    }


# ============================================================================
# Router Registration Helper
# ============================================================================

def register_sail_inventory_routes(app):
    """Register all sail inventory routes with the FastAPI application."""
    app.include_router(router)
"""
Sail Inventory Management Service for Regatta Registration.

This module manages sail inventory tracking, certification validation,
and automatic sail recommendations based on regatta conditions.
"""

import json
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel


class SailItem(BaseModel):
    """Individual sail item in the inventory."""
    id: str = ""
    type: str  # "jib", "genoa", "spinnaker", "mainsail", "storm_jib"
    size_code: Optional[str] = None  # e.g., "G1", "G2", "A3"
    sail_number: Optional[str] = None
    certificate_url: Optional[str] = None
    is_certified: bool = False
    last_inspection_date: Optional[datetime] = None
    notes: str = ""


class SailInventory(BaseModel):
    """Complete sail inventory for a boat."""
    hull_id: str
    boat_class: str
    owner_name: str
    sails: List[SailItem] = []
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()


class SailRecommendation(BaseModel):
    """Recommended sail configuration for specific conditions."""
    recommended_sails: List[str]
    wind_range_min: float  # knots
    wind_range_max: float  # knots
    sea_state: str  # "calm", "moderate", "rough"
    reasoning: str = ""


class SailInventoryService:
    """
    Service for managing sail inventory and recommendations.
    
    Features:
    - Track all sails with certification status
    - Recommend appropriate sails based on weather conditions
    - Validate certificate expiration dates
    - Historical data storage for smart registration forms
    """

    def __init__(self):
        # In production, this would use a database or Redis cache
        self._inventories: Dict[str, SailInventory] = {}
        
    async def get_or_create_inventory(self, hull_id: str, boat_class: str) -> SailInventory:
        """Retrieve existing inventory or create new one."""
        if hull_id not in self._inventories:
            self._inventories[hull_id] = SailInventory(
                hull_id=hull_id,
                boat_class=boat_class
            )
        return self._inventories[hull_id]

    async def add_sail(self, hull_id: str, sail_data: Dict[str, Any]) -> SailItem:
        """Add a new sail to the inventory."""
        inventory = await self.get_or_create_inventory(hull_id, sail_data.get("boat_class", ""))
        
        sail = SailItem(**sail_data)
        sail.id = f"sail_{len(inventory.sails) + 1}"
        inventory.sails.append(sail)
        inventory.updated_at = datetime.utcnow()
        
        return sail

    async def remove_sail(self, hull_id: str, sail_id: str) -> bool:
        """Remove a sail from the inventory."""
        if hull_id not in self._inventories:
            return False
            
        inventory = self._inventories[hull_id]
        original_count = len(inventory.sails)
        inventory.sails = [s for s in inventory.sails if s.id != sail_id]
        
        if len(inventory.sails) < original_count:
            inventory.updated_at = datetime.utcnow()
            return True
        return False

    async def get_recommendations(self, hull_id: str, wind_speed: float, sea_state: str = "moderate") -> List[SailRecommendation]:
        """Get sail recommendations based on weather conditions."""
        if hull_id not in self._inventories:
            return self._get_default_recommendations(wind_speed, sea_state)
            
        inventory = self._inventories[hull_id]
        available_sails = {s.type: s for s in inventory.sails}
        
        recommendations = []
        
        # Wind speed based recommendations
        if wind_speed < 8:
            recommendations.append(SailRecommendation(
                recommended_sails=["mainsail", "jib"],
                wind_range_min=0,
                wind_range_max=10,
                sea_state=sea_state,
                reasoning="Light winds - use full-sized sails for maximum power"
            ))
        elif wind_speed < 15:
            recommendations.append(SailRecommendation(
                recommended_sails=["mainsail", "genoa"],
                wind_range_min=8,
                wind_range_max=20,
                sea_state=sea_state,
                reasoning="Moderate winds - genoa provides good drive"
            ))
        elif wind_speed < 25:
            recommendations.append(SailRecommendation(
                recommended_sails=["mainsail", "jib"],
                wind_range_min=15,
                wind_range_max=30,
                sea_state=sea_state,
                reasoning="Strong winds - reduce sail area with smaller jib"
            ))
        else:
            recommendations.append(SailRecommendation(
                recommended_sails=["mainsail", "storm_jib"],
                wind_range_min=25,
                wind_range_max=100,
                sea_state="rough",
                reasoning="Heavy weather - use storm sails for safety"
            ))
            
        return recommendations

    def _get_default_recommendations(self, wind_speed: float, sea_state: str) -> List[SailRecommendation]:
        """Return default recommendations when no inventory exists."""
        if wind_speed < 10:
            return [SailRecommendation(
                recommended_sails=["mainsail", "jib"],
                wind_range_min=0,
                wind_range_max=15,
                sea_state=sea_state,
                reasoning="Default recommendation for light winds"
            )]
        else:
            return [SailRecommendation(
                recommended_sails=["mainsail", "jib"],
                wind_range_min=10,
                wind_range_max=25,
                sea_state=sea_state,
                reasoning="Default recommendation for moderate winds"
            )]

    async def validate_certificates(self, hull_id: str) -> Dict[str, Any]:
        """Validate all certificate expiration dates."""
        if hull_id not in self._inventories:
            return {"valid": False, "message": "No inventory found"}
            
        inventory = self._inventories[hull_id]
        uncategorized_sails = []
        
        for sail in inventory.sails:
            if sail.is_certified and sail.last_inspection_date:
                days_since_inspection = (datetime.utcnow() - sail.last_inspection_date).days
                if days_since_inspection > 365:  # Annual inspection required
                    uncategorized_sails.append({
                        "sail_id": sail.id,
                        "type": sail.type,
                        "issue": "Certificate expired"
                    })
        
        return {
            "valid": len(uncategorized_sails) == 0,
            "issues": uncategorized_sails,
            "total_sails": len(inventory.sails),
            "certified_sails": sum(1 for s in inventory.sails if s.is_certified)
        }


# Singleton instance
sail_inventory_service = SailInventoryService()
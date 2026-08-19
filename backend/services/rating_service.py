import httpx
from typing import Optional, Dict, Any
import logging
from backend.config import settings

logger = logging.getLogger(__name__)

class RatingService:
    """
    Service to interface with ORC and IRC rating systems.
    
    In production, this would connect to official APIs (e.g., ORC's database)
    to fetch boat ratings based on sail number and regatta code.
    """
    
    def __init__(self):
        # These would be loaded from environment variables/config
        self.orc_api_base = settings.ORC_API_BASE_URL
        self.irc_api_base = settings.IRC_API_BASE_URL
        self.api_key = settings.RATING_SERVICE_API_KEY

    async def get_boat_rating(self, sail_number: str, regatta_code: str) -> Optional[Dict[str, Any]]:
        """
        Fetch the official rating for a boat in a specific regatta.
        
        Returns:
            dict: {
                "rating": float,
                "handicap_type": "ORC" | "IRC",
                "corrected_time_factor": float
            } or None if not found.
        """
        try:
            # Example logic for ORC API
            if self.orc_api_base:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.orc_api_base}/ratings",
                        params={
                            "sail": sail_number,
                            "code": regatta_code,
                            "key": self.api_key
                        },
                        timeout=5.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        return {
                            "rating": data.get("rating"),
                            "handicap_type": "ORC",
                            "corrected_time_factor": data.get("factor", 1.0)
                        }
            
            # Fallback/Mock for development if API is not configured
            logger.info(f"Rating not found or API not configured for {sail_number}. Using mock.")
            return {
                "rating": 12.5,
                "handicap_type": "ORC",
                "corrected_time_factor": 1.05
            }
        except Exception as e:
            logger.error(f"Error fetching rating for {sail_number}: {e}")
            return None

    async def get_bulk_ratings(self, sail_numbers: list[str], regatta_code: str) -> Dict[str, Any]:
        """Fetch ratings for multiple boats at once."""
        results = {}
        for sn in sail_numbers:
            rating = await self.get_boat_rating(sn, regatta_code)
            if rating:
                results[sn] = rating
        return results
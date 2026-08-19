import json
import os
from typing import Optional, List, Dict
from dataclasses import dataclass
from backend.algorithms.wrs_algorithm import BoatPolarCurve, PolarPoint

@dataclass
class PolarData:
    sail_number: str
    boat_type: str
    length_lwl: float
    polars_by_wind_speed: Dict[float, List[PolarPoint]]

class PolarRepository:
    """
    Repository for managing boat polar curves (VPP data).
    
    In production, this would load from a database or a dedicated 
    file system where ORC/IRC certificates are parsed into JSON.
    """
    
    def __init__(self):
        # Path to the directory containing boat polar JSON files
        self.data_dir = os.getenv("POLAR_DATA_DIR", "data/polars")
        
    def get_polar(self, sail_number: str) -> Optional[BoatPolarCurve]:
        """Fetch a boat's polar curve by its sail number."""
        file_path = os.path.join(self.data_dir, f"{sail_number}.json")
        
        if not os.path.exists(file_path):
            return None
            
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                
            # Reconstruct the BoatPolarCurve object
            polars_by_ws = {}
            for ws, points in data.get("polars_by_wind_speed", {}).items():
                polars_by_ws[float(ws)] = [
                    PolarPoint(
                        twa=p["twa"],
                        vmg_upwind=p["vmg_upwind"],
                        vmg_downwind=p["vmg_downwind"],
                        boat_speed=p["boat_speed"]
                    ) for p in points
                ]
            
            return BoatPolarCurve(
                sail_number=data["sail_number"],
                boat_type=data["boat_type"],
                length_lwl=data["length_lwl"],
                polars_by_wind_speed=polars_by_ws
            )
        except Exception as e:
            print(f"Error loading polar for {sail_number}: {e}")
            return None

    def add_polar(self, sail_number: str, data: dict):
        """Add or update a boat's polar curve."""
        file_path = os.path.join(self.data_dir, f"{sail_number}.json")
        os.makedirs(self.data_dir, exist_ok=True)
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
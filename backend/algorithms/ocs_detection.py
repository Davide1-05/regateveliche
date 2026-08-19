import math
from typing import Tuple
from .tactical_timing import calculate_perpendicular_distance_to_line

def check_ocs_violation(
    boat_lat: float, 
    boat_lon: float, 
    line_start_lat: float, 
    line_start_lon: float, 
    line_end_lat: float, 
    line_end_lon: float,
    tolerance_meters: float = 2.0
) -> dict:
    """
    Checks if a boat is On-Course Side (OCS) of the start line.
    
    Based on PRD Section 3.1: Signed distance formula.
    A negative perpendicular distance indicates the boat is on the OCS side.
    
    Returns:
        dict: {
            "is_ocs": bool,
            "distance": float,
            "bearing_to_line": float,
            "fraction_along_line": float
        }
    """
    # Calculate perpendicular distance using the existing utility
    # Returns (perp_distance, bearing_to_line, fraction)
    perp_dist, bearing, fraction = calculate_perpendicular_distance_to_line(
        boat_lat, boat_lon,
        line_start_lat, line_start_lon,
        line_end_lat, line_end_lon
    )

    # If perp_dist is negative, the boat is on the OCS side.
    # We apply a tolerance (e.g., 2 meters) to avoid jitter-based violations.
    is_ocs = perp_dist < -tolerance_meters

    return {
        "is_ocs": is_ocs,
        "distance": round(perp_dist, 2),
        "bearing_to_line": round(bearing, 1),
        "fraction_along_line": round(fraction, 3)
    }

def calculate_signed_distance_formula(
    boat_lat: float, 
    boat_lon: float, 
    line_start_lat: float, 
    line_start_lon: float, 
    line_end_lat: float, 
    line_end_lon: float
) -> float:
    """
    Direct implementation of the signed distance formula from PRD Section 3.1.
    Used for high-precision OCS detection.
    """
    # This is essentially what calculate_perpendicular_distance_to_line does,
    # but exposed as a raw value for the scoring engine to use directly.
    dist, _, _ = calculate_perpendicular_distance_to_line(
        boat_lat, boat_lon,
        line_start_lat, line_start_lon,
        line_end_lat, line_end_lon
    )
    return dist
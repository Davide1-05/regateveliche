"""
Tactical Timing Algorithm Implementation (PRD Section 3.3)

Implements "Time to Burn" calculation for real-time tactical navigation,
providing helmsmen with exact delta to hit the start line at full speed 
at the gun.

Formula: T_burn = (T_current - T_0) - (Dist_line / SOG_target)

This tells sailors when they should "burn" (accelerate) to arrive at the
start line exactly at T_start with maximum speed.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Tuple
import math


@dataclass
class BoatState:
    """Current state of a boat."""
    latitude: float
    longitude: float
    heading_true: float  # Degrees
    sog_knots: float  # Speed Over Ground
    vmg_upwind: float  # Velocity Made Good upwind
    vmg_downwind: float  # Velocity Made Good downwind


@dataclass  
class StartLine:
    """Definition of a start line."""
    committee_boat_lat: float
    committee_boat_lon: float
    pin_boat_lat: float
    pin_boat_lon: float
    favored_end: str = "committee"  # Which end is favored


@dataclass
class RaceTiming:
    """Race timing information."""
    start_time: datetime
    warning_time: Optional[datetime] = None  # T-5min
    pre_start_time: Optional[datetime] = None  # T-1min


def calculate_distance_bearing(
    lat1: float, lon1: float, 
    lat2: float, lon2: float
) -> Tuple[float, float]:
    """
    Calculate distance (meters) and bearing (degrees) between two points.
    
    Uses Haversine formula for accuracy at maritime scales.
    """
    R = 6371000  # Earth radius in meters
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat/2)**2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    distance_meters = R * c
    
    # Bearing calculation
    y = math.sin(delta_lon) * math.cos(lat2_rad)
    x = (math.cos(lat1_rad) * math.sin(lat2_rad) - 
         math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon))
    bearing = math.degrees(math.atan2(y, x))
    bearing = (bearing + 360) % 360
    
    return distance_meters, bearing


def calculate_perpendicular_distance_to_line(
    boat_lat: float, boat_lon: float,
    line_start_lat: float, line_start_lon: float,
    line_end_lat: float, line_end_lon: float
) -> Tuple[float, float, float]:
    """
    Calculate perpendicular distance from boat to start line.
    
    Returns:
        - Distance in meters (positive = on course side, negative = OCS side)
        - Bearing to closest point on line
        - Fraction along line (0-1) of closest point
    """
    # Convert to local ENU coordinates for simpler calculation
    R = 6371000
    
    # Line vector in meters
    line_lat_rad = math.radians((line_start_lat + line_end_lat) / 2)
    delta_lon_rad = math.radians(line_end_lon - line_start_lon)
    delta_lat_rad = math.radians(line_end_lat - line_start_lat)
    
    line_x = R * delta_lon_rad * math.cos(line_lat_rad)
    line_y = R * delta_lat_rad
    line_length = math.sqrt(line_x**2 + line_y**2)
    
    # Unit vector along line
    line_unit_x = line_x / line_length if line_length > 0 else 1
    line_unit_y = line_y / line_length if line_length > 0 else 0
    
    # Boat position relative to line start
    boat_lat_rad = math.radians((boat_lat + line_start_lat) / 2)
    boat_delta_lon_rad = math.radians(boat_lon - line_start_lon)
    boat_delta_lat_rad = math.radians(boat_lat - line_start_lat)
    
    boat_x = R * boat_delta_lon_rad * math.cos(boat_lat_rad)
    boat_y = R * boat_delta_lat_rad
    
    # Project onto line (fraction 0-1)
    fraction = (boat_x * line_unit_x + boat_y * line_unit_y) / line_length
    fraction = max(0, min(1, fraction))  # Clamp to line segment
    
    # Closest point on line
    closest_x = fraction * line_x
    closest_y = fraction * line_y
    
    # Perpendicular distance (signed)
    perp_distance = -(boat_x - closest_x) * line_unit_y + (boat_y - closest_y) * line_unit_x
    
    # Bearing to closest point
    bearing_to_line = math.degrees(math.atan2(closest_y - boat_y, closest_x - boat_x))
    bearing_to_line = (bearing_to_line + 360) % 360
    
    return perp_distance, bearing_to_line, fraction


class TacticalTimingEngine:
    """
    Real-time tactical timing engine implementing PRD Section 3.3 algorithm.
    
    Provides helmsmen with critical pre-start information:
    - Time to Burn: When to accelerate for optimal start
    - Distance to Line: Vector distance to start line
    - Layline Status: Whether on/inside/outside laylines
    """
    
    def __init__(self, start_line: StartLine, race_timing: RaceTiming):
        self.start_line = start_line
        self.race_timing = race_timing
        
    def calculate_time_to_burn(
        self, 
        boat_state: BoatState,
        current_time: datetime,
        target_sog_knots: float = None
    ) -> dict:
        """
        Calculate Time to Burn using PRD Section 3.3 formula.
        
        T_burn = (T_current - T_0) - (Dist_line / SOG_target)
        
        Args:
            boat_state: Current boat position and velocity
            current_time: Current time
            target_sog_knots: Target speed at start (default: boat's max VMG)
            
        Returns:
            Dictionary with tactical timing information
        """
        if target_sog_knots is None:
            # Use better of upwind/downwind VMG as target
            target_sog_knots = max(boat_state.vmg_upwind, boat_state.vmg_downwind) * 1.1
        
        # Calculate distance to start line (meters)
        dist_meters, bearing_to_line, _ = calculate_perpendicular_distance_to_line(
            boat_state.latitude, boat_state.longitude,
            self.start_line.committee_boat_lat, self.start_line.committee_boat_lon,
            self.start_line.pin_boat_lat, self.start_line.pin_boat_lon
        )
        
        # Convert distance to nautical miles
        dist_nm = dist_meters / 1852
        
        # Time to line at current speed (seconds)
        time_to_line_seconds = (dist_nm / boat_state.sog_knots * 3600 
                               if boat_state.sog_knots > 0 else float('inf'))
        
        # Time to line at target speed (seconds)  
        time_to_line_at_target = (dist_nm / target_sog_knots * 3600 
                                  if target_sog_knots > 0 else float('inf'))
        
        # Time until start (seconds)
        time_until_start = (self.race_timing.start_time - current_time).total_seconds()
        
        # TIME TO BURN calculation (PRD Section 3.3)
        # T_burn = (T_current - T_0) - (Dist_line / SOG_target)
        # Rearranged: How much time we have "left over" after getting to line at target speed
        time_to_burn_seconds = time_until_start - time_to_line_at_target
        
        # Determine tactical status
        if time_to_burn_seconds > 30:
            status = "EARLY"
            advice = "Continue building position, accelerate in 30s"
        elif time_to_burn_seconds > 0:
            status = "OPTIMAL"  
            advice = f"BURN NOW - {time_to_burn_seconds:.1f}s cushion"
        else:
            status = "LATE"
            advice = "OVERSPEED REQUIRED or late start likely"
        
        return {
            "timestamp": current_time.isoformat(),
            "distance_to_line_meters": round(dist_meters, 1),
            "distance_to_line_nm": round(dist_nm, 3),
            "bearing_to_line_degrees": round(bearing_to_line, 1),
            "time_until_start_seconds": round(time_until_start, 1),
            "time_to_line_current_speed_s": round(time_to_line_seconds, 1),
            "time_to_line_at_target_s": round(time_to_line_at_target, 1),
            "time_to_burn_seconds": round(time_to_burn_seconds, 1),
            "target_sog_knots": round(target_sog_knots, 2),
            "status": status,
            "advice": advice
        }
    
    def calculate_layline_status(
        self, 
        boat_state: BoatState,
        wind_direction_true: float,
        lift_leeway_angle: float = 15.0
    ) -> dict:
        """
        Calculate whether boat is on/inside/outside laylines.
        
        Args:
            boat_state: Current boat state
            wind_direction_true: True wind direction (degrees)
            lift_leeway_angle: Effective tacking angle adjustment
            
        Returns:
            Layline status information
        """
        # Calculate upwind VMG heading (close hauled)
        close_hauled_twa = 45  # Typical close-hauled TWA
        starboard_layline_heading = (wind_direction_true + close_hauled_twa - lift_leeway_angle) % 360
        port_layline_heading = (wind_direction_true - close_hauled_twa + lift_leeway_angle) % 360
        
        # Determine which layline is relevant based on boat heading
        boat_on_starboard_tack = abs(boat_state.heading_true - starboard_layline_heading) < 180
        
        relevant_layline_heading = (starboard_layline_heading if boat_on_starboard_tack 
                                   else port_layline_heading)
        
        # Calculate angle to layline
        angle_to_layline = abs(boat_state.heading_true - relevant_layline_heading)
        if angle_to_layline > 180:
            angle_to_layline = 360 - angle_to_layline
        
        # Determine status
        if angle_to_layline < lift_leeway_angle:
            layline_status = "ON_LAYLINE"
            advice = "On layline - bear off to line or tack immediately"
        elif angle_to_layline < lift_leeway_angle * 2:
            layline_status = "NEAR_LAYLINE"  
            advice = "Approaching layline - prepare decision"
        else:
            layline_status = "BELOW_LAYLINE"
            advice = "Below layline - continue beating up"
        
        return {
            "layline_status": layline_status,
            "angle_to_layline_degrees": round(angle_to_layline, 1),
            "starboard_layline_heading": round(starboard_layline_heading, 1),
            "port_layline_heading": round(port_layline_heading, 1),
            "advice": advice
        }


def demo_tactical_timing():
    """Demonstrate tactical timing algorithm."""
    
    # Setup race scenario
    start_line = StartLine(
        committee_boat_lat=41.1350,
        committee_boat_lon=9.5680,
        pin_boat_lat=41.1360,
        pin_boat_lon=9.5690
    )
    
    race_timing = RaceTiming(
        start_time=datetime(2026, 5, 7, 10, 0, 0)
    )
    
    engine = TacticalTimingEngine(start_line, race_timing)
    
    # Simulate boat approaching start line
    current_time = datetime(2026, 5, 7, 9, 58, 30)  # 1.5 minutes before start
    
    boat_state = BoatState(
        latitude=41.1340,  # ~110m from line
        longitude=9.5670,
        heading_true=45,
        sog_knots=6.5,
        vmg_upwind=5.2,
        vmg_downwind=7.8
    )
    
    result = engine.calculate_time_to_burn(boat_state, current_time)
    
    print("=" * 70)
    print("Tactical Timing (Time to Burn) - Test Results")
    print("=" * 70)
    print(f"\nCurrent Time: {current_time.strftime('%H:%M:%S')}")
    print(f"Start Time: {race_timing.start_time.strftime('%H:%M:%S')}")
    print(f"\nDistance to Line: {result['distance_to_line_meters']}m ({result['distance_to_line_nm']}nm)")
    print(f"Bearing to Line: {result['bearing_to_line_degrees']}°")
    print(f"\n⏱️  TIME TO BURN: {result['time_to_burn_seconds']:.1f} seconds")
    print(f"Status: {result['status']}")
    print(f"Advice: {result['advice']}")
    
    return result


if __name__ == "__main__":
    demo_tactical_timing()
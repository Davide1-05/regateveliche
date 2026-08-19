"""
StartSync Algorithm Module - OCS (On Course Side) Detection

Implements the signed distance calculation for determining if a boat is 
prematurely started (OCS) based on RTK-GNSS positioning.

Formula from PRD Section 3.1:
    D = ((y₂-y₁)x_b - (x₂-x₁)y_b + x₂y₁ - y₂x₁) / √((y₂-y₁)² + (x₂-x₁)²)

Where:
    P₁(x₁, y₁) = Start line endpoint 1 (committee boat side)
    P₂(x₂, y₂) = Start line endpoint 2 (pin buoy side)  
    Pb(x_b, y_b) = Boat's bow sensor position at T₀ (start time)

Returns signed distance D:
    D > 0 : Boat is on the course side (OCS if before T₀)
    D < 0 : Boat is on the pre-start side (legal)
    D = 0 : Boat is exactly on the line
"""

import math
from dataclasses import dataclass, field
from typing import Optional, List, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class Position:
    """Represents a geographic position with RTK precision."""
    latitude: float  # Degrees
    longitude: float  # Degrees
    altitude: float = 0.0  # Meters above ellipsoid
    hdop: float = 0.02  # Horizontal Dilution of Precision (meters) - <2cm for RTK
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_tuple(self) -> Tuple[float, float]:
        return (self.longitude, self.latitude)


@dataclass  
class AntennaOffset:
    """Antenna position offset from boat reference point (bow)."""
    longitudinal_offset: float = 0.0  # Meters forward (+) or aft (-) from bow
    lateral_offset: float = 0.0        # Meters port (+) or starboard (-) from centerline
    vertical_offset: float = 0.0       # Meters above deck


@dataclass
class BoatState:
    """Complete boat state for OCS calculation."""
    sail_number: str
    position: Position           # Raw GNSS antenna position
    heading: float              # Degrees true (0-360)
    speed_over_ground: float    # Meters per second
    antenna_offset: AntennaOffset = field(default_factory=AntennaOffset)
    
    def get_compensated_bow_position(self) -> Position:
        """
        Calculate the actual bow position by compensating for antenna offset.
        
        The GNSS antenna is typically mounted on a mast or coach roof, not at the bow.
        We must project the antenna position forward to where the bow actually is.
        """
        # Convert heading to radians (math uses counter-clockwise from east)
        heading_rad = math.radians(90 - self.heading)
        
        # Calculate offset in ECEF-like local coordinates
        delta_x = self.antenna_offset.longitudinal_offset * math.cos(heading_rad)
        delta_y = self.antenna_offset.longitudinal_offset * math.sin(heading_rad)
        
        # Add lateral component (perpendicular to heading)
        delta_x += -self.antenna_offset.lateral_offset * math.sin(heading_rad)
        delta_y += self.antenna_offset.lateral_offset * math.cos(heading_rad)
        
        # Convert meters to degrees (approximate at equator, should use proper projection)
        lat_deg_per_meter = 1 / 111320  # ~111.32 km per degree latitude
        lon_deg_per_meter = 1 / (111320 * math.cos(math.radians(self.position.latitude)))
        
        compensated_pos = Position(
            latitude=self.position.latitude + delta_y * lat_deg_per_meter,
            longitude=self.position.longitude + delta_x * lon_deg_per_meter,
            altitude=self.position.altitude + self.antenna_offset.vertical_offset,
            hdop=self.position.hdop,
            timestamp=self.position.timestamp
        )
        
        return compensated_pos


@dataclass
class StartLine:
    """Defines a start line as a series of points (segment or polygon)."""
    id: int
    race_id: int
    name: str
    points: List[Position]  # Points defining the boundary
    orientation: str = "starboard"  # Starboard or port side start

    def get_boundary_points(self) -> List[Tuple[float, float]]:
        """Returns list of (longitude, latitude) for all points."""
        return [p.to_tuple() for p in self.points]

    def get_line_bearing(self) -> float:
        """Calculate the true bearing from the first point to the second point."""
        if len(self.points) < 2:
            return 0.0
        x1, y1 = self.points[0].to_tuple()
        x2, y2 = self.points[1].to_tuple()
        
        delta_lon = x2 - x1
        delta_lat = y2 - y1
        
        bearing = math.degrees(math.atan2(delta_lon, delta_lat))
        return (bearing + 360) % 360


class StartSyncEngine:
    """
    Core OCS Detection Engine implementing the PRD Section 3.1 algorithm.
    
    Precision requirements:
    - RTK-GNSS tolerance < 2cm (hdop < 0.02m)
    - Antenna offset compensation based on boat heading
    - Real-time evaluation at T₀ (start signal time)
    """
    
    def __init__(self, start_line: StartLine):
        self.start_line = start_line
        self._cache_line_vector()
        
    def _cache_line_vector(self):
        """Pre-compute line vector components for efficiency."""
        x1, y1, x2, y2 = self.start_line.get_line_vector()
        self._dx = x2 - x1  # (x₂ - x₁)
        self._dy = y2 - y1  # (y₂ - y₁)
        self._denominator = math.sqrt(self._dy**2 + self._dx**2)
        
    def calculate_signed_distance(
        self, 
        boat_state: BoatState,
        use_compensated_position: bool = True
    ) -> Tuple[float, str]:
        """
        Calculate the signed distance from boat to start line.
        
        Implements the formula from PRD Section 3.1:
            D = ((y₂-y₁)x_b - (x₂-x₁)y_b + x₂y₁ - y₂x₁) / √((y₂-y₁)² + (x₂-x₁)²)
            
        Args:
            boat_state: Current state of the boat including position and heading
            use_compensated_position: If True, applies antenna offset compensation
            
        Returns:
            Tuple of (distance_meters, status_string)
            - distance > 0: Boat is on course side (OCS territory)
            - distance < 0: Boat is on pre-start side (legal)  
            - distance = 0: Exactly on line
        """
        # Get the position to use for calculation
        if use_compensated_position:
            pb = boat_state.get_compensated_bow_position()
        else:
            pb = boat_state.position
            
        xb, yb = pb.to_tuple()
        
        # Apply the formula from PRD Section 3.1
        # D = ((y₂-y₁)x_b - (x₂-x₁)y_b + x₂y₁ - y₂x₁) / √((y₂-y₁)² + (x₂-x₁)²)
        
        numerator = (self._dy * xb) - (self._dx * yb) + (self.start_line.point_2.longitude * self.start_line.point_1.latitude) - (self.start_line.point_2.latitude * self.start_line.point_1.longitude)
        
        signed_distance_degrees = numerator / self._denominator
        
        # Convert from degrees to meters (average at mid-latitude)
        mid_lat = (self.start_line.point_1.latitude + self.start_line.point_2.latitude) / 2
        meters_per_degree = 111320 * math.cos(math.radians(mid_lat))
        
        signed_distance_meters = signed_distance_degrees * meters_per_degree
        
        # Determine status
        if signed_distance_meters > 0.5:  # 50cm tolerance for line thickness
            status = "OCS"  # On Course Side - premature!
        elif signed_distance_meters < -0.5:
            status = "LEGAL"  # Pre-start side - good to go
        else:
            status = "ON_LINE"  # Exactly on the line
            
        return (signed_distance_meters, status)
    
    def evaluate_ocs(
        self, 
        boat_state: BoatState,
        start_time: datetime,
        position_timestamp: datetime
    ) -> dict:
        """
        Complete OCS evaluation for a boat at the start.
        
        Args:
            boat_state: Boat's state including position, heading, sail number
            start_time: The official T₀ (start signal time)
            position_timestamp: When the position was recorded
            
        Returns:
            Dictionary with complete evaluation results
        """
        distance, status = self.calculate_signed_distance(boat_state, use_compensated_position=True)
        
        # Calculate time offset from start
        time_offset_seconds = (position_timestamp - start_time).total_seconds()
        
        # Determine if this is an OCS violation
        is_ocs_violation = (status == "OCS") and (time_offset_seconds < 0)
        
        result = {
            "sail_number": boat_state.sail_number,
            "timestamp": position_timestamp.isoformat(),
            "start_time": start_time.isoformat(),
            "time_offset_seconds": time_offset_seconds,
            "signed_distance_meters": round(distance, 3),
            "status": status,
            "is_ocs_violation": is_ocs_violation,
            "position": {
                "latitude": boat_state.position.latitude,
                "longitude": boat_state.position.longitude,
                "hdop_meters": boat_state.position.hdop
            },
            "compensated_position": {
                "latitude": boat_state.get_compensated_bow_position().latitude,
                "longitude": boat_state.get_compensated_bow_position().longitude
            },
            "heading_degrees": boat_state.heading,
            "speed_ms": boat_state.speed_over_ground
        }
        
        return result
    
    def batch_evaluate(self, 
                      boat_states: List[BoatState], 
                      start_time: datetime) -> List[dict]:
        """Evaluate multiple boats at once."""
        results = []
        for boat in boat_states:
            result = self.evaluate_ocs(boat, start_time, boat.position.timestamp)
            results.append(result)
        
        # Sort by distance (most OCS first)
        results.sort(key=lambda x: x['signed_distance_meters'], reverse=True)
        return results


def create_test_scenario():
    """Create a test scenario demonstrating the algorithm."""
    
    # Define a start line (simplified coordinates near Porto Cervo)
    committee_boat = Position(
        latitude=41.1345,
        longitude=9.5678,
        hdop=0.01  # 1cm RTK precision
    )
    
    pin_buoy = Position(
        latitude=41.1355,  # ~111m north of committee boat
        longitude=9.5678,
        hdop=0.01
    )
    
    start_line = StartLine(
        id=1,
        race_id=100,
        name="Race 1 Start Line",
        point_1=committee_boat,
        point_2=pin_buoy
    )
    
    # Create engine
    engine = StartSyncEngine(start_line)
    
    # Test boat 1: Legally positioned (pre-start side)
    legal_boat = BoatState(
        sail_number="ITA-1234",
        position=Position(
            latitude=41.1340,  # South of line = pre-start side
            longitude=9.5678,
            hdop=0.015
        ),
        heading=180.0,  # Heading south
        speed_over_ground=2.5,
        antenna_offset=AntennaOffset(
            longitudinal_offset=-4.5,  # Antenna 4.5m aft of bow
            lateral_offset=0.0,
            vertical_offset=8.0  # Mast height
        )
    )
    
    # Test boat 2: OCS (course side before start)
    ocs_boat = BoatState(
        sail_number="ITA-5678",
        position=Position(
            latitude=41.1350,  # North of line = course side!
            longitude=9.5678,
            hdop=0.012
        ),
        heading=0.0,  # Heading north toward mark
        speed_over_ground=3.2,
        antenna_offset=AntennaOffset(
            longitudinal_offset=-4.5,
            lateral_offset=0.0,
            vertical_offset=8.0
        )
    )
    
    start_time = datetime(2026, 5, 7, 10, 0, 0)  # T₀ = 10:00:00
    
    print("=" * 60)
    print("StartSync OCS Detection Algorithm - Test Results")
    print("=" * 60)
    
    # Evaluate legal boat
    result_legal = engine.evaluate_ocs(legal_boat, start_time, legal_boat.position.timestamp)
    print(f"\nBoat: {result_legal['sail_number']}")
    print(f"  Status: {result_legal['status']}")
    print(f"  Distance from line: {result_legal['signed_distance_meters']:.3f}m")
    print(f"  OCS Violation: {result_legal['is_ocs_violation']}")
    
    # Evaluate OCS boat  
    result_ocs = engine.evaluate_ocs(ocs_boat, start_time, ocs_boat.position.timestamp)
    print(f"\nBoat: {result_ocs['sail_number']}")
    print(f"  Status: {result_ocs['status']}")
    print(f"  Distance from line: {result_ocs['signed_distance_meters']:.3f}m")
    print(f"  OCS Violation: {result_ocs['is_ocs_violation']}")
    
    return engine, [legal_boat, ocs_boat], start_time


if __name__ == "__main__":
    create_test_scenario()
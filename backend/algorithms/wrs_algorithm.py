"""
Weather Routing Scoring (WRS) Algorithm Module

Implements the weather-compensated scoring system to address unfair wind distribution
during races, as specified in PRD Section 3.2.

Formula from PRD Section 3.2:
    T_corrected = T_elapsed × (Reference_PET / Individual_PET)

Where:
    T_elapsed = Actual elapsed time for the boat
    Reference_PET = Predicted Elapsed Time for a reference boat in ideal conditions
    Individual_PET = Predicted Elapsed Time for this specific boat given actual weather

This compensates for situations where one side of the course has significantly 
better wind than the other, which would otherwise unfairly advantage/disadvantage boats.

Integration:
    - Ingests high-resolution GRIB data (wind speed/direction at multiple levels)
    - Interpolates against boat Polar Curves (VPP - Velocity Prediction Program)
    - Calculates optimal routing and PET for each boat individually
"""

import math
from dataclasses import dataclass, field
from typing import Optional, List, Tuple, Dict
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@dataclass
class WindVector:
    """Wind vector at a specific point and time."""
    speed_knots: float      # Wind speed in knots
    direction_true: float   # Direction wind is FROM (0-360 degrees true)
    height_m: float = 10.0  # Height above water (standard is 10m)


@dataclass
class CurrentVector:
    """Ocean current vector."""
    speed_knots: float      # Current speed in knots
    direction_true: float   # Direction current is TO (0-360 degrees true)


@dataclass
class WeatherPoint:
    """Weather conditions at a specific location and time."""
    latitude: float
    longitude: float
    timestamp: datetime
    wind: WindVector
    current: Optional[CurrentVector] = None
    wave_height: float = 0.0  # Significant wave height in meters
    wave_period: float = 0.0  # Wave period in seconds


@dataclass
class PolarPoint:
    """Single point on a boat's polar diagram."""
    twa: float      # True Wind Angle (degrees, 0-180)
    vmg_upwind: float   # Velocity Made Good upwind (knots)
    vmg_downwind: float # Velocity Made Good downwind (knots)
    boat_speed: float   # Actual boat speed (knots)


@dataclass
class BoatPolarCurve:
    """
    Velocity Prediction Program (VPP) polar curve for a specific boat.
    
    This defines the theoretical maximum performance of a boat at various 
    wind angles and wind speeds. Used to calculate PET (Predicted Elapsed Time).
    
    Data typically comes from ORC/IRC certificates or VPP software like 
    SailSoft, PathFinder, or Jboat VPP.
    """
    sail_number: str
    boat_type: str  # e.g., "J70", "30.7", "Melges 24"
    length_lwl: float  # Length waterline in meters
    
    # Polar data at different wind speeds (knots)
    polars_by_wind_speed: Dict[float, List[PolarPoint]] = field(default_factory=dict)
    
    def get_polar_for_wind_speed(self, wind_speed: float) -> Optional[List[PolarPoint]]:
        """Get polar curve interpolated for given wind speed."""
        available_ws = sorted(self.polars_by_wind_speed.keys())
        
        if not available_ws:
            return None
            
        # Exact match
        if wind_speed in self.polars_by_wind_speed:
            return self.polars_by_wind_speed[wind_speed]
            
        # Find bracketing wind speeds for interpolation
        if wind_speed < available_ws[0]:
            return self.polars_by_wind_speed[available_ws[0]]
        if wind_speed > available_ws[-1]:
            return self.polars_by_wind_speed[available_ws[-1]]
            
        for i in range(len(available_ws) - 1):
            if available_ws[i] <= wind_speed <= available_ws[i + 1]:
                # Linear interpolation between two polar curves
                ws_low = available_ws[i]
                ws_high = available_ws[i + 1]
                fraction = (wind_speed - ws_low) / (ws_high - ws_low)
                
                polars_low = self.polars_by_wind_speed[ws_low]
                polars_high = self.polars_by_wind_speed[ws_high]
                
                interpolated = []
                for p_low, p_high in zip(polars_low, polars_high):
                    interpolated.append(PolarPoint(
                        twa=p_low.twa,
                        vmg_upwind=p_low.vmg_upwind + fraction * (p_high.vmg_upwind - p_low.vmg_upwind),
                        vmg_downwind=p_low.vmg_downwind + fraction * (p_high.vmg_downwind - p_low.vmg_downwind),
                        boat_speed=p_low.boat_speed + fraction * (p_high.boat_speed - p_low.boat_speed)
                    ))
                return interpolated
                
        return None
    
    def get_speed_for_twa(self, twa: float, wind_speed: float) -> float:
        """Get predicted boat speed for a given TWA and wind speed."""
        polars = self.get_polar_for_wind_speed(wind_speed)
        if not polars:
            return 0.0
            
        # Normalize TWA to 0-180 range
        twa = abs(twa % 360)
        if twa > 180:
            twa = 360 - twa
            
        # Find closest polar point
        closest = min(polars, key=lambda p: abs(p.twa - twa))
        
        # Simple linear interpolation if we have neighbors
        sorted_polars = sorted(polars, key=lambda p: p.twa)
        for i in range(len(sorted_polars) - 1):
            if sorted_polars[i].twa <= twa <= sorted_polars[i + 1].twa:
                fraction = (twa - sorted_polars[i].twa) / (sorted_polars[i + 1].twa - sorted_polars[i].twa)
                return sorted_polars[i].boat_speed + fraction * (sorted_polars[i + 1].boat_speed - sorted_polars[i].boat_speed)
                
        return closest.boat_speed


@dataclass
class RaceCourse:
    """Defines a race course with multiple legs."""
    id: int
    name: str
    start_position: Tuple[float, float]  # (lat, lon)
    marks: List[Tuple[float, float, str]]  # [(lat, lon, mark_type), ...]
    finish_position: Tuple[float, float]  # (lat, lon)


class GRIBDataStore:
    """
    Mock GRIB data store for weather routing.
    
    In production, this would interface with actual GRIB file parsing libraries
    like eccodes (WMO), pygrib, or xarray with cfgrib backend.
    
    Supports interpolation in time and space for accurate PET calculations.
    """
    
    def __init__(self):
        # Mock data - in production this would load from actual GRIB files
        self._weather_cache: Dict[Tuple[float, float, int], WeatherPoint] = {}
        
    def get_weather_at(self, lat: float, lon: float, timestamp: datetime) -> WeatherPoint:
        """Get interpolated weather at a point and time."""
        # Mock implementation - returns deterministic pseudo-random weather
        # In production, this would interpolate from actual GRIB data
        
        # Create a hashable key for caching
        time_key = int(timestamp.timestamp() // 3600)  # Hourly cache
        
        cache_key = (round(lat, 2), round(lon, 2), time_key)
        
        if cache_key not in self._weather_cache:
            # Generate mock weather based on position and time
            import hashlib
            hash_input = f"{cache_key}{timestamp}"
            hash_val = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
            
            # Deterministic "random" values
            wind_speed = 8 + (hash_val % 12)  # 8-20 knots
            wind_dir = (hash_val // 12) % 360
            
            self._weather_cache[cache_key] = WeatherPoint(
                latitude=lat,
                longitude=lon,
                timestamp=timestamp,
                wind=WindVector(speed_knots=wind_speed, direction_true=wind_dir),
                wave_height=1.0 + (hash_val % 5) / 10
            )
            
        return self._weather_cache[cache_key]


class WRSWeatherRoutingEngine:
    """
    Weather Routing Scoring Engine implementing PRD Section 3.2 algorithm.
    
    Calculates corrected times that compensate for unfair wind distribution
    by comparing each boat's actual performance against their predicted 
    optimal performance given the actual weather conditions they experienced.
    
    Key concepts:
        - Reference PET: Time a "perfect" boat would take in ideal conditions
        - Individual PET: Time this specific boat should take given actual weather
        - T_corrected = T_elapsed × (Reference_PET / Individual_PET)
        
    If a boat took the "bad side" of the course (lighter wind), their 
    Individual_PET will be higher, resulting in a lower T_corrected,
    effectively giving them credit for the unfavorable conditions.
    """
    
    def __init__(self, grib_store: GRIBDataStore):
        self.grib_store = grib_store
        
    def calculate_pet(
        self,
        boat_polar: BoatPolarCurve,
        course: RaceCourse,
        start_time: datetime
    ) -> Tuple[float, List[Dict]]:
        """
        Calculate Predicted Elapsed Time (PET) for a boat on a course.
        
        Uses dynamic VMG optimization to find the best heading between waypoints,
        accounting for wind-dependent polar curves and target bearings.
        
        Args:
            boat_polar: The boat's VPP polar curve
            course: The race course definition
            start_time: Race start time
            
        Returns:
            Tuple of (PET in seconds, list of route segments with details)
        """
        waypoints = [course.start_position] + [m[:2] for m in course.marks] + [course.finish_position]
        waypoints = [course.start_position] + [m[:2] for m in course.marks] + [course.finish_position]
        
        total_pet_seconds = 0.0
        route_segments = []
        
        current_time = start_time
        
        for i in range(len(waypoints) - 1):
            from_pos = waypoints[i]
            to_pos = waypoints[i + 1]
            
            # Calculate distance and bearing between waypoints
            dist_nm, target_bearing = self._haversine_distance_bearing(from_pos, to_pos)
            
            # Get weather at midpoint
            mid_lat = (from_pos[0] + to_pos[0]) / 2
            mid_lon = (from_pos[1] + to_pos[1]) / 2
            weather = self.grib_store.get_weather_at(mid_lat, mid_lon, current_time)
            
            # Optimize heading for this leg using VMG maximization
            best_heading, best_vmg, best_twa = self._optimize_leg_heading(
                target_bearing,
                weather.wind.direction_true,
                weather.wind.speed_knots,
                boat_polar
            )
            
            # Calculate time for this leg (distance / VMG, convert to seconds)
            leg_time_seconds = (dist_nm / best_vmg) * 3600 if best_vmg > 0 else float('inf')
            
            total_pet_seconds += leg_time_seconds
            current_time += timedelta(seconds=leg_time_seconds)
            
            route_segments.append({
                'from': from_pos,
                'to': to_pos,
                'distance_nm': round(dist_nm, 3),
                'bearing_true': round(target_bearing, 1),
                'wind_speed_knots': weather.wind.speed_knots,
                'wind_direction_true': weather.wind.direction_true,
                'twa': round(best_twa, 1),
                'predicted_vmg_knots': round(best_vmg, 2),
                'heading': round(best_heading, 1),
                'leg_time_seconds': round(leg_time_seconds, 1)
            })
            
        return (total_pet_seconds, route_segments)
    
    def calculate_corrected_time(
        self,
        elapsed_time_seconds: float,
        reference_pet_seconds: float,
        individual_pet_seconds: float
    ) -> float:
        """
        Apply the WRS correction formula from PRD Section 3.2.
        
        T_corrected = T_elapsed × (Reference_PET / Individual_PET)
        
        Args:
            elapsed_time_seconds: Actual time taken by the boat
            reference_pet_seconds: PET for reference conditions
            individual_pet_seconds: PET for this boat in actual conditions
            
        Returns:
            Corrected time in seconds
        """
        if individual_pet_seconds <= 0:
            logger.warning("Invalid Individual_PET, returning elapsed time")
            return elapsed_time_seconds
            
        corrected = elapsed_time_seconds * (reference_pet_seconds / individual_pet_seconds)
        
        return corrected
    
    def evaluate_race_result(
        self,
        sail_number: str,
        boat_polar: BoatPolarCurve,
        course: RaceCourse,
        start_time: datetime,
        elapsed_time_seconds: float,
        reference_pet_seconds: float = None
    ) -> Dict:
        """
        Complete WRS evaluation for a single boat.
        
        Args:
            sail_number: Boat identifier
            boat_polar: Boat's polar curve
            course: Race course
            start_time: Start time
            elapsed_time_seconds: Actual elapsed time
            reference_pet_seconds: Optional pre-calculated reference PET
            
        Returns:
            Complete evaluation dictionary
        """
        # Calculate individual PET
        individual_pet_seconds, route_segments = self.calculate_pet(
            boat_polar, course, start_time
        )
        
        # Use provided reference or calculate default
        if reference_pet_seconds is None:
            # Default reference: 60% of individual PET (simulating ideal conditions)
            reference_pet_seconds = individual_pet_seconds * 0.6
            
        # Calculate corrected time using PRD formula
        corrected_time = self.calculate_corrected_time(
            elapsed_time_seconds,
            reference_pet_seconds,
            individual_pet_seconds
        )
        
        # Calculate performance metrics
        weather_factor = reference_pet_seconds / individual_pet_seconds
        time_adjustment = elapsed_time_seconds - corrected_time
        
        return {
            'sail_number': sail_number,
            'elapsed_time_seconds': round(elapsed_time_seconds, 1),
            'elapsed_time_formatted': self._format_time(elapsed_time_seconds),
            'individual_pet_seconds': round(individual_pet_seconds, 1),
            'reference_pet_seconds': round(reference_pet_seconds, 1),
            'corrected_time_seconds': round(corrected_time, 1),
            'corrected_time_formatted': self._format_time(corrected_time),
            'weather_factor': round(weather_factor, 4),
            'time_adjustment_seconds': round(time_adjustment, 1),
            'route_segments': route_segments,
            'optimized_headings': [r.get('heading', None) for r in route_segments]
        }
    
    def _haversine_distance_bearing(
        self, 
        pos1: Tuple[float, float], 
        pos2: Tuple[float, float]
    ) -> Tuple[float, float]:
        """Calculate distance (nm) and bearing (degrees) between two points."""
        lat1, lon1 = math.radians(pos1[0]), math.radians(pos1[1])
        lat2, lon2 = math.radians(pos2[0]), math.radians(pos2[1])
        
        # Haversine formula for distance
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth radius in nautical miles
        earth_radius_nm = 3440.065
        distance_nm = earth_radius_nm * c
        
        # Bearing calculation
        y = math.sin(dlon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        bearing = math.degrees(math.atan2(y, x))
        bearing = (bearing + 360) % 360
        
        return (distance_nm, bearing)
    
    def _format_time(self, seconds: float) -> str:
        """Format seconds as HH:MM:SS.mmm"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"


def create_test_scenario():
    """Demonstrate WRS algorithm with test data."""
    
    # Create engine
    grib_store = GRIBDataStore()
    engine = WRSWeatherRoutingEngine(grib_store)
    
    # Define a simple boat polar curve (J70-class sailboat)
    j70_polar = BoatPolarCurve(
        sail_number="ITA-12345",
        boat_type="J70",
        length_lwl=5.89,
        polars_by_wind_speed={
            10.0: [  # 10 knot wind polar
                PolarPoint(twa=45, vmg_upwind=4.2, vmg_downwind=0.0, boat_speed=5.0),
                PolarPoint(twa=60, vmg_upwind=4.8, vmg_downwind=0.0, boat_speed=6.2),
                PolarPoint(twa=90, vmg_upwind=0.0, vmg_downwind=7.5, boat_speed=7.5),
                PolarPoint(twa=135, vmg_upwind=0.0, vmg_downwind=6.8, boat_speed=7.2),
                PolarPoint(twa=160, vmg_upwind=0.0, vmg_downwind=5.5, boat_speed=6.0),
            ],
            15.0: [  # 15 knot wind polar
                PolarPoint(twa=45, vmg_upwind=5.8, vmg_downwind=0.0, boat_speed=7.0),
                PolarPoint(twa=60, vmg_upwind=6.5, vmg_downwind=0.0, boat_speed=8.2),
                PolarPoint(twa=90, vmg_upwind=0.0, vmg_downwind=9.5, boat_speed=9.5),
                PolarPoint(twa=135, vmg_upwind=0.0, vmg_downwind=8.8, boat_speed=9.2),
                PolarPoint(twa=160, vmg_upwind=0.0, vmg_downwind=7.2, boat_speed=7.8),
            ]
        }
    )
    
    # Define a simple race course (triangle)
    course = RaceCourse(
        id=1,
        name="Test Course",
        start_position=(41.1350, 9.5680),
        marks=[
            (41.1450, 9.5680, "windward"),   # ~1.8nm north
            (41.1450, 9.5780, "committee"),  # ~1.2nm east  
            (41.1350, 9.5780, "run"),        # ~1.8nm south
        ],
        finish_position=(41.1350, 9.5680)    # Back to start
    )
    
    start_time = datetime(2026, 5, 7, 10, 0, 0)
    
    print("=" * 70)
    print("Weather Routing Scoring (WRS) Algorithm - Test Results")
    print("=" * 70)
    print(f"\nCourse: {course.name}")
    print(f"Start Time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Simulate two boats with different elapsed times
    boat1_elapsed = 3600  # 1 hour
    boat2_elapsed = 4200  # 1 hour 10 minutes
    
    result1 = engine.evaluate_race_result(
        sail_number="ITA-12345",
        boat_polar=j70_polar,
        course=course,
        start_time=start_time,
        elapsed_time_seconds=boat1_elapsed
    )
    
    result2 = engine.evaluate_race_result(
        sail_number="ITA-67890",
        boat_polar=j70_polar,
        course=course,
        start_time=start_time,
        elapsed_time_seconds=boat2_elapsed
    )
    
    print(f"\n{'Boat':<15} {'Elapsed':<15} {'Corrected':<15} {'Adjustment':<15}")
    print("-" * 60)
    print(f"{result1['sail_number']:<15} {result1['elapsed_time_formatted']:<15} "
          f"{result1['corrected_time_formatted']:<15} {result1['time_adjustment_seconds']:>+8.1f}s")
    print(f"{result2['sail_number']:<15} {result2['elapsed_time_formatted']:<15} "
          f"{result2['corrected_time_formatted']:<15} {result2['time_adjustment_seconds']:>+8.1f}s")
    
    return engine, result1, result2


if __name__ == "__main__":
    create_test_scenario()
import logging
from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from backend.models import Race, Registration, RaceResult
from backend.algorithms.wrs_algorithm import WRSWeatherRoutingEngine, GRIBDataStore, RaceCourse
from backend.repositories.polar_repository import PolarRepository
from backend.services.rating_service import RatingService

logger = logging.getLogger(__name__)

class ScoringService:
    """
    Orchestrator for the scoring module (MOD-SCORE).
    
    Integrates WRS (Weather Routing Scoring) with boat ratings and 
    polar curves to produce final race results.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.grib_store = GRIBDataStore()
        self.wrs_engine = WRSWeatherRoutingEngine(self.grib_store)
        self.polar_repo = PolarRepository()
        self.rating_service = RatingService()

    async def calculate_race_results(self, race_id: str, regatta_code: str) -> List[RaceResult]:
        """
        Calculates and saves results for all registrations in a race using WRS.
        """
        race = self.db.exec(select(Race).where(Race.id == race_id)).first()
        if not race:
            raise ValueError(f"Race {race_id} not found")

        # Fetch all registrations for this race
        registrations = self.db.exec(select(Registration).where(Registration.race_id == race_id)).all()
        
        results = []
        for reg in registrations:
            # 1. Get Boat Rating (ORC/IRC)
            rating_data = await self.rating_service.get_boat_rating(reg.sail_number, regatta_code)
            if not rating_data:
                logger.warning(f"No rating found for {reg.sail_number}, skipping WRS correction.")
                # Fallback to simple elapsed time if no rating/WRS possible
                pass

            # 2. Get Polar Curve
            polar = self.polar_repo.get_polar(reg.sail_number)
            if not polar:
                logger.warning(f"No polar curve found for {reg.sail_number}")
                continue

            # 3. Define Course (In production, fetch from a Course model linked to Race)
            # Mocking course based on Regatta/Race metadata for now
            course = RaceCourse(
                id=race.id,
                name=race.name,
                start_position=(race.latitude, race.longitude), # Simplified
                marks=[(41.1450, 9.5680, "windward"), (41.1350, 9.5780, "run")], # Mock marks
                finish_position=(race.latitude, race.longitude)
            )

            # 4. Calculate WRS Corrected Time
            # In a real scenario, we'd fetch the actual elapsed time from telemetry/timing logs
            # Here we assume a mock elapsed time for demonstration
            mock_elapsed_time = 3600.0 # 1 hour
            
            evaluation = self.wrs_engine.evaluate_race_result(
                sail_number=reg.sail_number,
                boat_polar=polar,
                course=course,
                start_time=race.scheduled_start,
                elapsed_time_seconds=mock_elapsed_time
            )

            # 5. Create RaceResult record
            result = RaceResult(
                race_id=race.id,
                registration_id=reg.id,
                finish_time=race.scheduled_start + datetime.fromtimestamp(evaluation['elapsed_time_seconds']),
                net_time=None, # To be calculated based on handicap
                position=None, # To be updated after all results are processed
                points=None,
                scoring_code="WRS",
                corrected_time=None # We can store the corrected time here if needed
            )
            
            # Update result with WRS specific data
            # Note: In a real system, we'd calculate position/points after all boats are processed
            self.db.add(result)
            results.append(result)

        self.db.commit()
        return results
"""
Dashboard Statistics API - Real-time counter values endpoint.

Provides aggregated statistics for the main dashboard counters:
- Active Regattas
- Registered Sailors  
- Upcoming Events
"""

from datetime import datetime
from typing import Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

# Import corretto del generatore di sessione DB
from backend.database import get_db as get_db_session
from backend.models import Regatta, User, Registration, Race


router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


class DashboardStatsResponse(BaseModel):
    """Response model for dashboard statistics."""
    
    active_regattas: int
    registered_sailors: int
    upcoming_events: int
    total_registrations: int
    last_updated: str


def _get_active_regattas_count(session: Session) -> int:
    """Count regattas with status 'active' or 'planning' that haven't ended."""
    now = datetime.utcnow()
    
    query = select(Regatta).where(
        Regatta.status.in_(["active", "planning"]),
        Regatta.end_date >= now,
    )
    
    results = session.exec(query).all()
    return len(results)


def _get_registered_sailors_count(session: Session) -> int:
    """Count unique registered sailors across all regattas."""
    query = select(Registration.user_id).distinct()
    
    results = session.exec(query).all()
    return len(results)


def _get_upcoming_events_count(session: Session) -> int:
    """Count races scheduled in the future."""
    now = datetime.utcnow()
    
    query = select(Race).where(
        Race.status == "scheduled",
        Race.scheduled_start >= now,
    )
    
    results = session.exec(query).all()
    return len(results)


def _get_total_registrations(session: Session) -> int:
    """Get total number of registrations."""
    query = select(Registration).where(
        Registration.status == "confirmed"
    )
    
    results = session.exec(query).all()
    return len(results)


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(session: Session = Depends(get_db_session)) -> DashboardStatsResponse:
    """
    Get aggregated dashboard statistics.
    
    Returns real-time counter values for:
    - Active Regattas: Regattas currently active or in planning that haven't ended
    - Registered Sailors: Unique users with confirmed registrations
    - Upcoming Events: Races scheduled but not yet started
    """
    try:
        active_regattas = _get_active_regattas_count(session)
        registered_sailors = _get_registered_sailors_count(session)
        upcoming_events = _get_upcoming_events_count(session)
        total_registrations = _get_total_registrations(session)
        
        return DashboardStatsResponse(
            active_regattas=active_regattas,
            registered_sailors=registered_sailors,
            upcoming_events=upcoming_events,
            total_registrations=total_registrations,
            last_updated=datetime.utcnow().isoformat(),
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch dashboard statistics: {str(e)}"
        )


def register_dashboard_routes(app):
    """Register dashboard API routes with the FastAPI application."""
    app.include_router(router)
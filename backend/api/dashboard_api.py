"""
Dashboard Statistics API - Real-time counter values endpoint.
"""

from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlmodel import Session, select, func

from backend.database import get_db as get_db_session
from backend.models import Regatta, User, Registration, Race


router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


class DashboardStatsResponse(BaseModel):
    active_regattas: int
    registered_sailors: int
    upcoming_events: int
    total_registrations: int
    last_updated: str


def _get_active_regattas_count(session: Session) -> int:
    """Conta le regate attualmente attive o in corso."""
    now = datetime.now(timezone.utc)
    
    # Include regate con stato 'active' o 'open' che non sono ancora concluse
    query = select(Regatta).where(
        Regatta.status.in_(["active", "open"]),
        Regatta.end_date >= now,
    )
    results = session.exec(query).all()
    return len(results)


def _get_registered_sailors_count(session: Session) -> int:
    """Conta le barche/velisti registrati confermati."""
    # Conta le registrazioni effettive inserite per le regate
    query = select(Registration)
    results = session.exec(query).all()
    return len(results)


def _get_upcoming_events_count(session: Session) -> int:
    """Conta le regate in programma con data futura."""
    now = datetime.now(timezone.utc)
    
    # Conta le regate che devono ancora iniziare o in pianificazione/apertura
    query = select(Regatta).where(
        Regatta.status.in_(["planning", "open"]),
        Regatta.start_date >= now,
    )
    results = session.exec(query).all()
    return len(results)


def _get_total_registrations(session: Session) -> int:
    """Totale iscrizioni registrate."""
    query = select(Registration)
    results = session.exec(query).all()
    return len(results)


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(session: Session = Depends(get_db_session)) -> DashboardStatsResponse:
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
            last_updated=datetime.now(timezone.utc).isoformat(),
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch dashboard statistics: {str(e)}"
        )


def register_dashboard_routes(app):
    app.include_router(router)
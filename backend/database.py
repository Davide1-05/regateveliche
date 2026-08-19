"""Database connection and session management."""

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.orm import sessionmaker
from typing import Generator
import os

from backend.config import get_settings

settings = get_settings()

# Database URL from environment or default
DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)

# Create engine with connection pooling for performance (QA-01, QA-02)
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL debugging
    pool_size=10,  # Number of connections to keep open
    max_overflow=20,  # Additional connections allowed under load
    pool_pre_ping=True,  # Verify connections before use
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    class_=Session
)


def init_db():
    """Initialize database tables."""
    SQLModel.metadata.create_all(engine)


def get_db() -> Generator[Session, None, None]:
    #Try Creating the DB if not already exists
    init_db()
    """
    Dependency for getting database sessions.
    
    Yields a new session for each request and ensures proper cleanup.
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def get_db_sync() -> Session:
    """Get a synchronous database session (for background tasks)."""
    return SessionLocal()
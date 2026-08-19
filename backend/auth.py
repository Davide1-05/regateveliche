"""Authentication and authorization module with JWT and OAuth2 (RF08)."""

from datetime import datetime, timedelta
from typing import Optional
import jwt
import hashlib
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from backend.config import get_settings
from backend.database import get_db

settings = get_settings()

# Password hashing with Argon2
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# OAuth2 scheme for JWT bearer tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# ============================================================================
# PASSWORD UTILITIES
# ============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash using Argon2."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return pwd_context.hash(password)


# ============================================================================
# JWT TOKEN UTILITIES
# ============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token with longer expiry."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)  # 7 days for refresh tokens
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# Alias di compatibilità per main.py
decode_access_token = decode_token


def hash_refresh_token(token: str) -> str:
    """Hash a refresh token for secure storage."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


# ============================================================================
# USER VERIFICATION
# ============================================================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Retrieve the current user from the DB using the JWT access token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    from backend.models import User
    user = db.exec(select(User).where(User.id == user_id)).first()
    
    if user is None or not getattr(user, "is_active", True):
        raise credentials_exception
        
    return user


async def get_current_active_user(
    current_user = Depends(get_current_user)
):
    """Get current active user (not disabled)."""
    if not getattr(current_user, "is_active", True):
        raise HTTPException(
            status_code=400, 
            detail="Inactive user"
        )
    return current_user


# ============================================================================
# RBAC ROLE-BASED ACCESS CONTROL (RF08)
# ============================================================================

def require_role(*allowed_roles: str):
    """Dependency factory for role-based access control."""
    async def role_checker(current_user = Depends(get_current_active_user)):
        user_role = getattr(current_user, "role", None)
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {' or '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


# Pre-built role checkers for common roles
require_admin = require_role("admin")
require_club_manager = require_role("club_manager", "admin")
require_race_official = require_role("race_official", "admin")
require_authenticated = require_role("sailor", "club_manager", "race_official", "admin")


# ============================================================================
# AUTHENTICATION ENDPOINT HELPERS
# ============================================================================

async def authenticate_user(email: str, password: str, db: Session = Depends(get_db)) -> Optional[dict]:
    """Authenticate a user with email and password."""
    from backend.models import User
    user = db.exec(select(User).where(User.email == email)).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    if not user.is_active:
        return None
    
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_verified": user.is_verified
    }
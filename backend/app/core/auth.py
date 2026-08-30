import os
from datetime import datetime, timedelta, timezone
from typing import Mapping, Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import User
from app.schemas.auth import TokenData

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_JWT_KEY = os.getenv("CLERK_JWT_KEY")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


class _ClerkHeaders(Mapping[str, str]):
    """Case-insensitive header mapping so Clerk's authenticator finds the Authorization header
    regardless of casing (Clerk's SDK reads 'Authorization')."""

    def __init__(self, headers: Mapping[str, str]):
        self._store = {k.lower(): v for k, v in headers.items()}

    def __getitem__(self, key: str) -> str:
        return self._store[key.lower()]

    def __iter__(self):
        return iter(self._store)

    def __len__(self) -> int:
        return len(self._store)

    def get(self, key: str, default=None):
        return self._store.get(key.lower(), default)


class _ClerkRequest:
    """Minimal Requestish adapter exposing the Authorization header to Clerk's authenticator."""

    def __init__(self, token: str):
        self._headers: Mapping[str, str] = _ClerkHeaders(
            {"Authorization": f"Bearer {token}"}
        )

    @property
    def headers(self) -> Mapping[str, str]:
        return self._headers


def verify_clerk_token(token: str):
    """Verify a Clerk-issued session token and return its decoded claims, or None if absent/invalid."""
    if not (CLERK_JWT_KEY or CLERK_SECRET_KEY):
        return None
    try:
        from clerk_backend_api import Clerk
        from clerk_backend_api.security.types import AuthenticateRequestOptions

        clerk = Clerk(bearer_auth=CLERK_SECRET_KEY)
        options = AuthenticateRequestOptions(
            secret_key=CLERK_SECRET_KEY,
            jwt_key=CLERK_JWT_KEY,
        )
        state = clerk.authenticate_request(_ClerkRequest(token), options)
        if not state.is_signed_in:
            return None
        return state.payload or None
    except Exception:
        return None


def provision_user_from_clerk(db: Session, payload: dict) -> Optional[User]:
    """Find or create a Pathfinder user backed by a Clerk identity."""
    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        return None

    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if user:
        return user

    email = payload.get("email") or None
    first = payload.get("firstName") or ""
    last = payload.get("lastName") or ""
    name = payload.get("name") or (f"{first} {last}".strip()) or (email or "User")

    exists_by_email = None
    if email:
        exists_by_email = db.query(User).filter(User.email == email).first()

    if exists_by_email:
        # Link an existing legacy account to the Clerk identity on first sign-in.
        exists_by_email.clerk_user_id = clerk_user_id
        if not exists_by_email.name or exists_by_email.name == "User":
            exists_by_email.name = name
        db.commit()
        db.refresh(exists_by_email)
        return exists_by_email

    user = User(name=name, email=email, clerk_user_id=clerk_user_id)
    db.add(user)
    db.flush()
    db.commit()
    db.refresh(user)
    return user


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1) Attempt Clerk session-token verification (networkless when CLERK_JWT_KEY is set).
    if CLERK_JWT_KEY or CLERK_SECRET_KEY:
        payload = verify_clerk_token(token)
        if payload is not None:
            user = provision_user_from_clerk(db, payload)
            if user is None:
                raise credentials_exception
            return user

    # 2) Fall back to the legacy internal JWT for migration / existing sessions.
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user

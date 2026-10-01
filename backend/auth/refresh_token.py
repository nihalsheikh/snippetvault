from sqlalchemy.orm import Session
import secrets
import hashlib

from models import RefreshToken


# Create Refresh Token
def create_refresh_token() -> str:
    return secrets.token_urlsafe(64)


# Hash Refresh Token
def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# Get Refresh Token
def get_refresh_token(db: Session, raw_token: str):
    token_hash = hash_refresh_token(raw_token)

    return db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

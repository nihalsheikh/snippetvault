from fastapi import HTTPException, status
from datetime import datetime, timezone, timedelta
import jwt

from config.jwt_config import jwt_secret, jwt_algo, access_token_expire_minutes


# Create Access Token
def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=access_token_expire_minutes)

    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }

    return jwt.encode(payload, jwt_secret, algorithm=jwt_algo)


# Verify Access Token
def verify_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algo])

        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token"
            )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token"
            )

        return user_id
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

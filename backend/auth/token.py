from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

from auth.jwt import verify_access_token

oauth2_schema = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_id(token: str = Depends(oauth2_schema)) -> str:
    return verify_access_token(token)

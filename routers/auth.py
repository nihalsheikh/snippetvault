from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import os
from database import get_db
from models import User
from schemas.users import UserCreate
from schemas.auth import Token
from schemas.common import MessageResponse
from dotenv import load_dotenv


# load .env variables
load_dotenv()

# authentication route
router = APIRouter(prefix="/auth", tags=["Authentication"])

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY not set in .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/signin")

# Hash Passwords
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Route Protection
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # get user from DB
    user = db.query(User).filter(User.id == int(user_id)).first()

    if user is None:
        raise credentials_exception

    return user


# User Signup
@router.post(
    "/signup/",
    status_code=status.HTTP_201_CREATED,
    response_model=MessageResponse,
    summary="Create a new user",
    description="Register a new user account using a unique username and email address."
)
async def user_signup(user_data: UserCreate, db: Session = Depends(get_db)):
    # check for exisiting username or email in DB
    existing_username = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or Email already registered."
        )

    # Password character limitation
    password_to_hash = user_data.password
    if len(password_to_hash) > 72:
        password_to_hash = password_to_hash[:72]

    # Password security: hash the password
    hashed_password = password_context.hash(password_to_hash)

    # Save User to DB
    new_user = User(
        username=user_data.username,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        hashed_password=hashed_password,
        is_public=user_data.is_public
    )

    # add, save/commit, refresh
    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise

    return { "message": "User created successfully." }


# User Signin
@router.post(
    "/signin/",
    response_model=Token,
    summary="User login",
    description="Authenticate a user and return a JWT access token."
)
async def user_signin(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Find username in db
    user = db.query(User).filter(User.username == form_data.username).first()

    # Verify the username and check if password is correct
    if not user or not password_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Create a JWT token
    access_token_expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "exp": access_token_expires,
        "sub": str(user.id) # sub is subject (user id)
    }

    encode_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return { "access_token": encode_jwt, "token_type": "bearer" }

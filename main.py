from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from database import SessionLocal, Snippet, User


# load .env variables
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY not set in .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# FastAPI instance
app = FastAPI()

# Hash Passwords
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# User Model Request Body
class UserCreate(BaseModel):
    username: str
    first_name: str
    last_name: str
    email: str
    password: str


# Snippet Model Request Body
class SnippetCreates(BaseModel):
    title: str
    description: Optional[str] = None
    code: str
    language: str
    tags: Optional[str] = None
    user_id: str


# Auth Token
class Token(BaseModel):
    access_token: str
    token_type: str


# Start DB session for each request and close it after completion
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Routes
## Snippet CRUD Routes
### Home Route
@app.get("/")
def home_route():
    return { "message": "SnippetVault API is online" }


### Create Snippet Route
@app.post("/snippets/")
async def create_snippet(snippet_data: SnippetCreates, db: Session = Depends(get_db)):
    # Create an instance of Snippet Class
    new_snippet = Snippet(
        title=snippet_data.title,
        description=snippet_data.description,
        code=snippet_data.code,
        language=snippet_data.language,
        tags=snippet_data.tags,
        user_id=snippet_data.user_id
    )

    # add it to the DB session
    db.add(new_snippet)

    # commit/save data to DB
    db.commit()

    # refresh the DB to generate and get ID
    db.refresh(new_snippet)

    return { "message": "Snippet saved to database successfully!", "id": new_snippet.id }


### Get All Snippet Route
@app.get("/snippets/")
async def get_all_snippets(db: Session = Depends(get_db)):
    all_snippets = db.query(Snippet).all()
    return { "all_snippets": all_snippets }


### Get One Snippet Route
@app.get("/snippets/{snippet_id}/")
async def get_one_snippet(snippet_id: int, db: Session = Depends(get_db)):
    snippet = db.query(Snippet).filter_by(id=snippet_id).first()
    return { "snippet": snippet }


### Update Snippet Route
@app.put("/snippets/{snippet_id}/")
async def update_snippet(snippet_id: int, snippet_data: SnippetCreates, db: Session = Depends(get_db)):
    update_snippet = db.query(Snippet).filter_by(id=snippet_id).first()

    if update_snippet is None:
        raise HTTPException(status_code=404, detail="Snippet not found")

    update_snippet.title=snippet_data.title
    update_snippet.description=snippet_data.description
    update_snippet.code=snippet_data.code
    update_snippet.language=snippet_data.language
    update_snippet.tags=snippet_data.tags
    update_snippet.user_id=snippet_data.user_id

    db.commit()
    db.refresh(update_snippet)

    return { "message": "Snippet data updated successfully!" }


### Delete Snippet Route
@app.delete("/snippets/{snippet_id}/")
async def delete_snippet(snippet_id: int, db: Session = Depends(get_db)):
    del_snippet = db.query(Snippet).filter_by(id=snippet_id).first()

    if del_snippet is None:
        raise HTTPException(status_code=404, detail="Snippet not found")

    db.delete(del_snippet)
    db.commit()

    return { "message": "Snipped deleted successfully" }


## User CRUD Routes
### create user
@app.post("/user/register/")
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # check for exisiting username or email in DB
    existing_username = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()

    if existing_username:
        raise HTTPException(status_code=409, detail="Username or Email already registered.")

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
        hashed_password=hashed_password
    )

    # add, save/commit, refresh
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return { "message": "User created successfully." }


### user login
@app.post("/user/signin/")
async def user_signin(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Find username in db
    user = db.query(User).filter(User.username == form_data.username).first()

    # Verify the username and check if password is correct
    if not user or not password_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Create a JWT token
    access_token_expires = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "exp": access_token_expires,
        "sub": str(user.id) # sub is subject (user id)
    }

    encode_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return { "access_token": encode_jwt, "token_type": "bearer" }

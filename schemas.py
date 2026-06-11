from pydantic import BaseModel
from typing import Optional


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


# Auth Token
class Token(BaseModel):
    access_token: str
    token_type: str

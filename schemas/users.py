from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime


# User Model Request Body
class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=30)
    first_name: str
    last_name: str
    email: EmailStr
    password: str = Field(min_length=8)
    is_public: bool = True


# User Response
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    first_name: str
    last_name: str
    email: EmailStr # str
    created_at: datetime
    is_public: bool


# Single User Response
class SingleUserResponse(BaseModel):
    user: UserResponse


# User Update Response
class UserUpdateResponse(BaseModel):
    message: str
    user: UserResponse


# User Partial Update
class UserPartialUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=8)
    is_public: Optional[bool] = None

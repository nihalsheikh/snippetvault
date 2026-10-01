from pydantic import BaseModel, Field, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime


# User details
class UserDetails(BaseModel):
    id: UUID
    name: str | None = None
    email: EmailStr

    email_verified: bool = False
    email_verified_at: datetime | None = None

    profile_image: str | None = None
    username: str | None = None
    bio: str | None = None
    website: str | None = None

    model_config = ConfigDict(from_attributes=True)


# Signup Request
class UserEmailSignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


# Signup Response
class UserSignupResponse(BaseModel):
    message: str


# Login Response
class UserLoginResponse(BaseModel):
    message: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# Logout Request
class UserLogoutRequest(BaseModel):
    refresh_token: str


# Logout Response
class UserLogoutResponse(BaseModel):
    message: str


# Refresh Token req
class RefreshTokenRequest(BaseModel):
    refresh_token: str


# Refresh Token res
class UserRefreshResponse(BaseModel):
    message: str
    access_token: str
    token_type: str


# User Profile Data Response
class UserProfileResponse(BaseModel):
    message: str
    user: UserDetails


# User Profile Update Details req
class UserProfileUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    username: str | None = Field(None, min_length=3, max_length=30)
    bio: str | None = Field(None, max_length=500)
    website: str | None = Field(None, max_length=255)


# Update Email req
class UserEmailUpdateRequest(BaseModel):
    email: EmailStr


# Verify Email req
class UserEmailVerificationRequest(BaseModel):
    token: str


# Password change req
class UserPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)
    confirm_new_password: str = Field(..., min_length=6, max_length=128)


# Password Change res
class UserPasswordChangeResponse(BaseModel):
    message: str


# Password Reset req
class UserPasswordResetRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=128)
    confirm_new_password: str = Field(..., min_length=6, max_length=128)


# Account Delete
class UserAccountDeleteResponse(BaseModel):
    message: str

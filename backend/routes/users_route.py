from fastapi import APIRouter, HTTPException, Depends, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from emails.email_service import send_verification_email
from config.env_config import env_settings
from config.jwt_config import refresh_token_expire_days
from models import User, RefreshToken, EmailVerificationToken
from utils.get_db import get_db
from auth.hash_password import hash_password, verify_password
from auth.token import get_current_user_id
from auth.jwt import create_access_token
from auth.refresh_token import (
    create_refresh_token,
    hash_refresh_token,
    get_refresh_token,
)
from auth.refresh_token import (
    create_refresh_token as create_verification_token,
    hash_refresh_token as hash_verification_token,
)
from schemas.user_req_res import (
    UserEmailSignupRequest,
    UserSignupResponse,
    UserLoginResponse,
    UserLogoutRequest,
    UserLogoutResponse,
    RefreshTokenRequest,
    UserRefreshResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserEmailUpdateRequest,
    UserEmailVerificationRequest,
    UserPasswordChangeRequest,
    UserPasswordChangeResponse,
    UserPasswordResetRequest,
    UserAccountDeleteResponse,
)

router = APIRouter(prefix="/api", tags=["User"])


def build_verification_url(raw_token: str) -> str:
    return f"{env_settings.frontend_url.rstrip('/')}/verify-email?token={raw_token}"


# User Signup
@router.post(
    "/auth/signup",
    status_code=status.HTTP_201_CREATED,
    response_model=UserSignupResponse,
    summary="User Signup",
    description="Create a new user for SnippetVault",
)
def signup(
    request: Request,
    background_tasks: BackgroundTasks,
    user_data: UserEmailSignupRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == user_data.email).first()

    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already exists."
        )

    hashed_pswd = hash_password(user_data.password)

    new_user = User(
        name=user_data.name, email=user_data.email, password_hash=hashed_pswd
    )

    db.add(new_user)
    db.flush()

    raw_token = create_verification_token()

    verification_token = EmailVerificationToken(
        token_hash=hash_verification_token(raw_token),
        user_id=new_user.id,
        email=user_data.email,
        purpose="signup",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )

    db.add(verification_token)
    db.commit()
    db.refresh(new_user)

    background_tasks.add_task(
        send_verification_email,
        to=new_user.email,
        first_name=new_user.name or "there",
        verification_url=build_verification_url(raw_token),
    )

    return {"message": "Account created successfully. Please verify your email."}


# User Login
@router.post(
    "/auth/login",
    status_code=status.HTTP_200_OK,
    response_model=UserLoginResponse,
    summary="User Login",
    description="Login to SnippetVault",
)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email or password"
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first",
        )

    access_token = create_access_token(str(user.id))

    raw_refresh_token = create_refresh_token()

    refresh_token = RefreshToken(
        token_hash=hash_refresh_token(raw_refresh_token),
        user_id=user.id,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=refresh_token_expire_days),
    )

    db.add(refresh_token)
    db.commit()
    db.refresh(refresh_token)

    return {
        "message": "Login Successful",
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "bearer",
    }


# User Logout
@router.post(
    "/auth/logout",
    status_code=status.HTTP_200_OK,
    response_model=UserLogoutResponse,
    summary="User Logout",
    description="Logout of SnippetVault",
)
def logout(logout_data: UserLogoutRequest, db: Session = Depends(get_db)):
    refresh_token = get_refresh_token(db, logout_data.refresh_token)

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    refresh_token.revoked = True
    db.commit()

    return {"message": "Logout successful"}


# Refresh Token
@router.post(
    "/auth/refresh",
    status_code=status.HTTP_200_OK,
    response_model=UserRefreshResponse,
    summary="Refresh Access Token",
    description="Generate a new access token using a valid refresh token",
)
def refresh(refresh_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    refresh_token = get_refresh_token(db, refresh_data.refresh_token)

    if not refresh_token or refresh_token.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
        )

    if refresh_token.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired"
        )

    access_token = create_access_token(str(refresh_token.user_id))

    return {
        "message": "Login Successful",
        "access_token": access_token,
        "token_type": "bearer",
    }


# User Profile
@router.get(
    "/auth/profile",
    status_code=status.HTTP_200_OK,
    response_model=UserProfileResponse,
    summary="Get Current User",
    description="Get the profile of the currently authenticated user",
)
def profile(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return {"message": "Fetched user profile details", "user": user}


# User Profile Update
@router.patch(
    "/auth/profile",
    status_code=status.HTTP_200_OK,
    response_model=UserProfileResponse,
    summary="Update User Profile",
    description="Update the authenticated user's profile information, including name, username, bio, and website.",
)
def update_profile(
    user_data: UserProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    update_data = user_data.model_dump(exclude_unset=True)

    if "username" in update_data:
        existing_user = (
            db.query(User)
            .filter(User.username == update_data["username"], User.id != user_id)
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Username already exists"
            )

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return {"message": "Profile updated successfully", "user": user}


# Update Email
@router.patch(
    "/auth/email",
    status_code=status.HTTP_200_OK,
    response_model=UserProfileResponse,
    summary="Update Email Address",
    description="Request an email address change for the authenticated user. The new email address must be verified before the change is completed.",
)
def update_email(
    request: Request,
    background_tasks: BackgroundTasks,
    user_data: UserEmailUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if user.email == user_data.email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This is already your current email address",
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your current email before changing it",
        )

    existing_user = (
        db.query(User).filter(User.email == user_data.email, User.id != user_id).first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )

    raw_token = create_verification_token()

    verification_token = EmailVerificationToken(
        token_hash=hash_verification_token(raw_token),
        user_id=user.id,
        email=user_data.email,
        purpose="email_change",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )

    db.add(verification_token)
    db.commit()
    db.refresh(user)

    background_tasks.add_task(
        send_verification_email,
        to=user_data.email,
        first_name=user.name or "there",
        verification_url=build_verification_url(raw_token),
    )

    return {
        "message": "Verification email sent. Please verify your new email address.",
        "user": user,
    }


# Verify Email
@router.post(
    "/auth/email/verify",
    status_code=status.HTTP_200_OK,
    response_model=UserProfileResponse,
    summary="Verify Email Address",
    description="Verify a user's email address using a valid email verification token.",
)
def verify_email(
    verify_email_data: UserEmailVerificationRequest,
    db: Session = Depends(get_db),
):
    token_hash = hash_verification_token(verify_email_data.token)

    verification_token = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token_hash == token_hash)
        .first()
    )

    if not verification_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid verification token"
        )

    if verification_token.used:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Verification token has already been used",
        )

    if verification_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="Verification token has expired"
        )

    user = db.query(User).filter(User.id == verification_token.user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if verification_token.purpose == "email_change":
        user.email = verification_token.email

    user.email_verified = True
    user.email_verified_at = datetime.now(timezone.utc)

    verification_token.used = True

    db.commit()
    db.refresh(user)

    return {"message": "Email verified successfully", "user": user}


# Resend Verification Email
@router.post(
    "/auth/email/resend",
    status_code=status.HTTP_200_OK,
    response_model=UserProfileResponse,
    summary="Resend Verification Email",
    description="Generate a new verification token and resend the email verification link to the authenticated user's email address.",
)
def resend_verification_email(
    request: Request,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already verified",
        )

    # Invalidate existing verification tokens
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.used == False,
    ).update(
        {"used": True},
        synchronize_session=False,
    )

    # Create new token
    raw_token = create_verification_token()

    verification_token = EmailVerificationToken(
        token_hash=hash_verification_token(raw_token),
        user_id=user.id,
        email=user.email,
        purpose="signup",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )

    db.add(verification_token)
    db.commit()

    background_tasks.add_task(
        send_verification_email,
        to=user.email,
        first_name=user.name or "there",
        verification_url=build_verification_url(raw_token),
    )

    return {
        "message": "Verification email sent successfully",
        "user": user,
    }


# Change Password
@router.patch(
    "/auth/password",
    status_code=status.HTTP_200_OK,
    response_model=UserPasswordChangeResponse,
    summary="Change User Password",
    description="Change the password of the authenticated user. The current password must be verified before setting a new password.",
)
def change_password(
    request: Request,
    password_data: UserPasswordChangeRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if password_data.new_password != password_data.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New Passwords do not match",
        )

    user.password_hash = hash_password(password_data.new_password)

    db.commit()
    db.refresh(user)

    return {"message": "Password changed successfully"}


# Reset Password
@router.post(
    "/auth/password/reset",
    status_code=status.HTTP_200_OK,
    response_model=UserPasswordChangeResponse,
    summary="Reset User Password",
    description="Reset the user's password using a valid password reset token.",
)
def reset_password(
    request: Request,
    password_data: UserPasswordResetRequest,
    db: Session = Depends(get_db),
):
    token_hash = hash_verification_token(password_data.token)

    reset_token = (
        db.query(EmailVerificationToken)
        .filter(
            EmailVerificationToken.token_hash == token_hash,
            EmailVerificationToken.purpose == "password_reset",
        )
        .first()
    )

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid reset token",
        )

    if reset_token.used:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reset token has already been used",
        )

    if reset_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Reset token has expired",
        )

    if password_data.new_password != password_data.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match",
        )

    user = db.query(User).filter(User.id == reset_token.user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.password_hash = hash_password(password_data.new_password)
    reset_token.used = True

    db.commit()

    return {"message": "Password reset successfully"}


# Delete Account
@router.delete(
    "/auth/account",
    status_code=status.HTTP_200_OK,
    response_model=UserAccountDeleteResponse,
    summary="Delete User Account",
    description="Permanently delete the authenticated user's account and associated data.",
)
def delete_account(
    user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    db.delete(user)
    db.commit()

    return {"message": "Account deleted successfully"}

from fastapi import APIRouter, Depends, HTTPException, status
from database import get_db
from models import User
from sqlalchemy.orm import Session
from .auth import get_current_user
from passlib.context import CryptContext
from schemas.users import SingleUserResponse, UserUpdateResponse, UserPartialUpdate
from schemas.common import MessageResponse


# user route
router = APIRouter(prefix="/users", tags=["Users"])

# Hash Passwords
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Get the user profile
@router.get(
    "/profile/",
    response_model=SingleUserResponse,
    summary="Get the user profile",
    description="Retrieve the current authenticated user profile"
)
async def get_user_profile(
    current_user: User = Depends(get_current_user)
):
    return { "user": current_user }


# Update the user profile
@router.patch(
    "/profile/",
    response_model=UserUpdateResponse,
    summary="Update user profile",
    description="Update an existing user profile."
)
async def update_user_profile(
    user_data: UserPartialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_user = db.query(User).filter_by(id=current_user.id).first()

    if not update_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    update_data = user_data.model_dump(exclude_unset=True)

    if "username" in update_data:
        existing_username = db.query(User).filter(
            User.id != current_user.id,
            User.username == update_data["username"]
        ).first()

        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists."
            )

    if "email" in update_data:
        existing_email = db.query(User).filter(
            User.id != current_user.id,
            User.email == update_data["email"]
        ).first()

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists."
            )

    if "password" in update_data:
        password_to_hash = update_data.pop("password")

        if len(password_to_hash) > 72:
            password_to_hash = password_to_hash[:72]

        update_user.hashed_password = password_context.hash(password_to_hash)

    for field, value in update_data.items():
        setattr(update_user, field, value)

    try:
        db.commit()
        db.refresh(update_user)
    except Exception:
        db.rollback()
        raise

    return { "message": "User profile updated successfully!", "user": update_user }


# Delete User
@router.delete(
    "/profile/",
    response_model=MessageResponse,
    summary="Delete user profile",
    description="Delete the current authenticated User form the application"
)
async def delete_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter_by(id=current_user.id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    try:
        db.delete(user)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return { "message": "User deleted successfully!" }

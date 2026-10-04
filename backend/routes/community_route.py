from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID

from models import User, Snippet, Tag
from schemas.community_req_res import (
    AllCommunityUsersResponse,
    CommunityUserResponse,
    CommunityUserSnippetsResponse,
)
from utils.get_db import get_db
from utils.normalize import normalize_language

router = APIRouter(prefix="/api", tags=["Community"])


# Get community users
@router.get(
    "/community/users",
    status_code=status.HTTP_200_OK,
    response_model=AllCommunityUsersResponse,
    summary="Get community users",
    description="Retrieve users available in the community.",
)
def get_community_users(
    request: Request,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit

    query = db.query(User)

    total = query.count()

    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    has_next = offset + len(users) < total

    return {
        "message": "Fetched community users",
        "users": users,
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": has_next,
    }


# Get a community user's profile
@router.get(
    "/community/users/{user_id}",
    status_code=status.HTTP_200_OK,
    response_model=CommunityUserResponse,
    summary="Get community user profile",
    description="Retrieve a user's public community profile.",
)
def get_community_user(
    request: Request,
    user_id: UUID,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return {
        "message": "Fetched community user profile",
        "user": user,
    }


# Get a community user's public snippets
@router.get(
    "/community/users/{user_id}/snippets",
    status_code=status.HTTP_200_OK,
    response_model=CommunityUserSnippetsResponse,
    summary="Get community user's snippets",
    description="Retrieve the public snippets created by a community user.",
)
def get_community_user_snippets(
    request: Request,
    user_id: UUID,
    page: int = 1,
    limit: int = 10,
    language: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    query = db.query(Snippet).filter(
        Snippet.author_id == user_id,
        Snippet.is_public.is_(True),
    )

    if language:
        # Case-insensitive — see `utils/normalize.normalize_language`.
        query = query.filter(func.lower(Snippet.language) == normalize_language(language))

    if tag:
        query = query.join(Snippet.tags).filter(Tag.slug == tag)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Snippet.title.ilike(search_term)
            | Snippet.description.ilike(search_term)
            | Snippet.code.ilike(search_term)
        )

    total = query.count()

    snippets = (
        query.order_by(Snippet.created_at.desc()).offset(offset).limit(limit).all()
    )

    has_next = offset + len(snippets) < total

    return {
        "message": "Fetched community user's public snippets",
        "snippets": snippets,
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": has_next,
    }

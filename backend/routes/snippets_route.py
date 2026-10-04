from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from uuid import UUID

from middleware.rate_limit import limiter
from config.env_config import env_settings
from models import Snippet, Tag, User, SnippetBookmark
from utils.get_db import get_db
from auth.token import get_current_user_id
from services.ai_service import AIServiceError, explain_snippet
from utils.normalize import normalize_language
from schemas.snippet_req_res import (
    AllPublicSnippetResponse,
    TrendingSnippetResponse,
    PublicSnippetResonse,
    CreateSnippetRequest,
    AllSnippetResponse,
    UserSnippetResponse,
    UpdateSnippetRequest,
    DeleteSnippetResponse,
    CopySnippetResponse,
    BookmarkResponse,
    AllBookmarksResponse,
)

router = APIRouter(prefix="/api", tags=["Snippets"])


# Get All public snippets
@router.get(
    "/snippets/public",
    status_code=status.HTTP_200_OK,
    response_model=AllPublicSnippetResponse,
    summary="Get all public snippets",
    description="Retrieve all publicly available snippets.",
)
def get_public_snippets(
    request: Request,
    page: int = 1,
    limit: int = 10,
    language: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit

    query = db.query(Snippet).filter(Snippet.is_public.is_(True))

    if language:
        # Case-insensitive: the column holds whatever casing the author typed, and
        # the frontend sends the lowercased id from its language table. Exact
        # equality matched nothing for every snippet saved as "JavaScript".
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

    public_snippets = (
        query.order_by(Snippet.created_at.desc()).offset(offset).limit(limit).all()
    )

    return {
        "message": "Fetched all public snippets",
        "snippets": public_snippets,
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": offset + len(public_snippets) < total,
    }


# Trending public snippets
@router.get(
    "/snippets/trending",
    status_code=status.HTTP_200_OK,
    response_model=TrendingSnippetResponse,
    summary="Get trending snippets",
    description="Retrieve public snippets ranked by copy count, newest first as the tiebreak.",
)
def get_trending_snippets(
    request: Request,
    page: int = 1,
    limit: int = 10,
    language: str | None = None,
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit

    query = db.query(Snippet).filter(Snippet.is_public.is_(True))

    if language:
        query = query.filter(func.lower(Snippet.language) == normalize_language(language))

    total = query.count()

    trending = (
        query.order_by(Snippet.copy_count.desc(), Snippet.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "message": "Fetched trending snippets",
        "snippets": trending,
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": offset + len(trending) < total,
    }


# Fetch one public snippet
@router.get(
    "/snippets/public/{snippet_id}",
    status_code=status.HTTP_200_OK,
    response_model=PublicSnippetResonse,
    summary="Get a public snippet",
    description="Retrieve a single publicly available snippet by its ID.",
)
def get_snippet(request: Request, snippet_id: UUID, db: Session = Depends(get_db)):
    snippet = (
        db.query(Snippet)
        .filter(Snippet.id == snippet_id, Snippet.is_public.is_(True))
        .first()
    )

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
        )

    return {"message": "Fetched snippet details", "snippet": snippet}


# Create a Snippet
@limiter.limit("20/minute")
@router.post(
    "/snippets",
    status_code=status.HTTP_201_CREATED,
    response_model=PublicSnippetResonse,
    summary="Create a snippet",
    description="Create a new snippet for the authenticated user.",
)
def create_snippet(
    request: Request,
    snippet_data: CreateSnippetRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please login to create a snippet",
        )

    new_snippet = Snippet(
        title=snippet_data.title,
        description=snippet_data.description,
        code=snippet_data.code,
        language=snippet_data.language,
        is_public=snippet_data.is_public,
        author_id=user_id,
    )

    for tag_name in snippet_data.tags:
        normalized_name = tag_name.strip().lower()
        tag = db.query(Tag).filter(Tag.name == normalized_name).first()

        if not tag:
            tag = Tag(
                name=normalized_name,
                slug=normalized_name.replace(" ", "-"),
            )
            db.add(tag)

        new_snippet.tags.append(tag)

    db.add(new_snippet)
    db.commit()
    db.refresh(new_snippet)

    return {"message": "Snippet created successfully", "snippet": new_snippet}


# All Snippets of a user
@router.get(
    "/snippets",
    status_code=status.HTTP_200_OK,
    response_model=AllSnippetResponse,
    summary="Get user's snippets",
    description="Retrieve the authenticated user's snippets with pagination, language, tag, and search filters.",
)
def get_user_snippets(
    request: Request,
    page: int = 1,
    limit: int = 10,
    language: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit

    query = db.query(Snippet).filter(Snippet.author_id == user_id)

    if language:
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

    return {
        "message": "Fetched all user snippets",
        "snippets": snippets,
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": offset + len(snippets) < total,
    }


# Single Snippet by User
@router.get(
    "/snippets/{snippet_id}",
    status_code=status.HTTP_200_OK,
    response_model=UserSnippetResponse,
    summary="Get user's snippet",
    description="Retrieve a single snippet created by the authenticated user.",
)
def get_user_snippet(
    request: Request,
    snippet_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    snippet = (
        db.query(Snippet)
        .filter(
            Snippet.id == snippet_id,
            Snippet.author_id == user_id,
        )
        .first()
    )

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found",
        )

    return {
        "message": "Fetched snippet details",
        "snippet": snippet,
    }


# Update a snippet
@limiter.limit("30/minute")
@router.patch(
    "/snippets/{snippet_id}",
    status_code=status.HTTP_200_OK,
    response_model=UserSnippetResponse,
    summary="Update user's snippet",
    description="Update a snippet created by the authenticated user.",
)
def update_user_snippet(
    request: Request,
    snippet_id: UUID,
    snippet_data: UpdateSnippetRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    snippet = (
        db.query(Snippet)
        .filter(
            Snippet.id == snippet_id,
            Snippet.author_id == user_id,
        )
        .first()
    )

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found",
        )

    if snippet_data.title is not None:
        snippet.title = snippet_data.title

    if snippet_data.description is not None:
        snippet.description = snippet_data.description

    if snippet_data.code is not None:
        snippet.code = snippet_data.code

    if snippet_data.language is not None:
        snippet.language = snippet_data.language

    if snippet_data.is_public is not None:
        snippet.is_public = snippet_data.is_public

    if snippet_data.tags is not None:
        # Handle tag updates
        snippet.tags.clear()

        for tag_name in snippet_data.tags:
            normalized_name = tag_name.strip().lower()

            tag = db.query(Tag).filter(Tag.name == normalized_name).first()

            if not tag:
                tag = Tag(
                    name=normalized_name,
                    slug=normalized_name.replace(" ", "-"),
                )
                db.add(tag)

            snippet.tags.append(tag)

    db.commit()
    db.refresh(snippet)

    return {"message": "Snippet updated successfully", "snippet": snippet}


# Delete a snippet
@router.delete(
    "/snippets/{snippet_id}",
    status_code=status.HTTP_200_OK,
    response_model=DeleteSnippetResponse,
    summary="Delete user's snippet",
    description="Delete a snippet created by the authenticated user.",
)
def delete_user_snippet(
    request: Request,
    snippet_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    snippet = (
        db.query(Snippet)
        .filter(
            Snippet.id == snippet_id,
            Snippet.author_id == user_id,
        )
        .first()
    )

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found",
        )

    db.delete(snippet)
    db.commit()

    return {
        "message": "Snippet deleted successfully",
    }


# Generate an AI explanation for an owned snippet and store it
@limiter.limit("10/minute")
@router.post(
    "/snippets/{snippet_id}/explain",
    status_code=status.HTTP_200_OK,
    response_model=UserSnippetResponse,
    summary="Explain a snippet with AI",
    description="Generate an explanation for one of the authenticated user's snippets and persist it to ai_explanation.",
)
def explain_user_snippet(
    request: Request,
    snippet_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    snippet = (
        db.query(Snippet)
        .filter(
            Snippet.id == snippet_id,
            Snippet.author_id == user_id,
        )
        .first()
    )

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found",
        )

    try:
        explanation = explain_snippet(
            code=snippet.code,
            language=snippet.language,
            title=snippet.title,
        )
    except AIServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI explanation unavailable: {exc}",
        )

    snippet.ai_explanation = explanation

    db.commit()
    db.refresh(snippet)

    return {
        "message": "Snippet explained successfully",
        "snippet": snippet,
    }


# Copy Count of a snippet
@limiter.limit("30/minute")
@router.post(
    "/snippets/{snippet_id}/copy",
    status_code=status.HTTP_200_OK,
    response_model=CopySnippetResponse,
    summary="Copy a snippet",
    description="Increment the copy count of a snippet and return the snippet.",
)
def copy_snippet(
    request: Request,
    snippet_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    snippet = (
        db.query(Snippet)
        .filter(
            Snippet.id == snippet_id,
            Snippet.is_public.is_(True),
        )
        .first()
    )

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found",
        )

    snippet.copy_count += 1

    db.commit()
    db.refresh(snippet)

    return {
        "message": "Snippet copied successfully",
        "copy_count": snippet.copy_count,
    }


# Bookmark Snippet
@limiter.limit("30/minute")
@router.post(
    "/snippets/{snippet_id}/bookmark",
    status_code=status.HTTP_201_CREATED,
    response_model=BookmarkResponse,
    summary="Bookmark a snippet",
    description="Save a public snippet to the authenticated user's bookmarks.",
)
def bookmark_snippet(
    request: Request,
    snippet_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    snippet = (
        db.query(Snippet)
        .filter(
            Snippet.id == snippet_id,
            Snippet.is_public.is_(True),
        )
        .first()
    )

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found",
        )

    existing_bookmark = (
        db.query(SnippetBookmark)
        .filter(
            SnippetBookmark.user_id == user_id,
            SnippetBookmark.snippet_id == snippet_id,
        )
        .first()
    )

    if existing_bookmark:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Snippet already bookmarked",
        )

    bookmark = SnippetBookmark(
        user_id=user_id,
        snippet_id=snippet_id,
    )

    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)

    return {
        "message": "Snippet bookmarked successfully",
        "bookmark_id": bookmark.id,
    }


# Remove Bookmark from snippet
@router.delete(
    "/snippets/{snippet_id}/bookmark",
    status_code=status.HTTP_200_OK,
    response_model=BookmarkResponse,
    summary="Remove a bookmark",
    description="Remove a snippet from the authenticated user's bookmarks.",
)
def remove_bookmark(
    request: Request,
    snippet_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    bookmark = (
        db.query(SnippetBookmark)
        .filter(
            SnippetBookmark.user_id == user_id,
            SnippetBookmark.snippet_id == snippet_id,
        )
        .first()
    )

    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found",
        )

    # Capture the id before the delete: once flushed, the ORM instance is
    # expunged and attribute access on it raises.
    bookmark_id = bookmark.id

    db.delete(bookmark)
    db.commit()

    return {
        "message": "Bookmark removed successfully",
        "bookmark_id": bookmark_id,
    }


# Get all bookmarked snippet
@router.get(
    "/bookmarks",
    status_code=status.HTTP_200_OK,
    response_model=AllBookmarksResponse,
    summary="Get user's bookmarks",
    description="Retrieve all snippets bookmarked by the authenticated user with pagination, language, tag, and search filters.",
)
def get_user_bookmarks(
    request: Request,
    page: int = 1,
    limit: int = 10,
    language: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit

    query = (
        db.query(Snippet)
        .join(
            SnippetBookmark,
            SnippetBookmark.snippet_id == Snippet.id,
        )
        .filter(
            SnippetBookmark.user_id == user_id,
        )
    )

    if language:
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

    return {
        "message": "Fetched all user bookmarks",
        "bookmarks": snippets,
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": offset + len(snippets) < total,
    }

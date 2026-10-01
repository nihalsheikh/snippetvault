from fastapi import APIRouter, HTTPException, Depends, Request, status
from sqlalchemy.orm import Session
from uuid import UUID

from middleware.rate_limit import limiter
from models import Snippet, Comment
from utils.get_db import get_db
from auth.token import get_current_user_id
from schemas.comment_req_res import (
    CommentResponse,
    AllCommentsResponse,
    CreateCommentRequest,
    DeleteCommentResponse,
)

router = APIRouter(prefix="/api", tags=["Comments"])


# Get all comments on a snippet
@router.get(
    "/snippets/{snippet_id}/comments",
    status_code=status.HTTP_200_OK,
    response_model=AllCommentsResponse,
    summary="Get a snippet's comments",
    description="Retrieve the comments on a publicly available snippet.",
)
def get_snippet_comments(
    request: Request,
    snippet_id: UUID,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit

    snippet = (
        db.query(Snippet)
        .filter(Snippet.id == snippet_id, Snippet.is_public.is_(True))
        .first()
    )

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
        )

    query = db.query(Comment).filter(Comment.snippet_id == snippet_id)

    total = query.count()

    comments = (
        query.order_by(Comment.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "message": "Fetched all snippet comments",
        "comments": comments,
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": offset + len(comments) < total,
    }


# Comment on a snippet
@limiter.limit("5/minute")
@router.post(
    "/snippets/{snippet_id}/comments",
    status_code=status.HTTP_201_CREATED,
    response_model=CommentResponse,
    summary="Comment on a snippet",
    description="Add a comment to a publicly available snippet.",
)
def create_comment(
    request: Request,
    snippet_id: UUID,
    comment_data: CreateCommentRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    snippet = (
        db.query(Snippet)
        .filter(Snippet.id == snippet_id, Snippet.is_public.is_(True))
        .first()
    )

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
        )

    comment = Comment(
        user_id=user_id,
        snippet_id=snippet_id,
        body=comment_data.body.strip(),
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "message": "Comment added successfully",
        "comment": comment,
    }


# Delete a comment
@router.delete(
    "/comments/{comment_id}",
    status_code=status.HTTP_200_OK,
    response_model=DeleteCommentResponse,
    summary="Delete a comment",
    description="Delete one of the authenticated user's own comments.",
)
def delete_comment(
    request: Request,
    comment_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    comment = (
        db.query(Comment)
        .filter(Comment.id == comment_id, Comment.user_id == user_id)
        .first()
    )

    # Filtering on user_id already scopes this to the caller, so a comment owned
    # by someone else is indistinguishable from one that does not exist. That is
    # deliberate — a 403 here would confirm the id is real.
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
        )

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted successfully"}
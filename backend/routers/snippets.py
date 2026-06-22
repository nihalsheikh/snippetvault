from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Snippet, User
from .auth import get_current_user
from schemas.snippets import SnippetCreate, SnippetListResponse, CreatedSnippetResponse, SingleSnippetResponse, AllSnippetResponse, UpdateSnippetResponse, SnippetPartialUpdate
from schemas.common import MessageResponse

# snippet route
router = APIRouter(prefix="/snippets", tags=["Snippets"])


# Create Snippet Route
@router.post(
    "/",
    response_model=CreatedSnippetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new snippet",
    description="Create a new snippet owned by the authenticated user"
)
async def create_snippet(
    snippet_data: SnippetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create an instance of Snippet Class
    new_snippet = Snippet(
        title=snippet_data.title,
        description=snippet_data.description,
        code=snippet_data.code,
        language=snippet_data.language,
        tags=snippet_data.tags,
        user_id=current_user.id,
        is_public=snippet_data.is_public
    )

    # add, commit, refresh
    db.add(new_snippet)

    try:
        db.commit()
        db.refresh(new_snippet)
    except Exception:
        db.rollback()
        raise

    return { "message": "Snippet saved to database successfully!", "snippet": new_snippet }


# Get All Snippets Route
@router.get(
    "/",
    response_model=AllSnippetResponse,
    summary="Get all snippets",
    description="Retrieve all snippets available in the system."
)
async def get_all_snippets(db: Session = Depends(get_db)):
    all_snippets = db.query(Snippet).filter(Snippet.is_public == True).all()
    return { "all_snippets": all_snippets }


# Get the user created snippets
@router.get(
    "/me",
    response_model=SnippetListResponse,
    summary="Get user created snippets",
    description="Get the snippets created by the authenticated user"
)
async def get_user_snippets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_snippets = db.query(Snippet).filter(Snippet.user_id == current_user.id).all()

    return { "user_snippets": user_snippets }


# Get One Snippet Route
@router.get(
    "/{snippet_id}/",
    response_model=SingleSnippetResponse,
    summary="Get the clicked snippet",
    description="Retrieve a snippet by its unique identifier."
)
async def get_one_snippet(
    snippet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    snippet = db.query(Snippet).filter_by(id=snippet_id).first()

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found"
        )

    if (
        not snippet.is_public
        and snippet.user_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this snippet"
        )

    return { "snippet": snippet }


# Update Snippet Route
@router.patch(
    "/{snippet_id}/",
    response_model=UpdateSnippetResponse,
    summary="Update the snippet",
    description="Update an existing snippet owned by the authenticated user."
)
async def update_snippet(
    snippet_id: int,
    snippet_data: SnippetPartialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_snippet = db.query(Snippet).filter_by(id=snippet_id).first()

    if update_snippet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found"
        )

    if update_snippet.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this snippet"
        )

    update_data = snippet_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(update_snippet, field, value)

    try:
        db.commit()
        db.refresh(update_snippet)
    except Exception:
        db.rollback()
        raise

    return { "message": "Snippet data updated successfully!", "snippet": update_snippet }


# Delete Snippet Route
@router.delete(
    "/{snippet_id}/",
    response_model=MessageResponse,
    summary="Delete the current snippet",
    description="Delete a snippet owned by the authenticated user."
)
async def delete_snippet(
    snippet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    del_snippet = db.query(Snippet).filter_by(id=snippet_id).first()

    # if not snippet with that id is found
    if not del_snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found"
        )

    # check current user auth status
    if del_snippet.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this snippet"
        )

    try:
        db.delete(del_snippet)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return { "message": "Snippet deleted successfully" }

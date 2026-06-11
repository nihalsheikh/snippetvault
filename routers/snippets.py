from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db, Snippet, User
from .auth import get_current_user
from schemas import SnippetCreates, UserCreate

# snippet route
router = APIRouter(prefix="/snippets", tags=["Snippets"])

### Create Snippet Route
@router.post("/")
async def create_snippet(
    snippet_data: SnippetCreates,
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
        user_id=current_user.id
    )

    # add, commit, refresh
    db.add(new_snippet)
    db.commit()
    db.refresh(new_snippet)

    return { "message": "Snippet saved to database successfully!", "id": new_snippet.id }


### Get All Snippets Route
@router.get("/")
async def get_all_snippets(db: Session = Depends(get_db)):
    all_snippets = db.query(Snippet).all()
    return { "all_snippets": all_snippets }


### Get One Snippet Route
@router.get("/{snippet_id}/")
async def get_one_snippet(snippet_id: int, db: Session = Depends(get_db)):
    snippet = db.query(Snippet).filter_by(id=snippet_id).first()
    return { "snippet": snippet }


# Update Snippet Route
@router.put("/{snippet_id}/")
async def update_snippet(
    snippet_id: int,
    snippet_data: SnippetCreates,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_snippet = db.query(Snippet).filter_by(id=snippet_id).first()

    if update_snippet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found"
        )

    update_snippet.title=snippet_data.title
    update_snippet.description=snippet_data.description
    update_snippet.code=snippet_data.code
    update_snippet.language=snippet_data.language
    update_snippet.tags=snippet_data.tags
    update_snippet.user_id=current_user.id

    db.commit()
    db.refresh(update_snippet)

    return { "message": "Snippet data updated successfully!" }


# Delete Snippet Route
@router.delete("/{snippet_id}/")
async def delete_snippet(
    snippet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    del_snippet = db.query(Snippet).filter_by(id=snippet_id).first()

    # if not snippet with that id is found
    if not del_snippet:
        raise HTTPException(status_code=404, detail="Snippet not found")

    # check current user auth status
    if del_snippet.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this snippet"
        )

    db.delete(del_snippet)
    db.commit()

    return { "message": "Snipped deleted successfully" }

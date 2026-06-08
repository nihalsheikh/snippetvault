from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from database import SessionLocal, Snippet


# FastAPI instance
app = FastAPI()


# Snippet Model Request Body
class SnippetCreates(BaseModel):
    title: str
    description: Optional[str] = None
    code: str
    language: str
    tags: Optional[str] = None
    user_id: str


# Start DB session for each request and close it after completion
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Routes
### Home Route
@app.get("/")
def home_route():
    return { "message": "SnippetVault API is online" }


### Create Snippet Route
@app.post("/snippets/")
async def create_snippet(snippet_data: SnippetCreates, db: Session = Depends(get_db)):
    # Create an instance of Snippet Class
    new_snippet = Snippet(
        title=snippet_data.title,
        description=snippet_data.description,
        code=snippet_data.code,
        language=snippet_data.language,
        tags=snippet_data.tags,
        user_id=snippet_data.user_id
    )

    # add it to the DB session
    db.add(new_snippet)

    # commit/save data to DB
    db.commit()

    # refresh the DB to generate and get ID
    db.refresh(new_snippet)

    return { "message": "Snippet saved to database successfully!", "id": new_snippet.id }


### Get All Snippet Route
@app.get("/snippets/")
async def get_all_snippets(db: Session = Depends(get_db)):
    all_snippets = db.query(Snippet).all()
    return { "all_snippets": all_snippets }


### Get One Snippet Route
@app.get("/snippets/{snippet_id}/")
async def get_one_snippet(snippet_id: int, db: Session = Depends(get_db)):
    snippet = db.query(Snippet).filter_by(id=snippet_id).first()
    return { "snippet": snippet }


### Update Snippet Route
@app.put("/snippets/{snippet_id}/")
async def update_snippet(snippet_id: int, snippet_data: SnippetCreates, db: Session = Depends(get_db)):
    update_snippet = db.query(Snippet).filter_by(id=snippet_id).first()

    if update_snippet is None:
        raise HTTPException(status_code=404, detail="Snippet not found")

    update_snippet.title=snippet_data.title
    update_snippet.description=snippet_data.description
    update_snippet.code=snippet_data.code
    update_snippet.language=snippet_data.language
    update_snippet.tags=snippet_data.tags
    update_snippet.user_id=snippet_data.user_id

    db.commit()
    db.refresh(update_snippet)

    return { "message": "Snippet data updated successfully!" }


### Delete Snippet Route
@app.delete("/snippets/{snippet_id}/")
async def delete_snippet(snippet_id: int, db: Session = Depends(get_db)):
    del_snippet = db.query(Snippet).filter_by(id=snippet_id).first()

    if del_snippet is None:
        raise HTTPException(status_code=404, detail="Snippet not found")

    db.delete(del_snippet)
    db.commit()

    return { "message": "Snipped deleted successfully" }

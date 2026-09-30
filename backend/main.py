from fastapi import FastAPI, status

from database.db import Base, engine
from models import User, Snippet, OAuthAccount

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SnippetVault API")


@app.get("/api/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health():
    return {"message": "API is healthy", "status": "OK"}

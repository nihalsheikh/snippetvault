from fastapi import FastAPI
from routers import auth, snippets, users
from database import SessionLocal, Snippet

# FastAPI instance
app = FastAPI()

# All the other routes
app.include_router(auth.router)
app.include_router(snippets.router)
# app.include_router(users.router)

# Home Route
@app.get("/")
def home():
    return { "message": "SnippetVault API is online" }

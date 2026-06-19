from fastapi import FastAPI
from routers import auth, snippets, users

# FastAPI instance
app = FastAPI()

# All the other routes
app.include_router(auth.router)
app.include_router(snippets.router)
app.include_router(users.router)

# Home Route
@app.get(
    "/",
    summary="Home Page",
    description="Health check endpoint to verify that the SnippetVault API is running."
)
def home_page():
    return { "message": "SnippetVault API is online" }

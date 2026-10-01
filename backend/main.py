from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from database.db import Base, engine
from config.env_config import env_settings
from models import User, Snippet, OAuthAccount, RefreshToken
from middleware.exception_handler import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)

from routes.health_route import router as health_router
from routes.users_route import router as user_router
from routes.snippets_route import router as snippet_router
from routes.collections_route import router as collections_router

Base.metadata.create_all(bind=engine)

BASE_DIR = Path(__file__).resolve().parent


app = FastAPI(title="SnippetVault API")


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[env_settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Email Template Icons
app.mount(
    "/emails/icons",
    StaticFiles(directory=BASE_DIR / "emails" / "templates" / "icons"),
)


# Error Handlers Middlewares
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)


# Routes
app.include_router(snippet_router)
app.include_router(collections_router)
app.include_router(user_router)
app.include_router(health_router)

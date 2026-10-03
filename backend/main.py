from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import logging
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from database.db import Base, engine
from config.env_config import env_settings
from models import User, Snippet, OAuthAccount, RefreshToken
from middleware.rate_limit import limiter
from middleware.exception_handler import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)

from routes.health_route import router as health_router
from routes.users_route import router as user_router
from routes.snippets_route import router as snippet_router
from routes.collections_route import router as collections_router
from routes.community_route import router as community_router
from routes.ai_route import router as ai_router
from routes.comments_route import router as comments_router
from routes.oauth_route import router as oauth_router

Base.metadata.create_all(bind=engine)

BASE_DIR = Path(__file__).resolve().parent

# Nothing in the app configures logging, so email failures would otherwise only
# reach stderr via the last-resort handler. One config here makes every
# `logger.info`/`logger.error` in the codebase actually visible in the terminal.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)


app = FastAPI(title="SnippetVault API")


# Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)


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
app.include_router(community_router)
app.include_router(user_router)
app.include_router(health_router)
app.include_router(ai_router)
app.include_router(comments_router)
app.include_router(oauth_router)

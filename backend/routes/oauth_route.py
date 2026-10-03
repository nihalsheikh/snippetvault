"""Google and GitHub sign-in.

The flow is three routes: `/{provider}/start` bounces the browser to the provider,
the provider calls `/{provider}/callback`, and that either signs the user in or
creates the account and then does the same. The browser never sees a provider token —
the callback is server-to-server and hands back SnippetVault's own JWT, so the
frontend's storage and refresh logic is identical for social and password sign-in.

The `state` round-trip is the security-relevant part. It's minted here, parked in a
short-lived cookie, and required to match on the way back; without that, an attacker
could start a flow with their own account and feed the resulting code to a victim.
"""

import logging
import secrets
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from config.env_config import env_settings
from config.jwt_config import refresh_token_expire_days
from models import OAuthAccount, RefreshToken, User
from schemas.oauth_req_res import OAuthProvidersResponse
from services.oauth_service import (
    OAuthError,
    OAuthIdentity,
    OAuthNotConfigured,
    authorize_url,
    exchange_code,
    fetch_identity,
    is_configured,
    new_state,
    state_is_fresh,
)
from utils.get_db import get_db
from utils.oauth_enums import OAuthProvider
from utils.username import claim_username

from auth.jwt import create_access_token
from auth.refresh_token import create_refresh_token, hash_refresh_token

router = APIRouter(prefix="/api/auth/oauth", tags=["OAuth"])

logger = logging.getLogger(__name__)

# Named per provider so a GitHub tab and a Google tab don't overwrite each other's
# `state` while both are in flight.
STATE_COOKIE = "sv_oauth_state_{provider}"

# The cookie is only a CSRF token, not a session — but it still must not be readable
# from JavaScript, and it only needs to survive the round trip.
COOKIE_MAX_AGE = 600


def _provider_of(value: str) -> OAuthProvider:
    try:
        return OAuthProvider(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unknown sign-in provider"
        )


def _issue_tokens(user: User, db: Session) -> dict[str, str]:
    """Mint the same token pair a password login returns."""
    access = create_access_token(str(user.id))
    raw_refresh = create_refresh_token()

    db.add(
        RefreshToken(
            token_hash=hash_refresh_token(raw_refresh),
            user_id=user.id,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=refresh_token_expire_days),
        )
    )
    db.commit()

    return {"access_token": access, "refresh_token": raw_refresh, "token_type": "bearer"}


def _link_or_create(
    db: Session, identity: OAuthIdentity, access_token: str, refresh_token: str | None
) -> User:
    """Resolve an identity to a local user, creating one if this is a first sign-in.

    Two rows can match: an `OAuthAccount` linking a provider id, or a `User` with the
    same email from a previous password signup. The second case is the interesting one
    — silently creating a second account would split that person's library in two, so
    the existing account is claimed and linked instead.
    """
    existing_link = (
        db.query(OAuthAccount)
        .filter(
            OAuthAccount.provider == identity.provider,
            OAuthAccount.provider_account_id == identity.account_id,
        )
        .first()
    )

    user = existing_link.user if existing_link else None

    if user is None:
        user = db.query(User).filter(User.email == identity.email).first()

    if user is None:
        user = User(
            name=identity.name,
            email=identity.email,
            # The handle is claimed the same way a password signup does it, so a social
            # and a password account for one address can't end up with two handles.
            username=claim_username(identity.email, db),
            # The provider proved control of the address, which is exactly what the
            # verification email exists to establish — sending one here would be a
            # step backwards for the user and a cost for the server.
            email_verified=True,
            email_verified_at=datetime.now(timezone.utc),
            profile_image=identity.picture,
        )
        db.add(user)
        db.flush()
        logger.info("Created account via %s sign-in", identity.provider.value)

    if existing_link is None:
        db.add(
            OAuthAccount(
                user_id=user.id,
                provider=identity.provider,
                provider_account_id=identity.account_id,
                access_token=access_token,
                refresh_token=refresh_token,
            )
        )
    else:
        existing_link.access_token = access_token
        existing_link.refresh_token = refresh_token or existing_link.refresh_token

    # A social sign-in can carry a display name or avatar the account didn't have.
    if identity.name and not user.name:
        user.name = identity.name
    if identity.picture and not user.profile_image:
        user.profile_image = identity.picture

    db.commit()
    db.refresh(user)
    return user


@router.get(
    "/providers",
    status_code=status.HTTP_200_OK,
    response_model=OAuthProvidersResponse,
    summary="List available sign-in providers",
    description="Which social sign-ins this server has credentials for. The frontend "
    "renders a button only for the providers listed here.",
)
def list_providers():
    return {
        "message": "Fetched available sign-in providers",
        "providers": [p.value for p in OAuthProvider if is_configured(p)],
    }


@router.get(
    "/{provider}/start",
    status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    summary="Begin a social sign-in",
    description="Redirects the browser to the provider's consent screen.",
)
def start(
    provider: str,
    response: Response,
    db: Session = Depends(get_db),
):
    target = _provider_of(provider)

    if not is_configured(target):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{target.value.title()} sign-in isn't configured on this server.",
        )

    state, minted = new_state()

    try:
        url = authorize_url(target, state)
    except OAuthNotConfigured as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc

    response.set_cookie(
        STATE_COOKIE.format(provider=target.value),
        f"{minted.timestamp()}:{state}",
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=env_settings.base_url.startswith("https"),
        path="/",
    )

    return Response(status_code=status.HTTP_307_TEMPORARY_REDIRECT, headers={"Location": url})


@router.get(
    "/{provider}/callback",
    status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    summary="Complete a social sign-in",
    description="Exchanges the provider's code for a SnippetVault session, then "
    "redirects the browser to the frontend to pick it up.",
)
def callback(
    provider: str,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    target = _provider_of(provider)

    # The provider reports a user-declined consent screen here, and there is nothing
    # to do but send them back to the form with a message.
    if error:
        return _back_to_frontend(target, oauth_error=f"{target.value.title()} sign-in was cancelled.")

    cookie = request.cookies.get(STATE_COOKIE.format(provider=target.value))

    if not code or not state or not cookie:
        return _back_to_frontend(target, oauth_error="That sign-in link is incomplete. Please try again.")

    try:
        minted_at, expected = cookie.split(":", 1)
        fresh = state_is_fresh(
            datetime.fromtimestamp(float(minted_at), tz=timezone.utc)
        )
    except (ValueError, TypeError, OSError):
        return _back_to_frontend(target, oauth_error="That sign-in link is invalid. Please try again.")

    # Both halves must hold: the state we minted, and a link young enough to still be
    # the one the user just started.
    if not secrets_equal(expected, state) or not fresh:
        logger.warning("Rejected %s callback with a bad state", target.value)
        return _back_to_frontend(target, oauth_error="That sign-in link has expired. Please try again.")

    try:
        provider_token, provider_refresh = exchange_code(target, code)
        identity = fetch_identity(target, provider_token)
        user = _link_or_create(db, identity, provider_token, provider_refresh)
    except OAuthNotConfigured as exc:
        return _back_to_frontend(target, oauth_error=str(exc))
    except OAuthError as exc:
        return _back_to_frontend(target, oauth_error=str(exc))

    tokens = _issue_tokens(user, db)

    # The `state` cookie has done its job; clearing it stops a stale one from being
    # replayed against a second sign-in in the same browser.
    response = _back_to_frontend(target, **tokens)
    response.delete_cookie(STATE_COOKIE.format(provider=target.value), path="/")
    return response


def _back_to_frontend(provider: OAuthProvider, **params: str) -> Response:
    """Redirect the browser to the frontend's OAuth landing page.

    Tokens go in the URL *fragment*. A fragment is never sent to a server, never
    written to an access log, and never lands in a `Referer` header — which is the
    whole reason this isn't a query string. The landing page reads it, stores the
    session, and immediately clears the address bar.
    """
    fragment = urlencode({k: v for k, v in params.items() if v})
    return RedirectResponse(
        url=f"{env_settings.frontend_url.rstrip('/')}/auth/callback#{fragment}",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )


def secrets_equal(a: str, b: str) -> bool:
    """Constant-time compare, so the state can't be recovered by timing the endpoint."""
    return secrets.compare_digest(a, b)

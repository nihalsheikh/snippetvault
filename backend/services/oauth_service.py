"""Google and GitHub sign-in.

Deliberately dependency-free — `httpx` is already in the project's requirements, and
the whole flow is three calls, so pulling in an OAuth library would add a dependency
without removing any code worth removing.

Each provider gets the same three steps: send the user to an authorize URL with a
`state` we minted and remember, exchange the returned code for tokens, then ask who
the account belongs to. `state` is what stops a third party from feeding us a code of
their own choosing; it is single-use and expires with the attempt window.

Nothing in here logs or returns a provider token to the client. The access token is
stored against the `OAuthAccount` row so the app can act as the user later, but it is
never echoed back — the browser gets SnippetVault's own JWT, exactly as it does for
a password login.
"""

import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx

from config.env_config import env_settings
from utils.oauth_enums import OAuthProvider

logger = logging.getLogger(__name__)

# A redirect is only honoured when the state we minted for it comes back intact.
STATE_TTL_SECONDS = 600


class OAuthError(RuntimeError):
    """Anything that stops a sign-in. The message is safe to show the user."""


class OAuthNotConfigured(OAuthError):
    """No client id/secret for this provider."""


@dataclass(frozen=True)
class OAuthIdentity:
    """Who the provider says the user is."""

    provider: OAuthProvider
    account_id: str
    email: str
    name: str | None
    # Google's avatar is served from a different host than ours; GitHub gives a URL
    # too. Kept so the account can be seeded with a picture on first sign-in.
    picture: str | None = None


# Per-provider endpoints. Google's consent screen rejects this app's dev redirect
# URIs until they're listed, so both are registered against localhost explicitly.
PROVIDERS = {
    OAuthProvider.GOOGLE: {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "userinfo": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    OAuthProvider.GITHUB: {
        "authorize": "https://github.com/login/oauth/authorize",
        "token": "https://github.com/login/oauth/access_token",
        "userinfo": "https://api.github.com/user",
        # A public email is often absent from the profile, so `user:email` is asked
        # for too — without it a GitHub account with a private email can't sign in.
        "scope": "read:user user:email",
    },
}


def is_configured(provider: OAuthProvider) -> bool:
    creds = _credentials(provider)
    return bool(creds[0] and creds[1])


def _credentials(provider: OAuthProvider) -> tuple[str | None, str | None]:
    if provider is OAuthProvider.GOOGLE:
        return env_settings.google_client_id, env_settings.google_client_secret
    return env_settings.github_client_id, env_settings.github_client_secret


def redirect_uri(provider: OAuthProvider) -> str:
    """Where the provider sends the user back to.

    Pinned to the configured backend URL rather than derived from the request, so a
    forged Host header can't redirect a code to an attacker's listener.
    """
    return f"{env_settings.base_url.rstrip('/')}/api/auth/oauth/{provider.value}/callback"


def new_state() -> tuple[str, datetime]:
    """A fresh single-use CSRF token and the moment it was minted."""
    return secrets.token_urlsafe(24), datetime.now(timezone.utc)


def state_is_fresh(minted: datetime) -> bool:
    age = (datetime.now(timezone.utc) - minted).total_seconds()
    return 0 <= age <= STATE_TTL_SECONDS


def authorize_url(provider: OAuthProvider, state: str) -> str:
    """The URL that starts the flow. `extra` adds provider-specific parameters."""
    client_id, _ = _credentials(provider)
    if not client_id:
        raise OAuthNotConfigured(
            f"{provider.value.title()} sign-in isn't configured on this server."
        )

    config = PROVIDERS[provider]
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri(provider),
        "response_type": "code",
        "scope": config["scope"],
        "state": state,
        # Google's consent screen shows this next to the app name; it is required.
        "access_type": "offline",
        "prompt": "select_account",
        "include_granted_scopes": "true",
    }
    params.update(_extra_params(provider))

    return f"{config['authorize']}?{urlencode(params)}"


def _extra_params(provider: OAuthProvider) -> dict[str, str]:
    if provider is OAuthProvider.GOOGLE:
        return {"nonce": secrets.token_urlsafe(16)}
    # GitHub's own account picker, which lets one button switch between identities.
    return {"allow_signup": "true"}


def exchange_code(provider: OAuthProvider, code: str) -> tuple[str | None, str | None]:
    """Trade an authorization code for (access_token, refresh_token)."""
    client_id, client_secret = _credentials(provider)
    if not client_id or not client_secret:
        raise OAuthNotConfigured(
            f"{provider.value.title()} sign-in isn't configured on this server."
        )

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri(provider),
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                PROVIDERS[provider]["token"],
                data=payload,
                headers={"Accept": "application/json"},
            )
    except httpx.HTTPError as exc:
        raise OAuthError("Couldn't reach the sign-in provider. Try again.") from exc

    if response.status_code >= 400:
        # The provider's own wording names the client id and describes the flow; the
        # log keeps it, the user gets a sentence they can act on.
        logger.warning(
            "%s token exchange failed: %s %s",
            provider.value,
            response.status_code,
            response.text[:400],
        )
        raise OAuthError(f"{provider.value.title()} rejected the sign-in.")

    data = response.json()
    access = data.get("access_token")
    if not access:
        raise OAuthError("The sign-in provider returned no access token.")

    return access, data.get("refresh_token")


def fetch_identity(provider: OAuthProvider, access_token: str) -> OAuthIdentity:
    """Ask the provider who this access token belongs to."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "User-Agent": "SnippetVault",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(PROVIDERS[provider]["userinfo"], headers=headers)
    except httpx.HTTPError as exc:
        raise OAuthError("Couldn't reach the sign-in provider. Try again.") from exc

    if response.status_code >= 400:
        logger.warning(
            "%s userinfo failed: %s", provider.value, response.status_code
        )
        raise OAuthError("Couldn't read your account from the provider.")

    data = response.json()
    email = data.get("email")
    if not email and provider is OAuthProvider.GITHUB:
        email = _github_primary_email(access_token)

    if not email:
        # Both providers can return a profile with no email, and the `users` table
        # requires one. There is nothing to invent here.
        raise OAuthError(
            f"Your {provider.value.title()} account has no public email address. "
            "Add one, then try again."
        )

    return OAuthIdentity(
        provider=provider,
        account_id=str(data.get("sub") or data.get("id") or ""),
        email=str(email).lower(),
        name=data.get("name") or data.get("login") or None,
        picture=data.get("picture") or data.get("avatar_url") or None,
    )


def _github_primary_email(access_token: str) -> str | None:
    """GitHub's fallback for a profile whose own `email` field is null."""
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                    "User-Agent": "SnippetVault",
                },
            )
        if response.status_code >= 400:
            return None
        entries = response.json()
    except httpx.HTTPError:
        return None

    for entry in entries if isinstance(entries, list) else []:
        if entry.get("primary") and entry.get("verified"):
            return entry.get("email")
    return None

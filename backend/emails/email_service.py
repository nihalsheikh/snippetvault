from sib_api_v3_sdk.rest import ApiException
import sib_api_v3_sdk
import logging

from config.env_config import env_settings
from .render import render_template

logger = logging.getLogger(__name__)

configuration = sib_api_v3_sdk.Configuration()
configuration.api_key["api-key"] = env_settings.brevo_api_key

brevo_api = sib_api_v3_sdk.ApiClient(configuration)


def send_email(
    to: str,
    subject: str,
    html_content: str,
    name: str | None = None,
):
    api = sib_api_v3_sdk.TransactionalEmailsApi(brevo_api)

    sender = sib_api_v3_sdk.SendSmtpEmailSender(
        name=env_settings.brevo_sender_name,
        email=env_settings.brevo_sender_email,
    )

    recipient = sib_api_v3_sdk.SendSmtpEmailTo(email=to, name=name)

    email = sib_api_v3_sdk.SendSmtpEmail(
        sender=sender,
        to=[recipient],
        subject=subject,
        html_content=html_content,
    )

    try:
        response = api.send_transac_email(email)
        logger.info("Sent %r to %s", subject, to)
        return response
    except ApiException as e:
        # Callers run this as a BackgroundTask, so the HTTP response has already
        # gone out by the time we get here — raising would only surface as an
        # unhandled worker error. Log instead so the send is not lost silently.
        logger.error(
            "Failed to send %r to %s (status %s): %s",
            subject,
            to,
            getattr(e, "status", "?"),
            getattr(e, "body", str(e)),
        )
        return None


def send_verification_email(
    to: str,
    first_name: str,
    verification_url: str,
):
    html = render_template(
        "01-email-verification.html",
        email=to,
        first_name=first_name,
        verification_url=verification_url,
    )

    return send_email(
        to=to,
        subject="Verify your SnippetVault email",
        html_content=html,
        name=first_name,
    )


def send_password_reset_email(
    to: str,
    first_name: str,
    reset_url: str,
    resend_url: str,
):
    html = render_template(
        "02-password-reset.html",
        email=to,
        first_name=first_name,
        reset_url=reset_url,
        resend_url=resend_url,
    )

    return send_email(
        to=to,
        subject="Reset your SnippetVault password",
        html_content=html,
        name=first_name,
    )


def send_password_changed_email(
    to: str,
    first_name: str,
    changed_at: str,
    device: str,
    location: str,
    reset_password_url: str,
    account_security_url: str,
):
    html = render_template(
        "03-password-changed.html",
        email=to,
        first_name=first_name,
        changed_at=changed_at,
        device=device,
        location=location,
        reset_password_url=reset_password_url,
        account_security_url=account_security_url,
    )

    return send_email(
        to=to,
        subject="Your SnippetVault password was changed",
        html_content=html,
        name=first_name,
    )

from sib_api_v3_sdk.rest import ApiException
import sib_api_v3_sdk

from config.env_config import env_settings
from .render import render_template

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
        return api.send_transac_email(email)
    except ApiException as e:
        raise RuntimeError(f"Failed to send email: {e}")


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

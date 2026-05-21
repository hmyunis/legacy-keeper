from maileroo import MailerooClient, EmailAddress
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def send_notification_email(subject: str, html_content: str, plain_content: str, to_email: str, to_name: str = None):
    if not settings.USE_MAILEROO:
        print("\n" + "="*50)
        print(f"EMAIL INTERCEPTED (DEV MODE) -> {to_email}")
        print(f"Subject: {subject}")
        print("-" * 50)
        print(plain_content)
        print("="*50 + "\n")
        return "local-console-intercept"

    try:
        client = MailerooClient(settings.MAILEROO_API_KEY)

        email_data = {
            "from": EmailAddress(settings.DEFAULT_FROM_EMAIL, settings.DEFAULT_FROM_NAME),
            "to": [EmailAddress(to_email, to_name)],
            "subject": subject,
            "html": html_content,
            "plain": plain_content
        }

        reference_id = client.send_basic_email(email_data)
        logger.info(f"Maileroo email sent successfully. Ref ID: {reference_id}")
        return reference_id

    except Exception as e:
        logger.error(f"Failed to send email via Maileroo: {str(e)}")
        raise e

from decouple import config
from maileroo import MailerooClient, EmailAddress
import logging

logger = logging.getLogger(__name__)

USE_MAILEROO = config('USE_MAILEROO', default=False, cast=bool)
MAILEROO_API_KEY = config('MAILEROO_API_KEY', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='museum@yourfamily.com')
DEFAULT_FROM_NAME = config('DEFAULT_FROM_NAME', default='LegacyKeeper Museum')

def send_notification_email(subject: str, html_content: str, plain_content: str, to_email: str, to_name: str = None):
    if not USE_MAILEROO:
        print("\n" + "="*50)
        print(f"EMAIL INTERCEPTED (DEV MODE) -> {to_email}")
        print(f"Subject: {subject}")
        print("-" * 50)
        print(plain_content)
        print("="*50 + "\n")
        return "local-console-intercept"

    try:
        client = MailerooClient(MAILEROO_API_KEY)

        email_data = {
            "from": EmailAddress(DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME),
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
import logging
from django.conf import settings
from maileroo import MailerooClient, EmailAddress

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = settings.MAILEROO_API_KEY
        self.from_email = settings.DEFAULT_FROM_EMAIL
        self.from_name = "LegacyKeeper"
        
        # Initialize client if key exists, else None
        if self.api_key:
            self.client = MailerooClient(self.api_key)
        else:
            self.client = None

    def send_basic_email(self, to_email, subject, html_content, plain_content=None):
        """
        Sends a basic email using Maileroo.
        For development, it prints the output to console.
        """
        if not plain_content:
            plain_content = "Please view this email in an HTML compatible viewer."

        payload = {
            "from": EmailAddress(self.from_email, self.from_name),
            "to": [EmailAddress(to_email)],
            "subject": subject,
            "html": html_content,
            "plain": plain_content,
            "tracking": True
        }

        # --- CONSOLE OUTPUT FOR TESTING ---
        print("\n" + "="*50)
        print(" [MAILEROO MOCK SEND] ")
        print(f" To: {to_email}")
        print(f" Subject: {subject}")
        print("-" * 20)
        print(f" Body: {html_content}")
        print("="*50 + "\n")
        # ----------------------------------

        # UNCOMMENT THE FOLLOWING LINES TO ACTUALLY SEND
        # try:
        #     if self.client:
        #         reference_id = self.client.send_basic_email(payload)
        #         return reference_id
        #     else:
        #         logger.warning("Maileroo API Key missing. Email not sent.")
        # except Exception as e:
        #     logger.error(f"Failed to send email: {str(e)}")
        #     raise e
        
        return "mock-ref-id"

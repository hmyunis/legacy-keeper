import csv
from io import StringIO
from celery import shared_task
from django.core.mail import EmailMessage
from django.conf import settings
from core.models import ActionLog, Vault
from core.utils.mail import send_notification_email
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, queue='default')
def send_invite_email_task(self, vault_id, email, role, inviter_name):
    try:
        vault = Vault.objects.get(id=vault_id)
        subject = f"You've been invited to {vault.name}"
        html_msg = f"<h1>Museum Invitation</h1><p>{inviter_name} has invited you to join their family vault as a {role}.</p>"
        plain_msg = f"{inviter_name} has invited you to join their family vault as a {role}."

        send_notification_email(subject, html_msg, plain_msg, email)
        return {"status": "SUCCESS", "message": f"Invited {email}"}
    except Exception as e:
        logger.error(f"Failed to send invite: {e}")
        raise e

@shared_task(bind=True, queue='default')
def export_vault_logs_task(self, vault_id, user_email):
    try:
        logs = ActionLog.objects.filter(vault_id=vault_id).select_related('user').order_by('-created_at')

        csv_file = StringIO()
        writer = csv.writer(csv_file)
        writer.writerow(['Date', 'User', 'Action', 'Description'])

        for log in logs:
            user_name = log.user.full_name if log.user else "System"
            writer.writerow([log.created_at, user_name, log.action_type, log.description])

        logger.info(f"CSV generated for vault {vault_id}. Ready to dispatch to {user_email}.")

        return {"status": "SUCCESS", "message": "Logs exported"}
    except Exception as e:
        logger.error(f"Failed to export logs: {e}")
        raise e
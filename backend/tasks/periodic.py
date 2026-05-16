from celery import shared_task
from django.utils import timezone
from vaults.models import Capsule
import logging

logger = logging.getLogger(__name__)

@shared_task(queue='default')
def check_and_unlock_capsules():
    """Periodically check for locked capsules whose time has come."""
    now = timezone.now()
    capsules_to_unlock = Capsule.objects.filter(status='LOCKED', unlock_date__lte=now)

    count = capsules_to_unlock.update(status='READY')
    if count > 0:
        logger.info(f"Unlocked {count} time capsules.")
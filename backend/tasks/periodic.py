from celery import shared_task
from django.utils import timezone
from vaults.models import Capsule
from core.models import ActionLog
import logging
from core.vapid import send_web_push

logger = logging.getLogger(__name__)

@shared_task(queue='default')
def check_and_unlock_capsules():
    now = timezone.now()
    capsules_to_unlock = Capsule.objects.filter(status='LOCKED', unlock_date__lte=now)

    for capsule in capsules_to_unlock:
        capsule.status = 'READY'
        capsule.save()

        ActionLog.objects.create(
            vault=capsule.vault,
            user=None,
            action_type='security',
            description=f"Temporal lock expired for '{capsule.title}'. Artifacts are now accessible for opening."
        )

        members = capsule.vault.members.select_related('user').all()
        if not capsule.is_public:
            members = members.filter(user__in=capsule.target_users.all())

        for member in members:
            send_web_push(
                user=member.user,
                title="Time Capsule Ready",
                body=f"The seal on '{capsule.title}' has weakened. You may now break it.",
                url="/capsules"
            )

    logger.info(f"Unlocked {capsules_to_unlock.count()} time capsules.")

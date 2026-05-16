import time
import logging
from celery import shared_task
from vaults.models import Memory

logger = logging.getLogger(__name__)

@shared_task(bind=True, queue='low_priority')
def restore_memory_task(self, memory_id):
    try:
        memory = Memory.objects.get(id=memory_id)

        time.sleep(10)

        return {"status": "READY", "memory_id": str(memory.id)}

    except Exception as e:
        logger.error(f"Restoration failed for memory {memory_id}: {str(e)}")
        raise e
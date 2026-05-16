import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'legacy_keeper.settings')

app = Celery('legacy_keeper')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'unlock-capsules-every-hour': {
        'task': 'tasks.periodic.check_and_unlock_capsules',
        'schedule': crontab(minute=0),
    },
}
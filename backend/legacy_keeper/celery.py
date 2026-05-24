import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'legacy_keeper.settings')

TASK_MODULES = (
    'tasks.ai_pipeline',
    'tasks.governance',
    'tasks.search',
    'tasks.periodic',
    'tasks.restoration',
    'tasks.story_weaver',
)

app = Celery('legacy_keeper', include=TASK_MODULES)
app.config_from_object('django.conf:settings', namespace='CELERY')
app.conf.imports = tuple(dict.fromkeys([*(app.conf.imports or ()), *TASK_MODULES]))
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'unlock-capsules-every-hour': {
        'task': 'tasks.periodic.check_and_unlock_capsules',
        'schedule': crontab(minute=0),
    },
}

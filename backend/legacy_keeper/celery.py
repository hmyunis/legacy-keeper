import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'legacy_keeper.settings')

app = Celery('legacy_keeper')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
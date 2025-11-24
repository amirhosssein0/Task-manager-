import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('core')
app.config_from_object('django.conf:settings', namespace='CELERY')
# Ensure worker retries broker connection on startup (Celery 6+ requirement).
app.conf.broker_connection_retry_on_startup = True
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
	print(f'Request: {self.request!r}')


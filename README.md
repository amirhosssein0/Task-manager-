# Task-manager-
A task manager app with DRF and Next.js and DevOps ;)

## Setup Instructions

### Backend Setup

1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Setup database:
```bash
python manage.py migrate
```

3. **Setup Redis (Required for Celery)**:
```bash
# On Ubuntu/Debian:
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# On macOS:
brew install redis
brew services start redis

# Verify Redis is running:
redis-cli ping
# Should return: PONG
```

4. **Run Celery Worker** (in a separate terminal):
```bash
cd backend
celery -A core worker --loglevel=info
```

5. **Run Celery Beat Scheduler** (in another separate terminal):
```bash
cd backend
celery -A core beat --loglevel=info
```

6. Run Django server:
```bash
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Celery Task: Overdue Tasks Notification

The system automatically checks for overdue tasks every night at 9 PM (21:00).

- **Task**: `flag_overdue_tasks`
- **Schedule**: Every day at 9:00 PM (configurable via `OVERDUE_NOTIFY_HOUR` and `OVERDUE_NOTIFY_MINUTE` env vars)
- **Function**: Flags tasks that were due today but not completed

When a task is flagged:
- It appears in the dashboard with a notification
- User can choose to:
  - Move it to tomorrow (reschedules due_date to tomorrow)
  - Delete the task

## Environment Variables

### Backend (.env file in backend/ directory)

```env
# Celery/Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Overdue task notification time (24-hour format)
OVERDUE_NOTIFY_HOUR=21
OVERDUE_NOTIFY_MINUTE=0

# JWT Token lifetimes
ACCESS_TOKEN_MINUTES=60  # Optional, defaults to 60 minutes
REFRESH_TOKEN_DAYS=14    # Optional, defaults to 14 days
```

## Testing Celery

To test if Celery is working:

1. Make sure Redis is running
2. Start Celery worker: `celery -A core worker --loglevel=info`
3. Start Celery beat: `celery -A core beat --loglevel=info`
4. Create a task with `due_date = today` and `completed = False`:
```python
python manage.py shell
>>> from tasks.models import Task
>>> from django.contrib.auth.models import User
>>> from django.utils import timezone
>>> user = User.objects.first()  # یا کاربر خودتون
>>> Task.objects.create(
...     user=user,
...     title="Test Overdue Task",
...     due_date=timezone.localdate(),
...     completed=False
... )
```

5. Manually trigger the task:
```python
>>> from tasks.tasks import flag_overdue_tasks
>>> result = flag_overdue_tasks()
>>> print(result)
# باید خروجی ببینی مثل:
# ✅ Flagged 1 tasks due today and 0 overdue tasks (Total: 1)
# {'today_tasks_flagged': 1, 'overdue_tasks_flagged': 0, 'total_flagged': 1, 'date': '2024-01-15'}
```

6. Check if tasks were flagged:
```python
>>> from tasks.models import Task
>>> Task.objects.filter(overdue_notified=True, completed=False).values('id', 'title', 'due_date', 'overdue_notified')
```

7. Check dashboard - the task should appear in overdue tasks section

## API Documentation (Swagger)

The API documentation is available using Swagger UI and ReDoc:

### Access URLs:
- **Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc**: `http://localhost:8000/api/redoc/`
- **OpenAPI Schema (JSON)**: `http://localhost:8000/api/schema/`

### Features:
- Interactive API documentation
- Try out API endpoints directly from the browser
- JWT authentication support
- Complete API schema with request/response examples

### Note:
For production, you should restrict access to these endpoints using nginx or your web server configuration to allow only specific IP addresses.

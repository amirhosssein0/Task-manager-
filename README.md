# Task-manager
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

## 🚀 Automated Task Management with Celery

This application uses **Celery** with **Redis** as a message broker to automate two key features:

1. **Overdue Tasks Notification** - Automatically flags incomplete tasks
2. **Recurring Tasks** - Automatically creates task instances based on recurrence rules

---

## 📋 System 1: Overdue Tasks Notification

### Overview

The system automatically checks for tasks that were due today but haven't been completed. At 9 PM every night, it flags these tasks and displays them in the user's dashboard with options to reschedule or delete.

### How It Works

1. **Scheduled Execution**: Every day at 9:00 PM (21:00), Celery Beat triggers the `flag_overdue_tasks` task
2. **Task Detection**: The system finds all tasks where:
   - `due_date = today` AND `completed = False` AND `overdue_notified = False`
   - OR `due_date < today` AND `completed = False` AND `overdue_notified = False`
3. **Flagging**: Sets `overdue_notified = True` for all matching tasks
4. **User Notification**: Flagged tasks appear in the dashboard with a notification banner

### User Actions

When a task is flagged as overdue, users can:
- **Move to Tomorrow**: Reschedules the task's `due_date` to tomorrow and clears the `overdue_notified` flag
- **Delete Task**: Permanently removes the task

### Configuration

```env
# Time when overdue check runs (24-hour format)
OVERDUE_NOTIFY_HOUR=21      # 9 PM
OVERDUE_NOTIFY_MINUTE=0

# Timezone (important!)
DJANGO_TIME_ZONE=UTC        # or Asia/Tehran, America/New_York, etc.
```

### Technical Details

- **Task Name**: `tasks.tasks.flag_overdue_tasks`
- **Schedule**: Daily at configured time (default: 21:00)
- **Broker**: Redis
- **Result**: Returns count of flagged tasks

---

## 🔄 System 2: Recurring Tasks

### Overview

The system automatically creates new task instances for recurring tasks based on their recurrence settings. This allows users to create a task template once and have it automatically generate new instances at specified intervals.

### How It Works

1. **Scheduled Execution**: Every day at midnight (00:00), Celery Beat triggers the `create_recurring_tasks` task
2. **Parent Task Detection**: Finds all tasks where:
   - `is_recurring = True`
   - `parent_task = NULL` (only processes parent tasks, not instances)
   - `recurrence_type` is set
3. **Date Calculation**: For each parent task:
   - Checks if `next_recurrence_date <= today`
   - If no `next_recurrence_date` exists, calculates it from `due_date`
4. **Instance Creation**: Creates new task instances for all dates up to today
5. **Update Parent**: Updates `next_recurrence_date` and `recurrence_created_count`

### Supported Recurrence Types

| Type | Description | Example |
|------|-------------|---------|
| **Daily** | Every N days | Every 1 day, every 2 days, every 5 days |
| **Custom** | Every N days (flexible) | Same as daily, but with custom label |
| **Weekly** | Every N weeks | Every 1 week, every 2 weeks |
| **Monthly** | Every N months | Every 1 month, every 3 months |
| **Yearly** | Every N years | Every 1 year, every 2 years |

### Recurrence Features

- **Flexible Intervals**: Set any interval (e.g., every 2 days, every 3 weeks)
- **End Conditions**: 
  - Set an end date (`recurrence_end_date`)
  - Set maximum occurrence count (`recurrence_count`)
  - Or leave both empty for unlimited recurrence
- **Weekly Day Selection**: For weekly recurrence, optionally specify which days of the week
- **Automatic Tracking**: Parent task tracks how many instances have been created

### Example Use Cases

1. **Daily Tasks**: "Morning Exercise" - repeats every day
2. **Bi-weekly Tasks**: "Team Meeting" - repeats every 2 weeks
3. **Monthly Tasks**: "Pay Bills" - repeats every month
4. **Custom Intervals**: "Water Plants" - repeats every 3 days

### Configuration

```env
# Time when recurring tasks are created (24-hour format)
RECURRING_TASKS_HOUR=0      # Midnight
RECURRING_TASKS_MINUTE=0

# Timezone (important!)
DJANGO_TIME_ZONE=UTC        # or Asia/Tehran, America/New_York, etc.
```

### Technical Details

- **Task Name**: `tasks.tasks.create_recurring_tasks`
- **Schedule**: Daily at configured time (default: 00:00)
- **Broker**: Redis
- **Result**: Returns count of created instances
- **Handles Missed Days**: If the system hasn't run for several days, it creates instances for all missed dates

### Task Structure

```
Parent Task (is_recurring=True, parent_task=NULL)
  ├── Instance 1 (is_recurring=False, parent_task=Parent)
  ├── Instance 2 (is_recurring=False, parent_task=Parent)
  └── Instance 3 (is_recurring=False, parent_task=Parent)
```

Each instance is a separate task that can be completed independently. The parent task acts as a template and tracks the recurrence settings.

## Environment Variables

### Backend (.env file in backend/ directory)

```env
# Celery/Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Timezone (important for scheduled tasks)
DJANGO_TIME_ZONE=UTC  # Options: UTC, Asia/Tehran, America/New_York, Europe/London, etc.

# Overdue task notification time (24-hour format, uses DJANGO_TIME_ZONE)
OVERDUE_NOTIFY_HOUR=21
OVERDUE_NOTIFY_MINUTE=0

# Recurring tasks creation time (24-hour format, uses DJANGO_TIME_ZONE)
RECURRING_TASKS_HOUR=0
RECURRING_TASKS_MINUTE=0

# JWT Token lifetimes
ACCESS_TOKEN_MINUTES=60  # Optional, defaults to 60 minutes
REFRESH_TOKEN_DAYS=14    # Optional, defaults to 14 days
```

## 🧪 Testing the Systems

### Prerequisites

Before testing, ensure:
1. ✅ Redis is running (`redis-cli ping` should return `PONG`)
2. ✅ Celery Worker is running (`celery -A core worker --loglevel=info`)
3. ✅ Celery Beat is running (`celery -A core beat --loglevel=info`)
4. ✅ Django server is running (`python manage.py runserver`)

---

### Testing Overdue Tasks System

#### Quick Test

1. **Create a test task** via the frontend or Django shell:
```python
python manage.py shell
>>> from tasks.models import Task
>>> from django.contrib.auth.models import User
>>> from django.utils import timezone
>>> user = User.objects.get(username='your_username')
>>> task = Task.objects.create(
...     user=user,
...     title="Test Overdue Task",
...     due_date=timezone.localdate(),  # Today
...     completed=False
... )
```

2. **Manually trigger the task**:
```python
>>> from tasks.tasks import flag_overdue_tasks
>>> result = flag_overdue_tasks()
>>> print(result)
# Expected output:
# ✅ Flagged 1 tasks due today and 0 overdue tasks (Total: 1)
# {'today_tasks_flagged': 1, 'overdue_tasks_flagged': 0, 'total_flagged': 1, 'date': '2025-11-15'}
```

3. **Verify the task was flagged**:
```python
>>> task.refresh_from_db()
>>> print(f"Overdue Notified: {task.overdue_notified}")  # Should be True
```

4. **Check in Dashboard**: 
   - Go to `http://localhost:3000/dashboard`
   - The task should appear in the "Overdue Tasks" section with options to "Move to tomorrow" or "Delete task"

#### Automated Test

Wait until 9 PM (or change system time) and check Celery Beat logs. You should see:
```
[2025-11-15 21:00:00,000: INFO/MainProcess] Scheduler: Sending due task flag-overdue-tasks-daily
```

---

### Testing Recurring Tasks System

#### Quick Test

1. **Create a recurring task** via the frontend or Django shell:
```python
python manage.py shell
>>> from tasks.models import Task
>>> from django.contrib.auth.models import User
>>> from django.utils import timezone
>>> user = User.objects.get(username='your_username')
>>> parent_task = Task.objects.create(
...     user=user,
...     title="Daily Exercise",
...     due_date=timezone.localdate(),  # Today
...     completed=False,
...     is_recurring=True,
...     recurrence_type='daily',  # or 'custom'
...     recurrence_interval=1,  # Every 1 day
... )
>>> # Calculate and set next recurrence date
>>> parent_task.next_recurrence_date = parent_task.calculate_next_recurrence()
>>> parent_task.save()
>>> print(f"Next recurrence: {parent_task.next_recurrence_date}")  # Should be tomorrow
```

2. **For immediate testing**, set `next_recurrence_date` to today:
```python
>>> parent_task.next_recurrence_date = timezone.localdate()  # Today
>>> parent_task.save()
```

3. **Manually trigger the task**:
```python
>>> from tasks.tasks import create_recurring_tasks
>>> result = create_recurring_tasks()
>>> print(result)
# Expected output:
# ✅ Created 1 recurring task instances
# {'created_count': 1, 'date': '2025-11-15'}
```

4. **Verify instances were created**:
```python
>>> instances = Task.objects.filter(parent_task=parent_task)
>>> print(f"Total instances: {instances.count()}")
>>> for instance in instances:
...     print(f"  - ID: {instance.id}, Due: {instance.due_date}, Title: {instance.title}")
```

5. **Check parent task status**:
```python
>>> parent_task.refresh_from_db()
>>> print(f"Created count: {parent_task.recurrence_created_count}")
>>> print(f"Next recurrence: {parent_task.next_recurrence_date}")
```

6. **Check in Frontend**:
   - Go to `http://localhost:3000/tasks`
   - Change the date to tomorrow
   - You should see the new task instance

#### Testing Different Intervals

**Every 2 days:**
```python
>>> task.recurrence_interval = 2
>>> task.next_recurrence_date = timezone.localdate()  # Today for testing
>>> task.save()
>>> from tasks.tasks import create_recurring_tasks
>>> create_recurring_tasks()
```

**Every week:**
```python
>>> task.recurrence_type = 'weekly'
>>> task.recurrence_interval = 1
>>> task.next_recurrence_date = timezone.localdate()
>>> task.save()
```

#### Automated Test

Wait until midnight (or change system time) and check Celery Beat logs. You should see:
```
[2025-11-15 00:00:00,000: INFO/MainProcess] Scheduler: Sending due task create-recurring-tasks-daily
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Redis Connection Error
```
Error: Error 111 connecting to localhost:6379. Connection refused.
```
**Solution**: Start Redis
```bash
# Ubuntu/Debian
sudo systemctl start redis

# macOS
brew services start redis

# Verify
redis-cli ping  # Should return PONG
```

#### 2. Celery Tasks Not Running
**Check**:
- Is Celery Worker running? (`celery -A core worker --loglevel=info`)
- Is Celery Beat running? (`celery -A core beat --loglevel=info`)
- Are tasks registered? (`celery -A core inspect registered`)

#### 3. Tasks Not Being Created (Recurring)
**Check**:
- Is `next_recurrence_date <= today`?
- Is `is_recurring = True`?
- Is `parent_task = NULL` (not an instance)?
- Check end conditions (`recurrence_end_date`, `recurrence_count`)

#### 4. Wrong Timezone
**Solution**: Set timezone in `.env`
```env
DJANGO_TIME_ZONE=Asia/Tehran  # or your timezone
```

#### 5. Tasks Flagged But Not Showing in Dashboard
**Check**:
- Is user logged in?
- Is subscription active?
- Check browser console for errors
- Verify API response: `GET /api/dashboard/`

---

## 📊 Monitoring

### Check Celery Status

```bash
# Check registered tasks
celery -A core inspect registered

# Check active tasks
celery -A core inspect active

# Check scheduled tasks
celery -A core inspect scheduled
```

### View Logs

Celery Worker and Beat logs will show:
- Task execution status
- Errors (if any)
- Task results

### Database Queries

**Count overdue tasks:**
```python
Task.objects.filter(overdue_notified=True, completed=False).count()
```

**Count recurring tasks:**
```python
Task.objects.filter(is_recurring=True, parent_task__isnull=True).count()
```

**Count recurring instances:**
```python
Task.objects.filter(parent_task__isnull=False).count()
```

---

## 📚 API Documentation

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

---

## 🏗️ Architecture

### System Components

```
┌─────────────┐
│   Django    │
│   Server    │
└──────┬──────┘
       │
       ├─── Creates Tasks
       │
┌──────▼──────────────────┐
│      Redis              │
│   (Message Broker)      │
└──────┬──────────────────┘
       │
       ├─── Celery Worker ────► Executes Tasks
       │
       └─── Celery Beat ───────► Schedules Tasks
```

### Task Flow

**Overdue Tasks:**
```
User creates task → Task.due_date = today
                    ↓
            (9 PM daily)
                    ↓
        Celery Beat triggers
                    ↓
    flag_overdue_tasks() executes
                    ↓
    Sets overdue_notified = True
                    ↓
    Dashboard shows notification
```

**Recurring Tasks:**
```
User creates recurring task → is_recurring = True
                                next_recurrence_date = tomorrow
                                ↓
                        (Midnight daily)
                                ↓
                    Celery Beat triggers
                                ↓
            create_recurring_tasks() executes
                                ↓
            Creates new task instance
                                ↓
            Updates next_recurrence_date
                                ↓
            User sees new task in list
```

---

## 🎯 Best Practices

1. **Always run Celery Worker and Beat** in production
2. **Set appropriate timezone** for your users
3. **Monitor Redis** to ensure it's running
4. **Set up logging** for Celery tasks
5. **Use process managers** (systemd, supervisor) for production
6. **Backup database** regularly (recurring tasks depend on it)
7. **Test timezone changes** before deploying

---

## 📝 Notes

- Both systems use **Celery** with **Redis** as the message broker
- Tasks are scheduled using **Celery Beat** with cron-like schedules
- All times are based on `DJANGO_TIME_ZONE` setting
- Recurring tasks create **separate instances** that can be completed independently
- Overdue tasks can be **rescheduled** or **deleted** by the user
- The system handles **missed days** for recurring tasks (creates instances for all missed dates)

---

## 🤝 Contributing

When adding new Celery tasks:
1. Add the task function in `backend/tasks/tasks.py`
2. Register it in `CELERY_BEAT_SCHEDULE` in `backend/core/settings.py`
3. Add tests
4. Update this README

---

## 📄 License

[Your License Here]

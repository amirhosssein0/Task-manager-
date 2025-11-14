from datetime import timedelta
from celery import shared_task
from django.utils import timezone

from .models import Task


@shared_task
def flag_overdue_tasks():
	"""
	Flag tasks that were due today but not completed.
	This runs every night at 9 PM to check tasks with due_date = today.
	"""
	today = timezone.localdate()
	# Only flag tasks that were due TODAY and are NOT completed
	# This way we only notify about tasks that should have been done today
	today_incomplete_qs = Task.objects.filter(
		completed=False, 
		due_date=today,
		overdue_notified=False  # Don't re-flag already notified tasks
	)
	today_count = today_incomplete_qs.count()
	today_incomplete_qs.update(overdue_notified=True)
	
	# Also flag tasks that are overdue (past due date)
	overdue_qs = Task.objects.filter(
		completed=False, 
		due_date__lt=today,
		overdue_notified=False
	)
	overdue_count = overdue_qs.count()
	overdue_qs.update(overdue_notified=True)
	
	# Return result for manual testing
	result = {
		'today_tasks_flagged': today_count,
		'overdue_tasks_flagged': overdue_count,
		'total_flagged': today_count + overdue_count,
		'date': today.isoformat()
	}
	print(f"✅ Flagged {today_count} tasks due today and {overdue_count} overdue tasks (Total: {result['total_flagged']})")
	return result


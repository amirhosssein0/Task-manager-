from django.conf import settings
from django.db import models
from django.utils import timezone
from datetime import timedelta
from calendar import monthrange


class Task(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tasks')
	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	completed = models.BooleanField(default=False)
	due_date = models.DateField()
	category = models.CharField(max_length=100, blank=True)
	LABEL_NONE = 'none'
	LABEL_YELLOW = 'yellow'
	LABEL_GREEN = 'green'
	LABEL_BLUE = 'blue'
	LABEL_RED = 'red'
	LABEL_CHOICES = [
		(LABEL_NONE, 'None'),
		(LABEL_YELLOW, 'Yellow'),
		(LABEL_GREEN, 'Green'),
		(LABEL_BLUE, 'Blue'),
		(LABEL_RED, 'Red'),
	]
	label = models.CharField(max_length=12, choices=LABEL_CHOICES, default=LABEL_NONE)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	overdue_notified = models.BooleanField(default=False)
	
	# Recurring Task fields
	is_recurring = models.BooleanField(default=False)
	recurrence_type = models.CharField(
		max_length=20,
		choices=[
			('daily', 'Daily'),
			('weekly', 'Weekly'),
			('monthly', 'Monthly'),
			('yearly', 'Yearly'),
			('custom', 'Custom'),
		],
		blank=True,
		null=True
	)
	recurrence_interval = models.IntegerField(default=1, help_text="Every N days/weeks/months")
	recurrence_days = models.JSONField(
		default=list,
		blank=True,
		help_text="Days of week for weekly recurrence [0=Monday, 6=Sunday]"
	)
	recurrence_end_date = models.DateField(blank=True, null=True)
	recurrence_count = models.IntegerField(blank=True, null=True, help_text="Number of occurrences")
	recurrence_created_count = models.IntegerField(default=0, help_text="Number of tasks created so far")
	parent_task = models.ForeignKey(
		'self',
		on_delete=models.CASCADE,
		blank=True,
		null=True,
		related_name='recurring_instances',
		help_text="Original recurring task"
	)
	next_recurrence_date = models.DateField(blank=True, null=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f"{self.title} ({'done' if self.completed else 'todo'})"
	
	def calculate_next_recurrence(self):
		"""Calculate the next recurrence date based on recurrence settings"""
		if not self.is_recurring or not self.recurrence_type:
			return None
		
		base_date = self.due_date
		if self.next_recurrence_date:
			base_date = self.next_recurrence_date
		
		if self.recurrence_type == 'daily':
			return base_date + timedelta(days=self.recurrence_interval)
		
		elif self.recurrence_type == 'weekly':
			# If recurrence_days is specified, find the next matching day
			if self.recurrence_days and len(self.recurrence_days) > 0:
				# Get current weekday (0=Monday, 6=Sunday)
				current_weekday = base_date.weekday()
				sorted_days = sorted(self.recurrence_days)
				
				# Find the next day in recurrence_days within current week
				days_ahead = None
				for day in sorted_days:
					if day > current_weekday:
						days_ahead = day - current_weekday
						break
				
				# If no day found in current week, get first day of next interval week
				if days_ahead is None:
					# Move to next interval week, then get first day
					next_week_start = base_date + timedelta(weeks=self.recurrence_interval)
					next_weekday = next_week_start.weekday()
					# Find first matching day in next week
					first_day = sorted_days[0]
					days_ahead = (first_day - next_weekday) % 7
					if days_ahead == 0 and first_day != next_weekday:
						days_ahead = 7
					return next_week_start + timedelta(days=days_ahead)
				else:
					return base_date + timedelta(days=days_ahead)
			else:
				# No specific days, just add weeks
				return base_date + timedelta(weeks=self.recurrence_interval)
		
		elif self.recurrence_type == 'monthly':
			# Add months properly, handling month-end dates
			year = base_date.year
			month = base_date.month
			day = base_date.day
			
			# Add the interval months
			for _ in range(self.recurrence_interval):
				month += 1
				if month > 12:
					month = 1
					year += 1
			
			# Handle month-end dates (e.g., Jan 31 -> Feb 28/29)
			last_day_of_month = monthrange(year, month)[1]
			if day > last_day_of_month:
				day = last_day_of_month
			
			return base_date.replace(year=year, month=month, day=day)
		
		elif self.recurrence_type == 'yearly':
			# Add years properly, handling leap years
			year = base_date.year + self.recurrence_interval
			month = base_date.month
			day = base_date.day
			
			# Handle Feb 29 in non-leap years
			if month == 2 and day == 29:
				last_day_feb = monthrange(year, 2)[1]
				if day > last_day_feb:
					day = last_day_feb
			
			try:
				return base_date.replace(year=year, month=month, day=day)
			except ValueError:
				# Handle edge case where date doesn't exist
				last_day = monthrange(year, month)[1]
				return base_date.replace(year=year, month=month, day=min(day, last_day))
		
		elif self.recurrence_type == 'custom':
			# Custom recurrence: every N days (where N is recurrence_interval)
			# This allows for flexible intervals like "every 2 days", "every 5 days", etc.
			return base_date + timedelta(days=self.recurrence_interval)
		
		return None


class TaskTemplate(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='task_templates')
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	category = models.CharField(max_length=100, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f"{self.name} (Template)"


class TaskTemplateItem(models.Model):
	template = models.ForeignKey(TaskTemplate, on_delete=models.CASCADE, related_name='items')
	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	category = models.CharField(max_length=100, blank=True)
	LABEL_NONE = 'none'
	LABEL_YELLOW = 'yellow'
	LABEL_GREEN = 'green'
	LABEL_BLUE = 'blue'
	LABEL_RED = 'red'
	LABEL_CHOICES = [
		(LABEL_NONE, 'None'),
		(LABEL_YELLOW, 'Yellow'),
		(LABEL_GREEN, 'Green'),
		(LABEL_BLUE, 'Blue'),
		(LABEL_RED, 'Red'),
	]
	label = models.CharField(max_length=12, choices=LABEL_CHOICES, default=LABEL_NONE)
	due_date_offset = models.IntegerField(
		default=0,
		help_text="Days offset from creation date (0 = same day, 1 = next day, etc.)"
	)
	order = models.IntegerField(default=0, help_text="Order of items in template")

	class Meta:
		ordering = ['order', 'id']

	def __str__(self) -> str:
		return f"{self.title} (in {self.template.name})"

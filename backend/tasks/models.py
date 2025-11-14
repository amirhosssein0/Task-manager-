from django.conf import settings
from django.db import models


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

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f"{self.title} ({'done' if self.completed else 'todo'})"

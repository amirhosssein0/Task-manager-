from django.conf import settings
from django.db import models
from django.utils import timezone


class Subscription(models.Model):
	PLAN_TRIAL = 'trial'
	PLAN_MONTHLY = 'monthly'
	PLAN_YEARLY = 'yearly'
	PLAN_CHOICES = [
		(PLAN_TRIAL, 'Trial'),
		(PLAN_MONTHLY, 'Monthly'),
		(PLAN_YEARLY, 'Yearly'),
	]

	STATUS_ACTIVE = 'active'
	STATUS_EXPIRED = 'expired'
	STATUS_CHOICES = [
		(STATUS_ACTIVE, 'Active'),
		(STATUS_EXPIRED, 'Expired'),
	]

	user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
	plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_TRIAL)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
	start_date = models.DateField(default=timezone.now)
	end_date = models.DateField()
	transaction_id = models.CharField(max_length=64, blank=True, null=True)
	updated_at = models.DateTimeField(auto_now=True)

	def is_active(self) -> bool:
		# Auto-expire if end_date has passed
		if self.end_date < timezone.now().date():
			if self.status == self.STATUS_ACTIVE:
				self.status = self.STATUS_EXPIRED
				self.save(update_fields=['status'])
			return False
		return self.status == self.STATUS_ACTIVE

	def days_remaining(self) -> int:
		delta = (self.end_date - timezone.now().date()).days
		return max(delta, 0)

	def __str__(self) -> str:
		return f"{self.user.username} - {self.plan} ({self.status})"



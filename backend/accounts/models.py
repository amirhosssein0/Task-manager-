from django.conf import settings
from django.db import models
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
import secrets


User = get_user_model()


class Profile(models.Model):
	user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
	profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self) -> str:
		return f"Profile({self.user.username})"


class PasswordResetToken(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='password_reset_tokens')
	temp_password = models.CharField(max_length=8)
	created_at = models.DateTimeField(auto_now_add=True)
	used = models.BooleanField(default=False)
	expires_at = models.DateTimeField()

	def __str__(self) -> str:
		return f"PasswordResetToken({self.user.username})"

	def is_valid(self):
		return not self.used and timezone.now() < self.expires_at

	@classmethod
	def generate_temp_password(cls, user):
		# Generate 8-character alphanumeric password (uppercase letters and numbers)
		import string
		import random
		characters = string.ascii_uppercase + string.digits
		temp_password = ''.join(random.choice(characters) for _ in range(8))
		expires_at = timezone.now() + timedelta(hours=24)
		return cls.objects.create(
			user=user,
			temp_password=temp_password,
			expires_at=expires_at
		)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
	if created:
		Profile.objects.create(user=instance)



from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Profile, PasswordResetToken
from .serializers import SignupSerializer, ProfileSerializer, ChangePasswordSerializer
import sys


def _tokens_for_user(user: User):
	refresh = RefreshToken.for_user(user)
	return {"refresh": str(refresh), "access": str(refresh.access_token)}


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def signup(request):
	serializer = SignupSerializer(data=request.data)
	if serializer.is_valid():
		with transaction.atomic():
			user = serializer.save()
		tokens = _tokens_for_user(user)
		return Response(tokens, status=status.HTTP_201_CREATED)
	return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def profile_view(request):
	profile = request.user.profile
	if request.method == "GET":
		data = ProfileSerializer(profile).data
		return Response(data)

	serializer = ProfileSerializer(profile, data=request.data, partial=True)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data)
	return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_account(request):
	request.user.delete()
	return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
	serializer = ChangePasswordSerializer(data=request.data)
	serializer.is_valid(raise_exception=True)
	old_password = serializer.validated_data.get("old_password", "")
	new_password = serializer.validated_data["new_password"]

	# Check if user has a recently used temp password (within last 5 minutes)
	# If so, allow password change without old_password
	from django.utils import timezone
	from datetime import timedelta
	recent_temp_used = PasswordResetToken.objects.filter(
		user=request.user,
		used=True,
		created_at__gte=timezone.now() - timedelta(minutes=5)
	).exists()

	if not recent_temp_used and old_password:
		# Regular password change requires old password
		if not request.user.check_password(old_password):
			return Response({"old_password": ["Incorrect password"]}, status=status.HTTP_400_BAD_REQUEST)
	elif not recent_temp_used and not old_password:
		# Old password required if not using temp password
		return Response({"old_password": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

	request.user.set_password(new_password)
	request.user.save()
	
	# Mark all temp passwords as used since user has set new password
	PasswordResetToken.objects.filter(
		user=request.user,
		used=False
	).update(used=True)
	
	return Response({"detail": "Password changed successfully"})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def password_reset(request):
	email = request.data.get("email")
	if not email:
		return Response({"email": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
	
	try:
		user = User.objects.get(email=email)
	except User.DoesNotExist:
		# Don't reveal if email exists
		return Response({"detail": "If an account exists for this email, a temporary password was sent."})
	
	# Generate temp password
	reset_token = PasswordResetToken.generate_temp_password(user)
	
	# Temporarily disable old password by setting an invalid password
	# This ensures only temp password can be used until new password is set
	# We'll store a flag to know we need to force password change
	user.set_unusable_password()
	user.save()
	
	# Send email
	try:
		send_mail(
			subject='Password Reset - Task Manager',
			message=f'Your temporary password is: {reset_token.temp_password}\n\nThis password will expire in 24 hours. Please login with this password and you will be asked to set a new password immediately.\n\nNote: The temporary password is case-insensitive (you can enter it in any case).',
			from_email=settings.DEFAULT_FROM_EMAIL,
			recipient_list=[email],
			fail_silently=False,
		)
	except Exception as e:
		# Log error for debugging
		import logging
		logger = logging.getLogger(__name__)
		logger.error(f"Failed to send password reset email: {str(e)}")
		# Only print in non-testing environments
		if 'test' not in sys.argv and 'pytest' not in sys.argv[0]:
			print(f"❌ Failed to send email: {str(e)}")
		# Return error details in debug mode, generic message otherwise
		if settings.DEBUG:
			return Response({"detail": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
		# Don't reveal error to user for security in production
		return Response({"detail": "If an account exists for this email, a temporary password was sent."})
	
	return Response({"detail": "If an account exists for this email, a temporary password was sent."})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login(request):
	username = request.data.get("username")
	password = request.data.get("password")
	
	if not username or not password:
		return Response(
			{"detail": "Username and password are required."},
			status=status.HTTP_400_BAD_REQUEST
		)
	
	# Check if it's a temp password first
	try:
		user = User.objects.get(username=username)
		reset_token = PasswordResetToken.objects.filter(
			user=user,
			temp_password=password.upper(),
			used=False
		).order_by('-created_at').first()
		
		if reset_token and reset_token.is_valid():
			# Mark as used
			reset_token.used = True
			reset_token.save()
			
			# Return tokens with flag indicating temp password was used
			tokens = _tokens_for_user(user)
			tokens['temp_password_used'] = True
			return Response(tokens)
	except User.DoesNotExist:
		pass
	
	# Regular authentication - only if user has a usable password
	# If password was reset, old password won't work
	user = authenticate(username=username, password=password)
	if user:
		# Check if user has an active temp password that hasn't been used
		# If so, they must use temp password, not old password
		active_temp = PasswordResetToken.objects.filter(
			user=user,
			used=False,
			expires_at__gt=timezone.now()
		).exists()
		
		if active_temp:
			# User has an active temp password, old password is disabled
			return Response(
				{"detail": "Please use the temporary password sent to your email. Your old password has been disabled."},
				status=status.HTTP_401_UNAUTHORIZED
			)
		
		tokens = _tokens_for_user(user)
		tokens['temp_password_used'] = False
		return Response(tokens)
	
	return Response(
		{"detail": "Invalid credentials."},
		status=status.HTTP_401_UNAUTHORIZED
	)



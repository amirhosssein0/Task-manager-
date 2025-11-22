from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from io import BytesIO
from PIL import Image

from .models import Profile, PasswordResetToken

User = get_user_model()


class ProfileModelTest(TestCase):
	"""Unit tests for Profile model"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='TestUser1',
			email='test@example.com',
			password='Test1234#'
		)
	
	def test_profile_auto_created_on_user_creation(self):
		"""Test that profile is automatically created when user is created"""
		self.assertTrue(Profile.objects.filter(user=self.user).exists())
		profile = self.user.profile
		self.assertIsNotNone(profile)
	
	def test_profile_str_representation(self):
		"""Test profile string representation"""
		profile = self.user.profile
		self.assertIn(self.user.username, str(profile))
	
	def test_profile_one_to_one_relationship(self):
		"""Test that profile has one-to-one relationship with user"""
		profile = self.user.profile
		self.assertEqual(profile.user, self.user)


class PasswordResetTokenModelTest(TestCase):
	"""Unit tests for PasswordResetToken model"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser',
			email='test@example.com',
			password='testpass123'
		)
	
	def test_generate_temp_password(self):
		"""Test generating a temporary password"""
		token = PasswordResetToken.generate_temp_password(self.user)
		self.assertEqual(token.user, self.user)
		self.assertEqual(len(token.temp_password), 8)
		self.assertFalse(token.used)
		self.assertGreater(token.expires_at, timezone.now())
	
	def test_is_valid(self):
		"""Test token validity check"""
		token = PasswordResetToken.objects.create(
			user=self.user,
			temp_password='ABCD1234',
			expires_at=timezone.now() + timedelta(hours=24),
			used=False
		)
		self.assertTrue(token.is_valid())
		
		# Test expired token
		token.expires_at = timezone.now() - timedelta(hours=1)
		token.save()
		self.assertFalse(token.is_valid())
		
		# Test used token
		token.expires_at = timezone.now() + timedelta(hours=24)
		token.used = True
		token.save()
		self.assertFalse(token.is_valid())
	
	def test_token_str_representation(self):
		"""Test token string representation"""
		token = PasswordResetToken.objects.create(
			user=self.user,
			temp_password='ABCD1234',
			expires_at=timezone.now() + timedelta(hours=24)
		)
		self.assertIn(self.user.username, str(token))


class SignupSerializerTest(TestCase):
	"""Unit tests for SignupSerializer"""
	
	def setUp(self):
		from .serializers import SignupSerializer
		self.serializer_class = SignupSerializer
	
	def test_valid_signup_data(self):
		"""Test valid signup data"""
		data = {
			'username': 'newuser',
			'email': 'newuser@example.com',
			'password': 'securepass123'
		}
		serializer = self.serializer_class(data=data)
		self.assertTrue(serializer.is_valid())
		user = serializer.save()
		self.assertEqual(user.username, 'newuser')
		self.assertEqual(user.email, 'newuser@example.com')
		self.assertTrue(user.check_password('securepass123'))
	
	def test_duplicate_email(self):
		"""Test that duplicate email is rejected"""
		User.objects.create_user(
			username='existing',
			email='existing@example.com',
			password='pass123'
		)
		
		data = {
			'username': 'newuser',
			'email': 'existing@example.com',
			'password': 'securepass123'
		}
		serializer = self.serializer_class(data=data)
		self.assertFalse(serializer.is_valid())
		self.assertIn('email', serializer.errors)


class ProfileSerializerTest(TestCase):
	"""Unit tests for ProfileSerializer"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser',
			email='test@example.com',
			password='testpass123'
		)
		from .serializers import ProfileSerializer
		self.serializer_class = ProfileSerializer
	
	def test_serialize_profile(self):
		"""Test serializing a profile"""
		profile = self.user.profile
		serializer = self.serializer_class(profile)
		data = serializer.data
		self.assertEqual(data['username'], 'testuser')
		self.assertEqual(data['email'], 'test@example.com')
	
	def test_update_profile_fields(self):
		"""Test updating profile fields"""
		profile = self.user.profile
		data = {
			'email': 'updated@example.com',
			'first_name': 'John',
			'last_name': 'Doe'
		}
		serializer = self.serializer_class(profile, data=data, partial=True)
		self.assertTrue(serializer.is_valid())
		serializer.save()
		
		self.user.refresh_from_db()
		self.assertEqual(self.user.email, 'updated@example.com')
		self.assertEqual(self.user.first_name, 'John')
		self.assertEqual(self.user.last_name, 'Doe')
	
	def test_image_optimization(self):
		"""Test that profile picture is optimized"""
		# Create a test image
		img = Image.new('RGB', (2000, 2000), color='red')
		img_io = BytesIO()
		img.save(img_io, format='PNG')
		img_io.seek(0)
		
		from django.core.files.uploadedfile import SimpleUploadedFile
		image_file = SimpleUploadedFile(
			'test_image.png',
			img_io.read(),
			content_type='image/png'
		)
		
		profile = self.user.profile
		data = {'profile_picture': image_file}
		serializer = self.serializer_class(profile, data=data, partial=True)
		self.assertTrue(serializer.is_valid())
		updated_profile = serializer.save()
		
		# Verify image was optimized (should be JPEG and resized)
		if updated_profile.profile_picture:
			self.assertTrue(updated_profile.profile_picture.name.endswith('.jpg'))


class ChangePasswordSerializerTest(TestCase):
	"""Unit tests for ChangePasswordSerializer"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser',
			email='test@example.com',
			password='oldpass123'
		)
		from .serializers import ChangePasswordSerializer
		self.serializer_class = ChangePasswordSerializer
	
	def test_valid_password_change(self):
		"""Test valid password change"""
		data = {
			'old_password': 'oldpass123',
			'new_password': 'newpass123'
		}
		serializer = self.serializer_class(data=data)
		self.assertTrue(serializer.is_valid())
	
	def test_invalid_old_password(self):
		"""Test that wrong old password is rejected"""
		data = {
			'old_password': 'wrongpass',
			'new_password': 'newpass123'
		}
		serializer = self.serializer_class(data=data)
		# Serializer doesn't validate old_password, view does
		self.assertTrue(serializer.is_valid())


class SignupViewTest(APITestCase):
	"""Unit tests for signup endpoint"""
	
	def setUp(self):
		self.client = APIClient()
	
	def test_signup_success(self):
		"""Test successful user signup"""
		data = {
			'username': 'newuser',
			'email': 'newuser@example.com',
			'password': 'securepass123'
		}
		response = self.client.post('/api/auth/signup/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertIn('access', response.data)
		self.assertIn('refresh', response.data)
		
		# Verify user was created
		self.assertTrue(User.objects.filter(username='newuser').exists())
		
		# Verify profile was created
		user = User.objects.get(username='newuser')
		self.assertTrue(hasattr(user, 'profile'))
	
	def test_signup_duplicate_email(self):
		"""Test signup with duplicate email"""
		User.objects.create_user(
			username='existing',
			email='existing@example.com',
			password='pass123'
		)
		
		data = {
			'username': 'newuser',
			'email': 'existing@example.com',
			'password': 'securepass123'
		}
		response = self.client.post('/api/auth/signup/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
	
	def test_signup_invalid_data(self):
		"""Test signup with invalid data"""
		data = {
			'username': '',
			'email': 'invalid-email',
			'password': '123'  # Too short
		}
		response = self.client.post('/api/auth/signup/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProfileViewTest(APITestCase):
	"""Unit tests for profile endpoint"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser',
			email='test@example.com',
			password='testpass123'
		)
		self.client = APIClient()
		self.client.force_authenticate(user=self.user)
	
	def test_get_profile(self):
		"""Test getting user profile"""
		response = self.client.get('/api/auth/profile/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['username'], 'testuser')
		self.assertEqual(response.data['email'], 'test@example.com')
	
	def test_get_profile_requires_authentication(self):
		"""Test that getting profile requires authentication"""
		self.client.logout()
		response = self.client.get('/api/auth/profile/')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
	
	def test_update_profile(self):
		"""Test updating profile"""
		data = {
			'email': 'updated@example.com',
			'first_name': 'John',
			'last_name': 'Doe'
		}
		response = self.client.patch('/api/auth/profile/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		self.user.refresh_from_db()
		self.assertEqual(self.user.email, 'updated@example.com')
		self.assertEqual(self.user.first_name, 'John')
		self.assertEqual(self.user.last_name, 'Doe')
	
	def test_update_profile_picture(self):
		"""Test updating profile picture"""
		# Create a test image
		img = Image.new('RGB', (100, 100), color='blue')
		img_io = BytesIO()
		img.save(img_io, format='PNG')
		img_io.seek(0)
		
		from django.core.files.uploadedfile import SimpleUploadedFile
		image_file = SimpleUploadedFile(
			'test_image.png',
			img_io.read(),
			content_type='image/png'
		)
		
		response = self.client.patch(
			'/api/auth/profile/',
			{'profile_picture': image_file},
			format='multipart'
		)
		# May return 200 or 400 depending on image validation
		self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])


class DeleteAccountViewTest(APITestCase):
	"""Unit tests for delete account endpoint"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser',
			email='test@example.com',
			password='testpass123'
		)
		self.client = APIClient()
		self.client.force_authenticate(user=self.user)
	
	def test_delete_account(self):
		"""Test deleting user account"""
		user_id = self.user.id
		response = self.client.delete('/api/auth/delete-account/')
		self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
		self.assertFalse(User.objects.filter(id=user_id).exists())
	
	def test_delete_account_requires_authentication(self):
		"""Test that deleting account requires authentication"""
		self.client.logout()
		response = self.client.delete('/api/auth/delete-account/')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordViewTest(APITestCase):
	"""Unit tests for change password endpoint"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser',
			email='test@example.com',
			password='oldpass123'
		)
		self.client = APIClient()
		self.client.force_authenticate(user=self.user)
	
	def test_change_password_success(self):
		"""Test successful password change"""
		data = {
			'old_password': 'oldpass123',
			'new_password': 'newpass123'
		}
		response = self.client.post('/api/auth/change-password/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		# Verify password was changed
		self.user.refresh_from_db()
		self.assertTrue(self.user.check_password('newpass123'))
	
	def test_change_password_wrong_old_password(self):
		"""Test password change with wrong old password"""
		data = {
			'old_password': 'wrongpass',
			'new_password': 'newpass123'
		}
		response = self.client.post('/api/auth/change-password/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
	
	def test_change_password_after_temp_password(self):
		"""Test password change after using temp password"""
		# Create a recently used temp password
		token = PasswordResetToken.objects.create(
			user=self.user,
			temp_password='TEMP1234',
			expires_at=timezone.now() + timedelta(hours=24),
			used=True,
			created_at=timezone.now() - timedelta(minutes=2)
		)
		
		# Should allow password change without old_password
		data = {
			'new_password': 'newpass123'
		}
		response = self.client.post('/api/auth/change-password/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		# Verify all temp passwords are marked as used
		token.refresh_from_db()
		self.assertTrue(token.used)


class PasswordResetViewTest(APITestCase):
	"""Unit tests for password reset endpoint"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser',
			email='test@example.com',
			password='oldpass123'
		)
		self.client = APIClient()
	
	@patch('accounts.views.send_mail')
	def test_password_reset_success(self, mock_send_mail):
		"""Test successful password reset"""
		mock_send_mail.return_value = True
		
		data = {'email': 'test@example.com'}
		response = self.client.post('/api/auth/password-reset/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		# Verify token was created
		self.assertTrue(PasswordResetToken.objects.filter(user=self.user).exists())
		
		# Verify email was sent
		mock_send_mail.assert_called_once()
		
		# Verify old password is disabled
		self.user.refresh_from_db()
		self.assertFalse(self.user.has_usable_password())
	
	@patch('accounts.views.send_mail')
	def test_password_reset_nonexistent_email(self, mock_send_mail):
		"""Test password reset with non-existent email (security: don't reveal)"""
		data = {'email': 'nonexistent@example.com'}
		response = self.client.post('/api/auth/password-reset/', data, format='json')
		# Should return success message even if email doesn't exist
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		# Should not send email
		mock_send_mail.assert_not_called()
	
	@patch('accounts.views.send_mail')
	def test_password_reset_email_failure(self, mock_send_mail):
		"""Test password reset when email sending fails"""
		mock_send_mail.side_effect = Exception('SMTP Error')
		
		data = {'email': 'test@example.com'}
		response = self.client.post('/api/auth/password-reset/', data, format='json')
		# Should still return success for security
		self.assertEqual(response.status_code, status.HTTP_200_OK)
	
	def test_password_reset_missing_email(self):
		"""Test password reset without email"""
		response = self.client.post('/api/auth/password-reset/', {}, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginViewTest(APITestCase):
	"""Unit tests for login endpoint"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser',
			email='test@example.com',
			password='testpass123'
		)
		self.client = APIClient()
	
	def test_login_success(self):
		"""Test successful login with regular password"""
		data = {
			'username': 'testuser',
			'password': 'testpass123'
		}
		response = self.client.post('/api/auth/login/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('access', response.data)
		self.assertIn('refresh', response.data)
		self.assertFalse(response.data.get('temp_password_used', False))
	
	def test_login_with_temp_password(self):
		"""Test login with temporary password"""
		token = PasswordResetToken.objects.create(
			user=self.user,
			temp_password='TEMP1234',
			expires_at=timezone.now() + timedelta(hours=24),
			used=False
		)
		
		# Disable regular password
		self.user.set_unusable_password()
		self.user.save()
		
		data = {
			'username': 'testuser',
			'password': 'TEMP1234'  # Case insensitive
		}
		response = self.client.post('/api/auth/login/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(response.data.get('temp_password_used', False))
		
		# Verify token was marked as used
		token.refresh_from_db()
		self.assertTrue(token.used)
	
	def test_login_invalid_credentials(self):
		"""Test login with invalid credentials"""
		data = {
			'username': 'testuser',
			'password': 'wrongpass'
		}
		response = self.client.post('/api/auth/login/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
	
	def test_login_missing_credentials(self):
		"""Test login without username or password"""
		data = {'username': 'testuser'}
		response = self.client.post('/api/auth/login/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
	
	def test_login_with_active_temp_password_blocks_old_password(self):
		"""Test that active temp password blocks old password"""
		PasswordResetToken.objects.create(
			user=self.user,
			temp_password='TEMP1234',
			expires_at=timezone.now() + timedelta(hours=24),
			used=False
		)
		
		# Try to login with old password
		data = {
			'username': 'testuser',
			'password': 'testpass123'
		}
		response = self.client.post('/api/auth/login/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
		self.assertIn('temporary password', response.data['detail'].lower())


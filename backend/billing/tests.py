from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch

from .models import Subscription

User = get_user_model()


class SubscriptionModelTest(TestCase):
	"""Unit tests for Subscription model"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
	
	def test_subscription_str_representation(self):
		"""Test subscription string representation"""
		sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=14)
		)
		self.assertIn(self.user.username, str(sub))
		self.assertIn(Subscription.PLAN_TRIAL, str(sub))
	
	def test_is_active_with_active_subscription(self):
		"""Test is_active with active subscription"""
		sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=14)
		)
		self.assertTrue(sub.is_active())
	
	def test_is_active_with_expired_date(self):
		"""Test is_active auto-expires when end_date has passed"""
		sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today() - timedelta(days=20),
			end_date=date.today() - timedelta(days=1)
		)
		# Should auto-expire
		self.assertFalse(sub.is_active())
		
		# Verify status was updated
		sub.refresh_from_db()
		self.assertEqual(sub.status, Subscription.STATUS_EXPIRED)
	
	def test_is_active_with_expired_status(self):
		"""Test is_active with already expired status"""
		sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_EXPIRED,
			start_date=date.today() - timedelta(days=20),
			end_date=date.today() - timedelta(days=1)
		)
		self.assertFalse(sub.is_active())
	
	def test_days_remaining(self):
		"""Test days_remaining calculation"""
		sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=10)
		)
		self.assertEqual(sub.days_remaining(), 10)
	
	def test_days_remaining_expired(self):
		"""Test days_remaining returns 0 for expired subscription"""
		sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_EXPIRED,
			start_date=date.today() - timedelta(days=20),
			end_date=date.today() - timedelta(days=1)
		)
		self.assertEqual(sub.days_remaining(), 0)
	
	def test_one_to_one_relationship(self):
		"""Test that subscription has one-to-one relationship with user"""
		sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=14)
		)
		self.assertEqual(self.user.subscription, sub)


class SubscriptionSerializerTest(TestCase):
	"""Unit tests for SubscriptionSerializer"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
	
	def test_serialize_subscription(self):
		"""Test serializing a subscription"""
		from .serializers import SubscriptionSerializer
		
		sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=14)
		)
		
		serializer = SubscriptionSerializer(sub)
		data = serializer.data
		self.assertEqual(data['plan'], Subscription.PLAN_TRIAL)
		self.assertEqual(data['status'], Subscription.STATUS_ACTIVE)
		self.assertIn('days_remaining', data)
		self.assertIn('trial_days_remaining', data)
	
	def test_trial_days_remaining_for_trial_plan(self):
		"""Test trial_days_remaining for trial plan"""
		from .serializers import SubscriptionSerializer
		
		sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=10)
		)
		
		serializer = SubscriptionSerializer(sub)
		self.assertEqual(serializer.data['trial_days_remaining'], 10)
	
	def test_trial_days_remaining_for_paid_plan(self):
		"""Test trial_days_remaining returns 0 for paid plans"""
		from .serializers import SubscriptionSerializer
		
		sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_MONTHLY,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=30)
		)
		
		serializer = SubscriptionSerializer(sub)
		self.assertEqual(serializer.data['trial_days_remaining'], 0)


class StatusViewTest(APITestCase):
	"""Unit tests for subscription status endpoint"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
		self.client = APIClient()
		self.client.force_authenticate(user=self.user)
	
	def test_get_status_with_existing_subscription(self):
		"""Test getting status with existing subscription"""
		Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=14)
		)
		
		response = self.client.get('/api/billing/status/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['plan'], Subscription.PLAN_TRIAL)
		self.assertIn('days_remaining', response.data)
	
	def test_get_status_creates_trial_if_not_exists(self):
		"""Test that status endpoint creates trial if subscription doesn't exist"""
		response = self.client.get('/api/billing/status/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		# Verify trial was created
		self.assertTrue(Subscription.objects.filter(user=self.user).exists())
		sub = Subscription.objects.get(user=self.user)
		self.assertEqual(sub.plan, Subscription.PLAN_TRIAL)
		self.assertEqual(sub.status, Subscription.STATUS_ACTIVE)
	
	def test_get_status_requires_authentication(self):
		"""Test that getting status requires authentication"""
		self.client.logout()
		response = self.client.get('/api/billing/status/')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SubscribeViewTest(APITestCase):
	"""Unit tests for subscribe endpoint"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
		self.client = APIClient()
		self.client.force_authenticate(user=self.user)
	
	@patch.dict('os.environ', {
		'TEST_CARD_NUMBER': '4242424242424242',
		'TEST_CARD_EXP': '01/28',
		'TEST_CARD_CVC': '123'
	})
	def test_subscribe_monthly_success(self):
		"""Test successful monthly subscription"""
		data = {
			'plan': Subscription.PLAN_MONTHLY,
			'card_number': '4242424242424242',
			'expiry': '01/28',
			'cvc': '123'
		}
		response = self.client.post('/api/billing/subscribe/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['plan'], Subscription.PLAN_MONTHLY)
		
		# Verify subscription was updated
		sub = Subscription.objects.get(user=self.user)
		self.assertEqual(sub.plan, Subscription.PLAN_MONTHLY)
		self.assertEqual(sub.status, Subscription.STATUS_ACTIVE)
		self.assertIsNotNone(sub.transaction_id)
		
		# Verify end_date is 30 days from now
		expected_end = date.today() + timedelta(days=30)
		self.assertEqual(sub.end_date, expected_end)
	
	@patch.dict('os.environ', {
		'TEST_CARD_NUMBER': '4242424242424242',
		'TEST_CARD_EXP': '01/28',
		'TEST_CARD_CVC': '123'
	})
	def test_subscribe_yearly_success(self):
		"""Test successful yearly subscription"""
		data = {
			'plan': Subscription.PLAN_YEARLY,
			'card_number': '4242424242424242',
			'expiry': '01/28',
			'cvc': '123'
		}
		response = self.client.post('/api/billing/subscribe/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['plan'], Subscription.PLAN_YEARLY)
		
		# Verify end_date is 365 days from now
		sub = Subscription.objects.get(user=self.user)
		expected_end = date.today() + timedelta(days=365)
		self.assertEqual(sub.end_date, expected_end)
	
	@patch.dict('os.environ', {
		'TEST_CARD_NUMBER': '4242424242424242',
		'TEST_CARD_EXP': '01/28',
		'TEST_CARD_CVC': '123'
	})
	def test_subscribe_invalid_plan(self):
		"""Test subscription with invalid plan"""
		data = {
			'plan': 'invalid_plan',
			'card_number': '4242424242424242',
			'expiry': '01/28',
			'cvc': '123'
		}
		response = self.client.post('/api/billing/subscribe/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('plan', response.data)
	
	@patch.dict('os.environ', {
		'TEST_CARD_NUMBER': '4242424242424242',
		'TEST_CARD_EXP': '01/28',
		'TEST_CARD_CVC': '123'
	})
	def test_subscribe_declined_card(self):
		"""Test subscription with declined card"""
		data = {
			'plan': Subscription.PLAN_MONTHLY,
			'card_number': '4000000000000002',  # Declined card
			'expiry': '01/28',
			'cvc': '123'
		}
		response = self.client.post('/api/billing/subscribe/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
		self.assertIn('declined', response.data['detail'].lower())
	
	@patch.dict('os.environ', {
		'TEST_CARD_NUMBER': '4242424242424242',
		'TEST_CARD_EXP': '01/28',
		'TEST_CARD_CVC': '123'
	})
	def test_subscribe_creates_trial_if_not_exists(self):
		"""Test that subscribe creates trial if subscription doesn't exist"""
		data = {
			'plan': Subscription.PLAN_MONTHLY,
			'card_number': '4242424242424242',
			'expiry': '01/28',
			'cvc': '123'
		}
		response = self.client.post('/api/billing/subscribe/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		# Verify subscription was created
		self.assertTrue(Subscription.objects.filter(user=self.user).exists())
	
	@patch.dict('os.environ', {
		'TEST_CARD_NUMBER': '4242424242424242',
		'TEST_CARD_EXP': '01/28',
		'TEST_CARD_CVC': '123'
	})
	def test_subscribe_updates_existing_subscription(self):
		"""Test that subscribe updates existing subscription"""
		# Create existing trial
		Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=5)
		)
		
		data = {
			'plan': Subscription.PLAN_MONTHLY,
			'card_number': '4242424242424242',
			'expiry': '01/28',
			'cvc': '123'
		}
		response = self.client.post('/api/billing/subscribe/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		# Verify subscription was updated, not duplicated
		self.assertEqual(Subscription.objects.filter(user=self.user).count(), 1)
		sub = Subscription.objects.get(user=self.user)
		self.assertEqual(sub.plan, Subscription.PLAN_MONTHLY)
	
	def test_subscribe_requires_authentication(self):
		"""Test that subscribe requires authentication"""
		self.client.logout()
		data = {
			'plan': Subscription.PLAN_MONTHLY,
			'card_number': '4242424242424242',
			'expiry': '01/28',
			'cvc': '123'
		}
		response = self.client.post('/api/billing/subscribe/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class GetOrCreateTrialTest(TestCase):
	"""Unit tests for _get_or_create_trial helper function"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
	
	def test_get_or_create_trial_creates_new(self):
		"""Test that _get_or_create_trial creates new trial if doesn't exist"""
		from .views import _get_or_create_trial
		
		sub = _get_or_create_trial(self.user)
		self.assertIsNotNone(sub)
		self.assertEqual(sub.plan, Subscription.PLAN_TRIAL)
		self.assertEqual(sub.status, Subscription.STATUS_ACTIVE)
		self.assertEqual(sub.days_remaining(), 14)
	
	def test_get_or_create_trial_returns_existing(self):
		"""Test that _get_or_create_trial returns existing subscription"""
		from .views import _get_or_create_trial
		
		# Create existing subscription
		existing_sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_MONTHLY,
			status=Subscription.STATUS_ACTIVE,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=30)
		)
		
		sub = _get_or_create_trial(self.user)
		self.assertEqual(sub.id, existing_sub.id)
		self.assertEqual(sub.plan, Subscription.PLAN_MONTHLY)  # Not changed to trial
	
	def test_get_or_create_trial_with_expired_trial(self):
		"""Test that _get_or_create_trial doesn't recreate expired trial"""
		from .views import _get_or_create_trial
		
		# Create expired trial
		expired_sub = Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_EXPIRED,
			start_date=date.today() - timedelta(days=20),
			end_date=date.today() - timedelta(days=1)
		)
		
		sub = _get_or_create_trial(self.user)
		# Should return existing expired trial, not create new one
		self.assertEqual(sub.id, expired_sub.id)
		self.assertEqual(Subscription.objects.filter(user=self.user).count(), 1)


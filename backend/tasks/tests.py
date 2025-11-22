from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from calendar import monthrange

from .models import Task, TaskTemplate, TaskTemplateItem
from billing.models import Subscription

User = get_user_model()


class TaskModelTest(TestCase):
	"""Unit tests for Task model methods"""
	
	def setUp(self):
		"""Set up test data - runs before each test"""
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
		# Create active subscription for user
		Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=timezone.now().date(),
			end_date=timezone.now().date() + timedelta(days=14)
		)
	
	def test_task_str_representation(self):
		"""Test task string representation"""
		task = Task.objects.create(
			user=self.user,
			title='Test Task',
			due_date=date.today()
		)
		self.assertIn('Test Task', str(task))
		self.assertIn('todo', str(task))
		
		task.completed = True
		task.save()
		self.assertIn('done', str(task))
	
	def test_calculate_next_recurrence_daily(self):
		"""Test daily recurrence calculation"""
		task = Task.objects.create(
			user=self.user,
			title='Daily Task',
			due_date=date(2024, 1, 1),
			is_recurring=True,
			recurrence_type='daily',
			recurrence_interval=1
		)
		next_date = task.calculate_next_recurrence()
		self.assertEqual(next_date, date(2024, 1, 2))
		
		# Test with interval
		task.recurrence_interval = 3
		next_date = task.calculate_next_recurrence()
		self.assertEqual(next_date, date(2024, 1, 4))
	
	def test_calculate_next_recurrence_weekly(self):
		"""Test weekly recurrence calculation"""
		# Monday, Jan 1, 2024
		task = Task.objects.create(
			user=self.user,
			title='Weekly Task',
			due_date=date(2024, 1, 1),
			is_recurring=True,
			recurrence_type='weekly',
			recurrence_interval=1
		)
		next_date = task.calculate_next_recurrence()
		self.assertEqual(next_date, date(2024, 1, 8))
		
		# Test with specific days
		task.recurrence_days = [0, 2, 4]  # Monday, Wednesday, Friday
		task.due_date = date(2024, 1, 1)  # Monday
		next_date = task.calculate_next_recurrence()
		self.assertEqual(next_date, date(2024, 1, 3))  # Wednesday
	
	def test_calculate_next_recurrence_monthly(self):
		"""Test monthly recurrence calculation"""
		task = Task.objects.create(
			user=self.user,
			title='Monthly Task',
			due_date=date(2024, 1, 15),
			is_recurring=True,
			recurrence_type='monthly',
			recurrence_interval=1
		)
		next_date = task.calculate_next_recurrence()
		self.assertEqual(next_date, date(2024, 2, 15))
		
		# Test month-end handling (Jan 31 -> Feb 29 in leap year)
		task.due_date = date(2024, 1, 31)
		next_date = task.calculate_next_recurrence()
		self.assertEqual(next_date, date(2024, 2, 29))
		
		# Test non-leap year (Jan 31 -> Feb 28)
		task.due_date = date(2023, 1, 31)
		next_date = task.calculate_next_recurrence()
		self.assertEqual(next_date, date(2023, 2, 28))
	
	def test_calculate_next_recurrence_yearly(self):
		"""Test yearly recurrence calculation"""
		task = Task.objects.create(
			user=self.user,
			title='Yearly Task',
			due_date=date(2024, 2, 29),
			is_recurring=True,
			recurrence_type='yearly',
			recurrence_interval=1
		)
		next_date = task.calculate_next_recurrence()
		# 2025 is not a leap year, so Feb 29 -> Feb 28
		self.assertEqual(next_date, date(2025, 2, 28))
	
	def test_calculate_next_recurrence_custom(self):
		"""Test custom recurrence (every N days)"""
		task = Task.objects.create(
			user=self.user,
			title='Custom Task',
			due_date=date(2024, 1, 1),
			is_recurring=True,
			recurrence_type='custom',
			recurrence_interval=5
		)
		next_date = task.calculate_next_recurrence()
		self.assertEqual(next_date, date(2024, 1, 6))
	
	def test_calculate_next_recurrence_non_recurring(self):
		"""Test that non-recurring tasks return None"""
		task = Task.objects.create(
			user=self.user,
			title='Non-recurring Task',
			due_date=date.today(),
			is_recurring=False
		)
		self.assertIsNone(task.calculate_next_recurrence())
	
	def test_calculate_next_recurrence_with_next_recurrence_date(self):
		"""Test that next_recurrence_date is used as base if set"""
		task = Task.objects.create(
			user=self.user,
			title='Task',
			due_date=date(2024, 1, 1),
			is_recurring=True,
			recurrence_type='daily',
			recurrence_interval=1,
			next_recurrence_date=date(2024, 1, 10)
		)
		next_date = task.calculate_next_recurrence()
		self.assertEqual(next_date, date(2024, 1, 11))


class TaskTemplateModelTest(TestCase):
	"""Unit tests for TaskTemplate model"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
	
	def test_template_str_representation(self):
		"""Test template string representation"""
		template = TaskTemplate.objects.create(
			user=self.user,
			name='Test Template'
		)
		self.assertIn('Test Template', str(template))
		self.assertIn('Template', str(template))
	
	def test_template_item_str_representation(self):
		"""Test template item string representation"""
		template = TaskTemplate.objects.create(
			user=self.user,
			name='Test Template'
		)
		item = TaskTemplateItem.objects.create(
			template=template,
			title='Item 1',
			order=0
		)
		self.assertIn('Item 1', str(item))
		self.assertIn('Test Template', str(item))


class TaskSerializerTest(TestCase):
	"""Unit tests for Task serializer"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
		Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=timezone.now().date(),
			end_date=timezone.now().date() + timedelta(days=14)
		)
	
	def test_serializer_clears_recurring_fields_for_non_recurring_task(self):
		"""Test that non-recurring tasks clear recurring fields"""
		from .serializers import TaskSerializer
		
		data = {
			'title': 'Test Task',
			'due_date': date.today().isoformat(),
			'is_recurring': False,
			'recurrence_type': 'daily',  # Should be cleared
			'recurrence_interval': 5  # Should be reset to 1
		}
		serializer = TaskSerializer(data=data)
		self.assertTrue(serializer.is_valid())
		validated_data = serializer.validated_data
		self.assertIsNone(validated_data.get('recurrence_type'))
		self.assertEqual(validated_data.get('recurrence_interval'), 1)
	
	def test_serializer_handles_empty_recurrence_end_date(self):
		"""Test that empty string for recurrence_end_date becomes None"""
		from .serializers import TaskSerializer
		
		data = {
			'title': 'Test Task',
			'due_date': date.today().isoformat(),
			'is_recurring': True,
			'recurrence_type': 'daily',
			'recurrence_end_date': ''  # Empty string
		}
		serializer = TaskSerializer(data=data)
		self.assertTrue(serializer.is_valid())
		self.assertIsNone(serializer.validated_data.get('recurrence_end_date'))
	
	def test_serializer_sets_overdue_notified_false_on_completion(self):
		"""Test that completing a task sets overdue_notified to False"""
		from .serializers import TaskSerializer
		
		task = Task.objects.create(
			user=self.user,
			title='Test Task',
			due_date=date.today(),
			overdue_notified=True
		)
		
		serializer = TaskSerializer(task, data={'completed': True}, partial=True)
		self.assertTrue(serializer.is_valid())
		updated_task = serializer.save()
		self.assertFalse(updated_task.overdue_notified)


class TaskViewSetTest(APITestCase):
	"""Unit tests for Task ViewSet API endpoints"""
	
	def setUp(self):
		"""Set up test data"""
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
		self.other_user = User.objects.create_user(
			username='otheruser1',
			email='other@example.com',
			password='Test1234#'
		)
		
		# Create active subscriptions
		Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=timezone.now().date(),
			end_date=timezone.now().date() + timedelta(days=14)
		)
		Subscription.objects.create(
			user=self.other_user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=timezone.now().date(),
			end_date=timezone.now().date() + timedelta(days=14)
		)
		
		self.client = APIClient()
		self.client.force_authenticate(user=self.user)
	
	def test_list_tasks_requires_authentication(self):
		"""Test that listing tasks requires authentication"""
		self.client.logout()
		response = self.client.get('/api/tasks/')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
	
	def test_list_tasks_returns_only_user_tasks(self):
		"""Test that users only see their own tasks"""
		Task.objects.create(
			user=self.user,
			title='My Task',
			due_date=date.today()
		)
		Task.objects.create(
			user=self.other_user,
			title='Other Task',
			due_date=date.today()
		)
		
		response = self.client.get('/api/tasks/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data['results']), 1)
		self.assertEqual(response.data['results'][0]['title'], 'My Task')
	
	def test_create_task(self):
		"""Test creating a new task"""
		data = {
			'title': 'New Task',
			'description': 'Task description',
			'due_date': date.today().isoformat(),
			'category': 'Work',
			'label': 'red'
		}
		response = self.client.post('/api/tasks/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['title'], 'New Task')
		# Verify task was created for the user
		task = Task.objects.get(id=response.data['id'])
		self.assertEqual(task.user, self.user)
	
	def test_create_recurring_task_sets_next_recurrence_date(self):
		"""Test that creating a recurring task calculates next_recurrence_date"""
		data = {
			'title': 'Recurring Task',
			'due_date': date(2024, 1, 1).isoformat(),
			'is_recurring': True,
			'recurrence_type': 'daily',
			'recurrence_interval': 1
		}
		response = self.client.post('/api/tasks/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		
		task = Task.objects.get(id=response.data['id'])
		self.assertIsNotNone(task.next_recurrence_date)
		self.assertEqual(task.next_recurrence_date, date(2024, 1, 2))
	
	def test_filter_tasks_by_due_date(self):
		"""Test filtering tasks by due_date query parameter"""
		today = date.today()
		tomorrow = today + timedelta(days=1)
		
		Task.objects.create(user=self.user, title='Today Task', due_date=today)
		Task.objects.create(user=self.user, title='Tomorrow Task', due_date=tomorrow)
		
		response = self.client.get(f'/api/tasks/?due_date={today.isoformat()}')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data['results']), 1)
		self.assertEqual(response.data['results'][0]['title'], 'Today Task')
	
	def test_recent_tasks_endpoint(self):
		"""Test the recent tasks endpoint"""
		# Create tasks with different creation times
		Task.objects.create(user=self.user, title='Old Task', due_date=date.today())
		Task.objects.create(user=self.user, title='New Task', due_date=date.today())
		
		response = self.client.get('/api/tasks/recent/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertGreaterEqual(len(response.data['results']), 2)
	
	def test_reschedule_task(self):
		"""Test rescheduling a task"""
		task = Task.objects.create(
			user=self.user,
			title='Test Task',
			due_date=date.today() - timedelta(days=1),
			overdue_notified=True
		)
		
		response = self.client.post(f'/api/tasks/{task.id}/reschedule/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		task.refresh_from_db()
		self.assertEqual(task.due_date, timezone.localdate() + timedelta(days=1))
		self.assertFalse(task.overdue_notified)
	
	def test_reschedule_other_user_task_forbidden(self):
		"""Test that users cannot reschedule other users' tasks"""
		task = Task.objects.create(
			user=self.other_user,
			title='Other Task',
			due_date=date.today()
		)
		
		response = self.client.post(f'/api/tasks/{task.id}/reschedule/')
		# Task won't be in queryset (filtered by user), so returns 404
		# This is acceptable behavior - user can't see other user's tasks
		self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
	
	def test_create_from_template(self):
		"""Test creating tasks from a template"""
		template = TaskTemplate.objects.create(
			user=self.user,
			name='Test Template',
			category='Work'
		)
		TaskTemplateItem.objects.create(
			template=template,
			title='Item 1',
			due_date_offset=0,
			order=0
		)
		TaskTemplateItem.objects.create(
			template=template,
			title='Item 2',
			due_date_offset=1,
			order=1
		)
		
		data = {
			'template_id': template.id,
			'base_date': date.today().isoformat()
		}
		response = self.client.post('/api/tasks/from-template/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(len(response.data['tasks']), 2)
		
		# Verify tasks were created
		tasks = Task.objects.filter(user=self.user)
		self.assertEqual(tasks.count(), 2)
	
	def test_create_from_template_not_found(self):
		"""Test creating tasks from non-existent template"""
		data = {
			'template_id': 999,
			'base_date': date.today().isoformat()
		}
		response = self.client.post('/api/tasks/from-template/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
	
	def test_update_task(self):
		"""Test updating a task"""
		task = Task.objects.create(
			user=self.user,
			title='Original Title',
			due_date=date.today()
		)
		
		data = {'title': 'Updated Title'}
		response = self.client.patch(f'/api/tasks/{task.id}/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		task.refresh_from_db()
		self.assertEqual(task.title, 'Updated Title')
	
	def test_delete_task(self):
		"""Test deleting a task"""
		task = Task.objects.create(
			user=self.user,
			title='Task to Delete',
			due_date=date.today()
		)
		
		response = self.client.delete(f'/api/tasks/{task.id}/')
		self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
		self.assertFalse(Task.objects.filter(id=task.id).exists())


class TaskTemplateViewSetTest(APITestCase):
	"""Unit tests for TaskTemplate ViewSet"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
		Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=timezone.now().date(),
			end_date=timezone.now().date() + timedelta(days=14)
		)
		self.client = APIClient()
		self.client.force_authenticate(user=self.user)
	
	def test_create_template_with_items(self):
		"""Test creating a template with items"""
		data = {
			'name': 'Test Template',
			'description': 'Template description',
			'category': 'Work',
			'items': [
				{'title': 'Item 1', 'due_date_offset': 0, 'order': 0},
				{'title': 'Item 2', 'due_date_offset': 1, 'order': 1}
			]
		}
		response = self.client.post('/api/tasks/templates/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(len(response.data['items']), 2)
	
	def test_list_templates(self):
		"""Test listing templates"""
		TaskTemplate.objects.create(user=self.user, name='Template 1')
		TaskTemplate.objects.create(user=self.user, name='Template 2')
		
		response = self.client.get('/api/tasks/templates/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data['results']), 2)
	
	def test_update_template_items(self):
		"""Test updating template items"""
		template = TaskTemplate.objects.create(user=self.user, name='Template')
		TaskTemplateItem.objects.create(template=template, title='Old Item', order=0)
		
		data = {
			'name': 'Updated Template',
			'items': [
				{'title': 'New Item 1', 'due_date_offset': 0, 'order': 0},
				{'title': 'New Item 2', 'due_date_offset': 1, 'order': 1}
			]
		}
		response = self.client.patch(f'/api/tasks/templates/{template.id}/', data, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data['items']), 2)
		self.assertEqual(template.items.count(), 2)


class DashboardViewTest(APITestCase):
	"""Unit tests for dashboard endpoint"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
		Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=timezone.now().date(),
			end_date=timezone.now().date() + timedelta(days=14)
		)
		self.client = APIClient()
		self.client.force_authenticate(user=self.user)
	
	def test_dashboard_today_period(self):
		"""Test dashboard with today period"""
		Task.objects.create(
			user=self.user,
			title='Task 1',
			due_date=date.today(),
			completed=True
		)
		Task.objects.create(
			user=self.user,
			title='Task 2',
			due_date=date.today(),
			completed=False
		)
		
		response = self.client.get('/api/dashboard/?period=today')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['total_tasks'], 2)
		self.assertEqual(response.data['completed_tasks'], 1)
		self.assertEqual(response.data['pending_tasks'], 1)
	
	def test_dashboard_week_period(self):
		"""Test dashboard with week period"""
		response = self.client.get('/api/dashboard/?period=week')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('total_tasks', response.data)
		self.assertIn('completion_rate', response.data)
	
	def test_dashboard_month_period(self):
		"""Test dashboard with month period"""
		response = self.client.get('/api/dashboard/?period=month')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('tasks_by_category', response.data)
		self.assertIn('tasks_by_date', response.data)


class TaskSubscriptionAccessTest(APITestCase):
	"""Test subscription/trial access control"""
	
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser1',
			email='test@example.com',
			password='Test1234#'
		)
		self.client = APIClient()
		self.client.force_authenticate(user=self.user)
	
	def test_access_without_subscription_creates_trial(self):
		"""Test that accessing tasks without subscription creates a trial"""
		response = self.client.get('/api/tasks/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(Subscription.objects.filter(user=self.user).exists())
	
	def test_access_with_expired_subscription_forbidden(self):
		"""Test that expired subscription blocks access"""
		Subscription.objects.create(
			user=self.user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_EXPIRED,
			start_date=timezone.now().date() - timedelta(days=20),
			end_date=timezone.now().date() - timedelta(days=1)
		)
		
		response = self.client.get('/api/tasks/')
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

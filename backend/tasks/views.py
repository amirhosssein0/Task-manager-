from datetime import date, timedelta, time
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from .models import Task, TaskTemplate
from .serializers import (
	TaskSerializer, TaskTemplateSerializer, TaskTemplateCreateSerializer
)
from billing.models import Subscription
from django.core.exceptions import PermissionDenied


class TaskViewSet(viewsets.ModelViewSet):
	queryset = Task.objects.all()
	serializer_class = TaskSerializer
	parser_classes = [JSONParser]
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		# Enforce subscription/trial access
		from billing.views import _get_or_create_trial
		sub = _get_or_create_trial(self.request.user)
		# Check if subscription is active (this will auto-expire if needed)
		if not sub.is_active():
			raise PermissionDenied("Subscription required. Please subscribe to continue using tasks.")
		qs = Task.objects.filter(user=self.request.user)
		due_date_param = self.request.query_params.get("due_date")
		if due_date_param:
			qs = qs.filter(due_date=due_date_param)
		return qs

	def perform_create(self, serializer):
		from billing.views import _get_or_create_trial
		sub = _get_or_create_trial(self.request.user)
		if not sub.is_active():
			raise PermissionDenied("Subscription required. Please subscribe to continue using tasks.")
		task = serializer.save(user=self.request.user)
		
		# If this is a recurring task, calculate next recurrence date
		if task.is_recurring and task.recurrence_type:
			task.next_recurrence_date = task.calculate_next_recurrence()
			task.save(update_fields=['next_recurrence_date'])

	@action(detail=False, methods=["get"], url_path="recent")
	def recent(self, request):
		from rest_framework.pagination import PageNumberPagination
		paginator = PageNumberPagination()
		paginator.page_size = 10
		recent_qs = Task.objects.filter(user=request.user).order_by("-created_at")
		page = paginator.paginate_queryset(recent_qs, request)
		if page is not None:
			return paginator.get_paginated_response(TaskSerializer(page, many=True).data)
		return Response(TaskSerializer(recent_qs[:10], many=True).data)

	@action(detail=False, methods=["get"], url_path="user-tasks")
	def user_tasks(self, request):
		from rest_framework.pagination import PageNumberPagination
		paginator = PageNumberPagination()
		paginator.page_size = 10
		all_qs = Task.objects.filter(user=request.user).order_by("-created_at")
		page = paginator.paginate_queryset(all_qs, request)
		if page is not None:
			return paginator.get_paginated_response(TaskSerializer(page, many=True).data)
		return Response(TaskSerializer(all_qs[:10], many=True).data)

	@action(detail=True, methods=["post"], url_path="reschedule")
	def reschedule(self, request, pk=None):
		task = self.get_object()
		if task.user != request.user:
			raise PermissionDenied("You do not have permission to modify this task.")
		task.due_date = timezone.localdate() + timedelta(days=1)
		task.overdue_notified = False
		task.save(update_fields=["due_date", "overdue_notified", "updated_at"])
		return Response(TaskSerializer(task).data)
	
	@action(detail=False, methods=["post"], url_path="from-template")
	def create_from_template(self, request):
		"""Create tasks from a template"""
		from billing.views import _get_or_create_trial
		sub = _get_or_create_trial(request.user)
		if not sub.is_active():
			raise PermissionDenied("Subscription required.")
		
		template_id = request.data.get("template_id")
		base_date = request.data.get("base_date", timezone.localdate().isoformat())
		
		try:
			# Optimize: Use prefetch_related to avoid N+1 queries
			template = TaskTemplate.objects.prefetch_related('items').get(id=template_id, user=request.user)
		except TaskTemplate.DoesNotExist:
			return Response(
				{"error": "Template not found"}, status=status.HTTP_404_NOT_FOUND
			)
		
		base_date_obj = date.fromisoformat(base_date) if isinstance(base_date, str) else base_date
		created_tasks = []
		
		# Optimize: Use bulk_create for better performance with many items
		tasks_to_create = []
		for item in template.items.all():
			due_date = base_date_obj + timedelta(days=item.due_date_offset)
			tasks_to_create.append(
				Task(
					user=request.user,
					title=item.title,
					description=item.description,
					category=item.category or template.category,
					label=item.label,
					due_date=due_date,
				)
			)
		
		# Bulk create all tasks at once
		created_task_objects = Task.objects.bulk_create(tasks_to_create)
		created_tasks = [TaskSerializer(task).data for task in created_task_objects]
		
		return Response({
			"message": f"Created {len(created_tasks)} tasks from template",
			"tasks": created_tasks
		}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dashboard(request):
	user = request.user
	period = request.query_params.get("period", "today")
	# Subscription/trial info - create trial if doesn't exist
	from billing.views import _get_or_create_trial
	try:
		sub = user.subscription
	except Subscription.DoesNotExist:
		sub = _get_or_create_trial(user)
	
	# Check if active and update status if expired
	is_active = sub.is_active()
	
	# Calculate trial days remaining (only for trial plan)
	if sub.plan == Subscription.PLAN_TRIAL:
		trial_days_remaining = sub.days_remaining()
	else:
		trial_days_remaining = 0
	
	subscription_plan = sub.plan
	subscription_status = sub.status

	today = date.today()
	if period == "today":
		start = today
	elif period == "week":
		start = today - timedelta(days=6)
	else:
		start = today - timedelta(days=29)

	tasks_qs = Task.objects.filter(user=user, created_at__date__gte=start, created_at__date__lte=today)

	# Optimize: Use single aggregation query instead of multiple queries
	stats = tasks_qs.aggregate(
		total=Count("id"),
		completed=Count("id", filter=Q(completed=True))
	)
	total = stats['total']
	completed = stats['completed']
	pending = total - completed
	completion_rate = int((completed / total) * 100) if total > 0 else 0

	# Optimize: Use aggregation for category counts
	by_category = tasks_qs.values("category").annotate(count=Count("id"))
	tasks_by_category = {item["category"] or "Uncategorized": item["count"] for item in by_category}

	# Optimize: Use aggregation instead of loop (prevents N+1 queries)
	by_date = tasks_qs.values("due_date").annotate(
		total=Count("id"),
		completed=Count("id", filter=Q(completed=True))
	)
	tasks_by_date = [
		{"date": item["due_date"].isoformat(), "total": item["total"], "completed": item["completed"]}
		for item in by_date
	]

	# Optimize: Use only() to fetch only needed fields
	overdue_qs = Task.objects.filter(user=user, completed=False, overdue_notified=True).only("id", "title", "due_date")
	overdue_tasks = [
		{"id": task.id, "title": task.title, "due_date": task.due_date.isoformat()}
		for task in overdue_qs
	]

	return Response({
		"total_tasks": total,
		"completed_tasks": completed,
		"pending_tasks": pending,
		"completion_rate": completion_rate,
		"tasks_by_category": tasks_by_category,
		"tasks_by_date": tasks_by_date,
		"trial_days_remaining": trial_days_remaining,
		"subscription_plan": subscription_plan,
		"subscription_status": subscription_status,
		"overdue_tasks": overdue_tasks,
	})


class TaskTemplateViewSet(viewsets.ModelViewSet):
	queryset = TaskTemplate.objects.all()
	serializer_class = TaskTemplateSerializer
	parser_classes = [JSONParser]
	permission_classes = [permissions.IsAuthenticated]
	
	def get_queryset(self):
		from billing.views import _get_or_create_trial
		sub = _get_or_create_trial(self.request.user)
		if not sub.is_active():
			raise PermissionDenied("Subscription required.")
		# Optimize: Use prefetch_related to avoid N+1 queries when accessing items
		return TaskTemplate.objects.filter(user=self.request.user).prefetch_related('items')
	
	def get_serializer_class(self):
		if self.action in ['create', 'update', 'partial_update']:
			return TaskTemplateCreateSerializer
		return TaskTemplateSerializer
	
	def perform_create(self, serializer):
		from billing.views import _get_or_create_trial
		sub = _get_or_create_trial(self.request.user)
		if not sub.is_active():
			raise PermissionDenied("Subscription required.")
		serializer.save(user=self.request.user)
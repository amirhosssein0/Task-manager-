from datetime import date, timedelta
from django.db.models import Count
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from .models import Task
from .serializers import TaskSerializer
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
		serializer.save(user=self.request.user)

	@action(detail=False, methods=["get"], url_path="recent")
	def recent(self, request):
		recent_qs = Task.objects.filter(user=request.user).order_by("-created_at")[:10]
		return Response(TaskSerializer(recent_qs, many=True).data)

	@action(detail=False, methods=["get"], url_path="user-tasks")
	def user_tasks(self, request):
		all_qs = Task.objects.filter(user=request.user).order_by("-created_at")[:100]
		return Response(TaskSerializer(all_qs, many=True).data)


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

	total = tasks_qs.count()
	completed = tasks_qs.filter(completed=True).count()
	pending = total - completed
	completion_rate = int((completed / total) * 100) if total > 0 else 0

	by_category = tasks_qs.values("category").annotate(count=Count("id"))
	tasks_by_category = {item["category"] or "Uncategorized": item["count"] for item in by_category}

	# Aggregate by date
	daily = {}
	for t in tasks_qs:
		key = t.due_date.isoformat()
		if key not in daily:
			daily[key] = {"date": key, "total": 0, "completed": 0}
		daily[key]["total"] += 1
		if t.completed:
			daily[key]["completed"] += 1
	tasks_by_date = list(daily.values())

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
	})
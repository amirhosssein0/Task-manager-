import os
from datetime import timedelta
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Subscription
from .serializers import SubscriptionSerializer


def _get_or_create_trial(user) -> Subscription:
	# Use try/except for OneToOneField access
	try:
		sub = user.subscription
		# If subscription exists but is expired trial, don't recreate
		return sub
	except Subscription.DoesNotExist:
		# Create 14-day trial
		start = timezone.now().date()
		end = start + timedelta(days=14)
		return Subscription.objects.create(
			user=user,
			plan=Subscription.PLAN_TRIAL,
			status=Subscription.STATUS_ACTIVE,
			start_date=start,
			end_date=end
		)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def status_view(request):
	sub = _get_or_create_trial(request.user)
	data = SubscriptionSerializer(sub).data
	return Response(data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def subscribe_view(request):
	plan = request.data.get('plan')
	card_number = request.data.get('card_number')
	expiry = request.data.get('expiry')
	cvc = request.data.get('cvc')

	if plan not in (Subscription.PLAN_MONTHLY, Subscription.PLAN_YEARLY):
		return Response({'plan': ['Invalid plan']}, status=status.HTTP_400_BAD_REQUEST)

	exp_card = os.getenv('TEST_CARD_NUMBER', '4242424242424242')
	exp_expiry = os.getenv('TEST_CARD_EXP', '01/28')
	exp_cvc = os.getenv('TEST_CARD_CVC', '123')
	if not (card_number == exp_card and expiry == exp_expiry and cvc == exp_cvc):
		return Response({'detail': 'Card declined'}, status=status.HTTP_402_PAYMENT_REQUIRED)

	sub = _get_or_create_trial(request.user)
	start = timezone.now().date()
	if plan == Subscription.PLAN_MONTHLY:
		end = start + timedelta(days=30)
	else:
		end = start + timedelta(days=365)
	sub.plan = plan
	sub.status = Subscription.STATUS_ACTIVE
	sub.start_date = start
	sub.end_date = end
	sub.transaction_id = f"FAKE-{int(timezone.now().timestamp())}"
	sub.save()

	return Response(SubscriptionSerializer(sub).data)



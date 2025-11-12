from rest_framework import serializers
from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
	days_remaining = serializers.SerializerMethodField()
	trial_days_remaining = serializers.SerializerMethodField()

	class Meta:
		model = Subscription
		fields = ('plan', 'status', 'start_date', 'end_date', 'transaction_id', 'days_remaining', 'trial_days_remaining')

	def get_days_remaining(self, obj: Subscription) -> int:
		return obj.days_remaining()

	def get_trial_days_remaining(self, obj: Subscription) -> int:
		# Only return days remaining for trial plan
		if obj.plan == Subscription.PLAN_TRIAL:
			return obj.days_remaining()
		return 0



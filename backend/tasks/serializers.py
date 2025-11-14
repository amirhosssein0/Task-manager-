from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
	class Meta:
		model = Task
		fields = ("id", "title", "description", "completed", "due_date", "category", "label", "created_at")
		read_only_fields = ("id", "created_at")

	def update(self, instance, validated_data):
		completed = validated_data.get("completed")
		if completed:
			validated_data["overdue_notified"] = False
		return super().update(instance, validated_data)



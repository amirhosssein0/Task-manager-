from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Profile


class SignupSerializer(serializers.ModelSerializer):
	email = serializers.EmailField(
		required=True,
		validators=[UniqueValidator(queryset=User.objects.all())]
	)
	password = serializers.CharField(write_only=True, required=True)

	class Meta:
		model = User
		fields = ("username", "email", "password")

	def create(self, validated_data):
		user = User.objects.create_user(
			username=validated_data["username"],
			email=validated_data["email"],
			password=validated_data["password"],
		)
		return user


class ProfileSerializer(serializers.ModelSerializer):
	username = serializers.CharField(source="user.username", read_only=True)
	email = serializers.CharField(source="user.email", required=False)
	first_name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
	last_name = serializers.CharField(source="user.last_name", required=False, allow_blank=True)
	date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)

	class Meta:
		model = Profile
		fields = ("username", "email", "first_name", "last_name", "profile_picture", "date_joined")
		read_only_fields = ("username", "date_joined")

	def update(self, instance: Profile, validated_data):
		user_data = validated_data.pop("user", {})
		for attr, value in user_data.items():
			setattr(instance.user, attr, value)
		instance.user.save()
		return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
	old_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
	new_password = serializers.CharField(write_only=True)

	def validate_new_password(self, value):
		validate_password(value)
		return value



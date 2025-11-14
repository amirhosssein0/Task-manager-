from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from PIL import Image
import os
from django.core.files.uploadedfile import InMemoryUploadedFile
import io
from sys import getsizeof
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
		
		# Optimize profile picture if provided
		if 'profile_picture' in validated_data and validated_data['profile_picture']:
			image = validated_data['profile_picture']
			validated_data['profile_picture'] = self._optimize_image(image)
		
		return super().update(instance, validated_data)
	
	def _optimize_image(self, image):
		"""
		Optimize image by resizing and compressing.
		Max size: 800x800px, Quality: 85%, Format: JPEG
		"""
		try:
			# Open image
			img = Image.open(image)
			
			# Convert RGBA to RGB if necessary (for PNG with transparency)
			if img.mode in ('RGBA', 'LA', 'P'):
				background = Image.new('RGB', img.size, (255, 255, 255))
				if img.mode == 'P':
					img = img.convert('RGBA')
				background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
				img = background
			elif img.mode != 'RGB':
				img = img.convert('RGB')
			
			# Resize if larger than 800x800
			max_size = (800, 800)
			if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
				img.thumbnail(max_size, Image.Resampling.LANCZOS)
			
			# Save to memory buffer
			img_io = io.BytesIO()
			img.save(img_io, format='JPEG', quality=85, optimize=True)
			img_io.seek(0)
			
			# Create new InMemoryUploadedFile
			original_name = image.name
			name, ext = os.path.splitext(original_name)
			new_name = f"{name}.jpg"
			
			optimized_image = InMemoryUploadedFile(
				img_io,
				'ImageField',
				new_name,
				'image/jpeg',
				img_io.tell(),
				None
			)
			
			return optimized_image
		except Exception as e:
			# If optimization fails, return original image
			print(f"Image optimization failed: {str(e)}")
			return image


class ChangePasswordSerializer(serializers.Serializer):
	old_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
	new_password = serializers.CharField(write_only=True)

	def validate_new_password(self, value):
		validate_password(value)
		return value



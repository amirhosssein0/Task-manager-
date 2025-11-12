from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import signup, login, profile_view, delete_account, change_password, password_reset


app_name = "accounts"

urlpatterns = [
	path("signup/", signup, name="signup"),
	path("login/", login, name="login"),
	path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
	path("profile/", profile_view, name="profile"),
	path("delete-account/", delete_account, name="delete_account"),
	path("change-password/", change_password, name="change_password"),
	path("password-reset/", password_reset, name="password_reset"),
]



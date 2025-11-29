from pathlib import Path
import os
import sys
from datetime import timedelta
from typing import Optional

from celery.schedules import crontab

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

# =========================
# Paths & Environment
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent 

# (dev / staging / prod)
DJANGO_ENV = os.getenv("DJANGO_ENV", "dev")


def env_bool(name: str, default: bool = False) -> bool:
    """Read boolean env vars like 'true', '1', 'yes'."""
    val = os.getenv(name)
    if val is None:
        return default
    return val.lower() in ("1", "true", "yes", "on")


if load_dotenv:
    env_file = BASE_DIR / f".env.{DJANGO_ENV}"
    if env_file.exists():
        load_dotenv(env_file)

# =========================
# Helpers
# =========================

def _split_list(value: Optional[str]):
    """Return a cleaned list for comma separated env vars."""
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]

# =========================
# Core Django Settings
# =========================

# Security
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")

DEBUG = env_bool("DJANGO_DEBUG", DJANGO_ENV == "dev")

_allowed_hosts = _split_list(os.getenv("DJANGO_ALLOWED_HOSTS"))
_safe_defaults = {"localhost", "127.0.0.1", "backend", "frontend", "nginx"}

if DEBUG:
    ALLOWED_HOSTS = ["*"]
else:
    ALLOWED_HOSTS = sorted(_safe_defaults.union(_allowed_hosts))

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",
    "tasks",
    "accounts",
    "billing",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# =========================
# Database (Test vs Normal)
# =========================

if (
    "test" in sys.argv
    or "pytest" in sys.argv[0]
    or os.getenv("DJANGO_TEST", "").lower() == "true"
):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }
    PASSWORD_HASHERS = [
        "django.contrib.auth.hashers.MD5PasswordHasher",
    ]
    EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    DEFAULT_FROM_EMAIL = "test@example.com"
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": os.getenv("DB_HOST"),
            "PORT": os.getenv("DB_PORT"),
        }
    }

# =========================
# Auth / i18n / Timezone
# =========================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE")
USE_I18N = True
USE_TZ = True

# =========================
# Static & Media (local vs prod)
# =========================

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "static"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

if DJANGO_ENV == "prod":
    AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME")
    AWS_S3_CUSTOM_DOMAIN = os.getenv(
        "AWS_S3_CUSTOM_DOMAIN",
        f"{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com"
        if AWS_STORAGE_BUCKET_NAME
        else None,
    )

    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/media/"
        MEDIA_ROOT = None  

    #S3 
    # INSTALLED_APPS += ["storages"]
    # DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"

# =========================
# Email
# =========================

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT"))
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)

# =========================
# DRF / JWT
# =========================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny"
    ],
}

_cors_origins = set(_split_list(os.getenv("CORS_ALLOWED_ORIGINS")))
_csrf_trusted = set(_split_list(os.getenv("CSRF_TRUSTED_ORIGINS")))
_local_origin_defaults = {
    "http://localhost",
    "http://localhost:80",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://127.0.0.1:80",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
    "http://backend:8089",
}

CORS_ALLOWED_ORIGINS = sorted(_cors_origins.union(_local_origin_defaults))
CSRF_TRUSTED_ORIGINS = sorted(_csrf_trusted.union(_local_origin_defaults))

ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "14"))

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=ACCESS_TOKEN_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=REFRESH_TOKEN_DAYS),
}

# =========================
# Celery
# =========================

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

CELERY_BEAT_SCHEDULE = {
    "flag-overdue-tasks-daily": {
        "task": "tasks.tasks.flag_overdue_tasks",
        "schedule": crontab(
            hour=int(os.getenv("OVERDUE_NOTIFY_HOUR", "21")),
            minute=int(os.getenv("OVERDUE_NOTIFY_MINUTE", "0")),
        ),
    },
    "create-recurring-tasks-daily": {
        "task": "tasks.tasks.create_recurring_tasks",
        "schedule": crontab(
            hour=int(os.getenv("RECURRING_TASKS_HOUR", "0")),
            minute=int(os.getenv("RECURRING_TASKS_MINUTE", "0")),
        ),
    },
}

# =========================
# API Docs
# =========================

SPECTACULAR_SETTINGS = {
    "TITLE": "Task Manager API",
    "DESCRIPTION": "API documentation for Task Manager application",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": "/api/",
    "AUTHENTICATION_WHITELIST": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": False,
        "filter": True,
    },
    "REDOC_UI_SETTINGS": {
        "hideDownloadButton": False,
        "hideHostname": False,
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
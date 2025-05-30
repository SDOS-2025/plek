from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "dj_rest_auth",
    "allauth",
    "allauth.account",
    "dj_rest_auth.registration",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "accounts.apps.AccountsConfig",
    "rooms",
    "bookings",
    "notifications",
    "settings",
    "analytics",
    "audit.apps.AuditConfig",  # Use the app config instead of just 'audit'
    "chatbot",
]

SITE_ID = 1

# tells Django to use your custom user model
AUTH_USER_MODEL = "accounts.CustomUser"

AUTHENTICATION_BACKENDS = (
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
)

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "audit.middleware.AuditLogMiddleware",
]

CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000"]

CSRF_COOKIE_NAME = "csrftoken"
CSRF_HEADER_NAME = "HTTP_X_CSRFTOKEN"
CSRF_COOKIE_SECURE = False  # Set to True in production with HTTPS
CSRF_COOKIE_HTTPONLY = False
CSRF_USE_SESSIONS = False
CSRF_COOKIE_SAMESITE = "Lax"

SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

ROOT_URLCONF = "backend.urls"

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
    ],
}

# JWT settings
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("",),
    "AUTH_COOKIE_SAMESITE": "Lax",
    "AUTH_COOKIE_SECURE": False,  # Set to True in production with HTTPS
}

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ACCOUNT_EMAIL_VERIFICATION = "none"
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
SOCIALACCOUNT_LOGIN_ON_GET = True
LOGIN_REDIRECT_URL = "http://localhost:3000/dashboard"
ACCOUNT_LOGOUT_REDIRECT_URL = "/"

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": config('GOOGLE_CLIENT_ID'),
            "secret": config('GOOGLE_CLIENT_SECRET'),
            "key": "",
        },
        "SCOPE": [
            "profile", 
            "email",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events"
        ],
        "AUTH_PARAMS": {
            "access_type": "offline",  # Changed to offline to get refresh tokens
        },
    }
}

# Base URL for OAuth callbacks
CALLBACK_URL_BASE = "http://localhost:8000"

# Custom OAuth callbacks
SOCIALACCOUNT_ADAPTER = "backend.adapters.CustomSocialAccountAdapter"

REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_COOKIE": "plek-access",
    "JWT_AUTH_REFRESH_COOKIE": "plek-refresh",
    "JWT_AUTH_HTTPONLY": True,
    "JWT_AUTH_SAMESITE": "Lax",
    "JWT_AUTH_SECURE": False,  # Set to True in production with HTTPS
    "JWT_AUTH_COOKIE_USE_CSRF": True,
    "REGISTER_SERIALIZER": "accounts.serializers.RegisterSerializer",
    "LOGIN_SERIALIZER": "accounts.serializers.LoginSerializer",
    "TOKEN_MODEL": None,
    "SESSION_LOGIN": False,
}

WSGI_APPLICATION = "backend.wsgi.application"

# SMTP Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply.plek@gmail.com')


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

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


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = "static/"

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

from pymongo import MongoClient

# MongoDB Connection
MONGO_URI = "mongodb://192.168.47.37:27017/"
mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client["plek_db"]  # Database name

SESSION_COOKIE_SAMESITE = "Lax"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": "plek.log",
        },
    },
    "loggers": {
        "": {
            "handlers": ["file"],
            "level": "INFO",
            "propagate": True,
        },
    },
}

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Configure password reset
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour expiry for password reset links
FRONTEND_URL = 'http://localhost:3000'  # Used for password reset email links

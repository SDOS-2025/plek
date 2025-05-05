# plek/urls.py
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework_simplejwt.views import TokenBlacklistView
from .views import GoogleLogin


@ensure_csrf_cookie
def get_csrf_token(request):
    """View that sets and returns a CSRF cookie for frontend authentication."""
    return JsonResponse({"detail": "CSRF cookie set"})


urlpatterns = [
    # Admin and authentication
    path("admin/", admin.site.urls),
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/register/", include("dj_rest_auth.registration.urls")),
    path("api/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("api/auth/csrf/", get_csrf_token, name="csrf_token"),
    path("api/auth/google/", GoogleLogin.as_view(), name="google_login"),
    # Social auth
    path("accounts/", include("allauth.urls")),
    # API endpoints
    path("api/accounts/", include("accounts.urls")),
    path("api/analytics/", include("analytics.urls")),
    # Settings app - include both at /settings and /api/settings for backward compatibility
    path("settings/", include("settings.urls")),
    path("api/settings/", include("settings.urls")),
    # Main app functionality
    path("", include("rooms.urls")),
    path("", include("bookings.urls")),
    # Chatbot functionality
    path("chatbot/", include("chatbot.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

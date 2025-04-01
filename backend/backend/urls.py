# plek/urls.py
from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.urls import include, path
from django.views.generic import TemplateView
from django.views.generic.base import RedirectView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("account.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("rooms/", include("room.urls")),
    path("bookings/", include("bookings.urls")),
]

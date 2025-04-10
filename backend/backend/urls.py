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

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/register/", include("dj_rest_auth.registration.urls")),
    path("accounts/", include("allauth.urls")),
    path("", include("rooms.urls")),
]

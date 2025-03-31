# plek/urls.py
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)
from django.http import HttpResponseRedirect, JsonResponse
from django.views.generic import TemplateView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from django.views.generic.base import RedirectView
from django.http import HttpResponse
from django.conf import settings

def welcome(request):
    return HttpResponse("Welcome to Plek Room Booking API")

@api_view(['GET'])
def api_root(request):
    return Response({
        'auth': reverse('token_obtain_pair', request=request),
        'rooms': reverse('room-list', request=request),
        'bookings': reverse('booking-list', request=request),
    })

urlpatterns = [
    path('', welcome, name='welcome'),
    path("admin/", admin.site.urls),
    path("api/auth/", include("account.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path('rooms/', include('room.urls')),
    path('bookings/', include('bookings.urls')),
]

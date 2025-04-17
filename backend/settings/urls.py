from django.urls import path

from .views import InstitutePolicyView

urlpatterns = [
    path("policies/", InstitutePolicyView.as_view(), name="institute-policy"),
]

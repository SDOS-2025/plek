from django.urls import path

from .views import InstitutePolicyView, PublicInstitutePolicyView

urlpatterns = [
    path("policies/", InstitutePolicyView.as_view(), name="institute-policy"),
    path("policies/public/", PublicInstitutePolicyView.as_view(), name="public-institute-policy"),
    # Add the URL that matches the frontend request
    path("public-policies/", PublicInstitutePolicyView.as_view(), name="public-institute-policies"),
    # Add new URL pattern to match the frontend request
    path("institute-policies/", InstitutePolicyView.as_view(), name="institute-policies"),
]

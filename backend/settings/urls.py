from django.urls import path
from .views import InstitutePolicyView

urlpatterns = [
    path('policy/', InstitutePolicyView.as_view(), name='institute-policy'),
]
from django.urls import path
from .views import ChatbotView

urlpatterns = [
    path('', ChatbotView.as_view(), name='chatbot'),
]
from django.urls import path
from .views import AuditLogView

urlpatterns = [
    path('logs/', AuditLogView.as_view(), name='audit-logs'),
]

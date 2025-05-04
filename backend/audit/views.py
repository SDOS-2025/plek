from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from django.db.models import Q
from .models import AuditLog, SystemLog
from .serializers import AuditLogSerializer, SystemLogSerializer

class AuditLogView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Get query parameters
        action = request.query_params.get('action')
        model = request.query_params.get('model')
        user_id = request.query_params.get('user_id')
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        
        # Start with all logs
        logs = AuditLog.objects.all()
        
        # Apply filters
        if action:
            logs = logs.filter(action=action.upper())
        if model:
            logs = logs.filter(content_type__model=model.lower())
        if user_id:
            logs = logs.filter(user_id=user_id)
        if date_from:
            logs = logs.filter(timestamp__gte=date_from)
        if date_to:
            logs = logs.filter(timestamp__lte=date_to)
            
        # Order by most recent first
        logs = logs.order_by('-timestamp')
        
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)

from rest_framework import serializers
from .models import AuditLog, SystemLog

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    content_type_name = serializers.CharField(source='content_type.model', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'timestamp', 'user_email', 'action',
            'content_type_name', 'object_id', 'object_repr',
            'changes', 'ip_address'
        ]

class SystemLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemLog
        fields = ['id', 'timestamp', 'event_type', 'description', 'status', 'metadata']

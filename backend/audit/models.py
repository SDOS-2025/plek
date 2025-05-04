from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

User = get_user_model()

class AuditLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='audit_logs')
    action = models.CharField(max_length=32, db_index=True)  # CREATE, UPDATE, DELETE
    
    # Object info using generic foreign key
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Details about the change
    object_repr = models.CharField(max_length=200)  # String representation of the object
    changes = models.JSONField(default=dict)  # Store field changes
    
    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, null=True, blank=True)
    endpoint = models.CharField(max_length=512, null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'action']),
            models.Index(fields=['content_type', 'object_id']),
        ]

    def __str__(self):
        return f"[{self.action}] {self.object_repr} by {self.user} at {self.timestamp}"

class SystemLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    event_type = models.CharField(max_length=50, db_index=True)
    description = models.TextField()
    status = models.CharField(max_length=20)  # SUCCESS, FAILURE, WARNING
    metadata = models.JSONField(default=dict)
    
    class Meta:
        ordering = ['-timestamp']

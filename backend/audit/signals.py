from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from bookings.models import Booking
from rooms.models import Room, Building, Amenity, Department, Floor
from accounts.models import CustomUser
from settings.models import InstitutePolicy
from .models import AuditLog
from .utils import get_request

WATCHED_MODELS = [Booking, Room, Building, Amenity, Department, Floor, InstitutePolicy]

@receiver([post_save], dispatch_uid="audit_model_save")
def log_save(sender, instance, created, **kwargs):
    """Log creation and modification of watched models"""
    if sender not in WATCHED_MODELS:
        return

    request = get_request()
    action = 'CREATE' if created else 'UPDATE'
    
    # Create audit log entry
    AuditLog.objects.create(
        user=request.user if request else None,
        action=action,
        content_type=ContentType.objects.get_for_model(instance),
        object_id=instance.id,
        object_repr=str(instance),
        changes={
            'is_new': created,
            'changed_fields': [f.name for f in instance._meta.fields if hasattr(instance, f'_original_{f.name}')]
        },
        ip_address=request.META.get('REMOTE_ADDR') if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT') if request else None,
        endpoint=request.path if request else None
    )

@receiver([post_delete], dispatch_uid="audit_model_delete")
def log_delete(sender, instance, **kwargs):
    """Log deletion of watched models"""
    if sender not in WATCHED_MODELS:
        return

    request = get_request()
    
    AuditLog.objects.create(
        user=request.user if request else None,
        action='DELETE',
        content_type=ContentType.objects.get_for_model(instance),
        object_id=instance.id,
        object_repr=str(instance),
        changes={'deleted': True},
        ip_address=request.META.get('REMOTE_ADDR') if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT') if request else None,
        endpoint=request.path if request else None
    )

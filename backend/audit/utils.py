import threading
from typing import Dict, Any, Optional
from django.http import HttpRequest

# Thread-local storage for the request object
_thread_locals = threading.local()

def set_current_request(request: HttpRequest) -> None:
    """Store the request in thread-local storage."""
    _thread_locals.request = request

def get_request() -> Optional[HttpRequest]:
    """Retrieve the request from thread-local storage."""
    return getattr(_thread_locals, 'request', None)

def get_changes_dict(instance: Any) -> Dict[str, Any]:
    """
    Get a dictionary of changes made to a model instance.
    For created objects, includes all fields.
    For updated objects, includes only changed fields.
    """
    if not instance._state.adding:  # If this is an update
        if hasattr(instance, 'get_dirty_fields'):
            # If django-dirtyfields is installed
            return instance.get_dirty_fields()
        else:
            # Basic change detection
            changed = {}
            for field in instance._meta.fields:
                if field.name not in ['created_at', 'updated_at']:
                    value = getattr(instance, field.name)
                    if hasattr(instance, f'_original_{field.name}'):
                        original = getattr(instance, f'_original_{field.name}')
                        if original != value:
                            changed[field.name] = {
                                'old': original,
                                'new': value
                            }
            return changed
    else:  # If this is a creation
        return {
            field.name: getattr(instance, field.name)
            for field in instance._meta.fields
            if field.name not in ['id', 'created_at', 'updated_at']
        }

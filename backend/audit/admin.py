from django.contrib import admin
from .models import AuditLog, SystemLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'object_repr', 'content_type')
    list_filter = ('action', 'content_type', 'timestamp')
    search_fields = ('object_repr', 'user__email', 'changes')
    readonly_fields = ('timestamp', 'user', 'action', 'content_type', 'object_id', 
                      'object_repr', 'changes', 'ip_address', 'user_agent', 'endpoint')
    date_hierarchy = 'timestamp'
    ordering = ('-timestamp',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'event_type', 'status', 'description')
    list_filter = ('event_type', 'status', 'timestamp')
    search_fields = ('description', 'event_type')
    readonly_fields = ('timestamp', 'event_type', 'description', 'status', 'metadata')
    date_hierarchy = 'timestamp'
    ordering = ('-timestamp',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

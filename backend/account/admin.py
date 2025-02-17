from django.contrib import admin

# Register your models here.

from .models import Account

class AccountAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'password')

admin.site.register(Account, AccountAdmin)

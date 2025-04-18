"""
Admin configuration for the rooms module.
"""

from django.contrib import admin

from .models import Amenity, Building, Room

admin.site.register(Room)
admin.site.register(Building)
admin.site.register(Amenity)

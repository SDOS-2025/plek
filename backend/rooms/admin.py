# room/models.py
from django.contrib import admin
from .models import Room, Building, Amenity

admin.site.register(Room)
admin.site.register(Building)
admin.site.register(Amenity)


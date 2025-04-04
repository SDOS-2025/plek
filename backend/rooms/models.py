from django.db import models
from django.utils import timezone

# Create your models here.

class Room(models.Model):
    name = models.CharField(max_length=100, unique=True, default="Unnamed Room")
    description = models.TextField(default="No description provided")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    capacity = models.IntegerField(default=10)
    is_available = models.BooleanField(default=True)
    building = models.CharField(max_length=100, default="Lecture Hall Complex")
    amenities = models.JSONField(default=dict)  # Store amenities as a JSON object
    department = models.CharField(max_length=100, blank=True, null=True)
    # image = models.ImageField(upload_to='room_images/', blank=True, null=True)

    def __str__(self):
        return self.name

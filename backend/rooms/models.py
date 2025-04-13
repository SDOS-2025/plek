from django.db import models
from django.utils import timezone

# Create your models here.


class Room(models.Model):
    name = models.CharField(max_length=100, unique=True, default="Unnamed Room")
    description = models.TextField(default="No description provided")
    # Find this info in monogoDB logs instead
    # created_at = models.DateTimeField(auto_now_add=True)
    # updated_at = models.DateTimeField(auto_now=True)
    capacity = models.IntegerField(default=50)
    available = models.BooleanField(default=True)
    building = models.ForeignKey('Building', on_delete=models.CASCADE, related_name='rooms', null=True, blank=True)
    amenities = models.ManyToManyField('Amenity', related_name='rooms', blank=True)
    floor = models.IntegerField(default=1)
    # created_at = models.DateTimeField(auto_now_add=True)
    # updated_at = models.DateTimeField(auto_now=True)
    # image = models.ImageField(upload_to='room_images/', blank=True, null=True)

    def __str__(self):
        return self.name
    
class Building(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(default="No description provided")
    # image = models.ImageField(upload_to='building_images/', blank=True, null=True)
    # created_at = models.DateTimeField(auto_now_add=True)
    # updated_at = models.DateTimeField(auto_now=True)
    
class Amenity(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(default="No description provided")

    def __str__(self):
        return self.name

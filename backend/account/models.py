# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    # Additional fields
    dob = models.DateField(null=True, blank=True)
    USER_CATEGORY_CHOICES = [
        ('student', 'Student'),
        ('coordinator', 'Coordinator'),
        ('admin', 'Admin'),
        ('super_admin', 'Super Admin'),
    ]
    user_category = models.CharField(max_length=20, choices=USER_CATEGORY_CHOICES, default='student')
    INTERNAL_EXTERNAL_CHOICES = [
        ('internal', 'Internal'),
        ('external', 'External'),
    ]
    internal_or_external = models.CharField(max_length=10, choices=INTERNAL_EXTERNAL_CHOICES, default='internal')

    def __str__(self):
        return self.username
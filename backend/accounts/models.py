# accounts/models.py
from django.contrib.auth.models import (AbstractBaseUser, BaseUserManager,
                                        Group, Permission, PermissionsMixin)
from django.db import models
from django.db.models.signals import post_migrate
from django.dispatch import receiver


class Department(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise TypeError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_faculty = models.BooleanField(default=False)

    USER_CATEGORY_CHOICES = [
        ("student", "Student"),
        ("coordinator", "Coordinator"),
        ("admin", "Admin"),
        ("super_admin", "Super Admin"),
    ]

    user_category = models.CharField(
        max_length=20, choices=USER_CATEGORY_CHOICES, default="student"
    )

    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, null=True, blank=True
    )

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    def __str__(self):
        return self.email

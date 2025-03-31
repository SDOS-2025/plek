# account/models.py
from django.contrib.auth.models import (AbstractUser, BaseUserManager,
                                        PermissionsMixin)
from django.db import models
from django.contrib.auth.models import Group, Permission
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


class CustomUser(AbstractUser):
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
        return self.username

@receiver(post_migrate)
def create_roles(sender, **kwargs):
    if sender.name == 'accounts':  # Ensures it only runs for the accounts app
        student_group, _ = Group.objects.get_or_create(name="Student")
        coordinator_group, _ = Group.objects.get_or_create(name="Coordinator")
        admin_group, _ = Group.objects.get_or_create(name="Admin")

        # Define permissions
        student_permissions = [
            "view_room", "view_booking", "add_booking"
        ]
        coordinator_permissions = [
            "view_room", "view_booking", "add_booking", "change_booking", "delete_booking"
        ]
        admin_permissions = [
            "view_room", "add_room", "change_room", "delete_room",
            "view_booking", "add_booking", "change_booking", "delete_booking"
        ]

        # Assign permissions
        for perm in student_permissions:
            permission = Permission.objects.get(codename=perm)
            student_group.permissions.add(permission)

        for perm in coordinator_permissions:
            permission = Permission.objects.get(codename=perm)
            coordinator_group.permissions.add(permission)

        for perm in admin_permissions:
            permission = Permission.objects.get(codename=perm)
            admin_group.permissions.add(permission)
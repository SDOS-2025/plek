# accounts/models.py
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
    Group,
)
from django.db import models


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
        user = self.create_user(email, password, **extra_fields)
        user.groups.add(Group.objects.get(name="SuperAdmin"))
        return user


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    managed_buildings = models.ManyToManyField("rooms.Building", blank=True, related_name="managers")
    managed_floors = models.ManyToManyField("rooms.Floor", blank=True)
    managed_departments = models.ManyToManyField("rooms.Department", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        permissions = [
            ("view_all_users", "Can view all users"),
            ("moderate_user", "Can moderate users"),
            ("promote_to_coordinator", "Can promote to Coordinator"),
            ("promote_to_admin", "Can promote to Admin"),
            ("promote_to_super_admin", "Can promote to SuperAdmin"),
            ("demote_to_user", "Can demote to User"),
            ("demote_to_coordinator", "Can demote to Coordinator"),
            ("demote_to_admin", "Can demote to Admin"),
        ]

    def __str__(self):
        return self.email

    def can_manage_room(self, room):
        if self.groups.filter(name__in=["Admin", "SuperAdmin"]).exists():
            return True
        if self.groups.filter(name="Coordinator").exists():
            # Check if user manages the room's floor, building, or department
            return (
                room.floor in self.managed_floors.all() or 
                room.building in self.managed_buildings.all() or
                any(dept in self.managed_departments.all() for dept in room.departments.all())
            )
        return False

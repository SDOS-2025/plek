from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    code = models.CharField(max_length=20, blank=True, help_text="Department code (e.g., CS, EE)")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Floor(models.Model):
    number = models.IntegerField(help_text="Floor number (e.g., 1, 2, 3, or -1 for basement)")
    name = models.CharField(
        max_length=50,
        blank=True,
        help_text="Optional display name (e.g., 'Mezzanine', 'Ground Floor')",
    )
    building = models.ForeignKey("Building", on_delete=models.CASCADE, related_name="floors")

    class Meta:
        unique_together = ("building", "number")
        ordering = ["number"]  # Sort floors by number by default

    def __str__(self):
        if self.name:
            return f"{self.building.name} - Floor {self.number} ({self.name})"
        else:
            return f"{self.building.name} - Floor {self.number}"


class Building(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)

    class Meta:
        permissions = [
            ("manage_buildings", "Can manage buildings (add/delete)"),
        ]

    def __str__(self):
        return self.name


class Amenity(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        permissions = [
            ("manage_amenities", "Can manage amenities (add/delete)"),
        ]

    def __str__(self):
        return self.name


class Room(models.Model):
    name = models.CharField(max_length=100, unique=True, default="Unnamed Room")
    capacity = models.IntegerField(default=50)
    available = models.BooleanField(default=True)
    building = models.ForeignKey(
        Building, on_delete=models.CASCADE, related_name="rooms", null=True, blank=True
    )
    amenities = models.ManyToManyField(Amenity, related_name="rooms", blank=True)
    floor = models.ForeignKey(
        Floor, on_delete=models.CASCADE, related_name="rooms", null=True, blank=True
    )
    departments = models.ManyToManyField(
        "Department",
        related_name="rooms",
        blank=True,
        help_text="Departments that have access to this room",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        permissions = [
            ("view_rooms", "Can view all rooms"),
            ("manage_rooms", "Can manage rooms (add/modify/delete)"),
        ]
        indexes = [
            models.Index(fields=["building", "floor"]),
            models.Index(fields=["available"]),
        ]

    def __str__(self):
        return self.name

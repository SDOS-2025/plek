from django.conf import settings
from django.db import models
from rooms.models import Room

# Create your models here.


class Booking(models.Model):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (APPROVED, "Approved"),
        (REJECTED, "Rejected"),
        (CANCELLED, "Cancelled"),
    ]

    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_bookings",
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    purpose = models.TextField(blank=True)
    participants = models.TextField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)

    class Meta:
        permissions = [
            ("can_view_booking", "Can view booking details"),
            ("can_create_booking", "Can create bookings"),
            ("can_approve_booking", "Can approve bookings"),
            ("can_reject_booking", "Can reject bookings"),
            ("can_cancel_booking", "Can cancel bookings"),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.room.name} - {self.start_time}"


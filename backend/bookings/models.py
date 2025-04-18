from django.db import models

from accounts.models import CustomUser
from rooms.models import Room

# Create your models here.


class Booking(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="bookings")
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="bookings")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (APPROVED, "Approved"),
        (REJECTED, "Rejected"),
        (CANCELLED, "Cancelled"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    approved_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_bookings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    purpose = models.TextField(blank=True)
    participants = models.TextField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)

    class Meta:
        permissions = [
            ("view_own_booking", "Can view own bookings"),
            ("create_booking", "Can create bookings"),
            ("modify_own_booking", "Can modify own bookings"),
            ("cancel_own_booking", "Can cancel own bookings"),
            ("view_all_bookings", "Can view all bookings"),
            ("view_floor_dept_bookings", "Can view bookings for floor or department"),
            ("approve_booking", "Can approve bookings"),
            ("reject_booking", "Can reject bookings"),
            ("override_booking", "Can override bookings"),
        ]
        indexes = [
            models.Index(fields=["room", "start_time", "end_time"]),
            models.Index(fields=["user"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Booking {self.id} for {self.room.name} by {self.user.email}"


class CalendarEvent(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="calendar_event")
    calendar_id = models.CharField(max_length=255)
    event_id = models.CharField(max_length=255)
    html_link = models.URLField(max_length=500, null=True, blank=True)
    synced_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Calendar event for booking {self.booking.id}"

from django.db import models

# Create your models here.

class InstitutePolicy(models.Model):
    name = models.CharField(max_length=100, default="Institute Policy")
    description = models.TextField(default="No description provided")
    is_active = models.BooleanField(default=True)
    booking_opening_days = models.PositiveIntegerField(default=30)
    max_booking_duration_hours = models.PositiveIntegerField(default=4)
    min_gap_between_bookings_minutes = models.PositiveIntegerField(default=15)
    working_hours_start = models.TimeField(default="08:00")
    working_hours_end = models.TimeField(default="19:00")
    allow_backdated_bookings = models.BooleanField(default=False)
    enable_auto_approval = models.BooleanField(default=False)
    approval_window_hours = models.PositiveIntegerField(default=48)

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce singleton
        super().save(*args, **kwargs)

    def __str__(self):
        return "Institute Policy"

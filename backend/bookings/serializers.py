from django.utils import timezone
from rest_framework import serializers
from .models import Booking
'''
STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
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
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    purpose = models.TextField(blank=True)
    participants = models.TextField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)
'''

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = [
            "id",
            "room",
            "user",
            "approved_by",
            "start_time",
            "end_time",
            "status",
            "purpose",
            "participants",
            "cancellation_reason",
        ]

    def validate(self, data):
        """
        Validate the booking data.
        """
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time."}
            )
        if data["start_time"] < timezone.now() or data["end_time"] < timezone.now():
            raise serializers.ValidationError(
                {"start_time": "Booking times must be in the future.",
                "end_time": "Booking times must be in the future."}
            )
        if data["room"].available == False:
            raise serializers.ValidationError(
                {"room": "Room is not available for booking."}
            )
        # if data["participants"] and data["room"].capacity < len(data["participants"].split(",")):
        #     raise serializers.ValidationError(
        #         {"participants": "Number of participants exceeds room capacity."}
        #     )
        
        return data

    def create(self, validated_data):
        """
        Create a new booking instance with the provided validated data.
        """
        return Booking.objects.create(**validated_data)
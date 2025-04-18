import pytz
from django.utils.timezone import now
from rest_framework import serializers

from rooms.models import Room

from .models import Booking

class BookingSerializer(serializers.ModelSerializer):
    room = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all())
    user_email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    approved_by_email = serializers.EmailField(
        source="approved_by.email",
        read_only=True,
    )

    class Meta:
        model = Booking
        fields = [
            "id",
            "room",
            "user",
            "user_email",
            "approved_by",
            "approved_by_email",
            "start_time",
            "end_time",
            "status",
            "purpose",
            "participants",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "approved_by",
            "status",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        """
        Validate the booking data.
        """
        kolkata_tz = pytz.timezone("Asia/Kolkata")
        current_time = now().astimezone(kolkata_tz)
        print(f"start_time: {data['start_time']}")
        print(f"end_time: {data['end_time']}")
        print(f"now: {current_time}")

        # Basic time validation
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        if data["start_time"] < current_time:
            raise serializers.ValidationError({"start_time": "Cannot book in the past."})

        # Get the current user from the request context
        request = self.context.get("request")
        current_user = request.user if request else None
        
        # For PATCH requests, if room is not provided, use the existing instance's room
        if self.instance and 'room' not in data:
            room = self.instance.room
        else:
            room = data.get('room')
            
            # If room is still None (which shouldn't happen for POST), raise an error
            if room is None and self.instance is None:
                raise serializers.ValidationError({"room": "Room is required for booking creation."})

        # Check for APPROVED bookings (blocks everyone)
        approved_conflicts = Booking.objects.filter(
            room=room,
            status=Booking.APPROVED,
            start_time__lt=data["end_time"],
            end_time__gt=data["start_time"],
        )

        # If we're updating an existing booking, exclude the current booking
        if self.instance:
            approved_conflicts = approved_conflicts.exclude(id=self.instance.id)

        if approved_conflicts.exists():
            raise serializers.ValidationError(
                {"room": "This room is already booked during this time."}
            )

        # Check for the user's own PENDING bookings (prevents duplicate requests)
        if current_user:
            user_pending_conflicts = Booking.objects.filter(
                room=room,
                user=current_user,
                status=Booking.PENDING,
                start_time__lt=data["end_time"],
                end_time__gt=data["start_time"],
            )

            if self.instance:
                user_pending_conflicts = user_pending_conflicts.exclude(id=self.instance.id)

            if user_pending_conflicts.exists():
                raise serializers.ValidationError(
                    {
                        "room": "You already have a pending booking request for this room during this time."
                    }
                )

        return data


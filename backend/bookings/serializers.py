import pytz
from django.utils.timezone import localtime, now
from rest_framework import serializers
from rooms.models import Room

from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    # Use nested serializer representation to avoid circular imports
    room = serializers.SerializerMethodField(read_only=True)
    
    # Add a serializer method field to get the display value for status
    status_display = serializers.SerializerMethodField(read_only=True)

    room_id = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.all(),
        source="room",
        write_only=True,
        required=True,  # Make room_id required for POST requests
    )

    class Meta:
        model = Booking
        fields = [
            "id",
            "room",
            "room_id",
            "user",
            "approved_by",
            "start_time",
            "end_time",
            "status",
            "status_display",
            "purpose",
            "participants",
            "cancellation_reason",
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
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time."}
            )
        if data["start_time"] < current_time or data["end_time"] < current_time:
            raise serializers.ValidationError(
                {
                    "start_time": "Booking times must be in the future.",
                    "end_time": "Booking times must be in the future.",
                }
            )
        if "room" in data and data["room"].available == False:
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

    def to_representation(self, instance):
        # Get the default representation
        representation = super().to_representation(instance)

        # If this is a POST/PUT request with a room_id, remove the empty room object
        if "room" in representation and not representation["room"]:
            representation.pop("room")

        # Replace status with status_display and remove status_display field
        if "status_display" in representation:
            representation["status"] = representation["status_display"]
            representation.pop("status_display")

        return representation

    def get_room(self, obj):
        """
        Get room details without creating a circular import
        """
        from rooms.serializers import RoomSerializer

        if obj.room:
            return RoomSerializer(obj.room, context=self.context).data
        return None
        
    def get_status_display(self, obj):
        """
        Get the display value for the status field.
        """
        return obj.get_status_display()


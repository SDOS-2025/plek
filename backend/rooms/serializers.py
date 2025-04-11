from rest_framework import serializers

from .models import Room

"""
    name = models.CharField(max_length=100, unique=True, default="Unnamed Room")
    description = models.TextField(default="No description provided")
    capacity = models.IntegerField(default=50)
    available = models.BooleanField(default=True)
    building = models.CharField(max_length=100, default="Lecture Hall Complex")
    amenities = models.JSONField(default=dict)  # Store amenities as a JSON object

"""


class RoomSerializer(serializers.ModelSerializer):
    # Use a nested serializer defined with just the model name to avoid circular imports
    bookings = serializers.SerializerMethodField(required=False, read_only=True)
    
    class Meta:
        model = Room
        fields = [
            "id",
            "name",
            "description",
            "capacity",
            "available",
            "building",
            "amenities",
            "bookings",
        ]

    def validate(self, data):
        """
        Validate the data before creating or updating a room instance.
        """
        if "capacity" in data and data["capacity"] <= 0:
            raise serializers.ValidationError(
                {"capacity": "Capacity must be a positive integer."}
            )
        if "name" in data and not data["name"].strip():
            raise serializers.ValidationError({"name": "Name cannot be empty."})
        return data

    def create(self, validated_data):
        """
        Create a new room instance with the provided validated data.
        """
        return Room.objects.create(**validated_data)

    def get_bookings(self, obj):
        """
        Get the bookings associated with the room instance.
        """
        # Only import BookingSerializer here to avoid circular import
        from bookings.serializers import BookingSerializer
        
        request = self.context.get('request')
        if request:
            date = request.query_params.get("date")
            if date:
                # Use start_time__date instead of date__gte
                booking = obj.booking_set.filter(start_time__date=date)
            else:
                booking = obj.booking_set.all()
            return BookingSerializer(booking, many=True).data
        return []

from rest_framework import serializers
from .models import Room, Building, Amenity  # Import models directly
from bookings.serializers import BookingSerializer  # Import only what's needed

"""
    name = models.CharField(max_length=100, unique=True, default="Unnamed Room")
    description = models.TextField(default="No description provided")
    capacity = models.IntegerField(default=50)
    available = models.BooleanField(default=True)
    building = models.CharField(max_length=100, default="Lecture Hall Complex")
    amenities = models.JSONField(default=dict)  # Store amenities as a JSON object
"""


class RoomSerializer(serializers.ModelSerializer):
    bookings = serializers.SerializerMethodField(required=False, read_only=True)
    amenities = serializers.PrimaryKeyRelatedField(queryset=Amenity.objects.all(), many=True)
    building = serializers.PrimaryKeyRelatedField(queryset=Building.objects.all())

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
        if 'name' not in data or not data['name']:
            raise serializers.ValidationError({'name': 'Name is required.'})
        if 'capacity' not in data or data['capacity'] <= 0:
            raise serializers.ValidationError({'capacity': 'Capacity must be a positive integer.'})
        return data

    def create(self, validated_data):
        """
        Create a new room instance with the provided validated data.
        """
        amenities = validated_data.pop('amenities')
        room = Room.objects.create(**validated_data)
        room.amenities.set(amenities)
        return room

    def update(self, instance, validated_data):
        amenities = validated_data.pop('amenities', None)
        instance = super().update(instance, validated_data)
        if amenities is not None:
            instance.amenities.set(amenities)
        return instance

    def get_bookings(self, obj):
        """
        Get the bookings associated with the room instance.
        """
        request = self.context.get("request")
        if request:
            date = request.query_params.get("date")
            if date:
                booking = obj.booking_set.filter(start_time__date=date)
            else:
                booking = obj.booking_set.all()
            return BookingSerializer(booking, many=True).data
        return []
    
    def get_amenities(self, obj):
        """
        Get the amenities associated with the room instance.
        """
        return obj.amenities.values_list('id', flat=True)


class BuildingSerializer(serializers.ModelSerializer):
    """
    Serializer for the Building model.
    """

    class Meta:
        model = Building  # Correctly reference the Building model
        fields = ["id", "name", "description"]
        
    def validate(self, attrs):
        return super().validate(attrs)
    
    def create(self, validated_data):
        """
        Create a new building instance with the provided validated data.
        """
        return Building.objects.create(**validated_data)
    
    def get_rooms(self, obj):
        """
        Get the rooms associated with the building instance.
        """
        request = self.context.get("request")
        if request:
            date = request.query_params.get("date")
            if date:
                rooms = Room.objects.filter(building=obj.name, booking__start_time__date=date)
            else:
                rooms = Room.objects.filter(building=obj.name)
            return RoomSerializer(rooms, many=True).data
        return []
    
class AmenitySerializer(serializers.ModelSerializer):
    """
    Serializer for the Amenity model.
    """

    class Meta:
        model = Amenity  # Correctly reference the Amenity model
        fields = ["id", "name", "description"]
        
    def validate(self, attrs):
        return super().validate(attrs)
    
    def create(self, validated_data):
        """
        Create a new amenity instance with the provided validated data.
        """
        return Amenity.objects.create(**validated_data)
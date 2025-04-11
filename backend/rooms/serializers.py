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

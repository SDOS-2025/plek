from rest_framework import serializers

from .models import Amenity, Building, Department, Floor, Room


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "description", "code", "is_active"]


class FloorSerializer(serializers.ModelSerializer):
    building_name = serializers.SerializerMethodField()
    rooms_count = serializers.SerializerMethodField()
    
    def get_building_name(self, obj):
        return obj.building.name if obj.building else None
        
    def get_rooms_count(self, obj):
        return obj.rooms.count()
    
    class Meta:
        model = Floor
        fields = ["id", "number", "name", "building", "building_name", "rooms_count"]


class BuildingSerializer(serializers.ModelSerializer):
    floors = FloorSerializer(many=True, read_only=True)
    
    class Meta:
        model = Building
        fields = ["id", "name", "description", "location", "floors"]


class AmenitySerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = Amenity
        fields = ["id", "name", "description", "image"]


class RoomSerializer(serializers.ModelSerializer):
    floor = serializers.PrimaryKeyRelatedField(queryset=Floor.objects.all())
    departments = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Department.objects.all(), required=False
    )
    amenities = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Amenity.objects.all(), required=False
    )
    building = serializers.PrimaryKeyRelatedField(queryset=Building.objects.all())
    amenity_names = serializers.SerializerMethodField()
    building_name = serializers.SerializerMethodField()
    floor_info = serializers.SerializerMethodField()

    def get_amenity_names(self, obj):
        return [amenity.name.lower() for amenity in obj.amenities.all()]

    def get_building_name(self, obj):
        return obj.building.name if obj.building else None
        
    def get_floor_info(self, obj):
        if not obj.floor:
            return None
        return {
            "id": obj.floor.id,
            "number": obj.floor.number,
            "name": obj.floor.name
        }

    class Meta:
        model = Room
        fields = [
            "id",
            "name",
            "capacity",
            "floor",
            "floor_info",
            "departments",
            "building",
            "building_name",
            "amenities",
            "amenity_names",
            "available",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "floor_info"]

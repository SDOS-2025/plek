from rest_framework import serializers

class CountStatSerializer(serializers.Serializer):
    label = serializers.CharField()
    value = serializers.IntegerField()

class TimeSeriesStatSerializer(serializers.Serializer):
    date = serializers.DateField()
    total_bookings = serializers.IntegerField()

class RoomUsageStatSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField()
    building = serializers.CharField()
    amenities = serializers.JSONField()
    count = serializers.IntegerField(required=False)
    usage_hours = serializers.FloatField(required=False)

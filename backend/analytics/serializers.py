from rest_framework import serializers


class CountStatSerializer(serializers.Serializer):
    label = serializers.CharField()
    value = serializers.IntegerField()


class TimeSeriesStatSerializer(serializers.Serializer):
    date = serializers.DateField()
    total_bookings = serializers.IntegerField()


class RoomUsageStatSerializer(serializers.Serializer):
    name = serializers.CharField()
    building = serializers.CharField()
    building_name = serializers.CharField(required=False)
    amenities = serializers.JSONField()
    capacity = serializers.IntegerField(required=False)
    count = serializers.IntegerField(required=False)
    usage_hours = serializers.FloatField(required=False)
    total_attendees = serializers.IntegerField(required=False)
    booking_count = serializers.IntegerField(required=False)
    avg_attendees = serializers.FloatField(required=False)

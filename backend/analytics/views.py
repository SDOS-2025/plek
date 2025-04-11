from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Count, Sum, F, Q, ExpressionWrapper, DurationField
from django.utils.timezone import now
from django.db.models.functions import TruncDate
from rooms.models import Room
from bookings.models import Booking
from .serializers import CountStatSerializer, TimeSeriesStatSerializer, RoomUsageStatSerializer
from rest_framework import status


class BookingStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        stat_type = request.query_params.get("stat_type", None)
        
        if stat_type == "totals":
            stats = (
                Booking.objects
                .annotate(date=TruncDate("start_time"))
                .values('date')
                .annotate(total_bookings=Count('id'))
                .order_by('date')
            )
            serializer = TimeSeriesStatSerializer(stats, many=True)
            return Response(serializer.data)
        
        elif stat_type == "peak_hours":
            stats = (
                Booking.objects
                .annotate(hour=F('start_time__hour'))
                .values('hour')
                .annotate(count=Count('id'))
                .order_by('-count')[:5]
            )
            
            data = [
                {
                    'label': f"{int(stat['hour'])}:00",
                    "value": stat['count']
                }
                for stat in stats
            ]
            
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)
        
        elif stat_type == "status":
            stats = (
                Booking.objects
                .values('status')
                .annotate(count=Count('id'))
            )
            data = [
                {
                    'status': stat['status'],
                    "count": stat['count']
                }
                for stat in stats
            ]
            return Response(data)
        
        elif stat_type == "top_users":
            stats = (
                Booking.objects
                .values('user__email')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            )
            data = [
                {
                    'label': stat['user__email'],
                    "value": stat['count']
                }
                for stat in stats
            ]
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)
        
        elif stat_type == "pending":
            stats = (
                Booking.objects
                .filter(status="pending")
                .values('room__name')
                .annotate(count=Count('id'))
            )
            data = [
                {
                    'label': stat['room__name'],
                    "value": stat['count']
                }
                for stat in stats
            ]
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)
        
        elif stat_type == "approved":
            stats = (
                Booking.objects
                .filter(status="approved")
                .values('room__name')
                .annotate(count=Count('id'))
            )
            data = [
                {
                    'label': stat['room__name'],
                    "value": stat['count']
                }
                for stat in stats
            ]
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)
        
        elif stat_type == "rejected":
            stats = (
                Booking.objects
                .filter(status="rejected")
                .values('room__name')
                .annotate(count=Count('id'))
            )
            data = [
                {
                    'label': stat['room__name'],
                    "value": stat['count']
                }
                for stat in stats
            ]
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)
        
        elif stat_type == "cancelled":
            stats = (
                Booking.objects
                .filter(status="cancelled")
                .values('room__name')
                .annotate(count=Count('id'))
            )
            data = [
                {
                    'label': stat['room__name'],
                    "value": stat['count']
                }
                for stat in stats
            ]
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)
        
        elif stat_type == "active":
            current_time = now()
            stats = (
                Booking.objects
                .filter(
                    Q(start_time__lte=current_time) & Q(end_time__gte=current_time)
                )
                .values('room__name')
                .annotate(count=Count('id'))
            )
            data = {
                'active_bookings': [
                    {
                        'label': stat['room__name'],
                        "value": stat['count']
                    }
                    for stat in stats
                ]
            }
            return Response(data)

        return Response({"error": "Invalid stat_type"}, status=status.HTTP_400_BAD_REQUEST)
                
class RoomStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        stat_type = request.query_params.get("stat_type", None)
        
        if stat_type == "most_booked":
            stats = (
                Room.objects
                .annotate(count=Count('booking'))
                .order_by('-count')[:5]
            )
            data = [
                {
                    'name': room.name,
                    'description': room.description,
                    'building': room.building,
                    'amenities': room.amenities,
                    'count': room.count
                }
                for room in stats
            ]
            serializer = RoomUsageStatSerializer(data, many=True)
            return Response(serializer.data)
        
        elif stat_type == "least_booked":
            stats = (
                Room.objects
                .annotate(count=Count('booking'))
                .order_by('count')[:5]
            )
            data = [
                {
                    'name': room.name,
                    'description': room.description,
                    'building': room.building,
                    'amenities': room.amenities,
                    'count': room.count
                }
                for room in stats
            ]
            serializer = RoomUsageStatSerializer(data, many=True)
            return Response(serializer.data)
        
        elif stat_type == "utilization":
            stats = (
                Room.objects
                .annotate(
                    usage_hours=ExpressionWrapper(
                        Sum(F('booking__end_time') - F('booking__start_time')),
                        output_field=DurationField()
                    )
                )
                .values('name', 'description', 'building', 'amenities', 'usage_hours')
                .order_by('-usage_hours')
            )
            data = [
                {
                    'name': stat['name'],
                    'description': stat['description'],
                    'building': stat['building'],
                    'amenities': stat['amenities'],
                    'usage_hours': stat['usage_hours'].total_seconds() / 3600 if stat['usage_hours'] else 0
                }
                for stat in stats
            ]
            serializer = RoomUsageStatSerializer(data, many=True)
            return Response(serializer.data)
            
        return Response({"error": "Invalid stat_type"}, status=status.HTTP_400_BAD_REQUEST)
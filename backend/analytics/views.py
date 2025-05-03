from django.db.models import Count, DurationField, ExpressionWrapper, F, Q, Sum, Avg, IntegerField
from django.db.models.functions import TruncDate, Cast, Coalesce
from django.utils.timezone import now, localtime, localdate
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking
from rooms.models import Building, Room

from .serializers import CountStatSerializer, RoomUsageStatSerializer, TimeSeriesStatSerializer


class BookingStatsView(APIView):
    permission_classes = [IsAuthenticated]  # Changed from IsAdminUser to IsAuthenticated

    def get(self, request):
        # Check if the user is a coordinator only (not admin or superadmin)
        user_groups = [group.name.lower() for group in request.user.groups.all()]
        is_coordinator_only = ("coordinator" in user_groups and 
                              "admin" not in user_groups and 
                              "superadmin" not in user_groups and
                              not request.user.is_superuser)
        
        # Get the user's managed resources if they're a coordinator
        managed_floor_ids = []
        managed_dept_ids = []
        if is_coordinator_only:
            managed_floors = request.user.managed_floors.all()
            managed_departments = request.user.managed_departments.all()
            
            managed_floor_ids = list(managed_floors.values_list('id', flat=True)) or []
            managed_dept_ids = list(managed_departments.values_list('id', flat=True)) or []
        
        # Start with base booking queryset
        bookings_queryset = Booking.objects.all()
        
        # Filter by managed resources if user is a coordinator
        if is_coordinator_only:
            if managed_floor_ids:
                # First filter by managed floors
                filtered_bookings = bookings_queryset.filter(room__floor__id__in=managed_floor_ids)
                
                # Then apply department filtering if coordinator has department assignments
                if managed_dept_ids:
                    filtered_bookings = filtered_bookings.filter(
                        Q(room__departments__id__in=managed_dept_ids) | 
                        Q(room__departments__isnull=True)
                    )
                
                bookings_queryset = filtered_bookings
            else:
                # If coordinator only has department assignments but no floors
                if managed_dept_ids:
                    bookings_queryset = bookings_queryset.filter(room__departments__id__in=managed_dept_ids)
                else:
                    # If coordinator has neither floor nor department assignments, show nothing
                    bookings_queryset = Booking.objects.none()
        
        stat_type = request.query_params.get("stat_type", None)

        if stat_type == "dashboard":
            # Get today's date
            today = localdate()
            
            # Count today's bookings - filtered by coordinator permissions if needed
            today_bookings = bookings_queryset.filter(
                start_time__date=today
            ).count()
            
            # Count pending approvals - filtered by coordinator permissions if needed
            pending_approvals = bookings_queryset.filter(
                status="pending"
            ).count()
            
            # Count conflicts (bookings that overlap with others) - filtered by coordinator permissions if needed
            current_bookings = bookings_queryset.filter(
                Q(start_time__date__lte=today) & Q(end_time__date__gte=today)
            )
            
            # Simple conflict detection - rooms with more than one active booking
            conflicts = 0
            room_booking_counts = {}
            for booking in current_bookings:
                room_id = booking.room_id
                if room_id in room_booking_counts:
                    # If we already counted this room, it means there's at least one conflict
                    if room_booking_counts[room_id] == 1:
                        conflicts += 1
                    room_booking_counts[room_id] += 1
                else:
                    room_booking_counts[room_id] = 1
            
            data = {
                "today_bookings": today_bookings,
                "pending_approvals": pending_approvals,
                "conflicts": conflicts
            }
            
            return Response(data)

        elif stat_type == "totals":
            stats = (
                bookings_queryset.annotate(date=TruncDate("start_time"))
                .values("date")
                .annotate(total_bookings=Count("id"))
                .order_by("date")
            )
            serializer = TimeSeriesStatSerializer(stats, many=True)
            return Response(serializer.data)

        elif stat_type == "peak_hours":
            stats = (
                bookings_queryset.annotate(hour=F("start_time__hour"))
                .values("hour")
                .annotate(count=Count("id"))
                .order_by("hour")
            )

            data = [{"label": f"{int(stat['hour'])}:00", "value": stat["count"]} for stat in stats]

            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)

        elif stat_type == "status":
            stats = bookings_queryset.values("status").annotate(count=Count("id"))
            data = [{"status": stat["status"], "count": stat["count"]} for stat in stats]
            return Response(data)

        elif stat_type == "top_users":
            stats = (
                bookings_queryset.values("user__email")
                .annotate(count=Count("id"))
                .order_by("-count")[:10]
            )
            data = [{"label": stat["user__email"], "value": stat["count"]} for stat in stats]
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)

        elif stat_type == "pending":
            stats = (
                bookings_queryset.filter(status="pending")
                .values("room__name")
                .annotate(count=Count("id"))
            )
            data = [{"label": stat["room__name"], "value": stat["count"]} for stat in stats]
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)

        elif stat_type == "approved":
            stats = (
                bookings_queryset.filter(status="approved")
                .values("room__name")
                .annotate(count=Count("id"))
            )
            data = [{"label": stat["room__name"], "value": stat["count"]} for stat in stats]
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)

        elif stat_type == "rejected":
            stats = (
                bookings_queryset.filter(status="rejected")
                .values("room__name")
                .annotate(count=Count("id"))
            )
            data = [{"label": stat["room__name"], "value": stat["count"]} for stat in stats]
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)

        elif stat_type == "cancelled":
            stats = (
                bookings_queryset.filter(status="cancelled")
                .values("room__name")
                .annotate(count=Count("id"))
            )
            data = [{"label": stat["room__name"], "value": stat["count"]} for stat in stats]
            serializer = CountStatSerializer(data, many=True)
            return Response(serializer.data)

        elif stat_type == "active":
            current_time = now()
            stats = (
                bookings_queryset.filter(
                    Q(start_time__lte=current_time) & Q(end_time__gte=current_time)
                )
                .values("room__name")
                .annotate(count=Count("id"))
            )
            data = {
                "active_bookings": [
                    {"label": stat["room__name"], "value": stat["count"]} for stat in stats
                ]
            }
            return Response(data)

        return Response({"error": "Invalid stat_type"}, status=status.HTTP_400_BAD_REQUEST)


class RoomStatsView(APIView):
    permission_classes = [IsAuthenticated]  # Changed from IsAdminUser to IsAuthenticated

    def get(self, request):
        # Check if the user is a coordinator only (not admin or superadmin)
        user_groups = [group.name.lower() for group in request.user.groups.all()]
        is_coordinator_only = ("coordinator" in user_groups and 
                              "admin" not in user_groups and 
                              "superadmin" not in user_groups and
                              not request.user.is_superuser)
        
        # Get the user's managed resources if they're a coordinator
        rooms_queryset = Room.objects.all()
        
        if is_coordinator_only:
            managed_floors = request.user.managed_floors.all()
            managed_departments = request.user.managed_departments.all()
            
            managed_floor_ids = list(managed_floors.values_list('id', flat=True)) or []
            managed_dept_ids = list(managed_departments.values_list('id', flat=True)) or []
            
            # Filter rooms by floor and department assignments
            if managed_floor_ids:
                # First filter by managed floors
                filtered_rooms = rooms_queryset.filter(floor__id__in=managed_floor_ids)
                
                # Then apply department filtering if coordinator has department assignments
                if managed_dept_ids:
                    filtered_rooms = filtered_rooms.filter(
                        Q(departments__id__in=managed_dept_ids) | 
                        Q(departments__isnull=True)
                    )
                
                rooms_queryset = filtered_rooms.distinct()
            else:
                # If coordinator only has department assignments but no floors
                if managed_dept_ids:
                    rooms_queryset = rooms_queryset.filter(departments__id__in=managed_dept_ids).distinct()
                else:
                    # If coordinator has neither floor nor department assignments, show nothing
                    rooms_queryset = Room.objects.none()
        
        stat_type = request.query_params.get("stat_type", None)

        if stat_type == "most_booked":
            stats = rooms_queryset.annotate(count=Count("bookings")).order_by("-count")[:5]
            data = [
                {
                    "name": room.name,
                    "building": room.building.id if hasattr(room.building, "id") else None,
                    "building_name": room.building.name if hasattr(room.building, "name") else str(room.building) if room.building else None,
                    # Convert amenities queryset to a list of names
                    "amenities": list(room.amenities.values_list("name", flat=True)),
                    "capacity": room.capacity,
                    "count": room.count,
                }
                for room in stats
            ]
            serializer = RoomUsageStatSerializer(data, many=True)
            return Response(serializer.data)

        elif stat_type == "least_booked":
            stats = rooms_queryset.annotate(count=Count("bookings")).order_by("count")[:5]
            data = [
                {
                    "name": room.name,
                    "building": room.building.id if hasattr(room.building, "id") else None,
                    "building_name": room.building.name if hasattr(room.building, "name") else str(room.building) if room.building else None,
                    # Convert amenities queryset to a list of names
                    "amenities": list(room.amenities.values_list("name", flat=True)),
                    "capacity": room.capacity,
                    "count": room.count,
                }
                for room in stats
            ]
            serializer = RoomUsageStatSerializer(data, many=True)
            return Response(serializer.data)

        elif stat_type == "utilization":
            stats = (
                rooms_queryset.annotate(
                    usage_hours=ExpressionWrapper(
                        Sum(F("bookings__end_time") - F("bookings__start_time")),
                        output_field=DurationField(),
                    ),
                    total_attendees=Sum(Cast('bookings__participants', output_field=IntegerField())),
                    booking_count=Count("bookings")
                )
                .values("name", "building", "capacity", "usage_hours", "total_attendees", "booking_count")
                .order_by("-usage_hours")
            )
            
            data = []
            for stat in stats:
                # Handle the case where usage_hours might be None
                usage_hours_value = 0
                if stat.get("usage_hours") is not None:
                    usage_hours_value = stat["usage_hours"].total_seconds() / 3600
                
                # Get the building name if possible
                building_name = None
                if stat["building"] is not None:
                    try:
                        building = Building.objects.get(id=stat["building"])
                        building_name = building.name
                    except Building.DoesNotExist:
                        building_name = str(stat["building"])
                
                # Calculate average attendees if there are bookings
                total_attendees = stat.get("total_attendees") or 0
                booking_count = stat.get("booking_count") or 0
                avg_attendees = total_attendees / booking_count if booking_count > 0 else 0
                
                data.append({
                    "name": stat["name"],
                    "building": stat["building"],
                    "building_name": building_name,
                    "amenities": [],  # We don't need amenities for utilization stats
                    "capacity": stat["capacity"],
                    "usage_hours": usage_hours_value,
                    "total_attendees": total_attendees,
                    "booking_count": booking_count,
                    "avg_attendees": round(avg_attendees, 1)
                })
            
            serializer = RoomUsageStatSerializer(data, many=True)
            return Response(serializer.data)

        return Response({"error": "Invalid stat_type"}, status=status.HTTP_400_BAD_REQUEST)

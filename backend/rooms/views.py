# backend/rooms/views.py
import logging
from datetime import datetime

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import (
    CanManageAmenities,
    CanManageBuildings,
    CanManageRooms,
    CanViewRooms,
)
from bookings.models import Booking

from .models import Amenity, Building, Department, Floor, Room
from .serializers import (
    AmenitySerializer,
    BuildingSerializer,
    DepartmentSerializer,
    FloorSerializer,
    RoomSerializer,
)

logger = logging.getLogger(__name__)


class RoomListView(APIView):
    permission_classes = [CanViewRooms]

    def get(self, request):
        date = request.query_params.get("date")
        start_time = request.query_params.get("start_time")
        end_time = request.query_params.get("end_time")
        capacity = request.query_params.get("capacity")
        building_id = request.query_params.get("building_id")
        floor = request.query_params.get("floor")  # Add direct floor parameter
        floor_number = request.query_params.get("floor_number")
        floor_name = request.query_params.get("floor_name")
        department_id = request.query_params.get("department_id")
        is_active = request.query_params.get("is_active")
        # Fix: Ensure view_all is properly parsed from the query parameter
        view_all = request.query_params.get("view_all", "false").lower() == "true"

        try:
            start_datetime = datetime.fromisoformat(start_time) if start_time else None
            end_datetime = datetime.fromisoformat(end_time) if end_time else None
            capacity = int(capacity) if capacity else None
            floor_number = int(floor_number) if floor_number else None
            floor_id = int(floor) if floor else None  # Parse floor ID parameter
            department_id = int(department_id) if department_id else None
        except (ValueError, TypeError):
            return Response(
                {
                    "detail": "Invalid date, capacity, floor number, or department ID format"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if the user is a coordinator
        user_groups = [group.name.lower() for group in request.user.groups.all()]
        is_coordinator = "coordinator" in user_groups
        is_admin_or_superadmin = ("admin" in user_groups or "superadmin" in user_groups or 
                                  request.user.is_staff or request.user.is_superuser)
        
        # Log the values for debugging
        logger.debug(f"User: {request.user.email}, view_all parameter: {view_all}")
        logger.debug(f"Is coordinator: {is_coordinator}, Is admin/superadmin: {is_admin_or_superadmin}")

        # Start with all rooms, then filter
        rooms = Room.objects.all()
        
        # Handle special coordinator permissions
        # Only apply coordinator filtering if:
        # 1. User is a coordinator, AND
        # 2. User is not an admin/superadmin, AND
        # 3. view_all parameter is NOT true
        if is_coordinator and not is_admin_or_superadmin and not view_all:
            logger.debug("Applying coordinator filtering")
            managed_floor_ids = list(request.user.managed_floors.values_list('id', flat=True)) or []
            managed_dept_ids = list(request.user.managed_departments.values_list('id', flat=True)) or []
            
            # If coordinator has department assignments, show:
            # 1. Rooms in their assigned departments (regardless of floor)
            # 2. Rooms with NO department assignments on their assigned floors
            if managed_dept_ids:
                # Get rooms in managed departments
                dept_rooms = Room.objects.filter(departments__id__in=managed_dept_ids)
                
                # Get rooms with NO departments on managed floors
                floor_rooms_no_dept = Room.objects.filter(
                    floor_id__in=managed_floor_ids
                ).exclude(
                    departments__isnull=False
                )
                
                # Combine the querysets
                rooms = (dept_rooms | floor_rooms_no_dept).distinct()
            
            # If coordinator has no department assignments, show:
            # Only rooms with NO department assignments on their assigned floors
            else:
                rooms = Room.objects.filter(
                    floor_id__in=managed_floor_ids,
                    departments__isnull=True
                )
        else:
            logger.debug("Skipping coordinator filtering, showing all rooms")
        
        # Filter by available status
        rooms = rooms.filter(available=True)
        
        # Filter by active status if specified
        if is_active is not None:
            is_active_bool = is_active.lower() == "true"
            rooms = rooms.filter(is_active=is_active_bool)

        # Apply other filters
        if capacity:
            rooms = rooms.filter(capacity__gte=capacity)

        if building_id:
            rooms = rooms.filter(building_id=building_id)
            
        # Add direct floor ID filtering
        if floor_id:
            rooms = rooms.filter(floor_id=floor_id)

        if floor_number is not None:
            rooms = rooms.filter(floor__number=floor_number)

        if floor_name:
            rooms = rooms.filter(floor__name__icontains=floor_name)

        if department_id:
            rooms = rooms.filter(departments__id=department_id)

        if start_datetime and end_datetime:
            conflicting_bookings = Booking.objects.filter(
                status=Booking.APPROVED,
                start_time__lt=end_datetime,
                end_time__gt=start_datetime,
            ).values_list("room_id", flat=True)
            
            rooms = rooms.exclude(id__in=conflicting_bookings)

        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RoomManageView(APIView):
    # Different permissions for different methods
    def get_permissions(self):
        # Allow any authenticated user to GET room details
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        # Require CanManageRooms for all other methods (POST, PATCH, DELETE)
        return [CanManageRooms()]

    def get(self, request, room_id=None):
        # Handle GET request for a specific room
        if room_id:
            try:
                room = Room.objects.get(id=room_id)
                serializer = RoomSerializer(room)
                room_data = serializer.data

                # If date is provided, get bookings for that date
                date_param = request.query_params.get("date")
                if date_param:
                    try:
                        date_obj = datetime.fromisoformat(date_param)
                        # Start and end of the day
                        start_of_day = datetime.combine(
                            date_obj.date(), datetime.min.time()
                        )
                        end_of_day = datetime.combine(
                            date_obj.date(), datetime.max.time()
                        )

                        # Get all bookings for this room on the specified date with more user data
                        bookings = Booking.objects.filter(
                            room_id=room_id,
                            start_time__date=date_obj.date(),
                        ).select_related('user', 'approved_by')
                        
                        # Format bookings with more information
                        bookings_data = []
                        for booking in bookings:
                            bookings_data.append({
                                'id': booking.id,
                                'start_time': booking.start_time,
                                'end_time': booking.end_time,
                                'status': booking.status,
                                'user': booking.user.id,
                                'user_email': booking.user.email,
                                'purpose': booking.purpose,
                                'participants': booking.participants,
                                'notes': booking.notes,
                            })

                        # Add bookings to response
                        room_data["bookings"] = bookings_data
                    except ValueError:
                        return Response(
                            {"detail": "Invalid date format"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                return Response(room_data, status=status.HTTP_200_OK)
            except Room.DoesNotExist:
                return Response(
                    {"detail": "Room not found"}, status=status.HTTP_404_NOT_FOUND
                )
        # Handle GET request for a list of rooms (fallback to RoomListView)
        else:
            rooms = Room.objects.filter(available=True)
            
            # Handle is_active filtering if specified
            is_active = request.query_params.get("is_active")
            if is_active is not None:
                is_active_bool = is_active.lower() == "true"
                rooms = rooms.filter(is_active=is_active_bool)
                
            serializer = RoomSerializer(rooms, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = RoomSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Room created by user {request.user.email}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, room_id):
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response(
                {"detail": "Room not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = RoomSerializer(room, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Room {room_id} updated by user {request.user.email}")
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, room_id):
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response(
                {"detail": "Room not found"}, status=status.HTTP_404_NOT_FOUND
            )

        room.delete()
        logger.info(f"Room {room_id} deleted by user {request.user.email}")
        return Response({"status": "room deleted"}, status=status.HTTP_204_NO_CONTENT)


class BuildingManageView(APIView):
    # Different permissions for different methods
    def get_permissions(self):
        # Allow any authenticated user to GET building details
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        # Require CanManageBuildings for all other methods (POST, PATCH, DELETE)
        return [CanManageBuildings()]

    def get(self, request, building_id=None):
        if building_id:
            try:
                building = Building.objects.get(id=building_id)
                serializer = BuildingSerializer(building)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Building.DoesNotExist:
                return Response(
                    {"detail": "Building not found"}, status=status.HTTP_404_NOT_FOUND
                )
        else:
            buildings = Building.objects.all()
            serializer = BuildingSerializer(buildings, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = BuildingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Building created by user {request.user.email}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, building_id):
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {"detail": "Building not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = BuildingSerializer(building, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Building {building_id} updated by user {request.user.email}")
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, building_id):
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {"detail": "Building not found"}, status=status.HTTP_404_NOT_FOUND
            )

        building.delete()
        logger.info(f"Building {building_id} deleted by user {request.user.email}")
        return Response(
            {"status": "building deleted"}, status=status.HTTP_204_NO_CONTENT
        )


class AmenityManageView(APIView):
    # Different permissions for different methods
    def get_permissions(self):
        # Allow any authenticated user to GET amenities
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        # Require CanManageAmenities for all other methods (POST, PATCH, DELETE)
        return [CanManageAmenities()]

    def get(self, request, amenity_id=None):
        if amenity_id:
            try:
                amenity = Amenity.objects.get(id=amenity_id)
                serializer = AmenitySerializer(amenity)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Amenity.DoesNotExist:
                return Response(
                    {"detail": "Amenity not found"}, status=status.HTTP_404_NOT_FOUND
                )
        else:
            amenities = Amenity.objects.all()
            serializer = AmenitySerializer(amenities, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AmenitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Amenity created by user {request.user.email}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, amenity_id):
        try:
            amenity = Amenity.objects.get(id=amenity_id)
        except Amenity.DoesNotExist:
            return Response(
                {"detail": "Amenity not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = AmenitySerializer(amenity, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Amenity {amenity_id} updated by user {request.user.email}")
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, amenity_id):
        try:
            amenity = Amenity.objects.get(id=amenity_id)
        except Amenity.DoesNotExist:
            return Response(
                {"detail": "Amenity not found"}, status=status.HTTP_404_NOT_FOUND
            )

        amenity.delete()
        logger.info(f"Amenity {amenity_id} deleted by user {request.user.email}")
        return Response(
            {"status": "amenity deleted"}, status=status.HTTP_204_NO_CONTENT
        )


class FloorManageView(APIView):
    # Different permissions for different methods
    def get_permissions(self):
        # Allow any authenticated user to GET floor details
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        # Require CanManageBuildings for all other methods (POST, PATCH, DELETE)
        return [CanManageBuildings()]

    def get(self, request, building_id=None, floor_id=None):
        # If specific floor_id is provided
        if floor_id:
            try:
                floor = Floor.objects.get(id=floor_id)
                serializer = FloorSerializer(floor)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Floor.DoesNotExist:
                return Response(
                    {"detail": "Floor not found"}, status=status.HTTP_404_NOT_FOUND
                )
        
        # If building_id is provided in URL path, use it to filter floors
        if building_id:
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                return Response(
                    {"detail": "Building not found"}, status=status.HTTP_404_NOT_FOUND
                )
            floors = Floor.objects.filter(building_id=building_id).order_by('number')
            serializer = FloorSerializer(floors, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Otherwise, check if it's in query parameters
            query_building_id = request.query_params.get("building_id")
            floors = Floor.objects.all()
            if query_building_id:
                floors = floors.filter(building_id=query_building_id).order_by('number')
            
            serializer = FloorSerializer(floors, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = FloorSerializer(data=request.data)
        if serializer.is_valid():
            floor = serializer.save()
            logger.info(
                f"Floor {floor.number} {floor.name if floor.name else ''} "
                f"created in building {floor.building.name} by user {request.user.email}"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, floor_id):
        try:
            floor = Floor.objects.get(id=floor_id)
        except Floor.DoesNotExist:
            return Response(
                {"detail": "Floor not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = FloorSerializer(floor, data=request.data, partial=True)
        if serializer.is_valid():
            updated_floor = serializer.save()
            logger.info(
                f"Floor {updated_floor.number} {updated_floor.name if updated_floor.name else ''} "
                f"in building {updated_floor.building.name} updated by user {request.user.email}"
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, floor_id):
        try:
            floor = Floor.objects.get(id=floor_id)
        except Floor.DoesNotExist:
            return Response(
                {"detail": "Floor not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Capture info for logging before deleting
        floor_number = floor.number
        floor_name = floor.name
        building_name = floor.building.name

        floor.delete()
        logger.info(
            f"Floor {floor_number} {floor_name if floor_name else ''} "
            f"in building {building_name} deleted by user {request.user.email}"
        )
        return Response({"status": "floor deleted"}, status=status.HTTP_204_NO_CONTENT)


class DepartmentManageView(APIView):
    # Different permissions for different methods
    def get_permissions(self):
        # Allow any authenticated user to GET department details
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        # Require CanManageBuildings for all other methods (POST, PATCH, DELETE)
        return [CanManageBuildings()]

    def get(self, request):
        is_active = request.query_params.get("is_active")

        departments = Department.objects.all()
        if is_active is not None:
            is_active_bool = is_active.lower() == "true"
            departments = departments.filter(is_active=is_active_bool)

        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = DepartmentSerializer(data=request.data)
        if serializer.is_valid():
            department = serializer.save()
            logger.info(
                f"Department '{department.name}' created by user {request.user.email}"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, department_id):
        try:
            department = Department.objects.get(id=department_id)
        except Department.DoesNotExist:
            return Response(
                {"detail": "Department not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = DepartmentSerializer(department, data=request.data, partial=True)
        if serializer.is_valid():
            updated_department = serializer.save()
            logger.info(
                f"Department '{updated_department.name}' updated by user {request.user.email}"
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, department_id):
        try:
            department = Department.objects.get(id=department_id)
        except Department.DoesNotExist:
            return Response(
                {"detail": "Department not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Capture info for logging before deleting
        department_name = department.name

        department.delete()
        logger.info(
            f"Department '{department_name}' deleted by user {request.user.email}"
        )
        return Response(
            {"status": "department deleted"}, status=status.HTTP_204_NO_CONTENT
        )

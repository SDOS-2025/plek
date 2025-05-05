import logging
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import (
    CanApproveOrRejectBooking,
    CanCancelOwnBooking,
    CanCreateBooking,
    CanModifyOwnBooking,
    CanOverrideBooking,
    CanViewAllBookings,
    CanViewFloorDeptBookings,
    CanViewOwnBooking,
)

from .models import Booking
from .serializers import BookingSerializer
from .utils import send_booking_status_email

logger = logging.getLogger(__name__)


class BookingCreateView(APIView):
    permission_classes = [CanCreateBooking]

    def post(self, request):
        serializer = BookingSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            booking = serializer.save(user=request.user)
            logger.info(
                f"Booking created by user {request.user.email} for purpose: {booking.purpose[:50]}... "
                f"with {booking.participants or 'no'} participants"
            )
            
            # Send email notification if the booking is auto-approved
            if booking.status == Booking.APPROVED:
                send_booking_status_email(booking, status_change='auto_approved')
                
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BookingManageView(APIView):
    permission_classes = [CanViewOwnBooking | CanModifyOwnBooking | CanCancelOwnBooking]

    def get(self, request):
        bookings = Booking.objects.filter(user=request.user)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, booking_id):
        # Check if the user is a coordinator, admin, or superadmin (privileged user)
        user_groups = [group.name.lower() for group in request.user.groups.all()]
        is_privileged_user = (
            request.user.is_superuser
            or "admin" in user_groups
            or "superadmin" in user_groups
            or "coordinator" in user_groups
        )

        try:
            # If user is a privileged user, allow them to access any booking
            if is_privileged_user:
                booking = Booking.objects.get(id=booking_id)
                # For coordinators, check if they manage this room
                if "coordinator" in user_groups and not (
                    request.user.can_manage_room(booking.room) or 
                    request.user.has_perm("bookings.override_booking")
                ):
                    return Response(
                        {"detail": "You don't have permission to edit bookings for this room"},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            else:
                # Regular users can only modify their own bookings
                booking = Booking.objects.get(id=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response(
                {"detail": "Booking not found or not yours"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if this is a modification that requires re-approval
        is_significant_change = False
        if (
            "start_time" in request.data
            or "end_time" in request.data
            or "purpose" in request.data
            or "participants" in request.data
        ):
            is_significant_change = True

        serializer = BookingSerializer(booking, data=request.data, partial=True)
        if serializer.is_valid():
            updated_booking = serializer.save()

            # Only reset to PENDING if user is not privileged and made significant changes
            if is_significant_change and not is_privileged_user and updated_booking.status not in [
                Booking.CANCELLED,
                Booking.REJECTED,
            ]:
                updated_booking.status = Booking.PENDING
                updated_booking.approved_by = None  # Remove previous approver
                updated_booking.save()
                logger.info(
                    f"Booking {booking_id} modified by user {request.user.email} - Status reset to PENDING"
                )
            else:
                # For privileged users or non-significant changes, respect the status from the request
                if "status" in request.data and is_privileged_user:
                    # If status was explicitly included in the request and user is privileged
                    logger.info(
                        f"Booking {booking_id} modified by privileged user {request.user.email} - Status set to {updated_booking.status}"
                    )
                else:
                    logger.info(
                        f"Booking {booking_id} modified by privileged user {request.user.email} - Status kept as {updated_booking.status}"
                    )
                
                # Log details about modified purpose and participants if they were updated
                update_details = []
                if "purpose" in request.data:
                    update_details.append(
                        f"purpose updated to: {updated_booking.purpose[:30]}..."
                    )
                if "participants" in request.data:
                    update_details.append(
                        f"participants updated to: {updated_booking.participants or 'none'}"
                    )

                details_str = (
                    ", ".join(update_details) if update_details else "no detail changes"
                )
                logger.info(
                    f"Booking {booking_id} modified by user {request.user.email} ({details_str})"
                )
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, booking_id):
        # Check if the user is a coordinator, admin, or superadmin (privileged user)
        user_groups = [group.name.lower() for group in request.user.groups.all()]
        is_privileged_user = (
            request.user.is_superuser
            or "admin" in user_groups
            or "superadmin" in user_groups
            or "coordinator" in user_groups
        )

        try:
            # If user is a privileged user, allow them to access any booking
            if is_privileged_user:
                booking = Booking.objects.get(id=booking_id)
                # For coordinators, check if they manage this room
                if "coordinator" in user_groups and not (
                    request.user.can_manage_room(booking.room) or 
                    request.user.has_perm("bookings.override_booking")
                ):
                    return Response(
                        {"detail": "You don't have permission to cancel bookings for this room"},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            else:
                # Regular users can only cancel their own bookings
                booking = Booking.objects.get(id=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response(
                {"detail": "Booking not found or not yours"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.status == Booking.CANCELLED:
            return Response(
                {"detail": "Booking already cancelled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get cancellation reason if provided
        cancellation_reason = request.data.get("cancellation_reason", "")

        booking.status = Booking.CANCELLED
        booking.cancellation_reason = cancellation_reason
        booking.save()

        # Send cancellation email notification
        send_booking_status_email(booking)

        logger.info(
            f"Booking {booking_id} cancelled by user {request.user.email}. "
            f"Reason: {cancellation_reason[:50] if cancellation_reason else 'No reason provided'}"
        )
        return Response({"status": "booking cancelled"}, status=status.HTTP_200_OK)


class FloorDeptBookingView(APIView):
    permission_classes = [CanViewFloorDeptBookings]

    def get(self, request):
        # Get the user's managed resources
        managed_buildings = request.user.managed_buildings.all()
        managed_floors = request.user.managed_floors.all().select_related('building')
        managed_departments = request.user.managed_departments.all()
        
        # Check if the user is a coordinator only (not admin or superadmin)
        user_groups = [group.name.lower() for group in request.user.groups.all()]
        is_coordinator_only = ("coordinator" in user_groups and 
                              "admin" not in user_groups and 
                              "superadmin" not in user_groups and
                              not request.user.is_superuser)
        
        # Create base querysets with proper select_related for efficiency
        base_query = Booking.objects.select_related(
            'room', 'user', 'approved_by', 'room__floor', 'room__building'
        )
        
        # For coordinators, we need to strictly enforce their floor + department assignments
        if is_coordinator_only:
            # Get managed floor IDs and department IDs to use for filtering
            managed_floor_ids = list(managed_floors.values_list('id', flat=True)) or []
            managed_dept_ids = list(managed_departments.values_list('id', flat=True)) or []
            
            # NEW IMPLEMENTATION: Much stricter filtering for coordinators
            # Only show bookings where:
            # 1. The room is on a floor managed by the coordinator AND
            # 2. Either:
            #    a) The room belongs to a department managed by the coordinator OR
            #    b) The room has no department assignments at all
            if managed_floor_ids:
                # First filter by managed floors (this is required)
                bookings = base_query.filter(room__floor__id__in=managed_floor_ids)
                
                # Then apply department filtering if coordinator has department assignments
                if managed_dept_ids:
                    # Get rooms in managed departments AND on managed floors
                    # OR rooms without departments on managed floors
                    bookings = bookings.filter(
                        Q(room__departments__id__in=managed_dept_ids) | 
                        Q(room__departments__isnull=True)
                    ).distinct()
            else:
                # If coordinator doesn't manage any floors, they should only see
                # bookings for rooms in their managed departments
                if managed_dept_ids:
                    bookings = base_query.filter(room__departments__id__in=managed_dept_ids)
                else:
                    # If coordinator has neither floor nor department assignments
                    bookings = Booking.objects.none()
        else:
            # For admins and superadmins, show all bookings they have access to
            building_bookings = base_query.filter(room__building__in=managed_buildings) if managed_buildings.exists() else Booking.objects.none()
            floor_bookings = base_query.filter(room__floor__in=managed_floors) if managed_floors.exists() else Booking.objects.none()
            dept_bookings = base_query.filter(room__departments__in=managed_departments) if managed_departments.exists() else Booking.objects.none()
            
            # Combine the queries using OR logic and remove duplicates
            bookings = (building_bookings | floor_bookings | dept_bookings).distinct()
        
        # Create enhanced booking data with user information
        enhanced_bookings = []
        for booking in bookings:
            # Get the departments for this room to include in response
            room_departments = []
            if hasattr(booking.room, 'departments'):
                room_departments = [
                    {
                        "id": dept.id,
                        "name": dept.name,
                        "code": getattr(dept, 'code', None)
                    }
                    for dept in booking.room.departments.all()[:5]  # Limit to 5 to avoid large payloads
                ]
            
            booking_data = {
                'id': booking.id,
                'room': booking.room.id,
                'room_name': booking.room.name,
                'floor_id': booking.room.floor.id if booking.room.floor else None,
                'floor_name': booking.room.floor.name if booking.room.floor else None,
                'building_id': booking.room.building.id if booking.room.building else None,
                'building_name': booking.room.building.name if booking.room.building else '',
                'departments': room_departments,
                'user': booking.user.id,
                'user_email': booking.user.email,
                'user_first_name': booking.user.first_name,
                'user_last_name': booking.user.last_name,
                'approved_by': booking.approved_by.id if booking.approved_by else None,
                'approved_by_email': booking.approved_by.email if booking.approved_by else None,
                'start_time': booking.start_time,
                'end_time': booking.end_time,
                'status': booking.status,
                'purpose': booking.purpose,
                'participants': booking.participants,
                'cancellation_reason': booking.cancellation_reason,
                'notes': booking.notes,
                'created_at': booking.created_at,
                'updated_at': booking.updated_at,
            }
            enhanced_bookings.append(booking_data)
        
        # Return the bookings along with the coordinator's managed resources info
        return Response({
            "bookings": enhanced_bookings,
            "managed_buildings": [
                {"id": building.id, "name": building.name} 
                for building in managed_buildings
            ],
            "managed_floors": [
                {
                    "id": floor.id,
                    "number": floor.number,
                    "name": floor.name,
                    "building_id": floor.building.id if floor.building else None,
                    "building_name": floor.building.name if floor.building else None
                }
                for floor in managed_floors
            ],
            "managed_departments": [
                {
                    "id": dept.id,
                    "name": dept.name,
                    "code": getattr(dept, 'code', None)
                }
                for dept in managed_departments
            ],
            "has_department_assignments": bool(managed_departments.exists()),
            "has_floor_assignments": bool(managed_floors.exists())
        }, status=status.HTTP_200_OK)


class BookingApprovalView(APIView):
    permission_classes = [CanApproveOrRejectBooking]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response(
                {"detail": "Booking not found"}, status=status.HTTP_404_NOT_FOUND
            )

        action = request.data.get("action")
        if action not in ["approve", "reject"]:
            return Response(
                {"detail": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST
            )

        if not (
            request.user.can_manage_room(booking.room)
            or request.user.has_perm("bookings.override_booking")
        ):
            return Response(
                {"detail": "You don't manage this room"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if action == "approve":
            booking.status = Booking.APPROVED
            booking.approved_by = request.user
            log_message = f"Booking {booking_id} approved by user {request.user.email}"
            log_message += (
                f" - Purpose: {booking.purpose[:30]}" if booking.purpose else ""
            )
            log_message += (
                f" - Participants: {booking.participants[:30]}"
                if booking.participants
                else ""
            )
            
            # Send email notification for approval
            send_booking_status_email(booking, status_change='approved')
        else:
            booking.status = Booking.REJECTED
            # Store rejection reason if provided
            rejection_reason = request.data.get("cancellation_reason", "")
            if rejection_reason:
                booking.cancellation_reason = rejection_reason
                log_message = f"Booking {booking_id} rejected by user {request.user.email}. Reason: {rejection_reason[:50]}"
            else:
                log_message = f"Booking {booking_id} rejected by user {request.user.email}. No reason provided."
            
            # Send email notification for rejection
            send_booking_status_email(booking, status_change='rejected')

        booking.save()
        logger.info(log_message)
        return Response(
            {"status": f"booking {booking.status}"}, status=status.HTTP_200_OK
        )


class AllBookingsView(APIView):
    permission_classes = [CanViewAllBookings]

    def get(self, request):
        bookings = Booking.objects.all().select_related('room', 'user', 'approved_by', 'room__building')
        
        # Create enhanced booking data with user information
        enhanced_bookings = []
        for booking in bookings:
            booking_data = {
                'id': booking.id,
                'room': booking.room.id,
                'room_name': booking.room.name,
                'building_name': booking.room.building.name if booking.room.building else '',
                'user': booking.user.id,
                'user_email': booking.user.email,
                'user_first_name': booking.user.first_name,
                'user_last_name': booking.user.last_name,
                'approved_by': booking.approved_by.id if booking.approved_by else None,
                'approved_by_email': booking.approved_by.email if booking.approved_by else None,
                'start_time': booking.start_time,
                'end_time': booking.end_time,
                'status': booking.status,
                'purpose': booking.purpose,
                'participants': booking.participants,
                'cancellation_reason': booking.cancellation_reason,
                'notes': booking.notes,  # Added notes field
                'created_at': booking.created_at,
                'updated_at': booking.updated_at,
            }
            enhanced_bookings.append(booking_data)
            
        return Response(enhanced_bookings, status=status.HTTP_200_OK)


class OverrideBookingView(APIView):
    permission_classes = [CanOverrideBooking]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response(
                {"detail": "Booking not found"}, status=status.HTTP_404_NOT_FOUND
            )

        original_status = booking.status
        serializer = BookingSerializer(booking, data=request.data, partial=True)
        
        if serializer.is_valid():
            updated_booking = serializer.save(approved_by=request.user)

            # Log details about overridden fields
            override_details = []
            if "purpose" in request.data:
                override_details.append(f"purpose: {updated_booking.purpose[:30]}...")
            if "participants" in request.data:
                override_details.append(
                    f"participants: {updated_booking.participants or 'none'}"
                )
            
            # Check if status was changed and handle email notifications
            status_changed = False
            if "status" in request.data and original_status != updated_booking.status:
                status_changed = True
                override_details.append(f"status: {updated_booking.status}")

                # Send the appropriate email notification based on new status
                if updated_booking.status == Booking.APPROVED:
                    send_booking_status_email(updated_booking, status_change='approved')
                elif updated_booking.status == Booking.REJECTED:
                    send_booking_status_email(updated_booking, status_change='rejected')
                else:
                    # For other status changes like cancellation
                    send_booking_status_email(updated_booking)

                # If booking was rejected or cancelled, log reason if provided
                if (
                    updated_booking.status in [Booking.REJECTED, Booking.CANCELLED]
                    and "cancellation_reason" in request.data
                ):
                    override_details.append(
                        f"reason: {updated_booking.cancellation_reason[:30] if updated_booking.cancellation_reason else 'none'}"
                    )

            details_str = (
                ", ".join(override_details)
                if override_details
                else "no specific details"
            )
            logger.info(
                f"Booking {booking_id} overridden by user {request.user.email} ({details_str})"
            )

            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

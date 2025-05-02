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
        
        # Get bookings from managed buildings, floors and departments
        building_bookings = Booking.objects.filter(
            room__building__in=managed_buildings
        ).select_related('room', 'user', 'approved_by', 'room__floor', 'room__building')
        
        floor_bookings = Booking.objects.filter(
            room__floor__in=managed_floors
        ).select_related('room', 'user', 'approved_by', 'room__floor', 'room__building')
        
        dept_bookings = Booking.objects.filter(
            room__departments__in=managed_departments
        ).select_related('room', 'user', 'approved_by', 'room__floor', 'room__building')
        
        # Combine the queries using OR logic
        bookings = (building_bookings | floor_bookings | dept_bookings).distinct()
        
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
                'created_at': booking.created_at,
                'updated_at': booking.updated_at,
            }
            enhanced_bookings.append(booking_data)
        
        # Prepare minimal building data
        minimal_buildings = []
        if managed_buildings:
            minimal_buildings = [
                {"id": building.id, "name": building.name} 
                for building in managed_buildings
            ]
        
        # Prepare minimal floor data  
        minimal_floors = []
        if managed_floors:
            minimal_floors = [
                {
                    "id": floor.id,
                    "number": floor.number,
                    "name": floor.name,
                    "building_id": floor.building.id if floor.building else None,
                    "building_name": floor.building.name if floor.building else None
                }
                for floor in managed_floors
            ]
        
        # Return only the essential information
        return Response({
            "bookings": enhanced_bookings,
            "managed_buildings": minimal_buildings,
            "managed_floors": minimal_floors,
            "managed_departments": [
                {
                    "id": dept.id,
                    "name": dept.name,
                    "code": getattr(dept, 'code', None)
                }
                for dept in managed_departments
            ]
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
        else:
            booking.status = Booking.REJECTED
            # Store rejection reason if provided
            rejection_reason = request.data.get("cancellation_reason", "")
            if rejection_reason:
                booking.cancellation_reason = rejection_reason
                log_message = f"Booking {booking_id} rejected by user {request.user.email}. Reason: {rejection_reason[:50]}"
            else:
                log_message = f"Booking {booking_id} rejected by user {request.user.email}. No reason provided."

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
            if "status" in request.data:
                override_details.append(f"status: {updated_booking.status}")

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

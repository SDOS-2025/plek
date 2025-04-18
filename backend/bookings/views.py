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
        try:
            booking = Booking.objects.get(id=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response(
                {"detail": "Booking not found or not yours"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if this is a modification that requires re-approval
        is_significant_change = False
        if ('start_time' in request.data or 'end_time' in request.data or 
            'purpose' in request.data or 'participants' in request.data):
            is_significant_change = True

        serializer = BookingSerializer(booking, data=request.data, partial=True)
        if serializer.is_valid():
            updated_booking = serializer.save()
            
            # Reset status to PENDING if it was a significant change and not already cancelled/rejected
            if is_significant_change and updated_booking.status not in [Booking.CANCELLED, Booking.REJECTED]:
                updated_booking.status = Booking.PENDING
                updated_booking.approved_by = None  # Remove previous approver
                updated_booking.save()
                logger.info(f"Booking {booking_id} modified by user {request.user.email} - Status reset to PENDING")
            else:
                # Log details about modified purpose and participants if they were updated
                update_details = []
                if "purpose" in request.data:
                    update_details.append(f"purpose updated to: {updated_booking.purpose[:30]}...")
                if "participants" in request.data:
                    update_details.append(
                        f"participants updated to: {updated_booking.participants or 'none'}"
                    )

                details_str = ", ".join(update_details) if update_details else "no detail changes"
                logger.info(
                    f"Booking {booking_id} modified by user {request.user.email} ({details_str})"
                )
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, booking_id):
        try:
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
        bookings = Booking.objects.filter(
            Q(room__floor__in=request.user.managed_floors.all())
            | Q(room__department__in=request.user.managed_departments.all())
        ).distinct()
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BookingApprovalView(APIView):
    permission_classes = [CanApproveOrRejectBooking]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")
        if action not in ["approve", "reject"]:
            return Response({"detail": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

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
            log_message += f" - Purpose: {booking.purpose[:30]}" if booking.purpose else ""
            log_message += (
                f" - Participants: {booking.participants[:30]}" if booking.participants else ""
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
        return Response({"status": f"booking {booking.status}"}, status=status.HTTP_200_OK)


class AllBookingsView(APIView):
    permission_classes = [CanViewAllBookings]

    def get(self, request):
        bookings = Booking.objects.all()
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OverrideBookingView(APIView):
    permission_classes = [CanOverrideBooking]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = BookingSerializer(booking, data=request.data, partial=True)
        if serializer.is_valid():
            updated_booking = serializer.save(approved_by=request.user)

            # Log details about overridden fields
            override_details = []
            if "purpose" in request.data:
                override_details.append(f"purpose: {updated_booking.purpose[:30]}...")
            if "participants" in request.data:
                override_details.append(f"participants: {updated_booking.participants or 'none'}")
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

            details_str = ", ".join(override_details) if override_details else "no specific details"
            logger.info(
                f"Booking {booking_id} overridden by user {request.user.email} ({details_str})"
            )

            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

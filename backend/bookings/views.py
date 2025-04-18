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

from accounts.calendar_service import GoogleCalendarService
from .models import Booking, CalendarEvent
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

        serializer = BookingSerializer(booking, data=request.data, partial=True)
        if serializer.is_valid():
            updated_booking = serializer.save()
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


class CalendarIntegrationView(APIView):
    """
    View for Google Calendar integration with bookings
    """
    
    def get(self, request, booking_id=None):
        # Initialize the Google Calendar service
        calendar_service = GoogleCalendarService(request.user.id)
        
        if not calendar_service.service:
            return Response(
                {"detail": "Google Calendar service unavailable. Please ensure you've connected your Google account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # List calendars if no booking_id is provided
        if booking_id is None:
            # Get user's Google Calendars
            calendars = calendar_service.list_calendars()
            return Response(calendars, status=status.HTTP_200_OK)
        
        # Get information about a specific booking's calendar integration
        try:
            booking = Booking.objects.get(id=booking_id)
            
            # Check if user has permission to access this booking
            if booking.user != request.user and not request.user.has_perm("bookings.view_all_bookings"):
                return Response(
                    {"detail": "You don't have permission to access this booking"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if booking has a calendar event
            try:
                calendar_event = CalendarEvent.objects.get(booking=booking)
                return Response({
                    "has_calendar_event": True,
                    "calendar_id": calendar_event.calendar_id,
                    "event_id": calendar_event.event_id,
                    "html_link": calendar_event.html_link,
                    "synced_at": calendar_event.synced_at
                }, status=status.HTTP_200_OK)
            except CalendarEvent.DoesNotExist:
                return Response({
                    "has_calendar_event": False
                }, status=status.HTTP_200_OK)
                
        except Booking.DoesNotExist:
            return Response(
                {"detail": "Booking not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def post(self, request, booking_id=None):
        """
        Add a booking to Google Calendar
        """
        if booking_id is None:
            return Response(
                {"detail": "Booking ID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the calendar_id from request data
        calendar_id = request.data.get("calendar_id")
        if not calendar_id:
            return Response(
                {"detail": "Calendar ID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the booking
        try:
            booking = Booking.objects.get(id=booking_id)
            
            # Check if user has permission to modify this booking
            if booking.user != request.user and not request.user.has_perm("bookings.override_booking"):
                return Response(
                    {"detail": "You don't have permission to add this booking to a calendar"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if booking already has a calendar event
            if hasattr(booking, 'calendar_event'):
                return Response(
                    {"detail": "This booking already has a calendar event"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Initialize the Google Calendar service
            calendar_service = GoogleCalendarService(request.user.id)
            
            if not calendar_service.service:
                return Response(
                    {"detail": "Google Calendar service unavailable. Please ensure you've connected your Google account."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create the calendar event
            result = calendar_service.create_event(calendar_id, booking)
            
            if result:
                # Save the calendar event information
                calendar_event = CalendarEvent.objects.create(
                    booking=booking,
                    calendar_id=calendar_id,
                    event_id=result["event_id"],
                    html_link=result.get("html_link")
                )
                
                logger.info(f"Calendar event created for booking {booking_id} by user {request.user.email}")
                
                return Response({
                    "detail": "Calendar event created successfully",
                    "calendar_id": calendar_event.calendar_id,
                    "event_id": calendar_event.event_id,
                    "html_link": calendar_event.html_link,
                    "synced_at": calendar_event.synced_at
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {"detail": "Failed to create calendar event"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Booking.DoesNotExist:
            return Response(
                {"detail": "Booking not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def put(self, request, booking_id=None):
        """
        Update a booking's calendar event
        """
        if booking_id is None:
            return Response(
                {"detail": "Booking ID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the booking
        try:
            booking = Booking.objects.get(id=booking_id)
            
            # Check if user has permission to modify this booking
            if booking.user != request.user and not request.user.has_perm("bookings.override_booking"):
                return Response(
                    {"detail": "You don't have permission to update this booking's calendar event"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if booking has a calendar event
            try:
                calendar_event = CalendarEvent.objects.get(booking=booking)
            except CalendarEvent.DoesNotExist:
                return Response(
                    {"detail": "This booking doesn't have a calendar event"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Initialize the Google Calendar service
            calendar_service = GoogleCalendarService(request.user.id)
            
            if not calendar_service.service:
                return Response(
                    {"detail": "Google Calendar service unavailable. Please ensure you've connected your Google account."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update the calendar event
            result = calendar_service.update_event(
                calendar_event.calendar_id, 
                calendar_event.event_id, 
                booking
            )
            
            if result:
                # Update the calendar event information if needed
                if result.get("html_link") != calendar_event.html_link:
                    calendar_event.html_link = result.get("html_link")
                    calendar_event.save()
                
                logger.info(f"Calendar event updated for booking {booking_id} by user {request.user.email}")
                
                return Response({
                    "detail": "Calendar event updated successfully",
                    "calendar_id": calendar_event.calendar_id,
                    "event_id": calendar_event.event_id,
                    "html_link": calendar_event.html_link,
                    "synced_at": calendar_event.synced_at
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {"detail": "Failed to update calendar event"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Booking.DoesNotExist:
            return Response(
                {"detail": "Booking not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, booking_id=None):
        """
        Remove a booking from Google Calendar
        """
        if booking_id is None:
            return Response(
                {"detail": "Booking ID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the booking
        try:
            booking = Booking.objects.get(id=booking_id)
            
            # Check if user has permission to modify this booking
            if booking.user != request.user and not request.user.has_perm("bookings.override_booking"):
                return Response(
                    {"detail": "You don't have permission to remove this booking's calendar event"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if booking has a calendar event
            try:
                calendar_event = CalendarEvent.objects.get(booking=booking)
            except CalendarEvent.DoesNotExist:
                return Response(
                    {"detail": "This booking doesn't have a calendar event"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Initialize the Google Calendar service
            calendar_service = GoogleCalendarService(request.user.id)
            
            if not calendar_service.service:
                return Response(
                    {"detail": "Google Calendar service unavailable. Please ensure you've connected your Google account."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Delete the calendar event
            success = calendar_service.delete_event(
                calendar_event.calendar_id, 
                calendar_event.event_id
            )
            
            if success:
                # Delete the calendar event record
                calendar_event.delete()
                
                logger.info(f"Calendar event removed for booking {booking_id} by user {request.user.email}")
                
                return Response({
                    "detail": "Calendar event removed successfully"
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {"detail": "Failed to remove calendar event"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Booking.DoesNotExist:
            return Response(
                {"detail": "Booking not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

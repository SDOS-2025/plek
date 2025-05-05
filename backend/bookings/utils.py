import logging
from datetime import datetime
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

def format_datetime(dt):
    """Format datetime object into a user-friendly string."""
    if not dt:
        return "Not specified"
    try:
        return dt.strftime("%A, %B %d, %Y at %I:%M %p")
    except Exception as e:
        logger.error(f"Error formatting datetime: {e}")
        return str(dt)

def send_booking_status_email(booking, status_change=None):
    """
    Send email notification to the user regarding a booking status change.
    
    Args:
        booking: The Booking object
        status_change: 'approved', 'auto_approved', 'rejected', or None for other notifications
    """
    if not booking or not booking.user or not booking.user.email:
        logger.error(f"Cannot send email: Missing booking details or user email")
        return False
        
    user_email = booking.user.email
    user_name = f"{booking.user.first_name} {booking.user.last_name}".strip() or booking.user.email
    
    # Define the context for the email template
    context = {
        'user_name': user_name,
        'booking_id': booking.id,
        'room_name': booking.room.name if booking.room else "Unknown Room",
        'building_name': booking.room.building.name if booking.room and booking.room.building else "Unknown Building",
        'start_time': format_datetime(booking.start_time),
        'end_time': format_datetime(booking.end_time),
        'purpose': booking.purpose or "Not specified",
        'status': booking.status,
        'participants': booking.participants or "None",
        'approver': booking.approved_by.get_full_name() if booking.approved_by else "System",
        'rejection_reason': booking.cancellation_reason or "No reason provided",
        'booking_date': format_datetime(datetime.now()),
    }
    
    # Choose the appropriate template and subject
    if status_change == 'approved':
        subject = f"Your Room Booking #{booking.id} has been Approved"
        html_template = 'booking_approved_email.html'
        plain_message = f"""
        Dear {user_name},
        
        Your room booking request has been APPROVED!
        
        Booking Details:
        - Room: {context['room_name']}, {context['building_name']}
        - Date & Time: {context['start_time']} to {context['end_time']}
        - Purpose: {context['purpose']}
        - Approved by: {context['approver']}
        
        You can view all your bookings by logging into your Plek account.
        
        Thank you for using Plek Room Booking System.
        """
    
    elif status_change == 'auto_approved':
        subject = f"Your Room Booking #{booking.id} has been Automatically Approved"
        html_template = 'booking_auto_approved_email.html'
        plain_message = f"""
        Dear {user_name},
        
        Your room booking has been AUTOMATICALLY APPROVED!
        
        Booking Details:
        - Room: {context['room_name']}, {context['building_name']}
        - Date & Time: {context['start_time']} to {context['end_time']}
        - Purpose: {context['purpose']}
        
        No further action is needed. You can view all your bookings by logging into your Plek account.
        
        Thank you for using Plek Room Booking System.
        """
    
    elif status_change == 'rejected':
        subject = f"Your Room Booking #{booking.id} has been Rejected"
        html_template = 'booking_rejected_email.html'
        plain_message = f"""
        Dear {user_name},
        
        We regret to inform you that your room booking request has been REJECTED.
        
        Booking Details:
        - Room: {context['room_name']}, {context['building_name']}
        - Date & Time: {context['start_time']} to {context['end_time']}
        - Purpose: {context['purpose']}
        - Rejection Reason: {context['rejection_reason']}
        
        Please contact the administrator if you have any questions.
        
        Thank you for using Plek Room Booking System.
        """
    
    else:
        # Default case for other notifications
        subject = f"Room Booking #{booking.id} Status Update: {booking.status}"
        html_template = 'booking_status_email.html'
        plain_message = f"""
        Dear {user_name},
        
        The status of your room booking has been updated to {booking.status}.
        
        Booking Details:
        - Room: {context['room_name']}, {context['building_name']}
        - Date & Time: {context['start_time']} to {context['end_time']}
        - Purpose: {context['purpose']}
        
        You can view all your bookings by logging into your Plek account.
        
        Thank you for using Plek Room Booking System.
        """
    
    try:
        # Send the email
        # Since we don't have HTML templates yet, we'll use the plain text version
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            fail_silently=False,
        )
        
        logger.info(f"Email notification sent to {user_email} for booking #{booking.id} status: {booking.status}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {e}")
        return False
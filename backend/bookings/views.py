from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Booking
from backend.mongo_service import add_log, add_notification

@api_view(['POST'])
def book_room(request):
    user_id = request.data['user_id']
    room_id = request.data['room_id']
    
    # Create booking in MySQL
    booking = Booking.objects.create(
        user_id=user_id,
        room_id=room_id,
        start_time=request.data['start_time'],
        end_time=request.data['end_time'],
        status="Pending"
    )
    
    # Add log entry in MongoDB
    add_log("Room booked", user_id, room_id, "User booked a room")

    # Add notification in MongoDB
    add_notification(user_id, "Your room booking is pending approval")

    return Response({"message": "Booking successful, check notifications!"})

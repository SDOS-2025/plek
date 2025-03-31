from rest_framework.decorators import api_view
from rest_framework.response import Response
from backend.mongo_service import add_log, add_notification
from django.shortcuts import render, redirect
from .models import Booking
from room.models import Room
from django.contrib.auth.decorators import login_required


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


@login_required
def book_room(request, room_id):
    room = Room.objects.get(id=room_id)
    if request.method == "POST":
        booking = Booking.objects.create(
            user=request.user,
            room=room,
            start_time=request.POST["start_time"],
            end_time=request.POST["end_time"]
        )
        room.available = False  # Mark room as booked
        room.save()
        return redirect("list_rooms")
    return render(request, "booking/book.html", {"room": room})

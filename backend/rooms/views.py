from bookings.models import Booking
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Room
from .serializers import RoomSerializer

"""
fields = [
            "name",
            "description",
            "capacity",
            "available",
            "building",
            "amenities",
        ]
"""


class ListRoomsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rooms = Room.objects.all().filter(available=True)
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)


class RoomView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        room = get_object_or_404(Room.objects.prefetch_related("booking_set"), id=id)
        serializer = RoomSerializer(room)
        return Response(serializer.data)

    def post(self, request):
        serializer = RoomSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, id):
        try:
            room = Room.objects.get(id=id)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=404)

        serializer = RoomSerializer(room, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, id):
        try:
            room = Room.objects.get(id=id)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=404)

        room.delete()
        return Response(status=204)

    def patch(self, request, id):
        try:
            room = Room.objects.get(id=id)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=404)

        serializer = RoomSerializer(room, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

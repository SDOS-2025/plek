from backend.mongo_service import get_amenities
from django.shortcuts import render
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Room
from .serializers import RoomSerializer


class ListRoomsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rooms = Room.objects.all().filter(available=True)
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)


class RoomAmenitiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        amenities = get_amenities(room_id)
        return Response(amenities)


class AddRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RoomSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class DeleteRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, room_name):
        try:
            room = Room.objects.get(name=room_name)
            room.delete()
            return Response(status=204)
        except Room.DoesNotExist:
            return Response(status=404)

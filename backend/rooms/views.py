from bookings.models import Booking
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Room, Amenity, Building
from .serializers import RoomSerializer, AmenitySerializer, BuildingSerializer
from bookings.serializers import BookingSerializer
from rest_framework import status

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
        serializer = RoomSerializer(room, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = RoomSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, id):
        try:
            room = Room.objects.get(id=id)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = RoomSerializer(room, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id):
        try:
            room = Room.objects.get(id=id)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, id):
        try:
            room = Room.objects.get(id=id)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = RoomSerializer(room, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AmenitiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id=None):
        if id is not None:
            amenity = get_object_or_404(Amenity, id=id)
            rooms = Room.objects.filter(amenities=amenity)
            serializer = RoomSerializer(rooms, many=True)
            return Response(serializer.data)
        amenities = Amenity.objects.all()
        serializer = AmenitySerializer(amenities, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        serializer = AmenitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, id):
        try:
            amenity = Amenity.objects.get(id=id)
        except Amenity.DoesNotExist:
            return Response({"error": "Amenity not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = AmenitySerializer(amenity, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, id):
        try:
            amenity = Amenity.objects.get(id=id)
        except Amenity.DoesNotExist:
            return Response({"error": "Amenity not found"}, status=status.HTTP_404_NOT_FOUND)

        amenity.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class BuildingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id=None):
        if id is not None:
            building = get_object_or_404(Building, id=id)
            rooms = Room.objects.filter(building=building)
            serializer = RoomSerializer(rooms, many=True)
            return Response(serializer.data)
        buildings = Building.objects.all()
        serializer = BuildingSerializer(buildings, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = BuildingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, id):
        try:
            building = Building.objects.get(id=id)
        except Building.DoesNotExist:
            return Response({"error": "Building not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = BuildingSerializer(building, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, id):
        try:
            building = Building.objects.get(id=id)
        except Building.DoesNotExist:
            return Response({"error": "Building not found"}, status=status.HTTP_404_NOT_FOUND)

        building.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
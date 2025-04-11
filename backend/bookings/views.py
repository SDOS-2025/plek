from rest_framework.decorators import api_view
from rest_framework.response import Response
from backend.mongo_service import add_log, add_notification
from django.shortcuts import render, redirect
from .models import Booking
from django.contrib.auth.decorators import login_required
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from .serializers import BookingSerializer
from django.utils import timezone
from rest_framework import serializers
from rest_framework import status


class BookingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id=None):
        '''Returns the details of a booking'''
        try:
            booking = Booking.objects.get(id=id)
            serializer = BookingSerializer(booking)
            return Response(serializer.data)
        except Booking.DoesNotExist:
            return Response({"message": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, id=None):
        '''Creates a new booking'''
        serializer = BookingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            # add_log(
            #     event="Booking Created",
            #     user_id=request.user.id,
            #     room_id=serializer.validated_data['room'].id,
            #     details=f"Booking created for room {serializer.validated_data['room'].name}",
            # )
            # add_notification(
            #     user_id=request.user.id,
            #     message=f"Booking created for room {serializer.validated_data['room'].name}",
            # )
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=status.HTTP_404_NOT_FOUND)
    
    def delete(self, request, id):
        '''Deletes a booking'''
        try:
            booking = Booking.objects.get(id=id)
            booking.delete()
            return Response(status=204)
        except Booking.DoesNotExist:
            return Response({"message": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)
        
    def put(self, request, id):
        '''Updates a booking'''
        try:
            booking = Booking.objects.get(id=id)
            serializer = BookingSerializer(booking, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                # add_log(
                #     user=request.user,
                #     action="Booking Updated",
                #     details=f"Booking updated for room {serializer.validated_data['room'].name}",
                # )
                # add_notification(
                #     user=request.user,
                #     message=f"Booking updated for room {serializer.validated_data['room'].name}",
                # )
                return Response(serializer.data, status=200)
            return Response(serializer.errors, status=400)
        except Booking.DoesNotExist:
            return Response({"message": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)
        
        
class BookingListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        '''Returns the list of all bookings'''
        bookings = Booking.objects.all()
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)
from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from backend.mongo_service import get_amenities
from .models import Room


@api_view(['GET'])
def room_amenities(request, room_id):
    amenities = get_amenities(room_id)
    return Response({"room_id": room_id, "amenities": amenities})


def list_rooms(request):
    rooms = Room.objects.filter(available=True)
    return render(request, "rooms/list.html", {"rooms": rooms})


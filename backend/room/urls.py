from django.urls import path
from .views import room_amenities

urlpatterns = [
    path('rooms/amenities/<int:room_id>/', room_amenities, name='room-amenities'),
]

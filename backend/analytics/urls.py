from django.urls import path

from .views import BookingStatsView, RoomStatsView

urlpatterns = [
    path("bookings/", BookingStatsView.as_view()),
    path("rooms/", RoomStatsView.as_view()),
]

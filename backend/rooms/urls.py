from django.urls import path

from .views import ListRoomsView, RoomView

urlpatterns = [
    path("rooms/", ListRoomsView.as_view(), name="list_rooms"),
    path("rooms/<int:id>/", RoomView.as_view(), name="room_detail"),
    path("rooms/add/", RoomView.as_view(), name="add_room"),
    path("rooms/edit/<int:id>/", RoomView.as_view(), name="edit_room"),
    path("rooms/delete/<int:id>/", RoomView.as_view(), name="delete_room"),
]

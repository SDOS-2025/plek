from django.urls import path

from .views import (AddRoomView, DeleteRoomView, ListRoomsView,
                    RoomAmenitiesView)

urlpatterns = [
    path("rooms/", ListRoomsView.as_view(), name="list_rooms"),
    path(
        "rooms/<int:room_id>/amenities/",
        RoomAmenitiesView.as_view(),
        name="room_amenities",
    ),
    path(
        "rooms/add/",
        AddRoomView.as_view(),
        name="add_room",
    ),
    # delete using room "name"
    path("rooms/delete/<str:room_name>/", DeleteRoomView.as_view(), name="delete_room"),
]

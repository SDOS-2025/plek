from django.urls import path

from .views import ListRoomsView, RoomView, AmenitiesView, BuildingsView

urlpatterns = [
    # Rooms
    path("rooms/", ListRoomsView.as_view(), name="list_rooms"),
    path("rooms/<int:id>/", RoomView.as_view(), name="room_detail"),
    path("rooms/add/", RoomView.as_view(), name="add_room"),
    path("rooms/edit/<int:id>/", RoomView.as_view(), name="edit_room"),
    path("rooms/delete/<int:id>/", RoomView.as_view(), name="delete_room"),
    
    # Amenities 
    path("amenities/", AmenitiesView.as_view(), name="list_amenities"),
    path("amenities/add/", AmenitiesView.as_view(), name="add_amenity"),
    path("amenities/edit/<int:id>/", AmenitiesView.as_view(), name="edit_amenity"),
    path("amenities/delete/<int:id>/", AmenitiesView.as_view(), name="delete_amenity"),
    
    # Buildings
    path("buildings/", BuildingsView.as_view(), name="list_buildings"),
    path("buildings/add/", BuildingsView.as_view(), name="add_building"),
    path("buildings/edit/<int:id>/", BuildingsView.as_view(), name="edit_building"),
    path("buildings/delete/<int:id>/", BuildingsView.as_view(), name="delete_building"),
    
    # Nested routes
    path("rooms/<int:id>/amenities/", AmenitiesView.as_view(), name="room_amenities"),
    path("buildings/<int:id>/rooms/", BuildingsView.as_view(), name="building_rooms"),
    path("amenities/<int:id>/rooms/", AmenitiesView.as_view(), name="amenity_rooms"),
]
